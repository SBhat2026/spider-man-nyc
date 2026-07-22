// City: merged geometry from real OSM footprints — three facade families
// (brick / limestone / glass), cornice + parapet trim, street-level stone
// bands, NYC water towers & AC units. Also collision, web anchors, spawns.
(function () {
  const GRID = 48;

  // ============================ textures ============================
  const TexCache = {};
  function facadeTextures(kind) {
    if (TexCache[kind]) return TexCache[kind];
    const N = 512;
    const day = document.createElement('canvas'); day.width = day.height = N;
    const emi = document.createElement('canvas'); emi.width = emi.height = N;
    const d = day.getContext('2d'), e = emi.getContext('2d');
    let seed = kind === 'brick' ? 11 : kind === 'stone' ? 29 : kind === 'blank' ? 61 : 47;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    e.fillStyle = '#000'; e.fillRect(0, 0, N, N);

    // dense lit ratio — at sunset the whole city glows like the reference
    const litWindow = (x, y, w, h) => {
      const r = rnd();
      if (r < 0.40) e.fillStyle = '#f5ae5e';
      else if (r < 0.58) e.fillStyle = '#8a5730';
      else return;
      e.fillRect(x, y, w, h);
    };

    if (kind === 'brick') {
      // grayscale masonry (vertex tint supplies brick hue), 4x4 windows/tile
      d.fillStyle = '#d8d2c8'; d.fillRect(0, 0, N, N);
      d.strokeStyle = 'rgba(120,110,100,0.35)'; d.lineWidth = 1;
      for (let y = 0; y < N; y += 8) {
        d.beginPath(); d.moveTo(0, y); d.lineTo(N, y); d.stroke();
        const off = (y / 8) % 2 ? 12 : 0;
        for (let x = off; x < N; x += 24) {
          d.beginPath(); d.moveTo(x, y); d.lineTo(x, y + 8); d.stroke();
        }
      }
      const C = N / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = i * C + 30, y = j * C + 22, w = C - 60, h = C - 48;
        d.fillStyle = '#efe9dd'; d.fillRect(x - 6, y + h, w + 12, 8);       // sill
        d.fillStyle = '#c9c2b4'; d.fillRect(x - 4, y - 8, w + 8, 8);        // lintel
        const v = 0.8 + rnd() * 0.3;
        d.fillStyle = `rgb(${58 * v | 0},${70 * v | 0},${84 * v | 0})`;
        d.fillRect(x, y, w, h);
        d.fillStyle = 'rgba(230,240,250,0.18)';
        d.fillRect(x, y, w, h * 0.35);
        d.fillStyle = '#3a352e';
        d.fillRect(x + w / 2 - 2, y, 4, h); d.fillRect(x, y + h / 2 - 2, w, 4);
        litWindow(x, y, w, h);
      }
    } else if (kind === 'stone') {
      // limestone: smooth blocks, tall paired windows, floor band
      d.fillStyle = '#ddd8cc'; d.fillRect(0, 0, N, N);
      d.strokeStyle = 'rgba(110,105,95,0.25)'; d.lineWidth = 1.5;
      for (let y = 0; y < N; y += 32) { d.beginPath(); d.moveTo(0, y); d.lineTo(N, y); d.stroke(); }
      const C = N / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        d.fillStyle = 'rgba(90,85,75,0.30)';
        d.fillRect(0, j * C + C - 12, N, 6);                                 // spandrel band
        for (const k of [0, 1]) {
          const w = C / 2 - 42, h = C - 44;
          const x = i * C + 16 + k * (C / 2 + 4), y = j * C + 20;
          const v = 0.8 + rnd() * 0.3;
          d.fillStyle = `rgb(${52 * v | 0},${64 * v | 0},${80 * v | 0})`;
          d.fillRect(x, y, w, h);
          d.fillStyle = 'rgba(235,242,250,0.20)'; d.fillRect(x, y, w, h * 0.3);
          d.fillStyle = '#39342d'; d.fillRect(x, y + h / 2 - 2, w, 4);
          litWindow(x, y, w, h);
        }
      }
    } else if (kind === 'blank') {
      // party wall / blank side: raw brick, no window grid — just water
      // stains, ghost-ad blotches and a couple of stray windows. Breaks up
      // the endless glass/grid repetition the way real NYC side walls do.
      d.fillStyle = '#cdbfb0'; d.fillRect(0, 0, N, N);
      d.strokeStyle = 'rgba(120,104,92,0.4)'; d.lineWidth = 1;
      for (let y = 0; y < N; y += 7) {                 // brick courses
        d.beginPath(); d.moveTo(0, y); d.lineTo(N, y); d.stroke();
        const off = (y / 7) % 2 ? 11 : 0;
        for (let x = off; x < N; x += 22) {
          d.beginPath(); d.moveTo(x, y); d.lineTo(x, y + 7); d.stroke();
        }
      }
      // ghost painted-ad rectangle
      d.fillStyle = 'rgba(150,120,100,0.18)';
      d.fillRect(N * 0.18, N * 0.2, N * 0.5, N * 0.34);
      // long vertical water stains under the parapet
      for (let i = 0; i < 7; i++) {
        const x = 20 + (i * 71) % (N - 40);
        const g = d.createLinearGradient(x, 0, x, N);
        g.addColorStop(0, 'rgba(70,60,50,0.28)'); g.addColorStop(1, 'rgba(70,60,50,0)');
        d.fillStyle = g; d.fillRect(x, 0, 5 + rnd() * 5, N);
      }
      // a few stray windows + one AC unit
      for (let i = 0; i < 5; i++) {
        const x = 30 + ((i * 97) % (N - 90)), y = 40 + ((i * 137) % (N - 120));
        d.fillStyle = '#3a352e'; d.fillRect(x, y, 26, 34);
        d.fillStyle = '#8a836f'; d.fillRect(x - 3, y + 34, 32, 5);   // sill
        litWindow(x, y, 26, 34);
      }
      d.fillStyle = '#4a4640'; d.fillRect(N * 0.62, N * 0.66, 40, 26); // AC unit
    } else {
      // glass curtain wall: full panes, mullions, sky reflection gradient
      const C = N / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = i * C, y = j * C;
        const v = 0.86 + rnd() * 0.26;
        d.fillStyle = `rgb(${96 * v | 0},${118 * v | 0},${138 * v | 0})`;
        d.fillRect(x, y, C, C);
        const g = d.createLinearGradient(x, y, x, y + C);
        g.addColorStop(0, 'rgba(255,255,255,0.34)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        g.addColorStop(1, 'rgba(15,25,38,0.30)');
        d.fillStyle = g; d.fillRect(x, y, C, C);
        d.fillStyle = 'rgba(30,34,40,0.9)';
        d.fillRect(x, y + C - 5, C, 5); d.fillRect(x + C - 4, y, 4, C);
        d.fillRect(x + C / 2 - 2, y, 4, C);
        litWindow(x + 4, y + 4, C - 12, C - 12);
      }
    }
    const mk = (cv, srgb) => {
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.encoding = THREE.sRGBEncoding;
      return t;
    };
    return TexCache[kind] = { map: mk(day, true), emissiveMap: mk(emi, false) };
  }

  function roofTextures() {
    if (TexCache.roof) return TexCache.roof;
    const N = 256;
    const day = document.createElement('canvas'); day.width = day.height = N;
    const emi = document.createElement('canvas'); emi.width = emi.height = N;
    const d = day.getContext('2d'), e = emi.getContext('2d');
    let seed = 83;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    d.fillStyle = '#8e8a84'; d.fillRect(0, 0, N, N);
    for (let i = 0; i < 1800; i++) {          // gravel
      const v = 110 + rnd() * 60;
      d.fillStyle = `rgba(${v},${v - 3},${v - 8},${0.2 + rnd() * 0.25})`;
      d.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    e.fillStyle = '#000'; e.fillRect(0, 0, N, N);
    for (let i = 0; i < 26; i++) {            // skylights / roof-access glow
      const x = rnd() * N, y = rnd() * N, w = 3 + rnd() * 7, h = 3 + rnd() * 7;
      e.fillStyle = rnd() < 0.75 ? '#d8933f' : '#7fb4c9';
      e.fillRect(x, y, w, h);
    }
    const mk = (cv, srgb) => {
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      if (srgb) t.encoding = THREE.sRGBEncoding;
      return t;
    };
    return TexCache.roof = { map: mk(day, true), emissiveMap: mk(emi, false) };
  }

  // ======================= polygon helpers ==========================
  function pointInPoly(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }
  function closestOnSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz;
    let t = L2 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return [ax + dx * t, az + dz * t];
  }
  function nearestEdgePoint(x, z, poly) {
    let bd = Infinity, bx = 0, bz = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const c = closestOnSegment(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
      const dx = x - c[0], dz = z - c[1], d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bx = c[0]; bz = c[1]; }
    }
    return { x: bx, z: bz, dist: Math.sqrt(bd) };
  }
  function signedArea(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
      a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    return a * 0.5;
  }
  // mitered outward offset (CCW poly). Clamped so spiky corners don't explode.
  function offsetPoly(poly, d) {
    const n = poly.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
      let ax = p1[0] - p0[0], az = p1[1] - p0[1];
      let bx = p2[0] - p1[0], bz = p2[1] - p1[1];
      const al = Math.hypot(ax, az) || 1, bl = Math.hypot(bx, bz) || 1;
      // outward normals of the two edges (CCW → outward = (dz,-dx))
      const n1x = az / al, n1z = -ax / al, n2x = bz / bl, n2z = -bx / bl;
      let mx = n1x + n2x, mz = n1z + n2z;
      const ml = Math.hypot(mx, mz);
      if (ml < 0.05) { mx = n1x; mz = n1z; }
      else { mx /= ml; mz /= ml; }
      const cosHalf = Math.max(0.35, (1 + (n1x * n2x + n1z * n2z)) / 2);
      const s = d / Math.sqrt(cosHalf);
      out.push([p1[0] + mx * s, p1[1] + mz * s]);
    }
    return out;
  }
  function centroidOf(poly) {
    let cx = 0, cz = 0;
    for (const [x, z] of poly) { cx += x; cz += z; }
    return [cx / poly.length, cz / poly.length];
  }

  // facade tints per family
  const TINTS = {
    brick: [0xa26248, 0x91503a, 0xb07a55, 0x8a5a44, 0xa8705a, 0x7d4a3a, 0xc08a66,
            0x9c6a4e, 0x6e4436, 0xbf9070, 0x82584a, 0xa8543a],
    stone: [0xcfc4ab, 0xbfb49c, 0xd8cdb6, 0xb3a68d, 0xc4b697, 0xe2dac4, 0xa89c84,
            0xd0c0a0, 0xb8b0a0, 0xc8b59a, 0x9c917c, 0xdcd0b4],
    glass: [0xbccfdd, 0xaec4d6, 0xc4d4e0, 0x9fb8cc, 0xa8c4c0, 0xb0c8d8, 0x88a0b4,
            0xc8d8dc, 0x9cb0a8, 0x7e9bb0, 0xb6c2be, 0xa0bcd0],
  };

  // =============================== City =============================
  class City {
    constructor(zone) {
      this.zone = zone;
      this.buildings = [];
      this.grid = new Map();
      this.anchorGrid = new Map();
      this.group = new THREE.Group();
      this.raycastTargets = [];
      this.wallMats = [];
      this.perches = [];      // pigeon spots {x,y,z}
      this._classify();
      this._buildWallsAndRoofs();
      this._buildTrim();
      this._buildProps();
      this._buildGroundAndRoads();
      this._buildAnchors();
      this._collectPerches();
    }

    _key(cx, cz) { return cx + ',' + cz; }
    _insert(map, x, z, item) {
      const k = this._key(Math.floor(x / GRID), Math.floor(z / GRID));
      const a = map.get(k);
      a ? a.push(item) : map.set(k, [item]);
    }

    _classify() {
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (const raw of this.zone.buildings) {
        let poly = raw.p;
        if (signedArea(poly) < 0) poly = poly.slice().reverse();
        // drop near-duplicate points — they break roof triangulation
        poly = poly.filter((p, i) => {
          const q = poly[(i + poly.length - 1) % poly.length];
          const dx = p[0] - q[0], dz = p[1] - q[1];
          return dx * dx + dz * dz > 0.01;
        });
        if (poly.length < 3) continue;
        let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9;
        for (const [x, z] of poly) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
          if (z < bz0) bz0 = z; if (z > bz1) bz1 = z;
        }
        minX = Math.min(minX, bx0); maxX = Math.max(maxX, bx1);
        minZ = Math.min(minZ, bz0); maxZ = Math.max(maxZ, bz1);
        const h = raw.h;
        const hash = Math.abs((poly[0][0] * 31 + poly[0][1] * 17 + h * 7) | 0);
        let fam;
        if (h > 100) fam = 'glass';
        else if (h > 45) fam = (hash % 3 === 0) ? 'glass' : 'stone';
        else fam = (hash % 3 === 0) ? 'stone' : 'brick';
        const area = Math.abs(signedArea(poly));
        const b = { poly, h, bx0, bx1, bz0, bz1, fam, hash, area, name: raw.n || null };
        this.buildings.push(b);
        for (let cx = Math.floor(bx0 / GRID); cx <= Math.floor(bx1 / GRID); cx++)
          for (let cz = Math.floor(bz0 / GRID); cz <= Math.floor(bz1 / GRID); cz++) {
            const k = this._key(cx, cz);
            const a = this.grid.get(k);
            a ? a.push(b) : this.grid.set(k, [b]);
          }
      }
      this.bounds = { minX, maxX, minZ, maxZ };
    }

    _buildWallsAndRoofs() {
      // The city is far too big to live in a few giant meshes — one merged mesh
      // can't be frustum-culled, so every triangle is submitted every frame.
      // Build per-CHUNK meshes instead (shared materials, so no extra state
      // changes) and let three.js cull whole chunks that are off-screen.
      const CHUNK = 400;
      const chunks = new Map();
      const bucketFor = (cx, cz) => {
        const k = Math.floor(cx / CHUNK) + '_' + Math.floor(cz / CHUNK);
        let c = chunks.get(k);
        if (!c) {
          c = { brick: null, stone: null, glass: null, blank: null,
                roof: { pos: [], nrm: [], uv: [], col: [], idx: [] } };
          for (const fam of ['brick', 'stone', 'glass', 'blank'])
            c[fam] = { pos: [], nrm: [], uv: [], col: [], idx: [] };
          chunks.set(k, c);
        }
        return c;
      };
      // meters per texture tile (4 windows / 4 floors per tile)
      const TILE = { brick: [8, 11], stone: [10, 12.5], glass: [6, 13], blank: [9, 9] };

      for (const b of this.buildings) {
        const { poly, h, fam, hash } = b;
        const chunk = bucketFor((b.bx0 + b.bx1) / 2, (b.bz0 + b.bz1) / 2);
        const roof = chunk.roof;
        // Per-building variation so neighbours don't read as clones: brightness
        // jitter, plus its own window density (tile scale) and floor phase.
        const bright = 0.84 + (hash % 11) / 11 * 0.32;
        const tint = new THREE.Color(TINTS[fam][hash % TINTS[fam].length]).multiplyScalar(bright);
        const topShade = 0.55 + 0.45 * Math.min(1, h / 35);
        const tuScale = 0.82 + (hash % 7) / 7 * 0.5;     // window column width
        const tvScale = 0.9 + ((hash >> 2) % 5) / 5 * 0.4; // floor height
        const vPhase = (hash % 6) / 6;                    // ground-floor offset

        // Party walls: masonry buildings 12–75m get their SHORTER side/back
        // edges rendered as blank brick (windowless). The longest edge — the
        // street front — keeps its windows.
        const blankEdges = new Set();
        if (fam !== 'glass' && h > 12 && h < 75 && (hash % 3 === 0) && poly.length <= 10) {
          const lens = [];
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
            lens.push([i, Math.hypot(poly[i][0] - poly[j][0], poly[i][1] - poly[j][1])]);
          lens.sort((a, b2) => b2[1] - a[1]);
          for (let e = 1; e < lens.length; e++)             // skip longest (front)
            if (((hash + e) % 2) === 0 && lens[e][1] > 6) blankEdges.add(lens[e][0]);
        }

        let cum = hash % 7; // desync window columns between buildings
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const x1 = poly[j][0], z1 = poly[j][1], x2 = poly[i][0], z2 = poly[i][1];
          const dx = x2 - x1, dz = z2 - z1;
          const len = Math.hypot(dx, dz);
          if (len < 0.01) continue;
          const nx = dz / len, nz = -dx / len;
          const blank = blankEdges.has(i);
          const g = blank ? chunk.blank : chunk[fam];
          const [tu0, tv0] = blank ? TILE.blank : TILE[fam];
          const tu = tu0 * tuScale, tv = tv0 * tvScale;
          const vi = g.pos.length / 3;
          g.pos.push(x1, 0, z1, x2, 0, z2, x2, h, z2, x1, h, z1);
          for (let k = 0; k < 4; k++) g.nrm.push(nx, 0, nz);
          g.uv.push(cum / tu, vPhase, (cum + len) / tu, vPhase,
                    (cum + len) / tu, h / tv + vPhase, cum / tu, h / tv + vPhase);
          const cL = tint.clone().multiplyScalar(0.42);
          const cT = tint.clone().multiplyScalar(topShade);
          g.col.push(cL.r, cL.g, cL.b, cL.r, cL.g, cL.b,
                     cT.r, cT.g, cT.b, cT.r, cT.g, cT.b);
          g.idx.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
          cum += len;
        }

        // roof
        const contour = poly.map(p => new THREE.Vector2(p[0], p[1]));
        let tris = [];
        try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (err) {}
        const rb = roof.pos.length / 3;
        const rc = new THREE.Color(0x6b675f).multiplyScalar(0.75 + (hash % 5) * 0.06);
        for (const [x, z] of poly) {
          roof.pos.push(x, h, z); roof.nrm.push(0, 1, 0);
          roof.uv.push(x / 7, z / 7);
          roof.col.push(rc.r, rc.g, rc.b);
        }
        for (const t of tris) {
          let [a, b2, c] = t;
          // normal.y = (Bz-Az)(Cx-Ax) - (Bx-Ax)(Cz-Az); flip when it points down
          const ny = (poly[b2][1] - poly[a][1]) * (poly[c][0] - poly[a][0])
                   - (poly[b2][0] - poly[a][0]) * (poly[c][1] - poly[a][1]);
          if (ny < 0) { const tmp = b2; b2 = c; c = tmp; }
          roof.idx.push(rb + a, rb + b2, rb + c);
        }
        if (!tris.length) {
          // triangulation failed (self-touching outline) → centroid fan so the
          // building is never left roofless
          const [fx, fz] = centroidOf(poly);
          const ci = roof.pos.length / 3;
          roof.pos.push(fx, h, fz); roof.nrm.push(0, 1, 0);
          roof.uv.push(fx / 7, fz / 7);
          roof.col.push(rc.r, rc.g, rc.b);
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const ny = (poly[i][1] - poly[j][1]) * (fx - poly[j][0])
                     - (poly[i][0] - poly[j][0]) * (fz - poly[j][1]);
            if (ny >= 0) roof.idx.push(rb + j, rb + i, ci);
            else roof.idx.push(rb + i, rb + j, ci);
          }
        }
      }

      // shared materials across all chunks
      const famMat = {};
      for (const fam of ['brick', 'stone', 'glass', 'blank']) {
        const tex = facadeTextures(fam);
        const mat = new THREE.MeshLambertMaterial({
          map: tex.map, emissiveMap: tex.emissiveMap,
          emissive: new THREE.Color(0xffa953), emissiveIntensity: 0,
          vertexColors: true,
        });
        this.wallMats.push(mat);
        famMat[fam] = mat;
      }
      const rtex = roofTextures();
      const roofMat = new THREE.MeshLambertMaterial({
        map: rtex.map, emissiveMap: rtex.emissiveMap,
        emissive: new THREE.Color(0xffa953), emissiveIntensity: 0,
        vertexColors: true, side: THREE.DoubleSide,
      });
      this.wallMats.push(roofMat);

      const mkMesh = (g, mat, uv) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nrm, 3));
        if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
        geo.setIndex(g.idx);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.group.add(mesh);
        this.raycastTargets.push(mesh);
        return mesh;
      };
      let meshCount = 0;
      for (const c of chunks.values()) {
        for (const fam of ['brick', 'stone', 'glass', 'blank'])
          if (c[fam].idx.length) { mkMesh(c[fam], famMat[fam], true); meshCount++; }
        if (c.roof.idx.length) { mkMesh(c.roof, roofMat, true); meshCount++; }
      }
      this.chunkMeshes = meshCount;
    }

    // cornice/parapet ring + street-level stone band — chunked like the walls
    // (this is the heaviest geometry in the city, ~60 tris per building)
    _buildTrim() {
      const CHUNK = 400;
      const chunks = new Map();
      let cur = null;
      const chunkAt = (cx, cz) => {
        const k = Math.floor(cx / CHUNK) + '_' + Math.floor(cz / CHUNK);
        let c = chunks.get(k);
        if (!c) chunks.set(k, c = { pos: [], nrm: [], col: [], idx: [] });
        return c;
      };
      const band = (polyIn, polyOut, y0, y1, c) => {
        const { pos, nrm, col, idx } = cur;
        // outer shell wall y0..y1 + flat cap ring at y1 (outer→inner)
        const n = polyOut.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const x1 = polyOut[j][0], z1 = polyOut[j][1];
          const x2 = polyOut[i][0], z2 = polyOut[i][1];
          const dx = x2 - x1, dz = z2 - z1;
          const len = Math.hypot(dx, dz);
          if (len < 0.01) continue;
          const nx = dz / len, nz = -dx / len;
          let vi = pos.length / 3;
          pos.push(x1, y0, z1, x2, y0, z2, x2, y1, z2, x1, y1, z1);
          for (let k = 0; k < 4; k++) { nrm.push(nx, 0, nz); col.push(c.r, c.g, c.b); }
          idx.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
          // cap ring segment
          const xi1 = polyIn[j][0], zi1 = polyIn[j][1];
          const xi2 = polyIn[i][0], zi2 = polyIn[i][1];
          vi = pos.length / 3;
          const cc = c.clone().multiplyScalar(0.82);
          pos.push(x1, y1, z1, x2, y1, z2, xi2, y1, zi2, xi1, y1, zi1);
          for (let k = 0; k < 4; k++) { nrm.push(0, 1, 0); col.push(cc.r, cc.g, cc.b); }
          idx.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
        }
      };
      for (const b of this.buildings) {
        if (b.poly.length > 24) continue; // skip mega-complex outlines
        cur = chunkAt((b.bx0 + b.bx1) / 2, (b.bz0 + b.bz1) / 2);
        const c = new THREE.Color(TINTS[b.fam][b.hash % TINTS[b.fam].length])
          .multiplyScalar(0.5 + 0.4 * Math.min(1, b.h / 35));
        // Parapet / cornice — real NYC buildings crown differently:
        //   glass towers → thin flush coping
        //   masonry (brick/stone) → a projecting cornice + a taller parapet
        //     wall, varied per building so the skyline edge isn't a flat line
        const glass = b.fam === 'glass';
        // Realistic parapet: a strong PROJECTING cornice (wide shadow line)
        // but a modest ~1m HEIGHT — real NYC parapets are ~1m, and a low crown
        // is a ledge you can actually step onto and perch on.
        const proj = glass ? 0.28 : 0.85 + (b.hash % 3) * 0.22;    // 0.85–1.29 out
        const rise = glass ? 0.5 : 0.85 + (b.hash % 3) * 0.13;     // 0.85–1.11 up
        const po = offsetPoly(b.poly, proj);
        // projecting cornice cap: outer face + flat top ring (the standable crown)
        band(b.poly, po, b.h - 0.5, b.h + rise, c.clone().multiplyScalar(0.94));
        // one belt course two-thirds up tall masonry — offset OUT from the wall
        // so it never z-fights the facade
        if (!glass && b.h > 34 && (b.hash % 2)) {
          const pm = offsetPoly(b.poly, 0.3);
          const y = b.h * 0.66;
          band(b.poly, pm, y - 0.3, y + 0.3, c.clone().multiplyScalar(0.72));
        }
        // street-level base band (stone storefront)
        if (b.h > 8) {
          const pb = offsetPoly(b.poly, 0.35);
          band(b.poly, pb, 0, 3.2, c.clone().multiplyScalar(0.8));
        }
        b.parapetTop = b.h + rise;
        b.parapetProj = proj;
      }
      // one mesh per chunk, sharing a single material
      const trimMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      for (const c of chunks.values()) {
        if (!c.idx.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(c.nrm, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
        g.setIndex(c.idx);
        const mesh = new THREE.Mesh(g, trimMat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.group.add(mesh);
      }
    }

    // NYC water towers + rooftop AC units (instanced)
    _buildProps() {
      // --- water tower geometry: legs base + barrel + conical roof ---
      const parts = [];
      const addGeo = (geo, color, ty) => {
        geo.translate(0, ty, 0);
        const cnt = geo.attributes.position.count;
        const cols = new Float32Array(cnt * 3);
        const c = new THREE.Color(color);
        for (let i = 0; i < cnt; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        parts.push(geo);
      };
      addGeo(new THREE.CylinderGeometry(1.7, 1.9, 1.6, 8, 1, true), 0x4a4440, 0.8);  // leg skirt
      addGeo(new THREE.CylinderGeometry(2.1, 2.3, 4.2, 12), 0x7a5b43, 3.7);          // barrel
      addGeo(new THREE.ConeGeometry(2.45, 1.8, 12), 0x4f3f34, 6.6);                  // roof
      addGeo(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 6), 0x3a322c, 7.6);         // finial
      const towerGeo = mergeGeos(parts);

      const acGeo = mergeGeos([
        (() => {
          const g = new THREE.BoxGeometry(1.7, 1.1, 1.7); g.translate(0, 0.55, 0);
          return withColor(g, 0x9aa0a4);
        })(),
        (() => {
          const g = new THREE.BoxGeometry(1.4, 0.12, 1.4); g.translate(0, 1.12, 0);
          return withColor(g, 0x5a6064);
        })(),
      ]);

      // stair bulkhead: every NYC roof has one — the strongest "this is a
      // floor you're standing on" cue
      const bulkGeo = mergeGeos([
        (() => { const g = new THREE.BoxGeometry(2.9, 2.5, 2.3); g.translate(0, 1.25, 0);
                 return withColor(g, 0x9d968a); })(),
        (() => { const g = new THREE.BoxGeometry(1.0, 1.8, 0.12); g.translate(0, 0.9, 1.18);
                 return withColor(g, 0x3a352f); })(),
        (() => { const g = new THREE.BoxGeometry(3.1, 0.16, 2.5); g.translate(0, 2.56, 0);
                 return withColor(g, 0x6e6a62); })(),
      ]);
      const antGeo = mergeGeos([
        (() => { const g = new THREE.CylinderGeometry(0.06, 0.1, 7, 6); g.translate(0, 3.5, 0);
                 return withColor(g, 0x4a4a50); })(),
        (() => { const g = new THREE.BoxGeometry(1.7, 0.07, 0.07); g.translate(0, 5.1, 0);
                 return withColor(g, 0x4a4a50); })(),
        (() => { const g = new THREE.BoxGeometry(1.1, 0.07, 0.07); g.translate(0, 6.2, 0);
                 return withColor(g, 0x4a4a50); })(),
      ]);

      const towers = [], acs = [], bulks = [], ants = [];
      for (const b of this.buildings) {
        if (b.poly.length > 24) continue;
        const [cx, cz] = centroidOf(b.poly);
        if (!pointInPoly(cx, cz, b.poly)) continue;
        // OSM footprints overlap: a taller neighbour can occupy the air above
        // this roof. Props placed there end up buried inside that building —
        // and anything perched on them gets ejected by its wall.
        if (this.isSolid(cx, b.h + 0.6, cz)) continue;
        // A prop only lands if its whole footprint + the cornice projection
        // clears every roof edge — nothing pokes through the parapet or hangs
        // off the side of the building.
        const pj = b.parapetProj || 0.9;
        const fits = (x, z, rad) => nearestEdgePoint(x, z, b.poly).dist >= rad + pj + 0.4;
        if (b.h >= 22 && b.h <= 130 && b.area > 220 && b.hash % 10 < 4) {
          const twr = 2.42 * (0.85 + (b.hash % 4) * 0.1);
          const tx = cx + (b.hash % 5) - 2, tz = cz + (b.hash % 7) - 3;
          if (fits(tx, tz, twr) || fits(cx, cz, twr)) {
            const ux = fits(tx, tz, twr) ? tx : cx, uz = fits(tx, tz, twr) ? tz : cz;
            const s = 0.85 + (b.hash % 4) * 0.1;
            towers.push({ x: ux, y: b.h, z: uz, rot: (b.hash % 12) * 0.52, s, b });
            b.hasTower = true;
            // Solid water tower with a small FLAT cap on the peak (flatR) so you
            // land and stand on it cleanly instead of sliding off the cone.
            (b.props || (b.props = [])).push(
              { x: ux, z: uz, r: 2.42 * s, top: b.h + 7.45 * s,
                coneH: 1.75 * s, flatR: 0.9 * s });
          }
        }
        if (b.h >= 10 && b.area > 130) {
          const ks = 0.85 + (b.hash % 3) * 0.15;
          const ox = ((b.hash * 7) % 9) - 4, oz = ((b.hash * 11) % 9) - 4;
          if (pointInPoly(cx + ox, cz + oz, b.poly) && fits(cx + ox, cz + oz, 1.75 * ks)) {
            bulks.push({ x: cx + ox, y: b.h, z: cz + oz, rot: (b.hash % 4) * 0.785, s: ks });
            // solid stair bulkhead — perch on its roof
            (b.props || (b.props = [])).push(
              { x: cx + ox, z: cz + oz, r: 1.75 * ks, top: b.h + 2.62 * ks });
          }
        }
        if (b.h >= 45 && b.hash % 5 < 2) {
          const as = 0.8 + (b.hash % 4) * 0.15;
          const ox = ((b.hash * 13) % 7) - 3, oz = ((b.hash * 5) % 7) - 3;
          if (pointInPoly(cx + ox, cz + oz, b.poly) && fits(cx + ox, cz + oz, 0.8)) {
            ants.push({ x: cx + ox, y: b.h, z: cz + oz, rot: b.hash % 6, s: as });
            // solid antenna base — a small perchable platform partway up the mast
            (b.props || (b.props = [])).push(
              { x: cx + ox, z: cz + oz, r: 0.55 * as, top: b.h + 3.6 * as });
          }
        }
        if (b.h >= 12 && b.area > 150 && b.hash % 3 !== 0) {
          const n = 1 + b.hash % 3;
          for (let k = 0; k < n; k++) {
            const ox = ((b.hash * (k + 3)) % 11) - 5, oz = ((b.hash * (k + 7)) % 11) - 5;
            const acs_s = 0.8 + (k % 3) * 0.3;
            if (!pointInPoly(cx + ox, cz + oz, b.poly)) continue;
            if (!fits(cx + ox, cz + oz, 1.05 * acs_s)) continue;
            acs.push({ x: cx + ox, y: b.h, z: cz + oz, rot: k * 1.1, s: acs_s });
            (b.props || (b.props = [])).push(
              { x: cx + ox, z: cz + oz, r: 1.05 * acs_s, top: b.h + 1.18 * acs_s });
          }
        }
      }
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      const place = (geo, list) => {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        const m = new THREE.Matrix4();
        list.forEach((t, i) => {
          q.setFromAxisAngle(up, t.rot);
          m.compose(new THREE.Vector3(t.x, t.y, t.z), q,
                    new THREE.Vector3(t.s, t.s, t.s));
          im.setMatrixAt(i, m);
        });
        im.castShadow = true; im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true;
        this.group.add(im);
        return im;
      };
      if (towers.length) place(towerGeo, towers);
      if (acs.length) place(acGeo, acs);
      if (bulks.length) place(bulkGeo, bulks);
      if (ants.length) place(antGeo, ants);
      // water tower tops are great web anchors
      this._towerAnchors = towers.map(t => ({ x: t.x, y: t.y + 7.2 * t.s, z: t.z }));


      // red aircraft-warning beacons on the tallest towers
      const beacons = [];
      for (const b of this.buildings) {
        if (b.h < 130 || b.poly.length > 24) continue;
        const step = Math.max(1, Math.floor(b.poly.length / 3));
        for (let i = 0; i < b.poly.length && beacons.length < 400; i += step) {
          const [x, z] = b.poly[i];
          const [cx2, cz2] = centroidOf(b.poly);
          const dx = cx2 - x, dz = cz2 - z;
          const d = Math.hypot(dx, dz) || 1;
          beacons.push({ x: x + dx / d * 0.8, y: (b.parapetTop || b.h) + 0.8,
                         z: z + dz / d * 0.8 });
        }
      }
      if (beacons.length) {
        this.beaconMat = new THREE.MeshBasicMaterial({ color: 0x330806 });
        const im = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.45, 8, 6), this.beaconMat, beacons.length);
        const m = new THREE.Matrix4();
        beacons.forEach((p, i) => {
          m.makeTranslation(p.x, p.y, p.z);
          im.setMatrixAt(i, m);
        });
        im.instanceMatrix.needsUpdate = true;
        this.group.add(im);
      }

      this._buildLampPosts();
      this._buildParks();
    }

    // ---- parks: green ground + scattered trees (Central Park & friends) ----
    _buildParks() {
      const parks = this.zone.parks;
      if (!parks || !parks.length) return;
      const pos = [], nrm = [], col = [], idx = [];
      const green = new THREE.Color(0x4a6b32), grass = new THREE.Color(0x577a3a);
      for (const pk of parks) {
        let poly = pk.p;
        if (signedArea(poly) < 0) poly = poly.slice().reverse();
        const contour = poly.map(p => new THREE.Vector2(p[0], p[1]));
        let tris = [];
        try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) {}
        const base = pos.length / 3;
        const c = pk.n === 'Central Park' ? green : grass;
        for (const [x, z] of poly) {
          pos.push(x, 0.22, z); nrm.push(0, 1, 0);      // just above the roads
          col.push(c.r, c.g, c.b);
        }
        for (const t of tris) {
          let [a, b2, cc] = t;
          const ny = (poly[b2][1]-poly[a][1])*(poly[cc][0]-poly[a][0])
                   - (poly[b2][0]-poly[a][0])*(poly[cc][1]-poly[a][1]);
          if (ny < 0) { const tmp = b2; b2 = cc; cc = tmp; }
          idx.push(base + a, base + b2, base + cc);
        }
      }
      if (idx.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
          vertexColors: true, side: THREE.DoubleSide }));
        m.receiveShadow = true;
        this.group.add(m);
        this.raycastTargets.push(m);
      }

      // trees — instanced trunk + canopy scattered inside each park
      const trunk = withColor((() => { const t = new THREE.CylinderGeometry(0.22, 0.3, 3.2, 5);
                                       t.translate(0, 1.6, 0); return t; })(), 0x4a3a2a);
      const canopy = withColor((() => { const t = new THREE.SphereGeometry(2.1, 7, 5);
                                        t.scale(1, 0.85, 1); t.translate(0, 4.3, 0); return t; })(), 0x3f6b30);
      const treeGeo = mergeGeos([trunk, canopy]);
      const spots = [];
      let seed = 137;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (const pk of parks) {
        let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
        for (const [x,z] of pk.p){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
        const area = Math.abs(signedArea(pk.p));
        const n = Math.min(900, Math.max(6, Math.floor(area / 420)));
        for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
          const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
          if (!pointInPoly(x, z, pk.p)) continue;
          const cp = pk.n === 'Central Park';
          if (cp && GAME.inParkLake(pk.p, x, z)) continue;
          // Central Park grows REAL trees — 16-30m, tall enough to swing from.
          // Their canopy tops feed the web-anchor grid so you can chain
          // tree-to-tree across the park.
          const sc = cp ? 2.7 + rnd() * 2.1 : 0.7 + rnd() * 0.9;
          spots.push({ x, z, s: sc, rot: rnd() * 6.28 });
          if (cp) (this._treeAnchors = this._treeAnchors || [])
            .push({ x, y: 5.6 * sc, z });
          i++;
        }
      }
      if (spots.length) {
        const im = new THREE.InstancedMesh(treeGeo,
          new THREE.MeshLambertMaterial({ vertexColors: true }), spots.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0,1,0);
        spots.forEach((t, i) => {
          q.setFromAxisAngle(up, t.rot);
          m.compose(new THREE.Vector3(t.x, 0.2, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
          im.setMatrixAt(i, m);
        });
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = true;
        this.group.add(im);
        this.treeCount = spots.length;
      }
    }

    // ---- street lamp posts: a mast with a curved arm and a glowing head,
    // placed along both kerbs of every road ----
    _buildLampPosts() {
      const parts = [
        withColor((() => { const g = new THREE.CylinderGeometry(0.11, 0.15, 8.2, 6);
                           g.translate(0, 4.1, 0); return g; })(), 0x2f3238),   // mast
        withColor((() => { const g = new THREE.BoxGeometry(1.5, 0.13, 0.13);
                           g.translate(0.72, 8.15, 0); return g; })(), 0x2f3238), // arm
        withColor((() => { const g = new THREE.CylinderGeometry(0.16, 0.3, 0.1, 6);
                           g.translate(0.15, 8.9, 0); return g; })(), 0x2f3238),  // base plate
      ];
      const postGeo = mergeGeos(parts);
      const headGeo = (() => { const g = new THREE.SphereGeometry(0.26, 8, 6);
                               g.scale(1.5, 0.55, 1); g.translate(1.4, 8.03, 0);
                               return withColor(g, 0xffffff); })();

      const posts = [];
      let seed = 29;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (const r of this.zone.roads) {
        if (r.w < 10) continue;
        for (let i = 1; i < r.p.length; i++) {
          const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
          const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
          if (L < 6) continue;
          const ux = dx / L, uz = dz / L;
          const px = -uz, pz = ux;                 // road perpendicular
          const off = r.w * 0.5 + 1.2;             // sit just past the kerb
          for (let s = 12; s < L - 6; s += 30) {
            const side = rnd() < 0.5 ? 1 : -1;
            const x = ax + ux * s + px * off * side;
            const z = az + uz * s + pz * off * side;
            if (this.isSolid(x, 1, z)) continue;   // don't spawn inside a building
            posts.push({ x, z, rot: Math.atan2(-px * side, -pz * side) });
            if (posts.length > 900) break;
          }
        }
        if (posts.length > 900) break;
      }
      if (!posts.length) return;

      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.lampHeadMat = new THREE.MeshBasicMaterial({ color: 0x3a3428 });
      const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
      const m = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
      const mk = (geo, material, shadow) => {
        const im = new THREE.InstancedMesh(geo, material, posts.length);
        posts.forEach((p, i) => {
          q.setFromAxisAngle(up, p.rot);
          m.compose(new THREE.Vector3(p.x, 0, p.z), q, one);
          im.setMatrixAt(i, m);
        });
        im.instanceMatrix.needsUpdate = true;
        if (shadow) { im.castShadow = true; }
        this.group.add(im);
        return im;
      };
      mk(postGeo, mat, true);
      mk(headGeo, this.lampHeadMat, false);
    }

    _buildGroundAndRoads() {
      const B = this.bounds, pad = 40;
      // subtle concrete noise so the ground isn't a flat wash
      if (!TexCache.ground) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        const c = cv.getContext('2d');
        c.fillStyle = '#8b8778'; c.fillRect(0, 0, 256, 256);
        let seed = 61;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 2600; i++) {
          const v = 120 + rnd() * 40;
          c.fillStyle = `rgba(${v},${v - 4},${v - 14},${0.16 + rnd() * 0.2})`;
          c.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3);
        }
        c.strokeStyle = 'rgba(80,76,66,0.35)'; c.lineWidth = 1;
        for (let k = 0; k <= 256; k += 64) {
          c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 256); c.stroke();
          c.beginPath(); c.moveTo(0, k); c.lineTo(256, k); c.stroke();
        }
        const t = new THREE.CanvasTexture(cv);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        t.encoding = THREE.sRGBEncoding;
        TexCache.ground = t;
      }
      const gtex = TexCache.ground.clone();
      gtex.needsUpdate = true;
      const W = B.maxX - B.minX + pad * 2, H = B.maxZ - B.minZ + pad * 2;
      gtex.repeat.set(W / 12, H / 12);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H),
        new THREE.MeshLambertMaterial({ color: 0xbdb9ab, map: gtex }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.set((B.minX + B.maxX) / 2, 0, (B.minZ + B.maxZ) / 2);
      ground.receiveShadow = true;
      this.group.add(ground);
      this.raycastTargets.push(ground);

      const pos = [], nrm = [], col = [], idx = [];
      const asphalt = new THREE.Color(0x33343a);
      const dashCol = new THREE.Color(0xc9a83a);
      const quad = (ax, az, bx, bz, w, y, c) => {
        const dx = bx - ax, dz = bz - az;
        const L = Math.hypot(dx, dz);
        if (L < 0.01) return;
        const px = -dz / L * w / 2, pz = dx / L * w / 2;
        const vi = pos.length / 3;
        pos.push(ax + px, y, az + pz, bx + px, y, bz + pz,
                 bx - px, y, bz - pz, ax - px, y, az - pz);
        for (let k = 0; k < 4; k++) { nrm.push(0, 1, 0); col.push(c.r, c.g, c.b); }
        idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); // CCW from above
      };
      const walk = new THREE.Color(0x93908a);   // concrete sidewalks
      const walk2 = new THREE.Color(0x89867f);
      // Height layering is what keeps the streets reading correctly: sidewalks
      // sit BELOW the asphalt, so wherever a sidewalk strip crosses another
      // street's roadway (at every intersection) the asphalt covers it — the
      // curb ends at the corner instead of concrete paving over the road.
      const Y_WALK = 0.14, Y_ROAD = 0.20, Y_DASH = 0.26;
      for (const r of this.zone.roads) {
        for (let i = 1; i < r.p.length; i++) {
          const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
          const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
          if (L < 0.01) continue;
          const ux = dx / L, uz = dz / L;
          // sidewalks first (lowest)
          const off = r.w / 2 + 1.9, sw = 3.8;
          const wc = (i % 2) ? walk : walk2;
          quad(ax - uz * off, az + ux * off, bx - uz * off, bz + ux * off, sw, Y_WALK, wc);
          quad(ax + uz * off, az - ux * off, bx + uz * off, bz - ux * off, sw, Y_WALK, wc);
          // asphalt on top (covers sidewalks where roads cross)
          quad(ax, az, bx, bz, r.w, Y_ROAD, asphalt);
          // lane dashes on top of the asphalt
          for (let s = 0; s + 2.5 < L; s += 7)
            quad(ax + ux * s, az + uz * s, ax + ux * (s + 2.5), az + uz * (s + 2.5),
                 0.3, Y_DASH, dashCol);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      const roads = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
        vertexColors: true, side: THREE.DoubleSide }));
      roads.receiveShadow = true;
      this.group.add(roads);
    }

    _buildAnchors() {
      this.anchors = [];
      const add = (a) => { this.anchors.push(a); this._insert(this.anchorGrid, a.x, a.z, a); };
      for (const a of this._treeAnchors || []) add(a);
      for (const b of this.buildings) {
        if (b.h < 18) continue;
        const step = Math.max(1, Math.floor(b.poly.length / 10));
        const [cx, cz] = centroidOf(b.poly);
        for (let i = 0; i < b.poly.length; i += step) {
          const [x, z] = b.poly[i];
          const dx = cx - x, dz = cz - z;
          const d = Math.hypot(dx, dz) || 1;
          add({ x: x + dx / d * 0.5, y: b.parapetTop || b.h, z: z + dz / d * 0.5 });
        }
      }
      if (this._towerAnchors) for (const a of this._towerAnchors) add(a);
    }

    _collectPerches() {
      let seed = 3;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      // rooftop parapet spots on mid-rise buildings
      for (const b of this.buildings) {
        if (b.h < 10 || b.h > 70 || b.hash % 4 !== 0) continue;
        const [cx, cz] = centroidOf(b.poly);
        if (!pointInPoly(cx, cz, b.poly)) continue;
        this.perches.push({ x: cx, y: b.h, z: cz });
      }
      // street spots along roads
      for (const r of this.zone.roads) {
        if (rnd() < 0.75 || r.p.length < 2) continue;
        const [ax, az] = r.p[0], [bx, bz] = r.p[Math.floor(r.p.length / 2)];
        this.perches.push({ x: (ax + bx) / 2, y: 0, z: (az + bz) / 2 });
      }
    }

    // ---- simple seamless tiling: ghost copies of the whole city in a 3x3
    // ring. Clones share geometry/materials, skip shadows, and freeze their
    // matrices, so the cost is frustum-culled draw calls only. The player
    // wraps at the half-gap, where both sides look identical. ----
    buildTiling() {
      if (this.ghostGroup) return this.ghostGroup;
      const gap = 80;   // reads as a narrow river between repeats
      const px = this.bounds.maxX - this.bounds.minX + gap;
      const pz = this.bounds.maxZ - this.bounds.minZ + gap;
      this.tile = { period: { x: px, z: pz },
                    center: { x: (this.bounds.minX + this.bounds.maxX) / 2,
                              z: (this.bounds.minZ + this.bounds.maxZ) / 2 } };
      this.ghostGroup = new THREE.Group();
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        const g = this.group.clone();
        g.position.set(i * px, 0, j * pz);
        this.ghostGroup.add(g);
      }
      this.ghostGroup.traverse(o => {
        o.castShadow = false; o.receiveShadow = false;
        // Compose each local matrix from position/rotation NOW. The clones are
        // made before the source group has ever rendered, so the copied
        // .matrix can still be identity — freezing that turned the rotated
        // ground plane into a giant vertical wall at every tile offset.
        o.updateMatrix();
        o.matrixAutoUpdate = false;
      });
      this.ghostGroup.updateMatrixWorld(true);
      // collect ghost meshes with world-space bounding spheres so the main
      // loop can distance-cull them: fog hides everything past fogFar, but
      // the frustum alone still DREW whole neighbor cities (2000+ calls)
      this.ghostChunks = [];
      this.ghostGroup.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const bs = o.geometry.boundingSphere;
        if (!bs) return;
        const c = bs.center.clone().applyMatrix4(o.matrixWorld);
        this.ghostChunks.push({ m: o, x: c.x, z: c.z, r: bs.radius });
      });
      return this.ghostGroup;
    }

    // hide ghost chunks fully beyond the fog — call cheaply from the loop
    cullGhosts(cx, cz, maxD) {
      if (!this.ghostChunks) return;
      for (const g of this.ghostChunks) {
        const d = Math.hypot(g.x - cx, g.z - cz) - g.r;
        g.m.visible = d < maxD;
      }
    }

    buildingsNear(x, z) {
      const cx = Math.floor(x / GRID), cz = Math.floor(z / GRID);
      const out = [];
      // a building spanning several cells lands in each of them — dedupe so
      // collision/props aren't evaluated 2-4x per frame for the same building
      const seen = this._nearSeen || (this._nearSeen = new Set());
      seen.clear();
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
          const a = this.grid.get(this._key(cx + i, cz + j));
          if (a) for (const b of a) { if (!seen.has(b)) { seen.add(b); out.push(b); } }
        }
      return out;
    }

    supportHeight(x, z, y) {
      let h = 0;
      for (const b of this.buildingsNear(x, z)) {
        if (x < b.bx0 - 2 || x > b.bx1 + 2 || z < b.bz0 - 2 || z > b.bz1 + 2) continue;
        const inside = pointInPoly(x, z, b.poly);
        if (b.h > h && b.h <= y + 0.9 && inside) h = b.h;
        // Parapet crown: a walkable / perchable ledge lip around the roof. The
        // signed edge distance s is + inside the roof, − out on the cornice;
        // the ~1m-wide crown ring both walks and perches.
        if (b.parapetTop && b.parapetTop <= y + 1.25) {
          const e = nearestEdgePoint(x, z, b.poly);
          const s = inside ? e.dist : -e.dist;
          if (s >= -(b.parapetProj + 0.15) && s <= 1.1 && b.parapetTop > h)
            h = b.parapetTop;
        }
        // stand on top of solid rooftop props (water towers / antennas / AC)
        if (b.props) for (const p of b.props) {
          const dx = x - p.x, dz = z - p.z;
          const dd = dx * dx + dz * dz;
          if (dd > p.r * p.r) continue;
          // conical roof → support slopes from apex down to the rim, but a
          // small flat cap (flatR) sits level on the peak so you don't slide
          const d = Math.sqrt(dd);
          const top = p.coneH
            ? p.top - Math.max(0, d - (p.flatR || 0)) / p.r * p.coneH
            : p.top;
          if (top > h && top <= y + 0.9) h = top;
        }
      }
      return h;
    }

    // distance to the nearest edge of the roof the player stands on (∞ if none)
    ledgeDist(x, z, y) {
      for (const b of this.buildingsNear(x, z)) {
        if (Math.abs(b.h - y) < 1.2 &&
            x >= b.bx0 && x <= b.bx1 && z >= b.bz0 && z <= b.bz1 &&
            pointInPoly(x, z, b.poly))
          return nearestEdgePoint(x, z, b.poly).dist;
      }
      return Infinity;
    }

    isSolid(x, y, z) {
      for (const b of this.buildingsNear(x, z)) {
        if (y < b.h && x >= b.bx0 && x <= b.bx1 && z >= b.bz0 && z <= b.bz1 &&
            pointInPoly(x, z, b.poly)) return true;
      }
      return false;
    }

    // contact (optional out-param): filled with {hit, nx, nz, b} on wall touch
    resolveCollision(pos, prevY, vel, radius, contact) {
      if (contact) contact.hit = false;
      for (const b of this.buildingsNear(pos.x, pos.z)) {
        if (pos.x < b.bx0 - radius || pos.x > b.bx1 + radius ||
            pos.z < b.bz0 - radius || pos.z > b.bz1 + radius) continue;
        const inside = pointInPoly(pos.x, pos.z, b.poly);
        if (inside) {
          if (prevY >= b.h - 0.05) {
            if (pos.y < b.h) { pos.y = b.h; if (vel.y < 0) vel.y = 0; }
          } else if (pos.y < b.h - 0.05) {
            const e = nearestEdgePoint(pos.x, pos.z, b.poly);
            const dx = e.x - pos.x, dz = e.z - pos.z;
            const d = Math.hypot(dx, dz) || 1;
            const nx = dx / d, nz = dz / d;   // outward (we exit through this edge)
            pos.x = e.x + nx * radius; pos.z = e.z + nz * radius;
            const vn = vel.x * nx + vel.z * nz;
            if (vn > 0) { vel.x -= nx * vn * 1.1; vel.z -= nz * vn * 1.1; }
            if (contact) { contact.hit = true; contact.nx = nx; contact.nz = nz; contact.b = b; }
          }
        } else if (pos.y < b.h - 0.05) {
          const e = nearestEdgePoint(pos.x, pos.z, b.poly);
          if (e.dist < radius) {
            const dx = pos.x - e.x, dz = pos.z - e.z;
            const d = Math.hypot(dx, dz) || 1;
            const nx = dx / d, nz = dz / d;
            pos.x = e.x + nx * radius; pos.z = e.z + nz * radius;
            const vn = vel.x * nx + vel.z * nz;
            if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
            if (contact) { contact.hit = true; contact.nx = nx; contact.nz = nz; contact.b = b; }
          }
        }
        // solid rooftop props (water towers / antennas): land on top, block sides
        if (b.props) for (const p of b.props) {
          const dx = pos.x - p.x, dz = pos.z - p.z;
          const rr = p.r + radius;
          const dd = dx * dx + dz * dz;
          if (dd > rr * rr) continue;
          const d = Math.sqrt(dd);
          // surface height here (conical roofs slope down to the rim, but a
          // small flat cap on the peak keeps you from sliding off)
          const surf = p.coneH
            ? p.top - Math.min(1, Math.max(0, d - (p.flatR || 0)) / p.r) * p.coneH
            : p.top;
          // sides only block below the solid body (under a cone that's the rim)
          const solidTop = p.coneH ? p.top - p.coneH : p.top;
          if (prevY >= surf - 0.06) {                  // descending onto it
            if (pos.y < surf) { pos.y = surf; if (vel.y < 0) vel.y = 0; }
          } else if (pos.y < solidTop - 0.05) {        // against the side → push out
            const dn = d || 1;
            const nx = dx / dn, nz = dz / dn;
            pos.x = p.x + nx * rr; pos.z = p.z + nz * rr;
            const vn = vel.x * nx + vel.z * nz;
            if (vn < 0) { vel.x -= nx * vn; vel.z -= nz * vn; }
          }
        }
      }
      if (pos.y < 0) { pos.y = 0; if (vel.y < 0) vel.y = 0; }
      return this.supportHeight(pos.x, pos.z, pos.y);
    }

    // re-stick a crawler to its wall; returns updated outward normal or null
    stickToWall(pos, b, radius) {
      const e = nearestEdgePoint(pos.x, pos.z, b.poly);
      let dx = pos.x - e.x, dz = pos.z - e.z;
      let d = Math.hypot(dx, dz);
      if (d < 0.01) {
        // exactly on the edge or inside — push outward via edge normal guess
        dx = pos.x - (b.bx0 + b.bx1) / 2; dz = pos.z - (b.bz0 + b.bz1) / 2;
        d = Math.hypot(dx, dz) || 1;
      }
      const inside = pointInPoly(pos.x, pos.z, b.poly);
      let nx = dx / d, nz = dz / d;
      if (inside) { nx = -nx; nz = -nz; }
      pos.x = e.x + nx * radius; pos.z = e.z + nz * radius;
      return { nx, nz };
    }

    findAutoAnchor(pos, fwd) {
      const P = GAME.PHYS;
      const cx = Math.floor(pos.x / GRID), cz = Math.floor(pos.z / GRID);
      const R = Math.ceil(P.autoRange / GRID);
      const fl = Math.hypot(fwd.x, fwd.z) || 1;
      const fx = fwd.x / fl, fz = fwd.z / fl;
      let best = null, bestScore = -1e9, bestAny = null, bestAnyScore = -1e9;
      for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
        const cell = this.anchorGrid.get(this._key(cx + i, cz + j));
        if (!cell) continue;
        for (const a of cell) {
          const dy = a.y - pos.y;
          if (dy < P.autoMinUp) continue;
          const dx = a.x - pos.x, dz = a.z - pos.z;
          const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);
          if (dist < 9 || dist > P.autoRange) continue;
          const hl = Math.hypot(dx, dz) || 1;
          const dot = (dx / hl) * fx + (dz / hl) * fz;
          const score = dot * 1.7 + (dy / dist) * 1.1 - (dist / P.autoRange) * 0.6
                      + Math.min(a.y, 120) / 120 * 0.25;
          if (score > bestAnyScore) { bestAnyScore = score; bestAny = a; }
          if (dot > 0.1 && score > bestScore) { bestScore = score; best = a; }
        }
      }
      return best || bestAny;
    }

    findSpawn() {
      // stand well inside a real roof face — L-shaped footprints have bbox
      // centers hanging over the notch
      let best = null, bd = 1e9;
      for (const b of this.buildings) {
        if (b.h < 35 || b.h > 90 || b.hasTower) continue;
        const [cx, cz] = centroidOf(b.poly);
        if (!pointInPoly(cx, cz, b.poly)) continue;
        const e = nearestEdgePoint(cx, cz, b.poly);
        if (e.dist < 5) continue;
        const d = cx * cx + cz * cz;
        if (d < bd) { bd = d; best = { x: cx, y: b.h, z: cz }; }
      }
      if (!best) return new THREE.Vector3(0, 2, 0);
      return new THREE.Vector3(best.x, best.y + 0.1, best.z);
    }

    dispose() {
      this.group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
      });
    }
  }

  // merge simple non-indexed-compatible geos (positions/normals/colors)
  function mergeGeos(geos) {
    const pos = [], nrm = [], col = [], idx = [];
    for (const g of geos) {
      const gi = g.index, gp = g.attributes.position, gn = g.attributes.normal,
            gc = g.attributes.color;
      const base = pos.length / 3;
      for (let i = 0; i < gp.count; i++) {
        pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
        nrm.push(gn.getX(i), gn.getY(i), gn.getZ(i));
        col.push(gc.getX(i), gc.getY(i), gc.getZ(i));
      }
      if (gi) for (let i = 0; i < gi.count; i++) idx.push(base + gi.getX(i));
      else for (let i = 0; i < gp.count; i++) idx.push(base + i);
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setIndex(idx);
    return out;
  }
  function withColor(geo, color) {
    const cnt = geo.attributes.position.count;
    const cols = new Float32Array(cnt * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < cnt; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }

  GAME.City = City;
})();
