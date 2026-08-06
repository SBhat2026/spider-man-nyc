// Living crowds: instanced pedestrians walking the sidewalks around the
// player. One InstancedMesh (single draw call); walkers spawn on road-edge
// sidewalks near the player and recycle as he moves. Density falls off with
// altitude — swing high and the street empties to a few specks, land and the
// block fills back in. Non-interactable ambience, NYC-paced.
(function () {

  // instance pool — phones run a smaller crowd (see GFX.crowdMax). Read at
  // construction rather than parse time so the device profile always wins.
  const maxCrowd = () => (GAME.GFX && GAME.GFX.crowdMax) || 160;
  const R_SPAWN = 170;      // walkers live within this radius of the player
  const R_KILL = 210;       // recycled past this

  class Crowds {
    constructor(city) {
      this.city = city;

      // flat segment list once (sidewalk-capable road pieces)
      this.segs = [];
      for (const r of city.zone.roads) {
        const p = r.p;
        for (let i = 1; i < p.length; i++) {
          const ax = p[i - 1][0], az = p[i - 1][1], bx = p[i][0], bz = p[i][1];
          const L = Math.hypot(bx - ax, bz - az);
          if (L < 16) continue;
          this.segs.push({ ax, az, ux: (bx - ax) / L, uz: (bz - az) / L, L, w: r.w });
        }
      }

      // low-poly walker: torso + head + legs, vertex-grayscale × instance tint
      const parts = [];
      const box = (w, h, d, x, y, z, v) => {
        const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
        const cnt = g.attributes.position.count, col = new Float32Array(cnt * 3);
        for (let k = 0; k < cnt; k++) { col[k*3] = v; col[k*3+1] = v; col[k*3+2] = v; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return g;
      };
      parts.push(box(0.36, 0.52, 0.22, 0, 1.02, 0, 1.0));    // torso (tinted)
      parts.push(box(0.17, 0.19, 0.17, 0, 1.44, 0, 0.82));   // head
      parts.push(box(0.11, 0.5, 0.12, 0.09, 0.4, 0, 0.3));   // legs (dark)
      parts.push(box(0.11, 0.5, 0.12, -0.09, 0.4, 0, 0.3));
      parts.push(box(0.08, 0.4, 0.09, 0.24, 0.98, 0, 0.9));  // arms
      parts.push(box(0.08, 0.4, 0.09, -0.24, 0.98, 0, 0.9));
      const ps = [], ns = [], cs = [], ix = [];
      for (const g of parts) {
        const b0 = ps.length / 3, gp = g.attributes.position,
              gn = g.attributes.normal, gc = g.attributes.color;
        for (let i = 0; i < gp.count; i++) {
          ps.push(gp.getX(i), gp.getY(i), gp.getZ(i));
          ns.push(gn.getX(i), gn.getY(i), gn.getZ(i));
          cs.push(gc.getX(i), gc.getY(i), gc.getZ(i));
        }
        for (let i = 0; i < g.index.count; i++) ix.push(b0 + g.index.getX(i));
        g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
      geo.setIndex(ix);
      const MAX = this.max = maxCrowd();
      this.im = new THREE.InstancedMesh(geo,
        new THREE.MeshLambertMaterial({ vertexColors: true }), MAX);
      this.im.frustumCulled = false;
      this.group = new THREE.Group();
      this.group.add(this.im);

      // NYC wardrobe: lots of black/grey coats, hits of color
      const PAL = [0x22242a, 0x2e3138, 0x3a3d45, 0x585b63, 0x14161c, 0x6e7078,
                   0x7a3a30, 0x2e4a6e, 0x51604a, 0x8a7450, 0xb0433a, 0x39597e,
                   0xc8b89a, 0x74538a, 0x9c9ea6, 0x374238];
      let seed = 4241;
      this._rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      this.walkers = [];
      for (let i = 0; i < MAX; i++) {
        this.walkers.push({ alive: false, x: 0, z: 0, ux: 1, uz: 0, dir: 1,
                            t: 0, seg: null, off: 0, speed: 0, ph: 0 });
        this.im.setColorAt(i, new THREE.Color(PAL[(this._rnd() * PAL.length) | 0])
          .multiplyScalar(0.75 + this._rnd() * 0.45));
      }
      this.im.instanceColor.needsUpdate = true;

      this._near = [];       // candidate segs near the player, refreshed ~1 Hz
      this._nearT = 0;
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion();
      this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
      this._UP = new THREE.Vector3(0, 1, 0);
      this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    }

    _refreshNear(px, pz) {
      this._near.length = 0;
      for (const s of this.segs) {
        const mx = s.ax + s.ux * s.L * 0.5, mz = s.az + s.uz * s.L * 0.5;
        const dx = mx - px, dz = mz - pz;
        if (dx * dx + dz * dz < R_SPAWN * R_SPAWN) this._near.push(s);
      }
    }

    _spawn(w, px, pz) {
      if (!this._near.length) return false;
      const rnd = this._rnd;
      const s = this._near[(rnd() * this._near.length) | 0];
      const t = 0.12 + rnd() * 0.76;               // stay off the corners
      const side = rnd() < 0.5 ? 1 : -1;
      const off = (s.w / 2 + 1.2 + rnd() * 2.2) * side;
      const x = s.ax + s.ux * s.L * t - s.uz * off;
      const z = s.az + s.uz * s.L * t + s.ux * off;
      if (this.city.isSolid(x, 1, z)) return false;
      if (GAME.CityPlan.inRoadway(x, z, this.city.zone.roads, 0.2)) return false;
      w.alive = true; w.seg = s; w.t = t; w.off = off;
      w.dir = rnd() < 0.5 ? 1 : -1;
      w.speed = (1.15 + rnd() * 0.75) / s.L;       // NYC walking pace, in t/s
      w.ph = rnd() * 6.28; w.x = x; w.z = z;
      return true;
    }

    update(dt, ppos) {
      if (!this.segs.length) return;
      this._nearT -= dt;
      if (this._nearT <= 0) { this._nearT = 1.0; this._refreshNear(ppos.x, ppos.z); }

      // altitude-scaled density: packed at street level, empty up high
      const altK = Math.max(0, 1 - Math.max(0, ppos.y - 8) / 130);
      const want = Math.round(this.max * altK * (this._near.length ? 1 : 0));

      let alive = 0;
      for (const w of this.walkers) if (w.alive) alive++;
      // spawn / retire toward the target count (a few per frame, no popping)
      let budget = 6;
      for (const w of this.walkers) {
        if (!budget) break;
        if (alive < want && !w.alive) { if (this._spawn(w, ppos.x, ppos.z)) { alive++; budget--; } }
        else if (alive > want && w.alive) { w.alive = false; alive--; budget--; }
      }

      for (let i = 0; i < this.max; i++) {
        const w = this.walkers[i];
        if (!w.alive) { this.im.setMatrixAt(i, this._zero); continue; }
        w.t += w.speed * w.dir * dt;
        if (w.t < 0.1 || w.t > 0.9) w.dir *= -1;   // turn at the corner
        const s = w.seg;
        w.x = s.ax + s.ux * s.L * w.t - s.uz * w.off;
        w.z = s.az + s.uz * s.L * w.t + s.ux * w.off;
        const dx = w.x - ppos.x, dz = w.z - ppos.z;
        if (dx * dx + dz * dz > R_KILL * R_KILL) { w.alive = false; continue; }
        w.ph += dt * 9;
        this._p.set(w.x, 0.2 + Math.abs(Math.sin(w.ph)) * 0.045, w.z);
        this._q.setFromAxisAngle(this._UP, Math.atan2(s.ux * w.dir, s.uz * w.dir));
        this._m.compose(this._p, this._q, this._s);
        this.im.setMatrixAt(i, this._m);
      }
      this.im.instanceMatrix.needsUpdate = true;
    }

    dispose() { this.im.geometry.dispose(); this.im.material.dispose(); }
  }

  GAME.Crowds = Crowds;
})();
