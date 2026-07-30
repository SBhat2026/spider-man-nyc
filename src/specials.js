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

    // --- Amazing: web-trampoline net placed below the player ---
    trampoline(pos) {
      const r = 5;
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20),
        new THREE.MeshBasicMaterial({ map: this._netTex, transparent: true,
          opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(pos.x, Math.max(0.3, pos.y - 3), pos.z);
      this.scene.add(m);
      this.nets.push({ mesh: m, pos: m.position.clone(), r, t: 0, cd: 0 });
      if (this.nets.length > 6) { const old = this.nets.shift(); this.scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose(); }
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
      for (const rec of this.beacons) this.scene.remove(rec.sp);
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
      // trampolines: bounce a falling player, then age out over 7 s
      for (let i = this.nets.length - 1; i >= 0; i--) {
        const net = this.nets[i]; net.t += dt; net.cd -= dt;
        net.mesh.material.opacity = 0.9 * Math.max(0, 1 - net.t / 7);
        if (net.t > 7) { this.scene.remove(net.mesh); net.mesh.geometry.dispose(); net.mesh.material.dispose(); this.nets.splice(i, 1); continue; }
        if (player && net.cd <= 0 && player.vel.y < 0) {
          const hd = Math.hypot(player.pos.x - net.pos.x, player.pos.z - net.pos.z);
          if (hd < net.r && Math.abs(player.pos.y - net.pos.y) < 1.6) {
            player.vel.y = Math.min(42, Math.abs(player.vel.y) * 0.85 + 13);
            if (player.mode === 'ground') { player.mode = 'air'; player._airTime = 0.05; }
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
        if (rec.t > 6) { this.scene.remove(rec.sp); this.beacons.splice(i, 1); continue; }
        const pulse = 1 + Math.sin(rec.t * 8) * 0.25;
        rec.sp.scale.setScalar(rec.base * pulse);
        rec.sp.material.opacity = 0.9 * (1 - rec.t / 6);
      }
    }
  }

  GAME.Specials = Specials;
})();
