// Minimap: bottom-right local map — north-up, centered on the player, with
// a rotating arrow showing where you face (the arrow moves, not the map).
// Press . (period) for a fullscreen north-up city map.
// A translucent compass strip at the top of the screen ties view direction to
// the map. Typing 1s2i3d4d reveals every easter egg location.
(function () {

  const SIZE = 236;          // small-map on-screen px
  const VIEW = 520;          // metres across in follow mode

  class Minimap {
    constructor(city) {
      this.city = city;
      this.revealed = false;
      this.full = false;
      this._flash = 0;

      // ---- DOM: map canvas ----
      let cv = document.getElementById('minimap');
      if (!cv) {
        cv = document.createElement('canvas');
        cv.id = 'minimap';
        document.body.appendChild(cv);
      }
      cv.style.cssText =
        'position:fixed;right:14px;bottom:14px;width:' + SIZE + 'px;height:' + SIZE + 'px;' +
        'border-radius:50%;border:1px solid rgba(255,255,255,0.22);' +
        'background:rgba(10,12,18,0.55);z-index:30;pointer-events:none;' +
        'box-shadow:0 4px 18px rgba(0,0,0,0.45)';
      cv.width = cv.height = SIZE * 2;               // retina
      this.cv = cv;
      this.ctx = cv.getContext('2d');

      // ---- DOM: compass strip ----
      let cp = document.getElementById('compass');
      if (!cp) {
        cp = document.createElement('canvas');
        cp.id = 'compass';
        document.body.appendChild(cp);
      }
      cp.style.cssText =
        'position:fixed;top:12px;left:50%;transform:translateX(-50%);' +
        'width:400px;height:34px;border-radius:17px;' +
        'background:rgba(10,12,18,0.38);border:1px solid rgba(255,255,255,0.14);' +
        'z-index:30;pointer-events:none';
      cp.width = 800; cp.height = 68;
      this.cp = cp;
      this.cpx = cp.getContext('2d');

      const hidden = document.getElementById('menu') &&
        document.getElementById('menu').style.display !== 'none';
      cv.style.display = cp.style.display = hidden ? 'none' : 'block';

      // ---- pre-render the whole city once ----
      const B = city.bounds;
      const pad = 60;
      this.w0 = B.minX - pad; this.w1 = B.maxX + pad;
      this.h0 = B.minZ - pad; this.h1 = B.maxZ + pad;
      const wm = this.w1 - this.w0, hm = this.h1 - this.h0;
      const scale = 2048 / Math.max(wm, hm);
      this.mapW = Math.round(wm * scale); this.mapH = Math.round(hm * scale);
      this.scale = scale;
      const off = document.createElement('canvas');
      off.width = this.mapW; off.height = this.mapH;
      const c = off.getContext('2d');
      const X = (x) => (x - this.w0) * scale;        // world → map px
      const Y = (z) => (z - this.h0) * scale;        // z grows south → y down = north-up

      c.fillStyle = '#14161d'; c.fillRect(0, 0, this.mapW, this.mapH);
      // parks
      c.fillStyle = '#27431f';
      for (const pk of city.zone.parks || []) {
        c.beginPath();
        pk.p.forEach(([x, z], i) => i ? c.lineTo(X(x), Y(z)) : c.moveTo(X(x), Y(z)));
        c.closePath(); c.fill();
      }
      // Central Park lakes
      const park = (city.zone.parks || []).find(k => k.n === 'Central Park');
      if (park && GAME.PARK) {
        c.fillStyle = '#1e3d55';
        for (const L of GAME.PARK.lakes) {
          c.beginPath();
          for (let i = 0; i <= 24; i++) {
            const a = i / 24 * Math.PI * 2;
            const p = GAME.parkXZ(park.p, L.cx + Math.cos(a) * L.rx, L.cy + Math.sin(a) * L.ry);
            i ? c.lineTo(X(p.x), Y(p.z)) : c.moveTo(X(p.x), Y(p.z));
          }
          c.fill();
        }
      }
      // roads
      c.strokeStyle = '#3a3d47'; c.lineCap = 'round';
      for (const r of city.zone.roads) {
        c.lineWidth = Math.max(1, r.w * scale * 0.5);
        c.beginPath();
        r.p.forEach(([x, z], i) => i ? c.lineTo(X(x), Y(z)) : c.moveTo(X(x), Y(z)));
        c.stroke();
      }
      // buildings (footprint bboxes read fine at this scale)
      c.fillStyle = '#565b68';
      for (const b of city.buildings) {
        c.fillRect(X(b.bx0), Y(b.bz0),
                   Math.max(1, (b.bx1 - b.bx0) * scale), Math.max(1, (b.bz1 - b.bz0) * scale));
      }
      this.off = off;

      // ---- keys: secret code + fullscreen toggle ----
      this._buf = '';
      this._onKey = (e) => {
        if (e.key === '.') { this._setFull(!this.full); return; }
        if (e.key.length !== 1) return;
        this._buf = (this._buf + e.key.toLowerCase()).slice(-8);
        if (this._buf === '1s2i3d4d') {
          this.revealed = !this.revealed;
          this._flash = 2.6;
          this._buf = '';
          if (this.revealed && GAME.unlocks) GAME.unlocks.unlockAll();
        }
      };
      window.addEventListener('keydown', this._onKey);
    }

    _setFull(on) {
      this.full = on;
      const cv = this.cv;
      if (on) {
        const px = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9);
        cv.style.width = cv.style.height = px + 'px';
        cv.style.right = '50%'; cv.style.bottom = '50%';
        cv.style.transform = 'translate(50%, 50%)';
        cv.style.borderRadius = '18px';
        cv.style.background = 'rgba(8,10,15,0.92)';
        cv.width = cv.height = Math.min(1600, px * 2);
      } else {
        cv.style.width = cv.style.height = SIZE + 'px';
        cv.style.right = '14px'; cv.style.bottom = '14px';
        cv.style.transform = 'none';
        cv.style.borderRadius = '50%';
        cv.style.background = 'rgba(10,12,18,0.55)';
        cv.width = cv.height = SIZE * 2;
      }
    }

    update(dt, px, pz, heading) {
      this._flash = Math.max(0, this._flash - dt);
      this._drawCompass(heading);
      const c = this.ctx, S = this.cv.width;
      c.clearRect(0, 0, S, S);
      c.save();
      c.beginPath();
      if (this.full) {
        if (c.roundRect) c.roundRect(0, 0, S, S, 24); else c.rect(0, 0, S, S);
      } else c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = '#0c0e14'; c.fillRect(0, 0, S, S);

      const eggs = (GAME.landmarks && GAME.landmarks.eggs) || [];

      if (this.full) {
        // ---- fullscreen: whole city, north-up, marker crosses the map ----
        const k = S / Math.max(this.mapW, this.mapH);
        const ox = (S - this.mapW * k) / 2, oy = (S - this.mapH * k) / 2;
        c.drawImage(this.off, ox, oy, this.mapW * k, this.mapH * k);
        const toPx = (x, z) => [ox + (x - this.w0) * this.scale * k,
                                oy + (z - this.h0) * this.scale * k];
        if (this.revealed) {
          for (const e of eggs) {
            const [ex, ey] = toPx(e.x, e.z);
            const g = e.label.startsWith('Graffiti');
            c.beginPath(); c.arc(ex, ey, g ? 7 : 12, 0, Math.PI * 2);
            c.fillStyle = e.icon; c.fill();
            c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.stroke();
            if (!g) {
              c.fillStyle = 'rgba(255,255,255,0.92)';
              c.font = 'bold ' + (S * 0.017 | 0) + 'px system-ui';
              c.textAlign = 'left';
              c.fillText((e.found ? '✓ ' : '') + e.label, ex + 18, ey + 5);
            }
          }
        }
        // district mastery grid (A1–D4) with completion %
        if (GAME.districts) {
          const d = GAME.districts;
          c.strokeStyle = 'rgba(140,160,220,0.35)'; c.lineWidth = 2;
          c.font = 'bold ' + (S * 0.016 | 0) + 'px system-ui'; c.textAlign = 'left';
          const sum = new Map(d.summary().map(e => [e.id, e]));
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            const id = 'ABCD'[i] + (j + 1);
            const [gx0, gy0] = toPx(d.x0 + i * d.dw, d.z0 + j * d.dh);
            const [gx1, gy1] = toPx(d.x0 + (i + 1) * d.dw, d.z0 + (j + 1) * d.dh);
            c.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
            const e = sum.get(id);
            const done = d.mastered.has(id);
            c.fillStyle = done ? '#ffd94a' : 'rgba(200,210,235,0.8)';
            c.fillText(id + (e ? '  ' + ((e.found / e.total * 100) | 0) + '%' : ''),
                       gx0 + 8, gy0 + S * 0.022);
            if (done) c.fillText('★', gx1 - S * 0.03, gy0 + S * 0.022);
          }
        }
        const [ax, ay] = toPx(px, pz);
        this._arrow(c, ax, ay, Math.PI - heading, 1.7);
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.font = 'bold 34px system-ui'; c.textAlign = 'center';
        c.fillText('N', S - 40, 48);
      } else {
        // ---- follow: north-up, player centred; the ARROW rotates, not the
        // map — reads like a hand compass ----
        const zoom = S / (VIEW * this.scale);        // map px → screen px
        const pmx = (px - this.w0) * this.scale, pmy = (pz - this.h0) * this.scale;
        c.save();
        c.translate(S / 2, S / 2);
        c.scale(zoom, zoom);
        c.drawImage(this.off, -pmx, -pmy);
        c.restore();

        if (this.revealed) {
          // eggs as dots; off-view ones clamp to the rim as direction hints
          const R = S / 2 - 14;
          for (const e of eggs) {
            let sx = (e.x - px) * this.scale * zoom, sy = (e.z - pz) * this.scale * zoom;
            const d = Math.hypot(sx, sy);
            const g = e.label.startsWith('Graffiti');
            const out = d > R;
            if (out) { sx *= R / d; sy *= R / d; }
            c.beginPath();
            c.arc(S / 2 + sx, S / 2 + sy, out ? 5 : (g ? 5 : 8), 0, Math.PI * 2);
            c.fillStyle = e.icon;
            c.globalAlpha = out ? 0.75 : 1;
            c.fill(); c.globalAlpha = 1;
            c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.stroke();
          }
        }

        // player arrow rotates to show facing (map stays north-up)
        this._arrow(c, S / 2, S / 2, Math.PI - heading, 1);

        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.font = 'bold 24px system-ui'; c.textAlign = 'center';
        c.fillText('N', S / 2, 30);
      }

      if (this._flash > 0) {
        c.globalAlpha = Math.min(1, this._flash);
        c.fillStyle = '#ffd94a';
        c.font = 'bold ' + (this.full ? 40 : 24) + 'px system-ui';
        c.textAlign = 'center';
        c.fillText(this.revealed ? 'EGGS REVEALED' : 'EGGS HIDDEN', S / 2, S - (this.full ? 36 : 30));
        c.globalAlpha = 1;
      }
      c.restore();
    }

    _arrow(c, x, y, ang, s) {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.beginPath();
      c.moveTo(0, -13 * s); c.lineTo(8 * s, 9 * s);
      c.lineTo(0, 4 * s); c.lineTo(-8 * s, 9 * s);
      c.closePath();
      c.fillStyle = '#ff4a3c'; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.stroke();
      c.restore();
    }

    // sliding compass strip: bearing 0° = north; ticks slide as the camera pans
    _drawCompass(heading) {
      const c = this.cpx, W = this.cp.width, H = this.cp.height;
      c.clearRect(0, 0, W, H);
      const bearing = ((180 - heading * 180 / Math.PI) % 360 + 360) % 360;
      const ppd = W / 180;                            // ±90° visible
      const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
                      180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let a = -180; a < 540; a += 15) {
        let d = a - bearing;
        if (d < -180) d += 360; if (d > 180) d -= 360;
        if (Math.abs(d) > 92) continue;
        const x = W / 2 + d * ppd;
        const key = ((a % 360) + 360) % 360;
        const name = names[key];
        if (name) {
          c.fillStyle = key === 0 ? '#ff6a5a' : 'rgba(255,255,255,0.9)';
          c.font = 'bold ' + (key % 90 === 0 ? 26 : 20) + 'px system-ui';
          c.fillText(name, x, H * 0.42);
        } else {
          c.fillStyle = 'rgba(255,255,255,0.35)';
          c.fillRect(x - 1, H * 0.25, 2, H * 0.2);
        }
      }
      // centre caret = where you're facing
      c.fillStyle = '#ffd94a';
      c.beginPath();
      c.moveTo(W / 2, H - 8); c.lineTo(W / 2 - 7, H); c.lineTo(W / 2 + 7, H);
      c.closePath(); c.fill();
    }

    dispose() {
      window.removeEventListener('keydown', this._onKey);
      if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
      if (this.cp && this.cp.parentNode) this.cp.parentNode.removeChild(this.cp);
    }
  }

  GAME.Minimap = Minimap;
})();
