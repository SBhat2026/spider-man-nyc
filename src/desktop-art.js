// Original Spider-Man poster compositions rendered from this game's own rig.
// Each poster combines an authored character pose with a drawn Manhattan skyline.
(function () {
  if (!GAME.desktop) return;
  let portraits;
  const themes = [
    ['classic', '#102f55', '#f8b363', 'YOUR FRIENDLY', 'NEIGHBORHOOD', 'NEW YORK HAS A FRIEND'],
    ['miles', '#231938', '#ff4564', 'BROOKLYN', 'RISING', 'A NEW GENERATION'],
    ['iron', '#162b43', '#dfb66d', 'STARK', 'EXPO', 'TOMORROW STARTS HERE'],
    ['noir', '#191b20', '#bac5c7', 'AFTER', 'MIDNIGHT', 'THE CITY NEVER SLEEPS'],
    ['og', '#591a2b', '#f0ceb0', 'WITH GREAT', 'RESPONSIBILITY', 'A NEW YORK ORIGINAL'],
    ['y2099', '#121c43', '#4bd9f0', 'BEYOND', 'TOMORROW', 'ALCHEMAX · 2099'],
    ['black', '#181e2a', '#9fb1cb', 'THE OTHER', 'SIDE', 'AN ORIGINAL MIDNIGHT FEATURE'],
    ['tasm', '#193b4b', '#f0c98e', 'AMAZING', 'NEW YORK', 'LOOK UP. ANYTHING IS POSSIBLE.'],
    ['upgraded', '#202a33', '#ed6672', 'HOME IS', 'HERE', 'FIVE BOROUGHS. ONE HERO.'],
  ];
  const brands = [
    ['OSCORP', 'The future is human', '#0e423a', '#acdfc7'],
    ['F.E.A.S.T.', 'A neighborhood that cares', '#c26432', '#fff0c8'],
    ['DAILY BUGLE', 'Who watches the city?', '#a71d30', '#fff5e5'],
    ['NELSON & MURDOCK', 'Justice. For everyone.', '#22304b', '#e4c9a1'],
    ['MIDNIGHT IN MANHATTAN', 'A new Broadway musical', '#16283c', '#f2d58c'],
    ['ROXXON', 'Powering your tomorrow', '#bb411d', '#f3e4d1'],
    ['EMPIRE STATE UNIVERSITY', 'Make your next discovery', '#132e55', '#d7c394'],
    ['ALIAS INVESTIGATIONS', 'We find the truth', '#311d43', '#cdc2e2'],
  ];
  function fit(c, text, width, size, face) {
    c.font = `900 ${size}px ${face || 'Arial, sans-serif'}`;
    while(c.measureText(text).width>width && size>8) c.font=`900 ${--size}px ${face || 'Arial, sans-serif'}`;
  }
  function heroRenders() {
    if (portraits) return portraits;
    portraits={}; const saved=GAME.settings.skin;
    const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    r.setSize(640,800);r.outputEncoding=THREE.sRGBEncoding;
    r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.2;
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(36,.8,.1,30);
    scene.add(new THREE.HemisphereLight(0xc8e1ff,0x34243b,1.2));
    const key=new THREE.DirectionalLight(0xffd4a0,2.3);key.position.set(3,5,5);scene.add(key);
    const rim=new THREE.DirectionalLight(0x669eff,2.5);rim.position.set(-3,2,-4);scene.add(rim);
    const hero=new GAME.Hero();hero.addTo(scene);
    themes.forEach(([skin], i)=>{
      hero.setSkin(skin);hero.body.quaternion.identity();hero.root.rotation.set(0,0,0);
      hero._pose={};hero._poseV={};
      const p={shRx:-2.8,shRz:-.27,elRx:-.3,shLx:-.7,shLz:1.1,elLx:-1.15,
        hipRx:-1.1,hipLx:.3,kneeRx:1.5,kneeLx:.6,hipRz:-.2,hipLz:.18,
        spineX:.13,spineZ:-.13,headX:-.15,headY:.15,bodyY:0};
      if(i%3===1)Object.assign(p,{shRx:-.9,shRz:-1.2,shLx:-2.2,elLx:-.4,hipLx:-1.0,kneeLx:1.5,hipRx:.5,kneeRx:.45});
      if(skin==='noir')Object.assign(p,{shRx:-.6,elRx:-.7,shLx:-.7,elLx:-.65,hipRx:-1.45,hipLx:-.8,kneeRx:1.7,kneeLx:1.3,spineX:.4});
      hero._applyPose(p,0);hero.body.rotation.z=i%2?.18:-.22;
      camera.position.set(2.3,1.9,4.8);camera.lookAt(0,1.05,0);
      if(hero.cloak) { hero.cloak.setActive(skin==='noir');
        for(let k=0;k<35;k++){hero.root.updateMatrixWorld(true);hero.cloak.update(.016,hero.bones.shoulderL.getWorldPosition(new THREE.Vector3()),hero.bones.shoulderR.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0,-1),new THREE.Vector3(4,0,1));}}
      r.render(scene,camera);
      const cv=document.createElement('canvas');cv.width=640;cv.height=800;cv.getContext('2d').drawImage(r.domElement,0,0);portraits[skin]=cv;
    });
    const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());r.dispose();r.forceContextLoss();
    GAME.settings.skin=saved;
    return portraits;
  }
  function skyline(c,w,h,color,seed) {
    c.fillStyle=color;
    for(let i=0;i<24;i++){const x=i*w/22,bw=w/22+2,bh=h*(.08+((i*37+seed*19)%23)/90);
      c.fillRect(x,h-bh,bw,bh);if(i%4===0)c.fillRect(x+bw*.45,h-bh-h*.05,bw*.1,h*.05);
      c.fillStyle='rgba(255,227,169,.25)';for(let y=h-bh+8;y<h;y+=10)for(let dx=4;dx<bw-2;dx+=6)if((y+dx+i)%3)c.fillRect(x+dx,y,2,3);c.fillStyle=color;}
  }
  function poster(c,w,h,index) {
    const th=themes[index%themes.length], portrait=h>w;
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,th[1]);g.addColorStop(1,th[2]);c.fillStyle=g;c.fillRect(0,0,w,h);
    // Paper-print halftone and a broad light shaft behind the silhouette.
    c.fillStyle='rgba(255,255,255,.075)';for(let y=0;y<h;y+=7)for(let x=0;x<w;x+=7){c.beginPath();c.arc(x,y,1,0,6.3);c.fill();}
    c.fillStyle='rgba(255,240,211,.18)';c.beginPath();c.moveTo(w*.55,0);c.lineTo(w,0);c.lineTo(w*.2,h);c.lineTo(0,h);c.fill();
    skyline(c,w,h,th[1],index);
    const img=heroRenders()[th[0]], size=portrait?w*1.27:h*.91;
    const ih=size*1.25, ix=portrait?(w-size)/2:w*.51, iy=portrait?h*.22:h*.03;
    if(th[0]==='classic'||th[0]==='og'){
      c.strokeStyle='#dce8ea';c.lineWidth=Math.max(1,w*.002);
      c.beginPath();c.moveTo(ix+size*.42,iy+ih*.18);c.lineTo(w*.56,-10);c.stroke();
    }
    c.drawImage(img,ix,iy,size,ih);
    const left=w*.06, ty=portrait?h*.085:h*.31, textWidth=portrait?w*.88:w*.55;
    c.textAlign='left';c.textBaseline='middle';c.fillStyle='#fff2de';
    fit(c,th[3],textWidth,h*(portrait?.08:.18));c.fillText(th[3],left,ty);
    fit(c,th[4],textWidth,h*(portrait?.08:.18));c.fillText(th[4],left,ty+h*(portrait?.085:.18));
    c.fillStyle='rgba(8,14,24,.86)';c.fillRect(0,h*.91,w,h*.09);
    c.fillStyle='#f5e2c4';fit(c,th[5],w*.88,h*.035);c.fillText(th[5],left,h*.955);
  }
  function brand(c,w,h,index){
    const a=brands[index%brands.length];c.fillStyle=a[2];c.fillRect(0,0,w,h);
    c.strokeStyle=a[3];c.globalAlpha=.25;c.lineWidth=2;
    for(let i=0;i<8;i++){c.beginPath();c.ellipse(w*.74,h*.48,w*(.10+i*.03),h*.38,Math.PI/5,0,6.3);c.stroke();}c.globalAlpha=1;
    if(index%8===4)skyline(c,w,h,'#080f20',index);
    c.textAlign='left';c.textBaseline='middle';c.fillStyle=a[3];fit(c,a[0],w*.86,h*.23);c.fillText(a[0],w*.07,h*.42);
    fit(c,a[1],w*.86,h*.10,'Georgia, serif');c.fillText(a[1],w*.07,h*.64);
    c.font=`${h*.045}px Arial`;c.fillText('NEW YORK CITY',w*.07,h*.9);
  }
  GAME.desktopAdAtlas=function(portrait){
    const cols=portrait?8:4,rows=portrait?4:8,cw=portrait?256:512,ch=portrait?512:256;
    const cv=document.createElement('canvas');cv.width=cols*cw;cv.height=rows*ch;
    const c=cv.getContext('2d');
    for(let i=0;i<32;i++){c.save();c.translate(i%cols*cw,Math.floor(i/cols)*ch);c.beginPath();c.rect(0,0,cw,ch);c.clip();
      if(i<18)poster(c,cw,ch,i);else brand(c,cw,ch,i-18);c.restore();}
    const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;
    return {tex,cols,rows,count:32};
  };
})();
