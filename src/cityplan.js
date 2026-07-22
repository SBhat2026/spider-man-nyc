// CityPlan — the single source of truth for 2D street-furniture placement.
// Both the game (city.js / landmarks.js) and the diagnostic inspector
// (tools/inspect.html) call these pure functions, so what the tool shows is
// exactly what the game builds. Everything here works in world XZ metres on
// the raw road polylines from the OSM pipeline.
(function () {
  window.GAME = window.GAME || {};

  function distToSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz || 1e-6;
    let t = ((px - ax) * dx + (pz - az) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t, cz = az + dz * t;
    const L = Math.sqrt(L2);
    return { d: Math.hypot(px - cx, pz - cz), cx, cz, t, nx: dz / L, nz: -dx / L };
  }

  // Is (x,z) inside the paved roadway of ANY road? `extra` widens the test.
  function inRoadway(x, z, roads, extra) {
    extra = extra || 0;
    for (const r of roads) {
      const hw = r.w / 2 + extra;
      const p = r.p;
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i];
        if (Math.min(a[0], b[0]) - hw > x || Math.max(a[0], b[0]) + hw < x ||
            Math.min(a[1], b[1]) - hw > z || Math.max(a[1], b[1]) + hw < z) continue;
        if (distToSeg(x, z, a[0], a[1], b[0], b[1]).d <= hw) return true;
      }
    }
    return false;
  }

  // The sidewalk spot nearest (x,z): just outside the closest road edge, on the
  // curb, and verified CLEAR of every other roadway. Returns {x,z,nx,nz} (the
  // outward normal points away from the road) or null if nowhere is clear.
  function sidewalkSpotNear(x, z, roads, want) {
    want = want == null ? 2.4 : want;
    let best = null, bestd = 1e9;
    for (const r of roads) {
      const hw = r.w / 2, p = r.p;
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i];
        if (Math.min(a[0], b[0]) - 45 > x || Math.max(a[0], b[0]) + 45 < x ||
            Math.min(a[1], b[1]) - 45 > z || Math.max(a[1], b[1]) + 45 < z) continue;
        const s = distToSeg(x, z, a[0], a[1], b[0], b[1]);
        if (s.d > hw + 16) continue;
        for (const side of [1, -1]) {
          const cx = s.cx + s.nx * side * (hw + want);
          const cz = s.cz + s.nz * side * (hw + want);
          if (inRoadway(cx, cz, roads, 0.5)) continue;   // never in a roadway
          const dd = (cx - x) * (cx - x) + (cz - z) * (cz - z);
          if (dd < bestd) { bestd = dd; best = { x: cx, z: cz, nx: s.nx * side, nz: s.nz * side }; }
        }
      }
    }
    return best;
  }

  // Real intersections = points where >=2 road ENDPOINTS coincide (grid-snapped).
  function intersections(roads) {
    const map = new Map();
    for (const r of roads) {
      for (const p of [r.p[0], r.p[r.p.length - 1]]) {
        const k = Math.round(p[0] / 4) + ',' + Math.round(p[1] / 4);
        let e = map.get(k);
        if (!e) map.set(k, e = { x: p[0], z: p[1], n: 0 });
        e.n++;
      }
    }
    return [...map.values()];
  }

  GAME.CityPlan = { distToSeg, inRoadway, sidewalkSpotNear, intersections };
})();
