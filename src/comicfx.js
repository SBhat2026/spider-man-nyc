// Comic sound-effect bubbles — DORMANT FRAMEWORK (not wired into the game yet).
// The idea: hand-drawn onomatopoeia bursts ("THWIP!", "WHOOSH", "THWAK") that
// pop at a world position, face the camera, punch in and fade — the classic
// Spider-Man Noir comic-panel feel. This file only DEFINES the system; nothing
// calls it until we settle the design (see the plan in the chat).
//
// To activate later (one line in the main loop): GAME.comicFX.update(dt, camera)
// and fire with GAME.comicFX.pop('THWIP!', worldVec3).
(function () {

  // pooled bursts so firing many costs nothing per-frame
  const POOL = 12;

  // each style: fill / outline / burst spikes, drawn on a transparent canvas
  const STYLES = {
    thwip:  { bg: '#ffd23f', ink: '#141414', spikes: 12, rot: -0.08 },
    whoosh: { bg: '#8fd0ff', ink: '#10203a', spikes: 0,  rot: 0.05, streak: true },
    thwak:  { bg: '#ff5a3c', ink: '#180a08', spikes: 14, rot: 0.1 },
    bamf:   { bg: '#c07be0', ink: '#1a0a24', spikes: 16, rot: -0.12 },
    krak:   { bg: '#f4f4f4', ink: '#101010', spikes: 15, rot: 0.06 },
  };

  function makeBubble(word, style) {
    const st = STYLES[style] || STYLES.thwip;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    const cx = 128, cy = 128;
    if (st.spikes) {
      c.beginPath();
      for (let i = 0; i < st.spikes * 2; i++) {
        const r = i % 2 ? 66 : 116;
        const a = (i / (st.spikes * 2)) * Math.PI * 2;
        c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.82);
      }
      c.closePath();
      c.fillStyle = st.bg; c.fill();
      c.lineWidth = 8; c.strokeStyle = st.ink; c.stroke();
    } else if (st.streak) {
      c.fillStyle = st.bg;
      c.beginPath(); c.ellipse(cx, cy, 118, 54, 0, 0, 6.3); c.fill();
      c.lineWidth = 7; c.strokeStyle = st.ink; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(20, cy + i * 16); c.lineTo(236, cy + i * 16); c.stroke(); }
    }
    c.save(); c.translate(cx, cy); c.rotate(st.rot);
    c.font = '900 ' + (word.length > 5 ? 58 : 78) + 'px "Comic Sans MS", Impact, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 12; c.lineJoin = 'round'; c.strokeStyle = st.ink; c.strokeText(word, 0, 0);
    c.fillStyle = '#fff'; c.fillText(word, 0, 0);
    c.restore();
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    return t;
  }

  class ComicFX {
    constructor(scene) {
      this.scene = scene;
      this.cache = {};                 // word|style → texture
      this.sprites = [];
      for (let i = 0; i < POOL; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          transparent: true, depthWrite: false, opacity: 0 }));
        sp.visible = false;
        scene.add(sp);
        this.sprites.push({ sp, t: 1, scale0: 1 });
      }
      this._i = 0;
    }

    tex(word, style) {
      const key = word + '|' + style;
      return this.cache[key] || (this.cache[key] = makeBubble(word, style));
    }

    // fire a burst at a world position
    pop(word, worldPos, style, size) {
      const slot = this.sprites[this._i = (this._i + 1) % POOL];
      slot.sp.material.map = this.tex(word, style || 'thwip');
      slot.sp.material.needsUpdate = true;
      slot.sp.position.copy(worldPos);
      slot.sp.visible = true;
      slot.t = 0; slot.scale0 = size || 4;
    }

    // call once per frame IF/when activated
    update(dt) {
      for (const slot of this.sprites) {
        if (!slot.sp.visible) continue;
        slot.t += dt / 0.9;                       // 0.9 s life
        if (slot.t >= 1) { slot.sp.visible = false; continue; }
        const pop = slot.t < 0.18 ? slot.t / 0.18 : 1;         // punch-in
        const s = slot.scale0 * (0.6 + pop * 0.5);
        slot.sp.scale.set(s, s, 1);
        slot.sp.position.y += dt * 1.2;                        // drift up
        slot.sp.material.opacity = slot.t > 0.7 ? (1 - slot.t) / 0.3 : 1;
      }
    }
  }

  GAME.ComicFX = ComicFX;
  // Intentionally NOT instantiated or called anywhere yet — dormant until the
  // design is settled (trigger events, which suits, volume of bubbles, etc.).
})();
