(()=>{
"use strict";
const $=id=>document.getElementById(id),canvas=$("game");
const gl=canvas.getContext("webgl",{antialias:false,alpha:false,depth:true,powerPreference:"high-performance"});
if(!gl){$("webglError").style.display="flex";return;}
const vsrc="attribute vec3 p;attribute vec3 c;uniform mat4 vp;uniform vec3 eye;varying vec3 col;varying float fog;void main(){gl_Position=vp*vec4(p,1.);col=c;fog=clamp((distance(p.xz,eye.xz)-100.)/640.,0.,.9);}";
const fsrc="precision mediump float;varying vec3 col;varying float fog;void main(){gl_FragColor=vec4(mix(col,vec3(.74,.86,.94),fog),1.);}";
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vsrc));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fsrc));gl.linkProgram(prog);
if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){$("webglError").style.display="flex";$("webglError").textContent="Błąd shadera: "+gl.getProgramInfoLog(prog);return;}
gl.useProgram(prog);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
const P=gl.getAttribLocation(prog,"p"),C=gl.getAttribLocation(prog,"c"),VP=gl.getUniformLocation(prog,"vp"),EYE=gl.getUniformLocation(prog,"eye");
const col={white:[.93,.975,1],fresh:[.98,1,1],snow:[.78,.90,.97],snow2:[.67,.83,.93],far:[.62,.79,.86],forest:[.7,.85,.89],forest2:[.58,.76,.83],darkpine:[.045,.31,.28],pine:[.08,.41,.36],pine2:[.14,.49,.41],trunk:[.39,.29,.25],steel:[.51,.63,.72],metal:[.32,.43,.52],orange:[.99,.43,.22],red:[.78,.19,.20],gold:[1,.77,.29],blue:[.14,.42,.68],wood:[.53,.34,.26],roof:[.31,.47,.56],glass:[.65,.85,.94],ski:[.98,.76,.21],black:[.13,.22,.34]};
const center=z=>52*Math.sin(z/220)+21*Math.sin(z/92)+6*Math.sin(z/36),width=z=>36+4*Math.sin(z/140);
const height=(x,z)=>250-.195*z+.00075*(x-center(z))**2+5*Math.sin(z/121)+2*Math.cos(z/50)+1.5*Math.sin(z/23+x/120);
let seed=1971;function rand(){seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;}
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function unit(v){let k=Math.hypot(...v)||1;return v.map(q=>q/k);}
function tri(o,a,b,c,color){
  const n=unit(cross(sub(b,a),sub(c,a))),d=clip(.72+Math.max(0,n[0]*.25+n[1]*.8-n[2]*.25)*.28,.58,1.08);
  for(const p of [a,b,c])o.push(p[0],p[1],p[2],...color.map(q=>clip(q*d,0,1)));
}
function quad(o,a,b,c,d,color){tri(o,a,b,c,color);tri(o,a,c,d,color);}
function box(o,x,y,z,w,h,d,color){
 let a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y+h,z-d/2],f=[x-w/2,y+h,z-d/2],
 e=[x-w/2,y,z+d/2],g=[x+w/2,y,z+d/2],j=[x+w/2,y+h,z+d/2],k=[x-w/2,y+h,z+d/2];
 quad(o,a,b,c,f,color);quad(o,g,e,k,j,color);quad(o,e,a,f,k,color);quad(o,b,g,j,c,color);quad(o,f,c,j,k,color);quad(o,e,g,b,a,color);
}
function bar(o,a,b,r,color){
 const forward=unit(sub(b,a)),side=unit(cross(forward,[0,0,1])),up=unit(cross(forward,side));
 const p=(q,s,t)=>[q[0]+side[0]*s+up[0]*t,q[1]+side[1]*s+up[1]*t,q[2]+side[2]*s+up[2]*t];
 const A=[p(a,-r,-r),p(a,r,-r),p(a,r,r),p(a,-r,r)],B=[p(b,-r,-r),p(b,r,-r),p(b,r,r),p(b,-r,r)];
 for(let i=0;i<4;i++)quad(o,A[i],A[(i+1)%4],B[(i+1)%4],B[i],color);
}
function pine(o,x,z,s){
 let y=height(x,z)-.3;box(o,x,y,z,1.1*s,5*s,1.1*s,col.trunk);
 for(let l=0;l<3;l++){let base=y+(2.3+4*l)*s,tip=base+8.3*s,r=(6-l*1.45)*s;
 for(let k=0;k<5;k++){let a=k*Math.PI*2/5,b=(k+1)*Math.PI*2/5;
 tri(o,[x+r*Math.cos(a),base,z+r*Math.sin(a)],[x+r*Math.cos(b),base,z+r*Math.sin(b)],[x,tip,z],(l+k)%3?col.pine:col.pine2);
 if(k%2===0)tri(o,[x+r*.83*Math.cos(a),base+1.1*s,z+r*.83*Math.sin(a)],[x+r*.83*Math.cos(b),base+1.1*s,z+r*.83*Math.sin(b)],[x,tip+.1*s,z],col.white);
 }}
}
function building(o,x,z,size){
 const y=height(x,z);
 box(o,x,y,z,size*1.6,size*.78,size,col.wood);
 box(o,x,y+size*.2,z+size*.505,size*.95,size*.28,.2,col.glass);
 const w=size*.95,roofY=y+size*.78,h=size*.67,d=size*.65;
 tri(o,[x-w,roofY,z-d],[x+w,roofY,z-d],[x,roofY+h,z-d],col.roof);
 tri(o,[x+w,roofY,z+d],[x-w,roofY,z+d],[x,roofY+h,z+d],col.roof);
 quad(o,[x-w,roofY,z-d],[x,roofY+h,z-d],[x,roofY+h,z+d],[x-w,roofY,z+d],col.white);
 quad(o,[x,roofY+h,z-d],[x+w,roofY,z-d],[x+w,roofY,z+d],[x,roofY+h,z+d],col.snow);
}
const terrain=[];
function makeWorld(){
 const step=15;
 for(let z=-175;z<1680;z+=step)for(let x=-315;x<315;x+=step){
  let xx=x+step,zz=z+step,dist=Math.abs(x+step/2-center(z+step/2));
  let road=dist<width(z+step/2)+6;
  const color=road?col.fresh:((Math.floor(x/step)+Math.floor(z/step))%5===0?col.forest2:col.forest);
  quad(terrain,[x,height(x,z),z],[xx,height(xx,z),z],[xx,height(xx,zz),zz],[x,height(x,zz),zz],color);
 }
 // Raised piste and groomer tracks
 for(let z=0;z<1600;z+=12){
  let zz=z+12,ww=width(z),WW=width(zz),a=center(z),b=center(zz);
  quad(terrain,[a-ww,height(a-ww,z)+.24,z],[a+ww,height(a+ww,z)+.24,z],[b+WW,height(b+WW,zz)+.24,zz],[b-WW,height(b-WW,zz)+.24,zz],Math.floor(z/12)%4===0?col.fresh:col.white);
  for(let t of [-.8,-.45,-.1,.25,.60]){let x=a+ww*t,X=b+WW*t;
  quad(terrain,[x-.17,height(x,z)+.3,z],[x+.17,height(x,z)+.3,z],[X+.17,height(X,zz)+.3,zz],[X-.17,height(X,zz)+.3,zz],col.snow);
  }
 }
 for(let z=-95;z<1550;z+=14)for(let side of [-1,1])for(let i=0;i<3;i++){
  let zz=z+(rand()-.5)*27,x=center(zz)+side*(width(zz)+22+rand()*178);
  if(rand()<.83)pine(terrain,x,zz,.63+rand()*.7);
 }
 for(let i=0;i<150;i++){let z=rand()*1540,x=center(z)+(rand()<.5?-1:1)*(width(z)+18+rand()*200);box(terrain,x,height(x,z)-1,z,2+rand()*6,2+rand()*2,2+rand()*6,col.roof);}
 // Fixed lift infrastructure
 for(let z=130;z<1510;z+=190){
  let x=center(z)+106,y=height(x,z);
  bar(terrain,[x-4,y,z],[x-4,y+28,z],.8,col.metal);
  bar(terrain,[x+4,y,z],[x+4,y+28,z],.8,col.metal);
  bar(terrain,[x-10,y+27,z],[x+10,y+27,z],.7,col.steel);
 }
 for(let z=115;z<1500;z+=18){
  let zz=z+18,x=center(z)+106,X=center(zz)+106;
  bar(terrain,[x-5,height(x,z)+30,z],[X-5,height(X,zz)+30,zz],.13,col.metal);
  bar(terrain,[x+5,height(x,z)+30,z],[X+5,height(X,zz)+30,zz],.13,col.metal);
 }
 for(let z=40;z<1520;z+=34)for(let side of [-1,1]){
  let x=center(z)+side*(width(z)+3),y=height(x,z);
  bar(terrain,[x,y,z],[x,y+3.7,z],.18,col.orange);
 }
 building(terrain,center(520)+90,520,24);
 building(terrain,center(1180)-90,1180,22);
 building(terrain,center(1410)+96,1410,28);
 building(terrain,center(95)+120,95,18);
}
makeWorld();
function buffer(data,type){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),type);return b;}
const staticBuffer=buffer(terrain,gl.STATIC_DRAW),dynamicBuffer=gl.createBuffer(),staticCount=terrain.length/6;
const stars=Array.from({length:12},(_,i)=>{let z=110+i*110;return {x:center(z)+(i%3-1)*9,z,got:false};});
const S={x:center(16),z:16,v:12,lean:0,stars:0,time:0,mode:"menu",buttons:{left:false,right:false,brake:false},camera:[0,295,-40],target:[0,240,70],messageTime:0};
function perspective(a,n,f){let t=1/Math.tan(Math.PI/6.5);return [t/a,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0];}
function lookAt(e,t){const z=unit(sub(e,t)),x=unit(cross([0,1,0],z)),y=cross(z,x);
return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x[0]*e[0]-x[1]*e[1]-x[2]*e[2],-y[0]*e[0]-y[1]*e[1]-y[2]*e[2],-z[0]*e[0]-z[1]*e[1]-z[2]*e[2],1];}
function mult(a,b){let o=Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o;}
function begin(){S.x=center(16);S.z=16;S.v=12;S.lean=0;S.stars=0;S.time=0;stars.forEach(s=>s.got=false);$("stars").textContent="★ 0";S.camera=[S.x,height(S.x,16)+50,-30];S.target=[S.x,height(S.x,16)+5,85];}
function mode(m){S.mode=m;$("overlay").style.display=m==="play"?"none":"flex";$("pause").textContent=m==="pause"?"▶":"Ⅱ";}
function toast(msg){$("hint").textContent=msg;$("hint").classList.add("show");S.messageTime=1.7;}
function start(){if(S.mode==="pause"){mode("play");return;}begin();mode("play");toast("JAZDA!");}
function pause(){if(S.mode==="play"){$("title").textContent="PAUZA";$("description").textContent="Kontynuuj zjazd na trasie. Skręcaj i hamuj przyciskami na ekranie.";$("start").textContent="▶ KONTYNUUJ";mode("pause");}else if(S.mode==="pause")mode("play");}
$("start").onclick=start;$("pause").onclick=pause;
for(let name of ["left","right","brake"]){const el=$(name);el.addEventListener("pointerdown",e=>{e.preventDefault();S.buttons[name]=true;el.classList.add("held");try{el.setPointerCapture(e.pointerId);}catch(_){} });for(let type of ["pointerup","pointercancel","lostpointercapture"])el.addEventListener(type,e=>{e.preventDefault();S.buttons[name]=false;el.classList.remove("held");});}
addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowDown"," ","a","d","A","D","Escape"].includes(e.key))e.preventDefault();
if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")S.buttons.left=true;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")S.buttons.right=true;if(e.key===" "||e.key==="ArrowDown")S.buttons.brake=true;if(e.key==="Escape")pause();});
addEventListener("keyup",e=>{if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")S.buttons.left=false;if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")S.buttons.right=false;if(e.key===" "||e.key==="ArrowDown")S.buttons.brake=false;});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&S.mode==="play")pause();});
function update(dt){
 S.time+=dt;if(S.messageTime>0){S.messageTime-=dt;if(S.messageTime<=0)$("hint").classList.remove("show");}
 if(S.mode!=="play")return;
 const steer=Number(S.buttons.right)-Number(S.buttons.left),off=Math.abs(S.x-center(S.z))>width(S.z);
 let slope=(height(S.x,S.z)-height(S.x,S.z+2))/2;
 S.v=clip(S.v+(5.8+slope*9-.02*S.v*S.v-(S.buttons.brake?18:0)-(off?8:0))*dt,3.5,25);
 S.z+=S.v*dt;S.x+=steer*S.v*.9*dt+(center(S.z)-S.x)*.17*dt;S.lean+=(steer-S.lean)*Math.min(1,dt*6);
 for(const star of stars)if(!star.got&&Math.abs(star.z-S.z)<5&&Math.abs(star.x-S.x)<5){star.got=true;S.stars++;$("stars").textContent="★ "+S.stars;toast("★ GWIAZDKA");}
 $("speed").innerHTML=Math.round(S.v*3.6)+' <span>km/h</span>';$("meters").textContent=Math.max(0,Math.min(1400,Math.floor(S.z-16)))+' / 1400 m';
 $("progressFill").style.width=clip((S.z-16)/1400*100,0,100)+'%';
 if(S.z>=1416){$("title").textContent="META! 🏁";$("description").textContent="Trasa ukończona! Gwiazdki: "+S.stars+" / 12.";$("start").textContent="↻ JESZCZE RAZ";mode("finish");}
}
function player(o){
 const x=S.x,z=S.z,y=height(x,z),lean=S.lean;
 for(let side of [-1,1]){box(o,x+side*.75,y+.02,z+.35,.32,.24,4.3,col.ski);box(o,x+side*.73,y+.33,z,.58,.7,1.25,col.black);box(o,x+side*.74-lean*.13,y+.65,z-.2,.58,1.6,.68,col.blue);}
 box(o,x-lean*.27,y+2.3,z-.2,2.35,2.3,1.15,col.red);
 box(o,x-lean*.46,y+4.52,z-.12,1.3,1.12,1.13,col.black);
 box(o,x-lean*.46,y+4.75,z+.5,1.15,.4,.20,col.glass);
 for(let side of [-1,1]){box(o,x+side*1.45-lean*.24,y+2.8,z-.2,.6,1.65,.7,col.red);bar(o,[x+side*1.8,y+2,z],[x+side*2.3,y+.2,z+1.5],.12,col.black);}
}
function dynamics(o){
 for(let i=0;i<11;i++){let z=130+(i*125+S.time*5)%1280;if(Math.abs(z-S.z)>590)continue;
 let x=center(z)+106+(i%2?5:-5),y=height(x,z)+29;
 bar(o,[x,y+2,z],[x,y-1,z],.18,col.black);
 box(o,x,y-7.2,z,5.5,6,5.5,i%2?col.orange:col.red);
 box(o,x,y-5.9,z+2.85,4.8,3.2,.22,col.glass);
 box(o,x,y-1.3,z,6.2,.7,5.9,col.roof);
 }
 for(let star of stars){if(star.got||star.z<S.z-12||star.z>S.z+300)continue;
 let y=height(star.x,star.z)+5+Math.sin(S.time*3+star.z)*.5,scale=2.9;
 for(let i=0;i<10;i++){let a=i*Math.PI/5,b=(i+1)*Math.PI/5,r=i%2?scale*.48:scale,R=(i+1)%2?scale*.48:scale;
 tri(o,[star.x,y,star.z],[star.x+Math.cos(a)*r,y+Math.sin(a)*r,star.z],[star.x+Math.cos(b)*R,y+Math.sin(b)*R,star.z],col.gold);}
 }
 for(let z=Math.floor((S.z+260)/112)*112;z>S.z-5;z-=112){
 const i=Math.round(z/112),x=center(z)+(i%4-2)*12,y=height(x,z);
 box(o,x,y+.4,z,1.0,2.4,.9,i%2?col.orange:col.blue);box(o,x,y+2.8,z,.9,.9,.9,col.black);
 }
 player(o);
}
function resize(){const scale=innerWidth<800?.70:.84,dpr=Math.min(devicePixelRatio||1,1.4),w=Math.max(260,Math.floor(innerWidth*scale*dpr)),h=Math.max(200,Math.floor(innerHeight*scale*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);}
function draw(buf,count){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.vertexAttribPointer(P,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(C,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(P);gl.enableVertexAttribArray(C);gl.drawArrays(gl.TRIANGLES,0,count);}
let prev=0;
function render(time){
 let dt=clip(prev?(time-prev)/1000:1/60,0,.045);prev=time;resize();update(dt);
 const y=height(S.x,S.z),want=[S.x-2+S.lean*1.8,y+48,S.z-45],at=[S.x,y+5,S.z+37];
 for(let i=0;i<3;i++){S.camera[i]+=(want[i]-S.camera[i])*Math.min(1,dt*4.7);S.target[i]+=(at[i]-S.target[i])*Math.min(1,dt*4.7);}
 const view=lookAt(S.camera,S.target),mat=mult(perspective(canvas.width/canvas.height,.5,1300),view);
 gl.clearColor(.48,.72,.86,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniformMatrix4fv(VP,false,new Float32Array(mat));gl.uniform3fv(EYE,new Float32Array(S.camera));
 draw(staticBuffer,staticCount);const moving=[];dynamics(moving);
 gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(moving),gl.DYNAMIC_DRAW);draw(dynamicBuffer,moving.length/6);
 requestAnimationFrame(render);
}
begin();requestAnimationFrame(render);
window.__SMR_DEBUG__={get:()=>({version:"0.2.0",mode:S.mode,renderer:"Native WebGL 3D",distance:S.z,speed:S.v,stars:S.stars,vertices:staticCount}),start};
})();