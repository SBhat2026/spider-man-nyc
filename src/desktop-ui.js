(function(){
  if(!GAME.desktop)return;
  const tagline=document.querySelector('#menu .tagline');tagline.innerHTML='Your city. Your responsibility. <span>Explore real Manhattan, answer street incidents, and discover the stories above the streets.</span>';
  document.querySelector('#menu .brand').textContent='Spider-Man • Manhattan patrol';
  document.querySelector('#optTime [data-v="sunset"]').textContent='Golden hour';
  document.getElementById('startBtn').textContent='Enter the city';
  const options=document.createElement('div');options.id='desktop-options';options.innerHTML=`
    <label>Graphics <select id="desktop-quality"><option value="balanced">Balanced · 1.5× resolution</option><option value="high">High · 2× resolution</option></select></label>
    <label><input type="checkbox" id="desktop-bloom" checked> Cinematic lighting</label>
    <label><input type="checkbox" id="desktop-motion"> Reduced camera motion</label>
    <button id="desktop-incidents" type="button">Street incidents: on</button>`;
  document.getElementById('startBtn').before(options);
  document.getElementById('desktop-quality').value=GAME.quality;
  const controls=document.createElement('p');controls.className='desktop-controls';controls.innerHTML='<b>Street combat</b> J strike · L web · H dodge · U parry · V suit power · O finisher<br><b>I</b> travel to an incident · <b>,</b> next music track · <b>Esc</b> menu';
  document.getElementById('controls').prepend(controls);
  const hud=document.createElement('div');hud.id='patrol-hud';hud.innerHTML=`
    <section class="vitals"><div class="patrol-suit"></div><div class="health-row"><span>Health</span><strong id="health-value">100</strong></div><div class="meter"><i id="health-fill"></i></div>
    <div class="health-row focus-label"><span>Focus <small>O · finisher at 50</small></span><strong id="focus-value">0</strong></div><div class="meter focus"><i id="focus-fill"></i></div>
    <div id="suit-power"></div><div id="web-charge"></div></section>
    <section class="incident"><div id="incident-title">Manhattan patrol</div><div id="incident-detail">I · Respond to a street incident</div><div id="combo-count"></div></section>
    <div class="combat-keys"><kbd>J</kbd> Strike <kbd>L</kbd> Web <kbd>H</kbd> Dodge <kbd>U</kbd> Parry <kbd>V</kbd> Power <kbd>Esc</kbd> Menu</div>
    <div id="now-playing"></div></div>`;
  document.body.appendChild(hud);
  let elapsed=0,lastSkin='';
  GAME.updateDesktopUI=function(dt,playing){
    hud.hidden=!playing;elapsed+=dt;if(elapsed<.1||!playing)return;elapsed=0;
    const c=GAME.combat,skin=GAME.settings.skin,def=GAME.SUIT_COMBAT[skin];
    if(lastSkin!==skin){hud.querySelector('.patrol-suit').textContent=GAME.SKINS[skin].label;lastSkin=skin;}
    hud.querySelector('.vitals').hidden=!c||!GAME.combatEnabled;
    hud.querySelector('.combat-keys').hidden=!c||!GAME.combatEnabled;
    if(c&&GAME.combatEnabled){
      document.getElementById('health-value').textContent=Math.ceil(c.health);document.getElementById('health-fill').style.width=c.health+'%';
      document.getElementById('focus-value').textContent=Math.floor(c.focus);document.getElementById('focus-fill').style.width=c.focus+'%';
      const cd=c.powerCd[skin]||0;document.getElementById('suit-power').textContent='V · '+def.name+(cd>0?' · '+Math.ceil(cd)+'s':' · Ready');
      document.getElementById('web-charge').textContent='Web shots '+c.webs+'/6'+(skin==='miles'?' • Camouflage '+Math.round(c.camoEnergy*100)+'%':'');
      document.getElementById('combo-count').textContent=c.combo>1?c.combo+' hit combo':'';
      const incident=c.target?.inc;document.getElementById('incident-title').textContent=incident?incident.name+' • Street incident':'Manhattan patrol';
      document.getElementById('incident-detail').textContent=incident?(c.enemies.filter(e=>e.inc===incident&&!e.dead).length+' opponents • Yellow windup → red: parry'):(c.completed+'/'+c.incidents.length+' neighborhoods secured • I to respond');
    }else{document.getElementById('incident-title').textContent='Free roam';document.getElementById('incident-detail').textContent='Swing, explore, and find the city’s secrets.';document.getElementById('combo-count').textContent='';}
    document.getElementById('now-playing').textContent=GAME.audio?.muted?'':(GAME.audio?.trackTitle?'♫ '+GAME.audio.trackTitle+' · , next':'');
  };
  GAME.combatEnabled=GAME.feature('combat');
  GAME.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('desktop-motion').checked=GAME.reducedMotion;
  document.getElementById('desktop-incidents').disabled=!GAME.Combat;
  document.getElementById('desktop-incidents').addEventListener('click',()=>{GAME.combatEnabled=!GAME.combatEnabled;document.getElementById('desktop-incidents').textContent='Street incidents: '+(GAME.combatEnabled?'on':'off');if(GAME.combat)GAME.combat.group.visible=GAME.combatEnabled;});
  document.getElementById('desktop-bloom').addEventListener('change',e=>{if(GAME.presentation)GAME.presentation.enabled=e.target.checked;});
  document.getElementById('desktop-motion').addEventListener('change',e=>{GAME.reducedMotion=e.target.checked;});
  document.getElementById('desktop-quality').addEventListener('change',e=>{
    GAME.quality=e.target.value;const d=GAME.debug;if(!d)return;
    d.renderer.setPixelRatio(Math.min(devicePixelRatio,GAME.quality==='high'?2:1.5));d.renderer.setSize(innerWidth,innerHeight);
    d.rig.sun.shadow.mapSize.setScalar(GAME.quality==='high'?4096:2048);
    if(d.rig.sun.shadow.map){d.rig.sun.shadow.map.dispose();d.rig.sun.shadow.map=null;}
    if(GAME.presentation)GAME.presentation.resize();
  });
})();
