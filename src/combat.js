// COMBAT — gated behind GAME.FEATURES.combat (branch: combat).
//
// Design rules this file holds to:
//   * Traversal-first. Combat never grabs you mid-swing; you opt in by
//     pressing the engage key near an encounter.
//   * No player death. Hard hits knock you back and break the combo, nothing
//     more — you can always swing away.
//   * Enemies deliberately read as pedestrians (they ARE the crowd walker
//     mesh, retinted), so a street brawl still looks like a street.
//
// KEYBINDS (desktop) — right hand, leaving WASD+Space completely free:
//   J        light attack — chains 3 hits, 3rd launches. AUTO-LOCKS the
//            nearest target in view, so no lock key is needed to start
//   L        heavy: web-yank at range, finisher up close
//   TAB      cycle target
//   H        hold-lock toggle (optional — pins one target while you reposition)
//   SPACE    still jumps / swings — you can always leave a fight
//   Q        dodge roll (reuses the existing barrel-roll trick pose)
// K is deliberately unused: KEYMAP binds it to the Stark glide.
// Mobile is intentionally NOT wired: the touch scheme is fully allocated.
(function () {

  const REACH = 3.2;         // metres — melee connect distance
  const LOCK_RANGE = 26;     // metres — furthest auto-lock
  const AI_HZ = 10;          // enemy brains tick 10x/sec, not per-frame

  // ---- enemy pool ------------------------------------------------------
  class Enemies {
    constructor(city, scene, crowds) {
      this.city = city; this.scene = scene;
      this.max = (GAME.GFX && GAME.GFX.crowdMax) ? Math.min(8, GAME.GFX.crowdMax) : 8;
      this.list = [];
      this._acc = 0;
      // reuse the crowd walker geometry so enemies read as people, retinted
      // to a muted "crew" palette so they're findable without being neon
      if (!crowds || !crowds.im) return;
      const bodyGeo = crowds.im.geometry, headGeo = crowds.imHead.geometry;
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.im = new THREE.InstancedMesh(bodyGeo, mat, this.max);
      this.imHead = new THREE.InstancedMesh(headGeo, mat.clone(), this.max);
      this.im.frustumCulled = this.imHead.frustumCulled = false;
      const CREW = [0x2a2f3a, 0x33262a, 0x232a26, 0x2e2a34];
      const SKIN = [0xd39b70, 0xa9673f, 0xf0c9a4, 0x8a5230];
      for (let i = 0; i < this.max; i++) {
        this.list.push({ alive: false, x: 0, y: 0, z: 0, hp: 0, state: 'idle',
                         t: 0, stagger: 0, yaw: 0 });
        this.im.setColorAt(i, new THREE.Color(CREW[i % CREW.length]));
        this.imHead.setColorAt(i, new THREE.Color(SKIN[i % SKIN.length]));
      }
      this.im.instanceColor.needsUpdate = true;
      this.imHead.instanceColor.needsUpdate = true;
      this.group = new THREE.Group();
      this.group.add(this.im, this.imHead);
      scene.add(this.group);
      this._m = new THREE.Matrix4(); this._p = new THREE.Vector3();
      this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1.04, 1.04, 1.04);
      this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
      this._UP = new THREE.Vector3(0, 1, 0);
    }

    spawnGroup(x, z, y, n) {
      let made = 0;
      for (const e of this.list) {
        if (made >= n) break;
        if (e.alive) continue;
        const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
        e.alive = true; e.hp = 3; e.state = 'idle'; e.t = 0; e.stagger = 0;
        e.x = x + Math.cos(a) * r; e.z = z + Math.sin(a) * r; e.y = y;
        made++;
      }
      return made;
    }

    activeCount() { let n = 0; for (const e of this.list) if (e.alive) n++; return n; }

    // AI runs on a fixed 10 Hz accumulator — a phone can't afford 8 brains
    // at 60 Hz, and combat AI doesn't need that resolution anyway.
    update(dt, ppos) {
      if (!this.im) return;
      this._acc += dt;
      const step = 1 / AI_HZ;
      let ticks = 0;
      while (this._acc >= step && ticks < 3) { this._acc -= step; ticks++; this._think(step, ppos); }
      for (let i = 0; i < this.max; i++) {
        const e = this.list[i];
        if (!e.alive) { this.im.setMatrixAt(i, this._zero); this.imHead.setMatrixAt(i, this._zero); continue; }
        this._p.set(e.x, e.y, e.z);
        this._q.setFromAxisAngle(this._UP, e.yaw);
        this._m.compose(this._p, this._q, this._s);
        this.im.setMatrixAt(i, this._m);
        this.imHead.setMatrixAt(i, this._m);
      }
      this.im.instanceMatrix.needsUpdate = true;
      this.imHead.instanceMatrix.needsUpdate = true;
    }

    _think(dt, ppos) {
      for (const e of this.list) {
        if (!e.alive) continue;
        e.t += dt;
        if (e.stagger > 0) { e.stagger -= dt; continue; }
        const dx = ppos.x - e.x, dz = ppos.z - e.z;
        const d = Math.hypot(dx, dz) || 1e-3;
        e.yaw = Math.atan2(dx, dz);
        if (d > 60) { e.alive = false; continue; }        // player left — despawn
        if (e.state === 'idle' && d < 24) e.state = 'approach';
        if (e.state === 'approach') {
          if (d > REACH) { const sp = 3.4 * dt; e.x += dx / d * sp; e.z += dz / d * sp; }
          else { e.state = 'windup'; e.t = 0; }
        } else if (e.state === 'windup' && e.t > 0.55) {
          e.state = 'recover'; e.t = 0;
          if (d < REACH + 0.8 && GAME.combat) GAME.combat.onPlayerHit(e);
        } else if (e.state === 'recover' && e.t > 0.7) { e.state = 'approach'; e.t = 0; }
      }
    }

    hit(e, dmg, knock, dirx, dirz) {
      e.hp -= dmg;
      e.stagger = 0.45;
      e.state = 'recover'; e.t = 0;
      e.x += dirx * knock; e.z += dirz * knock;
      if (e.hp <= 0) { e.alive = false; return true; }
      return false;
    }

    dispose() {
      if (!this.group) return;
      this.scene.remove(this.group);
      this.im.material.dispose(); this.imHead.material.dispose();
    }
  }

  // ---- combat controller ----------------------------------------------
  class Combat {
    constructor(enemies) {
      this.enemies = enemies;
      this.target = null;
      this.locked = false;
      this.chain = 0;          // 0..2 light-attack chain position
      this.chainT = 0;
      this.combo = 0;          // hits without being interrupted
      this.cool = 0;
    }

    // nearest live enemy within LOCK_RANGE, biased toward the look direction
    pick(ppos, fwd) {
      let best = null, bs = -1e9;
      for (const e of this.enemies.list) {
        if (!e.alive) continue;
        const dx = e.x - ppos.x, dz = e.z - ppos.z;
        const d = Math.hypot(dx, dz);
        if (d > LOCK_RANGE) continue;
        const dot = (dx / (d || 1)) * fwd.x + (dz / (d || 1)) * fwd.z;
        const score = dot * 2 - d / LOCK_RANGE;
        if (score > bs) { bs = score; best = e; }
      }
      return best;
    }

    toggleLock(ppos, fwd) {
      if (this.locked) { this.locked = false; this.target = null; return false; }
      this.target = this.pick(ppos, fwd);
      this.locked = !!this.target;
      return this.locked;
    }

    cycle(ppos, fwd) {
      const live = this.enemies.list.filter(e => e.alive);
      if (!live.length) return null;
      const i = live.indexOf(this.target);
      this.target = live[(i + 1) % live.length];
      this.locked = true;
      return this.target;
    }

    light(player, fwd) {
      if (this.cool > 0) return false;
      const t = this.target && this.target.alive ? this.target : this.pick(player.pos, fwd);
      if (!t) return false;
      const dx = t.x - player.pos.x, dz = t.z - player.pos.z;
      const d = Math.hypot(dx, dz) || 1e-3;
      // close the gap: a short lunge so you don't have to walk into range
      if (d > REACH) {
        if (d > LOCK_RANGE * 0.5) return false;
        player.pos.x += dx / d * (d - REACH * 0.8);
        player.pos.z += dz / d * (d - REACH * 0.8);
      }
      this.target = t;                 // attacking auto-locks; no lock key needed
      this.chain = (this.chain + 1) % 3;
      this.chainT = 0.55;
      this.cool = 0.22;
      this.combo++;
      const launcher = this.chain === 0;      // 3rd hit
      const died = this.enemies.hit(t, launcher ? 2 : 1, launcher ? 1.6 : 0.7,
                                    dx / d, dz / d);
      if (launcher) { t.y += 1.6; player.vel.y = Math.max(player.vel.y, 4.5); }
      if (GAME.camFx) {
        GAME.camFx.shake = Math.max(GAME.camFx.shake, launcher ? 0.8 : 0.35);
        GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.3);
      }
      if (GAME.comicFX)
        GAME.comicFX.pop(launcher ? 'KRAK' : 'THWAK',
          new THREE.Vector3(t.x, t.y + 1.2, t.z), launcher ? 'krak' : 'thwak', 4.5);
      if (died && GAME.slowmo) GAME.slowmo(0.35);
      return true;
    }

    // K at range = web-yank, K in range = heavy
    heavy(player, fwd) {
      if (this.cool > 0) return false;
      const t = this.target && this.target.alive ? this.target : this.pick(player.pos, fwd);
      if (!t) return false;
      const dx = t.x - player.pos.x, dz = t.z - player.pos.z;
      const d = Math.hypot(dx, dz) || 1e-3;
      this.cool = 0.4;
      if (d > REACH * 1.6) {                   // WEB-YANK
        t.x -= dx / d * (d - REACH);
        t.z -= dz / d * (d - REACH);
        t.stagger = 0.6; t.state = 'recover'; t.t = 0;
        if (GAME.comicFX)
          GAME.comicFX.pop('THWIP!', new THREE.Vector3(t.x, t.y + 1.3, t.z), 'thwip', 4.5);
        if (GAME.audio && GAME.audio.thwip) GAME.audio.thwip();
        return true;
      }
      this.combo++;
      const died = this.enemies.hit(t, 2, 2.4, dx / d, dz / d);
      if (GAME.camFx) GAME.camFx.shake = Math.max(GAME.camFx.shake, 0.9);
      if (GAME.comicFX)
        GAME.comicFX.pop('BAMF', new THREE.Vector3(t.x, t.y + 1.2, t.z), 'bamf', 5);
      if (died && GAME.slowmo) GAME.slowmo(0.4);
      return true;
    }

    // NO DEATH — a hit knocks you back and breaks the combo, that's all
    onPlayerHit(e) {
      const p = GAME.player;
      if (!p) return;
      const dx = p.pos.x - e.x, dz = p.pos.z - e.z;
      const d = Math.hypot(dx, dz) || 1e-3;
      p.vel.x += dx / d * 7; p.vel.z += dz / d * 7; p.vel.y = Math.max(p.vel.y, 3);
      if (p.mode === 'ground') { p.mode = 'air'; p._airTime = 0.05; }
      this.combo = 0;
      if (GAME.camFx) GAME.camFx.shake = Math.max(GAME.camFx.shake, 1.0);
      if (GAME.notify && this.combo === 0) GAME.notify('Hit! Combo broken', 1200);
    }

    update(dt) {
      if (this.cool > 0) this.cool -= dt;
      if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) this.chain = 0; }
      if (this.target && !this.target.alive) { this.target = null; this.locked = false; }
    }
  }

  GAME.Enemies = Enemies;
  GAME.Combat = Combat;
})();
