(function(){
  if(!GAME.desktop)return;
  class DesktopRender{
    constructor(renderer){
      this.renderer=renderer;this.enabled=true;
      const options={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,encoding:THREE.LinearEncoding};
      this.sceneRT=new THREE.WebGLRenderTarget(1,1,{...options,depthBuffer:true});
      this.a=new THREE.WebGLRenderTarget(1,1,{...options,depthBuffer:false});this.b=this.a.clone();
      this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
      const vertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
      this.blur=new THREE.ShaderMaterial({vertexShader:vertex,depthTest:false,depthWrite:false,uniforms:{image:{value:null},direction:{value:new THREE.Vector2()},extract:{value:0}},fragmentShader:`
        varying vec2 vUv;uniform sampler2D image;uniform vec2 direction;uniform float extract;
        vec3 read(vec2 uv){vec3 c=texture2D(image,uv).rgb;return mix(c,max(c-vec3(.72),vec3(0.)),extract);}
        void main(){vec3 c=read(vUv)*.227027;c+=(read(vUv+direction*1.384615)+read(vUv-direction*1.384615))*.316216;
          c+=(read(vUv+direction*3.230769)+read(vUv-direction*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`});
      this.grade=new THREE.ShaderMaterial({vertexShader:vertex,depthTest:false,depthWrite:false,uniforms:{image:{value:this.sceneRT.texture},bloom:{value:this.a.texture},strength:{value:.35},damage:{value:0}},fragmentShader:`
        varying vec2 vUv;uniform sampler2D image;uniform sampler2D bloom;uniform float strength;uniform float damage;
        void main(){vec3 c=texture2D(image,vUv).rgb+texture2D(bloom,vUv).rgb*strength;
          c=(c-.5)*1.035+.5;vec2 q=vUv*(1.-vUv);float vignette=pow(clamp(q.x*q.y*16.,0.,1.),.13);
          c*=mix(.85,1.,vignette);float edge=1.-smoothstep(.2,.72,length(vUv-.5));c=mix(c,vec3(.5,.025,.04),damage*(1.-edge)*.5);
          gl_FragColor=vec4(clamp(c,0.,1.),1.);
          #include <encodings_fragment>}`});
      this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.grade);this.scene.add(this.quad);this.resize();
    }
    resize(){const s=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.sceneRT.setSize(s.x,s.y);this.a.setSize(Math.max(1,s.x>>2),Math.max(1,s.y>>2));this.b.setSize(this.a.width,this.a.height);}
    render(scene,camera){
      const r=this.renderer;if(!this.enabled){r.setRenderTarget(null);r.render(scene,camera);GAME.sceneCost={calls:r.info.render.calls,tris:r.info.render.triangles};return;}
      r.setRenderTarget(this.sceneRT);r.render(scene,camera);
      // Save the actual scene cost before the fullscreen passes replace info.
      GAME.sceneCost={calls:r.info.render.calls,tris:r.info.render.triangles};
      this.quad.material=this.blur;this.blur.uniforms.image.value=this.sceneRT.texture;this.blur.uniforms.extract.value=1;this.blur.uniforms.direction.value.set(1/this.a.width,0);r.setRenderTarget(this.b);r.render(this.scene,this.camera);
      this.blur.uniforms.image.value=this.b.texture;this.blur.uniforms.extract.value=0;this.blur.uniforms.direction.value.set(0,1/this.a.height);r.setRenderTarget(this.a);r.render(this.scene,this.camera);
      this.quad.material=this.grade;this.grade.uniforms.damage.value=GAME.combat?.damageFlash||0;
      this.grade.uniforms.strength.value=GAME.settings.time==='night'?.65:.26;
      r.setRenderTarget(null);r.render(this.scene,this.camera);
    }
  }
  GAME.DesktopRender=DesktopRender;
})();
