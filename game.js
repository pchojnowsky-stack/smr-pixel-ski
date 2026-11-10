/* SMR Pixel Ski 0.3 — original lightweight WebGL engine.
   Built for mobile; no dependencies. Procedural meshes and materials. */
(()=>{
'use strict';
const $=x=>document.getElementById(x),canvas=$('game');
let gl=canvas.getContext('webgl',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance'});
if(!gl){$('err').style.display='flex';$('err').textContent='Ta przeglądarka nie obsługuje WebGL. Otwórz grę w Chrome.';return;}
const shaderSrc={
 skyV:'attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}',
 skyF:'precision mediump float;varying vec2 uv;uniform float tm;void main(){vec3 bottom=vec3(.89,.947,1.);vec3 top=vec3(.36,.64,.91);vec3 color=mix(bottom,top,pow(uv.y,.86));float sun=1.-smoothstep(.04,.09,length((uv-vec2(.80,.89))*vec2(1.6,1.)));color=mix(color,vec3(1.,.95,.77),sun*.17);gl_FragColor=vec4(color,1.);}',

 worldV:'attribute vec3 p;attribute vec3 c;attribute vec3 n;uniform mat4 vp;uniform vec3 eye;varying vec3 col;varying float haze;varying vec3 normal;void main(){gl_Position=vp*vec4(p,1.);col=c;normal=n;float d=distance(eye,p);haze=clamp((d-320.)/1020.,0.,.74);}',
 worldF:'precision mediump float;varying vec3 col;varying float haze;varying vec3 normal;uniform vec3 fog;void main(){vec3 L=normalize(vec3(-.49,.83,-.37));float diff=max(0.,dot(normalize(normal),L));float light=.91+.12*abs(dot(normalize(normal),L));vec3 base=clamp(col*light,0.,1.);base=floor(base*30.+.5)/30.;gl_FragColor=vec4(mix(base,fog,haze),1.);}'
};
function compile(type,source){let shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
function program(v,f){let p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
let ws,sky;try{ws=program(shaderSrc.worldV,shaderSrc.worldF);sky=program(shaderSrc.skyV,shaderSrc.skyF);}catch(err){$('err').style.display='flex';$('err').textContent='Błąd grafiki 3D: '+err.message;return;}
const W={p:gl.getAttribLocation(ws,'p'),c:gl.getAttribLocation(ws,'c'),n:gl.getAttribLocation(ws,'n'),vp:gl.getUniformLocation(ws,'vp'),eye:gl.getUniformLocation(ws,'eye'),fog:gl.getUniformLocation(ws,'fog')};
const K={a:gl.getAttribLocation(sky,'a'),tm:gl.getUniformLocation(sky,'tm')};
const skyB=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyB);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearDepth(1);
const C={snow:[.91,.965,.997],snow2:[.85,.935,.99],snow3:[.77,.87,.95],ice:[.96,.99,1],powder:[.99,.997,1],shade:[.67,.79,.91],pines:[.18,.44,.42],pine2:[.11,.38,.36],pine3:[.22,.51,.45],pineDark:[.08,.29,.31],ground:[.72,.85,.91],ground2:[.66,.80,.88],bark:[.38,.27,.21],stone:[.47,.56,.64],stone2:[.59,.67,.73],orange:[1,.44,.18],red:[.91,.26,.18],red2:[.72,.18,.14],gold:[1,.76,.28],blue:[.16,.40,.68],blue2:[.25,.56,.80],glass:[.56,.81,.94],black:[.12,.21,.33],white:[1,1,1],metal:[.42,.52,.64],steel:[.65,.77,.85],wood:[.58,.37,.27],wood2:[.70,.48,.32],roof:[.27,.37,.47],shadow:[.67,.79,.87],skin:[.91,.69,.48],green:[.31,.58,.44],pants:[.14,.23,.39],boot:[.13,.16,.24],ski:[1,.77,.23],sky:[.35,.64,.91]};
const path=z=>26*Math.sin(z/195)+12*Math.sin(z/74)+8*Math.sin(z/29),wid=z=>39+5*Math.sin(z/160)+2*Math.cos(z/51),hill=(x,z)=>265-.235*z+0.00052*(x-path(z))**2+3.2*Math.sin(z/112)+2.4*Math.sin(z/37+x/90);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));let seed=20261110;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;}
const minus=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>{let l=Math.hypot(...v)||1;return v.map(x=>x/l);};
function tri(m,a,b,c,color,normal){normal=normal||norm(cross(minus(b,a),minus(c,a)));for(let p of[a,b,c])m.push(...p,...color,...normal);}
function quad(m,a,b,c,d,color){tri(m,a,b,c,color);tri(m,a,c,d,color);}
function block(m,x,y,z,w,h,d,color){let a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y+h,z-d/2],D=[x-w/2,y+h,z-d/2],e=[x-w/2,y,z+d/2],f=[x+w/2,y,z+d/2],g=[x+w/2,y+h,z+d/2],H=[x-w/2,y+h,z+d/2];quad(m,a,b,c,D,color);quad(m,f,e,H,g,color);quad(m,e,a,D,H,color);quad(m,b,f,g,c,color);quad(m,D,c,g,H,color);quad(m,e,f,b,a,color);}
function bar(m,a,b,r,color){let dir=norm(minus(b,a)),side=norm(cross(dir,[0,0,1]));if(Math.hypot(...side)<.1)side=[1,0,0];let vert=norm(cross(dir,side));let ofs=(p,s,t)=>[p[0]+side[0]*s+vert[0]*t,p[1]+side[1]*s+vert[1]*t,p[2]+side[2]*s+vert[2]*t];let A=[ofs(a,-r,-r),ofs(a,r,-r),ofs(a,r,r),ofs(a,-r,r)],B=[ofs(b,-r,-r),ofs(b,r,-r),ofs(b,r,r),ofs(b,-r,r)];for(let i=0;i<4;i++)quad(m,A[i],A[(i+1)%4],B[(i+1)%4],B[i],color);}
function disc(m,x,y,z,rx,rz,color){for(let i=0;i<8;i++){let a=i*Math.PI/4,b=(i+1)*Math.PI/4;tri(m,[x,y,z],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],color,[0,1,0]);}}
function cone(m,x,base,z,r,h,color,segments=6){for(let i=0;i<segments;i++){let a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;tri(m,[x+Math.cos(a)*r,base,z+Math.sin(a)*r],[x+Math.cos(b)*r,base,z+Math.sin(b)*r],[x,base+h,z],color);}}
function tree(m,x,z,s,withSnow=true){let y=hill(x,z);disc(m,x,y+.05,z,4.2*s,3*s,C.shadow);block(m,x,y+.1,z,1.0*s,4.5*s,1.0*s,C.bark);for(let i=0;i<3;i++){let base=y+(1.3+3.9*i)*s,r=(5.4-i*1.18)*s,hh=(7.4-i*.55)*s;cone(m,x,base,z,r,hh,(i%3)?C.pine2:C.pines);if(withSnow){for(let k=0;k<6;k+=2){let a=k*Math.PI/3,b=(k+1)*Math.PI/3;tri(m,[x+Math.cos(a)*r*.88,base+1.05*s,z+Math.sin(a)*r*.88],[x+Math.cos(b)*r*.88,base+1.05*s,z+Math.sin(b)*r*.88],[x,base+hh+.12*s,z],C.snow);}}}}
function house(m,x,z,s,barStyle=false){let y=hill(x,z),w=s*1.75,d=s*1.3,h=s*.78;disc(m,x,y+.04,z,s*1.45,s*1.3,C.shadow);block(m,x,y,z,w,h,d,C.wood);block(m,x,y+1,z+d/2+.06,w*.64,h*.53,.18,C.glass);block(m,x,y+1,z-d/2-.06,w*.64,h*.53,.18,C.glass);
block(m,x-w*.38,y,z+d/2+.32,w*.19,h*.72,.31,C.blue);
// Gridded windows on the camera-facing side.
for(let i=-3;i<=3;i++){block(m,x+i*w*.11,y+2,z-d/2-.20,.18,h*.46,.25,C.wood2);}
for(let i=-1;i<=1;i++){block(m,x+i*w*.24,y+1.5,z+d/2+.26,.28,h*.45,.36,C.wood2);}
let peak=y+h+s*.65,z1=z-d*.61,z2=z+d*.61;tri(m,[x-w*.59,y+h,z1],[x+w*.59,y+h,z1],[x,peak,z1],C.wood);tri(m,[x+w*.59,y+h,z2],[x-w*.59,y+h,z2],[x,peak,z2],C.wood);
quad(m,[x-w*.60,y+h,z1],[x,peak,z1],[x,peak,z2],[x-w*.60,y+h,z2],C.snow);quad(m,[x,peak,z1],[x+w*.60,y+h,z1],[x+w*.60,y+h,z2],[x,peak,z2],C.snow2);
block(m,x+w*.31,peak-.1,z,1.5,s*.5,1.5,C.bark);if(barStyle){
 // terrace, tables, parasols, warm bar lights
 let ty=y+.35;block(m,x,ty,z-d*.88,w*1.05,.9,d*.70,C.wood2);for(let i=0;i<4;i++)for(let side of[-1,1]){let xx=x+(i-1.5)*w*.26,zz=z-d*(side===1?1.35:.65);block(m,xx,ty+1,z-d*(1.0),2.6,.26,2.0,C.wood2);bar(m,[xx,ty+1,z-d*.85],[xx,ty+3,z-d*.85],.15,C.bark);}
 for(let i=0;i<7;i++){let xx=x+(i-3)*w*.16;block(m,xx,y+h*.7,z-d/2-.2,.5,.6,.5,C.gold);}
}}
function station(m,x,z,s){let y=hill(x,z);block(m,x,y,z,s*1.8,s*.75,s*1.1,C.steel);block(m,x,y+1,z+s*.56,s*1.6,s*.56,.25,C.glass);block(m,x,y+s*.75,z,s*2,.8,s*1.3,C.roof);block(m,x,y+s*.75+.8,z,s*1.95,.5,s*1.25,C.snow);block(m,x,y+1,z+s*.62,s*.28,s*.5,.15,C.orange);}
const world=[];
function build(){
 // Broad smooth mountain mesh with colored low-poly triangular patches
 const st=12;
 for(let z=-144;z<1690;z+=st)for(let x=-320;x<320;x+=st){let X=x+st,Z=z+st,dd=Math.abs(x+st/2-path(z+st/2)),near=dd<wid(z+st/2)+10;
 let color=near?(rnd()<.24?C.snow2:C.snow):(rnd()<.32?C.ground2:(rnd()<.48?C.ground:C.snow3));
 quad(world,[x,hill(x,z),z],[X,hill(X,z),z],[X,hill(X,Z),Z],[x,hill(x,Z),Z],color);
 }
 // A bright, visually broad piste with grooming strips and borders
 for(let z=-12;z<1628;z+=9){let zz=z+9,c=path(z),cc=path(zz),w=wid(z),ww=wid(zz);let a=[c-w,hill(c-w,z)+.14,z],b=[c+w,hill(c+w,z)+.14,z],d=[cc+ww,hill(cc+ww,zz)+.14,zz],e=[cc-ww,hill(cc-ww,zz)+.14,zz];quad(world,a,b,d,e,Math.floor(z/9)%6===0?C.ice:C.snow);
 for(let t=-.88;t<.99;t+=.12){let x=c+w*t,X=cc+ww*t;let color=(Math.round(t*100)%3===0)?C.snow2:C.powder;quad(world,[x,hill(x,z)+.19,z],[x+.22,hill(x+.22,z)+.19,z],[X+.22,hill(X+.22,zz)+.19,zz],[X,hill(X,zz)+.19,zz],color);}
 for(let s of[-1,1]){let x=c+w*s,X=cc+ww*s;quad(world,[x-1.4,hill(x,z)+.20,z],[x+1.4,hill(x,z)+.20,z],[X+1.4,hill(X,zz)+.20,zz],[X-1.4,hill(X,zz)+.20,zz],C.snow2);}
 }
 // Distant low-poly Beskid mountain peaks behind the resort.
 for(let i=0;i<8;i++){let x=-420+i*118,z=1530+(i%3)*74,y=hill(x,z)-13,h=65+(i%4)*23,r=120;
  tri(world,[x-r,y,z],[x+r,y,z],[x,y+h,z],i%2?C.ground2:C.stone2);
  tri(world,[x-r*.37,y+h*.67,z],[x+r*.33,y+h*.67,z],[x,y+h,z],C.snow);
 }
 // Tree forest edge left/right, mixed dense but room for infrastructure.
 for(let z=-105;z<1650;z+=19)for(let side of[-1,1])for(let i=0;i<3;i++){
 let zz=z+(rnd()-.5)*28,x=path(zz)+side*(wid(zz)+13+rnd()*159);if(rnd()<.87){let reserved=(zz>95&&zz<260&&side===1&&Math.abs(x-(path(zz)+93))<70)||(zz>450&&zz<620&&side===1&&Math.abs(x-(path(zz)+95))<60);if(!reserved)tree(world,x,zz,.66+rnd()*.66,rnd()>.06);}
 }
 for(let i=0;i<155;i++){let z=rnd()*1600,x=path(z)+(rnd()<.5?-1:1)*(wid(z)+16+rnd()*150);if(Math.abs(x-(path(z)+82))>8){let y=hill(x,z);block(world,x,y-.15,z,1+rnd()*3.4,1+rnd()*1.5,1+rnd()*3,C.stone);}}
 // Safety nets on left and right; orange perforated texture made of geometry
 for(let z=35;z<1550;z+=12)for(let s of[-1,1]){let zz=z+12,x=path(z)+s*(wid(z)+2.8),X=path(zz)+s*(wid(zz)+2.8),y=hill(x,z),Y=hill(X,zz);
 // net posts + horizontal red ropes
 if(z%24<12)bar(world,[x,y+.1,z],[x,y+4.3,z],.18,C.orange);
 for(let H of[1.05,2,3.0,3.9])bar(world,[x,y+H,z],[X,Y+H,zz],.055,C.red);
 // diagonal net grid every other section
 if(z%24<12){bar(world,[x,y+1.05,z],[X,Y+3.9,zz],.05,C.orange);bar(world,[x,y+3.9,z],[X,Y+1.05,zz],.05,C.orange);}
 }
 // Snowbank details and piste posts
 for(let z=20;z<1560;z+=31)for(let s of[-1,1]){let x=path(z)+s*(wid(z)+1.3);let y=hill(x,z);block(world,x,y+.18,z,1.0,2.0,1.0,C.orange);block(world,x,y+2.12,z,1.05,.36,1.05,C.white);}
 // Chairlift cable and support beams to the left (close to the player)
 for(let z=95;z<1490;z+=145){let x=path(z)-wid(z)-25,y=hill(x,z);bar(world,[x-3,y,z],[x-3,y+20,z],.78,C.metal);bar(world,[x+3,y,z],[x+3,y+20,z],.78,C.metal);bar(world,[x-8,y+20,z],[x+8,y+20,z],.72,C.steel);block(world,x,y+20,z,12,1.3,2,C.roof);
 }
 for(let z=80;z<1480;z+=13){let zz=z+13,x=path(z)-wid(z)-25,X=path(zz)-wid(zz)-25;for(let s of[-3.6,3.6])bar(world,[x+s,hill(x,z)+21,z],[X+s,hill(X,zz)+21,zz],.11,C.black);}
 // Separate gondola section farther to the right.
 for(let z=190;z<1480;z+=205){let x=path(z)+wid(z)+73,y=hill(x,z);bar(world,[x-3,y,z],[x-3,y+28,z],.78,C.metal);bar(world,[x+3,y,z],[x+3,y+28,z],.78,C.metal);bar(world,[x-8,y+28,z],[x+8,y+28,z],.75,C.steel);}
 for(let z=180;z<1480;z+=20){let zz=z+20,x=path(z)+wid(z)+73,X=path(zz)+wid(zz)+73;for(let s of[-3,3])bar(world,[x+s,hill(x,z)+29,z],[X+s,hill(X,zz)+29,zz],.14,C.black);}
 // Signature visible mountain bar, deck and lift station.
 house(world,path(215)+wid(215)+43,215,20,true);
 house(world,path(535)-wid(535)-74,535,19,true);
 house(world,path(810)+wid(810)+73,810,18,false);
 house(world,path(1290)-wid(1290)-79,1290,21,false);
 station(world,path(300)-wid(300)-38,300,17);
 station(world,path(1110)+wid(1110)+80,1110,22);
 // Strong signage and orange banners at important trail intersections
 for(let z of[130,520,915,1255]){let x=path(z)+wid(z)+6,y=hill(x,z);bar(world,[x,y,z],[x,y+13,z],.26,C.wood);block(world,x-3.4,y+9,z,7.7,3.5,1.0,C.blue);block(world,x-3.4,y+6.3,z,7.7,1.65,1.0,C.red);}
}
build();
function makeBuffer(arr,usage){let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),usage);return b;}
const staticBuffer=makeBuffer(world,gl.STATIC_DRAW),dynamicBuffer=gl.createBuffer(),vertexCount=world.length/9;
const stars=Array.from({length:12},(_,i)=>{let z=95+i*112;return {x:path(z)+((i%3)-1)*10,z,got:false};});
const S={x:path(20),z:20,speed:12,mode:'menu',turn:0,t:0,score:0,trail:[],buttons:{left:false,right:false,brake:false},camera:[0,300,-10],focus:[0,260,50],msg:0,snow:[],fps:60};

function perspective(fov,aspect,n,f){let t=1/Math.tan(fov/2);return[t/aspect,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0];}
function lookAt(eye,target){let z=norm(minus(eye,target)),x=norm(cross(z,[0,1,0])),y=cross(x,z);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2],-y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2],-z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2],1];}
function mul(a,b){let m=Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)m[4*j+i]+=a[4*k+i]*b[4*j+k];return m;}
function project(vec,m){let x=vec[0],y=vec[1],z=vec[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=1)return null;let sx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,sy=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;return[(sx*.5+.5)*innerWidth,(1-(sy*.5+.5))*innerHeight];}
function startGame(){S.x=path(20);S.z=20;S.speed=12;S.turn=0;S.t=0;S.score=0;S.snow=[];S.trail=[];stars.forEach(s=>s.got=false);S.camera=[S.x,hill(S.x,S.z-19)+19,S.z-19];S.focus=[S.x,hill(S.x,S.z)+2,S.z+16];$('score').textContent='★ 0';$('title').textContent='SMR PIXEL SKI';$('start').textContent='▶ START ZJAZDU';$('overlay').classList.add('hidden');S.mode='play';toast('NOWY STOK · JAZDA!');}
function setPause(){if(S.mode==='play'){S.mode='pause';$('title').textContent='PAUZA';$('description').textContent='Wznów zjazd i odkrywaj ośrodek. Strzałki skręcają, HAMUJ zmniejsza prędkość.';$('start').textContent='▶ WZNÓW';$('overlay').classList.remove('hidden');$('pause').textContent='▶';}else if(S.mode==='pause'){S.mode='play';$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';}}
$('start').addEventListener('click',()=>S.mode==='pause'?setPause():startGame());$('pause').addEventListener('click',setPause);
function toast(txt){$('notification').textContent=txt;$('notification').classList.add('visible');S.msg=1.7;}
for(let key of['left','right','brake']){let b=$(key);b.addEventListener('pointerdown',e=>{e.preventDefault();S.buttons[key]=true;b.classList.add('down');try{b.setPointerCapture(e.pointerId)}catch(_){}});for(let ev of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{e.preventDefault();S.buttons[key]=false;b.classList.remove('down')});}
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowdown',' ','a','d','escape'].includes(k))e.preventDefault();if(k==='arrowleft'||k==='a')S.buttons.left=true;if(k==='arrowright'||k==='d')S.buttons.right=true;if(k==='arrowdown'||k===' ')S.buttons.brake=true;if(k==='escape')setPause();});
addEventListener('keyup',e=>{let k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')S.buttons.left=false;if(k==='arrowright'||k==='d')S.buttons.right=false;if(k==='arrowdown'||k===' ')S.buttons.brake=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.mode==='play')setPause();});
function physics(dt){S.t+=dt;if(S.msg>0){S.msg-=dt;if(S.msg<=0)$('notification').classList.remove('visible');}if(S.mode!=='play')return;
 let turn=Number(S.buttons.right)-Number(S.buttons.left),off=Math.abs(S.x-path(S.z))>wid(S.z)-4;
 let slope=(hill(S.x,S.z)-hill(S.x,S.z+2))/2;
 S.speed=clamp(S.speed+(5.0+slope*10-S.speed*S.speed*.016-(S.buttons.brake?18:0)-(off?10:0))*dt,3.1,29);
 S.z+=S.speed*dt;
 S.x+=(turn*S.speed*1.17+(path(S.z)-S.x)*.16)*dt;
 S.turn+=(turn-S.turn)*Math.min(1,dt*6);
 S.x=clamp(S.x,-280,280);
 if(!S.trail.length||S.z-S.trail[S.trail.length-1].z>1.15){S.trail.push({x:S.x,z:S.z});if(S.trail.length>110)S.trail.shift();}
 if(Math.abs(turn)>0.01||S.speed>18){if(rnd()<.67)S.snow.push({x:S.x+(rnd()-.5)*2.5,z:S.z-2,y:hill(S.x,S.z)+.6,t:1,size:.8+rnd()});}
 for(let p of S.snow){p.t-=dt*.85;p.y+=dt*(1+p.size*.6);p.x+=(rnd()-.5)*dt*2;}
 S.snow=S.snow.filter(p=>p.t>0).slice(-34);
 for(let coin of stars){if(!coin.got&&Math.abs(coin.z-S.z)<6&&Math.abs(coin.x-S.x)<5){coin.got=true;S.score++;$('score').textContent='★ '+S.score;toast('★ GWIAZDKA!');}}
 $('speed').innerHTML=Math.round(S.speed*3.6)+' <small>km/h</small>';
 $('metres').textContent=Math.max(0,Math.min(1400,Math.round(S.z-20)))+' / 1400 m';
 $('fill').style.width=clamp((S.z-20)/1400*100,0,100)+'%';
 if(S.z>1420){S.mode='finish';$('overlay').classList.remove('hidden');$('title').textContent='META! 🏁';$('description').textContent='Ukończono zjazd przez ośrodek! Zdobyte gwiazdki: '+S.score+' / 12.';$('start').textContent='↻ JEDŹ JESZCZE RAZ';}
}
function gondolas(mesh){for(let i=0;i<11;i++){let z=170+(i*129+S.t*6.7)%1250;if(Math.abs(z-S.z)>680)continue;let x=path(z)+wid(z)+73+(i%2?3:-3),y=hill(x,z)+28.5;
bar(mesh,[x,y+2,z],[x,y-2,z],.24,C.black);block(mesh,x,y-8.3,z,6.5,6.5,5.8,i%2?C.red:C.orange);block(mesh,x,y-7.0,z+2.95,5.85,3.3,.18,C.glass);block(mesh,x,y-7,z-2.95,5.85,3.3,.18,C.glass);block(mesh,x,y-8,z+3.1,.4,3,.2,C.black);block(mesh,x,y-1.8,z,7.1,.75,6.4,C.roof);}}
function chairlift(mesh){for(let i=0;i<17;i++){let z=110+(i*91+S.t*4)%1370;if(Math.abs(z-S.z)>660)continue;let x=path(z)-wid(z)-25+(i%2?3.5:-3.5),y=hill(x,z)+20.3;
bar(mesh,[x,y,z],[x,y-4,z],.12,C.metal);bar(mesh,[x-3.1,y-4,z],[x+3.1,y-4,z],.25,C.metal);block(mesh,x,y-5,z,6.4,.35,2,C.blue);block(mesh,x,y-8,z+1.4,6.4,2.9,.35,C.black);
for(let k of[-1,0,1]){block(mesh,x+k*1.9,y-7.8,z,1.0,1.9,.65,[C.orange,C.blue2,C.red][k+1]);block(mesh,x+k*1.9,y-6,z,1,1,1,C.black);}}}
function character(m,x,y,z,scale,color){disc(m,x,y+.05,z,scale*1.5,scale*1.3,C.shadow);block(m,x,y+scale*.5,z,scale*.8,scale*1.25,scale*.8,color);block(m,x,y+scale*1.8,z,scale*.65,scale*.72,scale*.65,C.black);for(let side of[-1,1]){block(m,x+side*.42*scale,y+.1*scale,z,scale*.22,scale*.8,scale*.26,C.pants);block(m,x+side*.42*scale,y+.05*scale,z+scale*.55,scale*.28,scale*.1,scale*1.6,C.ski);}}
function player(out){const m=[];let x=S.x,z=S.z,y=hill(x,z)+.1,t=S.turn;
 // Clear shadows and long groomed ski tracks behind the skier
 disc(m,x,y+.27,z-.25,2.6,2.1,C.shadow);
 for(let side of[-1,1]){let X=x+side*.74+t*.32;block(m,X,y+.37,z+.38,.39,.25,6.4,C.ski);block(m,X,y+.52,z+2.8,.43,.18,.45,C.orange);block(m,X,y+.36,z-.28,.68,.74,1.25,C.boot);block(m,X-t*.20,y+.9,z-.44,.67,1.55,.8,C.pants);}
 // Big red jacket, yellow backpack, blue goggles and helmet
 block(m,x-t*.34,y+2.25,z-.34,2.65,2.62,1.54,C.red);
 block(m,x-t*.31,y+2.48,z-1.18,1.64,1.7,.40,C.blue2);block(m,x-t*.31,y+2.6,z-1.42,.36,1.35,.17,C.gold);
 block(m,x-t*.31,y+4.77,z-.30,1.48,1.28,1.38,C.black);
 block(m,x-t*.31,y+5.16,z+.43,1.34,.49,.20,C.glass);
 block(m,x-t*.31,y+5.84,z-.32,1.65,.32,1.45,C.red2);
 for(let side of[-1,1]){let X=x+side*1.56-t*.29;block(m,X,y+2.63,z-.25,.56,1.78,.65,C.red);block(m,X,y+2.5,z+.15,.59,.5,.58,C.black);bar(m,[X,y+2.3,z+.10],[X+side*.45,y+.25,z+2.3],.09,C.black);}
 const scale=1.24;for(let i=0;i<m.length;i+=9){m[i]=x+(m[i]-x)*scale;m[i+1]=y+(m[i+1]-y)*scale;m[i+2]=z+(m[i+2]-z)*scale;}out.push(...m);
}
function star(m,x,y,z,rot){let N=10;for(let i=0;i<N;i++){let a=i*Math.PI*2/N+rot,b=(i+1)*Math.PI*2/N+rot,r=i%2?1.15:2.5,R=(i+1)%2?1.15:2.5;tri(m,[x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*R,y+Math.sin(b)*R,z],C.gold,[0,0,1]);}}
function dynamic(m){chairlift(m);gondolas(m);
 // Two ski tracks following the player's actual turns; cast into the snow.
 for(let i=1;i<S.trail.length;i++){
 let a=S.trail[i-1],b=S.trail[i];for(let side of[-1,1]){
 let x=a.x+side*.76,X=b.x+side*.76,ay=hill(x,a.z)+.28,by=hill(X,b.z)+.28;
 quad(m,[x-.11,ay,a.z],[x+.11,ay,a.z],[X+.11,by,b.z],[X-.11,by,b.z],C.shade);
 }}
 for(let starObj of stars){if(starObj.got||starObj.z<S.z-25||starObj.z>S.z+380)continue;let y=hill(starObj.x,starObj.z)+4.5+Math.sin(S.t*2+starObj.z)*.55;star(m,starObj.x,y,starObj.z,S.t*.4);}
 for(let zz=Math.floor((S.z+330)/92)*92;zz>S.z+24;zz-=92){let i=Math.floor(zz/92),x=path(zz)+(i%5-2)*12+Math.sin(S.t*.6+i)*2.5;character(m,x,hill(x,zz),zz,1.2,[C.blue2,C.orange,C.gold,C.green,C.red][i%5]);}
 for(let puff of S.snow){let a=puff.t;let pos=[puff.x,puff.y,puff.z];block(m,pos[0],pos[1],pos[2],puff.size*a*.8,puff.size*a*.8,puff.size*a*.8,C.white);}
 player(m);
}
function label(name,x,z){let e=document.createElement('div');e.className='worldLabel';e.textContent=name;$('labels').appendChild(e);return {e,name,x,z};}
const labels=[label('☕ BAR HALA',path(215)+wid(215)+43,215),label('🚠 KOLEJ LINOWA',path(300)-wid(300)-38,300),label('🍵 GÓRSKI TARAS',path(535)-wid(535)-74,535),label('🚡 GONDOLA',path(1110)+wid(1110)+80,1110)];
function resize(){let dpr=Math.min(devicePixelRatio||1,1.35),scale=innerWidth<740?.82:.90,w=Math.round(innerWidth*scale*dpr),h=Math.round(innerHeight*scale*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);}
function draw(buffer,count){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(W.p,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(W.c,3,gl.FLOAT,false,36,12);gl.vertexAttribPointer(W.n,3,gl.FLOAT,false,36,24);gl.enableVertexAttribArray(W.p);gl.enableVertexAttribArray(W.c);gl.enableVertexAttribArray(W.n);gl.drawArrays(gl.TRIANGLES,0,count);}
let last=0;
function frame(ms){let dt=clamp(last?(ms-last)/1000:1/60,0,.05);last=ms;resize();physics(dt);
 let y=hill(S.x,S.z),cy=hill(S.x,S.z-25);let goalCam=[S.x-S.turn*1.6,cy+19,S.z-19],goalLook=[S.x,y+2,S.z+16];
 for(let i=0;i<3;i++){S.camera[i]+=(goalCam[i]-S.camera[i])*Math.min(1,dt*5.6);S.focus[i]+=(goalLook[i]-S.focus[i])*Math.min(1,dt*5.6);}
 let aspect=canvas.width/canvas.height,vp=mul(perspective(56*Math.PI/180,aspect,.2,1520),lookAt(S.camera,S.focus));
 gl.disable(gl.DEPTH_TEST);gl.useProgram(sky);gl.bindBuffer(gl.ARRAY_BUFFER,skyB);gl.vertexAttribPointer(K.a,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(K.a);gl.uniform1f(K.tm,S.t);gl.drawArrays(gl.TRIANGLES,0,6);
 gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(ws);gl.uniformMatrix4fv(W.vp,false,new Float32Array(vp));gl.uniform3fv(W.eye,new Float32Array(S.camera));gl.uniform3fv(W.fog,new Float32Array([.83,.92,.98]));draw(staticBuffer,vertexCount);
 const mobile=[];dynamic(mobile);gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mobile),gl.DYNAMIC_DRAW);draw(dynamicBuffer,mobile.length/9);
 for(let item of labels){if(item.z<S.z+2||item.z>S.z+360){item.e.style.display='none';continue;}let a=project([item.x,hill(item.x,item.z)+25,item.z],vp);if(!a||a[0]<0||a[0]>innerWidth||a[1]<35||a[1]>innerHeight-80){item.e.style.display='none';continue;}item.e.style.display='block';item.e.style.left=a[0]+'px';item.e.style.top=a[1]+'px';}
 requestAnimationFrame(frame);
}
S.camera=[S.x,hill(S.x,S.z-19)+19,S.z-19];S.focus=[S.x,hill(S.x,S.z)+2,S.z+16];requestAnimationFrame(frame);
window.__SMR_DEBUG__={get:()=>({version:'0.3.0',renderer:'native WebGL pixel low-poly',mode:S.mode,speed:S.speed,distance:S.z,stars:S.score,vertices:vertexCount,x:S.x,path:path(S.z)}),start:startGame};
})();