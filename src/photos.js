// Photo challenges — Peter's day job. In photo mode, ENTER (or click) snaps a
// shot; if an assignment's target is framed, close enough, and at the right
// time of day, the Bugle "accepts" it. Progress persists in localStorage.
(function () {
  const KEY = 'spidey.photos.v1';

  class PhotoChallenges {
    constructor(landmarks, city) {
      const egg = (id) => (landmarks.eggs || []).find(e => e.id === id);
      const mk = (id, label, x, y, z, maxD, time, minCamY) =>
        ({ id, label, x, y, z, maxD, time: time || null, minCamY: minCamY || 0 });
      this.list = [];
      const bugle = egg('bugle');
      if (bugle) this.list.push(mk('ph-bugle', 'Front page: the Bugle sign', bugle.x, 62, bugle.z, 90));
      const ts = egg('timessq');
      if (ts) this.list.push(mk('ph-timessq', 'Times Square neon at night', ts.x, 22, ts.z, 130, 'night'));
      const sanc = egg('sanctum');
      if (sanc) this.list.push(mk('ph-sanctum', 'The Sanctum at sunset', sanc.x, 10, sanc.z, 70, 'sunset'));
      const fisk = egg('fisk');
      if (fisk) {
        const y = landmarks._fiskBeacon ? landmarks._fiskBeacon.position.y - 12 : 160;
        this.list.push(mk('ph-fisk', "Kingpin's penthouse light", fisk.x, y, fisk.z, 110));
      }
      const school = egg('midtownhigh');
      if (school) this.list.push(mk('ph-school', 'Midtown High, yearbook shot', school.x, 7, school.z, 60));
      // Central Park panorama from altitude
      const park = (city.zone.parks || []).find(k => k.n === 'Central Park');
      if (park) {
        let cx = 0, cz = 0;
        for (const p of park.p) { cx += p[0] / park.p.length; cz += p[1] / park.p.length; }
        this.list.push(mk('ph-park', 'Central Park from the clouds', cx, 5, cz, 2600, 'day', 150));
      }
      const stan = egg('stanlee');
      if (stan) this.list.push(mk('ph-stan', 'Portrait of a familiar face', stan.x, 1.4, stan.z, 16));

      let saved = [];
      try { saved = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}
      this.done = new Set(saved);
      this._v = new THREE.Vector3();
    }

    _timeNow(rig) {
      if (rig.n > 0.6) return 'night';
      if (rig.t > 0.6) return 'sunset';
      if (rig.n < 0.4 && rig.t < 0.4) return 'day';
      return 'between';
    }

    nextHint() {
      const open = this.list.filter(c => !this.done.has(c.id));
      if (!open.length) return 'All assignments filed! (' + this.list.length + '/' + this.list.length + ')';
      const c = open[0];
      return 'Assignment ' + (this.list.length - open.length + 1) + '/' + this.list.length +
             ': ' + c.label + (c.time ? ' · ' + c.time : '');
    }

    // called on ENTER in photo mode; returns a result string for the toast
    snap(camera, rig) {
      camera.updateMatrixWorld();
      const now = this._timeNow(rig);
      let best = null;
      for (const c of this.list) {
        if (this.done.has(c.id)) continue;
        this._v.set(c.x, c.y, c.z);
        const d = this._v.distanceTo(camera.position);
        if (d > c.maxD) continue;
        if (c.minCamY && camera.position.y < c.minCamY) continue;
        if (c.time && now !== c.time) continue;
        const p = this._v.project(camera);          // NDC
        if (p.z > 1 || Math.abs(p.x) > 0.75 || Math.abs(p.y) > 0.75) continue;
        best = c; break;
      }
      if (best) {
        this.done.add(best.id);
        try { localStorage.setItem(KEY, JSON.stringify([...this.done])); } catch (e) {}
        if (GAME.districts) GAME.districts.dirty = true;
        return 'FRONT PAGE! ' + best.label + '  (' + this.done.size + '/' + this.list.length + ')';
      }
      return null;   // plain snapshot, no assignment matched
    }
  }

  GAME.PhotoChallenges = PhotoChallenges;
})();
