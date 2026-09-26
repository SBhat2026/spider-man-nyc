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

### Still pending

- Per-suit identity pass and full animation playtest (only Stark inspected).
- Combat feel: not yet interactively played, only the authored checks.
- Street-level ground/road materials are still flat.
- New music tracks.
- Mobile regression, performance capture on the target M5, release review.
