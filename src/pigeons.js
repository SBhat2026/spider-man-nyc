// Pigeons: instanced flocks that perch on roofs/streets, scatter when the
// player lands or walks near, circle the sky, then settle on a new perch.
(function () {

  function bodyGeo() {
    const parts = [];
    const add = (geo, color) => {
      const cnt = geo.attributes.position.count;
      const cols = new Float32Array(cnt * 3);
      const c = new THREE.Color(color);
      for (let i = 0; i < cnt; i++) { cols[i*3] = c.r; cols[i*3+1] = c.g; cols[i*3+2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      parts.push(geo);
    };
    const b = new THREE.SphereGeometry(0.085, 8, 6);
    b.scale(0.85, 0.8, 1.35); b.translate(0, 0.1, 0);
    add(b, 0x8d9099);
    const h = new THREE.SphereGeometry(0.045, 7, 5);
    h.translate(0, 0.17, 0.12);
    add(h, 0x4e5a52);                                     // iridescent-ish neck/head
    const beak = new THREE.ConeGeometry(0.012, 0.04, 5);
    beak.rotateX(Math.PI / 2); beak.translate(0, 0.17, 0.17);
    add(beak, 0xc9a03a);
    const tail = new THREE.BoxGeometry(0.07, 0.02, 0.12);
    tail.rotateX(-0.35); tail.translate(0, 0.1, -0.15);
    add(tail, 0x6a6d75);
    // merge
    const pos = [], nrm = [], col = [], idx = [];
    for (const g of parts) {
      const base = pos.length / 3;
      const gp = g.attributes.position, gn = g.attributes.normal, gc = g.attributes.color;
      for (let i = 0; i < gp.count; i++) {
        pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
        nrm.push(gn.getX(i), gn.getY(i), gn.getZ(i));
        col.push(gc.getX(i), gc.getY(i), gc.getZ(i));
      }
      const gi = g.index;
      for (let i = 0; i < gi.count; i++) idx.push(base + gi.getX(i));
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setIndex(idx);
    return out;
  }

  function wingGeo(side) {
    // single wing quad, hinged at x=0
    const g = new THREE.PlaneGeometry(0.24, 0.12, 1, 1);
    g.translate(side * 0.12, 0, 0);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  const SCARE_RADIUS = 9;
  const LAND_SCARE_RADIUS = 16;

  class Pigeons {
    constructor(city) {
      this.city = city;
      this.group = new THREE.Group();
      const G = GAME.GFX;
      const flocks = Math.min(G.pigeonFlocks, city.perches.length);
      const n = this.count = flocks * G.pigeonsPerFlock;
      if (!n) return;

      let seed = 21;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      this._rnd = rnd;

      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const wmat = new THREE.MeshLambertMaterial({
        vertexColors: false, color: 0x9a9da6, side: THREE.DoubleSide });
      this.bodyIM = new THREE.InstancedMesh(bodyGeo(), mat, n);
      this.wingLIM = new THREE.InstancedMesh(wingGeo(-1), wmat, n);
      this.wingRIM = new THREE.InstancedMesh(wingGeo(1), wmat, n);
      this.bodyIM.castShadow = true;
      this.group.add(this.bodyIM, this.wingLIM, this.wingRIM);

      // pick spread-out perch spots
      const spots = city.perches.slice();
      for (let i = spots.length - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        const t = spots[i]; spots[i] = spots[j]; spots[j] = t;
      }
      this.birds = [];
      for (let f = 0; f < flocks; f++) {
        const spot = spots[f % spots.length];
        for (let k = 0; k < G.pigeonsPerFlock; k++) {
          const a = rnd() * Math.PI * 2, r = rnd() * 3;
          this.birds.push({
            mode: 'perch',
            pos: new THREE.Vector3(spot.x + Math.cos(a) * r, spot.y, spot.z + Math.sin(a) * r),
            vel: new THREE.Vector3(),
            yaw: rnd() * Math.PI * 2,
            flap: rnd() * Math.PI * 2,
            flapSpeed: 0,
            target: null,
            t: 0,
            flock: f,
          });
        }
      }
      // more ambient sky-circlers, some high up, so the sky always feels alive
      for (let k = 0; k < 18 && this.birds.length; k++) {
        const b = this.birds[(rnd() * this.birds.length) | 0];
        if (b.mode === 'perch') this._takeOff(b, 70 + rnd() * 130, true);
      }

      this._m = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._e = new THREE.Euler();
      this._s = new THREE.Vector3(1, 1, 1);
      this._off = new THREE.Matrix4();
    }

    _takeOff(b, alt, lazy) {
      b.mode = 'fly';
      const rnd = this._rnd;
      b.t = (lazy ? 18 : 7) + rnd() * 8;
      b.circleCenter = new THREE.Vector3(
        b.pos.x + (rnd() - 0.5) * 120, Math.max(b.pos.y + 25, alt || 45),
        b.pos.z + (rnd() - 0.5) * 120);
      b.circleR = 18 + rnd() * 30;
      b.circleA = rnd() * Math.PI * 2;
      b.circleDir = rnd() < 0.5 ? 1 : -1;
      b.flapSpeed = 16 + rnd() * 6;
      // initial burst away from player
      const p = GAME.player ? GAME.player.pos : b.pos;
      const away = new THREE.Vector3().subVectors(b.pos, p);
      away.y = 0;
      if (away.lengthSq() < 0.1) away.set(rnd() - 0.5, 0, rnd() - 0.5);
      away.normalize();
      b.vel.set(away.x * 6, 7 + rnd() * 3, away.z * 6);
    }

    // stage a dense flock on one perch (street-event bait)
    gatherFlockAt(x, y, z) {
      if (!this.birds || !this.birds.length) return;
      const f = this.birds[(this._rnd() * this.birds.length) | 0].flock;
      for (const b of this.birds) {
        if (b.flock !== f) continue;
        b.mode = 'perch';
        b.vel.set(0, 0, 0); b.flapSpeed = 0; b.target = null;
        const a = this._rnd() * Math.PI * 2, r = this._rnd() * 1.9;
        b.pos.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
        b.yaw = this._rnd() * Math.PI * 2;
      }
    }

    scareNear(px, pz, py, radius) {
      const scared = new Set();
      for (const b of this.birds) {
        if (b.mode !== 'perch') continue;
        const dx = b.pos.x - px, dz = b.pos.z - pz;
        if (dx * dx + dz * dz < radius * radius && Math.abs(b.pos.y - py) < 6)
          scared.add(b.flock);
      }
      if (!scared.size) return;
      for (const b of this.birds)
        if (b.mode === 'perch' && scared.has(b.flock))
          this._takeOff(b, 40 + this._rnd() * 40, false);
    }

    update(dt) {
      if (!this.count) return;
      const rnd = this._rnd;
      const player = GAME.player;
      if (player) {
        // walking close scares; hard landings scare a wider radius (set flag)
        const r = player.justLanded ? LAND_SCARE_RADIUS : SCARE_RADIUS;
        this.scareNear(player.pos.x, player.pos.z, player.pos.y, r);
      }

      let i = 0;
      for (const b of this.birds) {
        if (b.mode === 'fly') {
          b.t -= dt;
          b.circleA += b.circleDir * dt * 0.6;
          const tx = b.circleCenter.x + Math.cos(b.circleA) * b.circleR;
          const tz = b.circleCenter.z + Math.sin(b.circleA) * b.circleR;
          const ty = b.circleCenter.y + Math.sin(b.circleA * 2.3) * 4;
          const acc = new THREE.Vector3(tx - b.pos.x, ty - b.pos.y, tz - b.pos.z);
          const d = acc.length() || 1;
          acc.multiplyScalar(8 / d);
          b.vel.addScaledVector(acc, dt * 3);
          const sp = b.vel.length();
          if (sp > 13) b.vel.multiplyScalar(13 / sp);
          b.pos.addScaledVector(b.vel, dt);
          b.flapSpeed = b.vel.y > -0.5 ? 15 : 4;    // glide on descent
          if (b.t <= 0) {
            // pick a new perch reasonably far from the player
            const perches = this.city.perches;
            let spot = null;
            for (let tries = 0; tries < 8; tries++) {
              const cand = perches[(rnd() * perches.length) | 0];
              const pp = player ? player.pos : b.pos;
              const dx = cand.x - pp.x, dz = cand.z - pp.z;
              if (dx * dx + dz * dz > 900) { spot = cand; break; }
            }
            if (spot) {
              b.mode = 'land';
              b.target = new THREE.Vector3(
                spot.x + (rnd() - 0.5) * 4, spot.y, spot.z + (rnd() - 0.5) * 4);
            } else b.t = 6;
          }
        } else if (b.mode === 'land') {
          const acc = new THREE.Vector3().subVectors(b.target, b.pos);
          const d = acc.length();
          if (d < 0.6) {
            b.mode = 'perch';
            b.pos.copy(b.target);
            b.vel.set(0, 0, 0);
            b.flapSpeed = 0;
            b.yaw = rnd() * Math.PI * 2;
          } else {
            acc.multiplyScalar(6 / d);
            b.vel.addScaledVector(acc, dt * 3.5);
            const maxSp = Math.min(11, 2 + d * 0.8);
            const sp = b.vel.length();
            if (sp > maxSp) b.vel.multiplyScalar(maxSp / sp);
            b.pos.addScaledVector(b.vel, dt);
            b.flapSpeed = d < 8 ? 18 : 10;
          }
        } else {
          // perch: occasional hop/turn
          if (rnd() < dt * 0.15) b.yaw += (rnd() - 0.5) * 2;
        }

        // orientation
        if (b.mode !== 'perch' && b.vel.lengthSq() > 0.4)
          b.yaw = Math.atan2(b.vel.x, b.vel.z);
        b.flap += b.flapSpeed * dt;

        // write matrices
        this._e.set(0, b.yaw, 0);
        this._q.setFromEuler(this._e);
        this._m.compose(b.pos, this._q, this._s);
        this.bodyIM.setMatrixAt(i, this._m);

        const flapA = b.mode === 'perch' ? 0.15
          : 0.25 + Math.sin(b.flap) * 0.85;
        for (const [im, side] of [[this.wingLIM, -1], [this.wingRIM, 1]]) {
          this._e.set(0, b.yaw, side * flapA, 'YZX');
          this._q.setFromEuler(this._e);
          this._off.compose(
            new THREE.Vector3(b.pos.x, b.pos.y + 0.12, b.pos.z), this._q, this._s);
          im.setMatrixAt(i, this._off);
        }
        i++;
      }
      this.bodyIM.instanceMatrix.needsUpdate = true;
      this.wingLIM.instanceMatrix.needsUpdate = true;
      this.wingRIM.instanceMatrix.needsUpdate = true;
    }

    dispose() {
      this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
  }

  GAME.Pigeons = Pigeons;
})();
