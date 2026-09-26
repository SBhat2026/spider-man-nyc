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
