// Suit unlocks: every suit except the Stark default is earned by finding the
// easter egg from ITS universe. Progress persists in localStorage.
//
//   Stark (classic)  — default. Delmar's Deli is its home-turf egg (flavor only).
//   Symbiote         — Raimi-verse: find the DAILY BUGLE rooftop sign.
//   Iron Spider      — MCU: find the SANCTUM SANCTORUM.
//   Miles Morales    — Spider-Verse: find 5 pieces of street GRAFFITI.
//   2099             — Nueva York: stand in TIMES SQUARE's neon.
(function () {
  const KEY = 'spidey.unlocks.v1';
  const GRAFFITI_NEED = 5;

  const CLUES = {
    black: 'Raimi-verse · find the Daily Bugle rooftop sign',
    iron: 'MCU · find the Sanctum Sanctorum',
    miles: 'Spider-Verse · tag-hunt 5 street graffiti (' + 0 + '/' + GRAFFITI_NEED + ')',
    y2099: "Nueva York · stand in Times Square's neon",
    tasm: 'Reward · master a district',
    upgraded: 'Reward · master a district',
    noir: 'Reward · master a district',
  };
  const REWARD_SUITS = ['tasm', 'upgraded', 'noir'];

  class Unlocks {
    constructor() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
      this.suits = new Set((d && d.suits) || ['classic']);
      this.eggs = new Set((d && d.eggs) || []);
      this.suits.add('classic');
      // never boot into a suit you haven't earned
      if (!this.suits.has(GAME.settings.skin)) GAME.settings.skin = 'classic';
    }

    _save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          suits: [...this.suits], eggs: [...this.eggs] }));
      } catch (e) {}
    }

    has(skin) { return this.suits.has(skin); }

    // called when a district is mastered — grants the next locked reward suit
    awardRewardSuit() {
      for (const k of REWARD_SUITS) {
        if (!this.suits.has(k)) {
          this.suits.add(k); this._save();
          const label = (GAME.SKINS[k] || {}).label || k;
          if (GAME.notify) GAME.notify('DISTRICT REWARD — ' + label + ' suit unlocked!', 7000);
          if (GAME.refreshSuitLocks) GAME.refreshSuitLocks();
          return k;
        }
      }
      return null;
    }

    graffitiCount() {
      let n = 0;
      for (const id of this.eggs) if (id.startsWith('graffiti')) n++;
      return n;
    }

    clue(skin) {
      if (skin === 'miles')
        return 'Spider-Verse · tag-hunt 5 street graffiti (' +
               Math.min(GRAFFITI_NEED, this.graffitiCount()) + '/' + GRAFFITI_NEED + ')';
      return CLUES[skin] || '';
    }

    _unlock(skin, msg) {
      if (this.suits.has(skin)) return;
      this.suits.add(skin);
      this._save();
      if (GAME.notify) GAME.notify('SUIT UNLOCKED — ' + msg, 6000);
      if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.8);
      if (GAME.refreshSuitLocks) GAME.refreshSuitLocks();
    }

    // playtest master key — the map-reveal code also opens the wardrobe
    unlockAll() {
      let fresh = false;
      for (const k of Object.keys(GAME.SKINS || {}))
        if (!this.suits.has(k)) { this.suits.add(k); fresh = true; }
      if (fresh) {
        this._save();
        if (GAME.notify) GAME.notify('ALL SUITS UNLOCKED — playtest mode', 5000);
        if (GAME.refreshSuitLocks) GAME.refreshSuitLocks();
      }
      return fresh;
    }

    // called by landmarks when the player reaches an egg
    foundEgg(id) {
      if (this.eggs.has(id)) return;
      this.eggs.add(id);
      this._save();
      if (id === 'bugle') {
        if (GAME.notify && this.suits.has('black')) GAME.notify('The Daily Bugle');
        this._unlock('black', 'Symbiote (Raimi-verse)');
      } else if (id === 'sanctum') {
        if (GAME.notify && this.suits.has('iron')) GAME.notify('Sanctum Sanctorum');
        this._unlock('iron', 'Iron Spider (MCU)');
      } else if (id === 'timessq') {
        if (GAME.notify && this.suits.has('y2099')) GAME.notify('Times Square');
        this._unlock('y2099', 'Spider-Man 2099 (Nueva York)');
      } else if (id === 'delmar') {
        if (GAME.notify) GAME.notify("Delmar's Deli — number 5, extra pickles");
      } else if (id === 'stanlee') {
        if (GAME.notify) GAME.notify("'Excelsior!' — a familiar face waves back", 6000);
      } else if (id === 'midtownhigh') {
        if (GAME.notify) GAME.notify('Midtown School of Science & Technology — go, class of 2024', 6000);
      } else if (id === 'fisk') {
        if (GAME.notify) GAME.notify('Fisk Tower — the penthouse light is always on', 6000);
      } else if (id === 'blot') {
        if (GAME.notify) GAME.notify('A hole in reality — the Spot has been here', 6000);
      } else if (id === 'sandsite') {
        if (GAME.notify) GAME.notify('The dig site — the sand still shifts when you look away', 6000);
      } else if (id.startsWith('graffiti')) {
        const n = this.graffitiCount();
        if (n >= GRAFFITI_NEED) {
          this._unlock('miles', 'Miles Morales (Spider-Verse)');
        } else if (GAME.notify && !this.suits.has('miles')) {
          GAME.notify('Graffiti found (' + n + '/' + GRAFFITI_NEED + ') — Spider-Verse energy rising');
        }
      }
    }
  }

  GAME.unlocks = new Unlocks();
})();
