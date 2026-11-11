/* SMR Pixel Ski 0.8.1 — dynamic downhill carving, tuck and jump. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const error = msg => { const el=$('error');el.style.display='flex';el.textContent=msg; };
  if (!window.BABYLON) { error('Silnik Babylon.js nie został pobrany. Sprawdź połączenie internetowe i odśwież stronę.'); return; }
  const B=BABYLON, canvas=$('scene');
  let engine,scene,camera;
  try { engine = new B.Engine(canvas,true,{stencil:true,preserveDrawingBuffer:false,powerPreference:'high-performance',disableWebGL2Support:false}); }
  catch(e) { error('Nie można uruchomić WebGL: '+e.message); return; }
  const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  engine.setHardwareScalingLevel(Math.max(1, (window.devicePixelRatio||1)/(mobile?1.15:1.4)));
  scene=new B.Scene(engine);
  scene.clearColor=new B.Color4(.63,.79,.91,1);
  scene.ambientColor=new B.Color3(.69,.78,.92);
  scene.fogMode=B.Scene.FOGMODE_EXP2;
  scene.fogDensity=.00039;
  scene.fogColor=new B.Color3(.73,.83,.90);
  scene.imageProcessingConfiguration.contrast=1.09;
  scene.imageProcessingConfiguration.exposure=.96;
  scene.skipPointerMovePicking=true;
  scene.autoClear=true;
  camera=new B.FreeCamera('alpine-camera',new B.Vector3(0,300,-45),scene);
  camera.fov=.78;camera.minZ=.5;camera.maxZ=1800;
  camera.inputs.clear();scene.activeCamera=camera;
  const sky=new B.HemisphericLight('winter skylight',new B.Vector3(-.15,1,.2),scene);
  sky.diffuse=new B.Color3(.85,.91,1);sky.groundColor=new B.Color3(.59,.70,.83);sky.intensity=.79;
  const sun=new B.DirectionalLight('low winter sun',new B.Vector3(-.66,-.83,.34),scene);
  sun.position=new B.Vector3(260,410,-140);
  sun.diffuse=new B.Color3(1,.93,.85);sun.intensity=1.18;
  let shadows;
  try { shadows=new B.ShadowGenerator(mobile?768:1024,sun);shadows.usePercentageCloserFiltering=true;shadows.bias=.00045;shadows.normalBias=.035; }
  catch(e) { console.warn('Shadow initialization:',e.message); }
  const V=(x,y,z)=>new B.Vector3(x,y,z);
  const RGB=(r,g,b)=>new B.Color3(r,g,b);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let seed=73147;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;}
  const center=z=>26*Math.sin(z/136)+12*Math.sin(z/63)+4*Math.sin(z/28);
  const pisteWidth=z=>35+4*Math.sin(z/119)+2*Math.sin(z/39);
  const height=(x,z)=>{
    const offset=x-center(z),outer=Math.max(0,Math.abs(offset)-pisteWidth(z));
    const hills=.017*Math.pow(outer,1.65)*(1+.14*Math.sin(z/86+x/91));
    const undulation=3.4*Math.sin(z/101)+1.6*Math.cos(z/37)+.9*Math.sin(z/18+x/30);
    const rough= (1-Math.exp(-outer/21))*(1.6*Math.sin(x/22+z/19)+.7*Math.cos(x/11-z/27));
    return 270-.202*z+undulation+hills+rough;
  };
  const material=(name,r,g,b,spec=.10)=>{
    const m=new B.StandardMaterial(name,scene);
    m.diffuseColor=RGB(r,g,b);m.specularColor=RGB(spec,spec,spec);m.roughness=.88;
    return m;
  };
  const snow=material('Snow / alpine micro detail',.91,.94,.97,.025);
  const piste=material('piste · groomed snow',.86,.91,.96,.04);
  const needles=material('spruce needles',.075,.25,.22,.08);
  const needleBlue=material('dark winter spruce',.095,.30,.29,.08);
  const wood=material('warm chalet timber',.42,.26,.19);
  const roof=material('slate roof',.24,.32,.38);
  const glass=material('winter blue glazing',.37,.65,.77,.28);
  const metal=material('lift steel',.35,.43,.49,.22);
  const darkMetal=material('lift cable',.16,.24,.30,.16);
  const jacket=material('ski jacket',.15,.51,.60,.15);
  const jacketDark=material('ski jacket shadow',.065,.27,.34,.10);
  const helmet=material('helmet',.16,.20,.25,.3);
  const goggles=material('goggles',.44,.71,.84,.38);
  const skiMat=material('skis',.94,.46,.24,.27);
  const snowTexture=new B.DynamicTexture('fine snow microstructure',{width:256,height:256},scene,false);
  const tctx=snowTexture.getContext();const img=tctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4;
    const grain=Math.floor(random()*24-12);
    const diagonal=Math.sin(x*.12+y*.025)*1.5;
    const val=clamp(251+grain*.52+diagonal,231,255);
    img.data[i]=val;img.data[i+1]=clamp(val+2,0,255);img.data[i+2]=255;img.data[i+3]=255;
  }
  tctx.putImageData(img,0,0);snowTexture.update();
  snowTexture.uScale=30;snowTexture.vScale=43;snowTexture.wrapU=B.Texture.WRAP_ADDRESSMODE;snowTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;
  snow.diffuseTexture=snowTexture;snow.useVertexColors=true;snow.backFaceCulling=false;
  const pisteTexture=new B.DynamicTexture('grooming marks',{width:256,height:256},scene,false);
  const pc=pisteTexture.getContext();pc.fillStyle='#faffff';pc.fillRect(0,0,256,256);
  for(let x=0;x<256;x+=7){pc.fillStyle=x%3?'#f3f9fc':'#eaf4fa';pc.fillRect(x,0,1,256);}
  for(let y=0;y<256;y+=23){pc.fillStyle='#f5fcff';pc.fillRect(0,y,256,2);}
  pisteTexture.update();pisteTexture.uScale=7;pisteTexture.vScale=34;
  piste.diffuseTexture=pisteTexture;piste.backFaceCulling=false;piste.disableLighting=true;piste.emissiveColor=RGB(.89,.94,.97);piste.diffuseColor=RGB(.93,.96,.99);
  // Build a real height-field mesh with normals so the terrain reacts to low winter sunlight.
  function makeHeightField(){
    const pos=[],uv=[],colors=[],indices=[];
    const xmin=-375,xmax=375,zmin=-185,zmax=940,step=8;
    const nx=Math.round((xmax-xmin)/step),nz=Math.round((zmax-zmin)/step);
    for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
      const x=xmin+ix*step,z=zmin+iz*step,h=height(x,z),dist=Math.abs(x-center(z))-pisteWidth(z);
      pos.push(x,h,z);uv.push((x-xmin)/32,(z-zmin)/32);
      const haze=clamp((dist+7)/80,0,1),variation=(random()-.5)*.045;
      colors.push(clamp(1-.055*haze+variation*.42,.84,1),clamp(.996-.028*haze+variation*.42,.83,1),clamp(.999-.011*haze,0,1),1);
    }
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
      const i=z*(nx+1)+x;
      indices.push(i,i+1,i+nx+1,i+1,i+nx+2,i+nx+1);
    }
    const norms=[];B.VertexData.ComputeNormals(pos,indices,norms);
    const mesh=new B.Mesh('terrain | 8m height-field',scene),data=new B.VertexData();
    data.positions=pos;data.indices=indices;data.normals=norms;data.uvs=uv;data.colors=colors;data.applyToMesh(mesh);
    mesh.material=snow;mesh.receiveShadows=true;mesh.isPickable=false;
    return mesh;
  }
  makeHeightField();
  // Close-following grooming ribbon follows the same height data but uses a separate repeated material.
  function makeGroomedPiste(){
    const pos=[],uv=[],ids=[];const step=5,min=-75,max=820;
    for(let z=min;z<=max;z+=step){
      for(let side of [-1,1]){
        const x=center(z)+side*pisteWidth(z);
        pos.push(x,height(x,z)+.10,z);uv.push((side+1)*.5,(z-min)/8);
      }
    }
    for(let i=0;i<(max-min)/step;i++){let j=i*2;ids.push(j,j+2,j+1,j+1,j+2,j+3);}
    const normals=[];B.VertexData.ComputeNormals(pos,ids,normals);
    const m=new B.Mesh('piste ribbon',scene),d=new B.VertexData();
    d.positions=pos;d.uvs=uv;d.indices=ids;d.normals=normals;d.applyToMesh(m);m.material=piste;m.receiveShadows=true;m.isPickable=false;
  }
  // Groomed piste ribbon temporarily disabled: discontinuous strip lighting caused visible geometric bands.
  // Stylised spruce mesh: tapered branch clusters with snowy branch tips. One draw call for all trees.
  const treeMat=new B.StandardMaterial('branch-level spruce winter materials',scene);
  treeMat.diffuseColor=RGB(1,1,1);treeMat.specularColor=RGB(.035,.035,.035);treeMat.useVertexColors=true;treeMat.backFaceCulling=false;
  // Hand-authored procedural spruce: drooping branch fans, irregular crowns and snow caps.
  // Uses one mesh / thin instances rather than hundreds of separate tree draw calls.
  const positions=[],indices=[],treeColors=[],uvs=[];
  const vtx=(x,y,z,c)=>{let i=positions.length/3;positions.push(x,y,z);treeColors.push(...c,1);uvs.push(.5+x*.032,y*.08);return i;};
  const tri=(a,b,c)=>indices.push(a,b,c);
  const greens=[[.060,.255,.212],[.070,.302,.255],[.086,.340,.279],[.047,.219,.209],[.11,.355,.290],[.09,.312,.292]];
  const snowcaps=[[.81,.88,.95],[.90,.95,.99],[.77,.86,.94]];
  const petals=8,whorls=8;
  // Six-sided brown trunk peeks through thinner lower branches.
  for(let k=0;k<6;k++){
    const a=k*Math.PI/3,b=(k+1)*Math.PI/3;
    const pa=vtx(.38*Math.cos(a),0,.38*Math.sin(a),[.32,.24,.18]);
    const pb=vtx(.38*Math.cos(b),0,.38*Math.sin(b),[.33,.255,.19]);
    const pc=vtx(.12*Math.cos(a),18.8,.12*Math.sin(a),[.38,.30,.22]);
    const pd=vtx(.12*Math.cos(b),18.8,.12*Math.sin(b),[.38,.30,.22]);
    tri(pa,pb,pc);tri(pb,pd,pc);
  }
  for(let k=0;k<whorls;k++){
    const h=1.3+k*1.55,spread=(7.6-k*.66),tilt=.18*Math.sin(1.79*k);
    for(let j=0;j<petals;j++){
      const theta=(j+(k%2)*.50)*2*Math.PI/petals;
      const nx=Math.cos(theta),nz=Math.sin(theta);
      const tx=-nz,tz=nx;
      const radius=spread*(.90+.085*Math.sin(k*3.1+j*2.7));
      const drop=.55+.15*Math.cos(k+j);
      const branchWidth=radius*.48;
      const L=vtx(nx*.43+tx*branchWidth,h+.2,nz*.43+tz*branchWidth,greens[(j+k+2)%greens.length]);
      const R=vtx(nx*.43-tx*branchWidth,h+.2,nz*.43-tz*branchWidth,greens[(j+k+4)%greens.length]);
      const TIP=vtx(nx*radius,h-drop+tilt,nz*radius,greens[(j+k)%greens.length]);
      const P=vtx(nx*.2,h+3.05,nz*.2,greens[(j+2*k)%greens.length]);
      tri(L,TIP,P);tri(TIP,R,P);
      // Distinct irregular upper snow shelf, not a uniformly white pyramid.
      if((j+k)%3!==0){
        const snow=snowcaps[(j+2*k)%snowcaps.length];
        const SL=vtx(nx*.48+tx*branchWidth*.71,h+.47,nz*.48+tz*branchWidth*.71,snow);
        const SR=vtx(nx*.48-tx*branchWidth*.71,h+.47,nz*.48-tz*branchWidth*.71,snow);
        const ST=vtx(nx*radius*.78,h+.29-drop*.43,nz*radius*.78,snow);
        tri(SL,ST,SR);
      }
    }
  }
  // Narrow pointed tip.
  for(let i=0;i<9;i++){
    const a=i*2*Math.PI/9,b=(i+1)*2*Math.PI/9;
    tri(vtx(Math.cos(a)*1.2,15.3,Math.sin(a)*1.2,greens[i%6]),
        vtx(Math.cos(b)*1.2,15.3,Math.sin(b)*1.2,greens[(i+1)%6]),
        vtx(0,20.3,0,greens[(i+2)%6]));
  }
  const tree=new B.Mesh('instanced winter spruces',scene),treeData=new B.VertexData();
  treeData.positions=positions;treeData.indices=indices;treeData.colors=treeColors;treeData.uvs=uvs;
  const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);treeData.normals=normals;treeData.applyToMesh(tree);
  tree.material=treeMat;tree.isPickable=false;tree.receiveShadows=false;
  const transforms=[];
  function addTree(x,z,s){const mat=B.Matrix.Compose(new B.Vector3(s,s,s),B.Quaternion.RotationAxis(B.Axis.Y,random()*Math.PI*2),V(x,height(x,z)-.6,z));mat.copyToArray(transforms,transforms.length);}
  for(let i=0;i<850;i++){
    const z=18+random()*715,side=random()<.5?-1:1;
    const dist=pisteWidth(z)+5+Math.pow(random(),2.4)*95;
    const x=center(z)+side*dist;
    if(Math.abs(x)>355)continue;
    addTree(x,z,.57+random()*.58);
  }
  tree.thinInstanceSetBuffer('matrix',new Float32Array(transforms),16,true);
  tree.thinInstanceRefreshBoundingInfo();
  if(shadows)shadows.addShadowCaster(tree,false);
  tree.alwaysSelectAsActiveMesh=true;
  // Chalet built from modestly detailed meshes. Full modelling comes in later stages.
  function chalet(x,z){
    const root=new B.TransformNode('ski hut group',scene);root.position=V(x,height(x,z),z);
    const makeBox=(name,w,h,d,px,py,pz,m)=>{const mesh=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.parent=root;mesh.position=V(px,py,pz);mesh.material=m;if(shadows)shadows.addShadowCaster(mesh);return mesh;};
    makeBox('foundation',20,1.3,14,0,.65,0,material('concrete base',.62,.67,.69));
    makeBox('timber walls',19,8,13,0,5.0,0,wood);
    const roofL=makeBox('pitched roof left',12,1.0,17,-4.7,11.1,0,roof);roofL.rotation.z=-.38;
    const roofR=makeBox('pitched roof right',12,1.0,17,4.7,11.1,0,roof);roofR.rotation.z=.38;
    for(let i=-2;i<=2;i++){makeBox('front window '+i,2.4,3.2,.2,i*3.15,5.9,-6.68,glass);}
    makeBox('mountain terrace',24,.6,11,0,1.6,-11,wood);
    for(let i=0;i<5;i++){makeBox('table '+i,2,.20,2,-8+i*4,2.8,-12,wood);makeBox('leg '+i,.3,1.5,.3,-8+i*4,1.9,-12,metal);}
    for(let i=0;i<7;i++)makeBox('terrace rail '+i,.3,2.8,.3,-11+i*3.65,3,-16.5,wood);
    return root;
  }
  chalet(center(270)-90,270);
  // 0.8 resort assets remain independent from the terrain and skier.
  if(!window.SMR_RESORT)throw Error('SMR_RESORT module not loaded');
  const resort=window.SMR_RESORT.createResort(B,scene,{height,center,shadowGenerator:shadows});
  // Etap III: modular animated skier with ski-poles, lean, twin carving marks and snow spray.
  if(!window.SMR_SKIER)throw Error('SMR_SKIER missing. Check skier.js preload.');
  const skierController=window.SMR_SKIER.createSkier(B,scene,shadows);
  const skier=skierController.root;
  if(!window.SMR_RIDE)throw Error('SMR_RIDE module not loaded');
  const ride=window.SMR_RIDE.createRide({center,pisteWidth,height});

  const input={left:false,right:false,brake:false,tuck:false,jump:false};
  const state=ride.state;
  const startElement=$('start'),overlay=$('overlay');
  const setMode=m=>{state.mode=m;overlay.hidden=m==='play';$('pause').textContent=m==='pause'?'▶':'Ⅱ';};
  const reset=()=>{
    ride.reset();skierController.reset();trailL=[];trailR=[];lastTraceZ=0;
    Object.keys(input).forEach(k=>input[k]=false);
    document.querySelectorAll('.control').forEach(el=>el.classList.remove('pressed'));
    skier.position=V(state.x,state.groundHeight+.22,state.z);
    camera.position=V(state.x+1.4,state.groundHeight+46,-37);
    camera.setTarget(V(state.x,state.groundHeight+1,27));
  };
  const play=()=>{if(state.mode!=='pause')reset();setMode('play');};
  const pause=()=>{if(state.mode==='play'){$('heading').textContent='PAUZA';$('subheading').textContent='Wznów zjazd, aby kontynuować test nowej kamery i oświetlenia.';startElement.textContent='▶ KONTYNUUJ';setMode('pause');}else if(state.mode==='pause')setMode('play');};
  startElement.onclick=play;$('pause').onclick=pause;
  for(const key of ['left','right','brake','tuck','jump']){
    const el=$(key);const release=e=>{input[key]=false;el.classList.remove('pressed');e.preventDefault();};
    el.addEventListener('pointerdown',e=>{input[key]=true;el.classList.add('pressed');e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_){}});
    for(const t of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(t,release);
  }
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','a','A','d','D','w','W','Shift','Escape'].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')input.left=true;
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')input.right=true;
    if(e.key==='ArrowDown')input.brake=true;
    if(e.key==='ArrowUp'||e.key.toLowerCase()==='w'||e.key==='Shift')input.tuck=true;
    if(e.key===' ')input.jump=true;
    if(e.key==='Escape')pause();
  });
  window.addEventListener('keyup',e=>{
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')input.left=false;
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')input.right=false;
    if(e.key==='ArrowDown')input.brake=false;
    if(e.key==='ArrowUp'||e.key.toLowerCase()==='w'||e.key==='Shift')input.tuck=false;
    if(e.key===' ')input.jump=false;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='play')pause();});
  const tracks=[];
  let trailL=[],trailR=[],lastTraceZ=0;
  const startTrack=side=>{
    const points=Array.from({length:80},()=>V(0,-200,0));
    const m=B.MeshBuilder.CreateLines('carving marks '+side,{points,updatable:true},scene);m.color=RGB(.55,.72,.78);m.alpha=.50;m.isPickable=false;
    return m;
  };
  tracks.push(startTrack(-1),startTrack(1));
  function setTraces(){if(state.z-lastTraceZ<.7)return;lastTraceZ=state.z;
    if(state.airborne)return;
    const x=state.x,z=state.z,y=height(x,z)+.14;
    trailL.push(V(x-.32,y,z));trailR.push(V(x+.32,y,z));
    if(trailL.length>80)trailL.shift();if(trailR.length>80)trailR.shift();
    if(trailL.length<2)return;
    const makePoints=(source)=>Array.from({length:80},(_,i)=>source[Math.min(i,source.length-1)]);
    B.MeshBuilder.CreateLines('track left',{points:makePoints(trailL),instance:tracks[0]});
    B.MeshBuilder.CreateLines('track right',{points:makePoints(trailR),instance:tracks[1]});
  }
  function update(dt){
    if(state.mode!=='play')return;
    const wasAirborne=state.airborne;
    ride.update(input,dt);
    if(wasAirborne&&!state.airborne){trailL=[];trailR=[];lastTraceZ=state.z;}
    skier.position=V(state.x,state.groundHeight+.22+state.jumpHeight,state.z);
    skier.rotation.y=state.heading;
    skierController.animate({
      turn:state.lean,speed:state.speed,time:state.time,braking:input.brake,
      tuck:state.tuck,airborne:state.airborne,impact:state.impact,active:true,
      dt,px:state.x,py:state.groundHeight+state.jumpHeight,pz:state.z
    });
    setTraces();
    $('speed').innerHTML=Math.round(state.speed*3.6)+' <span>km/h</span>';
    $('clock').textContent=Math.floor(state.time/60)+':'+String(Math.floor(state.time%60)).padStart(2,'0');
    $('distance').textContent=Math.round(Math.min(650,state.z))+' / 650 m';
    $('fill').style.width=(clamp(state.z/650,0,1)*100)+'%';
    if(state.z>=650){$('heading').textContent='META!';$('subheading').textContent='Dynamiczny carving, pozycja zjazdowa i skoki — test 0.8.1.';startElement.textContent='↻ JEDŹ PONOWNIE';setMode('finish');}
  }
  // Fixed world-scale chase camera; angle ~53 degrees down to the skier's viewing area.
  function updateCamera(dt){
    const x=state.x,z=state.z,y=height(x,z);
    const wanted=V(x+1.4-state.lean*2,y+46+state.jumpHeight*.12,z-37),view=V(x+Math.sin(state.heading)*7,y+1+state.jumpHeight*.55,z+27);
    camera.position=B.Vector3.Lerp(camera.position,wanted,clamp(dt*3.6,0,1));
    const target=B.Vector3.Lerp(camera.getTarget(),view,clamp(dt*3.9,0,1));
    camera.setTarget(target);
    camera.fov+=((.78+Math.min(state.speed/34,1)*.09)-camera.fov)*clamp(dt*2.6,0,1);
  }
  let oldTime=0,fpsTimer=0,fpsFrames=0;
  engine.runRenderLoop(()=>{
    const now=performance.now(),dt=clamp(oldTime?(now-oldTime)*.001:1/60,0,.06);oldTime=now;
    update(dt);updateCamera(dt);
    resort.update(state.time,state.z);
    scene.render();
    fpsTimer+=dt;fpsFrames++;
    if(fpsTimer>1.5){$('fps').textContent=Math.round(fpsFrames/fpsTimer)+' FPS · BABYLON 0.8.1';fpsTimer=0;fpsFrames=0;}
  });
  window.addEventListener('resize',()=>engine.resize());
  window.__SMR_DEBUG__={
    get:()=>({version:'0.8.1',renderer:'Babylon.js',mode:state.mode,distance:state.z,speed:state.speed,fps:Math.round(engine.getFps()),trees:transforms.length/16,meshes:scene.meshes.length,stage:'08-dynamic-ride',skierParts:skierController.skierMeshes,snowEmitRate:skierController.particles.emitRate,activeCamera:camera.position.asArray(),heading:state.heading,lean:state.lean,tuck:state.tuck,airborne:state.airborne,jumpHeight:state.jumpHeight,impact:state.impact,...resort.stats()}),
    start:play,reset,engine,scene
  };
  reset();
})();