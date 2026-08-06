// Traffic: instanced NYC cabs + cars driving the real street network.
// Headlights/taillights fade in with the sunset preset.
(function () {

  function boxGeo(w, h, d, x, y, z, r, g, b) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y, z);
    const cnt = geo.attributes.position.count;
    const cols = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) { cols[i * 3] = r; cols[i * 3 + 1] = g; cols[i * 3 + 2] = b; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }

  function merge(geos) {
    const pos = [], nrm = [], col = [], idx = [];
    for (const g of geos) {
      const base = pos.length / 3;
      const gp = g.attributes.position, gn = g.attributes.normal, gc = g.attributes.color;
      for (let i = 0; i < gp.count; i++) {
        pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
        nrm.push(gn.getX(i), gn.getY(i), gn.getZ(i));
        col.push(gc.getX(i), gc.getY(i), gc.getZ(i));
      }
      const gi = g.index;
      for (let i = 0; i < gi.count; i++) idx.push(base + gi.getX(i));
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setIndex(idx);
    return out;
  }

  function carBody(withSign) {
    const parts = [
      boxGeo(1.85, 0.52, 4.3, 0, 0.62, 0, 1, 1, 1),          // body (instance-tinted)
      boxGeo(1.6, 0.44, 2.1, 0, 1.06, -0.15, 0.16, 0.2, 0.26), // glass cabin
      boxGeo(1.62, 0.1, 2.2, 0, 1.3, -0.15, 1, 1, 1),        // roof
      boxGeo(0.26, 0.5, 0.55, 0.82, 0.3, 1.45, 0.08, 0.08, 0.09),
      boxGeo(0.26, 0.5, 0.55, -0.82, 0.3, 1.45, 0.08, 0.08, 0.09),
      boxGeo(0.26, 0.5, 0.55, 0.82, 0.3, -1.45, 0.08, 0.08, 0.09),
      boxGeo(0.26, 0.5, 0.55, -0.82, 0.3, -1.45, 0.08, 0.08, 0.09),
    ];
    if (withSign) parts.push(boxGeo(0.72, 0.2, 0.34, 0, 1.45, -0.15, 1, 1, 1));
    return merge(parts);
  }

  function lightGeo() {
    return merge([
      boxGeo(0.3, 0.12, 0.08, 0.6, 0.62, 2.16, 1.0, 0.97, 0.82),   // headlights
      boxGeo(0.3, 0.12, 0.08, -0.6, 0.62, 2.16, 1.0, 0.97, 0.82),
      boxGeo(0.28, 0.11, 0.08, 0.6, 0.62, -2.16, 1.0, 0.1, 0.08),  // taillights
      boxGeo(0.28, 0.11, 0.08, -0.6, 0.62, -2.16, 1.0, 0.1, 0.08),
    ]);
  }

  const CAR_COLORS = [0x2a2c30, 0x83858a, 0xd8d8d8, 0x5a2020, 0x1d2c48, 0x3a4a3c, 0x101114];

  class Traffic {
    constructor(city) {
      this.city = city;
      this.group = new THREE.Group();
      // low-power devices run a thinner traffic pool (instanced, but each car
      // still costs a matrix update + a lane-follow step every frame)
      const T = Object.assign({}, GAME.TRAFFIC);
      T.count = Math.max(40, Math.round(T.count * (GAME.GFX.trafficScale || 1)));

      // roads inside Central Park carry no traffic — the park belongs to
      // joggers, not cabs
      const park = (city.zone.parks || []).find(k => k.n === 'Central Park');
      const inPark = (x, z) => {
        if (!park) return false;
        let c = false; const poly = park.p;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
          if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
        }
        return c;
      };

      // road arc-length tables
      this.roads = [];
      for (const r of city.zone.roads) {
        if (r.p.some(([x, z]) => inPark(x, z))) continue;
        const segs = [], cum = [0];
        let L = 0;
        for (let i = 1; i < r.p.length; i++) {
          const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
          const l = Math.hypot(bx - ax, bz - az);
          segs.push({ ax, az, bx, bz, l });
          L += l; cum.push(L);
        }
        if (L > 30) this.roads.push({ segs, cum, L, w: r.w, oneway: r.o === 1 });
      }
      if (!this.roads.length) return;

      const nCabs = Math.round(T.count * T.cabRatio);
      const nCars = T.count - nCabs;
      this.cabIM = new THREE.InstancedMesh(carBody(true),
        new THREE.MeshLambertMaterial({ vertexColors: true }), nCabs);
      this.carIM = new THREE.InstancedMesh(carBody(false),
        new THREE.MeshLambertMaterial({ vertexColors: true }), nCars);
      this.lightMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x000000 });
      this.cabLights = new THREE.InstancedMesh(lightGeo(), this.lightMat, nCabs);
      this.carLights = new THREE.InstancedMesh(lightGeo(), this.lightMat, nCars);
      // share matrix buffers so we compose once per vehicle
      this.cabLights.instanceMatrix = this.cabIM.instanceMatrix;
      this.carLights.instanceMatrix = this.carIM.instanceMatrix;
      for (const im of [this.cabIM, this.carIM]) { im.castShadow = true; }
      this.group.add(this.cabIM, this.carIM, this.cabLights, this.carLights);

      let seed = 99;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      this.cars = [];
      const cabYellow = new THREE.Color(0xf2b21c);
      for (let i = 0; i < T.count; i++) {
        const isCab = i < nCabs;
        const road = this.roads[(rnd() * this.roads.length) | 0];
        const car = {
          road, s: rnd() * road.L,
          dir: road.oneway ? 1 : (rnd() < 0.5 ? 1 : -1),
          speed: T.minSpeed + rnd() * (T.maxSpeed - T.minSpeed),
          im: isCab ? this.cabIM : this.carIM,
          idx: isCab ? i : i - nCabs,
        };
        this.cars.push(car);
        const c = isCab
          ? cabYellow.clone().multiplyScalar(0.9 + rnd() * 0.25)
          : new THREE.Color(CAR_COLORS[(rnd() * CAR_COLORS.length) | 0]);
        car.im.setColorAt(car.idx, c);
      }
      this.cabIM.instanceColor.needsUpdate = true;
      this.carIM.instanceColor.needsUpdate = true;

      this._m = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._p = new THREE.Vector3();
      this._sc = new THREE.Vector3(1, 1, 1);
      this._rnd = rnd;
    }

    update(dt, rig) {
      if (!this.roads.length) return;
      // headlights fade with sunset
      const hl = rig ? rig.headlights : 0;
      this.lightMat.color.setScalar(0.12 + 0.88 * hl);

      for (const car of this.cars) {
        car.s += car.speed * car.dir * dt;
        if (car.s > car.road.L || car.s < 0) {
          car.road = this.roads[(this._rnd() * this.roads.length) | 0];
          car.dir = car.road.oneway ? 1 : (this._rnd() < 0.5 ? 1 : -1);
          car.s = car.dir === 1 ? 0.01 : car.road.L - 0.01;
        }
        // locate segment
        const { segs, cum } = car.road;
        let lo = 0, hi = segs.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid + 1] < car.s) lo = mid + 1; else hi = mid;
        }
        const seg = segs[lo];
        const t = Math.min(1, Math.max(0, (car.s - cum[lo]) / seg.l));
        const dx = (seg.bx - seg.ax) / seg.l * car.dir;
        const dz = (seg.bz - seg.az) / seg.l * car.dir;
        // right-hand lane offset
        const lane = car.road.w * 0.22;
        const px = seg.ax + (seg.bx - seg.ax) * t - dz * lane;
        const pz = seg.az + (seg.bz - seg.az) * t + dx * lane;
        this._p.set(px, 0.22, pz);
        this._q.setFromAxisAngle(UP, Math.atan2(dx, dz));
        this._m.compose(this._p, this._q, this._sc);
        car.im.setMatrixAt(car.idx, this._m);
      }
      this.cabIM.instanceMatrix.needsUpdate = true;
      this.carIM.instanceMatrix.needsUpdate = true;
    }

    dispose() {
      this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
  }
  const UP = new THREE.Vector3(0, 1, 0);

  GAME.Traffic = Traffic;
})();
