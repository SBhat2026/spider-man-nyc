// LightingRig: sky dome, sun + glow, clouds, hemi/dir lights, fog.
// Blends smoothly between the 'day'/'sunset' presets, then blends the result
// toward 'night' with an independent factor n — three modes, two sliders.
(function () {
  const V = () => new THREE.Vector3();

  function lerpColor(out, a, b, t) {
    out.setHex(a).lerp(new THREE.Color(b), t);
    return out;
  }

  function makeGlowTexture(inner, outer) {
    const N = 256;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.25, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, N, N);
    const t = new THREE.CanvasTexture(cv);
    return t;
  }

  function makeCloudTexture() {
    const N = 256;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    let seed = 13;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 22; i++) {
      const x = 40 + rnd() * (N - 80), y = 70 + rnd() * (N - 150);
      const r = 18 + rnd() * 34;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    return new THREE.CanvasTexture(cv);
  }

  class LightingRig {
    constructor(scene) {
      this.scene = scene;
      this.t = GAME.settings.time === 'sunset' ? 1 : 0; // 0=day 1=sunset
      this.target = this.t;
      this.n = GAME.settings.time === 'night' ? 1 : 0;   // night amount
      this.nTarget = this.n;

      this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      scene.add(this.hemi);

      this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
      this.sun.castShadow = true;
      const s = this.sun.shadow;
      s.mapSize.set(2048, 2048);
      s.camera.near = 10; s.camera.far = 1400;
      s.camera.left = -320; s.camera.right = 320;
      s.camera.top = 320; s.camera.bottom = -320;
      s.bias = -0.0006; s.normalBias = 0.5;
      scene.add(this.sun, this.sun.target);

      this.fog = new THREE.Fog(0xffffff, 200, 2000);
      scene.fog = this.fog;

      // sky dome with vertex gradient
      const geo = new THREE.SphereGeometry(9000, 32, 18);
      const cols = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      this.skyGeo = geo;
      this.sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
      }));
      this.sky.renderOrder = -10;
      scene.add(this.sky);

      // sun disc + glow (billboards, no fog)
      this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,220,160,0.9)'),
        fog: false, depthWrite: false, transparent: true,
      }));
      this.sunDisc.scale.set(260, 260, 1);
      this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(255,190,120,0.8)', 'rgba(255,120,60,0.25)'),
        fog: false, depthWrite: false, transparent: true,
        blending: THREE.AdditiveBlending,
      }));
      this.sunGlow.scale.set(1400, 1400, 1);
      scene.add(this.sunDisc, this.sunGlow);

      // clouds
      this.clouds = new THREE.Group();
      const ct = makeCloudTexture();
      let seed = 5;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 26; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: ct, transparent: true, opacity: 0.6, fog: false, depthWrite: false,
        }));
        const ang = rnd() * Math.PI * 2, R = 500 + rnd() * 1500;
        sp.position.set(Math.cos(ang) * R, 380 + rnd() * 320, Math.sin(ang) * R);
        const sc = 300 + rnd() * 500;
        sp.scale.set(sc, sc * 0.42, 1);
        this.clouds.add(sp);
      }
      scene.add(this.clouds);

      this._cA = new THREE.Color(); this._cB = new THREE.Color();
      this._sunDir = V();
      this.apply(1); // force initial
    }

    // T cycles sunset → day → night → day cycle → sunset
    toggle() {
      const cur = this.cycle ? 'cycle'
        : this.nTarget > 0.5 ? 'night' : (this.target > 0.5 ? 'sunset' : 'day');
      const next = cur === 'sunset' ? 'day' : cur === 'day' ? 'night'
                 : cur === 'night' ? 'cycle' : 'sunset';
      this.setMode(next);
      GAME.settings.time = next;
      return next === 'cycle' ? 'day cycle' : next;
    }
    setMode(m) {
      this.cycle = m === 'cycle';
      if (this.cycle) {
        // pick up the cycle near the current look so there's no visual jump
        this.cyc = this.n > 0.5 ? 0.7 : this.t > 0.5 ? 0.46 : 0.15;
        return;
      }
      this.nTarget = m === 'night' ? 1 : 0;
      if (m !== 'night') this.target = m === 'sunset' ? 1 : 0;
    }
    get sunsetAmount() { return this.t; }

    // t in [0..1]; lerp all preset params
    apply(force) {
      const t = this.t, n = this.n,
            A = GAME.LIGHT.day, B = GAME.LIGHT.sunset, N = GAME.LIGHT.night;
      // day↔sunset first, then pull toward night
      const mix = (a, b, nv) => {
        const v = a + (b - a) * t;
        return nv === undefined ? v : v + (nv - v) * n;
      };
      const mixK = (k) => mix(A[k], B[k], N[k]);
      const colK = (out, k) => {
        out.setHex(A[k]).lerp(new THREE.Color(B[k]), t)
           .lerp(new THREE.Color(N[k]), n);
        return out;
      };

      const az = mixK('sunAzimuth');
      const el = mixK('sunElevation');
      const d = this._sunDir.set(
        Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));

      this.sun.color.copy(colK(this._cA, 'sunColor'));
      this.sun.intensity = mixK('sunIntensity');
      this.hemi.color.copy(colK(this._cA, 'hemiSky'));
      this.hemi.groundColor.copy(colK(this._cB, 'hemiGround'));
      this.hemi.intensity = mixK('hemiIntensity');
      this.fog.color.copy(colK(this._cA, 'fogColor'));
      this.fog.near = mixK('fogNear');
      this.fog.far = mixK('fogFar');
      // high above the city the haze thickens into a glowing blanket below —
      // the aerial "sea of light" look
      const alt = this._alt || 0;
      if (alt > 0) {
        this.fog.near *= 1 - 0.55 * alt;
        this.fog.far *= 1 - 0.3 * alt;
        const hor = colK(new THREE.Color(), 'skyHorizon');
        this.fog.color.lerp(hor, 0.5 * alt);
        this.hemi.intensity += 0.18 * alt;
      }

      // sky dome vertex gradient
      const zen = colK(new THREE.Color(), 'skyZenith');
      const hor = colK(new THREE.Color(), 'skyHorizon');
      const low = colK(new THREE.Color(), 'skyHorizonLow');
      const posA = this.skyGeo.attributes.position, colA = this.skyGeo.attributes.color;
      const tmp = new THREE.Color();
      // sun-side warm bias direction
      for (let i = 0; i < posA.count; i++) {
        const y = posA.getY(i) / 9000;               // -1..1
        const x = posA.getX(i) / 9000, z = posA.getZ(i) / 9000;
        const sunward = Math.max(0, x * d.x + z * d.z); // horizontal alignment w/ sun
        if (y > 0.02) {
          const k = Math.pow(Math.min(1, y), 0.42);
          tmp.copy(hor).lerp(zen, k);
        } else {
          tmp.copy(low);
        }
        // warm the horizon toward the sun at sunset (fades out at night)
        if (t > 0.01 && y < 0.35) {
          tmp.lerp(new THREE.Color(0xffd08a),
                   sunward * (1 - Math.max(0, y) / 0.35) * 0.55 * t * (1 - n));
        }
        colA.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      colA.needsUpdate = true;

      this.sunDisc.material.color.setHex(0xffffff).lerp(new THREE.Color(B.sunDisc), t)
        .lerp(new THREE.Color(N.sunDisc), n);
      // at night the disc shrinks into a moon and the glow nearly dies
      const ds = 260 - 175 * n;
      this.sunDisc.scale.set(ds, ds, 1);
      this.sunGlow.material.opacity =
        Math.min(1, 0.25 + 0.75 * t + 0.3 * (this._alt || 0)) * (1 - 0.8 * n);
      this.sunGlow.material.color.copy(colK(this._cA, 'sunGlow'));

      for (const c of this.clouds.children) {
        c.material.color.copy(colK(this._cA, 'cloudColor'));
        c.material.opacity = mixK('cloudOpacity');
      }

      this.windowGlow = mixK('windowGlow');
      this.headlights = mixK('headlights');
    }

    // follow player: shadow camera tracks the player; the sky dome, clouds
    // and sun sprites track the CAMERA — the dome is scaled to sit just
    // inside camera.far, so centering it anywhere else (photo mode!) lets the
    // far plane clip a black hole into it
    update(dt, playerPos, camPos) {
      const cp = camPos || playerPos;
      // Dynamic day cycle: ~10 real minutes per full day. Drives t (sunset
      // blend) and n (night blend) along a schedule — day, golden hour,
      // night, dawn — reusing the exact same preset-lerp machinery.
      if (this.cycle) {
        this.cyc = ((this.cyc || 0) + dt / 600) % 1;
        const p = this.cyc;
        let t, n;
        if (p < 0.32)      { t = 0; n = 0; }                        // day
        else if (p < 0.42) { t = (p - 0.32) / 0.10; n = 0; }        // → sunset
        else if (p < 0.52) { t = 1; n = 0; }                        // golden hour
        else if (p < 0.60) { t = 1; n = (p - 0.52) / 0.08; }        // dusk
        else if (p < 0.86) { t = 1; n = 1; }                        // night
        else if (p < 0.94) { t = 1; n = 1 - (p - 0.86) / 0.08; }    // dawn
        else               { t = 1 - (p - 0.94) / 0.06; n = 0; }    // → day
        this.t = this.target = t;
        this.n = this.nTarget = n;
        this.apply();
      }
      const alt = Math.max(0, Math.min(1, (playerPos.y - 85) / 130));
      const altChanged = Math.abs(alt - (this._alt || 0)) > 0.03;
      if (altChanged) this._alt = alt;
      if (Math.abs(this.target - this.t) > 0.0005 ||
          Math.abs(this.nTarget - this.n) > 0.0005 || altChanged) {
        this.t = Math.max(0, Math.min(1, this.t + Math.sign(this.target - this.t) * dt / 2.5));
        this.n = Math.max(0, Math.min(1, this.n + Math.sign(this.nTarget - this.n) * dt / 2.5));
        this.apply();
      }
      const d = this._sunDir;
      this.sun.position.set(playerPos.x + d.x * 500, playerPos.y + d.y * 500,
                            playerPos.z + d.z * 500);
      this.sun.target.position.copy(playerPos);
      this.sky.position.set(cp.x, 0, cp.z);
      const sunR = Math.min(8000, this.fog.far * 0.9);   // keep inside camera.far
      this.sunDisc.position.set(cp.x + d.x * sunR, d.y * sunR,
                                cp.z + d.z * sunR);
      this.sunGlow.position.copy(this.sunDisc.position);
      this.clouds.position.set(cp.x, 0, cp.z);
    }
  }

  GAME.LightingRig = LightingRig;
})();
