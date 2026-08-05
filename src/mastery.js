// SUIT MASTERY — per-suit progression. Every suit tracks the distance you've
// swung while wearing it; crossing the threshold unlocks a cosmetic modifier
// for that suit. Costs one accumulate-and-compare per frame.
(function () {

  // one milestone per suit: distance in metres → the perk it grants
  const GOALS = {
    classic:  { m: 10000, id: 'classic-trail', label: 'Web Trail',
                blurb: 'A faint web-trail streams behind you.' },
    black:    { m: 10000, id: 'black-tendrils', label: 'Tendrils',
                blurb: 'The symbiote lashes out as you swing.' },
    iron:     { m: 10000, id: 'iron-gold', label: 'Gold Waldoes',
                blurb: 'The waldoes run full gold.' },
    miles:    { m: 10000, id: 'miles-charge', label: 'Charged',
                blurb: 'Venom arcs crackle on every landing.' },
    y2099:    { m: 10000, id: 'y2099-longslow', label: 'Deep Time',
                blurb: 'Apex slow-mo lasts noticeably longer.' },
    tasm:     { m: 10000, id: 'tasm-doubleline', label: 'Twin Lines',
                blurb: 'Zip-lines string in pairs.' },
    upgraded: { m: 10000, id: 'upgraded-wide', label: 'Wide Sense',
                blurb: 'Spider-Sense reaches much further.' },
    noir:     { m: 10000, id: 'noir-classic', label: 'Classic Noir',
                blurb: 'Heavier grain and deeper contrast — full 1930s print.' },
  };

  class Mastery {
    constructor() {
      this.dist = {};        // skin → metres swung
      this.perks = new Set();
      try {
        const s = JSON.parse(localStorage.getItem('spidey.mastery.v1'));
        if (s) {
          this.dist = s.dist || {};
          this.perks = new Set(s.perks || []);
        }
      } catch (e) {}
      this._save = this._save.bind(this);
      this._acc = 0;
    }

    _persist() {
      try {
        localStorage.setItem('spidey.mastery.v1',
          JSON.stringify({ dist: this.dist, perks: [...this.perks] }));
      } catch (e) {}
    }
    _save() { this._persist(); }

    has(perkId) { return this.perks.has(perkId); }
    goalFor(skin) { return GOALS[skin] || null; }

    // 0..1 progress toward the current suit's milestone
    progress(skin) {
      const g = GOALS[skin];
      if (!g) return 0;
      return Math.min(1, (this.dist[skin] || 0) / g.m);
    }
    summary(skin) {
      const g = GOALS[skin];
      if (!g) return '';
      const d = this.dist[skin] || 0;
      if (this.perks.has(g.id)) return g.label + ' unlocked — ' + g.blurb;
      return (d / 1000).toFixed(1) + ' / ' + (g.m / 1000).toFixed(0) +
             ' km toward ' + g.label;
    }

    // called each frame with the distance travelled while actually traversing
    add(skin, metres) {
      if (!skin || !(metres > 0)) return;
      const g = GOALS[skin];
      if (!g) return;
      const before = this.dist[skin] || 0;
      const after = before + metres;
      this.dist[skin] = after;
      if (before < g.m && after >= g.m && !this.perks.has(g.id)) {
        this.perks.add(g.id);
        this._persist();
        if (GAME.notify)
          GAME.notify('SUIT MASTERY — ' + g.label + ': ' + g.blurb, 8000);
        if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.7);
        return;
      }
      // throttle writes: persist about every 250 m rather than every frame
      this._acc += metres;
      if (this._acc > 250) { this._acc = 0; this._persist(); }
    }
  }

  GAME.Mastery = Mastery;
  GAME.MASTERY_GOALS = GOALS;
})();
