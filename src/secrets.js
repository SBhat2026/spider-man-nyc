// CITY SECRETS — collectible data fragments pinned to real Manhattan landmarks
// at their true lat/lon. Swing through one and it tells you a single fact about
// the building; the ones that actually appear in Spider-Man films get a short
// film note instead. Cheap by design: a handful of billboard sprites, distance
// checks only against the few nearest, and everything persists in localStorage.
(function () {

  // lat/lon are the real coordinates — the game's ll() maps them into the world.
  // `film` entries are verified screen appearances, not fan speculation.
  const SECRETS = [
    { id: 'flatiron', lat: 40.7411, lon: -73.9897, name: 'Flatiron Building',
      fact: 'Built 1902 on a triangular block; at 22 storeys it was one of the tallest buildings in the city.',
      film: 'Sam Raimi filmed it as the Daily Bugle — the red sign down the facade was pure movie magic.' },
    { id: 'empirestate', lat: 40.7484, lon: -73.9857, name: 'Empire State Building',
      fact: 'Topped out in 1931 after just 410 days of construction, and held the world-tallest title for 40 years.' },
    { id: 'chrysler', lat: 40.7516, lon: -73.9755, name: 'Chrysler Building',
      fact: 'Its stainless-steel crown was assembled in secret inside the shaft, then raised to beat a rival tower.' },
    { id: 'grandcentral', lat: 40.7527, lon: -73.9772, name: 'Grand Central Terminal',
      fact: 'The ceiling’s zodiac is painted backwards — reportedly copied from a medieval manuscript’s "God’s-eye view".' },
    { id: 'nypl', lat: 40.7532, lon: -73.9822, name: 'New York Public Library',
      fact: 'The marble lions flanking the steps were nicknamed Patience and Fortitude during the Great Depression.' },
    { id: 'rockefeller', lat: 40.7587, lon: -73.9787, name: 'Rockefeller Center',
      fact: 'A 19-acre Art Deco complex begun in 1931; its skating rink was an afterthought to fill an unrentable plaza.' },
    { id: 'metlife', lat: 40.7543, lon: -73.9761, name: 'MetLife Building',
      fact: 'Opened in 1963 as the Pan Am Building, and once ran a rooftop helicopter service to the airport.',
      film: 'The MCU drops Avengers Tower onto this exact spot in the New York skyline.' },
    { id: 'radiocity', lat: 40.7600, lon: -73.9800, name: 'Radio City Music Hall',
      fact: 'The largest theatre in the world when it opened in 1932, with a stage built like an ocean liner’s deck.' },
    { id: 'bryant', lat: 40.7536, lon: -73.9832, name: 'Bryant Park',
      fact: 'It sits on top of the library’s stacks — millions of books are shelved directly beneath the lawn.' },
    { id: 'columbuscircle', lat: 40.7681, lon: -73.9819, name: 'Columbus Circle',
      fact: 'Every road distance measured "from New York City" is measured from this exact circle.' },
    { id: 'carnegie', lat: 40.7651, lon: -73.9799, name: 'Carnegie Hall',
      fact: 'Opened in 1891 with Tchaikovsky conducting, and was nearly demolished for an office tower in 1960.' },
    { id: 'msg', lat: 40.7505, lon: -73.9934, name: 'Madison Square Garden',
      fact: 'The fourth building to carry the name — and the only major arena built on top of a working rail station.' },
    { id: 'timessq2', lat: 40.7580, lon: -73.9855, name: 'Times Square',
      fact: 'Named for the newspaper that moved here in 1904; the New Year’s ball first dropped that same decade.',
      film: 'Electro lights up this intersection in The Amazing Spider-Man 2.' },
    { id: 'centralpark', lat: 40.7712, lon: -73.9742, name: 'Central Park',
      fact: 'Entirely man-made — the "natural" landscape was engineered over swamp and rock from 1858.' },
    { id: 'bleecker', lat: 40.7294, lon: -74.0022, name: '177A Bleecker Street',
      fact: 'An ordinary Greenwich Village address that comics fans have treated as a landmark for decades.',
      film: 'The Sanctum Sanctorum — where Peter asks Strange to make everyone forget, in No Way Home.' },
    { id: 'queensboro', lat: 40.7570, lon: -73.9540, name: 'Queensboro Bridge',
      fact: 'A 1909 cantilever crossing to Queens, with the Roosevelt Island tramway running alongside it.',
      film: 'The Green Goblin’s impossible choice — the tram car and MJ — plays out on this bridge.' },
    // ---- Financial District ----
    { id: 'wtc', lat: 40.7127, lon: -74.0134, name: 'One World Trade Center',
      fact: 'Its height of 1,776 feet is a deliberate reference to the year of the Declaration of Independence.' },
    { id: 'brooklynbr', lat: 40.7061, lon: -73.9969, name: 'Brooklyn Bridge',
      fact: 'The first steel-wire suspension bridge; 21 elephants were marched across in 1884 to prove it safe.' },
    { id: 'charging', lat: 40.7056, lon: -74.0134, name: 'Charging Bull',
      fact: 'Installed illegally overnight in 1989 as guerrilla art, then kept after the public refused to let it go.' },
    { id: 'trinity', lat: 40.7081, lon: -74.0119, name: 'Trinity Church',
      fact: 'Its 281-foot spire was the tallest thing in New York for over forty years after 1846.' },
    { id: 'woolworth', lat: 40.7123, lon: -74.0083, name: 'Woolworth Building',
      fact: 'Nicknamed the "Cathedral of Commerce", and paid for in cash — about $13.5 million in 1913.' },
    { id: 'federalhall', lat: 40.7074, lon: -74.0102, name: 'Federal Hall',
      fact: 'George Washington was inaugurated on this site in 1789, when it served as the first U.S. Capitol.' },
    { id: 'liberty', lat: 40.6892, lon: -74.0445, name: 'Statue of Liberty',
      fact: 'Her copper skin is only about 2.4 mm thick — roughly two pennies pressed together.',
      film: 'The rooftop-and-scaffolding brawl of No Way Home happens all over her.' },
  ];

  const R = 20;             // metres you must pass within to collect

  class CitySecrets {
    constructor(landmarks, city, scene) {
      this.scene = scene;
      this.found = new Set();
      try {
        const raw = JSON.parse(localStorage.getItem('spidey.secrets.v1'));
        if (Array.isArray(raw)) this.found = new Set(raw);
      } catch (e) {}

      // place only the ones that land inside this zone's bounds
      this.items = [];
      const B = city.bounds;
      const tex = this._makeTex();
      for (const s of SECRETS) {
        const p = landmarks.ll(s.lat, s.lon);
        if (p.x < B.minX || p.x > B.maxX || p.z < B.minZ || p.z > B.maxZ) continue;
        // float it just above the local rooftops so it's a swing-by target
        let h = 0;
        if (city.buildingsNear) {
          for (const b of city.buildingsNear(p.x, p.z)) {
            if (p.x < b.bx0 - 30 || p.x > b.bx1 + 30) continue;
            if (p.z < b.bz0 - 30 || p.z > b.bz1 + 30) continue;
            if (b.h > h) h = b.h;
          }
        }
        const y = (h || 26) + 9;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, transparent: true, depthWrite: false, opacity: 0.92 }));
        sp.position.set(p.x, y, p.z);
        sp.scale.setScalar(7);
        const got = this.found.has(s.id);
        sp.visible = !got;
        scene.add(sp);
        this.items.push({ def: s, sp, x: p.x, y: y, z: p.z, got });
      }
      this._t = 0;
    }

    // a small glyph: a rotating diamond "data fragment"
    _makeTex() {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const c = cv.getContext('2d'); const m = 64;
      c.translate(m, m); c.rotate(Math.PI / 4);
      c.shadowColor = 'rgba(120,220,255,0.95)'; c.shadowBlur = 18;
      c.strokeStyle = 'rgba(150,230,255,0.95)'; c.lineWidth = 6;
      c.strokeRect(-30, -30, 60, 60);
      c.fillStyle = 'rgba(140,225,255,0.30)'; c.fillRect(-30, -30, 60, 60);
      c.rotate(-Math.PI / 4);
      c.fillStyle = '#eafaff'; c.font = '700 34px Arial, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('i', 0, 0);
      const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
    }

    count() { return [this.found.size, this.items.length]; }

    update(dt, ppos) {
      this._t += dt;
      for (const it of this.items) {
        if (it.got) continue;
        it.sp.position.y = it.y + Math.sin(this._t * 1.5 + it.x * 0.1) * 0.8;
        it.sp.material.rotation = this._t * 0.7;
        if (!ppos) continue;
        const dx = ppos.x - it.x, dy = ppos.y - it.sp.position.y, dz = ppos.z - it.z;
        if (dx * dx + dy * dy + dz * dz < R * R) this._collect(it);
      }
    }

    _collect(it) {
      it.got = true;
      it.sp.visible = false;
      this.found.add(it.def.id);
      try { localStorage.setItem('spidey.secrets.v1', JSON.stringify([...this.found])); } catch (e) {}
      const d = it.def;
      const body = d.film ? d.film : d.fact;
      if (GAME.notify) GAME.notify(d.name.toUpperCase() + ' — ' + body, 8000);
      if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.4);
      if (GAME.comicFX && GAME.settings.skin === 'noir')
        GAME.comicFX.pop('AHA!', it.sp.position, 'krak', 5);
      const [got, all] = this.count();
      if (got === all && all > 0) {
        setTimeout(() => {
          if (GAME.notify) GAME.notify('ALL CITY SECRETS FOUND — you know this town', 8000);
          if (GAME.unlocks && GAME.unlocks.awardOgSuit) GAME.unlocks.awardOgSuit();
        }, 1200);
      }
    }

    dispose() {
      for (const it of this.items) {
        this.scene.remove(it.sp);
        if (it.sp.material.map) it.sp.material.map.dispose();
        it.sp.material.dispose();
      }
      this.items.length = 0;
    }
  }

  GAME.CitySecrets = CitySecrets;
  GAME.SECRET_DEFS = SECRETS;
})();
