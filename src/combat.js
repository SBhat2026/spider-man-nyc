// Desktop-only optional street encounters. Timed contact frames, swept motion,
// and explicit state transitions are shared by gameplay and the test harness.
(function () {
  if(!GAME.desktop || !GAME.feature('combat'))return;
  const V=THREE.Vector3, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function actor(brute){
    const root=new THREE.Group(), body=new THREE.Group();root.add(body);
    const jacket=new THREE.MeshStandardMaterial({color:brute?0x644747:0x293b4a,roughness:.87});
    const pants=new THREE.MeshStandardMaterial({color:0x20232b,roughness:.9});
    const skin=new THREE.MeshStandardMaterial({color:brute?0x9e7159:0x91684e,roughness:.85});
    function mesh(g,m,x,y,z){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;body.add(a);return a;}
    mesh(new THREE.CylinderGeometry(.23,.19,.67,10),jacket,0,1.1,0);
    mesh(new THREE.SphereGeometry(.19,12,10),skin,0,1.62,.01);
    mesh(new THREE.SphereGeometry(.196,12,8,0,Math.PI*2,0,1.2),pants,0,1.64,.01);
    const limbs=[];
    for(const side of [-1,1]){
      for(const arm of [true,false]){
        const pivot=new THREE.Group();pivot.position.set(side*(arm?.28:.13),arm?1.35:.78,0);body.add(pivot);
        const segment=new THREE.Mesh(new THREE.CylinderGeometry(arm?.08:.1,arm?.067:.085,arm?.6:.7,8),arm?jacket:pants);
        segment.position.y=arm?-.29:-.35;pivot.add(segment);segment.castShadow=true;
        const tip=new THREE.Mesh(new THREE.SphereGeometry(arm?.085:.11,8,6),arm?skin:pants);
        tip.position.set(0,arm?-.6:-.71,arm?0:.07);pivot.add(tip);limbs.push(pivot);
      }
    }
    if(brute)root.scale.setScalar(1.17);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.4,.48,32),new THREE.MeshBasicMaterial({color:0xffcc59,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false}));
    ring.position.y=2.35;root.add(ring);
    const web=new THREE.Mesh(new THREE.SphereGeometry(.55,12,10),new THREE.MeshBasicMaterial({color:0xe0edf0,wireframe:true,transparent:true,opacity:.72}));web.scale.set(.75,1.4,.65);web.position.y=.95;web.visible=false;root.add(web);
    return {root,body,limbs,ring,web};
  }
  class Combat {
    constructor(city,scene,landmarks){
      this.city=city;this.scene=scene;this.group=new THREE.Group();scene.add(this.group);
      this.enemies=[];this.effects=[];this.health=100;this.focus=0;this.combo=0;this.comboT=0;this.webs=6;this.webRecharge=0;
      this.action=null;this.queued=false;this.invulnerable=0;this.dodgeCd=0;this.powerCd={};this.camoEnergy=1;this.concealed=false;this.smokeT=0;this.damageFlash=0;this.incidents=[];this.defeatT=0;this.completed=0;
      this.metrics={hits:0,parries:0,dodges:0,webbed:0,finishers:0};
      this._makeIncidents(landmarks);
      const geo=new THREE.RingGeometry(.7,.82,40);
      this.reticle=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xc8ecff,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));
      this.reticle.rotation.x=-Math.PI/2;this.group.add(this.reticle);this.reticle.visible=false;
    }
    _makeIncidents(lm){
      const spots=GAME.settings.zone==='fidi'?[[40.7074,-74.0113,'Financial District'],[40.7114,-74.0074,'City Hall'],[40.7042,-74.0107,'Stone Street']]:
        [[40.7580,-73.9855,'Times Square'],[40.7527,-73.9772,'Grand Central'],[40.7505,-73.9934,'Penn Station'],[40.7681,-73.9819,'Columbus Circle'],[40.7476,-73.9857,'Herald Square'],[40.7791,-73.9635,'Museum Mile']];
      for(const [lat,lon,name] of spots){
        const want=lm.ll(lat,lon);let best=null,bd=220*220;
        for(const road of this.city.zone.roads)for(let i=1;i<road.p.length;i++){
          const a=road.p[i-1],b=road.p[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<25||road.w<8)continue;
          const d=GAME.CityPlan.distToSeg(want.x,want.z,a[0],a[1],b[0],b[1]);
          const t=clamp(d.t,.18,.82),x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
          const dd=(x-want.x)**2+(z-want.z)**2;
          if(dd<bd&&!this.city.isSolid(x,1,z)){bd=dd;best={x,z,dx:(b[0]-a[0])/len,dz:(b[1]-a[1])/len};}
        }
        if(best)this.incidents.push({...best,name,cleared:false,spawned:false});
      }
    }
    travel(player){
      const inc=this.incidents.filter(i=>!i.cleared).sort((a,b)=>Math.hypot(a.x-player.pos.x,a.z-player.pos.z)-Math.hypot(b.x-player.pos.x,b.z-player.pos.z))[0];
      if(!inc){this.say('All street incidents resolved. The city is yours.');return false;}
      const x=inc.x-inc.dx*13,z=inc.z-inc.dz*13;
      player.pos.set(x,.28,z);player.vel.set(0,0,0);player.mode='ground';player.anchor=null;player.wall=null;player.ledgeHang=false;player.hanging=false;
      if(GAME.debug)GAME.debug.setCam(Math.atan2(-inc.dx,-inc.dz),.15);
      this.resetHealth();this.say(inc.name+' • Street incident. J strike · H dodge · U parry');return true;
    }
    resetHealth(){this.health=100;this.defeatT=0;this.action=null;this.combo=0;this.invulnerable=1;}
    say(s){if(GAME.notify)GAME.notify(s,3500);this.message=s;this.messageT=3.5;}
    _spawn(inc){
      inc.spawned=true;
      for(let i=0;i<4;i++){
        const along=(i-1.5)*3.2,side=(i%2?1:-1)*2;
        const pos=new V(inc.x+inc.dx*along-inc.dz*side,.28,inc.z+inc.dz*along+inc.dx*side);
        if(this.city.isSolid(pos.x,1,pos.z))continue;
        const brute=i===3,m=actor(brute);m.root.position.copy(pos);this.group.add(m.root);
        this.enemies.push({...m,pos,inc,brute,hp:brute?115:75,maxHp:brute?115:75,state:'idle',timer:1+i*.3,stun:0,webCount:0,webT:0,air:0,vy:0,phase:i,attackCd:i*.35,dead:false});
      }
    }
    distance(e,p){return e.pos.distanceTo(p.pos);}
    lineClear(a,b){const delta=b.clone().sub(a),len=delta.length(),steps=Math.max(1,Math.ceil(len/.7));for(let i=1;i<=steps;i++){const t=i/steps;if(this.city.isSolid(a.x+delta.x*t,a.y+1+delta.y*t,a.z+delta.z*t))return false;}return true;}
    choose(player,camera,range){
      const fwd=new V();camera.getWorldDirection(fwd);let best=null,score=Infinity;
      for(const e of this.enemies){if(e.dead||Math.abs(e.pos.y-player.pos.y)>4)continue;const d=this.distance(e,player);if(d>range||!this.lineClear(player.pos,e.pos))continue;
        const dir=e.pos.clone().sub(player.pos).normalize(),s=d+(1-dir.dot(fwd))*2.5;if(s<score){score=s;best=e;}}
      return best;
    }
    move(pos,delta){
      const len=delta.length(),steps=Math.max(1,Math.ceil(len/.3)),step=delta.clone().multiplyScalar(1/steps);
      for(let i=0;i<steps;i++){const n=pos.clone().add(step);if(this.city.isSolid(n.x,n.y+.8,n.z)||this.city.isSolid(n.x,n.y+.8,n.z+.45)||this.city.isSolid(n.x+.45,n.y+.8,n.z)||this.city.isSolid(n.x-.45,n.y+.8,n.z)||this.city.isSolid(n.x,n.y+.8,n.z-.45))return false;pos.copy(n);}return true;
    }
    input(kind,player,camera){
      if(this.defeatT>0 || player.mode==='crawl'||player.mode==='wallrun'||player.mode==='swing')return false;
      if(kind==='strike'&&this.action){if(this.action.kind==='strike'&&this.action.t>.14)this.queued=true;return false;}
      if(this.action&& !['dodge','parry'].includes(kind))return false;
      const target=this.choose(player,camera,kind==='web'?24:kind==='finisher'?7:9);
      if(kind==='strike'||kind==='finisher'||kind==='web'){
        if(!target){this.say('No opponent in reach — move closer or face the incident.');return false;}
        if(kind==='finisher'&&this.focus<50){this.say('Build 50 focus with strikes, webs and timed parries.');return false;}
        if(kind==='web'&&this.webs<1){this.say('Web shooters recharging');return false;}
      }
      if(kind==='dodge'){
        if(this.dodgeCd>0)return false;this.queued=false;this.dodgeCd=.7;this.invulnerable=.38;
        const fwd=new V();camera.getWorldDirection(fwd);fwd.y=0;fwd.normalize();const right=new V(-fwd.z,0,fwd.x),k=player.keys;
        const dir=fwd.multiplyScalar((k.w||0)-(k.s||0)).addScaledVector(right,(k.d||0)-(k.a||0));
        if(dir.lengthSq()<.1){if(target)dir.copy(player.pos).sub(target.pos);else dir.copy(right);}dir.y=0;dir.normalize();
        this.action={kind,t:0,duration:.42,chain:0,dir};this.metrics.dodges++;player.vel.multiplyScalar(.3);return true;
      }
      if(kind==='parry'){
        if(this.action?.kind==='parry')return false;this.queued=false;this.action={kind,t:0,duration:.48,chain:0};return true;
      }
      if(kind==='power')return this.power(player,camera);
      if(kind==='strike'){this.combo=this.comboT>0?this.combo+1:1;this.comboT=1.65;}
      const chain=kind==='strike'?(this.combo-1)%3+1:0;
      this.action={kind,t:0,duration:kind==='finisher'?.8:kind==='web'?.32:chain===3?.58:.42,chain,target,hit:false};
      if(kind==='web')this.webs--;if(kind==='finisher')this.focus-=50;
      player.yaw=Math.atan2(target.pos.x-player.pos.x,target.pos.z-player.pos.z);return true;
    }
    hit(e,damage,stun,player,breakGuard){
      if(e.dead)return;
      if(e.brute&&!breakGuard&&e.stun<=0&&e.webT<=0)damage*=.45;
      e.hp=Math.max(0,e.hp-damage);e.stun=Math.max(e.stun,stun);e.state='stunned';e.timer=0;e.attackCd=1.1;
      this.focus=clamp(this.focus+8,0,100);this.metrics.hits++;this.burst(e.pos.clone().add(new V(0,1.2,0)),0xffe0b2);
      if(GAME.audio)GAME.audio.impact(.35);if(GAME.camFx)GAME.camFx.shake=.28;
      if(e.hp<=0){e.dead=true;e.state='down';e.timer=0;e.web.visible=true;e.ring.visible=false;e.inc.cleared=this.enemies.filter(n=>n.inc===e.inc).every(n=>n.dead);
        if(e.inc.cleared){this.completed++;this.health=Math.min(100,this.health+25);this.say('Neighborhood secured • '+e.inc.name+' • +25 health');}}
    }
    power(player,camera){
      const skin=GAME.settings.skin,def=GAME.SUIT_COMBAT[skin];
      if((this.powerCd[skin]||0)>0){this.say(def.name+' recharging');return false;}
      const targets=this.enemies.filter(e=>!e.dead&&this.distance(e,player)<(skin==='tasm'?16:11)&&this.lineClear(player.pos,e.pos));
      if(!targets.length){this.say('Move closer to an incident to use '+def.name);return false;}
      this.powerCd[skin]=def.cd;this.action={kind:'power',t:0,duration:.7,chain:0};this.queued=false;this.invulnerable=.6;
      if(skin==='iron')player.hero.waldoReach();
      if(skin==='y2099'&&GAME.slowmo)GAME.slowmo(1.5);
      if(skin==='noir')this.smokeT=4;
      for(const e of targets){
        const web=['classic','tasm','upgraded','og'].includes(skin);
        if(web){e.webT=skin==='tasm'?6:4;e.webCount=3;this.tether(player.pos,e.pos,def.color);}
        if(skin==='black'||skin==='iron'||skin==='miles')this.tether(player.pos,e.pos,def.color,skin==='black');
        this.hit(e,skin==='black'?45:skin==='miles'?38:skin==='iron'?36:22,web?3:skin==='noir'?4:2.5,player,true);
        if(skin==='iron'){e.vy=5;e.air=.05;}
      }
      if(skin==='og')this.webs=6;if(skin==='upgraded')this.focus=Math.min(100,this.focus+15);
      this.ringEffect(player.pos,def.color,skin==='noir');this.say(def.name);return true;
    }
    burst(pos,color){
      const points=[];for(let i=0;i<18;i++)points.push((Math.random()-.5)*.65,(Math.random()-.5)*.65,(Math.random()-.5)*.65);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
      const m=new THREE.Points(g,new THREE.PointsMaterial({color,size:.07,transparent:true,depthWrite:false}));m.position.copy(pos);this.group.add(m);this.effects.push({m,t:0,life:.3,type:'spark'});
    }
    tether(a,b,color,thick){
      const start=a.clone().add(new V(0,1.2,0)),end=b.clone().add(new V(0,1,0)),mid=start.clone().lerp(end,.5);mid.y+=thick?2:.4;
      const curve=new THREE.QuadraticBezierCurve3(start,mid,end);
      const m=thick?new THREE.Mesh(new THREE.TubeGeometry(curve,12,.055,5,false),new THREE.MeshBasicMaterial({color:0x171921,transparent:true})):
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)),new THREE.LineBasicMaterial({color,transparent:true}));
      this.group.add(m);this.effects.push({m,t:0,life:thick?.55:.22,type:'line'});
    }
    ringEffect(pos,color,smoke){
      const m=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.position.y+=.14;this.group.add(m);this.effects.push({m,t:0,life:.7,type:'ring'});
      if(smoke)for(let i=0;i<12;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.8,8,6),new THREE.MeshBasicMaterial({color:0x777b82,transparent:true,opacity:.25,depthWrite:false}));s.position.copy(pos).add(new V(Math.sin(i)*3,.8+Math.random(),Math.cos(i)*3));this.group.add(s);this.effects.push({m:s,t:0,life:2,type:'smoke'});}
    }
    update(dt,player,camera){
      this.player=player;this.camera=camera;this.messageT=Math.max(0,(this.messageT||0)-dt);this.damageFlash=Math.max(0,this.damageFlash-dt*3);
      this.invulnerable=Math.max(0,this.invulnerable-dt);this.dodgeCd=Math.max(0,this.dodgeCd-dt);this.comboT=Math.max(0,this.comboT-dt);if(!this.comboT)this.combo=0;
      Object.keys(this.powerCd).forEach(k=>this.powerCd[k]=Math.max(0,this.powerCd[k]-dt));
      this.webRecharge+=dt;if(this.webRecharge>1.4){this.webRecharge=0;this.webs=Math.min(6,this.webs+1);}
      this.smokeT=Math.max(0,this.smokeT-dt);
      if(!player.keys.k)this.camoDepleted=false;
      const camo=GAME.settings.skin==='miles'&&player.keys.k&&!this.camoDepleted&&this.camoEnergy>.005;
      this.camoEnergy=clamp(this.camoEnergy+(camo?-.18:.09)*dt,0,1);if(this.camoEnergy<=.005)this.camoDepleted=true;this.concealed=!!camo||this.smokeT>0;
      if(player.hero)for(const meshes of Object.values(player.hero.slots))for(const m of meshes){
        const want=camo?.23:1;if(m.material.opacity!==want){m.material.opacity=want;m.material.transparent=!!camo;m.material.depthWrite=!camo;m.material.needsUpdate=true;}}

      if(this.defeatT>0){player.combatPose={kind:'hurt',t:.1,duration:.3,chain:0};this.defeatT-=dt;if(this.defeatT<=0){player.respawn();this.resetHealth();}return;}
      for(const inc of this.incidents)if(!inc.spawned&&!inc.cleared&&Math.hypot(inc.x-player.pos.x,inc.z-player.pos.z)<70)this._spawn(inc);
      this.target=this.choose(player,camera,24);this.engaged=!!this.target;
      this.reticle.visible=!!this.target;if(this.target){this.reticle.position.copy(this.target.pos);this.reticle.position.y=this.target.pos.y+.025;this.reticle.material.color.setHex(this.target.brute?0xffbd77:0xa9e9ff);}
      const a=this.action;
      if(a){a.t+=dt;
        if(a.kind==='dodge')this.move(player.pos,a.dir.clone().multiplyScalar(dt*11*Math.sin(Math.min(1,a.t/a.duration)*Math.PI)));
        if((a.kind==='strike'||a.kind==='finisher')&&a.target&&!a.target.dead){
          const d=this.distance(a.target,player);if(d>1.85&&a.t<.2){const delta=a.target.pos.clone().sub(player.pos);delta.y=0;delta.normalize().multiplyScalar(Math.min(d-1.8,dt*22));this.move(player.pos,delta);}
          player.yaw=Math.atan2(a.target.pos.x-player.pos.x,a.target.pos.z-player.pos.z);
        }
        const impactAt=a.kind==='web'?.09:a.kind==='finisher'?.42:.18;
        if(!a.hit&&a.t>=impactAt&&a.target){a.hit=true;const e=a.target;
          if(!e.dead&&this.lineClear(player.pos,e.pos)&&this.distance(e,player)<(a.kind==='web'?25:3.6)){
            if(a.kind==='web'){this.tether(player.pos,e.pos,0xe6f5ff);e.webCount++;e.stun=.4;
              if(e.webCount>=3){e.webT=5;this.metrics.webbed++;}this.hit(e,9,.4,player,e.webCount>=3);if(GAME.audio)GAME.audio.thwip();}
            else {const finish=a.kind==='finisher';this.hit(e,finish?200:a.chain===3?30:20,this.concealed?2:.5,player,finish||this.concealed||a.chain===3);
              if(finish){this.metrics.finishers++;this.invulnerable=.55;this.ringEffect(e.pos,0xd7efff);}
              else if(a.chain===3&&!e.dead){e.vy=6;e.air=.02;}}
          }else if(a.kind==='strike'){this.combo=0;this.queued=false;}
        }
        if(a.t>=a.duration){this.action=null;if(this.queued){this.queued=false;this.input('strike',player,camera);}}
      }
      let attackers=this.enemies.filter(e=>!e.dead&&e.state==='windup'&&e.stun<=0&&e.webT<=0).length;
      for(const e of this.enemies){
        const dist=this.distance(e,player);e.root.visible=dist<180;if(!e.root.visible)continue;
        if(e.dead){e.timer+=dt;e.body.rotation.z=THREE.MathUtils.lerp(e.body.rotation.z,1.3,Math.min(1,dt*5));e.body.position.y=-.2;e.web.visible=true;continue;}
        if(e.air>0||e.vy>0){e.vy-=9.81*dt;e.air=Math.max(0,e.air+e.vy*dt);if(e.air===0)e.vy=0;}
        e.root.position.copy(e.pos);e.root.position.y+=e.air;e.root.rotation.y=Math.atan2(player.pos.x-e.pos.x,player.pos.z-e.pos.z);
        e.ring.lookAt(camera.position);e.ring.material.opacity=0;e.webT=Math.max(0,e.webT-dt);e.stun=Math.max(0,e.stun-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.web.visible=e.webT>0;
        if(dist>32||Math.abs(player.pos.y-e.pos.y)>4){e.state='idle';e.timer=0;continue;}
        if(e.stun>0||e.webT>0){e.state='stunned';e.body.rotation.x=Math.sin(performance.now()*.025)*.06;continue;}
        e.body.rotation.x=0;
        if(this.concealed){e.state='idle';e.timer=0;continue;}
        if(e.state==='windup'){
          e.timer+=dt;const wind=e.brute?1.05:.8;
          e.ring.material.opacity=.85;e.ring.material.color.setHex(e.timer>wind-.23?0xff3b47:0xffd268);
          e.limbs[0].rotation.x=-1.4;e.limbs[2].rotation.x=-.6;e.body.rotation.x=-.15;
          if(e.timer>=wind){
            const parry=this.action?.kind==='parry'&&this.action.t<=.25;
            if(dist<3.4&&parry){e.stun=2.5;e.state='stunned';this.focus=Math.min(100,this.focus+20);this.metrics.parries++;this.burst(player.pos.clone().add(new V(0,1.5,0)),0x82e5ff);this.say('Perfect parry • Guard broken');}
            else if(dist<3.4&&this.invulnerable<=0){this.health=Math.max(0,this.health-(e.brute?18:10));this.combo=0;this.queued=false;this.invulnerable=.6;this.damageFlash=1;this.action={kind:'hurt',t:0,duration:.28,chain:0};
              if(GAME.camFx)GAME.camFx.shake=.6;if(GAME.audio)GAME.audio.impact(.55);
              if(this.health<=0){this.defeatT=2;this.say('Catch your breath. Returning to a safe rooftop.');player.vel.set(0,0,0);}}
            e.state='recover';e.timer=0;e.attackCd=1.25;
          }
        }else if(e.state==='recover'){e.timer+=dt;e.limbs[0].rotation.x=-1.7+e.timer*2.4;if(e.timer>.45)e.state='idle';}
        else {
          e.state='idle';if(dist>2.15){const delta=player.pos.clone().sub(e.pos);delta.y=0;delta.normalize().multiplyScalar(dt*(e.brute?2.0:3.1));
            // Separate nearby enemies without allowing motion through walls.
            for(const n of this.enemies)if(n!==e&&!n.dead&&n.pos.distanceTo(e.pos)<1.25)delta.addScaledVector(e.pos.clone().sub(n.pos).normalize(),dt*2);
            this.move(e.pos,delta);e.phase+=dt*7;e.limbs.forEach((l,i)=>l.rotation.x=Math.sin(e.phase+(i%2?Math.PI:0))*.36);
          }else if(e.attackCd<=0&&attackers<1){e.state='windup';e.timer=0;attackers++;}
        }
      }
      for(let i=this.effects.length-1;i>=0;i--){const fx=this.effects[i];fx.t+=dt;const u=fx.t/fx.life;fx.m.material.opacity=Math.max(0,(1-u)*(fx.type==='smoke'?.25:1));
        if(fx.type==='ring')fx.m.scale.setScalar(1+u*12);if(fx.type==='spark')fx.m.scale.setScalar(1+u*3);if(fx.type==='smoke'){fx.m.scale.setScalar(1+u*2);fx.m.position.y+=dt*.8;}
        if(u>=1){this.group.remove(fx.m);fx.m.geometry.dispose();fx.m.material.dispose();this.effects.splice(i,1);}}
      player.combatPose=this.action?{...this.action,engaged:this.engaged}:{engaged:this.engaged};
    }
    dispose(){this.scene.remove(this.group);const gs=new Set(),ms=new Set();this.group.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
  }
  GAME.Combat=Combat;
})();
