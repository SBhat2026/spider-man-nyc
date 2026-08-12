// Hero: continuous lofted-surface body (no primitive blobs) skinned to a
// procedural skeleton. Swing animation follows the classic pendulum beats:
// reach on attach, legs trail on entry, tuck through the bottom, kick out on
// the exit, alternating web arms, and release tricks (tuck flip / layout twist).
(function () {

  // ---------- procedural suit textures ----------
  const texCache = {};
  function webTexture(base, line, density) {
    const key = base + '|' + line;
    if (texCache[key]) return texCache[key];
    const N = 256;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    c.fillStyle = base; c.fillRect(0, 0, N, N);
    c.strokeStyle = line; c.lineWidth = 1.5;
    const cx = N / 2, cy = -N * 0.15;
    for (let a = -Math.PI * 0.45; a <= Math.PI * 1.45; a += Math.PI / (density || 13)) {
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a) * N * 1.6, cy + Math.sin(a) * N * 1.6);
      c.stroke();
    }
    for (let r = 18; r < N * 1.7; r += 21) {
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return texCache[key] = t;
  }

  // ---------- torso texture: base + webbing + emblem + side panels ----------
  function drawSpider(c, cx, cy, s, color, wide) {
    c.save();
    c.translate(cx, cy);
    c.scale(s, s);
    c.fillStyle = color;
    c.strokeStyle = color;
    c.lineCap = 'round';
    // head + elongated abdomen
    c.beginPath(); c.ellipse(0, -14, 9, 12, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 16, 7.5, 26, 0, 0, Math.PI * 2); c.fill();
    // legs: 4 per side, front pair sweeps up, rear pair down
    const legs = wide
      ? [[-1.9, -46, -3.2, -78], [-2.6, -20, -4.6, -46], [-2.7, 8, -4.8, 34], [-2.0, 30, -3.4, 72]]
      : [[-1.6, -34, -2.5, -56], [-2.1, -14, -3.4, -32], [-2.2, 6, -3.6, 26], [-1.7, 24, -2.7, 52]];
    c.lineWidth = wide ? 7 : 5;
    for (const sgn of [-1, 1]) {
      for (const [mx, my, ex, ey] of legs) {
        c.beginPath();
        c.moveTo(sgn * 6, my * 0.35);
        c.quadraticCurveTo(sgn * mx * 10, my, sgn * ex * 10, ey);
        c.stroke();
      }
    }
    c.restore();
  }

  function torsoTexture(key, def) {
    const cacheKey = 'torso|' + key;
    if (texCache[cacheKey]) return texCache[cacheKey];
    const N = 512;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    const T = def.torso;
    c.fillStyle = T.base; c.fillRect(0, 0, N, N);
    // blue/colored side panels (u≈0 and u≈1 are the flanks)
    if (T.side) {
      const g1 = c.createLinearGradient(0, 0, 90, 0);
      g1.addColorStop(0, T.side); g1.addColorStop(1, T.side + '00');
      c.fillStyle = g1; c.fillRect(0, 0, 90, N);
      const g2 = c.createLinearGradient(N, 0, N - 90, 0);
      g2.addColorStop(0, T.side); g2.addColorStop(1, T.side + '00');
      c.fillStyle = g2; c.fillRect(N - 90, 0, 90, N);
    }
    // shoulder yoke — colored caps over the shoulders/collar (Miles, 2099).
    // Torso v runs 0 (waist) → ~0.78 (collar) and maps straight to canvas y,
    // so the shoulders live near y ≈ 0.78N, not the top of the canvas.
    if (T.yoke) {
      const gy = c.createLinearGradient(0, N * 0.78, 0, N * 0.56);
      gy.addColorStop(0, T.yoke); gy.addColorStop(0.5, T.yoke);
      gy.addColorStop(1, T.yoke + '00');
      c.fillStyle = gy; c.fillRect(0, N * 0.56, N, N * 0.24);
    }
    // webbing
    if (T.web) {
      c.strokeStyle = T.web; c.lineWidth = 2;
      const wx = N / 2, wy = -N * 0.55;
      for (let a = -Math.PI * 0.45; a <= Math.PI * 1.45; a += Math.PI / 15) {
        c.beginPath(); c.moveTo(wx, wy);
        c.lineTo(wx + Math.cos(a) * N * 2.2, wy + Math.sin(a) * N * 2.2);
        c.stroke();
      }
      for (let r = 40; r < N * 2.2; r += 34) {
        c.beginPath(); c.arc(wx, wy, r, 0, Math.PI * 2); c.stroke();
      }
    }
    // panel seams / trim lines (iron suit style)
    if (T.trim) {
      c.strokeStyle = T.trim; c.lineWidth = 5;
      c.beginPath(); c.moveTo(N * 0.20, N); c.quadraticCurveTo(N * 0.30, N * 0.45, N * 0.24, 0); c.stroke();
      c.beginPath(); c.moveTo(N * 0.80, N); c.quadraticCurveTo(N * 0.70, N * 0.45, N * 0.76, 0); c.stroke();
    }
    // subtle muscle shading
    const sh = c.createLinearGradient(0, 0, N, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.30)'); sh.addColorStop(0.24, 'rgba(0,0,0,0)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    sh.addColorStop(0.76, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.30)');
    c.fillStyle = sh; c.fillRect(0, 0, N, N);
    // emblem (canvas y-flip: v=0.40 of torso ≈ chest)
    if (T.emblem) drawSpider(c, N / 2, N * 0.60, T.emblemScale || 1.0, T.emblem, T.emblemWide);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return texCache[cacheKey] = t;
  }

  // ---------- skin definitions ----------
  GAME.SKINS = {
    classic: {
      // MCU Stark/Homecoming: vivid red + deep navy, thin black webbing,
      // small black spider, gold-rimmed expressive eyes
      label: 'Stark', order: 1,
      primary: { color: 0xd4291f, map: ['#d4291f', '#141414'], rough: 0.68 },
      secondary: { color: 0x17285c, rough: 0.8, emi: 0x0a1c4a, emiI: 0.3 },
      accent: { color: 0xd4291f, map: ['#d4291f', '#141414'], rough: 0.68 },
      torso: { base: '#d4291f', web: '#141414', emblem: '#0e0e0e', emblemScale: 0.72,
               side: '#17285c' },
      lens: 0xf2f6fa, lensEmi: 0x555c66, rim: 0xc9a133,
    },
    black: {
      // Symbiote: glossy jet black, huge white spider sprawling across the ribs
      label: 'Symbiote', order: 2,
      primary: { color: 0x141418, rough: 0.26, metal: 0.3, envI: 0.9 },
      secondary: { color: 0x101014, rough: 0.26, metal: 0.3, envI: 0.9 },
      accent: { color: 0x141418, rough: 0.24, metal: 0.32, envI: 1.0 },
      torso: { base: '#141418', emblem: '#eef1f5', emblemScale: 1.78, emblemWide: true },
      torsoMetal: true,
      lens: 0xf8fafc, lensEmi: 0xa4acb4, rim: 0x000000, bigLens: 1.1,
      // the symbiote amplifies everything: harder jumps, harder swings
      mods: { jump: 1.35, steer: 1.5, assist: 1.25, release: 1.35 },
    },
    iron: {
      // Iron Spider: crimson + gold trim over navy panels, cyan lenses
      label: 'Iron Spider', order: 3,
      primary: { color: 0x9e1420, metal: 0.9, rough: 0.27, envI: 1.5 },
      secondary: { color: 0x18234f, metal: 0.85, rough: 0.32, envI: 1.3 },
      accent: { color: 0xd9a531, metal: 1.0, rough: 0.19, envI: 1.9 },
      torso: { base: '#9e1420', emblem: '#d9a531', emblemScale: 1.22, emblemWide: true,
               trim: '#d9a531' },
      torsoMetal: true,
      lens: 0xbfe9f5, lensEmi: 0x2f7d8f, rim: 0xd9a531,
    },
    miles: {
      // Miles Morales: near-black navy + faint webbing, red spray-paint spider,
      // red shoulder yokes, red gloves/boots, white lenses in red rims
      label: 'Miles Morales', order: 4,
      primary: { color: 0x0c0f22, map: ['#0c0f22', '#525873'], rough: 0.54 },
      secondary: { color: 0x090b1a, rough: 0.56 },
      accent: { color: 0xd8202a, rough: 0.48 },
      torso: { base: '#0c0f22', web: '#464c66', emblem: '#e5202a', emblemScale: 1.2 },
      lens: 0xf6f9fc, lensEmi: 0x6e747e, rim: 0xe23a44,
    },
    y2099: {
      // 2099: deep indigo-black, big red spider spanning the chest, red accents
      label: '2099', order: 5,
      primary: { color: 0x151b46, rough: 0.4, metal: 0.18, envI: 0.8 },
      secondary: { color: 0x0d1130, rough: 0.46, metal: 0.15 },
      accent: { color: 0xd4121f, rough: 0.38, metal: 0.2 },
      torso: { base: '#151b46', emblem: '#e0141f', emblemScale: 1.7, emblemWide: true },
      lens: 0xe8503a, lensEmi: 0x8c1010, rim: 0x0a0a14,
    },
    tasm: {
      // Amazing Spider-Man (Garfield): bright red + near-black navy legs, big
      // black spider with long legs, chrome/silver eye rims
      label: 'Amazing', order: 6, reward: true,
      primary: { color: 0xc21f1c, map: ['#c21f1c', '#101014'], rough: 0.6 },
      secondary: { color: 0x12141d, rough: 0.7 },
      accent: { color: 0xc21f1c, map: ['#c21f1c', '#101014'], rough: 0.6 },
      torso: { base: '#c21f1c', web: '#101014', emblem: '#0c0c0e', emblemScale: 1.28,
               emblemWide: true, side: '#12141d' },
      lens: 0xf4f8fc, lensEmi: 0x5a6068, rim: 0xd0d6dc,
    },
    upgraded: {
      // Far From Home "Upgraded": deep red top + black legs/forearms, sleek
      // black spider, black eye borders
      label: 'Upgraded', order: 7, reward: true,
      primary: { color: 0xc4202a, map: ['#c4202a', '#141414'], rough: 0.58 },
      secondary: { color: 0x101013, rough: 0.66 },
      accent: { color: 0xc4202a, rough: 0.56 },
      torso: { base: '#c4202a', web: '#141414', emblem: '#111114', emblemScale: 1.05,
               side: '#101013' },
      lens: 0xf4f6f8, lensEmi: 0x50565e, rim: 0x111114,
    },
    noir: {
      // Spider-Man Noir (Spider-Verse): black bodysuit + flowing trench coat and
      // fedora, white goggle-lenses. Desaturates the whole world.
      label: 'Noir', order: 8, reward: true,
      primary: { color: 0x1a1a1f, rough: 0.85 },
      secondary: { color: 0x141418, rough: 0.9 },
      accent: { color: 0x0c0c10, rough: 0.9 },
      torso: { base: '#1a1a1f', web: '#3a3a42' },
      lens: 0xf2f2f2, lensEmi: 0x8a8a8a, rim: 0x050506, bigLens: 1.05,
      noir: true, cloak: true, fedora: true,
    },
    og: {
      // THE OG (Raimi / Maguire): warm fire-engine red with heavy raised black
      // webbing everywhere, deep navy-black side panels, arms and legs, the
      // classic compact black spider, and big silver-grey lenses in black rims.
      label: 'OG', order: 9, reward: true,
      primary: { color: 0xc8161d, map: ['#c8161d', '#0b0b10'], rough: 0.55 },
      secondary: { color: 0x161d38, map: ['#161d38', '#080a14'], rough: 0.66 },
      accent: { color: 0xc8161d, map: ['#c8161d', '#0b0b10'], rough: 0.55 },
      torso: { base: '#c8161d', web: '#0b0b10', emblem: '#08080a', emblemScale: 0.9,
               side: '#161d38' },
      lens: 0xd6dbe0, lensEmi: 0x666c74, rim: 0x08080a, bigLens: 1.06,
      // organic shooters: a touch more line-up assist and a cleaner release
      mods: { assist: 1.12, release: 1.1 },
    },
  };
  GAME.SKIN_ORDER = Object.keys(GAME.SKINS)
    .sort((a, b) => GAME.SKINS[a].order - GAME.SKINS[b].order);

  function skinMaterial(def) {
    const m = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: def.rough !== undefined ? def.rough : 0.7,
      metalness: def.metal || 0.05,
    });
    if (def.map) m.map = webTexture(def.map[0], def.map[1]);
    m.envMapIntensity = def.envI || 0.22;
    if (def.emi) { m.emissive = new THREE.Color(def.emi); m.emissiveIntensity = def.emiI || 0.3; }
    return m;
  }

  // ---------- skeleton ----------
  const BONE_DEFS = [
    { name: 'hips',      parent: null,        head: [0, 0, 0],        tail: [0, 0.10, 0] },
    { name: 'spine',     parent: 'hips',      head: [0, 0.10, 0],     tail: [0, 0.56, 0] },
    { name: 'neckHead',  parent: 'spine',     head: [0, 0.64, 0],     tail: [0, 0.93, 0] },
    { name: 'shoulderR', parent: 'spine',     head: [0.245, 0.56, 0], tail: [0.245, 0.28, 0] },
    { name: 'elbowR',    parent: 'shoulderR', head: [0.245, 0.27, 0], tail: [0.245, -0.04, 0] },
    { name: 'shoulderL', parent: 'spine',     head: [-0.245, 0.56, 0], tail: [-0.245, 0.28, 0] },
    { name: 'elbowL',    parent: 'shoulderL', head: [-0.245, 0.27, 0], tail: [-0.245, -0.04, 0] },
    { name: 'hipR',      parent: 'hips',      head: [0.10, -0.05, 0], tail: [0.10, -0.49, 0] },
    { name: 'kneeR',     parent: 'hipR',      head: [0.10, -0.50, 0], tail: [0.10, -0.97, 0] },
    { name: 'hipL',      parent: 'hips',      head: [-0.10, -0.05, 0], tail: [-0.10, -0.49, 0] },
    { name: 'kneeL',     parent: 'hipL',      head: [-0.10, -0.50, 0], tail: [-0.10, -0.97, 0] },
  ];

  function segDist(px, py, pz, a, b) {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const L2 = abx * abx + aby * aby + abz * abz || 1e-9;
    let t = ((px - a[0]) * abx + (py - a[1]) * aby + (pz - a[2]) * abz) / L2;
    t = Math.max(0, Math.min(1, t));
    const dx = px - (a[0] + abx * t), dy = py - (a[1] + aby * t), dz = pz - (a[2] + abz * t);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ---------- lofted tube: one continuous smooth surface ----------
  // sections: [{y, rx, rz, cx, cz}] ordered top→bottom or bottom→top
  function loftGeo(sections, offX, offZ, capStart, capEnd, vScale) {
    const R = 16; // radial segments
    const VS = vScale || 0.24;
    const pos = [], uv = [], idx = [];
    let vAcc = 0;
    for (let s = 0; s < sections.length; s++) {
      const S = sections[s];
      if (s > 0) vAcc += Math.abs(S.y - sections[s - 1].y);
      for (let i = 0; i <= R; i++) {
        const a = (i / R) * Math.PI * 2;
        pos.push(offX + (S.cx || 0) + Math.cos(a) * S.rx,
                 S.y,
                 offZ + (S.cz || 0) + Math.sin(a) * S.rz);
        uv.push(i / R * 2, vAcc / VS);
      }
    }
    const ring = R + 1;
    for (let s = 0; s < sections.length - 1; s++)
      for (let i = 0; i < R; i++) {
        const a = s * ring + i, b = a + 1, c = a + ring, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    // end caps (fan to ring centroid)
    const addCap = (s, flip) => {
      const S = sections[s];
      const ci = pos.length / 3;
      pos.push(offX + (S.cx || 0), S.y, offZ + (S.cz || 0));
      uv.push(0.5, 0.5);
      for (let i = 0; i < R; i++) {
        const a = s * ring + i, b = s * ring + i + 1;
        flip ? idx.push(ci, b, a) : idx.push(ci, a, b);
      }
    };
    if (capStart) addCap(0, false);
    if (capEnd) addCap(sections.length - 1, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function ballGeo(r, pos, rot, scale) {
    const g = new THREE.SphereGeometry(r, 18, 14);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0));
    m.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q,
              new THREE.Vector3(scale ? scale[0] : 1, scale ? scale[1] : 1, scale ? scale[2] : 1));
    g.applyMatrix4(m);
    return g;
  }

  // suit regions — cross-section boundaries meet exactly so color blocks are
  // continuous, like the panel seams on the real suit
  function buildParts() {
    const P = [];
    // lock = single bone (name); chain = restrict weighting to these bones only
    const add = (geo, slot, lock, chain) => P.push({ geo, slot, lock, chain });

    // upper torso — binds ONLY to spine/neck, never to the arms (no shoulder
    // drag → no chest stretch when the arm reaches up the web)
    add(loftGeo([
      { y: 0.16, rx: 0.128, rz: 0.098 },
      { y: 0.30, rx: 0.150, rz: 0.105 },
      { y: 0.44, rx: 0.185, rz: 0.118 },
      { y: 0.52, rx: 0.190, rz: 0.115 },
      { y: 0.58, rx: 0.150, rz: 0.100 },
      { y: 0.64, rx: 0.078, rz: 0.072 },
      { y: 0.72, rx: 0.046, rz: 0.046 },
    ], 0, 0, true, true, 0.72), 'torso', null, ['spine', 'neckHead']);

    // lower torso → pelvis/spine only
    add(loftGeo([
      { y: -0.14, rx: 0.135, rz: 0.095 },
      { y: -0.04, rx: 0.155, rz: 0.108 },
      { y: 0.06,  rx: 0.150, rz: 0.104 },
      { y: 0.16,  rx: 0.128, rz: 0.098 },
    ], 0, 0, true, false), 'secondary', null, ['hips', 'spine']);

    // head + lenses (locked to the head bone). Lenses trimmed ~14% smaller.
    add(ballGeo(0.115, [0, 0.815, 0.005], null, [0.94, 1.2, 1.04]), 'primary', 'neckHead');
    for (const s of [-1, 1]) {
      add(ballGeo(0.048, [0.052 * s, 0.833, 0.096], [-0.14, s * 0.28, s * -0.52],
                  [1.22, 1.62, 0.34]), 'rim', 'neckHead');
      add(ballGeo(0.042, [0.053 * s, 0.833, 0.103], [-0.14, s * 0.28, s * -0.52],
                  [1.18, 1.55, 0.36]), 'lens', 'neckHead');
    }

    // arms → shoulder/elbow chain only
    for (const s of [1, -1]) {
      const sh = s > 0 ? 'shoulderR' : 'shoulderL', el = s > 0 ? 'elbowR' : 'elbowL';
      add(loftGeo([
        { y: 0.57, rx: 0.052, rz: 0.048 },
        { y: 0.50, rx: 0.068, rz: 0.062 },
        { y: 0.42, rx: 0.060, rz: 0.055 },
        { y: 0.28, rx: 0.047, rz: 0.044 },
        { y: 0.20, rx: 0.054, rz: 0.050 },
        { y: 0.02, rx: 0.035, rz: 0.033 },
      ], 0.245 * s, 0, true, true), 'primary', null, [sh, el]);
      add(ballGeo(0.052, [0.245 * s, -0.035, 0.008], null, [0.82, 1.25, 0.95]), 'primary', el);
    }

    // legs → hip/knee chain only; boots + feet locked to the knee
    for (const s of [1, -1]) {
      const hip = s > 0 ? 'hipR' : 'hipL', knee = s > 0 ? 'kneeR' : 'kneeL';
      add(loftGeo([
        { y: -0.10, rx: 0.088, rz: 0.084 },
        { y: -0.24, rx: 0.081, rz: 0.078 },
        { y: -0.40, rx: 0.058, rz: 0.058 },
        { y: -0.48, rx: 0.056, rz: 0.057 },
        { y: -0.58, rx: 0.062, rz: 0.064 },
        { y: -0.72, rx: 0.046, rz: 0.046 },
      ], 0.10 * s, 0, true, false), 'secondary', null, [hip, knee]);
      add(loftGeo([
        { y: -0.72, rx: 0.048, rz: 0.048 },
        { y: -0.80, rx: 0.045, rz: 0.046 },
        { y: -0.88, rx: 0.040, rz: 0.042 },
      ], 0.10 * s, 0, false, true), 'accent', knee);
      add(ballGeo(0.055, [0.10 * s, -0.925, 0.05], null, [0.82, 0.55, 1.8]), 'accent', knee);
    }
    return P;
  }

  function buildSkinnedGeometries(boneIndex) {
    const buckets = {};
    for (const k of ['torso', 'primary', 'secondary', 'accent', 'lens', 'rim'])
      buckets[k] = { pos: [], nrm: [], uv: [], si: [], sw: [], idx: [] };

    for (const part of buildParts()) {
      const g = part.geo, b = buckets[part.slot];
      const base = b.pos.length / 3;
      const gp = g.attributes.position, gn = g.attributes.normal, gu = g.attributes.uv;
      for (let i = 0; i < gp.count; i++) {
        const x = gp.getX(i), y = gp.getY(i), z = gp.getZ(i);
        b.pos.push(x, y, z);
        b.nrm.push(gn.getX(i), gn.getY(i), gn.getZ(i));
        b.uv.push(gu.getX(i), gu.getY(i));
        if (part.lock) {
          b.si.push(boneIndex[part.lock], 0, 0, 0);
          b.sw.push(1, 0, 0, 0);
        } else {
          // only consider this part's own bone chain → no cross-part drag
          const list = part.chain ? part.chain.map(n => boneIndex[n])
                                   : BONE_DEFS.map((_, k) => k);
          let d1 = 1e9, d2 = 1e9, i1 = list[0], i2 = list[0];
          for (const bi of list) {
            const bd = BONE_DEFS[bi];
            const d = segDist(x, y, z, bd.head, bd.tail);
            if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = bi; }
            else if (d < d2) { d2 = d; i2 = bi; }
          }
          if (d2 > d1 * 1.8 || i1 === i2) { b.si.push(i1, 0, 0, 0); b.sw.push(1, 0, 0, 0); }
          else {
            const w1 = 1 / Math.pow(d1 + 0.015, 4), w2 = 1 / Math.pow(d2 + 0.015, 4);
            const sum = w1 + w2;
            b.si.push(i1, i2, 0, 0);
            b.sw.push(w1 / sum, w2 / sum, 0, 0);
          }
        }
      }
      const gi = g.index;
      for (let i = 0; i < gi.count; i++) b.idx.push(base + gi.getX(i));
      g.dispose();
    }
    const out = {};
    for (const k in buckets) {
      const b = buckets[k];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(b.si, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(b.sw, 4));
      geo.setIndex(b.idx);
      out[k] = geo;
    }
    return out;
  }

  // ===== iconic reference poses — exact numbers validated clip-free in the FK
  // oracle (scratchpad/fk.js) before being wired in here =====
  const POSE = {
    // arms flung wide, knees tucked up and splayed → airborne diamond
    // swan: chest arched, arms swept back like wings, legs pointed together
    swan: { shRx: 0.85, shRz: 0.62, elRx: -0.06, shLx: 0.85, shLz: -0.62, elLx: -0.06,
            hipRx: 0.18, hipLx: 0.18, kneeRx: 0.04, kneeLx: 0.04,
            hipRz: -0.05, hipLz: 0.05, spineX: -0.5, headX: 0.42 },
    // superman: both arms punched forward, body straight, legs trailing
    superman: { shRx: -1.55, shRz: 0.3, elRx: -0.06, shLx: -1.55, shLz: -0.3, elLx: -0.06,
                hipRx: 0.22, hipLx: 0.22, kneeRx: 0.3, kneeLx: 0.3,
                hipRz: -0.05, hipLz: 0.05, spineX: -0.18, headX: 0.35 },
    // glide: arms wide on the web-wings, slight arch, legs together as a tail
    glide: { shRx: -0.12, shRz: 1.22, elRx: -0.1, shLx: -0.12, shLz: -1.22, elLx: -0.1,
             hipRx: 0.12, hipLx: 0.12, kneeRx: 0.1, kneeLx: 0.1,
             hipRz: -0.06, hipLz: 0.06, spineX: -0.3, headX: 0.3 },
    airSpread: { shRx: -0.28, shRz: 1.42, elRx: -0.18, shLx: -0.28, shLz: -1.42, elLx: -0.18,
                 hipRx: -1.5, hipLx: -1.5, hipRz: 0.58, hipLz: -0.58,
                 kneeRx: 1.92, kneeLx: 1.92, spineX: 0.12, headX: -0.24 },
    // one arm fires the web, the other pulls back for balance, legs trail split
    // NOSE DIVE — head-first bullet: arms pinned back along the body, legs
    // together with toes trailing, back slightly arched, head up to sight the
    // line. Tiny asymmetries keep it alive. (FK oracle: dive)
    dive: { shRx: -1.0, shRz: -2.72, elRx: -0.22, shLx: -0.94, shLz: 2.78, elLx: -0.28,
            hipRx: -0.14, hipLx: 0.1, kneeRx: 0.14, kneeLx: 0.22,
            hipRz: 0.05, hipLz: -0.05,
            spineX: 0.22, headX: -0.62 },
    webDash: { shRx: -1.48, shRz: -0.32, elRx: -0.12, shLx: 0.92, shLz: 0.52, elLx: -0.78,
               hipRx: 0.48, kneeRx: 0.72, hipLx: -0.32, kneeLx: 1.12,
               hipRz: 0.12, hipLz: -0.16, spineX: 0.16, spineZ: 0.1, headX: -0.34, headY: 0.18 },
    // inverted hang: legs together toward the web, arms tucked at the chest
    upsideHang: { shRx: -1.35, shRz: -0.42, elRx: -1.85, shLx: -1.35, shLz: 0.42, elLx: -1.85,
                  hipRx: 0.05, hipLx: 0.05, hipRz: 0.05, hipLz: -0.05,
                  kneeRx: 0.32, kneeLx: 0.32, spineX: 0.14, headX: 0.22 },
    // tucked into a tight ball clinging to the facade
    wallCrouch: { shRx: -1.12, shRz: 0.52, elRx: -1.42, shLx: -1.12, shLz: -0.52, elLx: -1.42,
                  hipRx: -1.78, hipLx: -1.78, hipRz: 0.26, hipLz: -0.26,
                  kneeRx: 2.18, kneeLx: 2.18, spineX: 0.34, headX: -0.48 },
  };

  class Hero {
    constructor() {
      this.root = new THREE.Group();
      this.body = new THREE.Group();
      // WEB WINGS (Stark glide): two translucent membranes from armpit to hip,
      // scaled flat when stowed, unfurled during a glide
      {
        const wingGeoOf = (sgn) => {
          const g = new THREE.BufferGeometry();
          // triangle fan in body space: armpit → wrist-line → hip
          const v = new Float32Array([
            sgn * 0.14, 0.46, 0.02,     // armpit
            sgn * 1.02, 0.34, -0.04,    // out along the spread arm
            sgn * 0.62, -0.06, -0.02,   // mid membrane
            sgn * 0.12, -0.14, 0.0,     // hip
          ]);
          const pos = new Float32Array([
            v[0], v[1], v[2],  v[3], v[4], v[5],  v[6], v[7], v[8],
            v[0], v[1], v[2],  v[6], v[7], v[8],  v[9], v[10], v[11],
          ]);
          g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          g.computeVertexNormals();
          return g;
        };
        const wingMat = new THREE.MeshLambertMaterial({
          color: 0xc22820, side: THREE.DoubleSide,
          transparent: true, opacity: 0.85 });
        this.wingL = new THREE.Mesh(wingGeoOf(1), wingMat);
        this.wingR = new THREE.Mesh(wingGeoOf(-1), wingMat);
        this.wingL.scale.set(0.01, 1, 1); this.wingR.scale.set(0.01, 1, 1);
        this.wingL.visible = this.wingR.visible = false;
        this._wingK = 0;
        this.body.add(this.wingL, this.wingR);
      }
      // WALDOES (Iron Spider): four articulated mechanical legs from the upper
      // back — the default appendages for this suit, and the tool for the dash.
      {
        const legMat = new THREE.MeshStandardMaterial({ color: 0x9a1b26, metalness: 0.92, roughness: 0.28 });
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xd9a531, metalness: 1, roughness: 0.2 });
        const seg = (len, r0, r1, mat) => { const g = new THREE.CylinderGeometry(r1, r0, len, 6); g.translate(0, len / 2, 0); return new THREE.Mesh(g, mat); };
        this.waldos = new THREE.Group();
        this.waldoLegs = [];
        const mounts = [[-0.15, 0.55, -0.13, 1], [0.15, 0.55, -0.13, -1],
                        [-0.12, 0.40, -0.15, 1], [0.12, 0.40, -0.15, -1]];
        let li = 0;
        for (const [mx, my, mz, sgn] of mounts) {
          const upper = seg(0.34, 0.032, 0.022, legMat);
          upper.position.set(mx, my, mz);
          const baseZ = sgn * (li < 2 ? 0.5 : 0.72), baseX = -0.55;
          upper.rotation.z = baseZ; upper.rotation.x = baseX;
          const fore = seg(0.30, 0.021, 0.008, legMat);
          fore.position.set(0, 0.34, 0); fore.rotation.x = 1.15;
          const tip = seg(0.06, 0.012, 0.001, tipMat);
          tip.position.set(0, 0.30, 0); tip.rotation.x = 0.4;
          fore.add(tip); upper.add(fore);
          this.waldos.add(upper);
          this.waldoLegs.push({ upper, fore, baseZ, baseX, phase: li * 1.7 });
          li++;
        }
        this.waldos.visible = false;
        this._waldoReach = 0; this._waldoT = 0;
        this.body.add(this.waldos);
      }
      this.root.add(this.body);
      this._flipT = 1;
      this._flipType = 0;
      this._reachT = 1;
      this.swingArm = 'R';
      this._buildRig();
      this.body.position.y = 0.97;
      this.setSkin(GAME.settings.skin || 'classic');

      const wg = new THREE.CylinderGeometry(0.028, 0.042, 1, 6, 1, true);
      wg.translate(0, 0.5, 0);
      this.web = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: 0xf5f5f0 }));
      this.web.visible = false;

      this._pose = {};
      this._runPhase = 0;
      this.landTimer = 0;
      this._q = new THREE.Quaternion();
      this._m = new THREE.Matrix4();
      this._up = new THREE.Vector3();
      this._fw = new THREE.Vector3();
      this._tmp = new THREE.Vector3();
      // --- spring follow-through: each joint channel is a damped spring toward
      // its target. Limbs are snappy with visible overshoot (follow-through);
      // the torso/head are heavier and laggier (weight). ---
      this._poseV = {};
      this._bank = 0; this._lean = 0; this._lookY = 0;
      this._lastVel = new THREE.Vector3();
      this._STIFF = { _def: 205, spineX: 95, spineZ: 82, headX: 96, headY: 74,
                      bodyY: 145, hipRx: 150, hipLx: 150, kneeRx: 178, kneeLx: 178 };
      this._ZETA = { _def: 0.62, spineX: 0.85, spineZ: 0.82, headX: 0.85, headY: 0.8,
                     bodyY: 0.9, hipRx: 0.7, hipLx: 0.7, kneeRx: 0.7, kneeLx: 0.7 };
    }

    _buildRig() {
      this.bones = {};
      const boneIndex = {};
      const boneList = [];
      BONE_DEFS.forEach((bd, i) => {
        const bone = new THREE.Bone();
        bone.name = bd.name;
        boneIndex[bd.name] = i;
        this.bones[bd.name] = bone;
        boneList.push(bone);
      });
      BONE_DEFS.forEach((bd) => {
        const bone = this.bones[bd.name];
        if (bd.parent) {
          const pd = BONE_DEFS.find(d => d.name === bd.parent);
          bone.position.set(bd.head[0] - pd.head[0], bd.head[1] - pd.head[1],
                            bd.head[2] - pd.head[2]);
          this.bones[bd.parent].add(bone);
        } else {
          bone.position.set(bd.head[0], bd.head[1], bd.head[2]);
          this.body.add(bone);
        }
      });
      this.body.updateMatrixWorld(true);
      const skeleton = new THREE.Skeleton(boneList);

      const geos = buildSkinnedGeometries(boneIndex);
      this.slots = {};
      for (const k in geos) {
        const mesh = new THREE.SkinnedMesh(geos[k], new THREE.MeshStandardMaterial());
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        this.body.add(mesh);
        mesh.bind(skeleton, new THREE.Matrix4());
        this.slots[k] = [mesh];
      }

      // NOIR fedora — crown + brim, locked to the head bone, hidden by default
      {
        const hatMat = new THREE.MeshLambertMaterial({ color: 0x121216 });
        const fedora = new THREE.Group();
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.16, 12), hatMat);
        crown.position.y = 0.09;
        const dent = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.22),
          new THREE.MeshLambertMaterial({ color: 0x0c0c10 }));
        dent.position.y = 0.17;
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.02, 16), hatMat);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.04, 12),
          new THREE.MeshLambertMaterial({ color: 0x050506 }));
        band.position.y = 0.02;
        fedora.add(brim, crown, band, dent);
        fedora.position.set(0, 0.31, 0.015);   // atop the head bone
        fedora.rotation.x = -0.1;
        fedora.scale.setScalar(0.82);
        fedora.visible = false;
        this.bones.neckHead.add(fedora);
        this.fedora = fedora;
      }
      this.spine = this.bones.spine;
      this.neck = this.bones.neckHead;
      this.armR = { sh: this.bones.shoulderR, el: this.bones.elbowR };
      this.armL = { sh: this.bones.shoulderL, el: this.bones.elbowL };
      this.legR = { hip: this.bones.hipR, knee: this.bones.kneeR };
      this.legL = { hip: this.bones.hipL, knee: this.bones.kneeL };
      this.handAnchors = { R: new THREE.Object3D(), L: new THREE.Object3D(),
                           C: new THREE.Object3D() };
      this.handAnchors.R.position.set(0, -0.31, 0);
      this.handAnchors.L.position.set(0, -0.31, 0);
      this.bones.elbowR.add(this.handAnchors.R);
      this.bones.elbowL.add(this.handAnchors.L);
      // center grip (both hands overhead) for the straddle swing style
      this.handAnchors.C.position.set(0, 0.30, 0.12);
      this.bones.neckHead.add(this.handAnchors.C);
      // foot anchor — the web runs from the feet during the upside-down hang
      this.handAnchors.F = new THREE.Object3D();
      this.handAnchors.F.position.set(0, -0.44, 0.04);
      this.bones.kneeR.add(this.handAnchors.F);
    }

    setSkin(name) {
      const def = GAME.SKINS[name] || GAME.SKINS.classic;
      GAME.settings.skin = name;
      const torsoMat = new THREE.MeshStandardMaterial({
        map: torsoTexture(name, def),
        roughness: def.primary.rough !== undefined ? def.primary.rough : 0.7,
        metalness: def.torsoMetal ? (def.primary.metal || 0.9) : (def.primary.metal || 0.05),
      });
      torsoMat.envMapIntensity = def.primary.envI || 0.22;
      const mats = {
        torso: torsoMat,
        primary: skinMaterial(def.primary),
        secondary: skinMaterial(def.secondary),
        accent: skinMaterial(def.accent),
        lens: new THREE.MeshStandardMaterial({
          color: def.lens, emissive: def.lensEmi, roughness: 0.25, metalness: 0.1 }),
        rim: new THREE.MeshStandardMaterial({
          color: def.rim, roughness: 0.5, metalness: 0.2 }),
      };
      if (this.fedora) this.fedora.visible = !!def.fedora;
      if (this.waldos) this.waldos.visible = (name === 'iron');
      for (const slot in this.slots)
        for (const mesh of this.slots[slot]) {
          if (mesh.material && mesh.material.dispose && mesh.material !== mats[slot])
            mesh.material.dispose();
          mesh.material = mats[slot];
        }
    }

    cycleSkin() {
      const order = GAME.SKIN_ORDER.filter(k => !GAME.unlocks || GAME.unlocks.has(k));
      const i = order.indexOf(GAME.settings.skin);
      const next = order[(i + 1) % order.length];
      this.setSkin(next);
      return GAME.SKINS[next].label;
    }

    setSwingArm(side) { this.swingArm = side; this.webOrigin = side; }

    // kick the waldoes into a forward thrust (dash / stab); decays in update
    waldoReach() { this._waldoReach = 1; }

    // style is chosen by the controller from arc + speed context:
    // 0 reach (workhorse) · 1 straddle (long lazy swings) · 2 cannonball (fast dives)
    onAttach(style) {
      this._reachT = 0;
      this._swingStyle = style | 0;
      this.webOrigin = this.swingArm;
    }
    triggerFlip(type) { this._flipT = 0; this._flipType = type || 0; }

    // roll = forward shoulder-roll recovery; else the planted 3-point landing.
    // Long enough that the springs actually REACH the pose and hold it a beat
    // before easing out — otherwise the landing only half-forms.
    startLanding(roll, power) {
      this.landTimer = roll ? 0.75 : 0.68;
      this._landRoll = !!roll;
      this._landPower = power || 1;
      if (roll) this._rollT = 0;
    }

    _targets(state) {
      const t = {
        shRx: 0, shRz: -0.12, elRx: -0.15,
        shLx: 0, shLz: 0.12, elLx: -0.15,
        hipRx: 0, hipLx: 0, kneeRx: 0.05, kneeLx: 0.05,
        hipRz: 0, hipLz: 0,
        spineX: 0, spineZ: 0, headX: 0, headY: 0, bodyY: 0,
      };
      if (state.mode === 'wallrun') {
        // wall-run reuses the ground run-cycle pose; orientation (feet to the
        // wall) is handled in the body-frame block
        const s2 = Object.create(state); s2.mode = 'ground';
        state = s2;
      }
      if (this._flipT < 1 && state.mode === 'air') {
        const cfg = TRICKS[this._flipType] || TRICKS[0];
        const inDelay = cfg.delay && this._flipT < cfg.delay;
        const poseName = inDelay ? cfg.delayPose : cfg.pose;
        if (poseName === 'spread') { Object.assign(t, POSE.airSpread); return t; }
        if (poseName === 'swan') { Object.assign(t, POSE.swan); return t; }
        if (poseName === 'superman') { Object.assign(t, POSE.superman); return t; }
        if (poseName === 'tuck') {
          // tuck flip — knees apart, arms wide of the torso (no self-clipping)
          t.hipRx = -1.65; t.hipLx = -1.65; t.kneeRx = 2.05; t.kneeLx = 2.05;
          t.hipRz = -0.16; t.hipLz = 0.16;
          t.shRx = -1.05; t.shLx = -1.05; t.shRz = -0.85; t.shLz = 0.85;
          t.elRx = -1.55; t.elLx = -1.55; t.spineX = 0.55; t.headX = -0.5;
        } else {
          // layout twist
          t.shRz = -2.4; t.shLz = 2.4; t.shRx = -0.2; t.shLx = -0.2;
          t.hipRx = -0.15; t.hipLx = -0.15; t.kneeRx = 0.1; t.kneeLx = 0.1;
          t.spineX = -0.2; t.headX = -0.2;
        }
        return t;
      }
      // WEB-WINGS GLIDE — arms locked wide on the membranes
      if (state.gliding && state.mode === 'air') {
        Object.assign(t, POSE.glide);
        const b = Math.sin((this._runPhase += state.dt * 2.2)) * 0.03;
        t.spineX += b;
        return t;
      }

      // UPSIDE-DOWN HANG — dangling still on a taut web
      if (state.hanging) {
        this._runPhase += state.dt * 1.1;
        Object.assign(t, POSE.upsideHang);
        const b = Math.sin(this._runPhase) * 0.035;   // slow idle sway
        t.spineX += b; t.hipRz += b * 0.5; t.hipLz -= b * 0.5;
        return t;
      }
      // WEB-SHOOTING DASH — the instant the web fires, before settling into the
      // swing: one arm extended firing, the other pulled back for balance
      if (state.mode === 'swing' && this._reachT < 0.32) {
        Object.assign(t, POSE.webDash);
        if (this.swingArm === 'L') {   // mirror onto the left arm
          t.shLx = POSE.webDash.shRx; t.shLz = -POSE.webDash.shRz; t.elLx = POSE.webDash.elRx;
          t.shRx = POSE.webDash.shLx; t.shRz = -POSE.webDash.shLz; t.elRx = POSE.webDash.elLx;
          t.headY = -POSE.webDash.headY; t.spineZ = -POSE.webDash.spineZ;
        }
        return t;
      }
      if (state.mode === 'swing') {
        const A = this.swingArm, F = A === 'R' ? 'L' : 'R';
        const sA = A === 'R' ? -1 : 1;   // outward z-rotation sign
        const sF = -sA;
        this._runPhase += state.dt * 2.2;
        const sway = Math.sin(this._runPhase) * 0.04;
        // pendulum phase from vertical velocity: -1 entry … 0 bottom … +1 exit
        const ph = Math.max(-1, Math.min(1, state.vy / 16));
        const wEntry = Math.max(0, -ph), wExit = Math.max(0, ph);
        const wBottom = 1 - Math.abs(ph);
        const reach = Math.min(1, this._reachT * 2.2);
        const style = this._swingStyle | 0;
        const RZ = (side) => (side === 'R' ? -1 : 1);   // z-sign for outward

        if (style === 3) {
          // McFARLANE (ASM #300): extreme arch, torso twisted, legs split hard —
          // the most contorted signature, saved for fast dramatic swings
          t['sh' + A + 'x'] = 0.12; t['sh' + A + 'z'] = sA * 2.92; t['el' + A + 'x'] = -0.06;
          t['sh' + F + 'x'] = 0.68; t['sh' + F + 'z'] = sF * -1.72; t['el' + F + 'x'] = -0.32;
          t['hip' + A + 'x'] = -1.48 + sway; t['knee' + A + 'x'] = 1.62;
          t['hip' + F + 'x'] = 0.72 - sway;  t['knee' + F + 'x'] = 0.34;
          t['hip' + A + 'z'] = RZ(A) * -0.2; t['hip' + F + 'z'] = RZ(F) * 0.1;
          t.spineX = -0.34 + 0.1 * wBottom; t.spineZ = sA * -0.2;
          t.headX = -0.48; t.headY = sA * 0.25;
        } else if (style === 1) {
          // STRADDLE (FK-verified) — active arm up the web, free arm flung out,
          // legs spread WIDE so the strand runs down through the open legs
          t['sh' + A + 'x'] = 0; t['sh' + A + 'z'] = sA * 2.9; t['el' + A + 'x'] = -0.1;
          t['sh' + F + 'x'] = -0.2; t['sh' + F + 'z'] = -sF * 1.3; t['el' + F + 'x'] = -0.2;
          t.hipRx = -0.3 + sway; t.hipLx = -0.3 - sway;
          t.hipRz = 0.7; t.hipLz = -0.7;      // wide straddle
          t.kneeRx = 0.2; t.kneeLx = 0.2;
          t.spineX = -0.05; t.headX = -0.2;
        } else if (style === 2) {
          // CANNONBALL — knees pulled to the chest in a tight ball, one arm up
          t['sh' + A + 'x'] = 0;
          t['sh' + A + 'z'] = sA * (2.55 + 0.35 * reach);
          t['el' + A + 'x'] = -0.1;
          t['sh' + F + 'x'] = -1.35;          // free arm hugs the shins
          t['sh' + F + 'z'] = sF * 0.35;
          t['el' + F + 'x'] = -1.85;
          t.hipRx = -1.95 + sway; t.hipLx = -1.95 - sway;
          t.hipRz = 0.14; t.hipLz = -0.14;
          t.kneeRx = 2.35; t.kneeLx = 2.35;
          t.spineX = 0.5; t.headX = 0.12;
        } else {
          // REACH — the workhorse: active arm up the web, legs trail→tuck→kick
          t['sh' + A + 'x'] = 0;
          t['sh' + A + 'z'] = sA * (2.55 + 0.4 * reach);
          t['el' + A + 'x'] = -0.1;
          t['sh' + F + 'x'] = 0.9 * wEntry - 1.1 * wExit;
          t['sh' + F + 'z'] = -sF * (0.35 + 0.55 * wBottom);   // free arm splays OUT
          t['el' + F + 'x'] = -0.5 + 0.42 * wBottom;           // straightens at the bottom
          const lead = F, off = A;
          // S-tier bottom-of-pendulum (ref sheet): at the bottom the body
          // STRETCHES along the arc — back arched, legs trailing behind, head
          // up — instead of balling up. Entry trails, exit kicks through.
          t['hip' + lead + 'x'] = 0.35 * wEntry + 0.55 * wBottom - 1.6 * wExit + sway;
          t['knee' + lead + 'x'] = 0.45 * wEntry + 0.85 * wBottom + 0.4 * wExit;
          t['hip' + off + 'x'] = 0.55 * wEntry - 0.95 * wBottom - 1.3 * wExit - sway;
          t['knee' + off + 'x'] = 0.35 * wEntry + 1.55 * wBottom + 0.6 * wExit;
          t['hip' + lead + 'z'] = RZ(lead) * 0.16 * wBottom;
          t['hip' + off + 'z'] = RZ(off) * 0.16 * wBottom;
          t.spineX = -0.22 * wEntry - 0.28 * wBottom - 0.08 * wExit;
          t.headX = -0.30 - 0.2 * wBottom - 0.15 * wExit;
        }
      } else if (state.mode === 'crawl' && state.speed < 0.4 && (this._stillTime || 0) > 0.45) {
        // WALL-CRAWL CROUCH — tucked into a tight ball clinging to the facade
        Object.assign(t, POSE.wallCrouch);
      } else if (state.mode === 'crawl') {
        // reach forward and DOWN onto the wall with only a mild outward angle,
        // so the shoulders don't pull the chest mesh wide
        this._runPhase += state.dt * (2 + state.speed * 2.5);
        const s = Math.sin(this._runPhase) * Math.min(1, state.speed * 2) * 0.28;
        t.shRx = -0.85 + s;  t.shRz = 0.5;  t.elRx = -0.7;
        t.shLx = -0.85 - s;  t.shLz = -0.5; t.elLx = -0.7;
        t.hipRx = -0.65 - s;  t.hipRz = 0.28;  t.kneeRx = 0.9;
        t.hipLx = -0.65 + s;  t.hipLz = -0.28; t.kneeLx = 0.9;
        t.spineX = 0.1; t.headX = -0.5;
      } else if (state.mode === 'air' && state.diving) {
        // NOSE DIVE — full-body bullet; a slow flutter keeps it organic
        Object.assign(t, POSE.dive);
        this._runPhase += state.dt * 1.6;
        const fl = Math.sin(this._runPhase) * 0.04;
        t.spineZ = fl; t.hipRz += fl * 0.4; t.hipLz += fl * 0.4;
      } else if (state.mode === 'air' && Math.abs(state.vy) < 3.6) {
        // AIRBORNE SPREAD — hangs at the apex of every jump/arc: arms flung
        // wide, knees tucked and splayed. Auto-plays on flips too.
        Object.assign(t, POSE.airSpread);
      } else if (state.mode === 'air') {
        const dive = Math.max(-1, Math.min(0, state.vy / 30));
        // swan dive: arms sweep back the faster the fall
        t.shRx = -0.55 + dive * 0.5; t.shRz = -2.0 - dive * 0.9;
        t.shLx = -0.55 + dive * 0.5; t.shLz = 2.0 + dive * 0.9;
        t.elRx = -0.35; t.elLx = -0.35;
        t.hipRx = -0.55 - dive * 0.3; t.hipLx = 0.18 + dive * 0.2;
        t.kneeRx = 0.55 + dive * 0.3; t.kneeLx = 0.4;
        t.spineX = 0.28; t.headX = -0.32;
      } else if (this.landTimer > 0 && this._landRoll) {
        // rolling recovery: tight forward tuck, arms wrapped, curled spine
        // (hold at full, then ease out over the last 0.28s)
        const k = Math.min(1, this.landTimer / 0.28);
        t.hipRx = -1.7 * k; t.hipLx = -1.7 * k;
        t.kneeRx = 2.2 * k; t.kneeLx = 2.2 * k;
        t.shRx = -1.5 * k; t.shLx = -1.5 * k;
        t.shRz = -0.5 * k; t.shLz = 0.5 * k;
        t.elRx = -1.7 * k; t.elLx = -1.7 * k;
        t.spineX = 0.75 * k; t.headX = 0.2 * k;
        t.bodyY = -0.35 * k;
      } else if (this.landTimer > 0) {
        // the superhero 3-point landing: right fist to the deck, left leg out
        // (hold at full, then ease out over the last 0.28s)
        const k = Math.min(1, this.landTimer / 0.28);
        // FK-verified 3-point: R fist plants forward-down, L arm sweeps out-left
        t.hipRx = -1.55 * k; t.kneeRx = 2.0 * k; t.hipRz = -0.1 * k;   // tucked under
        t.hipLx = -0.5 * k; t.kneeLx = 0.35 * k; t.hipLz = 0.55 * k;   // extended out
        t.shRx = -0.62 * k; t.shRz = 0.16 * k; t.elRx = -0.15 * k;     // fist to deck ahead
        t.shLx = 0.5 * k; t.shLz = -1.0 * k; t.elLx = -0.4 * k;        // swept out-left
        t.spineX = 0.62 * k; t.headX = -0.55 * k;
        t.bodyY = -0.5 * k;
      } else if (state.speed > 0.5) {
        // Two-beat human run: legs drive fore/aft with a big knee tuck on the
        // recovery (swing) leg and a near-straight stance leg; arms counter-
        // swing bent ~90°; hips and shoulders counter-rotate; body leans in and
        // bobs twice per stride with a heel-strike settle.
        this._runPhase += state.dt * (3.4 + state.speed * 1.0);
        const p = this._runPhase, s = Math.sin(p), c = Math.sin(p + Math.PI);
        const k = Math.min(1, state.speed / GAME.PHYS.runSpeed);
        // thighs
        t.hipRx = s * 0.95 * k; t.hipLx = c * 0.95 * k;
        // knees: tuck hard as the leg swings forward (hip flexed), extend on push-off
        t.kneeRx = (Math.max(0, s) * 1.15 + Math.max(0, -s) * 0.35) * k + 0.12;
        t.kneeLx = (Math.max(0, c) * 1.15 + Math.max(0, -c) * 0.35) * k + 0.12;
        // slight hip roll + splay so the stride isn't rail-straight
        t.hipRz = -0.06 * k; t.hipLz = 0.06 * k;
        // arms: opposite to the legs, elbows bent, driving across the body
        t.shRx = c * 0.58 * k; t.shLx = s * 0.58 * k;
        t.shRz = (-0.2 + c * 0.1) * k; t.shLz = (0.2 - s * 0.1) * k;
        t.elRx = -(1.1 + Math.max(0, c) * 0.3) * k; t.elLx = -(1.1 + Math.max(0, s) * 0.3) * k;
        // torso: lean into the run + shoulder/hip counter-rotation + head bob
        t.spineX = (0.24 + k * 0.16); t.spineZ = s * 0.09 * k;
        t.headY = -s * 0.12 * k; t.headX = -0.08 * k;
        // vertical bob: two beats per stride, dipping at each foot-plant
        t.bodyY = (Math.abs(Math.sin(p)) * 0.07 - 0.02) * k;
      } else {
        this._stillTime = (this._stillTime || 0) + state.dt;
        this._runPhase += state.dt * 1.4;
        const breathe = Math.sin(this._runPhase) * 0.02;
        // Gargoyle crouch (FK-verified) blends in when perched at a rooftop
        // precipice; away from an edge it's just a light ready stance.
        const wantPerch = state.atLedge ? 1 : 0;
        this._perchBlend = (this._perchBlend || 0);
        this._perchBlend += (wantPerch - this._perchBlend) *
                            Math.min(1, state.dt * 3.5);
        const settle = Math.min(1, Math.max(0, (this._stillTime - 0.2) / 0.5));
        const k = this._perchBlend * settle;
        t.hipRx = -1.35 * k; t.hipLx = -1.35 * k;
        t.hipRz = 0.34 * k;  t.hipLz = -0.34 * k;         // knees splayed out
        t.kneeRx = 2.25 * k; t.kneeLx = 2.25 * k;
        t.shRx = -0.72 * k; t.shRz = 0.04 * k; t.elRx = -0.15 * k;   // R hand fwd to ledge
        t.shLx = -0.5 * k; t.shLz = -0.28 * k; t.elLx = -1.4 * k;    // L forearm on knee
        t.spineX = 0.04 + 0.36 * k + breathe;
        t.headX = -0.52 * k;
        t.bodyY = -0.34 * k;
      }
      // still-timer feeds the perch crouch (ground) and the wall-crawl ball
      if (state.speed > 0.5 || (state.mode !== 'ground' && state.mode !== 'crawl'))
        this._stillTime = 0;
      else if (state.mode === 'crawl' && state.speed < 0.4)
        this._stillTime = (this._stillTime || 0) + state.dt;
      return t;
    }

    _applyPose(t, dt) {
      const P = this._pose, PV = this._poseV, S = this._STIFF, Z = this._ZETA;
      const h = Math.min(dt, 0.033);   // clamp for spring stability
      for (const key in t) {
        const target = t[key];
        if (P[key] === undefined) { P[key] = target; PV[key] = 0; continue; }
        const s = S[key] || S._def;
        const c = 2 * Math.sqrt(s) * (Z[key] || Z._def);   // damping (ratio<1 → overshoot)
        const a = s * (target - P[key]) - c * PV[key];
        PV[key] += a * h;
        P[key] += PV[key] * h;
      }
      this.armR.sh.rotation.set(P.shRx || 0, 0, P.shRz || 0);
      this.armL.sh.rotation.set(P.shLx || 0, 0, P.shLz || 0);
      this.armR.el.rotation.x = P.elRx || 0;
      this.armL.el.rotation.x = P.elLx || 0;
      this.legR.hip.rotation.set(P.hipRx || 0, 0, P.hipRz || 0);
      this.legL.hip.rotation.set(P.hipLx || 0, 0, P.hipLz || 0);
      this.legR.knee.rotation.x = P.kneeRx || 0;
      this.legL.knee.rotation.x = P.kneeLx || 0;
      this.spine.rotation.set(P.spineX || 0, 0, P.spineZ || 0);
      this.neck.rotation.set(P.headX || 0, P.headY || 0, 0);
      this.body.position.y = 0.97 + (P.bodyY || 0);
    }

    update(state) {
      this.root.position.copy(state.pos);
      const dt = state.dt;
      if (this.landTimer > 0) this.landTimer -= dt;
      if (this._reachT < 1) this._reachT += dt / 0.35;

      let up = this._up.set(0, 1, 0);
      let fw = this._fw;
      const hs = Math.hypot(state.vel.x, state.vel.z);
      if (hs > 0.5) fw.set(state.vel.x, 0, state.vel.z).normalize();
      else fw.set(Math.sin(state.yaw), 0, Math.cos(state.yaw));

      if (state.hanging && state.wallHangN) {
        // LEDGE HANG: feet grip the parapet, body dangles down the facade —
        // up points straight down, facing out from the wall over the street
        up.set(0, -1, 0);
        fw.set(state.wallHangN.nx, 0, state.wallHangN.nz);
        if (fw.lengthSq() < 0.01) fw.set(0, 0, 1);
        fw.normalize();
      } else if (state.hanging && state.anchor) {
        // UPSIDE-DOWN HANG: feet toward the web, head down — body up points
        // away from the anchor, i.e. straight down
        up.copy(state.pos).sub(state.anchor).normalize();
        fw.addScaledVector(up, -fw.dot(up));
        if (fw.lengthSq() < 0.01) fw.set(0, 0, 1);
        fw.normalize();
      } else if (state.mode === 'swing' && state.anchor) {
        up.copy(state.anchor).sub(state.pos).normalize();
        const v = this._tmp.copy(state.vel);
        v.addScaledVector(up, -v.dot(up));
        if (v.lengthSq() > 1) fw = v.normalize();
        fw.addScaledVector(up, -fw.dot(up)).normalize();
      } else if (state.mode === 'wallrun' && state.wallNormal) {
        // WALL-RUN: feet on the facade — up is the wall normal, facing along
        // the run direction
        up.set(state.wallNormal.nx, 0, state.wallNormal.nz).normalize();
        fw.set(state.vel.x, state.vel.y * 0.3, state.vel.z);
        fw.addScaledVector(up, -fw.dot(up));
        if (fw.lengthSq() < 0.01) fw.set(0, 0, 1);
        fw.normalize();
      } else if (state.mode === 'crawl' && state.wallNormal) {
        fw.set(-state.wallNormal.nx, 0, -state.wallNormal.nz).normalize();
      } else if (state.mode === 'air' && state.diving) {
        // head-first: the body's up-axis aligns WITH the velocity so the head
        // leads the fall; the slerp below makes the tip-over read as a real
        // weight shift rather than a snap
        up.copy(state.vel).normalize();
        fw.addScaledVector(up, -fw.dot(up));
        if (fw.lengthSq() < 0.01) fw.set(up.y, -up.x, 0);
        fw.normalize();
      } else if (state.mode === 'air') {
        const lean = Math.min(0.85, hs / 40);
        up.set(fw.x * lean, 1, fw.z * lean).normalize();
        fw.addScaledVector(up, -fw.dot(up)).normalize();
      }
      const right = this._tmp.crossVectors(up, fw).normalize();
      const fw2 = new THREE.Vector3().crossVectors(right, up);
      this._m.makeBasis(right, up, fw2);
      this._q.setFromRotationMatrix(this._m);
      const slerpK = 1 - Math.exp(-dt * (state.mode === 'swing' ? 10 : 6));
      // Smooth the BASE orientation in its own quaternion, then stamp it onto
      // the body and apply flip/bank as totals on that clean base. Slerping
      // body.quaternion directly kept ~90% of last frame's flip rotation and
      // re-added the full total — compounding into a >10,000°/s tumble.
      if (!this._baseQ) this._baseQ = this.body.quaternion.clone();
      this._baseQ.slerp(this._q, slerpK);
      this.body.quaternion.copy(this._baseQ);

      // Rotations below are the TOTAL angle-so-far, re-applied on the fresh
      // base every frame. At progress 1 the angle is 2π ≡ 0, so the body lands
      // exactly back on its base orientation.
      const spin = (x) => x * x * (3 - 2 * x);   // ease in/out — anticipation + settle

      // forward shoulder-roll during a rolling landing
      if (this._rollT !== undefined && this._rollT < 1 && this.landTimer > 0) {
        this._rollT = Math.min(1, this._rollT + dt / 0.55);
        this.body.rotateOnAxis(FLIP_AXIS_TUCK, Math.PI * 2 * spin(this._rollT));
      }

      // Air flip / barrel roll. 1.3s (was 0.85 — peak velocity hit ~635°/s and
      // read as a violent snap). If interrupted by landing or grabbing a wall,
      // the rotation FINISHES fast but continuously — never snaps to upright.
      if (this._flipT < 1) {
        const cfg = TRICKS[this._flipType] || TRICKS[0];
        const dur = state.mode === 'air' ? cfg.dur : 0.22;
        this._flipT = Math.min(1, this._flipT + dt / dur);
        if (cfg.spins) {
          // optional delay phase (swan hold) before the rotation begins
          const delay = cfg.delay || 0;
          const u = this._flipT <= delay ? 0
            : Math.min(1, (this._flipT - delay) / (1 - delay));
          const axis = cfg.axis === 'twist' ? FLIP_AXIS_TWIST
                     : cfg.axis === 'cork' ? FLIP_AXIS_CORK : FLIP_AXIS_TUCK;
          this.body.rotateOnAxis(axis,
            -Math.PI * 2 * cfg.spins * (cfg.sign || 1) * spin(u));
        }
      }

      // noir cloak: pinned to the shoulders, blown by travel speed
      if (this.cloak) {
        const def = GAME.SKINS[GAME.settings.skin] || {};
        this.cloak.setActive(!!def.cloak);
        if (def.cloak) {
          const sL = this.bones.shoulderL.getWorldPosition(this._cv1);
          const sR = this.bones.shoulderR.getWorldPosition(this._cv2);
          const back = this._cv3.set(0, 0, -1)
            .applyQuaternion(this.body.getWorldQuaternion(this._cq)).normalize();
          this.cloak.update(state.dt, sL, sR, back, state.vel || { x: 0, z: 0 });
        }
      }
      // web-wings unfurl/stow with the glide state
      {
        const want = state.gliding ? 1 : 0;
        this._wingK += (want - this._wingK) * Math.min(1, dt * 7);
        const vis = this._wingK > 0.03;
        this.wingL.visible = this.wingR.visible = vis;
        if (vis) {
          this.wingL.scale.set(Math.max(0.01, this._wingK), 1, 1);
          this.wingR.scale.set(Math.max(0.01, this._wingK), 1, 1);
        }
      }
      // waldoes: idle sway while walking/climbing, thrust forward on a dash.
      // On a wall (crawl/wallrun) they splay wider to "grip" the facade.
      if (this.waldos && this.waldos.visible) {
        this._waldoT += dt;
        this._waldoReach = Math.max(0, this._waldoReach - dt * 2.2);
        const onWall = state.mode === 'crawl' || state.mode === 'wallrun';
        const reach = this._waldoReach;
        for (const L of this.waldoLegs) {
          const sway = Math.sin(this._waldoT * 2.4 + L.phase) * 0.11;
          L.upper.rotation.x = L.baseX + sway - reach * 1.0 + (onWall ? 0.25 : 0);
          L.upper.rotation.z = L.baseZ + (onWall ? Math.sign(L.baseZ) * 0.22 : 0);
          L.fore.rotation.x = 1.15 - sway * 0.6 - reach * 0.7 - (onWall ? 0.3 : 0);
        }
      }

      // ---- momentum secondary motion: a gentle bank/lean/head-lead driven by
      // the smoothed heading-change RATE (not raw acceleration — the rope
      // constraint spikes acceleration every step and made the body wobble) ----
      const vx = state.vel.x, vz = state.vel.z, hspd = Math.hypot(vx, vz);
      const psi = Math.atan2(vx, vz);
      let dpsi = psi - (this._lastPsi === undefined ? psi : this._lastPsi);
      while (dpsi > Math.PI) dpsi -= Math.PI * 2;
      while (dpsi < -Math.PI) dpsi += Math.PI * 2;
      this._lastPsi = psi;
      let turnRate = (hspd > 6 && dt > 1e-4) ? dpsi / dt : 0;
      turnRate = Math.max(-3, Math.min(3, turnRate));       // reject spikes
      this._turnS = (this._turnS || 0) + (turnRate - (this._turnS || 0)) * Math.min(1, dt * 3.2);
      const air = (state.mode === 'swing' || state.mode === 'air');
      const tt = air ? Math.max(-1, Math.min(1, this._turnS * 0.11)) : 0;
      const bankTarget = -tt * 0.2;
      this._bank += (bankTarget - this._bank) * Math.min(1, dt * 3.5);
      const target = this._targets(state);
      target.spineZ = (target.spineZ || 0) - tt * 0.12;     // subtle torso lean
      target.headY = (target.headY || 0) + tt * 0.26;       // head leads the arc

      // ---- look modulation: the mouse shapes the pose. Look down → tuck into
      // a dive; look up → open out; look off-axis → lean the torso and turn the
      // head. Ranges and the tuck clamps are validated in the FK oracle (a
      // maxed-out cannonball must not tuck further or the shins hit the torso).
      if (!state.hanging && state.mode !== 'crawl' && !state.diving
          && this._flipT >= 1 && this.landTimer <= 0) {
        const tuckT = Math.max(-1, Math.min(1, -(state.lookPitch || 0) / 0.9));
        const leanT = Math.max(-1, Math.min(1, (state.lookYawRel || 0) / 1.1));
        const k = state.mode === 'ground' ? 0.22 : 1;      // subtle on foot
        const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        target.hipRx = cl((target.hipRx || 0) - 0.35 * tuckT * k, -1.95, 1.2);
        target.hipLx = cl((target.hipLx || 0) - 0.35 * tuckT * k, -1.95, 1.2);
        target.kneeRx = cl((target.kneeRx || 0) + 0.40 * tuckT * k, 0, 2.35);
        target.kneeLx = cl((target.kneeLx || 0) + 0.40 * tuckT * k, 0, 2.35);
        target.spineX = (target.spineX || 0) + 0.22 * tuckT * k;
        target.spineZ = (target.spineZ || 0) + 0.25 * leanT * k;
        target.headY = (target.headY || 0) + 0.45 * leanT * k;
      }
      this._applyPose(target, dt);
      // banking fights the flip axis — suspend it while rotating
      if (Math.abs(this._bank) > 1e-4 && this._flipT >= 1) this.body.rotateZ(this._bank);

      if (state.mode === 'swing' && state.anchor) {
        this.web.visible = true;
        const hp = new THREE.Vector3();
        const originKey = state.hanging ? 'F'
          : (this.handAnchors[this.webOrigin] ? this.webOrigin : this.swingArm);
        this.handAnchors[originKey].getWorldPosition(hp);
        const d = new THREE.Vector3().copy(state.anchor).sub(hp);
        const len = d.length();
        this.web.position.copy(hp);
        this.web.scale.set(1, len, 1);
        this.web.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      } else {
        this.web.visible = false;
      }
    }

    addTo(scene) {
      scene.add(this.root, this.web);
      this.cloak = new GAME.Cloak(scene);
      this._cv1 = new THREE.Vector3(); this._cv2 = new THREE.Vector3();
      this._cv3 = new THREE.Vector3(); this._cq = new THREE.Quaternion();
    }
  }
  const FLIP_AXIS_TUCK = new THREE.Vector3(1, 0, 0);    // right axis → front flip
  // forward axis → true barrel roll. (This used to be near-vertical, which just
  // spun him like a top instead of rolling around his line of travel.)
  const FLIP_AXIS_TWIST = new THREE.Vector3(0, 0, 1);
  const FLIP_AXIS_CORK = new THREE.Vector3(0, 1, 0);   // corkscrew: spin about body length
  // Trick table — every manual move: rotation axis, revolutions, duration,
  // pose while rotating, optional pre-rotation delay pose (swan hold).
  //   0 F flip · 1 Q barrel roll · 2 E spread · 3 W+F swan double
  //   4 A+F cork L · 5 D+F cork R · 6 S+F double tuck · 7 W+E superman
  const TRICKS = {
    0: { axis: 'tuck',  spins: 1, dur: 1.3,  pose: 'tuck' },
    1: { axis: 'twist', spins: 1, dur: 1.3,  pose: 'layout' },
    2: { axis: 'tuck',  spins: 1, dur: 1.3,  pose: 'spread' },
    3: { axis: 'tuck',  spins: 2, dur: 1.85, pose: 'tuck', delay: 0.34, delayPose: 'swan' },
    4: { axis: 'cork',  spins: 2, dur: 1.5,  pose: 'layout', sign: 1 },
    5: { axis: 'cork',  spins: 2, dur: 1.5,  pose: 'layout', sign: -1 },
    6: { axis: 'tuck',  spins: 2, dur: 1.6,  pose: 'tuck' },
    7: { axis: null,    spins: 0, dur: 1.2,  pose: 'superman' },
  };

  GAME.Hero = Hero;
})();
