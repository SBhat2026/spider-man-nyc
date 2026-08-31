// Suit-special world effects: crack decals (Iron Spider waldo stabs),
// web-trampolines + walkable zip-lines (Amazing), and spider-sense reveal
// beacons (Upgraded). All world-space; pooled where it's cheap.
(function () {

  function crackTex() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); const cx = 64, cy = 64;
    c.strokeStyle = 'rgba(20,20,22,0.9)'; c.lineWidth = 2.4;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + Math.random() * 0.3;
      let x = cx, y = cy; c.beginPath(); c.moveTo(x, y);
      const steps = 3 + (i % 3);
      for (let s = 0; s < steps; s++) {
        x += Math.cos(a) * (10 + Math.random() * 9) + (Math.random() - 0.5) * 8;
        y += Math.sin(a) * (10 + Math.random() * 9) + (Math.random() - 0.5) * 8;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }

  function netTex() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); const cx = 64, cy = 64;
    c.strokeStyle = 'rgba(245,245,250,0.85)'; c.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62); c.stroke(); }
    for (let r = 12; r < 64; r += 12) {
      c.beginPath();
      for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }

  // a web has to hang off SOMETHING: these bound the alley/street gap the
  // Amazing net will agree to span
  const NET_MIN_SPAN = 7;
  const NET_MAX_SPAN = 34;
  const NET_LIFE = 16;      // seconds a strung net survives before it frays
  const NET_DROP = 3.2;     // how far below you it hangs — sets the bounce budget

  class Specials {
    constructor(scene) {
      this.scene = scene;
      this.cracks = [];        // active {mesh,t}
      this.nets = [];          // {mesh,pos,r,t,cd}
      this.zips = [];          // {a,b,mesh,t}
      this.beacons = [];       // {sp,t,base}
      this._crackTex = crackTex();
      this._netTex = netTex();
      this._crackPool = [];
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6),
          new THREE.MeshBasicMaterial({ map: this._crackTex, transparent: true,
            opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        m.visible = false; scene.add(m); this._crackPool.push(m);
      }
      this._ci = 0;
      this._tmp = new THREE.Vector3();
    }

    // --- Iron Spider: a fading cracked-concrete decal where a waldo stabs in ---
    crack(pos, normal) {
      const m = this._crackPool[this._ci = (this._ci + 1) % this._crackPool.length];
      m.position.copy(pos).addScaledVector(normal, 0.06);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
      m.quaternion.copy(q);
      const s = 1 + Math.random() * 0.8; m.scale.set(s, s, s);
      m.material.opacity = 0.95; m.visible = true;
      const rec = { mesh: m, t: 0 };
      this.cracks.push(rec);
    }

    // --- Amazing: a web strung ACROSS a gap between two buildings ---------
    // This used to drop a free-floating 5 m disc under the player wherever he
    // happened to be, on no cooldown, with a bounce that ADDED energy — which
    // is exactly the infinite-spawn ladder you could ride to the sky. Now the
    // net has to have something to hang off: it probes for the narrowest pair
    // of opposing facades around him and sizes itself to span them, so it
    // visibly bites into both walls like a real web strung across an alley.
    // No gap, no net.
    //
    // Returns { span } on success, or null with a reason on `this.lastNetFail`.
    webNet(pos, city) {
      this.lastNetFail = null;
      if (!city) { this.lastNetFail = 'No city'; return null; }
      const y = Math.max(1.2, pos.y - NET_DROP);   // hangs below him, in clear view
      const N = 16, HALF = NET_MAX_SPAN * 0.5 + 4;
      const dist = new Array(N), hitX = new Array(N), hitZ = new Array(N);
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        const dx = Math.cos(a), dz = Math.sin(a);
        let d = Infinity;
        for (let s = 1.0; s <= HALF; s += 0.6) {
          if (city.isSolid(pos.x + dx * s, y, pos.z + dz * s)) { d = s; break; }
        }
        dist[i] = d;
        hitX[i] = pos.x + dx * d; hitZ[i] = pos.z + dz * d;
      }
      // the narrowest crossing with a facade on BOTH sides is the alley/street
      let best = -1, bestSpan = Infinity;
      for (let i = 0; i < N / 2; i++) {
        const j = i + N / 2;
        if (!isFinite(dist[i]) || !isFinite(dist[j])) continue;
        const span = dist[i] + dist[j];
        if (span < bestSpan) { bestSpan = span; best = i; }
      }
      if (best < 0) { this.lastNetFail = 'Nothing to string it between'; return null; }
      if (bestSpan < NET_MIN_SPAN) { this.lastNetFail = 'Too tight to web'; return null; }
      if (bestSpan > NET_MAX_SPAN) { this.lastNetFail = 'Gap too wide to span'; return null; }

      const jj = best + N / 2;
      const cx = (hitX[best] + hitX[jj]) / 2, cz = (hitZ[best] + hitZ[jj]) / 2;
      const ang = best / N * Math.PI * 2;
      // rx spans wall to wall (+ a little so the rim sinks into both facades);
      // rz is the free direction down the street, kept in proportion
      const rx = bestSpan / 2 + 0.5;
      const p1 = best + N / 4, p2 = (best + 3 * N / 4) % N;
      const perp = (isFinite(dist[p1]) && isFinite(dist[p2]))
        ? (dist[p1] + dist[p2]) / 2 : rx * 1.25;
      const rz = Math.max(3, Math.min(rx * 1.5, perp));

      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 26),
        new THREE.MeshBasicMaterial({ map: this._netTex, transparent: true,
          opacity: 0.92, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -ang;                 // local x lands on the span axis
      m.scale.set(rx, rz, 1);              // pre-rotation, so x IS the span axis
      m.position.set(cx, y, cz);
      m.renderOrder = 2;
      this.scene.add(m);
      this.nets.push({ mesh: m, pos: m.position.clone(), rx, rz,
                       ca: Math.cos(ang), sa: Math.sin(ang), t: 0, cd: 0 });
      if (this.nets.length > 6) {
        const old = this.nets.shift();
        this.scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose();
      }
      return { span: bestSpan };
    }

    // --- Amazing: walkable zip-line strung to a building; lasts a day cycle ---
    zipline(a, b) {
      if (!b) return false;
      const A = new THREE.Vector3(a.x, a.y, a.z);
      const B = new THREE.Vector3(b.x, Math.max(1, b.y - 0.5), b.z);
      const len = A.distanceTo(B);
      if (len < 12 || len > 220) return false;
      const geo = new THREE.CylinderGeometry(0.09, 0.09, len, 6);
      geo.translate(0, len / 2, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf2f2ee }));
      m.position.copy(A);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
        B.clone().sub(A).normalize());
      this.scene.add(m);
      this.zips.push({ a: A, b: B, mesh: m, t: 0 });
      if (this.zips.length > 8) { const old = this.zips.shift(); this.scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose(); }
      return true;
    }

    // raise the ground-support height when the player is over a zip-line, so
    // he can land on it and walk it like a tightrope (falls off past ~0.7 m)
    supportOnZip(pos, support) {
      for (const z of this.zips) {
        const ax = z.a.x, az = z.a.z, bx = z.b.x, bz = z.b.z;
        const dx = bx - ax, dz = bz - az; const L2 = dx * dx + dz * dz || 1e-4;
        let t = ((pos.x - ax) * dx + (pos.z - az) * dz) / L2;
        t = Math.max(0, Math.min(1, t));
        const lx = ax + dx * t, lz = az + dz * t;
        const hd = Math.hypot(pos.x - lx, pos.z - lz);
        if (hd > 0.7) continue;
        const ry = z.a.y + (z.b.y - z.a.y) * t;
        if (pos.y > ry - 1.5 && pos.y < ry + 3 && ry > support)
          support = ry;
      }
      return support;
    }

    // --- Upgraded: spider-sense pulse reveals nearby eggs / photo targets ---
    revealNearby(pos) {
      const pts = [];
      const L = GAME.landmarks;
      if (L && L.eggs) for (const e of L.eggs) {
        const d = Math.hypot(e.x - pos.x, e.z - pos.z);
        if (d < 500) pts.push(new THREE.Vector3(e.x, (e.y || 40), e.z));
      }
      // dispose, don't just unparent — each pulse minted a fresh SpriteMaterial
      // per egg and dropped the old one on the floor, so holding the key leaked
      // a GPU material every frame
      for (const rec of this.beacons) {
        this.scene.remove(rec.sp);
        if (rec.sp.material) rec.sp.material.dispose();
      }
      this.beacons.length = 0;
      for (const p of pts) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          color: 0x7fe0ff, transparent: true, opacity: 0.9,
          depthTest: false, depthWrite: false }));
        sp.position.copy(p); sp.scale.setScalar(6);
        sp.renderOrder = 998; this.scene.add(sp);
        this.beacons.push({ sp, t: 0, base: 6 });
      }
      return pts.length;
    }

    update(dt, player) {
      // cracks fade out over 5 s
      for (let i = this.cracks.length - 1; i >= 0; i--) {
        const rec = this.cracks[i]; rec.t += dt;
        const k = rec.t / 5;
        if (k >= 1) { rec.mesh.visible = false; this.cracks.splice(i, 1); continue; }
        rec.mesh.material.opacity = 0.95 * (1 - k);
      }
      // strung nets: bounce a falling player, then fray away over 16 s
      for (let i = this.nets.length - 1; i >= 0; i--) {
        const net = this.nets[i]; net.t += dt; net.cd -= dt;
        net.mesh.material.opacity = 0.92 * Math.max(0, Math.min(1, (NET_LIFE - net.t) / 3));
        if (net.t > NET_LIFE) {
          this.scene.remove(net.mesh); net.mesh.geometry.dispose();
          net.mesh.material.dispose(); this.nets.splice(i, 1); continue;
        }
        if (player && net.cd <= 0 && player.vel.y < 0) {
          // into the net's own frame: it's an ellipse, not a disc
          const ox = player.pos.x - net.pos.x, oz = player.pos.z - net.pos.z;
          const u = (ox * net.ca + oz * net.sa) / net.rx;
          const v = (-ox * net.sa + oz * net.ca) / net.rz;
          if (u * u + v * v < 1 && Math.abs(player.pos.y - net.pos.y) < 2.0) {
            // LOSSY, and the additive term matters more than it looks. The old
            // bounce returned 85% of impact speed plus a flat 13 m/s, so every
            // bounce came back higher than the last. Any `e·v + c` bounce
            // settles at c/(1-e); for the net to be a dead end that fixed point
            // has to lift you LESS than the height you fall to reach the net.
            // The net hangs NET_DROP below you, so the ceiling on c is
            // (1-e)·sqrt(2g·NET_DROP) ≈ 3.5 — 2.5 keeps a margin. A real fall
            // still throws you properly, because e·v dominates by then.
            player.vel.y = Math.min(26, Math.abs(player.vel.y) * 0.55 + 2.5);
            player.vel.x *= 0.86; player.vel.z *= 0.86;
            if (player.mode === 'ground') { player.mode = 'air'; player._airTime = 0.05; }
            player.anchor = null;
            net.cd = 0.35;
            if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.45);
            if (GAME.comicFX && GAME.settings.skin === 'noir') GAME.comicFX.pop('BOING', net.pos, 'bamf', 6);
          }
        }
      }
      // zip-lines persist a full day cycle (~600 s), then fray away
      for (let i = this.zips.length - 1; i >= 0; i--) {
        const z = this.zips[i]; z.t += dt;
        if (z.t > 600) { this.scene.remove(z.mesh); z.mesh.geometry.dispose(); z.mesh.material.dispose(); this.zips.splice(i, 1); }
      }
      // spider-sense beacons pulse then fade over 6 s
      for (let i = this.beacons.length - 1; i >= 0; i--) {
        const rec = this.beacons[i]; rec.t += dt;
        if (rec.t > 6) {
          this.scene.remove(rec.sp);
          if (rec.sp.material) rec.sp.material.dispose();
          this.beacons.splice(i, 1); continue;
        }
        const pulse = 1 + Math.sin(rec.t * 8) * 0.25;
        rec.sp.scale.setScalar(rec.base * pulse);
        rec.sp.material.opacity = 0.9 * (1 - rec.t / 6);
      }
    }
  }

  GAME.Specials = Specials;
})();
