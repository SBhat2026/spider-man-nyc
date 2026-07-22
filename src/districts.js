// District mastery + badge framework. The city is cut into the same A1–D4
// sector grid as tools/inspect.html; each district's checklist is built from
// the content that actually lives inside it (easter eggs + photo assignments).
// Completion shows on the fullscreen map; mastering a district fires the
// reward hook (suit variants to be wired in later). Badges are a declarative
// framework — GAME.BADGES entries with test() functions, persisted once earned.
(function () {
  const KEY = 'spidey.districts.v1';
  const COLS = 4, ROWS = 4;

  // ---- badge declarations: id, label, test() -> bool ----
  // (framework seeded with a starter set; more to be specified later)
  const eggsOf = (pred) => {
    if (!GAME.landmarks || !GAME.unlocks) return [0, 1];
    const all = GAME.landmarks.eggs.filter(pred);
    return [all.filter(e => GAME.unlocks.eggs.has(e.id)).length, all.length];
  };
  GAME.BADGES = [
    { id: 'first-egg', label: 'First Discovery',
      test: () => GAME.unlocks && GAME.unlocks.eggs.size >= 1 },
    { id: 'eagle-eye', label: 'Eagle Eye — every landmark found',
      test: () => { const [f, t] = eggsOf(e => !e.id.startsWith('graffiti')); return t > 0 && f === t; } },
    { id: 'tag-hunter', label: 'Tag Hunter — every mural found',
      test: () => { const [f, t] = eggsOf(e => e.id.startsWith('graffiti')); return t > 0 && f === t; } },
    { id: 'shutterbug', label: 'Shutterbug — first photo filed',
      test: () => GAME.photos && GAME.photos.done.size >= 1 },
    { id: 'front-page', label: 'Front Page Hero — every assignment filed',
      test: () => GAME.photos && GAME.photos.list.length > 0 &&
                  GAME.photos.done.size === GAME.photos.list.length },
    { id: 'all-suits', label: 'Full Wardrobe — every suit unlocked',
      test: () => GAME.unlocks && GAME.unlocks.suits.size >= 5 },
    { id: 'district-debut', label: 'District Debut — first district mastered',
      test: () => GAME.districts && GAME.districts.mastered.size >= 1 },
    { id: 'cartographer', label: 'Cartographer — every district mastered',
      test: () => {
        const d = GAME.districts;
        if (!d) return false;
        const full = d.summary().filter(c => c.total >= 2);
        return full.length > 0 && full.every(c => d.mastered.has(c.id));
      } },
    { id: 'sprinter', label: 'Skyline Sprinter — 45 m/s in flight',
      test: () => GAME.stats && GAME.stats.maxSpeed >= 45 },
    { id: 'high-flyer', label: 'High Flyer — 400 m over the street',
      test: () => GAME.stats && GAME.stats.maxAlt >= 400 },
    { id: 'marathon', label: 'Marathon Swinger — 10 km on webs',
      test: () => GAME.stats && GAME.stats.swingDist >= 10000 },
    { id: 'hang-time', label: 'Hang Time — 30 s without touching down',
      test: () => GAME.stats && GAME.stats.longAir >= 30 },
  ];

  class Districts {
    constructor(city) {
      this.city = city;
      const B = city.bounds;
      this.x0 = B.minX; this.z0 = B.minZ;
      this.dw = (B.maxX - B.minX) / COLS; this.dh = (B.maxZ - B.minZ) / ROWS;
      this.dirty = true;
      this._t = 0;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
      this.mastered = new Set((saved && saved.mastered) || []);
      this.badges = new Set((saved && saved.badges) || []);
      this.onMastered = null;      // hook: (districtId) => {} — suit rewards later
      this._summary = [];
    }

    _save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          mastered: [...this.mastered], badges: [...this.badges] }));
      } catch (e) {}
    }

    idAt(x, z) {
      const i = Math.max(0, Math.min(COLS - 1, ((x - this.x0) / this.dw) | 0));
      const j = Math.max(0, Math.min(ROWS - 1, ((z - this.z0) / this.dh) | 0));
      return 'ABCD'[i] + (j + 1);
    }

    // rebuild the per-district checklist from live content
    _recount() {
      const cells = new Map();
      const add = (x, z, done) => {
        const id = this.idAt(x, z);
        let c = cells.get(id);
        if (!c) cells.set(id, c = { id, total: 0, found: 0 });
        c.total++;
        if (done) c.found++;
      };
      const lm = GAME.landmarks;
      if (lm) for (const e of lm.eggs || [])
        add(e.x, e.z, GAME.unlocks && GAME.unlocks.eggs.has(e.id));
      if (GAME.photos) for (const c of GAME.photos.list)
        add(c.x, c.z, GAME.photos.done.has(c.id));
      this._summary = [...cells.values()].sort((a, b) => a.id < b.id ? -1 : 1);

      // mastery: every item found in a district with meaningful content
      for (const c of this._summary) {
        if (c.total >= 2 && c.found === c.total && !this.mastered.has(c.id)) {
          this.mastered.add(c.id);
          this._save();
          if (GAME.notify) GAME.notify('DISTRICT MASTERED — ' + c.id, 6000);
          if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.9);
          if (this.onMastered) this.onMastered(c.id);
          else if (GAME.unlocks) GAME.unlocks.awardRewardSuit();
        }
      }
      // badges
      for (const b of GAME.BADGES) {
        if (this.badges.has(b.id)) continue;
        let ok = false;
        try { ok = !!b.test(); } catch (e) {}
        if (ok) {
          this.badges.add(b.id);
          this._save();
          if (GAME.notify) GAME.notify('BADGE EARNED — ' + b.label, 6000);
        }
      }
    }

    summary() { return this._summary; }

    update(dt) {
      this._t -= dt;
      if (this.dirty || this._t <= 0) {
        this.dirty = false;
        this._t = 2.5;
        this._recount();
      }
    }
  }

  GAME.Districts = Districts;
})();
