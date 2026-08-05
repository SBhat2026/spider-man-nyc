// SWING OF THE DAY — a waypoint route generated from a seed derived from
// today's date, so every player gets the same course and it rotates every 24h.
// Pure geometry over the existing city data: no extra assets, no server.
(function () {

  // deterministic PRNG (mulberry32) so a given date always yields a given route
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dayKey(d) {
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  const REACH = 17;            // metres — how close counts as hitting a gate
  const RING_COLOR = 0xffc83c;

  class DailyRun {
    constructor(city, scene) {
      this.city = city;
      this.scene = scene;
      this.key = dayKey(new Date());
      this.active = false;
      this.i = 0;
      this.t = 0;
      this.best = null;
      try {
        const s = JSON.parse(localStorage.getItem('spidey.daily.v1'));
        if (s && s.key === this.key) this.best = s.best;
      } catch (e) {}

      this.points = this._buildRoute();

      const geo = new THREE.TorusGeometry(9, 0.8, 8, 28);
      const mat = new THREE.MeshBasicMaterial({
        color: RING_COLOR, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      this.ring = new THREE.Mesh(geo, mat);
      this.ring.visible = false;
      scene.add(this.ring);
    }

    // pick N tall-ish rooftops spread across the map, seeded by the date, then
    // chain them nearest-neighbour so the route flows instead of ping-ponging
    _buildRoute() {
      const r = rng(this.key);
      const tall = this.city.buildings.filter(b => b.h > 45 && b.h < 260);
      if (!tall.length) return [];
      const pts = [];
      const N = 6 + Math.floor(r() * 5);            // 6–10 waypoints
      let guard = 0;
      while (pts.length < N && guard++ < 4000) {
        const b = tall[Math.floor(r() * tall.length)];
        if (!b) break;
        const x = (b.bx0 + b.bx1) / 2, z = (b.bz0 + b.bz1) / 2;
        if (pts.some(p => Math.hypot(p.x - x, p.z - z) < 260)) continue;
        pts.push({ x: x, y: b.h + 12, z: z });
      }
      const ord = [], pool = pts.slice();
      let cur = pool.shift();
      while (cur) {
        ord.push(cur);
        let bi = -1, bd = Infinity;
        for (let i = 0; i < pool.length; i++) {
          const d = Math.hypot(pool[i].x - cur.x, pool[i].z - cur.z);
          if (d < bd) { bd = d; bi = i; }
        }
        cur = bi >= 0 ? pool.splice(bi, 1)[0] : null;
      }
      return ord;
    }

    label() {
      if (!this.points.length) return 'No route today';
      const b = this.best ? ' · best ' + this.best.toFixed(1) + 's' : '';
      return this.points.length + ' gates' + b;
    }

    start() {
      if (!this.points.length) return false;
      this.active = true;
      this.i = 0;
      this.t = 0;
      this._show();
      if (GAME.notify)
        GAME.notify('SWING OF THE DAY — ' + this.points.length + ' gates, go!', 4000);
      return true;
    }

    stop(done) {
      this.active = false;
      this.ring.visible = false;
      if (done) {
        const time = this.t;
        const isBest = this.best === null || time < this.best;
        if (isBest) {
          this.best = time;
          try {
            localStorage.setItem('spidey.daily.v1',
              JSON.stringify({ key: this.key, best: time }));
          } catch (e) {}
        }
        if (GAME.notify)
          GAME.notify('ROUTE COMPLETE — ' + time.toFixed(1) + 's' +
                      (isBest ? '  (new best!)' : ''), 7000);
      }
    }

    _show() {
      const p = this.points[this.i];
      if (!p) return;
      this.ring.position.set(p.x, p.y, p.z);
      this.ring.visible = true;
    }

    // aim the ring at the player so it always reads as a gate to fly through
    update(dt, ppos) {
      if (!this.active || !ppos) return;
      this.t += dt;
      const p = this.points[this.i];
      if (!p) return;
      this.ring.lookAt(ppos.x, ppos.y, ppos.z);
      const s = 1 + Math.sin(this.t * 3) * 0.04;
      this.ring.scale.set(s, s, s);
      const dx = ppos.x - p.x, dy = ppos.y - p.y, dz = ppos.z - p.z;
      if (dx * dx + dy * dy + dz * dz < REACH * REACH) {
        this.i++;
        if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.5);
        if (GAME.comicFX && GAME.settings.skin === 'noir')
          GAME.comicFX.pop('ZIP!', this.ring.position, 'whoosh', 5);
        if (this.i >= this.points.length) this.stop(true);
        else {
          this._show();
          if (GAME.notify)
            GAME.notify('Gate ' + this.i + '/' + this.points.length +
                        '  ·  ' + this.t.toFixed(1) + 's', 1400);
        }
      }
    }

    dispose() {
      this.scene.remove(this.ring);
      this.ring.geometry.dispose();
      this.ring.material.dispose();
    }
  }

  GAME.DailyRun = DailyRun;
})();
