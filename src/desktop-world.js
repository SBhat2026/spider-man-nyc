(function () {
  if(!GAME.desktop)return;
  const V=THREE.Vector3;
  class DesktopWorld {
    constructor(city,scene,lm){
      this.city=city;this.scene=scene;this.lm=lm;this.group=new THREE.Group();this.group.name='Desktop Manhattan detail';scene.add(this.group);
      this.boxes=[];this.metals=[];this.posts=[];this.solids=[];this.lights=[];this.screens=[];
      this.stone=new THREE.MeshStandardMaterial({color:0xa19e95,roughness:.85});
      this.metal=new THREE.MeshStandardMaterial({color:0x3e474b,roughness:.56,metalness:.6});
      this._towers();this._facadeDetails();this._posters();this._timesSquare();this._timesSquareScreens();this._easterEggs();this._spooder();
      this._instances(this.boxes,new THREE.BoxGeometry(1,1,1),this.stone);
      this._instances(this.metals,new THREE.BoxGeometry(1,1,1),this.metal);
      this._instances(this.posts,new THREE.CylinderGeometry(1,1,1,8),this.metal);
      city.desktopSolids=this.solids;
    }
    box(list,x,y,z,w,h,d,yaw=0){list.push({x,y,z,w,h,d,yaw});}
    _instances(list,geo,mat){if(!list.length){geo.dispose();return;}const mesh=new THREE.InstancedMesh(geo,mat,list.length),o=new THREE.Object3D();list.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.set(0,p.yaw,0);o.scale.set(p.w,p.h,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);}
    _towers(){
      for(const b of this.city.buildings){
        const name=b.name||'';if(!/Empire State Building|Chrysler Building|30 Rockefeller Plaza/.test(name))continue;
        const x=b.poly.reduce((s,p)=>s+p[0],0)/b.poly.length,z=b.poly.reduce((s,p)=>s+p[1],0)/b.poly.length;
        const yaw=-.49;
        const tier=(w,d,bottom,top)=>{
          const tex=GAME.desktopTexture('stone');const map=tex.map.clone();map.repeat.set(w/12,(top-bottom)/28);map.needsUpdate=true;
          const mat=new THREE.MeshStandardMaterial({map,color:0xc4beb1,roughness:.76,bumpMap:tex.bumpMap,bumpScale:.07});
          const m=new THREE.Mesh(new THREE.BoxGeometry(w,top-bottom,d),mat);m.position.set(x,(top+bottom)/2,z);m.rotation.y=yaw;m.castShadow=true;m.receiveShadow=true;this.group.add(m);
          this.solids.push({x,z,w,d,yaw,bottom,top});
        };
        if(name==='Empire State Building'){
          tier(50,37,b.h,302);tier(39,30,302,326);tier(28,23,326,350);tier(17,15,350,373);
          this._spire(x,z,373,443.2,3.5,0xc5c5bc);this.box(this.metals,x,381,z,11,1.5,10,yaw);
        }else if(name==='Chrysler Building'){
          tier(33,33,b.h,246);tier(24,24,246,264);
          const mat=new THREE.MeshStandardMaterial({color:0xbdcad0,metalness:.72,roughness:.3});
          for(let i=0;i<6;i++){
            const bottom=264+i*5.3,rad=13-i*1.8;
            const crown=new THREE.Mesh(new THREE.ConeGeometry(rad,12,4),mat);crown.position.set(x,bottom+6,z);crown.rotation.y=yaw+Math.PI/4;crown.castShadow=true;this.group.add(crown);
            const rim=new THREE.Mesh(new THREE.TorusGeometry(rad,.18,4,4),this.metal);rim.rotation.set(Math.PI/2,0,yaw+Math.PI/4);rim.position.set(x,bottom+1,z);this.group.add(rim);
          }this._spire(x,z,296,318.9,1.2,0xe1e6e4);
        }else {tier(42,21,b.h,249);tier(31,16,249,259);this._spire(x,z,259,266,.45,0xc3c8cc);}
      }
    }
    _spire(x,z,base,top,r,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(.12,r,top-base,10),new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.32}));m.position.set(x,(top+base)/2,z);m.castShadow=true;this.group.add(m);}
    _facadeDetails(){
      let count=0;
      for(const b of this.city.buildings){
        if(b.h<12||b.h>70||b.hash%13!==0||count>=170)continue;
        const f=this.lm._facade(b);if(!f||f.len<9||f.len>65)continue;
        if(this.city.isSolid(f.mx+f.nx*3,2,f.mz+f.nz*3))continue;
        const yaw=Math.atan2(f.nx,f.nz),levels=Math.min(7,Math.floor(b.h/3.4)-1);
        for(let k=1;k<=levels;k++){
          const x=f.mx+f.nx*1.05,z=f.mz+f.nz*1.05,y=k*3.4;
          this.box(this.metals,x,y,z,3.7,.11,1.5,yaw);
          this.box(this.metals,x+f.nx*.67,y+.7,z+f.nz*.67,3.7,.06,.06,yaw);
          for(const side of [-1,1])this.box(this.metals,x+f.ux*side*1.7,y+.4,z+f.uz*side*1.7,.06,.8,1.4,yaw);
          for(let rail=-1.5;rail<=1.5;rail+=.5)this.box(this.metals,x+f.ux*rail+f.nx*.67,y+.38,z+f.uz*rail+f.nz*.67,.045,.65,.045,yaw);
        }count++;
      }
      this.fireEscapes=count;
    }
    _posters(){
      const atlas=GAME.desktopAdAtlas(false),pos=[],uv=[],idx=[],nrm=[];let count=0;
      for(const b of this.city.buildings){
        if(b.hash%37!==0||b.h<10||count>=190)continue;
        const f=this.lm._facade(b);if(!f||f.len<8||this.city.isSolid(f.mx+f.nx*2.5,2,f.mz+f.nz*2.5))continue;
        const w=Math.min(f.len*.72,7.6),h=w*.5,x=f.mx+f.nx*.14,z=f.mz+f.nz*.14,y=2.1+h/2;
        const rx=f.nz,rz=-f.nx,base=pos.length/3;
        pos.push(x-rx*w/2,y-h/2,z-rz*w/2,x+rx*w/2,y-h/2,z+rz*w/2,x+rx*w/2,y+h/2,z+rz*w/2,x-rx*w/2,y+h/2,z-rz*w/2);
        for(let i=0;i<4;i++)nrm.push(f.nx,0,f.nz);
        const k=count%32,u=(k%4)/4,v=1-Math.floor(k/4)/8,pad=.001;
        uv.push(u+pad,v-1/8+pad,u+1/4-pad,v-1/8+pad,u+1/4-pad,v-pad,u+pad,v-pad);idx.push(base,base+1,base+2,base,base+2,base+3);count++;
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
      const mat=new THREE.MeshStandardMaterial({map:atlas.tex,roughness:.88,metalness:0,side:THREE.FrontSide});const m=new THREE.Mesh(g,mat);this.group.add(m);this.posterCount=count;
    }
    _timesSquare(){
      if(!this.lm.timesSquare)return;
      const a=this.lm.ll(40.7561,-73.98645),b=this.lm.ll(40.75975,-73.98488);
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,yaw=Math.atan2(nx,nz);
      // Staggered granite benches and safety bollards along the pedestrian spine.
      for(let d=0;d<len;d+=11){const t=d/len,x=a.x+dx*t,z=a.z+dz*t;
        for(const side of [-1,1]){const px=x+nx*side*8,pz=z+nz*side*8;if(this.city.isSolid(px,1,pz))continue;
          this.box(this.posts,px,.61,pz,.11,1.15,.11);
          if(Math.round(d/11)%3===0)this.box(this.boxes,px-nx*side*1.8,.47,pz-nz*side*1.8,3.4,.7,.8,yaw);
        }
      }
      // Light bounces have a bounded footprint and only four real lights.
      for(let i=0;i<4;i++){const t=(i+.5)/4,light=new THREE.PointLight([0x56bfff,0xf876ad,0xffd78c,0x6fd6dc][i],0,46,2);light.position.set(a.x+dx*t,6,a.z+dz*t);this.group.add(light);this.lights.push(light);}
    }
    // The plaza had benches, bollards and four lights but not a single screen —
    // which is the one thing Times Square actually is. Mount big emissive
    // boards in tiers up every facade that fronts the spine, mixing tall
    // banners and wide screens, and let them blaze as the sun drops.
    _timesSquareScreens(){
      if(!this.lm.timesSquare)return;
      const a=this.lm.ll(40.7561,-73.98645),b=this.lm.ll(40.75975,-73.98488);
      const sx=b.x-a.x,sz=b.z-a.z,slen=Math.hypot(sx,sz)||1,ux=sx/slen,uz=sz/slen;
      const distToSpine=(x,z)=>{
        let t=((x-a.x)*ux+(z-a.z)*uz);t=Math.max(0,Math.min(slen,t));
        return Math.hypot(x-(a.x+ux*t),z-(a.z+uz*t));
      };
      const build=(portrait)=>{
        const atlas=GAME.desktopAdAtlas(portrait);
        const pos=[],uv=[],idx=[],nrm=[];let n=0;
        for(const bd of this.city.buildings){
          if(bd.h<14)continue;
          const cx=(bd.bx0+bd.bx1)/2,cz=(bd.bz0+bd.bz1)/2;
          if(distToSpine(cx,cz)>95)continue;
          const f=this.lm._facade(bd);if(!f||f.len<9)continue;
          // the board has to face the plaza, not the back alley
          if(distToSpine(f.mx+f.nx*6,f.mz+f.nz*6)>=distToSpine(f.mx,f.mz))continue;
          if(this.city.isSolid(f.mx+f.nx*2.2,6,f.mz+f.nz*2.2))continue;
          const tiers=Math.min(portrait?3:4,Math.max(1,Math.floor((bd.h-8)/13)));
          for(let k=0;k<tiers;k++){
            const w=portrait?Math.min(f.len*.30,7.5):Math.min(f.len*.82,17);
            const h=portrait?w*2:w*0.52;
            const y=9.5+k*(h+3.2);
            if(y+h/2>bd.h-1.5)break;
            // tall banners hug one end of the facade, wide screens centre
            const slide=portrait?((k%2)?1:-1)*f.len*.28:0;
            const x=f.mx+f.nx*.35+f.ux*slide,z=f.mz+f.nz*.35+f.uz*slide;
            const rx=f.nz,rz=-f.nx,base=pos.length/3;
            pos.push(x-rx*w/2,y-h/2,z-rz*w/2, x+rx*w/2,y-h/2,z+rz*w/2,
                     x+rx*w/2,y+h/2,z+rz*w/2, x-rx*w/2,y+h/2,z-rz*w/2);
            for(let i=0;i<4;i++)nrm.push(f.nx,0,f.nz);
            const cell=(n*7+k*3)%atlas.count,cols=atlas.cols,rows=atlas.rows;
            const u=(cell%cols)/cols,v=1-Math.floor(cell/cols)/rows,pad=.0012;
            uv.push(u+pad,v-1/rows+pad, u+1/cols-pad,v-1/rows+pad,
                    u+1/cols-pad,v-pad, u+pad,v-pad);
            idx.push(base,base+1,base+2,base,base+2,base+3);n++;
          }
          if(n>(portrait?120:90))break;
        }
        if(!n)return 0;
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
        g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
        g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
        g.setIndex(idx);
        const mat=new THREE.MeshStandardMaterial({map:atlas.tex,emissiveMap:atlas.tex,
          emissive:new THREE.Color(0xffffff),emissiveIntensity:.25,
          roughness:.42,metalness:0,side:THREE.FrontSide});
        const m=new THREE.Mesh(g,mat);m.name='Times Square screens';
        this.group.add(m);this.screens.push(mat);
        return n;
      };
      this.screenCount=build(true)+build(false);
    }
    // ---- SECRET: "spooder man" -----------------------------------------
    // The badly-drawn meme, hidden on one rooftop with no marker and no clue
    // in the menu. Everything about him is deliberately wrong: the eyes are
    // different sizes and heights, the webbing is hand-wobbled rather than
    // radial, one arm is longer, and he is flat-shaded while the rest of the
    // city is physically lit. He should look like he was pasted in.
    _spooder(){
      const p=this.lm.ll(40.7466,-73.9830);            // a nobody rooftop off 6th
      const B=this.city.bounds;
      if(p.x<B.minX||p.x>B.maxX||p.z<B.minZ||p.z>B.maxZ)return;
      const b=this.lm._near(p,220,b=>b.h>34&&b.h<130);if(!b)return;
      const top=b.h;
      // Roofs are cluttered with bulkheads, water towers and AC units, and the
      // bare centroid buried him behind one. Spiral out for a clear patch.
      let cx=(b.bx0+b.bx1)/2, cz=(b.bz0+b.bz1)/2;
      const clear=(x,z)=>!this.city.isSolid(x,top+1.1,z)&&!this.city.isSolid(x,top+2.0,z);
      if(!clear(cx,cz)){
        let found=false;
        for(let r=2.5;r<=14&&!found;r+=2.5){
          for(let a=0;a<6.283&&!found;a+=0.52){
            const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
            // stay on the roof, not off the parapet
            if(x<b.bx0+2||x>b.bx1-2||z<b.bz0+2||z>b.bz1-2)continue;
            if(clear(x,z)){cx=x;cz=z;found=true;}
          }
        }
      }

      // crude paint-program skin
      const cv=document.createElement('canvas');cv.width=cv.height=256;
      const c=cv.getContext('2d');
      c.fillStyle='#d32b2b';c.fillRect(0,0,256,256);
      c.fillStyle='#2b3ea8';c.fillRect(0,168,256,88);   // pants, drawn too high
      c.strokeStyle='#111';c.lineWidth=3;c.lineJoin='round';
      // wobbly "webbing" — freehand, not radial
      for(let i=0;i<7;i++){
        c.beginPath();
        for(let x=0;x<=256;x+=32)c.lineTo(x, 20+i*22 + Math.sin(x*0.11+i)*7);
        c.stroke();
      }
      for(let i=0;i<7;i++){
        c.beginPath();
        for(let y=0;y<=170;y+=28)c.lineTo(18+i*36 + Math.cos(y*0.09+i)*8, y);
        c.stroke();
      }
      const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;

      const g=new THREE.Group();
      const flat=(m)=>new THREE.MeshBasicMaterial(m);      // unlit, on purpose
      const bodyMat=flat({map:tex});
      const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.62,3,10),bodyMat);
      torso.position.y=1.16;g.add(torso);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.33,12,10),flat({color:0xd32b2b}));
      head.scale.set(1.14,.94,1);head.position.y=1.86;g.add(head);
      // mismatched eyes: different size, different height, one tilted
      const eyeMat=flat({color:0xffffff});
      const e1=new THREE.Mesh(new THREE.CircleGeometry(.135,14),eyeMat);
      e1.position.set(-.13,1.92,.305);e1.rotation.z=.22;g.add(e1);
      const e2=new THREE.Mesh(new THREE.CircleGeometry(.088,12),eyeMat);
      e2.position.set(.15,1.86,.30);e2.rotation.z=-.5;g.add(e2);
      const pupil=flat({color:0x111111});
      const p1=new THREE.Mesh(new THREE.CircleGeometry(.05,10),pupil);p1.position.set(-.11,1.93,.315);g.add(p1);
      const p2=new THREE.Mesh(new THREE.CircleGeometry(.032,10),pupil);p2.position.set(.17,1.85,.311);g.add(p2);
      // stubby limbs, one arm visibly longer
      const limb=(x,y,len,rot,mat)=>{
        const m=new THREE.Mesh(new THREE.CapsuleGeometry(.10,len,3,8),mat);
        m.position.set(x,y,0);m.rotation.z=rot;g.add(m);
      };
      limb(-.46,1.30,.62,.55,flat({color:0xd32b2b}));
      limb(.46,1.24,.90,-.75,flat({color:0xd32b2b}));     // too long
      limb(-.17,.44,.62,.05,flat({color:0x2b3ea8}));
      limb(.19,.44,.56,-.04,flat({color:0x2b3ea8}));

      g.position.set(cx,top,cz);
      g.rotation.y=Math.random()*Math.PI*2;
      g.scale.setScalar(.92);
      this.group.add(g);
      this.spooder=g;

      this.lm.eggs.push({id:'spooder',x:cx,z:cz,r:14,
        label:'spooder man',icon:'#d32b2b'});
    }
    _easterEggs(){
      const spots=[
        [40.7488,-73.9904,'feast','F.E.A.S.T.','A neighborhood that cares',0xd58b48],
        [40.7634,-73.9893,'nelson','Nelson & Murdock','Attorneys at law',0xc5ba96],
        [40.7521,-73.9815,'oscorp-lab','Oscorp Research','Building a better tomorrow',0x59b490],
        [40.7623,-73.9880,'alias','Alias Investigations','We find the truth',0xaf96c9],
        [40.7553,-73.9878,'pizza-time','Pizza time','Delivery in 29 minutes',0xe7bc76],
        [40.7760,-73.9692,'baxter','Baxter Foundation','Science for everyone',0x7bb6e1],
        [40.7077,-74.0109,'damage-control','Damage Control','Rebuilding New York',0xdcb05d],
      ];
      for(const [lat,lon,id,title,subtitle,col] of spots){
        const p=this.lm.ll(lat,lon),B=this.city.bounds;if(p.x<B.minX||p.x>B.maxX||p.z<B.minZ||p.z>B.maxZ)continue;
        const b=this.lm._near(p,120,b=>b.h>8&&b.h<100);if(!b)continue;
        const f=this.lm._facade(b);if(!f||this.city.isSolid(f.mx+f.nx*3,2,f.mz+f.nz*3))continue;
        const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const c=cv.getContext('2d');
        c.fillStyle='#142027';c.fillRect(0,0,1024,256);c.fillStyle='#'+col.toString(16).padStart(6,'0');c.textAlign='center';c.textBaseline='middle';
        c.font='bold 64px Georgia';c.fillText(title,512,95,950);c.font='25px Arial';c.fillText(subtitle,512,175);
        const tx=new THREE.CanvasTexture(cv);tx.encoding=THREE.sRGBEncoding;
        this.lm._panel(tx,Math.min(f.len*.78,10),2.5,{x:f.mx+f.nx*.2,y:4.1,z:f.mz+f.nz*.2},f.nx,f.nz,true);
        this.lm.eggs.push({id,x:f.mx+f.nx*4,z:f.mz+f.nz*4,r:22,label:title,icon:'#'+col.toString(16)});
      }
    }
    update(dt,player,rig){
      if(this.spooder){this._spT=(this._spT||0)+dt;
        this.spooder.rotation.z=Math.sin(this._spT*1.7)*.045;
        this.spooder.position.y=this.spooder.position.y; }
      // screens are dim in daylight and blaze at dusk/night
      const glow=.22+Math.min(1.35,rig.windowGlow)*1.25;
      for(const m of this.screens)m.emissiveIntensity=glow;
      this.lights.forEach(l=>{const near=player.pos.distanceTo(l.position)<180;l.visible=near;l.intensity=near?Math.max(0,rig.windowGlow-.15)*4.8:0;});}
    dispose(){this.scene.remove(this.group);this.city.desktopSolids=[];const gs=new Set(),ms=new Set(),ts=new Set();this.group.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material){ms.add(o.material);if(o.material.map&&!o.material.map.userData.shared)ts.add(o.material.map);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
  }
  // Accurate OSM bases plus collision for the authored upper stories.
  const solid=GAME.City.prototype.isSolid,support=GAME.City.prototype.supportHeight;
  function inside(s,x,z){const dx=x-s.x,dz=z-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);return Math.abs(dx*c-dz*n)<s.w/2&&Math.abs(dx*n+dz*c)<s.d/2;}
  GAME.City.prototype.isSolid=function(x,y,z){return solid.call(this,x,y,z)||(this.desktopSolids||[]).some(s=>y>s.bottom&&y<s.top&&inside(s,x,z));};
  GAME.City.prototype.supportHeight=function(x,z,y){let h=support.call(this,x,z,y);for(const s of this.desktopSolids||[])if(s.top<=y+.9&&s.top>h&&inside(s,x,z))h=s.top;return h;};
  GAME.DesktopWorld=DesktopWorld;
})();
