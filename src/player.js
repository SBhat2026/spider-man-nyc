// Player controller: run / jump / pendulum web-swinging with rope constraint.
// Webs always auto-target the best anchor ahead of you; the mouse only aims the camera.
(function () {
  const V3 = THREE.Vector3;

  class Player {
    constructor(city, hero) {
      this.city = city;
      this.hero = hero;
      this.pos = city.findSpawn();
      this.vel = new V3();
      this.mode = 'ground';        // ground | air | swing
      this.anchor = null;
      this.ropeLen = 0;
      this.yaw = 0;
      this.keys = { w: 0, a: 0, s: 0, d: 0, space: 0 };
      this.justLanded = false;
      this._prevSpace = 0;
      this._airTime = 0;
      this._support = this.pos.y;
      this.wall = null;            // {b, nx, nz} while crawling
      this._crawlCooldown = 0;
      this._contact = { hit: false };
      this._raycaster = new THREE.Raycaster();
      this._tmp = new V3(); this._tmp2 = new V3();
      GAME.player = this;
    }

    respawn() {
      this.pos.copy(this.city.findSpawn());
      this.vel.set(0, 0, 0);
      this.mode = 'ground';
      this.anchor = null;
      this.wall = null;
    }

    setCity(city) {
      this.city = city;
      this.respawn();
    }

    // try to attach a web; returns true on success
    _attach(camera, camFwd) {
      const P = GAME.PHYS;
      let a = null;
      const found = this.city.findAutoAnchor(this.pos, camFwd);
      if (found) a = new V3(found.x, found.y, found.z);
      if (!a) return false;
      this.anchor = a;
      this.ropeLen = Math.max(P.ropeMin, this.pos.distanceTo(a) * P.ropeSlack);
      this.ropeLen0 = this.ropeLen;
      this.mode = 'swing';
      // alternate web arms like the films — reach animation on every attach
      this._armSide = this._armSide === 'R' ? 'L' : 'R';
      this.hero.setSwingArm(this._armSide);
      // Auto-pick the swing signature from arc + speed, biased by where you're
      // looking: look down → cannonball tuck · look up → McFarlane arch ·
      // long lazy rope → straddle · reach otherwise.
      const spd = this.vel.length();
      const pitch = Math.asin(Math.max(-1, Math.min(1, camFwd.y)));
      let style = 0;
      if (pitch < -0.42 && spd > 15) style = 2;             // diving look → tuck
      else if (pitch > 0.28 && spd > 20) style = 3;         // looking up → arch
      else if (spd > 32 && this.ropeLen > 30) style = 3;
      else if (spd > 26) style = 2;
      else if (this.ropeLen > 46 && spd < 17) style = 1;
      this.hero.onAttach(style);
      return true;
    }

    _release() {
      const P = GAME.PHYS;
      this.anchor = null;
      this.mode = 'air';
      this.vel.multiplyScalar(P.releaseBoost);
      // SWEET-SPOT: let go on the rising arc (the top third of the pendulum)
      // and the launch is cleaner — a nudge of speed and a camera kick that
      // teaches the rhythm without any UI
      if (this.vel.y > 3.5 && this.vel.y < 13 && this.vel.length() > 15) {
        this.vel.multiplyScalar(1.06);
        if (GAME.camFx) GAME.camFx.pulse = 1;
      }
      if (this.vel.y > 2) {
        const M = (GAME.SKINS[GAME.settings.skin] || {}).mods || {};
        this.vel.y += P.releaseUp * (M.release || 1);
        // Auto-tricks only on STRONG launches, and never back-to-back — every
        // release flipping read as chaos. F/Q still trick on demand anytime.
        if (this.vel.y > 5.5 && this.vel.length() > 20 && (this._flipCd || 0) <= 0) {
          this._trick = ((this._trick || 0) + 1) % 3;
          this.hero.triggerFlip(this._trick);
          this._flipCd = 3.0;
        }
      }
    }

    // F / Q tricks: flip in the air, or launch off the web with a flip
    doTrick(type) {
      const P = GAME.PHYS;
      if (this.mode === 'swing') {
        this.anchor = null;
        this.mode = 'air';
        this.vel.multiplyScalar(P.releaseBoost);
        this.vel.y += 3.8;           // pop up so the flip has air time
        this._airTime = 0;
        this.hero.triggerFlip(type);
      } else if (this.mode === 'air') {
        this.hero.triggerFlip(type);
      }
    }

    // rotate horizontal velocity toward the camera heading (arcade steer assist)
    _alignToCamera(fwd, maxTurn) {
      const hv = Math.hypot(this.vel.x, this.vel.z);
      if (hv < 4) return;
      const cur = Math.atan2(this.vel.x, this.vel.z);
      const want = Math.atan2(fwd.x, fwd.z);
      let d = want - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const turn = Math.max(-maxTurn, Math.min(maxTurn, d));
      const cos = Math.cos(turn), sin = Math.sin(turn);
      const vx = this.vel.x * cos + this.vel.z * sin;
      const vz = this.vel.z * cos - this.vel.x * sin;
      this.vel.x = vx; this.vel.z = vz;
    }

    // quadratic air drag — real terminal velocity emerges from this
    _drag(dt) {
      const P = GAME.PHYS;
      const kd = P.gravity / (P.termVel * P.termVel);
      const sp = this.vel.length();
      if (sp > 1) this.vel.addScaledVector(this.vel, -kd * sp * dt);
    }

    update(dt, camera, camFwd) {
      const P = GAME.PHYS, k = this.keys;
      this.justLanded = false;
      this._flipCd = (this._flipCd || 0) - dt;
      const spacePressed = k.space && !this._prevSpace;
      const prevY = this.pos.y;

      // Where you look drives the animation: pitch tucks him into a dive or
      // opens him up, and look-vs-travel yaw leans the torso and turns the head.
      this.lookPitch = Math.asin(Math.max(-1, Math.min(1, camFwd.y)));
      const hv = Math.hypot(this.vel.x, this.vel.z);
      if (hv > 3) {
        let d = Math.atan2(camFwd.x, camFwd.z) - Math.atan2(this.vel.x, this.vel.z);
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.lookYawRel = d;
      } else this.lookYawRel = 0;

      // camera-relative move axes (horizontal)
      const fwd = this._tmp.set(camFwd.x, 0, camFwd.z).normalize();
      const right = this._tmp2.set(-fwd.z, 0, fwd.x);
      const ix = (k.d - k.a), iz = (k.w - k.s);

      if (this.mode === 'swing' && this.anchor) {
        // --- real pendulum on a slightly elastic web ---
        this.vel.y -= P.gravity * dt;
        this._drag(dt);
        // pumping = reeling rope in/out (raises/lowers center of mass, like a
        // real swing); A/D = lateral body english
        if (iz > 0) this.ropeLen = Math.max(P.ropeMin, this.ropeLen - P.reelIn * dt);
        else if (iz < 0)
          this.ropeLen = Math.min(this.ropeLen0 * 1.2, this.ropeLen + P.reelOut * dt);
        const hs = Math.hypot(this.vel.x, this.vel.z);
        const steer = hs > 0.5
          ? new V3(-this.vel.z, 0, this.vel.x).multiplyScalar(1 / hs)
          : right;
        const M = (GAME.SKINS[GAME.settings.skin] || {}).mods || {};
        this.vel.addScaledVector(steer, ix * P.steerAccel * (M.steer || 1) * dt);
        // not physically pure, but iconic: the swing tracks where you look,
        // so you can thread a straight line down an avenue
        if (!ix) this._alignToCamera(fwd, P.swingAssist * (M.assist || 1) * dt);

        // stiff spring + damping along the rope while taut
        const d = new V3().subVectors(this.pos, this.anchor);
        const dist = d.length() || 1;
        const n = d.multiplyScalar(1 / dist);
        if (dist > this.ropeLen) {
          const stretch = dist - this.ropeLen;
          const relVel = this.vel.dot(n);
          const accel = P.ropeSpring * stretch + P.ropeDamp * Math.max(0, relVel);
          this.vel.addScaledVector(n, -accel * dt);
        }
        this.pos.addScaledVector(this.vel, dt);
        // hard cap on stretch so extreme frames can't snap through geometry
        const d2 = new V3().subVectors(this.pos, this.anchor);
        const dist2 = d2.length() || 1;
        if (dist2 > this.ropeLen * 1.06) {
          d2.multiplyScalar(1 / dist2);
          this.pos.copy(this.anchor).addScaledVector(d2, this.ropeLen * 1.06);
          const vr = this.vel.dot(d2);
          if (vr > 0) this.vel.addScaledVector(d2, -vr);
        }
        if (!k.space) this._release();
      } else if (this.mode === 'air') {
        this._airTime += dt;
        // WEB WINGS (Stark): hold K while falling — the underarm membranes
        // deploy, the sink rate flattens to a glide and the wings drive him
        // forward along the camera line.
        this.gliding = !!(k.k && GAME.settings.skin === 'classic' &&
                          this._airTime > 0.2 && this.vel.y < 2);
        if (this.gliding) {
          if (this.vel.y < -3) this.vel.y += (-3 - this.vel.y) * Math.min(1, dt * 3.5);
          else this.vel.y -= P.gravity * 0.32 * dt;
          const hs2 = Math.hypot(this.vel.x, this.vel.z);
          if (hs2 < 34) this.vel.addScaledVector(fwd, 10 * dt);
          this._alignToCamera(fwd, P.swingAssist * 1.1 * dt);
        } else {
          // apex hang-time: gravity eases off for a beat at the top of the arc
          const apexK = Math.abs(this.vel.y) < 3.2 ? 0.72 : 1;
          this.vel.y -= P.gravity * apexK * dt;
          this._drag(dt);
          this.vel.addScaledVector(fwd, iz * P.airControl * dt);
          this.vel.addScaledVector(right, ix * P.airControl * dt);
          if (!ix) this._alignToCamera(fwd, P.swingAssist * 0.55 * dt);
        }
        this.pos.addScaledVector(this.vel, dt);
        if (k.space && this._airTime > 0.14) this._attach(camera, camFwd);
      } else if (this.mode === 'wallrun' && this.wall) {
        // --- WALL-RUN: sprinting horizontally along the facade. Momentum
        // carries him, bleeding off until he either bounces (SPACE), slows to
        // a crawl-stick, or runs out of wall. ---
        const n = this.wall;
        this._wrT += dt;
        this._wrSpd = Math.max(0, this._wrSpd - 4.5 * dt);
        this.vel.set(this._wrDir.x * this._wrSpd,
                     this.vel.y - P.gravity * 0.2 * dt,
                     this._wrDir.z * this._wrSpd);
        this.vel.y *= (1 - Math.min(1, dt * 2));      // hug the horizontal line
        this.pos.addScaledVector(this.vel, dt);
        const stick = this.city.stickToWall(this.pos, n.b, P.playerRadius);
        if (stick) {
          n.nx = stick.nx; n.nz = stick.nz;
          // re-project the run direction onto the (possibly turned) wall
          const dn = this._wrDir.x * n.nx + this._wrDir.z * n.nz;
          let tx = this._wrDir.x - n.nx * dn, tz = this._wrDir.z - n.nz * dn;
          const tl = Math.hypot(tx, tz) || 1;
          this._wrDir.x = tx / tl; this._wrDir.z = tz / tl;
        }
        if (spacePressed) {                           // WALL BOUNCE
          const M = (GAME.SKINS[GAME.settings.skin] || {}).mods || {};
          this.vel.set(n.nx * P.wallJump * 1.5 + this._wrDir.x * this._wrSpd * 0.85,
                       P.jumpVel * 1.05 * (M.jump || 1),
                       n.nz * P.wallJump * 1.5 + this._wrDir.z * this._wrSpd * 0.85);
          this.mode = 'air'; this.wall = null;
          this._airTime = 0; this._crawlCooldown = 0.35;
          this.wallBounced = true;                    // combo hook
          if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.5);
        } else if (!stick || this.pos.y >= n.b.h - 0.1) {
          this.mode = 'air'; this.wall = null;        // ran off the wall
          this._airTime = 0.1;
        } else if (this._wrSpd < 5.5 || this._wrT > 1.7) {
          this.mode = 'crawl'; this.vel.set(0, 0, 0); // slowed → stick + crawl
        } else if (this.pos.y <= 0.5) {
          this.pos.y = 0;
          this.mode = 'ground'; this.wall = null; this.vel.set(0, 0, 0);
        }
      } else if (this.mode === 'crawl' && this.wall) {
        // --- wall crawl: stuck to the facade, WASD moves along it ---
        const n = this.wall;
        if (this.ledgeHang) {
          // LEDGE HANG: flipped over the parapet, hanging by the feet. Held
          // below the projecting cornice so the body dangles on the clear
          // window wall (feet reach up to grip the edge).
          this.vel.set(0, 0, 0);
          this.pos.y = n.b.h - 2.6;
          if (spacePressed) {                      // let go → drop into a dive
            this.ledgeHang = false;
            this.vel.set(n.nx * 2.5, -1.5, n.nz * 2.5);
            this.mode = 'air'; this.wall = null;
            this._airTime = 0; this._crawlCooldown = 0.4;
          } else if (k.w) {                         // pull back up onto the roof
            this.ledgeHang = false;
            this.pos.y = n.b.h;
            this.mode = 'ground'; this.wall = null; this.vel.set(0, 0, 0);
          } else if (k.c) {                         // climb back down the wall
            this.ledgeHang = false;
            this.pos.y = n.b.h - 2.2;
          }
        } else {
        // wall tangent chosen so D moves screen-right (camera sits off the
        // outward normal looking at the wall)
        const tx = n.nz, tz = -n.nx;
        const cs = P.crawlSpeed * (k.shift ? P.sprintMult : 1);
        this.vel.set(tx * ix * cs, iz * cs, tz * ix * cs);
        this.pos.addScaledVector(this.vel, dt);
        const stick = this.city.stickToWall(this.pos, n.b, P.playerRadius);
        if (stick) { n.nx = stick.nx; n.nz = stick.nz; }
        if (k.c && this.pos.y > n.b.h - 4.5) {     // C near the top → ledge hang
          this.ledgeHang = true; this.pos.y = n.b.h - 2.6;
          this.pos.x += n.nx * 0.8;                // clear the projecting cornice
          this.pos.z += n.nz * 0.8;
        } else if (this.pos.y >= n.b.h - 0.1) {    // vault onto the roof
          this.pos.y = n.b.h;
          this.mode = 'ground'; this.wall = null; this.vel.set(0, 0, 0);
        } else if (this.pos.y <= 0.3) {            // slid down to the street
          this.pos.y = 0;
          this.mode = 'ground'; this.wall = null; this.vel.set(0, 0, 0);
        } else if (spacePressed) {                 // leap off the wall
          this.vel.set(n.nx * P.wallJump, P.jumpVel * 0.9, n.nz * P.wallJump);
          this.mode = 'air'; this.wall = null;
          this._airTime = 0; this._crawlCooldown = 0.5;
        }
        }
      } else {
        // --- ground ---
        const tx = (fwd.x * iz + right.x * ix), tz = (fwd.z * iz + right.z * ix);
        const tl = Math.hypot(tx, tz);
        const spd = P.runSpeed;
        const runSpd = spd * (k.shift ? P.sprintMult : 1);
        const targx = tl ? tx / tl * runSpd : 0, targz = tl ? tz / tl * runSpd : 0;
        const ak = Math.min(1, P.runAccel * dt / spd);
        this.vel.x += (targx - this.vel.x) * Math.min(1, ak * 4);
        this.vel.z += (targz - this.vel.z) * Math.min(1, ak * 4);
        this.pos.addScaledVector(this.vel, dt);
        this.vel.y = 0;
        if (spacePressed) {
          const M = (GAME.SKINS[GAME.settings.skin] || {}).mods || {};
          this.vel.y = P.jumpVel * (M.jump || 1);
          this.pos.y += 0.05;
          this.mode = 'air';
          this._airTime = 0;
        }
      }

      // speed cap
      const sp = this.vel.length();
      if (sp > P.maxSpeed) this.vel.multiplyScalar(P.maxSpeed / sp);

      // collisions & support (capture fall speed before it gets zeroed)
      const fallSpeed = -Math.min(0, this.vel.y);
      this._crawlCooldown -= dt;
      let support = 0;
      if (this.mode !== 'crawl') {
        support = this.city.resolveCollision(this.pos, prevY, this.vel,
                                             P.playerRadius, this._contact);
        // touch a facade while airborne or mid-swing → stick and crawl
        if (this._contact.hit && this._crawlCooldown <= 0 &&
            (this.mode === 'air' || this.mode === 'swing') &&
            this.pos.y > 1 && this.pos.y < this._contact.b.h - 0.5) {
          const cn = this._contact;
          const vn = this.vel.x * cn.nx + this.vel.z * cn.nz;
          const tvx = this.vel.x - cn.nx * vn, tvz = this.vel.z - cn.nz * vn;
          const tspd = Math.hypot(tvx, tvz);
          if (tspd > 9) {
            // fast + skimming along the wall → WALL-RUN, keep the momentum
            this.mode = 'wallrun';
            this.wall = { b: cn.b, nx: cn.nx, nz: cn.nz };
            this.anchor = null;
            this._wrDir = { x: tvx / tspd, z: tvz / tspd };
            this._wrSpd = tspd; this._wrT = 0;
            this.vel.set(tvx, 0, tvz);
            if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.4);
          } else {
            this.mode = 'crawl';
            this.wall = { b: cn.b, nx: cn.nx, nz: cn.nz };
            this.anchor = null;
            this.vel.set(0, 0, 0);
          }
        }
      }
      // Amazing zip-lines act as a thin walkable beam: they raise the support
      // height when you're within ~0.7 m of the rope, so you can land on and
      // tightrope across them (and fall off if you stray).
      if (GAME.specials && this.mode !== 'crawl' && this.mode !== 'swing')
        support = GAME.specials.supportOnZip(this.pos, support);
      this._support = support;
      const onSurface = this.pos.y <= support + 0.05;

      // NOSE DIVE — the default state for any real fall: once you're dropping
      // and there's air below, he tips head-first until a web breaks it.
      // vel.y IS the fall tracker (integrated every frame, zeroed on landing).
      const wasDiving = this.diving;
      this.diving = this.mode === 'air' && this.vel.y < -7.5 &&
                    (this.pos.y - support) > 14;
      if (this.diving && !wasDiving && GAME.camFx)
        GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.45);

      if (this.mode !== 'swing' && this.mode !== 'crawl') {
        if (onSurface && this.vel.y <= 0.01) {
          if (this.mode === 'air') {
            const impact = fallSpeed;
            const horiz = Math.hypot(this.vel.x, this.vel.z);
            this.lastImpact = Math.max(impact, horiz);
            if (impact > 5 || horiz > 12) {
              // fast + horizontal → forward shoulder roll that carries momentum;
              // steep + vertical → the planted 3-point superhero landing
              const roll = horiz > 10 && horiz > impact * 0.8;
              this.lastLandingRoll = roll;             // combo hook
              this.hero.startLanding(roll, Math.min(1, Math.max(impact, horiz) / 26));
              if (GAME.camFx)
                GAME.camFx.shake = Math.min(1.2, Math.max(impact, horiz) / 20);
              this.justLanded = true;
              if (roll) {
                // keep some speed through the roll instead of dead-stopping
                this.vel.x *= 0.55; this.vel.z *= 0.55;
              }
            }
          }
          this.mode = 'ground';
          this.pos.y = support;
        } else if (this.mode === 'ground' && this.pos.y > support + 1.35) {
          this.mode = 'air';           // walked off a real edge (big drop)
          this._airTime = 0.2;
        } else if (this.mode === 'ground') {
          // ease onto / off low ledges (parapet crowns, props, bulkheads)
          // instead of snapping the camera
          const step = support - this.pos.y;
          if (Math.abs(step) < 1.4) this.pos.y += step * Math.min(1, dt * 12);
          else this.pos.y = support;
        }
      } else if (this.mode === 'swing' && onSurface) {
        // swung into a surface
        this.mode = 'ground';
        this.anchor = null;
        this.pos.y = support;
      }

      // Seamless tiling wrap: crossing the half-gap teleports one full period —
      // the ghost city you were looking at IS the city you arrive in. Free
      // modes only, so web anchors / wall grips never dangle across the seam.
      if (this.city.tile && (this.mode === 'air' || this.mode === 'ground')) {
        const t = this.city.tile;
        for (const ax of ['x', 'z']) {
          const c = t.center[ax], per = t.period[ax];
          let d = 0;
          if (this.pos[ax] > c + per / 2) d = -per;
          else if (this.pos[ax] < c - per / 2) d = per;
          if (d) {
            this.pos[ax] += d;
            if (GAME.wrapShift) GAME.wrapShift(ax === 'x' ? d : 0, ax === 'z' ? d : 0);
          }
        }
      }
      // World edges are handled by the seamless tiling wrap above — the
      // old hard clamp here sat INSIDE the wrap threshold and blocked it.
      // Fallback clamp only if a zone somehow has no tiling built.
      if (!this.city.tile) {
        const B = this.city.bounds, M = 20;
        if (this.pos.x < B.minX - M) { this.pos.x = B.minX - M; this.vel.x = Math.max(0, this.vel.x); }
        if (this.pos.x > B.maxX + M) { this.pos.x = B.maxX + M; this.vel.x = Math.min(0, this.vel.x); }
        if (this.pos.z < B.minZ - M) { this.pos.z = B.minZ - M; this.vel.z = Math.max(0, this.vel.z); }
        if (this.pos.z > B.maxZ + M) { this.pos.z = B.maxZ + M; this.vel.z = Math.min(0, this.vel.z); }
      }

      if (this.mode === 'ground') {
        const hs2 = Math.hypot(this.vel.x, this.vel.z);
        if (hs2 > 0.5) this.yaw = Math.atan2(this.vel.x, this.vel.z);
      }
      this._prevSpace = k.space;

      // gargoyle perch only when standing at a rooftop precipice
      const atLedge = this.mode === 'ground' &&
        this.city.ledgeDist(this.pos.x, this.pos.z, this.pos.y) < 2.4;

      // Upside-down hang: dangling near-still on a taut web long enough that
      // the swing has died out → flip inverted and hang by the feet.
      if (this.mode === 'swing' && this.anchor && this.vel.length() < 2.6) {
        this._hangT = (this._hangT || 0) + dt;
      } else this._hangT = 0;
      this.hanging = this._hangT > 0.7 || this.ledgeHang;

      // near-miss: skimming past a building at speed reads as a rush
      this._nearMissT = (this._nearMissT || 0) - dt;
      if (this._nearMissT <= 0 && (this.mode === 'swing' || this.mode === 'air')) {
        this._nearMissT = 0.12;
        const spd2 = this.vel.length();
        if (spd2 > 18) {
          for (const b of this.city.buildingsNear(this.pos.x, this.pos.z)) {
            if (this.pos.y > b.h + 2 || this.pos.y < 2) continue;
            if (this.pos.x < b.bx0 - 7 || this.pos.x > b.bx1 + 7 ||
                this.pos.z < b.bz0 - 7 || this.pos.z > b.bz1 + 7) continue;
            const dx = Math.max(b.bx0 - this.pos.x, 0, this.pos.x - b.bx1);
            const dz = Math.max(b.bz0 - this.pos.z, 0, this.pos.z - b.bz1);
            const d = Math.hypot(dx, dz);
            if (d > 0.5 && d < 6) {
              if (GAME.camFx) GAME.camFx.pulse = Math.max(GAME.camFx.pulse, 0.55);
              break;
            }
          }
        }
      }

      // drive hero visuals
      this.hero.update({
        mode: this.mode, pos: this.pos, vel: this.vel, hanging: this.hanging,
        diving: this.diving,
        lookPitch: this.lookPitch, lookYawRel: this.lookYawRel,
        speed: this.mode === 'crawl' ? this.vel.length()
             : Math.hypot(this.vel.x, this.vel.z),
        vy: this.vel.y,
        anchor: this.anchor, dt, yaw: this.yaw,
        wallNormal: this.wall, atLedge,
        wallHangN: this.ledgeHang ? this.wall : null,
        gliding: this.gliding && this.mode === 'air',
      });
    }
  }

  GAME.Player = Player;
})();
