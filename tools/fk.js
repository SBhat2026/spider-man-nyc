// ============================================================================
// FK SKELETON ORACLE — the authoritative animation validator.
//
// Mirrors the three.js bone math in src/hero.js exactly:
//   local = Translate(pos) · Rotate(EulerXYZ),  world = parentWorld · local
// Euler 'XYZ' with y=0 reduces to Rx·Rz (verified against THREE's
// Matrix4.makeRotationFromEuler).
//
// WORKFLOW: model every pose here and run it BEFORE touching the live rig.
//   node tools/fk.js            → everything
//   node tools/fk.js swing      → swing signatures across the arc
//   node tools/fk.js pose       → the named iconic poses
//   node tools/fk.js look       → mouse look-modulation extremes
//   node tools/fk.js overshoot  → spring follow-through overshoot
//
// [CLIP] = limbs interpenetrate → NEVER ship. Fix the pose, re-run.
// metrics = pose quality: spread (silhouette), asym (0 = stiff/symmetric),
//           reach (extension), lead (head leading travel).
// ============================================================================

// ---- 4x4 column-major matrix helpers ----
const I = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    for (let k = 0; k < 4; k++) o[c*4+r] += a[k*4+r] * b[c*4+k];
  return o;
}
function trans(x, y, z) { const m = I(); m[12]=x; m[13]=y; m[14]=z; return m; }
function rotEuler(x, y, z) {           // order XYZ, column-major (matches THREE)
  const a=Math.cos(x), b=Math.sin(x), c=Math.cos(y), d=Math.sin(y), e=Math.cos(z), f=Math.sin(z);
  const ae=a*e, af=a*f, be=b*e, bf=b*f;
  const m = I();
  m[0]=c*e;     m[4]=-c*f;    m[8]=d;
  m[1]=af+be*d; m[5]=ae-bf*d; m[9]=-b*c;
  m[2]=bf-ae*d; m[6]=be+af*d; m[10]=a*c;
  return m;
}
const xf = (m, p) => [ m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
                       m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
                       m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14] ];

// ---- bone hierarchy: position = head - parentHead, identity bind rotation ----
// (kept in lockstep with BONE_DEFS in src/hero.js)
const BONES = {
  hips:      { parent: null,        pos: [0, 0, 0] },
  spine:     { parent: 'hips',      pos: [0, 0.10, 0] },
  neckHead:  { parent: 'spine',     pos: [0, 0.54, 0] },
  shoulderR: { parent: 'spine',     pos: [0.245, 0.46, 0] },
  elbowR:    { parent: 'shoulderR', pos: [0, -0.29, 0] },
  shoulderL: { parent: 'spine',     pos: [-0.245, 0.46, 0] },
  elbowL:    { parent: 'shoulderL', pos: [0, -0.29, 0] },
  hipR:      { parent: 'hips',      pos: [0.10, -0.05, 0] },
  kneeR:     { parent: 'hipR',      pos: [0, -0.45, 0] },
  hipL:      { parent: 'hips',      pos: [-0.10, -0.05, 0] },
  kneeL:     { parent: 'hipL',      pos: [0, -0.45, 0] },
};
function boneEuler(name, t) {
  const g = (k) => t[k] || 0;
  switch (name) {
    case 'spine':     return [g('spineX'), 0, g('spineZ')];
    case 'neckHead':  return [g('headX'), g('headY'), 0];
    case 'shoulderR': return [g('shRx'), 0, g('shRz')];
    case 'shoulderL': return [g('shLx'), 0, g('shLz')];
    case 'elbowR':    return [g('elRx'), 0, 0];
    case 'elbowL':    return [g('elLx'), 0, 0];
    case 'hipR':      return [g('hipRx'), 0, g('hipRz')];
    case 'hipL':      return [g('hipLx'), 0, g('hipLz')];
    case 'kneeR':     return [g('kneeRx'), 0, 0];
    case 'kneeL':     return [g('kneeLx'), 0, 0];
    default:          return [0, 0, 0];
  }
}
const ORDER = ['hips','spine','neckHead','shoulderR','elbowR','shoulderL','elbowL',
               'hipR','kneeR','hipL','kneeL'];
function worldMats(t) {
  const W = {};
  for (const name of ORDER) {
    const b = BONES[name], e = boneEuler(name, t);
    const local = mul(trans(...b.pos), rotEuler(e[0], e[1], e[2]));
    W[name] = b.parent ? mul(W[b.parent], local) : local;
  }
  return W;
}
function joints(t) {
  const W = worldMats(t), o = [0,0,0];
  return {
    hips: xf(W.hips, o),
    neck: xf(W.spine, [0, 0.54, 0]),
    head: xf(W.neckHead, [0, 0.17, 0.01]),
    shR: xf(W.shoulderR, o), elR: xf(W.elbowR, o), haR: xf(W.elbowR, [0, -0.31, 0]),
    shL: xf(W.shoulderL, o), elL: xf(W.elbowL, o), haL: xf(W.elbowL, [0, -0.31, 0]),
    hpR: xf(W.hipR, o), knR: xf(W.kneeR, o), ftR: xf(W.kneeR, [0, -0.43, 0.05]),
    hpL: xf(W.hipL, o), knL: xf(W.kneeL, o), ftL: xf(W.kneeL, [0, -0.43, 0.05]),
  };
}

// ---- capsule interpenetration ----
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scl=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=(a)=>Math.sqrt(dot(a,a));
const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function segSeg(p1,q1,p2,q2){
  const d1=sub(q1,p1), d2=sub(q2,p2), r=sub(p1,p2);
  const a=dot(d1,d1), e=dot(d2,d2), f=dot(d2,r); const EPS=1e-9;
  let s,tt; const c=dot(d1,r);
  if(a<=EPS&&e<=EPS) return len(r);
  if(a<=EPS){s=0;tt=cl(f/e,0,1);}
  else{const b=dot(d1,d2); const den=a*e-b*b;
    s=den>EPS?cl((b*f-c*e)/den,0,1):0; tt=(b*s+f)/e;
    if(tt<0){tt=0;s=cl(-c/a,0,1);} else if(tt>1){tt=1;s=cl((b-c)/a,0,1);}}
  return len(sub(add(p1,scl(d1,s)), add(p2,scl(d2,tt))));
}
function clipReport(t){
  const j = joints(t);
  const S = {
    torso:[j.hips,j.neck,0.17], head:[j.head,j.head,0.13],
    uArmR:[j.shR,j.elR,0.06], fArmR:[j.elR,j.haR,0.05],
    uArmL:[j.shL,j.elL,0.06], fArmL:[j.elL,j.haL,0.05],
    thighR:[j.hpR,j.knR,0.085], shinR:[j.knR,j.ftR,0.055],
    thighL:[j.hpL,j.knL,0.085], shinL:[j.knL,j.ftL,0.055],
    handR:[j.haR,j.haR,0.05], handL:[j.haL,j.haL,0.05],
  };
  const pairs=[['fArmR','torso'],['fArmL','torso'],['fArmR','head'],['fArmL','head'],
    ['uArmR','head'],['uArmL','head'],['fArmR','fArmL'],['handR','handL'],
    ['handR','head'],['handL','head'],['thighR','thighL'],['shinR','shinL'],
    ['shinR','torso'],['shinL','torso'],['fArmR','thighR'],['fArmL','thighL']];
  const viol=[];
  for(const [A,B] of pairs){
    const a=S[A], b=S[B];
    const d=segSeg(a[0],a[1],b[0],b[1]);
    const overlap=(a[2]+b[2])-d;
    if(overlap>0.05) viol.push({pair:A+'~'+B, overlap:+overlap.toFixed(3)});
  }
  viol.sort((x,y)=>y.overlap-x.overlap);
  return { viol };
}

// ---- pose QUALITY metrics (guidance, not a gate) ----
function metrics(t){
  const j = joints(t), pts = Object.values(j);
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9,mnz=1e9,mxz=-1e9;
  for(const p of pts){mnx=Math.min(mnx,p[0]);mxx=Math.max(mxx,p[0]);mny=Math.min(mny,p[1]);
                      mxy=Math.max(mxy,p[1]);mnz=Math.min(mnz,p[2]);mxz=Math.max(mxz,p[2]);}
  const mir=p=>[-p[0],p[1],p[2]];
  const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const asym = d(j.haR,mir(j.haL))+d(j.ftR,mir(j.ftL))+d(j.elR,mir(j.elL))+d(j.knR,mir(j.knL));
  const reach = (d(j.haR,j.hips)+d(j.haL,j.hips)+d(j.ftR,j.hips)+d(j.ftL,j.hips))/4;
  return { spreadX:+(mxx-mnx).toFixed(2), spreadY:+(mxy-mny).toFixed(2),
           spreadZ:+(mxz-mnz).toFixed(2), asym:+asym.toFixed(2),
           reach:+reach.toFixed(2), headLeadZ:+(j.head[2]-j.hips[2]).toFixed(2) };
}

// ---- swing signatures (mirror src/hero.js _targets) ----
// ph: -1 entry … 0 bottom … +1 exit
function swing(style, ph) {
  const t = {};
  const A='R', F='L', sA=-1, sF=1, lead='L', off='R', RZ=(s)=>s==='R'?-1:1;
  const wEntry=Math.max(0,-ph), wExit=Math.max(0,ph), wBottom=1-Math.abs(ph);
  const reach=1, sway=0;
  if (style===3) {
    // McFARLANE (ASM #300): extreme arch, torso twisted, legs split hard
    // NOTE sign convention: sF*POSITIVE swings the free arm INWARD across the
    // torso (clips). Outward = sF * negative.
    t['sh'+A+'x']=0.12; t['sh'+A+'z']=sA*2.92; t['el'+A+'x']=-0.06;
    t['sh'+F+'x']=0.68; t['sh'+F+'z']=sF*-1.72; t['el'+F+'x']=-0.32;
    t['hip'+A+'x']=-1.48; t['knee'+A+'x']=1.62;
    t['hip'+F+'x']=0.72;  t['knee'+F+'x']=0.34;
    t['hip'+A+'z']=RZ(A)*-0.2; t['hip'+F+'z']=RZ(F)*0.1;
    t.spineX=-0.34+0.1*wBottom; t.spineZ=sA*-0.2;
    t.headX=-0.48; t.headY=sA*0.25;
  } else if (style===1) {
    // STRADDLE — arm up the web, legs spread wide, web runs through the legs
    t['sh'+A+'x']=0; t['sh'+A+'z']=sA*2.9; t['el'+A+'x']=-0.1;
    t['sh'+F+'x']=-0.2; t['sh'+F+'z']=-sF*1.3; t['el'+F+'x']=-0.2;
    t.hipRx=-0.3; t.hipLx=-0.3; t.hipRz=0.7; t.hipLz=-0.7; t.kneeRx=0.2; t.kneeLx=0.2;
    t.spineX=-0.05; t.headX=-0.2;
  } else if (style===2) {
    // CANNONBALL — knees to chest, tight ball
    t['sh'+A+'x']=0; t['sh'+A+'z']=sA*(2.55+0.35*reach); t['el'+A+'x']=-0.1;
    t['sh'+F+'x']=-1.35; t['sh'+F+'z']=sF*0.35; t['el'+F+'x']=-1.85;
    t.hipRx=-1.95; t.hipLx=-1.95; t.hipRz=0.14; t.hipLz=-0.14;
    t.kneeRx=2.35; t.kneeLx=2.35; t.spineX=0.5; t.headX=0.12;
  } else {
    // REACH — the workhorse. S-tier bottom-of-pendulum read: free arm splays
    // OUT, body stretched along the arc with the back ARCHED and legs TRAILING
    // behind (not tucked forward), head up. Entry trails, exit kicks through.
    t['sh'+A+'x']=0; t['sh'+A+'z']=sA*(2.55+0.4*reach); t['el'+A+'x']=-0.1;
    t['sh'+F+'x']=0.9*wEntry-1.1*wExit;
    t['sh'+F+'z']=-sF*(0.35+0.55*wBottom);
    t['el'+F+'x']=-0.5+0.42*wBottom;
    t['hip'+lead+'x']=0.35*wEntry+0.55*wBottom-1.6*wExit+sway;
    t['knee'+lead+'x']=0.45*wEntry+0.85*wBottom+0.4*wExit;
    t['hip'+off+'x']=0.55*wEntry-0.95*wBottom-1.3*wExit-sway;
    t['knee'+off+'x']=0.35*wEntry+1.55*wBottom+0.6*wExit;
    t['hip'+lead+'z']=RZ(lead)*0.16*wBottom;
    t['hip'+off+'z']=RZ(off)*0.16*wBottom;
    t.spineX=-0.22*wEntry-0.28*wBottom-0.08*wExit;
    t.headX=-0.30-0.2*wBottom-0.15*wExit;
  }
  return t;
}

// ---- named iconic poses (mirror POSE in src/hero.js) ----
const POSES = {
  crawl: { shRx:-0.85, shRz:0.5, elRx:-0.7, shLx:-0.85, shLz:-0.5, elLx:-0.7,
           hipRx:-0.65, hipRz:0.28, kneeRx:0.9, hipLx:-0.65, hipLz:-0.28, kneeLx:0.9,
           spineX:0.1, headX:-0.5 },
  perch: { hipRx:-1.35, hipLx:-1.35, hipRz:0.34, hipLz:-0.34, kneeRx:2.25, kneeLx:2.25,
           shRx:-0.72, shRz:0.04, elRx:-0.15, shLx:-0.5, shLz:-0.28, elLx:-1.4,
           spineX:0.40, headX:-0.52 },
  land3pt: { hipRx:-1.55, kneeRx:2.0, hipRz:-0.1, hipLx:-0.5, kneeLx:0.35, hipLz:0.55,
             shRx:-0.62, shRz:0.16, elRx:-0.15, shLx:0.5, shLz:-1.0, elLx:-0.4,
             spineX:0.62, headX:-0.55 },
  landRoll: { hipRx:-1.7, hipLx:-1.7, kneeRx:2.2, kneeLx:2.2, shRx:-1.5, shLx:-1.5,
              shRz:-0.5, shLz:0.5, elRx:-1.7, elLx:-1.7, spineX:0.75, headX:0.2 },
  airSpread: { shRx:-0.28, shRz:1.42, elRx:-0.18, shLx:-0.28, shLz:-1.42, elLx:-0.18,
               hipRx:-1.5, hipLx:-1.5, hipRz:0.58, hipLz:-0.58,
               kneeRx:1.92, kneeLx:1.92, spineX:0.12, headX:-0.24 },
  webDash: { shRx:-1.48, shRz:-0.32, elRx:-0.12, shLx:0.92, shLz:0.52, elLx:-0.78,
             hipRx:0.48, kneeRx:0.72, hipLx:-0.32, kneeLx:1.12,
             hipRz:0.12, hipLz:-0.16, spineX:0.16, spineZ:0.1, headX:-0.34, headY:0.18 },
  upsideHang: { shRx:-1.35, shRz:-0.42, elRx:-1.85, shLx:-1.35, shLz:0.42, elLx:-1.85,
                hipRx:0.05, hipLx:0.05, hipRz:0.05, hipLz:-0.05,
                kneeRx:0.32, kneeLx:0.32, spineX:0.14, headX:0.22 },
  wallCrouch: { shRx:-1.12, shRz:0.52, elRx:-1.42, shLx:-1.12, shLz:-0.52, elLx:-1.42,
                hipRx:-1.78, hipLx:-1.78, hipRz:0.26, hipLz:-0.26,
                kneeRx:2.18, kneeLx:2.18, spineX:0.34, headX:-0.48 },
  dive: { shRx:-1.0, shRz:-2.72, elRx:-0.22, shLx:-0.94, shLz:2.78, elLx:-0.28,
          hipRx:-0.14, hipLx:0.1, kneeRx:0.14, kneeLx:0.22,
          hipRz:0.05, hipLz:-0.05,
          spineX:0.22, headX:-0.62 },
};

// ---- runner ----
const which = process.argv[2] || 'all';
let fails = 0;
function run(name, t) {
  const r = clipReport(t), m = metrics(t);
  if (r.viol.length) fails++;
  console.log(`[${r.viol.length ? 'CLIP' : ' ok '}] ${name.padEnd(16)} ` +
    (r.viol.length ? r.viol.map(v=>`${v.pair}(+${v.overlap})`).join(' ') : 'clean').padEnd(30) +
    ` spd=[${m.spreadX},${m.spreadY},${m.spreadZ}] asym=${m.asym} reach=${m.reach} lead=${m.headLeadZ}`);
}
if (which==='all' || which==='swing')
  for (const st of [0,1,2,3]) for (const [ph,lab] of [[-1,'entry'],[0,'bottom'],[1,'exit']])
    run(`swing${st}-${lab}`, swing(st, ph));
if (which==='all' || which==='pose') for (const k in POSES) run(k, POSES[k]);
if (which==='all' || which==='look') {
  const cl2=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const mod=(t,tuck,lean)=>({ ...t,
    hipRx: cl2((t.hipRx||0)-0.35*tuck, -1.95, 1.2),
    hipLx: cl2((t.hipLx||0)-0.35*tuck, -1.95, 1.2),
    kneeRx: cl2((t.kneeRx||0)+0.40*tuck, 0, 2.35),
    kneeLx: cl2((t.kneeLx||0)+0.40*tuck, 0, 2.35),
    spineX:(t.spineX||0)+0.22*tuck,
    spineZ:(t.spineZ||0)+0.25*lean, headY:(t.headY||0)+0.45*lean });
  for (const st of [0,1,2,3]) {
    run(`look${st}-downR`, mod(swing(st,0),  1,  1));
    run(`look${st}-upL`,   mod(swing(st,0), -1, -1));
  }
  run('look-air-down', mod(POSES.airSpread, 1, 1));
}
if (which==='all' || which==='overshoot') {
  // springs briefly exceed the target by ~10% (follow-through)
  const over=(t)=>{const o={...t};
    for(const k of ['kneeRx','kneeLx','hipRx','hipLx','elRx','elLx','shRx','shLx'])
      if(o[k]!==undefined) o[k]*=1.1;
    return o;};
  run('over-cannonball', over(swing(2,0)));
  run('over-landRoll', over(POSES.landRoll));
  run('over-land3pt', over(POSES.land3pt));
  run('over-perch', over(POSES.perch));
}
if (fails) { console.log(`\n${fails} CLIPPING POSE(S) — do not ship.`); process.exit(1); }
console.log('\nall clear');
module.exports = { clipReport, metrics, joints, swing, POSES };
