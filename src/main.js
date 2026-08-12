// Boot, input, camera, menu, reflection probe, main loop.
(function () {
  const $ = (id) => document.getElementById(id);

  // Fold in the mobile overrides BEFORE anything reads GFX.
  const isMobile = GAME.applyGfxProfile ? GAME.applyGfxProfile() : false;

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({
    antialias: GAME.GFX.antialias !== false,
    powerPreference: isMobile ? 'default' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME.GFX.pixelRatio || 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = GAME.GFX.shadows !== false;
  renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  $('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // FOV adapts to the viewport shape so portrait phones don't get tunnel
  // vision and ultrawide monitors gain width instead of stretching.
  const camera = new THREE.PerspectiveCamera(
    GAME.baseFov ? GAME.baseFov() : GAME.CAM.fov,
    window.innerWidth / window.innerHeight, 0.5, 14000);

  // shadow quality from config
  const rig = new GAME.LightingRig(scene);
  rig.sun.shadow.mapSize.set(GAME.GFX.shadowMap, GAME.GFX.shadowMap);
  rig.sun.shadow.radius = GAME.GFX.shadowRadius;

  // Reflection probe (metallic skins pick up sky + city).
  // Rendering all 6 cube faces at once made every 24th frame do 7x the work —
  // a visible periodic hitch. Instead we render ONE face per update tick:
  // same freshness overall, the spike becomes a small constant cost.
  const envRT = new THREE.WebGLCubeRenderTarget(GAME.GFX.envMapSize, {
    generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(1, 4000, envRT);
  scene.add(cubeCam);
  scene.environment = envRT.texture;
  let envFace = 0;
  function updateProbeFace() {
    const gl = renderer, rt = envRT;
    const cam = cubeCam.children[envFace];
    cubeCam.position.copy(camera.position);
    cubeCam.updateMatrixWorld();
    const prevRT = gl.getRenderTarget();
    // mips regenerate only when rendering INTO the target — pay that cost
    // once per cycle, on the final face
    rt.texture.generateMipmaps = (envFace === 5);
    gl.setRenderTarget(rt, envFace);
    gl.render(scene, cam);
    gl.setRenderTarget(prevRT);
    envFace = (envFace + 1) % 6;
  }

  // ---------- world ----------
  const cities = {};
  function getCity(key) {
    if (!cities[key]) cities[key] = new GAME.City(GAME.zones[key]);
    return cities[key];
  }

  const hero = new GAME.Hero();
  hero.addTo(scene);

  // comic sound-effect bubbles (Noir suit only) — grayscale onomatopoeia
  if (GAME.ComicFX) GAME.comicFX = new GAME.ComicFX(scene);
  // suit-special world effects (cracks, trampolines, zip-lines, spider-sense)
  if (GAME.Specials) GAME.specials = new GAME.Specials(scene);
  // per-suit mastery progression (distance swung → cosmetic perks)
  if (GAME.Mastery) GAME.mastery = new GAME.Mastery();

  let city = null, traffic = null, pigeons = null, player = null;
  function setZone(key) {
    if (city) {
      scene.remove(city.group);
      if (traffic) { scene.remove(traffic.group); traffic.dispose(); }
      if (pigeons) { scene.remove(pigeons.group); pigeons.dispose(); }
    }
    GAME.settings.zone = key;
    if (city && city.ghostGroup) scene.remove(city.ghostGroup);
    city = getCity(key);
    scene.add(city.group);
    scene.add(city.buildTiling());
    traffic = new GAME.Traffic(city);
    scene.add(traffic.group);
    pigeons = new GAME.Pigeons(city);
    scene.add(pigeons.group);
    if (GAME.landmarks) GAME.landmarks.dispose();
    GAME.landmarks = new GAME.Landmarks(city, scene);
    if (GAME.minimap) GAME.minimap.dispose();
    GAME.minimap = new GAME.Minimap(city);
    if (GAME.crowds) { scene.remove(GAME.crowds.group); GAME.crowds.dispose(); }
    GAME.crowds = new GAME.Crowds(city);
    scene.add(GAME.crowds.group);
    if (GAME.events) GAME.events.dispose();
    GAME.events = new GAME.StreetEvents(city, scene, pigeons);
    GAME.photos = new GAME.PhotoChallenges(GAME.landmarks, city);
    GAME.districts = new GAME.Districts(city);
    // City Secrets: collectible landmark facts pinned to real coordinates
    if (GAME.secrets) GAME.secrets.dispose();
    if (GAME.CitySecrets) GAME.secrets = new GAME.CitySecrets(GAME.landmarks, city, scene);
    // Swing of the Day: date-seeded waypoint route
    if (GAME.daily) GAME.daily.dispose();
    if (GAME.DailyRun) GAME.daily = new GAME.DailyRun(city, scene);
    // combat (feature-gated — branch `combat`, enable with ?combat=1)
    if (GAME.enemies) GAME.enemies.dispose();
    GAME.enemies = null; GAME.combat = null;
    if (GAME.feature && GAME.feature('combat') && GAME.Enemies) {
      GAME.enemies = new GAME.Enemies(city, scene, GAME.crowds);
      GAME.combat = new GAME.Combat(GAME.enemies);
    }
    if (!player) player = new GAME.Player(city, hero);
    else player.setCity(city);
    GAME.player = player;      // exposed for debug/minimap tooling
    $('zonename').textContent = city.zone.name;
    GAME.debug = { scene, city, traffic, pigeons, rig, hero, camera, renderer,
                   step: (dt) => {           // manual frame step (testing/headless)
                     if (photo.on) { updatePhotoCam(dt); renderer.render(scene, camera); return; }
                     camera.getWorldDirection(camDir);
                     if (player) player.update(dt, camera, camDir);
                     rig.update(dt, player.pos, camera.position);
                     traffic.update(dt, rig);
                     pigeons.update(dt);
                     updateCamera(dt);
                     renderer.render(scene, camera);
                   },
                   setCam: (yaw, pitch) => { camYaw = yaw; if (pitch !== undefined) camPitch = pitch; } };
  }

  // ---------- input ----------
  const keys = { w: 0, a: 0, s: 0, d: 0, space: 0, c: 0 };
  let camYaw = Math.PI, camPitch = -0.18, lastMouseT = 0;
  let camZoom = 1;   // scroll-wheel / two-finger zoom multiplier on camera dist
  let playing = false;
  // --- touch input bridge: the on-screen joystick writes movement/jump/swing
  // into `keys`, and drag-look feeds camera yaw/pitch through here ---
  GAME.keys = keys;
  GAME.lookDelta = (dx, dy) => {
    camYaw -= dx;
    camPitch = Math.max(GAME.CAM.pitchMin, Math.min(GAME.CAM.pitchMax, camPitch - dy));
    lastMouseT = perf();
  };
  GAME.isPlaying = () => playing;
  // pinch ratio >1 = fingers spreading = pull the camera out (speed-stretch)
  GAME.zoomDelta = (ratio) => {
    camZoom = Math.max(0.45, Math.min(2.8, camZoom / Math.max(0.2, ratio)));
  };
  // photo mode: world freezes, camera flies free
  const photo = { on: false, pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  // camera feel bus — anything can kick it: sweet-spot release, near-miss,
  // hard landings. Pulse widens the FOV for a beat; shake jitters the frame.
  GAME.camFx = { pulse: 0, shake: 0 };

  const KEYMAP = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space',
                   KeyC: 'c', KeyK: 'k', ShiftLeft: 'shift', ShiftRight: 'shift',
                   ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd' };
  window.addEventListener('keydown', (e) => {
    if (!playing) return;
    const k = KEYMAP[e.code];
    if (k) { keys[k] = 1; e.preventDefault(); }
    else if (e.code === 'KeyF') {
      // F + held direction picks the trick: W swan double · S double tuck ·
      // A/D corkscrew · plain F classic flip
      const t = keys.w ? 3 : keys.s ? 6 : keys.a ? 4 : keys.d ? 5 : 0;
      player.doTrick(t);
      hint(['Flip!', '', '', 'Swan dive — double flip!', 'Corkscrew!',
            'Corkscrew!', 'Double tuck!'][t] || 'Flip!');
    }
    else if (e.code === 'KeyQ') { player.doTrick(1); hint('Barrel roll!'); }
    else if (e.code === 'KeyE') {
      const t = keys.w ? 7 : 2;
      player.doTrick(t);
      hint(t === 7 ? 'Superman!' : 'Spread eagle!');
    }
    else if (e.code === 'KeyM') {
      GAME.audio.setMuted(!GAME.audio.muted);
      hint(GAME.audio.muted ? 'Sound off' : 'Sound on');
    }
    else if (e.code === 'KeyP') togglePhoto();
    else if (e.code === 'Enter' && photo.on && GAME.photos) {
      const res = GAME.photos.snap(camera, rig);
      hint(res || 'Snapshot.');
      const el = $('phototask');
      if (el) el.textContent = GAME.photos.nextHint();
    }
    else if (e.code === 'KeyT') hint('Time: ' + rig.toggle());
 else if (e.code === 'KeyN') {
      hint('Suit: ' + hero.cycleSkin()); GAME.applyNoir();
    } else if (e.code === 'KeyR') player.respawn();
    else if (e.code === 'KeyG') suitSpecial();
    // ---- combat keys (gated) ----
    // NB: K is NOT available — KEYMAP binds it to the Stark web-wing glide and
    // intercepts it above, so a combat handler on K would never fire.
    //   J light attack (auto-locks) · L heavy / web-yank
    //   TAB cycle target · H hold-lock toggle · Y dev spawn
    else if (GAME.combat && e.code === 'KeyJ') {
      camera.getWorldDirection(camDir);
      if (GAME.combat.light(player, camDir) && GAME.combat.combo > 1)
        hint('Combo ×' + GAME.combat.combo, 900);
    } else if (GAME.combat && e.code === 'KeyL') {
      camera.getWorldDirection(camDir);
      GAME.combat.heavy(player, camDir);
    } else if (GAME.combat && e.code === 'KeyH') {
      camera.getWorldDirection(camDir);
      hint(GAME.combat.toggleLock(player.pos, camDir) ? 'Locked on' : 'Lock released', 1000);
    } else if (GAME.combat && e.code === 'Tab') {
      e.preventDefault();
      camera.getWorldDirection(camDir);
      GAME.combat.cycle(player.pos, camDir);
    } else if (GAME.enemies && e.code === 'KeyY') {
      // dev: spawn a test group in front of the player
      const n = GAME.enemies.spawnGroup(player.pos.x, player.pos.z, player._support || 0, 4);
      hint('Spawned ' + n + ' enemies (dev)', 1500);
    }
    else if (e.code === 'KeyB' && GAME.daily) {
      if (GAME.daily.active) { GAME.daily.stop(false); hint('Route abandoned'); }
      else if (!GAME.daily.start()) hint('No route available here');
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) keys[k] = 0;
  });
  // Pointer lock is the difference between a real free-look and a camera that
  // stops at the screen edge. If the browser refuses the lock (Safari often
  // does), fall back to click-drag looking so full rotation always works.
  // The mouse is a pure camera device — it never fires webs. Where you look
  // steers the swing and biases the animation instead.
  let mouseDrag = false;
  const isLocked = () => document.pointerLockElement === renderer.domElement;
  window.addEventListener('mousedown', () => {
    if (!playing) return;
    if (!isLocked()) {
      try {
      // newer browsers return a promise that REJECTS when the lock is refused
      // (embedded frames, user gesture rules) — swallow both failure modes
      const pl = renderer.domElement.requestPointerLock();
      if (pl && pl.catch) pl.catch(() => {});
    } catch (err) {}
      mouseDrag = true;
    }
  });
  window.addEventListener('mouseup', () => { mouseDrag = false; });
  // scroll wheel / two-finger trackpad → zoom the chase camera in and out
  window.addEventListener('wheel', (e) => {
    if (!playing || photo.on) return;
    camZoom = Math.max(0.45, Math.min(2.8, camZoom * (1 + e.deltaY * 0.0012)));
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('mousemove', (e) => {
    if (!playing) return;
    if (!isLocked() && !mouseDrag) return;
    if (photo.on) {
      photo.yaw -= e.movementX * 0.0024;
      photo.pitch -= e.movementY * 0.0022;
      photo.pitch = Math.max(-1.55, Math.min(1.55, photo.pitch));
      return;
    }
    camYaw -= e.movementX * 0.0028;
    camPitch -= e.movementY * 0.0026;
    camPitch = Math.max(GAME.CAM.pitchMin, Math.min(GAME.CAM.pitchMax, camPitch));
    lastMouseT = perf();
  });

  function togglePhoto() {
    photo.on = !photo.on;
    if (photo.on) {
      photo.pos.copy(camera.position);
      const d = new THREE.Vector3();
      camera.getWorldDirection(d);
      photo.yaw = Math.atan2(d.x, d.z);
      photo.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    }
    $('hud').style.display = photo.on ? 'none' : 'block';
    $('photolabel').style.display = photo.on ? 'block' : 'none';
    if (photo.on && GAME.photos) {
      const el = $('phototask');
      if (el) el.textContent = GAME.photos.nextHint();
    }
    for (const k in keys) keys[k] = 0;
  }

  function updatePhotoCam(dt) {
    const dir = new THREE.Vector3(
      Math.sin(photo.yaw) * Math.cos(photo.pitch),
      Math.sin(photo.pitch),
      Math.cos(photo.yaw) * Math.cos(photo.pitch));
    const right = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    const sp = 28 * (keys.shift ? 3 : 1) * dt;
    photo.pos.addScaledVector(dir, (keys.w - keys.s) * sp);
    photo.pos.addScaledVector(right, (keys.a - keys.d) * sp);
    photo.pos.y += (keys.space - keys.c) * sp;
    camera.position.copy(photo.pos);
    camera.lookAt(photo.pos.clone().add(dir));
    camera.fov += ((GAME.baseFov ? GAME.baseFov() : GAME.CAM.fov) - camera.fov) * Math.min(1, dt * 5);
    camera.updateProjectionMatrix();
  }
  let hadLock = false;
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    if (locked) hadLock = true;
    // only treat unlock as ESC-to-menu if the lock had actually engaged
    if (!locked && hadLock && playing) {
      hadLock = false;
      playing = false;
      $('menu').style.display = 'flex';
      if (GAME.minimap) GAME.minimap.cv.style.display = GAME.minimap.cp.style.display = 'none';
      if (GAME.touch) GAME.touch.setPlaying(false);
      if (GAME.updateRotateHint) GAME.updateRotateHint();   // menu is portrait-friendly
      if (GAME.suitPreview) { GAME.suitPreview.resize(); GAME.suitPreview.start(); }
      if (GAME.refreshDailyCard) GAME.refreshDailyCard();
      if (GAME._updateSuitCard) GAME._updateSuitCard(GAME.settings.skin);
      for (const k in keys) keys[k] = 0;
    }
  });

  function perf() { return performance.now() / 1000; }

  // ---------- menu ----------
  function wireRow(id, apply) {
    const row = $(id);
    row.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('button').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        apply(btn.dataset.v);
      });
    });
  }
  wireRow('optZone', v => {});                       // applied on start
  wireRow('optTime', v => { GAME.settings.time = v; rig.setMode(v); });
  // suit buttons respect unlocks: locked suits show the clue instead
  const skinRow = $('optSkin');
  // Noir aesthetic: desaturate the 3D canvas + show the grain/vignette overlay
  // (HUD & minimap stay in color, per spec). Called on every skin change.
  GAME.applyNoir = function () {
    const noir = !!(GAME.SKINS[GAME.settings.skin] || {}).noir;
    const g = $('game'), fx = $('noirfx');
    // "Classic Noir" is the Noir suit's mastery perk: heavier grain, deeper
    // contrast — the full 1930s print look rather than a light desaturation.
    const classic = noir && GAME.mastery && GAME.mastery.has('noir-classic');
    if (g) g.style.filter = noir
      ? (classic ? 'grayscale(1) contrast(1.32) brightness(0.95)'
                 : 'grayscale(1) contrast(1.08) brightness(1.03)')
      : '';
    if (fx) {
      fx.classList.toggle('on', noir);
      fx.style.opacity = classic ? '0.3' : '';
    }
  };
  GAME.refreshSuitLocks = function () {
    skinRow.querySelectorAll('button').forEach(btn => {
      const k = btn.dataset.v;
      const locked = GAME.unlocks && !GAME.unlocks.has(k);
      btn.classList.toggle('locked', locked);
      btn.textContent = (locked ? '\u{1F512} ' : '') + GAME.SKINS[k].label;
      btn.title = locked ? GAME.unlocks.clue(k) : '';
      if (locked && btn.classList.contains('sel')) {
        btn.classList.remove('sel');
        skinRow.querySelector('button[data-v="classic"]').classList.add('sel');
      }
    });
  };
  skinRow.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.v;
      if (GAME.unlocks && !GAME.unlocks.has(k)) {
        const el = $('unlockHint');
        if (el) el.textContent = '\u{1F512} ' + GAME.unlocks.clue(k);
        updateSuitCard(k);          // still show the locked suit's details (mobile has no hover)
        return;
      }
      skinRow.querySelectorAll('button').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      const el = $('unlockHint');
      if (el) el.textContent = '';
      hero.setSkin(k);
      GAME.applyNoir();
      selectedSkin = k; updateSuitCard(k);
    });
    // desktop: hovering a suit previews its card, leaving reverts to the pick
    btn.addEventListener('mouseenter', () => updateSuitCard(btn.dataset.v));
    btn.addEventListener('mouseleave', () => updateSuitCard(selectedSkin));
  });

  // per-suit blurbs shown in the home-page description card
  const SUIT_DESC = {
    classic:  { tag: 'Tom Holland · MCU',             special: '<b>Web-wings glide</b> — hold K (or hold, on mobile) to spread the underarm webbing and soar between towers.' },
    black:    { tag: 'Tobey Maguire · Symbiote',      special: '<b>Symbiote-amplified</b> — higher jumps, wilder swings, and sharper mid-air steering.' },
    iron:     { tag: 'Iron Spider · MCU',             special: '<b>Waldo dash (G)</b> — four mechanical legs lunge you forward and grip walls, cracking the concrete where they strike.' },
    miles:    { tag: 'Miles Morales · Spider-Verse',  special: '<b>Venom Blast</b> — a bio-electric shockwave detonates on every hard landing.' },
    y2099:    { tag: "Miguel O'Hara · 2099",          special: '<b>Bullet-time</b> — the world automatically slows at the apex of every jump.' },
    tasm:     { tag: 'Andrew Garfield · Amazing',     special: '<b>Zip-lines & trampolines (G)</b> — string a walkable line between rooftops, or drop a web-net to bounce sky-high.' },
    upgraded: { tag: 'Tom Holland · Far From Home',   special: '<b>Spider-Sense (G)</b> — a focus pulse: brief slow-mo that reveals nearby easter eggs through the walls.' },
    noir:     { tag: 'Spider-Man Noir · Spider-Verse',special: '<b>Noir mode</b> — turns the city black-and-white with film grain, a wind-blown trench coat, and comic sound-effects.' },
    og:       { tag: 'Tobey Maguire · The Original',  special: '<b>The one that started it</b> — raised black webbing, deep navy panels, silver lenses. Swings with the classic organic-shooter feel: a touch more reach and a cleaner release.' },
  };
  let selectedSkin = GAME.settings.skin || 'classic';
  function updateSuitCard(k) {
    const def = GAME.SKINS[k] || {}, d = SUIT_DESC[k] || {};
    if (GAME.suitPreview) GAME.suitPreview.setSkin(k);
    if ($('suitName')) $('suitName').textContent = def.label || k;
    if ($('suitTag')) $('suitTag').textContent = d.tag || '';
    if ($('suitSpecial')) $('suitSpecial').innerHTML = d.special || '';
    const dot = $('suitDot');
    if (dot && def.primary) dot.style.background = '#' + ((def.primary.color || 0) >>> 0).toString(16).padStart(6, '0');
    const locked = GAME.unlocks && !GAME.unlocks.has(k);
    if ($('suitLock')) $('suitLock').textContent = locked
      ? '\u{1F512} ' + (GAME.unlocks.clue ? GAME.unlocks.clue(k) : 'Locked') : '';
    // suit mastery: distance swum in this suit → cosmetic perk
    const mRow = $('suitMastery');
    if (mRow) {
      if (GAME.mastery && GAME.mastery.goalFor(k) && !locked) {
        mRow.style.display = 'flex';
        const bar = $('suitBar');
        if (bar && bar.firstElementChild)
          bar.firstElementChild.style.width = (GAME.mastery.progress(k) * 100).toFixed(0) + '%';
        if ($('suitMasteryTxt')) $('suitMasteryTxt').textContent = GAME.mastery.summary(k);
      } else mRow.style.display = 'none';
    }
  }
  GAME._updateSuitCard = updateSuitCard;
  GAME.refreshSuitLocks();
  // rotating 3D suit model in the card (its own tiny GL context, menu-only)
  if (GAME.SuitPreview && $('suitModel')) {
    try {
      GAME.suitPreview = new GAME.SuitPreview($('suitModel'));
      GAME.suitPreview.start();
      window.addEventListener('resize', () => GAME.suitPreview && GAME.suitPreview.resize());
    } catch (e) { GAME.suitPreview = null; }
  }
  { const sb = skinRow.querySelector('button.sel'); selectedSkin = sb ? sb.dataset.v : 'classic'; updateSuitCard(selectedSkin); }
  // menu banner: today's route + collectible progress (refreshed on every open)
  GAME.refreshDailyCard = function () {
    const el = $('dailyCard');
    if (!el) return;
    const bits = [];
    if (GAME.daily && GAME.daily.points && GAME.daily.points.length) {
      const b = GAME.daily.best;
      bits.push('<b>Swing of the Day</b> — ' + GAME.daily.points.length + ' gates' +
                (b ? ', best <b>' + b.toFixed(1) + 's</b>' : '') +
                ' · press <span class="k">B</span> in game to start');
    }
    if (GAME.secrets) {
      const [g, a] = GAME.secrets.count();
      if (a) bits.push('<b>City Secrets</b> — ' + g + ' / ' + a +
                       ' landmark fragments found');
    }
    el.innerHTML = bits.join('<br>');
    el.style.display = bits.length ? 'block' : 'none';
  };

  // --- touch controls + first-run interactive tutorial ---
  try {
    const savedSide = localStorage.getItem('spidey.joystick.v1');
    if (savedSide) GAME.settings.joystickSide = savedSide;
  } catch (e) {}
  if (!GAME.settings.joystickSide) GAME.settings.joystickSide = 'left';
  if (GAME.Touch) GAME.touch = new GAME.Touch();
  if (GAME.Tutorial) GAME.tutorial = new GAME.Tutorial();
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch && $('optTouch')) {
    $('optTouch').style.display = 'block';
    $('optTouch').querySelectorAll('button').forEach(b => {
      b.classList.toggle('sel', b.dataset.v === GAME.settings.joystickSide);
    });
    wireRow('optTouch', v => { if (GAME.touch) GAME.touch.setSide(v); });
  }

  const audio = GAME.audio = new GAME.GameAudio();
  $('startBtn').addEventListener('click', () => {
    const zoneBtn = $('optZone').querySelector('.sel');
    const zoneKey = zoneBtn ? zoneBtn.dataset.v : 'midtown';
    if (!city || GAME.settings.zone !== zoneKey) setZone(zoneKey);
    $('menu').style.display = 'none';
    playing = true;
    GAME.applyNoir();
    if (GAME.minimap) GAME.minimap.cv.style.display = GAME.minimap.cp.style.display = 'block';
    if (GAME.touch) GAME.touch.setPlaying(true);
    if (GAME.suitPreview) GAME.suitPreview.stop();   // free the GPU while playing
    // two-thumb controls want landscape. Must be driven from this user gesture.
    if (GAME.lockLandscape)
      GAME.lockLandscape().then(() => { if (GAME.updateRotateHint) GAME.updateRotateHint(); });
    if (GAME.updateRotateHint) GAME.updateRotateHint();
    if (GAME.tutorial) GAME.tutorial.start();
    audio.start();   // user gesture — safe to open the AudioContext here
    try {
      // newer browsers return a promise that REJECTS when the lock is refused
      // (embedded frames, user gesture rules) — swallow both failure modes
      const pl = renderer.domElement.requestPointerLock();
      if (pl && pl.catch) pl.catch(() => {});
    } catch (err) {}
    hint('Hold SPACE to swing — release at the top of the arc');
    setTimeout(() => {
      if (playing && document.pointerLockElement !== renderer.domElement)
        hint('Click the screen to capture the mouse for full look-around', 6000);
    }, 700);
  });


  let hintTimer = null;
  // any notification (district mastered, badge, secret) also un-hides the HUD
  GAME.notify = (msg, ms) => { if (GAME.holdHud) GAME.holdHud(); return hint(msg, ms); };
  function hint(msg, ms) {
    const el = $('hint');
    el.textContent = msg;
    el.classList.remove('fade');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => el.classList.add('fade'), ms || 3500);
  }

  // ---------- camera follow (cinematic) ----------
  const camPos = new THREE.Vector3();
  // called by the player's tiling wrap so the follow-camera jumps with him
  GAME.wrapShift = (dx, dz) => { camPos.x += dx; camPos.z += dz; };
  const camTarget = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const prevVel = new THREE.Vector3();
  let camRoll = 0, camDist = GAME.CAM.dist;
  let started = false;

  function updateCamera(dt) {
    const C = GAME.CAM;
    // gentle auto-align behind velocity while swinging fast, if mouse idle
    const hs = Math.hypot(player.vel.x, player.vel.z);
    // gentle, and only after the mouse has been idle a while — never fight a
    // deliberate look-around
    if (player.mode !== 'ground' && hs > 14 && perf() - lastMouseT > 2.4) {
      const want = Math.atan2(-player.vel.x, -player.vel.z);
      let d = want - camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      camYaw += d * Math.min(1, dt * 0.4);
    }
    camDir.set(
      Math.sin(camYaw) * Math.cos(camPitch),
      Math.sin(camPitch),
      Math.cos(camYaw) * Math.cos(camPitch));

    camTarget.copy(player.pos);
    camTarget.y += C.height + 0.6;
    camTarget.addScaledVector(player.vel, 0.05);   // lead room ahead of motion

    // camera breathes: pulls back with speed for wide framing, scaled by the
    // player's scroll-wheel zoom
    const speedK0 = Math.min(1, player.vel.length() / GAME.PHYS.termVel);
    const wantDist = (C.dist + C.distSpeedBoost * speedK0) * camZoom;
    camDist += (wantDist - camDist) * Math.min(1, dt * 2.5);

    let desired = new THREE.Vector3().copy(camTarget).addScaledVector(camDir, camDist);
    // crawling: orbit stays on the open side of the wall — never inside it.
    // Mouse yaw still steers within ±63° of the wall normal.
    if (player.mode === 'crawl' && player.wall) {
      const n = player.wall;
      const nYaw = Math.atan2(n.nx, n.nz);
      let rel = camYaw - nYaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      rel = Math.max(-2.35, Math.min(2.35, rel));   // near-full look-around on walls
      const a = nYaw + rel;
      const pitch = Math.max(-0.3, Math.min(0.9, camPitch + 0.25));
      desired = new THREE.Vector3(
        camTarget.x + Math.sin(a) * Math.cos(pitch) * camDist,
        camTarget.y + Math.sin(pitch) * camDist,
        camTarget.z + Math.cos(a) * Math.cos(pitch) * camDist);
    }
    if (desired.y < 0.6) desired.y = 0.6;
    // occlusion: march from head toward camera, stop before entering a building
    const steps = 12;
    let safe = desired;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = camTarget.x + (desired.x - camTarget.x) * t;
      const py = camTarget.y + (desired.y - camTarget.y) * t;
      const pz = camTarget.z + (desired.z - camTarget.z) * t;
      if (city.isSolid(px, py, pz)) {
        const tSafe = Math.max(0.22, (i - 1) / steps);
        safe = new THREE.Vector3(
          camTarget.x + (desired.x - camTarget.x) * tSafe,
          camTarget.y + (desired.y - camTarget.y) * tSafe,
          camTarget.z + (desired.z - camTarget.z) * tSafe);
        break;
      }
    }
    if (!started) { camPos.copy(safe); started = true; }
    const k = 1 - Math.exp(-dt * C.lag);
    camPos.lerp(safe, k);
    // the lerp path can sweep through a corner — snap out if we ended up inside
    if (city.isSolid(camPos.x, camPos.y, camPos.z)) camPos.copy(safe);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // banking roll into turns (lateral acceleration → dutch tilt)
    if (dt > 0) {
      const right = new THREE.Vector3(-camDir.z, 0, camDir.x).normalize();
      const latA = (player.vel.x - prevVel.x) / dt * right.x
                 + (player.vel.z - prevVel.z) / dt * right.z;
      const wantRoll = (player.mode === 'ground') ? 0
        : Math.max(-C.rollMax, Math.min(C.rollMax, -latA * 0.006));
      camRoll += (wantRoll - camRoll) * Math.min(1, dt * 3.5);
      camera.rotateZ(camRoll);
    }
    prevVel.copy(player.vel);

    // camera feel: FOV pulse (release kick / near-miss), impact shake, and a
    // whisper of handheld sway that scales with speed
    const fx = GAME.camFx;
    fx.pulse = Math.max(0, fx.pulse - dt * 2.4);
    fx.shake = Math.max(0, fx.shake - dt * 3.2);
    const speedK = Math.min(1, player.vel.length() / GAME.PHYS.termVel);
    if (speedK > 0.25 && player.mode !== 'ground') {
      const tnow = perf();
      const sway = (speedK - 0.25) * 0.09;
      camera.position.x += Math.sin(tnow * 1.9) * sway;
      camera.position.y += Math.sin(tnow * 2.7 + 1.3) * sway * 0.6;
    }
    if (fx.shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * 0.22 * fx.shake;
      camera.position.y += (Math.random() - 0.5) * 0.18 * fx.shake;
    }
    const wantFov = (GAME.baseFov ? GAME.baseFov() : C.fov) +
                    C.swingFovBoost * speedK + 8 * fx.pulse;
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 6);
    camera.updateProjectionMatrix();
  }


  // ---------- resize ----------
  function onResize() {
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    // re-derive the base FOV: rotating a phone flips the aspect completely
    if (GAME.baseFov) camera.fov = GAME.baseFov();
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);
  // iOS fires orientationchange before the new dimensions settle
  window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

  // ---------- main loop ----------
  setZone(GAME.settings.zone);
  rig.setMode(GAME.settings.time);
  if (GAME.refreshDailyCard) GAME.refreshDailyCard();
  const clock = new THREE.Clock();
  let frame = 0;

  // 2099 apex slow-mo + global time scale
  GAME.timeScale = 1;
  let slowT = 0, apexUsed = false;
  GAME.slowmo = (t) => { slowT = Math.max(slowT, t); };

  // --- suit special ability, on the G key (context-sensitive per suit) ---
  const _sfwd = new THREE.Vector3();
  function suitSpecial() {
    if (!playing || !player) return;
    camera.getWorldDirection(_sfwd);
    const skin = GAME.settings.skin;
    if (skin === 'iron') {
      // Waldo dash: a mechanical lunge in the look direction (+ auto-catch is
      // just the existing wall-contact grab; a crack marks the push-off point).
      const b = new THREE.Vector3(_sfwd.x, Math.max(0.18, _sfwd.y * 0.5 + 0.2), _sfwd.z).normalize();
      player.vel.addScaledVector(b, 17);
      if (player.mode === 'ground' || player.mode === 'crawl') { player.mode = 'air'; player._airTime = 0.05; player.anchor = null; }
      if (player.hero.waldoReach) player.hero.waldoReach();
      if (GAME.specials) GAME.specials.crack(player.pos, new THREE.Vector3(0, 1, 0));
      if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.5);
      if (GAME.audio && GAME.audio.thwip) GAME.audio.thwip();
    } else if (skin === 'tasm') {
      // On a surface → string a walkable zip-line to the building ahead.
      // In the air → drop a web-trampoline to bounce off.
      const grounded = player.mode === 'ground' || player.mode === 'crawl' || player.mode === 'wallrun';
      if (grounded && GAME.specials) {
        const tgt = city.findAutoAnchor(player.pos, _sfwd);
        const ok = GAME.specials.zipline(player.pos, tgt);
        hint(ok ? 'Zip-line strung' : 'No anchor in sight');
      } else if (GAME.specials) {
        GAME.specials.trampoline(player.pos);
      }
    } else if (skin === 'upgraded') {
      GAME.slowmo(0.8);
      const n = GAME.specials ? GAME.specials.revealNearby(player.pos) : 0;
      hint('Spider-Sense — ' + n + ' nearby');
      if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.4);
    }
  }
  GAME.suitSpecial = suitSpecial;
  // Miles Venom Blast ring (built lazily, reused)
  let venomRing = null, venomT = 1, venomLight = null;
  function venomBlast(pos) {
    if (!venomRing) {
      venomRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40),
        new THREE.MeshBasicMaterial({ color: 0x4ae0ff, transparent: true,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      venomRing.rotation.x = -Math.PI / 2;
      scene.add(venomRing);
      venomLight = new THREE.PointLight(0x4ae0ff, 0, 40, 2);
      scene.add(venomLight);
    }
    venomRing.position.copy(pos); venomRing.position.y += 0.4;
    venomLight.position.copy(venomRing.position); venomLight.position.y += 2;
    venomT = 0;
    if (GAME.camFx) GAME.camFx.shake = Math.max(GAME.camFx.shake, 0.9);
    if (pigeons) pigeons.scareNear(pos.x, pos.z, pos.y, 30);
  }
  // --- Blot portals: dive through one "hole in reality", pop out another ---
  const _prevPos = new THREE.Vector3();
  const _pn = new THREE.Vector3(), _en = new THREE.Vector3(), _hit = new THREE.Vector3();
  let _portalCd = 0;
  function portalStep(dt) {
    _portalCd = Math.max(0, _portalCd - dt);
    const portals = GAME.portals;
    if (!portals || portals.length < 2 || _portalCd > 0) { _prevPos.copy(player.pos); return; }
    for (let i = 0; i < portals.length; i++) {
      const m = portals[i], c = m.position;
      _pn.set(Math.sin(m.rotation.y), 0, Math.cos(m.rotation.y));  // disk normal
      const d0 = (_prevPos.x - c.x) * _pn.x + (_prevPos.z - c.z) * _pn.z;
      const d1 = (player.pos.x - c.x) * _pn.x + (player.pos.z - c.z) * _pn.z;
      if (d0 * d1 >= 0) continue;                 // never crossed the disk plane
      const t = d0 / (d0 - d1);
      _hit.lerpVectors(_prevPos, player.pos, t);
      const r = m.userData.r || 6;
      if (_hit.distanceTo(c) > r * 0.95) continue; // crossed plane but outside the ring
      // spatial shift: emerge from a different portal, momentum continuing forward
      const exit = portals[(i + 2) % portals.length];
      _en.set(Math.sin(exit.rotation.y), 0, Math.cos(exit.rotation.y));
      const sgn = Math.sign(d1) || 1;
      const oldx = player.pos.x, oldz = player.pos.z;
      const speed = Math.hypot(player.vel.x, player.vel.z) || 14;
      player.pos.copy(exit.position).addScaledVector(_en, sgn * ((exit.userData.r || 6) + 3.5));
      player.vel.set(_en.x * sgn * speed, player.vel.y, _en.z * sgn * speed);
      player.anchor = null; player.mode = 'air';
      if (GAME.wrapShift) GAME.wrapShift(player.pos.x - oldx, player.pos.z - oldz);
      if (GAME.comicFX) GAME.comicFX.pop('BAMF', player.pos, 'bamf', 7);
      if (GAME.audio && GAME.audio.thwip) GAME.audio.thwip();
      if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.6);
      _portalCd = 0.8;
      break;
    }
    _prevPos.copy(player.pos);
  }
  const _fxPos = new THREE.Vector3();

  // persistent traversal stats (badges read these)
  let stats = { maxSpeed: 0, maxAlt: 0, swingDist: 0, longAir: 0 };
  try { Object.assign(stats, JSON.parse(localStorage.getItem('spidey.stats.v1')) || {}); } catch (err) {}
  GAME.stats = stats;
  let statT = 0, curAir = 0;
  // dynamic-HUD state: hudQuiet 0..1 fades the chrome out at speed; zoneHoldT
  // forces it back on for a few seconds when a new district is entered
  let hudQuiet = 0, zoneHoldT = 0;
  GAME.holdHud = (s) => { zoneHoldT = Math.max(zoneHoldT, s === undefined ? 3.5 : s); };
  // DYNAMIC HUD — at speed the screen belongs to the city, not the chrome.
  // Zone name, speed and the minimap fade out while you're really moving, and
  // come back when you slow down or something announces itself.
  function updateHud(mph, rawDt) {
    hudQuiet += ((mph > 55 && zoneHoldT <= 0 ? 1 : 0) - hudQuiet) * Math.min(1, rawDt * 3.2);
    zoneHoldT = Math.max(0, zoneHoldT - rawDt);
    const vis = 1 - hudQuiet;
    $('zonename').style.opacity = (0.7 * vis).toFixed(3);
    $('speed').style.opacity = (0.75 * (0.35 + 0.65 * vis)).toFixed(3);
    if (GAME.minimap && GAME.minimap.cv && !GAME.minimap.full)
      GAME.minimap.cv.style.opacity = (0.28 + 0.54 * vis).toFixed(3);
  }
  GAME._updateHud = updateHud;

  function loop() {
    requestAnimationFrame(loop);
    const rawDt = Math.min(0.05, clock.getDelta());
    // ease the time scale toward slow-mo when a 2099 apex is active
    const wantTS = slowT > 0 ? 0.35 : 1;
    GAME.timeScale += (wantTS - GAME.timeScale) * Math.min(1, rawDt * 9);
    slowT = Math.max(0, slowT - rawDt);
    const dt = rawDt * GAME.timeScale;
    frame++;
    GAME.frameCount = frame;

    if (GAME.debug && GAME.debug.paused) {   // debug freeze: inspect exact poses
      renderer.render(scene, camera);
      return;
    }

    if (photo.on) {
      // world is frozen — only the free camera moves
      updatePhotoCam(dt);
      renderer.render(scene, camera);
      return;
    }

    if (playing) {
      player.keys = keys;
      Object.assign(player.keys, keys);
      camera.getWorldDirection(camDir);
      const wasSwing = player.mode === 'swing';
      player.update(dt, camera, camDir);
      // 2099: automatic bullet-time at the apex of a real jump/launch
      if (GAME.settings.skin === 'y2099' && player.mode === 'air' && !apexUsed &&
          Math.abs(player.vel.y) < 2.4 && (player.pos.y - player._support) > 12) {
        apexUsed = true; slowT = 0.85;
        if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.5);
      }
      if (player.mode !== 'air') apexUsed = false;
      // Blot portals: teleport between the holes in reality
      portalStep(rawDt);
      // comic sound-effect bubbles — Noir suit only
      if (GAME.settings.skin === 'noir' && GAME.comicFX) {
        const fx = GAME.comicFX; _fxPos.copy(player.pos); _fxPos.y += 1.5;
        if (player.mode === 'swing' && !wasSwing) fx.pop('THWIP!', _fxPos, 'thwip', 5);
        else if (wasSwing && player.mode === 'air' && player.vel.length() > 22)
          fx.pop('WHOOSH', _fxPos, 'whoosh', 6);
        if (player.justLanded && (player.lastImpact || 0) > 14) fx.pop('THWAK', _fxPos, 'thwak', 5.5);
        if (player.wallBounced) fx.pop('KRAK', _fxPos, 'krak', 5.5);
      }
      if (player.wallBounced) player.wallBounced = false;
      // Miles: Venom Blast shockwave on a hard landing
      if (player.justLanded && GAME.settings.skin === 'miles' &&
          (player.lastImpact || 0) > 14) venomBlast(player.pos);
      if (venomT < 1) {
        venomT = Math.min(1, venomT + rawDt / 0.55);
        const r = 1 + venomT * 20;
        venomRing.scale.set(r, r, 1);
        venomRing.material.opacity = 0.9 * (1 - venomT);
        venomLight.intensity = 5 * (1 - venomT);
      }
      // traversal stats for badges
      {
        const sp = player.vel.length();
        // suit mastery accrues only while actually traversing (swing/air)
        if (GAME.mastery && (player.mode === 'swing' || player.mode === 'air'))
          GAME.mastery.add(GAME.settings.skin, sp * dt);
        if (sp > stats.maxSpeed) stats.maxSpeed = sp;
        if (player.pos.y > stats.maxAlt) stats.maxAlt = player.pos.y;
        if (player.mode === 'swing') stats.swingDist += sp * dt;
        if (player.mode === 'air' || player.mode === 'swing') curAir += dt;
        else { if (curAir > stats.longAir) stats.longAir = curAir; curAir = 0; }
        statT += rawDt;
        if (statT > 10) {
          statT = 0;
          try { localStorage.setItem('spidey.stats.v1', JSON.stringify(stats)); } catch (err) {}
        }
      }
      // audio: thwip when a web catches, thud when landing, wind/pad with speed
      if (player.mode === 'swing' && !wasSwing) audio.thwip();
      if (player.justLanded) audio.impact(0.5 + Math.min(0.5, player.vel.length() / 40));
      audio.update(dt, player.vel.length());
    } else if (player) {
      // idle menu shot: slow orbit
      hero.update({ mode: 'ground', pos: player.pos, vel: new THREE.Vector3(),
                    speed: 0, vy: 0, anchor: null, dt, yaw: player.yaw });
    }

    rig.update(dt, player.pos, camera.position);
    // window glow follows the sunset amount
    for (const m of city.wallMats) m.emissiveIntensity = rig.windowGlow * 0.95;
    if (city.lampHeadMat) {   // street lamps warm up with the sunset
      const lk = 0.16 + 0.84 * Math.min(1, rig.windowGlow);
      city.lampHeadMat.color.setRGB(lk, lk * 0.86, lk * 0.62);
    }
    if (city.beaconMat) {
      const bk = 0.1 + 0.9 * Math.min(1, rig.windowGlow);
      city.beaconMat.color.setRGB(bk, bk * 0.12, bk * 0.1);
    }
    traffic.update(dt, rig);
    pigeons.update(dt);
    if (GAME.landmarks) GAME.landmarks.update(dt, rig);
    if (GAME.comicFX) GAME.comicFX.update(rawDt);
    if (GAME.specials) GAME.specials.update(rawDt, playing ? player : null);
    if (GAME.touch) GAME.touch.update(rawDt);
    if (playing && GAME.enemies && player) GAME.enemies.update(dt, player.pos);
    if (playing && GAME.combat) GAME.combat.update(dt);
    if (playing && GAME.secrets && player) GAME.secrets.update(dt, player.pos);
    if (playing && GAME.daily && player) GAME.daily.update(dt, player.pos);
    if (playing && GAME.tutorial) GAME.tutorial.update();
    if (playing && GAME.crowds && player) GAME.crowds.update(dt, player.pos);
    if (playing && GAME.events && player) GAME.events.update(dt, player.pos);
    if (GAME.districts) GAME.districts.update(dt);
    if (GAME.minimap && player) {
      // The camera sits at player + camDir·dist and looks BACK at the player,
      // so the view direction is camYaw + π. Feeding raw camYaw had the map
      // arrow and compass pointing exactly backwards.
      GAME.minimap.update(dt, player.pos.x, player.pos.z, camYaw + Math.PI);
    }
    updateCamera(dt);

    // refresh reflection probe one cube face at a time (hide hero to avoid
    // self-capture); matte suits barely show reflections, so tick them slower
    const metallic = (GAME.SKINS[GAME.settings.skin] || {}).torsoMetal;
    const envEvery = metallic ? GAME.GFX.envMapEvery : (GAME.GFX.envMapEveryMatte || 20);
    if (frame % envEvery === 1) {
      hero.root.visible = false;
      updateProbeFace();
      hero.root.visible = true;
    }

    // Draw distance rides the fog: nothing beyond full fog is visible, so
    // let the frustum CULL it — otherwise the ghost-tile cities render in
    // full (700+ calls, 12M tris) just to be fogged out.
    const cullEvery = GAME.GFX.cullEvery || 8;
    if (frame % cullEvery === 3 && city) {
      // Draw distance is always tucked inside the fog, so the cull edge is
      // never visible. Phones cap it much shorter (GFX.cityDrawDist), which is
      // where the ~6x triangle saving comes from.
      const drawDist = Math.min(GAME.GFX.cityDrawDist || 6000, rig.fog.far * 0.95);
      // ghosts only need to exist near seams: past ~2.4km they're half-fogged
      // silhouettes the eye can't miss, but 700+ draw calls the GPU can
      city.cullGhosts(camera.position.x, camera.position.z,
                      Math.min(drawDist * 1.05, 2400));
      if (city.cullChunks)
        city.cullChunks(camera.position.x, camera.position.z, drawDist);
    }
    const wantFar = rig.fog.far * 1.08;
    if (Math.abs(camera.far - wantFar) > 60) {
      camera.far = wantFar;
      camera.updateProjectionMatrix();
      rig.sky.scale.setScalar(wantFar * 0.9 / 9000);    // dome safely inside the frustum
    }

    // ---- perf telemetry: GAME.perf {fps, calls, tris}; GAME.perfLog = true
    // for a once-a-second console readout ----
    const info = renderer.info;
    GAME.perf = GAME.perf || { fps: 0, calls: 0, tris: 0, _n: 0, _t: 0 };
    GAME.perf._n++; GAME.perf._t += dt;
    GAME.perf.calls = info.render.calls;
    GAME.perf.tris = info.render.triangles;
    if (GAME.perf._t >= 1) {
      GAME.perf.fps = Math.round(GAME.perf._n / GAME.perf._t);
      GAME.perf._n = 0; GAME.perf._t = 0;
      if (GAME.perfLog)
        console.log('[perf] fps=' + GAME.perf.fps + ' calls=' + GAME.perf.calls +
                    ' tris=' + (GAME.perf.tris / 1e6).toFixed(2) + 'M');
    }

    if (playing) {
      const mph = Math.round(player.vel.length() * 2.237);
      $('speed').textContent = mph > 3 ? mph + ' MPH' : '';
      updateHud(mph, rawDt);
    }

    renderer.render(scene, camera);
  }
  loop();
})();
