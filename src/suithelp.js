// Per-suit ability documentation, in one place.
//
// Every suit's power used to be discoverable only by reading the menu card
// before you started (and the Iron Spider stance / Amazing charges weren't
// written down anywhere at all). This module is the single source of truth for
// "what does this suit do and which key does it", and it feeds three surfaces:
//
//   · a one-time popup the FIRST time you ever wear a given suit
//   · the ? tab on the right edge — hover it any time for the current suit
//   · the menu's suit description card (main.js reads SUIT_ABILITY from here)
//
// Suits with no key of their own say so explicitly, so a passive suit doesn't
// read as a broken one.
(function () {
  const SEEN_KEY = 'spidey.suitseen.v1';

  // keys: [key label, what it does]. Empty = the power is passive.
  const ABILITY = {
    classic: {
      tag: 'Tom Holland · MCU',
      power: '<b>Web-Wings</b> — the underarm membranes unfurl into a glide, ' +
             'flattening your fall and driving you along the camera line.',
      keys: [['hold K', 'spread the web-wings and glide (in the air)']],
      menu: '<b>Web-wings glide</b> — hold K (or hold, on mobile) to spread the underarm webbing and soar between towers.',
    },
    black: {
      tag: 'Tobey Maguire · Symbiote',
      power: '<b>Symbiote-amplified</b> — no button to press. The suit itself ' +
             'jumps higher, swings harder and steers sharper than any other.',
      keys: [],
      menu: '<b>Symbiote-amplified</b> — higher jumps, wilder swings, and sharper mid-air steering. Always on, no key.',
    },
    iron: {
      tag: 'Iron Spider · MCU',
      power: '<b>Four mechanical waldoes.</b> Fire them forward as a lunge, or ' +
             'ride them: in spider-stance they plant on the ground (or the ' +
             'facade you\'re crawling) and carry you at a walk no human legs manage.',
      keys: [['G', 'waldo dash — lunge forward and grip, cracking whatever you land on'],
             ['—', 'two dashes in the air; they reset when you touch down'],
             ['hold K', 'spider-stance — rise up and walk on the waldoes, ~45% faster']],
      menu: '<b>Waldo dash (G)</b> — four mechanical legs lunge you forward and crack the concrete. Two dashes per trip through the air. <b>Hold K</b> to rise into spider-stance and walk on them.',
    },
    miles: {
      tag: 'Miles Morales · Spider-Verse',
      power: '<b>Venom Blast</b> — no button. Land hard enough and the ' +
             'bio-electric charge detonates out of you in a shockwave.',
      keys: [],
      menu: '<b>Venom Blast</b> — a bio-electric shockwave detonates on every hard landing. Always on, no key.',
    },
    y2099: {
      tag: "Miguel O'Hara · 2099",
      power: '<b>Bullet-time</b> — no button. The world drops into slow motion ' +
             'by itself at the apex of every real jump or launch.',
      keys: [],
      menu: '<b>Bullet-time</b> — the world automatically slows at the apex of every jump. Always on, no key.',
    },
    tasm: {
      tag: 'Andrew Garfield · Amazing',
      power: '<b>Web architecture.</b> On a surface you string a walkable ' +
             'zip-line to the building ahead. In the air you sling a web ' +
             '<i>across the gap you\'re falling through</i> — it has to reach ' +
             'facades on both sides, and you only carry two.',
      keys: [['G', 'on a roof/wall: string a zip-line you can tightrope'],
             ['G', 'in the air: sling a net across the alley — 2 charges'],
             ['—', 'charges reload the moment you touch anything solid']],
      menu: '<b>Zip-lines & web-nets (G)</b> — string a walkable line between rooftops, or sling a net across the gap below you to bounce off. Two nets, reloaded on landing.',
    },
    upgraded: {
      tag: 'Tom Holland · Far From Home',
      power: '<b>Spider-Sense pulse</b> — a beat of slow motion that lights up ' +
             'every nearby easter egg straight through the buildings.',
      keys: [['G', 'focus pulse — slow-mo + reveal what\'s hidden nearby'],
             ['—', 'recharges over about two and a half seconds']],
      menu: '<b>Spider-Sense (G)</b> — a focus pulse: brief slow-mo that reveals nearby easter eggs through the walls.',
    },
    noir: {
      tag: 'Spider-Man Noir · Spider-Verse',
      power: '<b>Noir mode</b> — no button. The whole city drops to black and ' +
             'white with film grain, the coat catches the wind, and your moves ' +
             'punch out comic sound-effects.',
      keys: [],
      menu: '<b>Noir mode</b> — the city turns black-and-white with film grain, a wind-blown trench coat, and comic sound-effects. Always on, no key.',
    },
    og: {
      tag: 'Tobey Maguire · The Original',
      power: '<b>Spider-sense</b> — no button. Directional arrows ring the ' +
             'crosshair when something\'s coming, and the organic shooters give ' +
             'a touch more reach and a cleaner release.',
      keys: [],
      menu: '<b>The one that started it</b> — raised black webbing, silver lenses, and a live spider-sense ring. Swings with the organic-shooter feel: more reach, cleaner release. Always on, no key.',
    },
  };

  // shown under every suit's key list — the moves that never change
  const BASE = 'Always: <em>hold SPACE</em> swing · <em>SPACE</em> jump · ' +
               '<em>W/S</em> reel · <em>F</em>+dir tricks · <em>Q</em> roll · ' +
               '<em>E</em> spread · <em>N</em> next suit · <em>P</em> photo';

  function esc(s) { return String(s).replace(/</g, '&lt;'); }

  class SuitHelp {
    constructor() {
      this.tab = document.getElementById('helptab');
      this.card = document.getElementById('helpcard');
      this.tip = document.getElementById('suittip');
      this.seen = new Set();
      try {
        const raw = JSON.parse(localStorage.getItem(SEEN_KEY));
        if (Array.isArray(raw)) this.seen = new Set(raw);
      } catch (e) {}
      // touch has no hover, so the dot toggles on tap there
      if (this.tab) {
        this.tab.addEventListener('click', (e) => {
          e.preventDefault();
          this.tab.classList.toggle('open');
        });
      }
      this._tipTimer = null;
    }

    ability(skin) { return ABILITY[skin] || null; }
    menuBlurb(skin) { return (ABILITY[skin] || {}).menu || ''; }
    tagFor(skin) { return (ABILITY[skin] || {}).tag || ''; }

    setPlaying(on) {
      if (this.tab) this.tab.style.display = on ? 'block' : 'none';
      if (!on) {
        if (this.tab) this.tab.classList.remove('open');
        this._hideTip();
      }
    }

    // rebuild the ? card for whichever suit is on
    refresh() {
      if (!this.card) return;
      const skin = GAME.settings.skin;
      const a = ABILITY[skin];
      const label = (GAME.SKINS[skin] || {}).label || skin;
      if (!a) { this.card.innerHTML = '<h4>' + esc(label) + '</h4>'; return; }
      let rows = a.keys.map(([k, d]) =>
        '<div class="row"><span class="k">' + esc(k) + '</span>' +
        '<span class="d">' + esc(d) + '</span></div>').join('');
      if (!rows)
        rows = '<div class="row"><span class="k">—</span><span class="d">' +
               'This suit has no key of its own; its power is always on.</span></div>';
      this.card.innerHTML =
        '<h4>' + esc(label) + '</h4>' +
        '<div class="sub">' + esc(a.tag) + '</div>' +
        rows +
        '<div class="base">' + BASE + '</div>';
    }

    // first time this suit is ever worn: explain it, once
    onSuitEquipped(skin, force) {
      this.refresh();
      if (!this.tip || !ABILITY[skin]) return;
      if (this.seen.has(skin) && !force) return;
      this.seen.add(skin);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...this.seen])); } catch (e) {}
      const a = ABILITY[skin];
      const label = (GAME.SKINS[skin] || {}).label || skin;
      document.getElementById('suittip-name').textContent = label + ' — first time';
      document.getElementById('suittip-txt').innerHTML = a.power;
      document.getElementById('suittip-keys').innerHTML = a.keys.length
        ? a.keys.filter(k => k[0] !== '—')
            .map(k => '<em>' + esc(k[0]) + '</em>').join(' ') +
          '  ·  hover the <em>?</em> on the right any time'
        : 'No key needed  ·  hover the <em>?</em> on the right any time';
      this._showTip();
    }

    _showTip() {
      this.tip.classList.add('show');
      clearTimeout(this._tipTimer);
      this._tipTimer = setTimeout(() => this._hideTip(), 8000);
    }
    _hideTip() {
      if (this.tip) this.tip.classList.remove('show');
      clearTimeout(this._tipTimer);
    }

    // dev/test: forget which suits have been introduced
    reset() {
      this.seen.clear();
      try { localStorage.removeItem(SEEN_KEY); } catch (e) {}
    }
  }

  GAME.SUIT_ABILITY = ABILITY;
  GAME.SuitHelp = SuitHelp;
})();
