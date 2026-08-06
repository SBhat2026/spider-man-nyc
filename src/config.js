// Global namespace + tunables. Everything gameplay-feel lives here so future
// features (missions, more districts, sound) can hook in without touching systems.
window.GAME = {
  zones: { midtown: window.CITY_MIDTOWN, fidi: window.CITY_FIDI },

  settings: {           // set by menu
    zone: 'midtown',
    time: 'sunset',     // 'sunset' | 'day'
    skin: 'classic',
  },

  // ---- music playlist ----
  // Drop mp3s into audio/ and list them here — the game shuffles without
  // immediate repeats and prefers tracks whose mood matches the time of day.
  //   mood: 'any' | 'day' | 'sunset' | 'night'
  MUSIC: [
    { file: 'audio/track-strut.mp3', mood: 'any' },
    { file: 'audio/track-dunes.mp3', mood: 'any' },
    // e.g. { file: 'audio/lofi-miles.mp3',  mood: 'sunset' },
    //      { file: 'audio/synthwave-2099.mp3', mood: 'night' },
    //      { file: 'audio/bigband-swing.mp3',  mood: 'day' },
  ],

  GFX: {                // tuned for Apple Silicon (M-series) — desktop defaults
    shadowMap: 2048,    // 4096 PCFSoft re-rendered every frame was ~4x the cost
    shadowRadius: 2,    // for a difference invisible at this camera distance
    envMapSize: 128,
    envMapEvery: 4,     // frames between SINGLE cube-face updates (see main.js)
    envMapEveryMatte: 20, // slower probe cadence for non-metallic suits
    pixelRatio: 1.5,    // retina 2.0 + MSAA = 4x fragments; 1.5 is ~indistinguishable
    pigeonFlocks: 20,
    pigeonsPerFlock: 7,
    shadows: true,
    // Cap on building draw distance in metres. The effective distance is
    // min(this, fog.far * 0.95) so the cull edge always hides inside the fog
    // — the two can never drift apart and pop buildings out of clear air.
    cityDrawDist: 6000,
    cullEvery: 8,           // frames between distance-cull passes
    crowdMax: 160,
    trafficScale: 1,
    antialias: true,
  },

  // ---- Mobile / low-power profile -------------------------------------
  // A phone GPU is roughly an order of magnitude behind an M-series chip and
  // is fill-rate bound at high DPR. The wins, in order of impact: fewer
  // fragments (pixelRatio), no shadow pass, and drawing far fewer buildings.
  GFX_MOBILE: {
    shadowMap: 512,
    shadowRadius: 1,
    shadows: false,       // the shadow pass re-renders the city every frame
    envMapSize: 64,
    envMapEvery: 14,
    envMapEveryMatte: 40,
    pixelRatio: 1,        // 3x DPR on a modern phone = 9x the fragments
    pigeonFlocks: 6,
    pigeonsPerFlock: 5,
    // 1800 m keeps the skyline vista while cutting ~6x the triangles; the
    // cost curve past this is steep for very little visible gain.
    cityDrawDist: 1800,
    cullEvery: 6,
    crowdMax: 45,
    trafficScale: 0.35,
    antialias: false,
  },

  PHYS: {
    // Real pendulum physics: gravity does the work, the web is a stiff
    // slightly-elastic tether, and speed is limited by quadratic air drag
    // (real terminal velocity) instead of an artificial cap.
    gravity: 9.81,        // Earth-real — the pendulum is the physics
    termVel: 56,          // skydiver terminal velocity, sets drag coefficient
    maxSpeed: 70,         // safety clamp only, drag governs in practice
    airControl: 4.5,      // m/s^2 body-english while falling
    runSpeed: 9,
    runAccel: 40,
    jumpVel: 8.5,
    crawlSpeed: 4.4,      // m/s on walls
    sprintMult: 1.9,      // Shift while running or crawling
    wallJump: 6,          // push-off speed leaving a wall
    ropeSlack: 0.99,      // web attaches essentially taut
    ropeMin: 6,
    ropeSpring: 200,      // web elasticity (1/s^2) — stiff but not rigid
    ropeDamp: 14,         // radial damping when the web is stretched
    reelIn: 7,            // m/s rope shortening while holding W (real swing pumping)
    reelOut: 5,           // m/s rope lengthening while holding S
    steerAccel: 10,       // A/D lateral body-english during a swing
    swingAssist: 1.15,    // rad/s velocity re-aim toward camera (street-line swinging)
    releaseBoost: 1.02,   // tiny assist, momentum is otherwise conserved
    releaseUp: 1.2,
    autoRange: 95,
    autoMinUp: 6,
    playerRadius: 0.55,
    playerHeight: 1.8,
  },

  CAM: {
    dist: 6.8,
    distSpeedBoost: 3.4,  // camera pulls back at speed for wide cinematic framing
    height: 2.0,
    fov: 68,
    lag: 8,
    swingFovBoost: 13,
    rollMax: 0.14,        // rad of banking roll into turns
    pitchMin: -1.52,      // near straight down — for aerial dive shots
    pitchMax: 1.0,
  },

  TRAFFIC: {
    count: 620,           // cars per zone (scaled for the 4x5km map)
    cabRatio: 0.42,
    minSpeed: 7,
    maxSpeed: 13,
  },

  // ---- lighting presets; LightingRig lerps between them ----
  LIGHT: {
    sunset: {
      // hot, saturated golden-hour — the city bathes in orange/pink
      sunAzimuth: -112 * Math.PI / 180,   // west, slightly north — sun over the Hudson
      sunElevation: 11 * Math.PI / 180,
      sunColor: 0xff7326, sunIntensity: 2.6,
      hemiSky: 0xffa088, hemiGround: 0x54246a, hemiIntensity: 1.05,
      fogColor: 0xee855f, fogNear: 340, fogFar: 5200,
      // saturated spider-verse dusk: indigo/violet up high → hot red-orange horizon
      skyZenith: 0x4b2f9c, skyHorizon: 0xff5a28, skyHorizonLow: 0xffc255,
      windowGlow: 1.3,
      cloudColor: 0xff8a5a, cloudOpacity: 0.55,
      sunDisc: 0xffe4b0, sunGlow: 0xff5320,
      headlights: 1.0,
    },
    night: {
      sunAzimuth: 40 * Math.PI / 180,
      sunElevation: 46 * Math.PI / 180,          // the moon, high and cool
      sunColor: 0x8fa4cc, sunIntensity: 0.30,
      hemiSky: 0x1b2440, hemiGround: 0x0b0d12, hemiIntensity: 0.42,
      fogColor: 0x0a0d16, fogNear: 300, fogFar: 4600,
      skyZenith: 0x030510, skyHorizon: 0x0d1326, skyHorizonLow: 0x1d2542,
      windowGlow: 1.75,
      cloudColor: 0x0a0d18, cloudOpacity: 0.13,   // sprites overlap ~3-4 deep; more reads as a grey lid
      sunDisc: 0xe8eeff, sunGlow: 0x24304e,
      headlights: 1.0,
    },
    day: {
      sunAzimuth: -35 * Math.PI / 180,
      sunElevation: 58 * Math.PI / 180,
      sunColor: 0xfff2dd, sunIntensity: 1.85,
      hemiSky: 0xbfd9ff, hemiGround: 0x8a8578, hemiIntensity: 0.75,
      fogColor: 0xcfe2f2, fogNear: 600, fogFar: 6400,
      skyZenith: 0x2f6fd0, skyHorizon: 0xa8cdf0, skyHorizonLow: 0xdcecf8,
      windowGlow: 0.0,
      cloudColor: 0xffffff, cloudOpacity: 0.75,
      sunDisc: 0xffffff, sunGlow: 0xfff4d0,
      headlights: 0.0,
    },
  },
};

// ---- Central Park feature layout in park-local (u,v) space ----
// u: 0 at Central Park West → 1 at 5th Ave;  v: 0 at 59th St → 1 at 110th St.
// The park quad is near-parallelogram, so an affine map is exact enough.
// ---- Device profile ---------------------------------------------------
// Decide once, at boot, whether this is a phone-class device and fold the
// mobile overrides into GFX. Touch alone isn't enough (touchscreen laptops),
// so require a small screen OR a coarse pointer with few CPU cores.
GAME.detectMobile = function () {
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const small = Math.min(window.innerWidth, window.innerHeight) < 820;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const fewCores = (navigator.hardwareConcurrency || 8) <= 6;
  return (touch && small) || (coarse && (small || fewCores));
};
GAME.applyGfxProfile = function () {
  GAME.isMobile = GAME.detectMobile();
  if (GAME.isMobile) Object.assign(GAME.GFX, GAME.GFX_MOBILE);
  return GAME.isMobile;
};
// Fold the profile in HERE, at config load — later modules read GFX at parse
// time (crowd pool sizes, pigeon counts), so deciding this in main.js would be
// too late for them.
GAME.applyGfxProfile();

// ---- Aspect-adaptive field of view ------------------------------------
// three.js FOV is VERTICAL, so a tall phone in portrait (aspect ~0.46) turns a
// 68° vertical view into a ~35° horizontal one — tunnel vision. Widen the
// vertical FOV as the viewport narrows (a bounded "Hor+"), and on very wide
// screens narrow it back so ultrawide gains width instead of stretching.
GAME.REF_ASPECT = 16 / 9;
GAME.fovForAspect = function (baseVFov, aspect) {
  if (!(aspect > 0)) return baseVFov;
  const hHalf = Math.atan(Math.tan(baseVFov * Math.PI / 360) * GAME.REF_ASPECT);
  let v = 2 * Math.atan(Math.tan(hHalf) / aspect) * 180 / Math.PI;
  // clamp: below ~50 the world feels flat, above ~94 it fish-eyes
  return Math.max(50, Math.min(94, v));
};
// the camera's current base FOV for this viewport
GAME.baseFov = function () {
  return GAME.fovForAspect(GAME.CAM.fov,
    window.innerWidth / Math.max(1, window.innerHeight));
};

GAME.PARK = {
  lakes: [
    { cx: 0.50, cy: 0.63, rx: 0.30, ry: 0.095 },   // JKO Reservoir
    { cx: 0.38, cy: 0.28, rx: 0.17, ry: 0.050 },   // The Lake
    { cx: 0.72, cy: 0.16, rx: 0.10, ry: 0.030 },   // The Pond (SE corner)
  ],
  loop: { u0: 0.10, u1: 0.90, v0: 0.04, v1: 0.96 }, // park drive circuit
  crossV: [0.20, 0.45, 0.80],                       // transverse footpaths
};
// poly = [SW, SE, NE, NW] world corners
GAME.parkXZ = function (poly, u, v) {
  const [sw, se, , nw] = poly;
  return { x: sw[0] + u * (se[0] - sw[0]) + v * (nw[0] - sw[0]),
           z: sw[1] + u * (se[1] - sw[1]) + v * (nw[1] - sw[1]) };
};
GAME.parkUV = function (poly, x, z) {
  const [sw, se, , nw] = poly;
  const e1x = se[0]-sw[0], e1z = se[1]-sw[1], e2x = nw[0]-sw[0], e2z = nw[1]-sw[1];
  const det = e1x * e2z - e1z * e2x, dx = x - sw[0], dz = z - sw[1];
  return { u: (dx * e2z - dz * e2x) / det, v: (e1x * dz - e1z * dx) / det };
};
GAME.inParkLake = function (poly, x, z) {
  const { u, v } = GAME.parkUV(poly, x, z);
  for (const L of GAME.PARK.lakes) {
    // shorelines wobble up to +25% beyond the nominal ellipse — pad so no
    // tree stands in the water
    const du = (u - L.cx) / (L.rx * 1.28), dv = (v - L.cy) / (L.ry * 1.28);
    if (du * du + dv * dv < 1) return true;
  }
  return false;
};
