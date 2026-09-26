// Deterministic physically shaded atlases. No runtime network dependencies.
(function () {
  if (!GAME.desktop) return;
  const cache = {};
  function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
  function texture(c, color) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (color) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  GAME.desktopTexture = function (kind) {
    if (cache[kind]) return cache[kind];
    const n = 1024, cv = canvas(n), ec = canvas(n), bc = canvas(n), rc = canvas(n);
    const c = cv.getContext('2d'), e = ec.getContext('2d'), b = bc.getContext('2d'), r = rc.getContext('2d');
    let seed = 1747 + kind.length * 291;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    c.fillStyle = kind === 'roof' ? '#737678' : kind === 'glass' ? '#71858d' : '#c0b9ad'; c.fillRect(0,0,n,n);
    e.fillStyle = '#000'; e.fillRect(0,0,n,n);
    b.fillStyle = '#aaa'; b.fillRect(0,0,n,n);
    r.fillStyle = kind === 'glass' ? '#687078' : '#ddd'; r.fillRect(0,0,n,n);
    if (kind === 'roof') {
      c.fillStyle = '#858a8c'; c.fillRect(0,0,n,n);
      for (let i=0;i<23000;i++) {
        const x=rnd()*n,y=rnd()*n,v=115+rnd()*75;
        c.fillStyle=`rgba(${v},${v},${v},.22)`; c.fillRect(x,y,1+rnd()*3,1+rnd()*3);
      }
      for (let i=0;i<4;i++) {
        c.fillStyle='#303738';c.fillRect(i*256,0,3,n);
        c.fillStyle='rgba(160,170,175,.2)';c.fillRect(i*256+3,0,2,n);
        b.fillStyle='#777';b.fillRect(i*256,0,4,n);
      }
    } else {
      if (kind !== 'glass') {
        const brick = kind !== 'stone', bh = brick ? 16 : 64, bw = brick ? 48 : 128;
        for(let y=0;y<n;y+=bh) for(let x=-bw;x<n;x+=bw) {
          const v=164+rnd()*55, off=((y/bh)%2)*bw/2;
          c.fillStyle=`rgb(${v},${v-5},${v-12})`;c.fillRect(x+off+1,y+1,bw-2,bh-2);
          b.fillStyle=`rgb(${150+rnd()*40|0},${150},${150})`;b.fillRect(x+off+1,y+1,bw-2,bh-2);
        }
      }
      if (kind !== 'blank') {
        const cols = kind === 'glass' ? 8 : 4, rows = 8, cw=n/cols, ch=n/rows;
        for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
          const glass=kind==='glass', x=col*cw+(glass?3:47), y=row*ch+(glass?7:19);
          const w=cw-(glass?6:94), h=ch-(glass?26:40);
          if(!glass) {
            c.fillStyle='#7a7975';c.fillRect(x-7,y-6,w+14,h+14);
            c.fillStyle='#dad5c7';c.fillRect(x-9,y+h+4,w+18,6);
            b.fillStyle='#dedede';b.fillRect(x-8,y-6,w+16,h+16);
          }
          const gr=c.createLinearGradient(x,y,x+w,y+h);
          const v=72+rnd()*35;
          gr.addColorStop(0,`rgb(${v+20},${v+35},${v+43})`); gr.addColorStop(.6,`rgb(${v},${v+12},${v+18})`);
          gr.addColorStop(1,'#50616a');c.fillStyle=gr;c.fillRect(x,y,w,h);
          b.fillStyle='#333';b.fillRect(x,y,w,h);r.fillStyle=glass?'#48535b':'#737d83';r.fillRect(x,y,w,h);
          if(rnd()<.32) {
            const blind=h*(.15+rnd()*.6);c.fillStyle='rgba(163,154,138,.38)';c.fillRect(x,y,w,blind);
          }
          // Interior lights leave unlit bays, blinds and mullions readable.
          if(rnd()<.28) {
            e.fillStyle=rnd()<.75?'#e7bd88':'#9fbac6';e.fillRect(x+3,y+3,w-6,h-6);
            e.fillStyle='#13110e'; e.fillRect(x+w*.47,y,w*.06,h);
            if(rnd()<.5) e.fillRect(x,y+h*.6,w,h*.1);
          }
          c.fillStyle='#333b40';c.fillRect(x+w*.49,y,2,h);
          if(!glass) c.fillRect(x,y+h*.5,w,3);
          if(glass) { c.fillStyle='#343f48';c.fillRect(col*cw,row*ch+ch-19,cw,19); }
          // A little grime beneath sills, all within the repeating tile.
          if(!glass) { const g=c.createLinearGradient(x,y+h+9,x,y+ch);g.addColorStop(0,'rgba(31,30,25,.2)');g.addColorStop(1,'rgba(31,30,25,0)');c.fillStyle=g;c.fillRect(x,y+h+9,w,18); }
        }
      }
      for(let i=0;i<14000;i++) { const v=rnd()<.5?0:255;c.fillStyle=`rgba(${v},${v},${v},.025)`;c.fillRect(rnd()*n,rnd()*n,1,1); }
    }
    return cache[kind]={map:texture(cv,true),emissiveMap:texture(ec,true),bumpMap:texture(bc,false),roughnessMap:texture(rc,false)};
  };
})();
