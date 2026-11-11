/* SnowEngine 1.2 — original WebGL2 renderer, no third-party 3D engine. */
(function(){
"use strict";
const M={
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;},
 perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),o=new Float32Array(16);
  o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o;},
 ortho(left,right,bottom,top,near,far){const o=new Float32Array(16);
  o[0]=2/(right-left);o[5]=2/(top-bottom);o[10]=-2/(far-near);o[12]=-(right+left)/(right-left);
  o[13]=-(top+bottom)/(top-bottom);o[14]=-(far+near)/(far-near);o[15]=1;return o;},
 lookAt(eye,target,up=[0,1,0]){
  const unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const f=unit(target.map((v,i)=>v-eye[i])),s=unit(cross(f,up)),u=cross(s,f);
  return new Float32Array([s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,
  -s.reduce((n,v,i)=>n+v*eye[i],0),-u.reduce((n,v,i)=>n+v*eye[i],0),f.reduce((n,v,i)=>n+v*eye[i],0),1]);
 }
};
const VS="#version 300 es\nprecision highp float;\nlayout(location=0) in vec3 aPos;\nlayout(location=1) in vec3 aNormal;\nlayout(location=2) in vec3 aColor;\nlayout(location=3) in vec4 aInstance;\nuniform mat4 uViewProj;uniform mat4 uLightVP;uniform float uInstances;uniform vec3 uOffset;\nout vec3 vColor;out vec3 vNormal;out vec3 vWorld;out vec4 vShadow;\nvoid main(){vec3 p=aPos,n=aNormal;if(uInstances>.5){float angle=fract(aInstance.x*.017+aInstance.z*.011)*6.283185,c=cos(angle),s=sin(angle);p=vec3((c*aPos.x-s*aPos.z)*aInstance.w+aInstance.x,aPos.y*aInstance.w+aInstance.y,(s*aPos.x+c*aPos.z)*aInstance.w+aInstance.z);n=vec3(c*aNormal.x-s*aNormal.z,aNormal.y,s*aNormal.x+c*aNormal.z);}p+=uOffset;vColor=aColor;vNormal=normalize(n);vWorld=p;vShadow=uLightVP*vec4(p,1.);gl_Position=uViewProj*vec4(p,1.);}";
const FS="#version 300 es\nprecision highp float;\nin vec3 vColor;in vec3 vNormal;in vec3 vWorld;in vec4 vShadow;\nuniform vec3 uCamera;uniform vec3 uSun;uniform vec3 uFog;uniform float uShadowOn;uniform sampler2D uShadow;\nout vec4 frag;\nfloat vis(){if(uShadowOn<.5)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;vec2 texel=1./vec2(textureSize(uShadow,0));float sum=0.;float bias=.0016;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){sum+=p.z-bias<texture(uShadow,p.xy+vec2(float(x),float(y))*texel).r?1.:0.;}return sum/9.;}\nvoid main(){vec3 n=normalize(vNormal);float sun=max(0.,dot(n,normalize(uSun)));vec3 color=vColor*(.47+.54*sun*mix(.42,1.,vis()))*vec3(1.00,.955,1.035);if(vColor.r>.6&&vColor.g>.6&&n.y>.38){float groom=.014*sin(vWorld.x*.94+vWorld.z*.27);float grain=.022*sin(vWorld.x*.041+vWorld.z*.18)*sin(vWorld.z*.07);color*=1.+groom+grain;}float d=length(vWorld-uCamera);float fog=clamp(1.-exp(-.00000026*d*d),0.,.65);color=mix(color,uFog,fog);color=pow(max(color,vec3(.001)),vec3(.95));frag=vec4(color,1.);}";
const DVS="#version 300 es\nprecision highp float;\nlayout(location=0) in vec3 aPos;layout(location=3) in vec4 aInstance;uniform mat4 uLightVP;uniform float uInstances;uniform vec3 uOffset;\nvoid main(){vec3 p=aPos;if(uInstances>.5){float angle=fract(aInstance.x*.017+aInstance.z*.011)*6.283185,c=cos(angle),s=sin(angle);p=vec3((c*aPos.x-s*aPos.z)*aInstance.w+aInstance.x,aPos.y*aInstance.w+aInstance.y,(s*aPos.x+c*aPos.z)*aInstance.w+aInstance.z);}gl_Position=uLightVP*vec4(p+uOffset,1.);}";
const DFS="#version 300 es\nprecision highp float;\nvoid main(){}";
class SnowEngine{
 constructor(canvas){
  const gl=canvas.getContext("webgl2",{alpha:false,antialias:true,powerPreference:"high-performance",depth:true});
  if(!gl)throw Error("WebGL2 is required");
  this.gl=gl;this.canvas=canvas;this.shapes=[];this.drawn=0;this.frame=0;
  const mobile=/Android|Mobile|iPhone/i.test(navigator.userAgent);
  this.pixelScale=mobile?Math.min(devicePixelRatio||1,1.25):Math.min(devicePixelRatio||1,1.5);
  this.shadowSize=mobile?768:1536;
  this.colorProgram=this.program(VS,FS);this.depthProgram=this.program(DVS,DFS);
  this.shadowDepth=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowDepth);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.shadowFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowDepth,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  this.shadowReady=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  this.sun=[-.57,.83,.38];this.fog=[.78,.78,.85];
 }
 program(vs,fs){
  const gl=this.gl,compile=(kind,src)=>{const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error("GLSL "+gl.getShaderInfoLog(sh));return sh;};
  const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error("Link "+gl.getProgramInfoLog(p));
  gl.deleteShader(v);gl.deleteShader(f);return p;
 }
 mesh(name,shape,instances=null,castsShadow=true){
  const gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);let instanceBuffer=null;
  for(const [i,vals] of [shape.positions,shape.normals,shape.colors].entries()){
   const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vals),gl.STATIC_DRAW);
   gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0);
  }
  if(instances&&instances.length){
   const buf=gl.createBuffer();instanceBuffer=buf;gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(instances),gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(3,1);
  }
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(shape.indices),gl.STATIC_DRAW);gl.bindVertexArray(null);
  const object={name,vao,count:shape.indices.length,instanceCount:instances?instances.length/4:0,castsShadow,visible:true,offset:[0,0,0],instanceBuffer};
  this.shapes.push(object);return object;
 }
 updateInstances(mesh,instances){if(!mesh.instanceBuffer)throw Error("Not instanced");const gl=this.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(instances),gl.DYNAMIC_DRAW);
  mesh.instanceCount=instances.length/4;
 }
 resize(){const w=Math.round(this.canvas.clientWidth*this.pixelScale),h=Math.round(this.canvas.clientHeight*this.pixelScale);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}}
 draw(program,shadowOnly){
  const gl=this.gl,u=gl.getUniformLocation(program,"uInstances"),off=gl.getUniformLocation(program,"uOffset");
  for(const mesh of this.shapes){if(!mesh.visible||(shadowOnly&&!mesh.castsShadow))continue;
   gl.bindVertexArray(mesh.vao);gl.uniform1f(u,mesh.instanceCount?1:0);gl.uniform3fv(off,mesh.offset);
   if(!mesh.instanceCount)gl.vertexAttrib4f(3,0,0,0,1);
   if(mesh.instanceCount)gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,gl.UNSIGNED_INT,0,mesh.instanceCount);
   else gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_INT,0);
  }gl.bindVertexArray(null);
 }
 render(camera,target){
  const gl=this.gl;this.resize();const vp=M.mul(M.perspective(this.canvas.height>this.canvas.width?.98:.70,this.canvas.width/Math.max(1,this.canvas.height),.5,2600),M.lookAt(camera,target));
  const lightCenter=target,eye=[target[0]+this.sun[0]*440,target[1]+this.sun[1]*440,target[2]+this.sun[2]*440];
  const light=M.mul(M.ortho(-400,400,-400,400,20,1250),M.lookAt(eye,lightCenter));
  if(this.shadowReady){
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFBO);gl.viewport(0,0,this.shadowSize,this.shadowSize);
   gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);gl.colorMask(false,false,false,false);
   gl.useProgram(this.depthProgram);gl.uniformMatrix4fv(gl.getUniformLocation(this.depthProgram,"uLightVP"),false,light);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2,2);this.draw(this.depthProgram,true);
   gl.disable(gl.POLYGON_OFFSET_FILL);gl.colorMask(true,true,true,true);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);
  gl.clearColor(.78,.78,.85,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.colorProgram);const loc=n=>gl.getUniformLocation(this.colorProgram,n);
  gl.uniformMatrix4fv(loc("uViewProj"),false,vp);gl.uniformMatrix4fv(loc("uLightVP"),false,light);
  gl.uniform3fv(loc("uCamera"),camera);gl.uniform3fv(loc("uSun"),this.sun);gl.uniform3fv(loc("uFog"),this.fog);
  gl.uniform1f(loc("uShadowOn"),this.shadowReady?1:0);gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,this.shadowDepth);gl.uniform1i(loc("uShadow"),0);
  this.draw(this.colorProgram,false);this.frame++;
 }
}
window.SnowEngine={SnowEngine,math:M,version:"1.2.0"};
})();