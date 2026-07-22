# Spider-Man: NYC

A single-page, browser-based Spider-Man web-swinging game built on **real
Manhattan** OpenStreetMap data — 18,000+ real building footprints and the actual
street grid, from Central Park down through Midtown. Pure vanilla JavaScript +
Three.js, no build step, runs from a single `index.html`.

**▶ Play: https://sbhat2026.github.io/spider-man-nyc/**

## Highlights

- **Real NYC** — genuine OSM footprints, streets, sidewalks, and street-name
  blades derived from the Manhattan grid.
- **Earth-real swinging** — pendulum physics on an elastic web (gravity 9.81,
  quadratic air drag) with an iconic "swing where you look" assist.
- **Tricks** — `F` + direction for flips, corkscrews, swan-dive doubles;
  barrel rolls, spread eagle, superman; wall-runs and upside-down ledge hangs.
- **8 suits**, each from a different Spider-verse, with their own powers:
  Stark web-wings glide, Symbiote strength, Miles' Venom Blast, 2099 apex
  slow-mo, plus the **Amazing**, **Upgraded**, and **Noir** (grayscale world +
  flowing trench-coat) reward suits.
- **Traversal-first** — no combat. Photo challenges (Peter's day job),
  district mastery, badges, living sidewalk crowds, street events, day cycle,
  and a bunch of easter eggs to hunt down.

## Controls

- **Mouse / trackpad** — look; scroll to zoom
- **Hold SPACE** — web-swing (release at the top of the arc); **SPACE** — jump
- **W / S** — reel the rope in / out · **A D** — lean
- **F** (+ W/S/A/D) — flips & tricks · **Q** roll · **E** spread (**W+E** superman)
- Touch a wall to **crawl**; skim one at speed to **wall-run**; **C** near the
  top to hang upside-down
- **hold K** — Web-Wings glide (Stark suit)
- **T** time of day · **N** next suit · **P** photo mode (**ENTER** to snap) ·
  **.** big map · **M** mute · **R** respawn

## Tech

Vanilla JS + Three.js (UMD). City geometry is chunked and frustum-culled;
crowds, traffic, pigeons and street furniture are instanced; the whole thing
holds a steady frame with ~360 draw calls in Midtown. See `tools/inspect.html`
for the top-down data/placement inspector.

Building footprints & streets © OpenStreetMap contributors.
