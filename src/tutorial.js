// First-run interactive tutorial — teaches by doing. Each step shows one
// instruction and only advances once the player actually performs the action.
// Adapts its wording to touch vs. keyboard/mouse. Runs on both. Marks itself
// done in localStorage so it only appears the first time.
(function () {
  const STEPS = [
    { key: 'look',  touch: 'Drag your other thumb to look around',
                    desk: 'Move the mouse to look around' },
    { key: 'jump',  touch: 'Tap to jump',
                    desk: 'Tap SPACE to jump' },
    { key: 'swing', touch: 'Press &amp; HOLD the stick to shoot a web and swing — let go at the top of the arc',
                    desk: 'Hold SPACE in the air to swing — release at the top of the arc' },
    { key: 'trick', touch: 'Mid-air, FLICK your look thumb in any direction to flip',
                    desk: 'Press F + a direction (W/A/S/D) mid-air to flip' },
  ];

  class Tutorial {
    constructor() {
      this.el = document.getElementById('tutorial');
      this.txt = document.getElementById('tut-text');
      this.prog = document.getElementById('tut-prog');
      this.skip = document.getElementById('tut-skip');
      this.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      this.active = false; this.i = -1;
      this._dir0 = null; this._t0 = 0;
      if (this.skip) this.skip.addEventListener('click', () => this.finish());
    }

    done() { try { return localStorage.getItem('spidey.tutorial.v1') === '1'; } catch (e) { return false; } }

    start(force) {
      if (!this.el) return;
      if (this.done() && !force) return;
      this.active = true; this.i = -1;
      this.el.style.display = 'block';
      this._advance();
    }

    _advance() {
      this.i++;
      if (this.i >= STEPS.length) { this.finish(); return; }
      const s = STEPS[this.i];
      this.txt.innerHTML = this.touch ? s.touch : s.desk;
      this.prog.textContent = (this.i + 1) + ' / ' + STEPS.length;
      this._t0 = performance.now();
      const cam = GAME.debug && GAME.debug.camera;
      this._dir0 = cam ? cam.getWorldDirection(new THREE.Vector3()).clone() : null;
    }

    finish() {
      const wasActive = this.active;
      this.active = false;
      if (this.el) this.el.style.display = 'none';
      try { localStorage.setItem('spidey.tutorial.v1', '1'); } catch (e) {}
      // hand the top of the screen over to the suit intro, which held off
      // while the controls tutorial was running
      if (wasActive && GAME.suitHelp && GAME.isPlaying && GAME.isPlaying())
        setTimeout(() => GAME.suitHelp.onSuitEquipped(GAME.settings.skin), 600);
    }
    reset() { try { localStorage.removeItem('spidey.tutorial.v1'); } catch (e) {} }

    update() {
      if (!this.active) return;
      const p = GAME.player, cam = GAME.debug && GAME.debug.camera,
            hero = GAME.debug && GAME.debug.hero;
      if (!p) return;
      const s = STEPS[this.i]; let ok = false;
      if (s.key === 'look') {
        if (cam && this._dir0) {
          const d = cam.getWorldDirection(new THREE.Vector3());
          if (d.angleTo(this._dir0) > 0.35) ok = true;
        }
      } else if (s.key === 'jump') {
        if (p.mode === 'air' && p.vel.y > 1.2) ok = true;
      } else if (s.key === 'swing') {
        if (p.mode === 'swing') ok = true;
      } else if (s.key === 'trick') {
        if (hero && hero._flipT !== undefined && hero._flipT < 0.9) ok = true;
      }
      // a short read-time grace so steps don't blow past instantly
      if (ok && performance.now() - this._t0 > 500) {
        if (this.el) { this.el.classList.add('ok'); setTimeout(() => this.el && this.el.classList.remove('ok'), 350); }
        this._advance();
      }
    }
  }

  GAME.Tutorial = Tutorial;
})();
