// Rotating 3D suit model shown in the menu's suit card. Its own tiny WebGL
// context + scene holding a second Hero rig, so it never touches game state.
// Runs only while the menu is up (paused the moment you start swinging).
(function () {

  class SuitPreview {
    constructor(canvas) {
      this.cv = canvas;
      this.ok = false;
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: canvas, alpha: true, antialias: true });
      } catch (e) { return; }                    // no 2nd GL context → skip
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputEncoding = THREE.sRGBEncoding;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

      // three-point-ish lighting so metallics and matte suits both read
      this.scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x36252e, 1.05));
      const key = new THREE.DirectionalLight(0xfff0e2, 1.5);
      key.position.set(2.4, 3.4, 2.8); this.scene.add(key);
      const rim = new THREE.DirectionalLight(0xff8a5c, 1.15);
      rim.position.set(-2.6, 1.4, -2.2); this.scene.add(rim);
      const fill = new THREE.DirectionalLight(0x9fb4ff, 0.5);
      fill.position.set(-1.6, 0.6, 2.4); this.scene.add(fill);

      this.hero = new GAME.Hero();
      this.hero.addTo(this.scene);
      this.hero.root.position.set(0, 0, 0);

      this._t = 0;
      this._vel = new THREE.Vector3();
      this._pos = new THREE.Vector3();
      this.running = false;
      this.resize();
      this._loop = this._loop.bind(this);
    }

    resize() {
      if (!this.renderer) return;
      const r = this.cv.getBoundingClientRect();
      const w = Math.max(64, r.width || 132), h = Math.max(64, r.height || 168);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      // frame the whole body, slightly above centre so the head has headroom
      this.camera.position.set(0, 1.02, 4.05);
      this.camera.lookAt(0, 0.94, 0);
    }

    // swap the previewed suit WITHOUT disturbing the player's real selection
    setSkin(name) {
      if (!this.hero) return;
      const keep = GAME.settings.skin;
      try { this.hero.setSkin(name); } catch (e) {}
      GAME.settings.skin = keep;
    }

    start() {
      if (!this.renderer || this.running) return;
      this.running = true;
      this._last = performance.now();
      requestAnimationFrame(this._loop);
    }
    stop() { this.running = false; }

    _loop(now) {
      if (!this.running) return;
      requestAnimationFrame(this._loop);
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now; this._t += dt;
      // idle stance + a slow turntable spin
      this.hero.root.rotation.y += dt * 0.55;
      try {
        this.hero.update({
          mode: 'ground', pos: this._pos, vel: this._vel, speed: 0, vy: 0,
          anchor: null, dt: dt, yaw: 0, lookPitch: 0, lookYawRel: 0,
          hanging: false, diving: false, gliding: false });
      } catch (e) {}
      // gentle breathing bob so it doesn't read as a frozen statue
      this.hero.root.position.y = Math.sin(this._t * 1.6) * 0.012;
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this.stop();
      if (this.renderer) this.renderer.dispose();
    }
  }

  GAME.SuitPreview = SuitPreview;
})();
