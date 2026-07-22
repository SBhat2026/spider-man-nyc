// Street events: rare ambient set pieces that pull you across the map.
//   · Rooftop fire — a smoke column rises from a mid-rise within sight;
//     swinging through the smoke gives a style kick. Burns out on its own.
//   · Pigeon flock burst — a dense flock gathers on a nearby perch and
//     erupts when you buzz it.
// One event of each kind at a time, spawned on independent timers.
(function () {

  class StreetEvents {
    constructor(city, scene, pigeons) {
      this.city = city;
      this.scene = scene;
      this.pigeons = pigeons;
      this.group = new THREE.Group();
      scene.add(this.group);

      let seed = 8663;
      this._rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

      // smoke sprite texture (soft dark puff)
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 3, 32, 32, 31);
      g.addColorStop(0, 'rgba(52,48,46,0.7)');
      g.addColorStop(0.6, 'rgba(58,54,52,0.35)');
      g.addColorStop(1, 'rgba(60,56,54,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      this._smokeTex = new THREE.CanvasTexture(cv);

      this.fire = null;            // {x,z,top,t,dur,sprites[],glow,touched}
      this._fireTimer = 35 + this._rnd() * 50;
      this.burst = null;           // {x,z,y,t}
      this._burstTimer = 25 + this._rnd() * 40;
    }

    // ---- rooftop fire ----
    _startFire(ppos) {
      const rnd = this._rnd;
      let b = null;
      for (let tries = 0; tries < 400 && !b; tries++) {
        const cand = this.city.buildings[(rnd() * this.city.buildings.length) | 0];
        if (!cand || !cand.fam || cand.h < 20 || cand.h > 85) continue;
        const cx = (cand.bx0 + cand.bx1) / 2, cz = (cand.bz0 + cand.bz1) / 2;
        const d = Math.hypot(cx - ppos.x, cz - ppos.z);
        if (d > 90 && d < 380 && !this.city.isSolid(cx, cand.h + 1, cz)) b = cand;
      }
      if (!b) return;
      const x = (b.bx0 + b.bx1) / 2, z = (b.bz0 + b.bz1) / 2;
      const sprites = [];
      for (let i = 0; i < 12; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this._smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
        sp.userData = { k: i / 12 };
        this.group.add(sp);
        sprites.push(sp);
      }
      // ember glow at the roofline
      const glow = new THREE.PointLight(0xff6a28, 0, 55, 2);
      glow.position.set(x, b.h + 2, z);
      this.group.add(glow);
      this.fire = { x, z, top: b.h, t: 0, dur: 55, sprites, glow, touched: false };
      if (GAME.notify) GAME.notify('Smoke on the skyline — rooftop fire nearby', 5000);
    }

    _updateFire(dt, ppos) {
      const f = this.fire;
      f.t += dt;
      const life = f.t / f.dur;
      const fade = life < 0.08 ? life / 0.08 : life > 0.85 ? (1 - life) / 0.15 : 1;
      const windX = 2.2, windZ = 0.8;
      for (const sp of f.sprites) {
        const u = sp.userData;
        u.k += dt / 7;                       // 7s per puff cycle
        const k = u.k % 1;
        const rise = k * 34;
        sp.position.set(f.x + windX * rise * 0.12 + Math.sin(u.k * 9) * 1.2,
                        f.top + 1 + rise,
                        f.z + windZ * rise * 0.12 + Math.cos(u.k * 7) * 1.2);
        const sc = 3 + k * 13;
        sp.scale.set(sc, sc, 1);
        sp.material.opacity = fade * 0.55 * (1 - k * 0.75);
      }
      f.glow.intensity = fade * (1.4 + Math.sin(f.t * 9) * 0.5);
      // style kick for threading the column
      if (!f.touched) {
        const dx = ppos.x - f.x, dz = ppos.z - f.z;
        if (dx * dx + dz * dz < 64 && ppos.y > f.top && ppos.y < f.top + 36) {
          f.touched = true;
          if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.85);
          if (GAME.notify) GAME.notify('Through the smoke!', 3500);
        }
      }
      if (f.t >= f.dur) {
        for (const sp of f.sprites) { this.group.remove(sp); sp.material.dispose(); }
        this.group.remove(f.glow);
        this.fire = null;
        this._fireTimer = 100 + this._rnd() * 80;
      }
    }

    // ---- pigeon flock burst ----
    _stageBurst(ppos) {
      if (!this.pigeons || !this.pigeons.gatherFlockAt) return;
      const rnd = this._rnd;
      const perches = this.city.perches || [];
      let spot = null;
      for (let tries = 0; tries < 200 && !spot; tries++) {
        const cand = perches[(rnd() * perches.length) | 0];
        if (!cand) continue;
        const d = Math.hypot(cand.x - ppos.x, cand.z - ppos.z);
        if (d > 60 && d < 260) spot = cand;
      }
      if (!spot) return;
      this.pigeons.gatherFlockAt(spot.x, spot.y, spot.z);
      this.burst = { x: spot.x, y: spot.y, z: spot.z, t: 90 };
    }

    _updateBurst(dt, ppos) {
      const bu = this.burst;
      bu.t -= dt;
      const dx = ppos.x - bu.x, dz = ppos.z - bu.z;
      if (dx * dx + dz * dz < 81 && Math.abs(ppos.y - bu.y) < 10) {
        this.pigeons.scareNear(bu.x, bu.z, bu.y, 14);
        if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.6);
        if (GAME.notify) GAME.notify('Flock burst!', 3000);
        this.burst = null;
        this._burstTimer = 70 + this._rnd() * 60;
      } else if (bu.t <= 0) {
        this.burst = null;
        this._burstTimer = 40 + this._rnd() * 50;
      }
    }

    update(dt, ppos) {
      if (this.fire) this._updateFire(dt, ppos);
      else { this._fireTimer -= dt; if (this._fireTimer <= 0) this._startFire(ppos); }
      if (this.burst) this._updateBurst(dt, ppos);
      else { this._burstTimer -= dt; if (this._burstTimer <= 0) this._stageBurst(ppos); }
    }

    dispose() {
      this.scene.remove(this.group);
      this.group.traverse(o => { if (o.material) o.material.dispose(); });
    }
  }

  GAME.StreetEvents = StreetEvents;
})();
