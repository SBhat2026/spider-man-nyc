// Noir trench-coat / cloak — a low-res verlet cloth simulated in WORLD space
// so it flows correctly no matter how the body flips. The top row is pinned to
// the shoulder line every frame; gravity + a speed-driven wind billow the rest.
// Kept deliberately cheap (6×10 points, ~90 tris).
(function () {
  const COLS = 6, ROWS = 10;

  class Cloak {
    constructor(scene) {
      this.n = COLS * ROWS;
      this.pos = new Float32Array(this.n * 3);
      this.prev = new Float32Array(this.n * 3);
      this.geo = new THREE.BufferGeometry();
      this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      const idx = [];
      for (let r = 0; r < ROWS - 1; r++) for (let c = 0; c < COLS - 1; c++) {
        const a = r * COLS + c, b = a + 1, d = a + COLS, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
      this.geo.setIndex(idx);
      this.mesh = new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial({
        color: 0x14141a, side: THREE.DoubleSide, roughness: 1 }));
      this.mesh.frustumCulled = false;
      this.mesh.visible = false;
      this.mesh.castShadow = true;
      scene.add(this.mesh);
      this._init = false;
      this._t = 0;
    }

    setActive(on) {
      if (!on && this.mesh.visible) this._init = false;
      this.mesh.visible = on;
    }

    _reset(anchors, drop) {
      // hang straight down from each column's top anchor
      for (let c = 0; c < COLS; c++) {
        const ax = anchors[c * 3], ay = anchors[c * 3 + 1], az = anchors[c * 3 + 2];
        for (let r = 0; r < ROWS; r++) {
          const i = (r * COLS + c) * 3;
          const y = ay - (r / (ROWS - 1)) * drop;
          this.pos[i] = ax; this.pos[i + 1] = y; this.pos[i + 2] = az;
          this.prev[i] = ax; this.prev[i + 1] = y; this.prev[i + 2] = az;
        }
      }
      this._init = true;
    }

    // sL/sR: shoulder world positions · back: unit "behind the body" dir · vel: world velocity
    update(dt, sL, sR, back, vel) {
      if (!this.mesh.visible) return;
      dt = Math.min(dt, 0.033);
      this._t += dt;
      const span = Math.max(0.35, sL.distanceTo(sR));
      const drop = span * 4.3, width = span * 1.35;
      // top-row anchors, spread across the shoulders, pushed behind + up to the collar
      const anchors = new Float32Array(COLS * 3);
      for (let c = 0; c < COLS; c++) {
        const t = c / (COLS - 1);
        anchors[c * 3]     = sR.x + (sL.x - sR.x) * t + back.x * span * 0.32;
        anchors[c * 3 + 1] = sR.y + (sL.y - sR.y) * t + span * 0.18;
        anchors[c * 3 + 2] = sR.z + (sL.z - sR.z) * t + back.z * span * 0.32;
      }
      if (!this._init || Math.abs(this.pos[0] - anchors[0]) > span * 8) this._reset(anchors, drop);

      // wind: air rushes past opposite to travel; coat trails and lifts with speed
      const spd = Math.hypot(vel.x, vel.z);
      const flutter = Math.sin(this._t * 8) * 0.5 + Math.sin(this._t * 4.7) * 0.35;
      const wx = -vel.x * 0.42 + back.x * (0.8 + spd * 0.14 + flutter);
      const wy = 0.4 + Math.min(spd, 26) * 0.12;     // gentle lift, mostly hangs
      const wz = -vel.z * 0.42 + back.z * (0.8 + spd * 0.14 + flutter);

      // verlet integrate free points (row 0 is pinned)
      const g = -9.8;
      for (let r = 1; r < ROWS; r++) {
        const rowK = r / (ROWS - 1);      // lower rows blow more freely
        for (let c = 0; c < COLS; c++) {
          const i = (r * COLS + c) * 3;
          for (let a = 0; a < 3; a++) {
            const cur = this.pos[i + a];
            const v = (cur - this.prev[i + a]) * 0.95;
            this.prev[i + a] = cur;
            let acc = a === 1 ? g : 0;
            acc += (a === 0 ? wx : a === 1 ? wy : wz) * rowK;
            this.pos[i + a] = cur + v + acc * dt * dt;
          }
        }
      }
      // pin the top row to the shoulder anchors
      for (let c = 0; c < COLS; c++) {
        const i = c * 3, j = c * 3;
        this.pos[j] = anchors[i]; this.pos[j + 1] = anchors[i + 1]; this.pos[j + 2] = anchors[i + 2];
        this.prev[j] = anchors[i]; this.prev[j + 1] = anchors[i + 1]; this.prev[j + 2] = anchors[i + 2];
      }
      // distance constraints (structural), a few passes
      const restH = width / (COLS - 1), restV = drop / (ROWS - 1);
      for (let iter = 0; iter < 3; iter++) {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c;
          if (c < COLS - 1) this._constrain(i, i + 1, restH, r === 0);
          if (r < ROWS - 1) this._constrain(i, i + COLS, restV, r === 0);
        }
      }
      // never sink through the street
      for (let k = 1; k < this.n; k++) if (this.pos[k * 3 + 1] < 0.1) this.pos[k * 3 + 1] = 0.1;

      this.geo.attributes.position.needsUpdate = true;
      this.geo.computeVertexNormals();
    }

    _constrain(ai, bi, rest, aPinned) {
      // a is pinned only when it sits on the top (shoulder) row: then b takes
      // the whole correction; otherwise both move half.
      const a = ai * 3, b = bi * 3;
      let dx = this.pos[b] - this.pos[a], dy = this.pos[b + 1] - this.pos[a + 1],
          dz = this.pos[b + 2] - this.pos[a + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-4;
      const k = (d - rest) / d;
      if (aPinned) {
        this.pos[b] -= dx * k; this.pos[b + 1] -= dy * k; this.pos[b + 2] -= dz * k;
      } else {
        const h = k * 0.5;
        this.pos[a] += dx * h; this.pos[a + 1] += dy * h; this.pos[a + 2] += dz * h;
        this.pos[b] -= dx * h; this.pos[b + 1] -= dy * h; this.pos[b + 2] -= dz * h;
      }
    }

    dispose() { this.geo.dispose(); this.mesh.material.dispose(); }
  }

  GAME.Cloak = Cloak;
})();
