// Comic sound-effect bubbles — GRAYSCALE noir lettering that pops at a world
// position, faces the camera, punches in and fades. Classic Spider-Man Noir
// comic-panel feel. Wired up for the Noir suit (see main.js).
//
// Every bubble is monochrome (bone/white/gray fills, heavy black ink) so it
// reads against the desaturated noir world, and the word is auto-fit to sit
// FULLY inside the bubble — never clipped by the burst edge.
(function () {

  const POOL = 12;

  // style = burst shape only; all colors are grayscale
  const STYLES = {
    thwip:  { fill: '#e6e6e6', spikes: 12, rot: -0.08 },
    whoosh: { fill: '#cfcfcf', spikes: 0,  rot: 0.05, streak: true },
    thwak:  { fill: '#b4b4b4', spikes: 14, rot: 0.10 },
    bamf:   { fill: '#d2d2d2', spikes: 16, rot: -0.12 },
    krak:   { fill: '#f2f2f2', spikes: 15, rot: 0.06 },
  };
  const INK = '#0d0d0d';

  // largest font (px) whose rendered word fits inside a box of maxW × maxH
  function fitFont(c, word, maxW, maxH) {
    let fs = maxH;
    c.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';
    const w = c.measureText(word).width;
    if (w > maxW) fs = Math.max(16, Math.floor(fs * (maxW / w)));
    return fs;
  }

  function makeBubble(word, style) {
    const st = STYLES[style] || STYLES.thwip;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    const cx = 128, cy = 128;

    // --- bubble shape ---
    if (st.streak) {
      c.fillStyle = st.fill;
      c.beginPath(); c.ellipse(cx, cy, 120, 58, 0, 0, 6.3); c.fill();
      c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(18, cy + i * 18); c.lineTo(238, cy + i * 18); c.stroke(); }
    } else {
      c.beginPath();
      for (let i = 0; i < st.spikes * 2; i++) {
        const r = i % 2 ? 74 : 120;
        const a = (i / (st.spikes * 2)) * Math.PI * 2;
        c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.86);
      }
      c.closePath();
      c.fillStyle = st.fill; c.fill();
      c.lineWidth = 8; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
    }

    // --- word, auto-fit to stay fully inside the bubble ---
    // safe box: streak bubbles are wide/short, bursts are near-circular
    const maxW = st.streak ? 196 : 116;
    const maxH = 62;
    const fs = fitFont(c, word, maxW, maxH);
    c.save(); c.translate(cx, cy); c.rotate(st.rot);
    c.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(6, fs * 0.16); c.lineJoin = 'round';
    c.strokeStyle = INK; c.strokeText(word, 0, 0);
    c.fillStyle = '#fff'; c.fillText(word, 0, 0);
    c.restore();

    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    return t;
  }

  class ComicFX {
    constructor(scene) {
      this.scene = scene;
      this.cache = {};
      this.sprites = [];
      this._gap = 0;               // min-gap timer between bubbles
      for (let i = 0; i < POOL; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
        sp.visible = false;
        sp.renderOrder = 999;
        scene.add(sp);
        this.sprites.push({ sp, t: 1, scale0: 1 });
      }
      this._i = 0;
    }

    tex(word, style) {
      const key = word + '|' + style;
      return this.cache[key] || (this.cache[key] = makeBubble(word, style));
    }

    // fire a burst at a world position (rate-limited; max 2 alive on screen)
    pop(word, worldPos, style, size) {
      if (this._gap > 0) return;
      let alive = 0;
      for (const s of this.sprites) if (s.sp.visible) alive++;
      if (alive >= 2) return;
      this._gap = 0.4;
      const slot = this.sprites[this._i = (this._i + 1) % POOL];
      slot.sp.material.map = this.tex(word, style || 'thwip');
      slot.sp.material.needsUpdate = true;
      slot.sp.position.copy(worldPos);
      slot.sp.visible = true;
      slot.t = 0; slot.scale0 = size || 5;
    }

    update(dt) {
      if (this._gap > 0) this._gap -= dt;
      for (const slot of this.sprites) {
        if (!slot.sp.visible) continue;
        slot.t += dt / 0.9;                       // 0.9 s life
        if (slot.t >= 1) { slot.sp.visible = false; continue; }
        const pop = slot.t < 0.18 ? slot.t / 0.18 : 1;
        const s = slot.scale0 * (0.6 + pop * 0.5);
        slot.sp.scale.set(s, s, 1);
        slot.sp.position.y += dt * 1.2;
        slot.sp.material.opacity = slot.t > 0.7 ? (1 - slot.t) / 0.3 : 1;
      }
    }
  }

  GAME.ComicFX = ComicFX;
})();
