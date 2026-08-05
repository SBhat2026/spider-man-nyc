// Mobile touch controls: one movement joystick (side configurable) + the other
// thumb to look. Tap = jump, press-and-hold = swing (release lets go), a fast
// flick of the stick mid-air = trick. Everything routes into the same `keys`
// object and camera the keyboard/mouse use, so gameplay code is unchanged.
(function () {
  const HOLD_MS = 150;        // press longer than this → swing-hold, not a tap
  const MOVE_DEAD = 14;       // px of stick travel before it counts as a drag
  const MAX_R = 52;           // knob travel radius
  const FLICK_V = 2.6;        // px/ms knob speed that fires a trick
  const LOOK_SENS = 0.0052;

  class Touch {
    constructor() {
      this.enabled = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      this.side = (GAME.settings && GAME.settings.joystickSide) || 'left';
      this.active = false;
      this.stickId = null; this.lookId = null; this.pinchId = null;
      this._pinchD = 0;
      this.base = document.getElementById('tj-base');
      this.knob = document.getElementById('tj-knob');
      this._holdTimer = 0; this._held = false; this._moved = false;
      this._last = { x: 0, y: 0, t: 0 };
      this._flickCd = 0;
      this._applySide();
      this._bind();
    }

    _applySide() { if (this.base) this.base.classList.toggle('right', this.side === 'right'); }
    setSide(s) {
      this.side = s;
      if (GAME.settings) GAME.settings.joystickSide = s;
      try { localStorage.setItem('spidey.joystick.v1', s); } catch (e) {}
      this._applySide();
    }

    setPlaying(on) {
      this.active = on && this.enabled;
      if (this.base) this.base.style.display = this.active ? 'block' : 'none';
      if (!on) this._reset();
    }

    _reset() {
      const k = GAME.keys; if (k) { k.w = k.a = k.s = k.d = k.space = 0; }
      this.stickId = this.lookId = this.pinchId = null;
      this._held = false; this._moved = false;
      clearTimeout(this._holdTimer);
      if (this.knob) { this.knob.style.transform = ''; }
      if (this.base) this.base.classList.remove('hot');
    }

    _stickSide(x) {
      const half = window.innerWidth / 2;
      return this.side === 'left' ? x < half : x >= half;
    }
    _onUI(t) {
      return t.target && t.target.closest &&
        t.target.closest('button, #menu, #tutorial .card, a');
    }

    _bind() {
      const o = { passive: false };
      window.addEventListener('touchstart', (e) => this._start(e), o);
      window.addEventListener('touchmove', (e) => this._move(e), o);
      window.addEventListener('touchend', (e) => this._end(e), o);
      window.addEventListener('touchcancel', (e) => this._end(e), o);
    }

    _start(e) {
      if (!this.active) return;
      for (const t of e.changedTouches) {
        if (this._onUI(t)) continue;
        if (this.stickId === null && this._stickSide(t.clientX)) {
          this.stickId = t.identifier;
          this._sx = t.clientX; this._sy = t.clientY;
          this._held = false; this._moved = false;
          this._last = { x: t.clientX, y: t.clientY, t: performance.now() };
          if (this.base) {
            this.base.style.left = this.side === 'right' ? '' : (t.clientX - 66) + 'px';
            this.base.style.right = this.side === 'right' ? (window.innerWidth - t.clientX - 66) + 'px' : '';
            this.base.style.bottom = (window.innerHeight - t.clientY - 66) + 'px';
          }
          if (this.base) this.base.classList.add('hot');
          // arm the swing-hold: if the finger stays down, start swinging
          clearTimeout(this._holdTimer);
          this._holdTimer = setTimeout(() => {
            this._held = true; if (GAME.keys) GAME.keys.space = 1;
          }, HOLD_MS);
          e.preventDefault();
        } else if (this.lookId === null) {
          this.lookId = t.identifier;
          this._lx = t.clientX; this._ly = t.clientY; this._lookMoved = false;
          e.preventDefault();
        } else if (this.pinchId === null) {
          // second look-side finger → PINCH: spreads/squeezes the FOV for a
          // speed-stretch effect without needing a slider
          this.pinchId = t.identifier;
          this._px = t.clientX; this._py = t.clientY;
          this._pinchD = Math.hypot(t.clientX - this._lx, t.clientY - this._ly);
          e.preventDefault();
        }
      }
    }

    _move(e) {
      if (!this.active) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          let dx = t.clientX - this._sx, dy = t.clientY - this._sy;
          const d = Math.hypot(dx, dy);
          if (d > MOVE_DEAD) this._moved = true;
          // flick detection (knob speed)
          const now = performance.now(), ddt = Math.max(1, now - this._last.t);
          const vx = (t.clientX - this._last.x) / ddt, vy = (t.clientY - this._last.y) / ddt;
          this._last = { x: t.clientX, y: t.clientY, t: now };
          const clamped = Math.min(MAX_R, d) / (d || 1);
          const nx = dx * clamped / MAX_R, ny = dy * clamped / MAX_R;   // -1..1
          if (this.knob) this.knob.style.transform = 'translate(' + (dx * clamped) + 'px,' + (dy * clamped) + 'px)';
          // movement keys from the stick vector (screen y-down → forward is -y)
          const k = GAME.keys;
          if (k) {
            k.w = ny < -0.4 ? 1 : 0; k.s = ny > 0.4 ? 1 : 0;
            k.a = nx < -0.4 ? 1 : 0; k.d = nx > 0.4 ? 1 : 0;
          }
          const p = GAME.player;
          if (this._flickCd <= 0 && Math.hypot(vx, vy) > FLICK_V && p && p.mode === 'air') {
            const trick = Math.abs(ny) > Math.abs(nx)
              ? (ny < 0 ? 3 : 6)          // flick up = swan, down = double
              : (nx < 0 ? 4 : 5);         // flick left/right = corkscrew
            if (p.doTrick) p.doTrick(trick);
            this._flickCd = 0.6;
          }
          e.preventDefault();
        } else if (t.identifier === this.lookId) {
          const dx = t.clientX - this._lx, dy = t.clientY - this._ly;
          if (Math.hypot(dx, dy) > 3) this._lookMoved = true;
          this._lx = t.clientX; this._ly = t.clientY;
          // while pinching, both fingers drive zoom — don't also swing the view
          if (this.pinchId === null && GAME.lookDelta) GAME.lookDelta(dx * LOOK_SENS, dy * LOOK_SENS);
          else this._pinch();
          e.preventDefault();
        } else if (t.identifier === this.pinchId) {
          this._px = t.clientX; this._py = t.clientY;
          this._pinch();
          e.preventDefault();
        }
      }
    }

    // spread = zoom out (wider FOV, more speed-stretch), squeeze = zoom in
    _pinch() {
      if (this.pinchId === null) return;
      const d = Math.hypot(this._px - this._lx, this._py - this._ly);
      if (this._pinchD > 0 && GAME.zoomDelta) GAME.zoomDelta(d / this._pinchD);
      this._pinchD = d;
    }

    _end(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stickId) {
          clearTimeout(this._holdTimer);
          const k = GAME.keys;
          if (this._held) {
            if (k) k.space = 0;                 // release the swing
          } else if (k) {                        // quick tap → jump pulse
            k.space = 1; setTimeout(() => { if (GAME.keys) GAME.keys.space = 0; }, 70);
          }
          if (k) { k.w = k.a = k.s = k.d = 0; }
          this.stickId = null; this._held = false; this._moved = false;
          if (this.knob) this.knob.style.transform = '';
          if (this.base) this.base.classList.remove('hot');
        } else if (t.identifier === this.lookId) {
          // a tap only jumps if it wasn't part of a pinch
          if (!this._lookMoved && this.pinchId === null) {
            if (GAME.keys) { GAME.keys.space = 1; setTimeout(() => { if (GAME.keys) GAME.keys.space = 0; }, 70); }
          }
          this.lookId = null; this.pinchId = null;
        } else if (t.identifier === this.pinchId) {
          this.pinchId = null;
        }
      }
    }

    update(dt) { if (this._flickCd > 0) this._flickCd -= dt; }
  }

  GAME.Touch = Touch;
})();
