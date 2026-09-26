// New desktop mesh, authored against the film-suit reference photographs.
// Smooth anatomical sections replace the original sphere shoulders/egg mask.
// It retains the bone names so traversal and cloth animation remain compatible.
(function(){
  if(!GAME.desktop)return;
  const gauss=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
  function surface(sections,cx,kind){
    const radial=40,steps=(sections.length-1)*5,positions=[],uv=[],indices=[];
    const curves=['y','rx','rz','cz'].map(key=>new THREE.CatmullRomCurve3(sections.map((s,i)=>new THREE.Vector3(i,s[key]||0,0))));
    for(let j=0;j<=steps;j++){
      const t=j/steps, y=curves[0].getPoint(t).y,rx=curves[1].getPoint(t).y,rz=curves[2].getPoint(t).y,cz=curves[3].getPoint(t).y;
      for(let k=0;k<=radial;k++){
        const a=k/radial*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
        let x=ca*rx,z=sa*rz;
        if(kind==='torso'){
          // Paired pectoral volume, sternum, abdominals, lats and shoulder blades.
          const front=Math.max(0,sa)**5,back=Math.max(0,-sa)**5;
          z+=front*(.020*gauss(Math.abs(x),.105,.07)*gauss(y,.455,.085)-.008*gauss(x,0,.023)*gauss(y,.44,.16));
          z+=front*.010*gauss(Math.abs(x),.055,.055)*(gauss(y,.29,.04)+gauss(y,.21,.04));
          z-=back*.012*gauss(Math.abs(x),.10,.055)*gauss(y,.43,.13);
        }else if(kind==='head'){
          z+=Math.max(0,sa)**12*(.009*gauss(y,.825,.035)+.006*gauss(y,.77,.025));
        }
        positions.push(cx+x,y,cz+z);uv.push(k/radial,(y-(kind==='head'?.70:kind==='torso'?-.08:sections[0].y))/(kind==='head'?.30:kind==='torso'?.78:sections[sections.length-1].y-sections[0].y||1));
      }
    }
    const row=radial+1;
    for(let j=0;j<steps;j++)for(let k=0;k<radial;k++){const a=j*row+k,b=a+1,c=a+row,d=c+1;
      // Sections are ordered bottom to top; outward winding.
      indices.push(a,c,b,b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const sec=(rows)=>rows.map(([y,rx,rz,cz=0])=>({y,rx,rz,cz}));
  function eye(side,inset){
    const shape=new THREE.Shape(),points=[[.020,.856],[.044,.866],[.104,.889],[.101,.85],[.079,.815],[.044,.814],[.027,.833]];
    const cx=.063,cy=.85,k=inset?.81:1;
    const p=points.map(([x,y])=>[(cx+(x-cx)*k)*side,cy+(y-cy)*k]);
    shape.moveTo(...p[0]);for(let i=1;i<p.length;i++)shape.lineTo(...p[i]);shape.closePath();
    const g=new THREE.ShapeGeometry(shape,12),v=g.attributes.position;
    for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i);v.setZ(i,.014+.111*Math.sqrt(Math.max(.06,1-(x/.119)**2-((y-.851)/.155)**2))+(inset?.005:.001));}
    g.computeVertexNormals();return g;
  }
  // The authored head read a full head too large and egg-like against the
  // shoulders. Rather than re-deriving the section table (and desyncing the
  // eyes, which are authored in absolute head coordinates), scale head AND
  // eyes together about the neck-top pivot so they stay registered.
  const HEAD_PIVOT=0.700, HEAD_K=0.885;
  const shrinkHead=(g)=>{g.translate(0,-HEAD_PIVOT,0);g.scale(HEAD_K,HEAD_K,HEAD_K);g.translate(0,HEAD_PIVOT,0);return g;};
  GAME.buildDesktopParts=function(){
    const p=[],add=(geo,slot,lock,chain)=>p.push({geo,slot,lock,chain});
    add(surface(sec([[-.08,.158,.108],[-.02,.161,.11],[.09,.151,.105],[.19,.147,.108],[.31,.166,.118],[.43,.212,.133],[.49,.229,.132],[.55,.213,.115],[.595,.182,.096],[.635,.094,.077],[.70,.056,.056]]),0,'torso'),'torso',null,['hips','spine','neckHead']);
    add(surface(sec([[-.18,.117,.086],[-.12,.159,.104],[-.05,.164,.113],[.015,.158,.11]]),0,'hips'),'secondary',null,['hips','spine']);
    add(shrinkHead(surface(sec([[.692,.050,.057,.007],[.726,.064,.067,.013],[.755,.082,.084,.014],[.792,.103,.103,.013],[.844,.117,.113,.008],[.9,.112,.11,.003],[.949,.084,.085,0],[.974,.047,.052,0],[.985,.002,.003,0]]),0,'head')),'mask','neckHead');
    for(const side of [-1,1]){
      add(shrinkHead(eye(side,false)),'rim','neckHead');add(shrinkHead(eye(side,true)),'lens','neckHead');
      const sh=side>0?'shoulderR':'shoulderL',el=side>0?'elbowR':'elbowL',hip=side>0?'hipR':'hipL',knee=side>0?'kneeR':'kneeL';
      add(surface(sec([[.28,.046,.046],[.35,.062,.063,-.006],[.43,.071,.077,-.002],[.51,.079,.083],[.563,.088,.081],[.600,.082,.077],[.626,.058,.056]]),side*.215,'arm'),'sleeves',null,[sh,el]);
      add(surface(sec([[.015,.034,.035],[.07,.042,.043],[.17,.057,.059],[.23,.053,.052],[.28,.046,.046]]),side*.215,'arm'),'primary',null,[sh,el]);
      // Anatomical palms, individual curled fingers and a separate thumb.
      const hand=new THREE.SphereGeometry(1,20,14);hand.scale(.043,.058,.025);hand.translate(side*.215,-.025,.008);add(hand,'primary',el);
      for(let f=0;f<4;f++){const g=new THREE.CapsuleGeometry(.010, .035+(f===1?.007:0),4,8);g.rotateX(-.25);g.translate(side*.215+(f-1.5)*.019,-.081,.016);add(g,'primary',el);}
      const thumb=new THREE.CapsuleGeometry(.014,.042,4,8);thumb.rotateZ(side*.6);thumb.translate(side*.177,-.034,.012);add(thumb,'primary',el);
      add(surface(sec([[-.54,.054,.055,.009],[-.47,.057,.061,.013],[-.37,.072,.079,.004],[-.24,.088,.1,-.008],[-.14,.093,.101,-.011],[-.075,.084,.091,-.009]]),side*.10,'leg'),'secondary',null,[hip,knee]);
      add(surface(sec([[-.89,.036,.043,.002],[-.80,.045,.054,-.01],[-.68,.059,.075,-.019],[-.59,.061,.068,-.009],[-.53,.054,.055,.009]]),side*.1,'leg'),'accent',null,[hip,knee]);
      const foot=new THREE.SphereGeometry(1,24,16);foot.scale(.049,.036,.114);foot.translate(side*.1,-.918,.058);add(foot,'accent',knee);
    }
    return p;
  };
  GAME.desktopSuitMaps=function(name){
    GAME._suitMaps=GAME._suitMaps||{};if(GAME._suitMaps[name])return GAME._suitMaps[name];
    const def=GAME.SKINS[name], maps={};
    function spider(c,x,y,size,color){c.save();c.translate(x,y);c.scale(size,size);c.fillStyle=color;c.strokeStyle=color;c.lineWidth=3;c.lineCap='round';c.beginPath();c.ellipse(0,4,3,9,0,0,7);c.fill();c.beginPath();c.ellipse(0,-7,3.5,4,0,0,7);c.fill();for(const s of [-1,1])for(let i=0;i<4;i++){c.beginPath();c.moveTo(s*2,(i-1.5)*3);c.lineTo(s*(9+i%2*3),(i-1.5)*7);c.lineTo(s*(16-i), (i-1.5)*15);c.stroke();}c.restore();}
    for(const slot of ['torso','mask','sleeves']){
      const cv=document.createElement('canvas');cv.width=1024;cv.height=1024;const c=cv.getContext('2d');
      const base=def.torso.base,secondary='#'+def.secondary.color.toString(16).padStart(6,'0');
      c.fillStyle=base;c.fillRect(0,0,1024,1024);
      if(slot==='torso'){
        c.fillStyle=secondary;
        for(const u of [0,.5,1]){c.beginPath();c.moveTo((u-.13)*1024,0);c.lineTo((u+.13)*1024,0);c.lineTo((u+.11)*1024,550);c.quadraticCurveTo(u*1024,780,(u+.035)*1024,900);c.lineTo((u-.035)*1024,900);c.quadraticCurveTo(u*1024,780,(u-.11)*1024,550);c.fill();}
        // A continuous red belt and clean seam around the waist.
        c.fillStyle=base;c.fillRect(0,48,1024,72);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,45,1024,4);
      }else if(slot==='sleeves'){
        c.fillStyle=secondary;c.fillRect(0,0,1024,1024);c.fillStyle=base;c.fillRect(150,0,205,1024);c.fillRect(610,700,360,324);
      }
      if(def.torso.web||slot==='mask'&&name!=='noir'&&name!=='black'){
        // Denser and finer than the first pass: 18 radials at 1.8 px read as a
        // coarse net at close range. Real suit webbing is a fine dense mesh.
        c.strokeStyle=def.torso.web||'#252936';c.lineWidth=name==='og'?2.1:1.15;
        for(const center of [256,768]){
          const cy=slot==='mask'?565:500;
          for(let a=0;a<Math.PI*2;a+=Math.PI/17){c.beginPath();c.moveTo(center,cy);c.lineTo(center+Math.cos(a)*950,cy+Math.sin(a)*950);c.stroke();}
          for(let rad=30;rad<880;rad+=slot==='mask'?38:46){c.beginPath();c.ellipse(center,cy,rad*.7,rad,0,0,7);c.stroke();}
        }
      }
      if(slot==='torso')for(const [center,back] of [[256,false],[768,true]]){
        let emblem=def.torso.emblem||'#222';if(name==='classic'&&back)emblem='#171b24';
        const size=name==='black'?6:name==='iron'?4.8:name==='miles'?4.5:name==='og'?3.5:2.5;
        spider(c,center,680,back?size*1.35:size,emblem);
      }
      // NB: the fabric weave deliberately does NOT go in the albedo. Stroking
      // ~14k sub-pixel white lines here aliased under mipmapping into coarse
      // white speckle all over the suit. desktop-suits.js already supplies the
      // weave as a tiling BUMP map, which is where a textile micro-pattern
      // belongs — it reads as cloth without polluting the colour.
      if(name==='iron') {c.strokeStyle='#d5ae58';c.lineWidth=9;for(const x of [140,375,650,885]){c.beginPath();c.moveTo(x,0);c.lineTo(x+20,350);c.lineTo(x-25,700);c.lineTo(x,1024);c.stroke();}}
      const t=new THREE.CanvasTexture(cv);t.flipY=false;t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;maps[slot]=t;
    }return GAME._suitMaps[name]=maps;
  };
})();
