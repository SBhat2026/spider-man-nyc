# Desktop upgrade development log

## Checkpoint 1 — 2026-09-26 — work in progress

Saved on the local `codex/desktop-immersion` branch. This is an implementation checkpoint, not a visual approval or release. The public GitHub Pages site has not been updated.

- Added desktop-only rendering, city detail, poster artwork, suit materials, authored combat poses, and street incident modules.
- Added strike combos, web restraint, dodge, timed parry, focus finishers, nine suit powers, and Miles camouflage.
- Added a reproducible character and combat lab at `tools/desktop-lab.html`.
- Passed 12 browser behavior checks: valid geometry/skin weights across all suits, contact timing, three-hit combo, successful and late parry, dodge cooldown, web restraint, finisher gating, every suit power/cooldown, camouflage depletion, walls, defeat/respawn.
- Visually inspected menu and street scenes; correcting over-dark glass and refining the character's anatomy. Current procedural body is provisional.
- Preserved the pre-existing local facade revision and cache version update separately before merging the desktop additions. `sledding.html` is unrelated and remains untracked.

### Pending work and approval

- Better character body, individual suit identities and full animation playtests.
- City composition, lighting, Times Square, original artwork approval.
- Combat feel and feature approval after interactive playtest.
- New music tracks and listening approval.
- Performance measurements, mobile regression checks, and final release review.

The user requested regular local commits, playtesting after every major update, and explicit approval of all visual features and major updates. Unapproved changes stay in this development branch.

## Checkpoint 2 — 2026-09-26 — work in progress

Continues on `codex/desktop-immersion`. Still not deployed; GitHub Pages is
unchanged and `main` is untouched.

- Character close-up playtest found three defects in the new mesh and fixed
  them: suit albedo speckle (a fabric weave wrongly stroked into the colour
  map, aliasing under mipmapping), a scale-like bump weave (hard 4px checker
  at 6x10, bumpScale .019), and an oversized egg head plus an open notch on
  top of each shoulder. Head and eyes now scale together about the neck pivot
  so the eyes stay registered.
- Facade rewrite kept from the earlier local pass: 8x8 bay grid at 1024,
  ORM (roughness/metalness) maps and MeshStandardMaterial so glass takes the
  reflection probe. Rebalanced twice after playtest — first pass was a
  black/cream checkerboard, second was monotone navy.
- Times Square had benches, bollards and four lights but no screens. Added 82
  tiered emissive boards (tall banners + wide screens) on facades that front
  the plaza spine, driven by rig.windowGlow so they blaze at dusk.

Measured after the additions, street level in Times Square: 499 draw calls,
2.5 M triangles. No console errors.

### Suit pass — contact-sheet review of all nine

Rendered all nine suits side by side, in isolation and again in-world.

- 2099's cloak was rendering hot magenta: cloak colour is applied with
  `Color.setHex`, which does NOT convert, while every suit material goes
  through `convertSRGBToLinear`. Fixed by converting the cloak to match.
- The four dark suits read as flat cutouts. Root cause found by inspection:
  torso/mask/sleeves do not use `primary.color` at all — `desktopSuitMaps`
  paints a canvas atlas from `def.torso.base` and forces the material colour
  to white, so lifting the limb colours changed nothing on the body. Lifted
  `torso.base` for black/miles/y2099/noir.
- 2099 and Miles read clearly after the `torso.base` fix.
- Symbiote and Noir RESOLVED in a follow-up. Symbiote's real problem was
  `torsoMetal` with metalness .3: a metal tints its specular by its own
  albedo, so a black metal reflects black and no envMapIntensity could
  rescue it. Dropped metalness to .04 so the low roughness carries a white
  gloss highlight over the dark base — it still reads black but now has
  form. Noir is matte by design and gets nothing from reflection, so it was
  lifted on albedo and its web lines lightened to describe the surface.
- Verified working: Iron Spider's waldo arms, Noir's fedora and cloak,
  Miles/Symbiote/2099 emblems, OG's heavier webbing.

### Combat — first interactive playtest

Driven through the real input path with the combat tick attached (note
`debug.step` is a reduced loop and does NOT tick combat; an early test that
skipped it made combat look inert when it was fine).

Target acquired at range, enemy closed 8.4 m to 1.8 m, strikes landed
75 -> 55 -> 25 hp with focus and combo building and the enemy stunning.
Over a longer brawl: two enemies downed, player damaged 100 -> 70 -> 34,
focus reached 72, finisher consumed it (72 -> 30) and downed a third.
Web / dodge / parry / suit power all executed without error.

### Shoulders

Rounded. The torso cap went .182 -> .094 in a single step, which read as a
bevel; CatmullRom needs intermediate samples to dome it. Added three sections
over the deltoid and rounded the arm cap to match.

### Still pending

- Street-level ground and road materials are still flat.
- Per-suit animation playtest (poses inspected statically only).
- New music tracks. NB: I can run audio but cannot hear it, so I can't judge
  whether a generated track matches the existing style — this needs either
  real audio files or explicit acceptance of unheard procedural music.
- Mobile regression, performance capture on the target M5, release review.

### Checkpoint 3 — animation weight and render cost (v145)

**Flip / trick animation.** The flip spin was a smoothstep, which reads as a
machine rotating at constant-ish speed. Replaced with anticipation → throw →
settle: a small counter-rotation for the first 12% of the move, then a
decelerating `1-(1-u)^2.4` through the remaining 88%. The trick poses were
static targets held for the whole rotation; they now ride a
`sin(pi*u)^0.7` compression envelope, so tuck actually tucks and releases and
the open pose spreads into the arc and recovers. Verified numerically (knee
0.19 → 2.02 → 1.33) and on an 8-frame filmstrip.

**Render cost.** Profiled first rather than guessed. On this machine the loop
is vsync-locked at 120 Hz: median frame 8.3 ms == 1000/120, with the GPU
submission only ~2.4 ms and every CPU update summing to ~0.28 ms. A hypothesis
that the crowd/traffic/pigeon instances were the cost was tested and killed —
hiding them changed the render from 2.415 to 2.405 ms. Two changes that do
hold up on slower hardware:

- *Probe skipping.* A reflection-probe face is a full scene submission, the
  single most expensive optional thing in the frame. Cadence slowed 4→12
  (metallic suits) and 20→40 (matte), and the probe now stops re-capturing
  entirely once a full cycle has been taken from a spot the camera has not
  left.
- *Adaptive resolution.* A 4-step pixel-ratio ladder driven by median frame
  time measured against the display's own inferred interval, with hysteresis
  and a cooldown so it cannot oscillate. Frames from a hidden/throttled tab or
  a one-off stall (>60 ms) are discarded rather than learned from — without
  that guard a backgrounded tab ratchets the resolution down and never
  recovers, which is exactly what it did in testing before the guard landed.

**spooder man, actually visible.** Two bugs found by finally getting a clean
look at him. His flat-colour parts were `MeshBasicMaterial` colours set
straight from hex — the renderer's sRGB output then gamma-encodes them, so the
head, arms and legs came out pastel pink and periwinkle while the
sRGB-tagged canvas torso stayed correctly saturated. Same class of bug as the
2099 cloak; fixed by converting the flat colours by hand. The head also now
wears the same paint-program mask texture, so the wobbly webbing carries up
from the torso.

His placement was worse. The old spiral only asked whether he was *inside*
a rooftop solid, which he never was — he was standing politely behind a stair
bulkhead, invisible from every direction a player arrives from. Placement now
scores the whole roof on distance to the clutter in `b.props`, keeps a 3.4 m
inset so the parapet cannot crop him at the waist, and turns him to face the
widest gap in the clutter ring so you meet his eyes on the way in.

**Landings.** Both the 3-point and the rolling recovery snapped to the full
pose on impact, held it perfectly still for 0.4s, then slid back to neutral on
a straight line — nearly half a second of statue followed by a drift. They now
run through a shared `_landK()` envelope: a short hold, a smoothstep release,
and a rebound term that carries the body slightly past neutral so he pushes
up OFF the deck instead of drifting off it. `_landPower` had been recorded by
`startLanding` and never read; it now scales the depth, but only downward —
the 3-point pose is FK-verified at exactly 1.0 and its `bodyY` of -0.5 is as
low as the hips go before the torso clips through the roof, so a light step
down barely folds and a full drop bottoms out at the authored pose. (Scaling
depth *above* 1.0 was tried first and put him through the deck.)
