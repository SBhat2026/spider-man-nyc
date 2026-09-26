(function () {
  if (!GAME.desktop) return;
  // Film identities stay intact. Added powers are gameplay interpretations,
  // documented separately from the reference material.
  GAME.SUIT_COMBAT = {
    classic:{name:'Web blossom',detail:'A radial burst of webs restrains nearby opponents.',cd:9,color:0xd6efff},
    black:{name:'Symbiote surge',detail:'Tendrils stagger the group and break a brute’s guard.',cd:12,color:0xb4bdd1},
    iron:{name:'Waldo sweep',detail:'Four mechanical arms sweep opponents off their feet.',cd:10,color:0xffce6c},
    miles:{name:'Venom pulse',detail:'Bioelectricity stuns nearby opponents. Hold K for camouflage.',cd:11,color:0xffc04c},
    y2099:{name:'Accelerated reflexes',detail:'Slow time and stagger nearby opponents, opening a route through the fight.',cd:12,color:0xff4b67},
    tasm:{name:'Web snare',detail:'A wide web net binds a group for follow-up strikes.',cd:9,color:0xd4efff},
    upgraded:{name:'Impact web',detail:'A focused web blast breaks guards and builds focus.',cd:8,color:0x83ddff},
    noir:{name:'Smoke veil',detail:'Smoke disorients nearby opponents and conceals your next strike.',cd:12,color:0x9da5b1},
    og:{name:'Organic web barrage',detail:'Rapid organic webs restrain opponents and restore web shots.',cd:9,color:0xf6dfc8},
  };
  Object.entries(GAME.SUIT_COMBAT).forEach(([key,p])=>{
    const help=GAME.SUIT_ABILITY[key];
    help.keys.push(['V',p.name+' — '+p.detail]);
    help.menu+=' <b>'+p.name+' (V)</b> — '+p.detail;
    if(key==='miles')help.keys.push(['hold K','camouflage; drains energy, recovers while visible']);
  });
  const s=GAME.SKINS;
  // Desktop-only albedo lift for the dark suits. At 0x141418 (20,20,24) these
  // sat below the point where any highlight can separate form from silhouette,
  // so in-world they read as flat cutouts against sky. Screen-black costumes
  // are rendered as dark CHARCOAL with specular doing the shaping; the colours
  // below still read black but leave headroom for the reflection to work.
  // NB these are sRGB: skinMaterial runs convertSRGBToLinear, which drops them
  // roughly another 4x, so they have to start higher than they look here.
  // The torso/mask/sleeve slots do NOT use primary.color: desktopSuitMaps
  // paints a canvas atlas from def.torso.base and the material colour is
  // forced white. So the body reads from torso.base and lifting the limb
  // colours alone left the chest and head as black as before.
  s.black.torso.base='#2e2e36';
  s.miles.torso.base='#1e2445';
  s.y2099.torso.base='#28306a';
  s.noir.torso.base='#31313a';s.noir.torso.web='#4c4c57';
  s.black.primary.color=0x3c3c47;s.black.secondary.color=0x31313b;s.black.accent.color=0x3c3c47;
  s.miles.primary.color=0x2c3360;s.miles.secondary.color=0x232950;
  s.y2099.primary.color=0x39447f;s.y2099.secondary.color=0x2a3163;
  s.noir.primary.color=0x40404a;s.noir.secondary.color=0x35353e;s.noir.accent.color=0x2b2b33;
  s.classic.rim=0x111827;s.classic.primary.rough=.61;s.classic.secondary.rough=.79;
  // The dark suits were set glossy but never given any envMapIntensity, so
  // they had nothing to reflect and collapsed into flat unlit silhouettes with
  // no readable form. A near-black suit gets essentially ALL its shape from
  // reflection, so these matter more here than on the red suits.
  s.black.primary.rough=.22;s.black.secondary.rough=.26;s.black.torso.emblemScale=1.85;
  s.black.primary.envI=1.45;s.black.secondary.envI=1.3;s.black.accent.envI=1.45;
  s.iron.primary.rough=.25;s.iron.primary.envI=.7;s.iron.accent.envI=1.15;s.iron.secondary.rough=.32;
  s.miles.primary.rough=.62;s.miles.secondary.rough=.66;s.miles.torso.emblemScale=1.15;
  s.miles.primary.envI=.85;s.miles.secondary.envI=.8;s.miles.accent.envI=.9;
  s.y2099.primary.rough=.39;s.y2099.secondary.rough=.43;s.y2099.cloak=true;
  s.y2099.primary.envI=1.1;s.y2099.secondary.envI=1.0;s.y2099.accent.envI=1.2;
  s.tasm.primary.rough=.48;s.tasm.secondary.rough=.6;s.tasm.bigLens=1.13;
  s.upgraded.primary.rough=.58;s.upgraded.secondary.rough=.81;
  s.noir.primary.rough=.78;s.noir.secondary.rough=.86;
  s.noir.primary.envI=.5;s.noir.secondary.envI=.45;s.noir.accent.envI=.5;
  s.og.primary.rough=.46;s.og.secondary.rough=.66;
  // Fabric weave, as a BUMP map only. The previous version was a hard-edged
  // 4 px checker tiled 6x10 with bumpScale .019 — over a limb each cell landed
  // several pixels wide and the suit read as reptile scales. A soft, much
  // higher-frequency twill at a fraction of the depth reads as cloth instead.
  const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d');
  ctx.fillStyle='#808080';ctx.fillRect(0,0,128,128);
  ctx.lineWidth=1;
  for(let i=-128;i<128;i+=3){
    ctx.strokeStyle='rgba(255,255,255,.16)';
    ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+128,128);ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.14)';
    ctx.beginPath();ctx.moveTo(i+1.5,0);ctx.lineTo(i+129.5,128);ctx.stroke();
  }
  const weave=new THREE.CanvasTexture(cv);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(26,42);weave.anisotropy=8;

  // ---- character rim light -------------------------------------------
  // Dark suits read as flat cutouts because the sunset rig has one key and a
  // broad hemi: nothing separates chest from arm. A low, cool rim that tracks
  // the camera restores the silhouette on every suit without touching the
  // city's lighting budget (one light, and it only ever hugs the player).
  GAME.installHeroRim=function(scene,hero){
    if(GAME._heroRim)return GAME._heroRim;
    const rim=new THREE.DirectionalLight(0xbcd2ff,1.45);
    rim.castShadow=false;scene.add(rim);scene.add(rim.target);
    GAME._heroRim=rim;
    return rim;
  };
  GAME.updateHeroRim=function(camera,hero){
    const rim=GAME._heroRim;if(!rim||!hero)return;
    const p=hero.root.position;
    // behind-and-above the subject relative to the camera → true rim
    const dx=p.x-camera.position.x, dz=p.z-camera.position.z;
    const l=Math.hypot(dx,dz)||1;
    rim.position.set(p.x+dx/l*4.5, p.y+4.2, p.z+dz/l*4.5);
    rim.target.position.set(p.x,p.y+1,p.z);
    rim.target.updateMatrixWorld();
  };
  const setSkin=GAME.Hero.prototype.setSkin;
  GAME.Hero.prototype.setSkin=function(name){
    setSkin.call(this,name);this.skinName=name;
    const maps=GAME.desktopSuitMaps(name);
    for(const slot of ['torso','mask','sleeves'])for(const mesh of this.slots[slot]||[]){mesh.material.map=maps[slot];mesh.material.color.setHex(0xffffff);}
    for(const slot of ['torso','mask','sleeves','primary','secondary','accent'])for(const mesh of this.slots[slot]||[]){
      const m=mesh.material;m.bumpMap=weave;m.bumpScale=name==='iron'?.0012:name==='black'?.001:.0026;
      // OG's webbing is physically raised on the suit, so its own colour map
      // doubles as the height source — but gently.
      if(name==='og'&&m.map){m.bumpMap=m.map;m.bumpScale=.0016;}
      m.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;
    }
    for(const mesh of this.slots.lens||[]){mesh.material.emissiveIntensity=name==='iron'?.34:.055;mesh.material.roughness=.18;}
    this.body.scale.set(name==='miles'?.97:1,1,1);
    for(const slot of ['rim','lens'])for(const mesh of this.slots[slot]||[]){
      mesh.material.side=THREE.DoubleSide;
      const g=mesh.geometry, a=g.attributes.position;
      if(!g.userData.originalEyes)g.userData.originalEyes=Array.from(a.array);
      const k=({black:1.12,tasm:1.13,miles:1.06,noir:.65,og:1.03})[name]||1;
      const src=g.userData.originalEyes;
      for(let i=0;i<a.count;i++){const sign=src[i*3]<0?-1:1;const x=sign*.063+(src[i*3]-sign*.063)*k,y=.85+(src[i*3+1]-.85)*k;
        const z=.014+.111*Math.sqrt(Math.max(.06,1-(x/.119)**2-((y-.851)/.155)**2))+(slot==='lens'?.005:.001);a.setXYZ(i,x,y,z);}
      a.needsUpdate=true;g.computeVertexNormals();
    }
    // 0x8f1634 blew out to hot magenta through ACES at sunset exposure
    if(this.cloak){this.cloak.mesh.material.color.setHex(name==='y2099'?0x7e1832:0x17191d).convertSRGBToLinear();this.cloak._init=false;}
  };
  const target=GAME.Hero.prototype._targets;
  GAME.Hero.prototype._targets=function(state){
    const t=target.call(this,state), f=state.combat;
    if(!f || state.mode==='swing' || state.mode==='crawl')return t;
    if(!f.kind){
      if(f.engaged && state.speed<1){Object.assign(t,{shRx:-.55,shLx:-.75,shRz:-.3,shLz:.36,elRx:-1.2,elLx:-1.15,hipRx:-.15,hipLx:-.27,kneeRx:.3,kneeLx:.43,bodyY:-.1,spineX:.12});}
      return t;
    }
    const u=Math.min(1,f.t/f.duration), punch=Math.sin(Math.min(1,Math.max(0,(u-.13)/.55))*Math.PI);
    const side=f.chain%2===0?'L':'R', other=side==='L'?'R':'L';
    Object.assign(t,{shRx:-.6,shLx:-.6,elRx:-1.3,elLx:-1.3,kneeRx:.32,kneeLx:.48,hipRx:-.18,hipLx:-.28,bodyY:-.12});
    if(f.kind==='strike'||f.kind==='finisher'){
      t['sh'+side+'x']=-.7-1.2*punch;t['el'+side+'x']=-1.4+1.35*punch;
      t['sh'+side+'z']=(side==='R'?-1:1)*(.3+.18*punch);
      t['sh'+other+'x']=-.35;t.spineZ=(side==='R'?1:-1)*.27*punch;t.spineX=.12+.18*punch;
      if(f.chain===3||f.kind==='finisher'){t.hipRx=-1.3*punch;t.kneeRx=.25;t.shRz=-.65;t.shLz=.7;t.bodyY=-.1+.22*punch;}
    }else if(f.kind==='dodge'){
      t.bodyY=-.42*Math.sin(u*Math.PI);t.spineZ=.6*Math.sin(u*Math.PI);t.hipRx=-.95;t.hipLx=-.7;t.kneeRx=1.5;t.kneeLx=1.3;t.shLz=1.1;t.shRz=-.85;
    }else if(f.kind==='parry'){
      t.shRx=t.shLx=-1.1;t.elRx=t.elLx=-1.1;t.shRz=-.2;t.shLz=.2;t.spineX=-.12;
    }else if(f.kind==='web'){
      t.shRx=-1.55;t.elRx=-.08;t.shRz=-.1;t.spineZ=-.12;
    }else if(f.kind==='power'){
      t.shRx=t.shLx=-1.3;t.shRz=-1.1;t.shLz=1.1;t.elRx=t.elLx=-.25;t.bodyY=-.3*(1-punch);
    }else if(f.kind==='hurt'){
      t.spineX=-.3;t.shRz=-.7;t.shLz=.7;t.headX=-.3;
    }
    return t;
  };
})();
