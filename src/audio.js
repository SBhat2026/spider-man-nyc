// Procedural audio — everything synthesized live in WebAudio, no files:
// a warm heroic pad on an original chord loop, wind that swells with speed,
// and thwip / impact one-shots. Original synthesis only.
(function () {
  class GameAudio {
    constructor() { this.ready = false; this.muted = false; }

    start() {
      if (this.ready) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();

      // master → soft limiter → out
      this.master = ctx.createGain(); this.master.gain.value = 0.0001;
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -12; lim.knee.value = 22; lim.ratio.value = 6;
      lim.attack.value = 0.004; lim.release.value = 0.25;
      this.master.connect(lim); lim.connect(ctx.destination);

      // simple algorithmic reverb (feedback delay + lowpass) for space
      const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.29;
      const fb = ctx.createGain(); fb.gain.value = 0.42;
      const rvLP = ctx.createBiquadFilter(); rvLP.type = 'lowpass'; rvLP.frequency.value = 2600;
      const rvIn = this.reverbIn = ctx.createGain();
      rvIn.connect(dl); dl.connect(rvLP); rvLP.connect(fb); fb.connect(dl);
      rvLP.connect(this.master);

      // background music — the user's own tracks, alternating, gentle volume
      // playlist from GAME.MUSIC: shuffle, no immediate repeats, and prefer
      // tracks whose mood matches the current time of day
      this._pickTrack = () => {
        const all = GAME.MUSIC && GAME.MUSIC.length
          ? GAME.MUSIC : [{ file: 'audio/track-strut.mp3', mood: 'any' }];
        const t = GAME.settings.time || 'sunset';
        let pool = all.filter(m =>
          m.file !== this._lastFile && (!m.mood || m.mood === 'any' || m.mood === t));
        if (!pool.length) pool = all.filter(m => m.file !== this._lastFile);
        if (!pool.length) pool = all;
        const pick = pool[(Math.random() * pool.length) | 0];
        this._lastFile = pick.file;
        return pick.file;
      };
      this.music = new Audio(this._pickTrack());
      this.music.volume = 0.0;
      this.music.addEventListener('ended', () => {
        this.music.src = this._pickTrack();
        this.music.play().catch(() => {});
      });
      this.music.play().catch(() => {});
      this._musicVol = 0.34;

      // wind: looping noise → bandpass, gain rises with speed
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      this.windBP = ctx.createBiquadFilter(); this.windBP.type = 'bandpass';
      this.windBP.frequency.value = 650; this.windBP.Q.value = 0.6;
      this.windG = ctx.createGain(); this.windG.gain.value = 0.0;
      noise.connect(this.windBP); this.windBP.connect(this.windG);
      this.windG.connect(this.master); noise.start();

      // sfx bus (a little reverb send)
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.5;
      this.sfxBus.connect(this.master); this.sfxBus.connect(rvIn);

      this.master.gain.setTargetAtTime(0.5, ctx.currentTime, 2.2);
      this.ready = true;
    }

    update(dt, speed) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const wantVol = this.muted ? 0 : this._musicVol;
      if (this.music && Math.abs(this.music.volume - wantVol) > 0.005)
        this.music.volume += (wantVol - this.music.volume) * Math.min(1, dt * 1.5);
      if (this.muted) return;
      const s = Math.min(1, speed / 42);
      this.windG.gain.setTargetAtTime(0.015 + 0.17 * s, t, 0.2);
      this.windBP.frequency.setTargetAtTime(500 + 950 * s, t, 0.3);
    }

    // A soft airy snap, not a beep: a short filtered-noise "tss" with only a
    // faint pitched body underneath. Deliberately understated.
    thwip() {
      if (!this.ready || this.muted) return;
      const ctx = this.ctx, t = ctx.currentTime;

      // noise burst — the actual "thwip"
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuf || (this.noiseBuf = (() => {
        const b = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return b;
      })());
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(3200, t);
      bp.frequency.exponentialRampToValueAtTime(1300, t + 0.06);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.linearRampToValueAtTime(0.035, t + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
      n.connect(bp); bp.connect(ng); ng.connect(this.sfxBus);
      n.start(t); n.stop(t + 0.09);

      // barely-there pitched body
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(720, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.06);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.07);
    }

    impact(strength) {
      if (!this.ready || this.muted) return;
      const ctx = this.ctx, t = ctx.currentTime, a = Math.min(1, strength || 0.5);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.28 * a + 0.08, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 0.32);
      const nb = ctx.createBuffer(1, (ctx.sampleRate * 0.2) | 0, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 2);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const ng = ctx.createGain(); ng.gain.value = 0.2 * a;
      ns.connect(lp); lp.connect(ng); ng.connect(this.sfxBus); ns.start(t);
    }

    setMuted(m) {
      this.muted = m;
      if (this.ready) this.master.gain.setTargetAtTime(m ? 0.0001 : 0.5, this.ctx.currentTime, 0.3);
      if (this.music && m) this.music.volume = 0;
    }
  }
  GAME.GameAudio = GameAudio;
})();
