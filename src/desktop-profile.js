// Loaded immediately after config: mobile retains the original profile.
(function () {
  if (GAME.isMobile) return;
  GAME.desktop = true;
  document.documentElement.classList.add('desktop-edition');
  const q = new URLSearchParams(location.search);
  GAME.quality = q.get('quality') === 'high' ? 'high' : 'balanced';
  GAME.FEATURES.combat = !q.has('combat') || !['0', 'false'].includes(q.get('combat'));
  Object.assign(GAME.GFX, { shadowMap: GAME.quality === 'high' ? 4096 : 2048,
    pixelRatio: GAME.quality === 'high' ? 2 : 1.5, envMapSize: 128,
    crowdMax: 210, pigeonFlocks: 16, cityDrawDist: 5600 });
  Object.assign(GAME.CAM, { dist: 5.8, height: 1.25, fov: 64, rollMax: 0.075 });
  Object.assign(GAME.LIGHT.sunset, {
    sunElevation: 15 * Math.PI / 180, sunColor: 0xffc68b, sunIntensity: 2.05,
    hemiSky: 0x9ebbd5, hemiGround: 0x414047, hemiIntensity: 0.75,
    fogColor: 0xbbadb0, fogNear: 550, fogFar: 5900,
    skyZenith: 0x395c85, skyHorizon: 0xc4a69b, skyHorizonLow: 0xf5c994,
    windowGlow: 0.52, cloudColor: 0xebc1a5, cloudOpacity: 0.24,
    sunDisc: 0xffebc8, sunGlow: 0xffb872,
  });
  Object.assign(GAME.LIGHT.day, { sunIntensity: 1.8, hemiIntensity: 0.82,
    fogColor: 0xb8cedd, skyZenith: 0x38678e, cloudOpacity: 0.3 });
  Object.assign(GAME.LIGHT.night, { hemiSky: 0x344867, hemiIntensity: 0.6,
    sunIntensity: 0.44, fogColor: 0x101a29, skyHorizon: 0x263c55,
    windowGlow: 1.05, cloudOpacity: 0.1 });
})();
