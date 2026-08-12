// SPIDER-SENSE — the OG suit's signature. A ring of arrows around the crosshair
// pointing toward nearby threats, tightening and pulsing faster as they close.
//
// "Threats" resolve in priority order so this is useful whether or not the
// combat branch is enabled:
//   1. live enemies      (GAME.enemies — combat branch)
//   2. street events      (GAME.events — rooftop fires, on main)
// Rendered on a 2D canvas overlay: no extra draw calls in the 3D scene.
(function () {

  const RANGE = 70;          // metres — beyond this a threat isn't sensed
  const MAX_ARROWS = 4;

  class SpideySense {
    constructor() {
      let cv = document.getElementById('spidersense');
      if (!cv) {
        cv = document.createElement('canvas');
        cv.id = 'spidersense';
        document.body.appendChild(cv);
      }
      cv.style.cssText =
        'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'width:280px;height:280px;z-index:29;pointer-events:none;display:none';
      cv.width = cv.height = 560;
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this._t = 0;
      this._tmp = new THREE.Vector3();
    }

    setActive(on) { this.cv.style.display = on ? 'block' : 'none'; }

    // gather threat world-positions from whatever systems are live
    _threats() {
      const out = [];
      const en = GAME.enemies;
      if (en && en.list) {
        for (const e of en.list) if (e.alive) out.push({ x: e.x, y: e.y + 1, z: e.z, hot: true });
      }
      // rooftop fire (main branch): {x, z, top} — `top` is the roof height
      const f = GAME.events && GAME.events.fire;
      if (f && typeof f.x === 'number')
        out.push({ x: f.x, y: f.top || 0, z: f.z, hot: false });
      return out;
    }

    update(dt, ppos, camYaw) {
      if (this.cv.style.display === 'none') return;
      this._t += dt;
      const c = this.ctx, S = this.cv.width, mid = S / 2;
      c.clearRect(0, 0, S, S);

      const threats = this._threats();
      if (!threats.length) return;

      // nearest-first, capped
      for (const t of threats) {
        const dx = t.x - ppos.x, dz = t.z - ppos.z;
        t._d = Math.hypot(dx, dz);
        t._a = Math.atan2(dx, dz);
      }
      threats.sort((a, b) => a._d - b._d);
      const shown = threats.filter(t => t._d < RANGE).slice(0, MAX_ARROWS);
      if (!shown.length) return;

      for (const t of shown) {
        // screen-relative bearing: 0 = straight ahead, clockwise positive
        let rel = t._a - camYaw;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        const close = 1 - Math.min(1, t._d / RANGE);      // 0 far → 1 on top of you
        // arrows sit closer to the crosshair and pulse harder as the threat nears
        const radius = 200 - close * 62;
        const pulse = 0.55 + 0.45 * Math.sin(this._t * (4 + close * 9));
        // keep a firm floor: a distant threat should still be clearly readable,
        // it just shouldn't shout as loudly as one on top of you
        const alpha = (0.46 + 0.50 * close) * (0.66 + 0.34 * pulse);
        const size = 24 + close * 22;

        c.save();
        c.translate(mid, mid);
        c.rotate(rel);                 // 0 rad = up = straight ahead
        c.translate(0, -radius);
        // chevron
        c.beginPath();
        c.moveTo(0, -size * 0.62);
        c.lineTo(size * 0.60, size * 0.42);
        c.lineTo(0, size * 0.14);
        c.lineTo(-size * 0.60, size * 0.42);
        c.closePath();
        c.fillStyle = t.hot
          ? 'rgba(255,64,58,' + alpha.toFixed(3) + ')'
          : 'rgba(255,186,64,' + alpha.toFixed(3) + ')';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.75).toFixed(3) + ')';
        c.stroke();
        c.restore();
      }
    }

    dispose() {
      if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    }
  }

  GAME.SpideySense = SpideySense;
})();
