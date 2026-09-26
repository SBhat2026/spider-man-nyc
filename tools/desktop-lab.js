const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('view'),antialias:true});renderer.setPixelRatio(1.5);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const scene=new THREE.Scene();scene.background=new THREE.Color('#263342');scene.add(new THREE.HemisphereLight(0xd6e4fa,0x494035,1));
for(const [color,intensity,x,y,z] of [[0xffe0c6,2,3,4,4],[0x80bfff,1,-3,2,-3],[0xffffff,.4,-2,1,3]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);}
const camera=new THREE.PerspectiveCamera(29,1,.01,50);camera.position.set(0,1.13,4.9);camera.lookAt(0,1,0);
const hero=new GAME.Hero();hero.addTo(scene);let rotate=false,clock=0,last=performance.now();
const suits=document.getElementById('suit');Object.entries(GAME.SKINS).forEach(([key,s])=>suits.add(new Option(s.label,key)));suits.onchange=()=>hero.setSkin(suits.value);hero.setSkin('classic');
document.getElementById('turn').onclick=()=>rotate=!rotate;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.03,(now-last)/1000);last=now;clock+=dt;const mode=document.getElementById('pose').value;
 const c=mode==='idle'||mode==='swing'?null:{kind:mode,t:(clock%.95),duration:.95,chain:3};
 hero.update({mode:mode==='swing'?'swing':'ground',pos:new THREE.Vector3(),vel:new THREE.Vector3(0,0,mode==='swing'?20:0),speed:mode==='swing'?20:0,vy:0,anchor:mode==='swing'?new THREE.Vector3(0,15,12):null,dt,yaw:0,combat:c});
 hero.root.rotation.y=rotate?clock*.55:0;if(suits.value==='iron'&&mode==='power')hero.waldoReach();
 const cv=renderer.domElement;if(cv.width!==Math.round(cv.clientWidth*1.5)||cv.height!==Math.round(cv.clientHeight*1.5)){renderer.setSize(cv.clientWidth,cv.clientHeight,false);camera.aspect=cv.clientWidth/cv.clientHeight;camera.updateProjectionMatrix();}
 renderer.render(scene,camera);
}requestAnimationFrame(frame);
function assert(ok,msg){if(!ok)throw Error(msg);}
document.getElementById('tests').onclick=()=>{
 const result=[],test=(name,f)=>{try{f();result.push('PASS '+name);}catch(e){result.push('FAIL '+name+': '+e.message);}};
 const keep=GAME.settings.skin,sceneTest=new THREE.Scene(),city={zone:{roads:[]},isSolid:()=>false};
 let c,p,cam;
 function fresh(skin='classic'){GAME.settings.skin=skin;c=new GAME.Combat(city,sceneTest,{ll:()=>({x:0,z:0})});c.incidents=[];p={pos:new THREE.Vector3(0,.28,0),vel:new THREE.Vector3(),mode:'ground',keys:{},hero,respawn(){this.pos.set(0,20,0);}};cam=new THREE.PerspectiveCamera();cam.position.set(0,2,-5);cam.lookAt(0,1,5);return c;}
 function enemy(dist=2,brute=false){const inc={x:0,z:dist,dx:1,dz:0,name:'Fixture'};c._spawn(inc);const e=c.enemies[0];c.enemies.slice(1).forEach(n=>{n.dead=true;n.hp=0;});e.pos.set(0,.28,dist);e.attackCd=10;e.brute=brute;e.hp=e.maxHp=brute?115:75;return e;}
 function step(n=1){for(let i=0;i<n;i++)c.update(1/60,p,cam);}
 test('Every suit: finite geometry, normalized skin weights and distinct mask textures',()=>{const maps=new Set();for(const skin of GAME.SKIN_ORDER){hero.setSkin(skin);maps.add(hero.slots.mask[0].material.map.uuid);for(const meshes of Object.values(hero.slots))for(const m of meshes){assert([...m.geometry.attributes.position.array].every(Number.isFinite),skin+' NaN position');const w=m.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-4,skin+' invalid weights');}}assert(maps.size===9,'missing suit map');});
 test('Strike deals damage only at the contact frame',()=>{fresh();const e=enemy();assert(c.input('strike',p,cam),'rejected');step(9);assert(e.hp===75,'early damage');step(4);assert(e.hp===55,'missing contact');c.dispose();});
 test('Three strikes complete a kick combo and build focus',()=>{fresh();const e=enemy(2,true);for(let i=0;i<3;i++){assert(c.input('strike',p,cam),'strike rejected');step(36);}assert(c.metrics.hits===3,'hit count');assert(e.air>0||e.vy>0,'no launcher');assert(c.focus===24,'focus');c.dispose();});
 test('Timed parry breaks an attacking guard without health loss',()=>{fresh();const e=enemy();e.state='windup';e.timer=.68;e.attackCd=0;c.input('parry',p,cam);step(9);assert(c.health===100&&c.metrics.parries===1,'parry failed');assert(e.stun>2,'no stun');c.dispose();});
 test('Late parry cannot erase already received damage',()=>{fresh();const e=enemy();e.state='windup';e.timer=.79;step(2);assert(c.health===90,'expected impact');c.input('parry',p,cam);assert(c.health===90,'healed');c.dispose();});
 test('Dodge protects its opening frames and has a cooldown',()=>{fresh();const e=enemy();e.state='windup';e.timer=.74;c.input('dodge',p,cam);step(6);assert(c.health===100,'dodge took damage');assert(!c.input('dodge',p,cam),'cooldown bypass');c.dispose();});
 test('Three web shots restrain the target and spend charges',()=>{fresh();const e=enemy();for(let i=0;i<3;i++){assert(c.input('web',p,cam),'web rejected');step(22);}assert(e.webT>4,'no restraint');assert(c.webs===3,'incorrect charges');assert(c.metrics.webbed===1,'metric');c.dispose();});
 test('Finisher requires focus and defeats an opponent nonlethally',()=>{fresh();const e=enemy();assert(!c.input('finisher',p,cam),'free finisher');c.focus=50;assert(c.input('finisher',p,cam),'finisher rejected');step(35);assert(e.dead&&e.web.visible,'not restrained');assert(c.metrics.finishers===1,'metric');c.dispose();});
 test('All nine suit powers activate and enforce individual cooldowns',()=>{for(const skin of GAME.SKIN_ORDER){fresh(skin);enemy(5,true);assert(c.input('power',p,cam),skin+' no activation');assert(c.powerCd[skin]>0,skin+' missing cooldown');c.action=null;assert(!c.input('power',p,cam),skin+' bypassed cooldown');c.dispose();}});
 test('Miles camouflage drains, visibly fades and stays depleted until released',()=>{fresh('miles');hero.setSkin('miles');p.keys.k=1;step(30);assert(c.concealed&&hero.slots.mask[0].material.opacity<1,'no camo');step(400);assert(c.camoDepleted&&!c.concealed,'depletion oscillates');p.keys.k=0;step(20);assert(!c.camoDepleted&&hero.slots.mask[0].material.opacity===1,'not restored');c.dispose();});
 test('Motion and target selection respect walls',()=>{fresh();enemy(5);city.isSolid=(x,y,z)=>z>1&&z<4;assert(!c.choose(p,cam,24),'target through wall');assert(!c.move(p.pos,new THREE.Vector3(0,0,6))&&p.pos.z<1,'crossed wall');city.isSolid=()=>false;c.dispose();});
 test('Defeat returns the player to safety with restored health',()=>{fresh();c.health=0;c.defeatT=.02;step(3);assert(c.health===100&&p.pos.y===20,'respawn');c.dispose();});
 hero.setSkin(keep);suits.value=keep;document.getElementById('results').textContent=result.join('\n')+'\n'+result.filter(s=>s.startsWith('PASS')).length+'/'+result.length+' passed';
};
