/* SMR Pixel Ski 0.5 — Stage I: Babylon.js alpine terrain, winter lighting and elevated chase camera. */
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
  scene.fogDensity=.00072;
  scene.fogColor=new B.Color3(.73,.83,.90);
  scene.imageProcessingConfiguration.contrast=1.12;
  scene.imageProcessingConfiguration.exposure=.96;
  scene.skipPointerMovePicking=true;
  scene.autoClear=true;
  camera=new B.FreeCamera('alpine-camera',new B.Vector3(0,300,-45),scene);
  camera.fov=.86;camera.minZ=.5;camera.maxZ=1800;
  camera.inputs.clear();scene.activeCamera=camera;
  const sky=new B.HemisphericLight('winter skylight',new B.Vector3(-.15,1,.2),scene);
  sky.diffuse=new B.Color3(.83,.88,.98);sky.groundColor=new B.Color3(.57,.67,.77);sky.intensity=.71;
  const sun=new B.DirectionalLight('low winter sun',new B.Vector3(-.66,-.83,.34),scene);
  sun.position=new B.Vector3(260,410,-140);
  sun.diffuse=new B.Color3(1,.95,.89);sun.intensity=1.03;
  let shadows;
  try { shadows=new B.ShadowGenerator(mobile?1024:1536,sun);shadows.usePercentageCloserFiltering=true;shadows.bias=.00045;shadows.normalBias=.035; }
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
  const snow=material('snow · PBR-inspired diffuse',.85,.90,.95,.07);
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
    const grain=Math.floor(random()*22-11);
    const diagonal=Math.sin(x*.12+y*.025)*1.5;
    const val=clamp(247+grain+diagonal,220,255);
    img.data[i]=val;img.data[i+1]=clamp(val+2,0,255);img.data[i+2]=255;img.data[i+3]=255;
  }
  tctx.putImageData(img,0,0);snowTexture.update();
  snowTexture.uScale=30;snowTexture.vScale=43;
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
      colors.push(clamp(.97-.095*haze+variation,.7,1),clamp(.985-.035*haze+variation,.80,1),clamp(1-.025*haze,0,1),1);
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
  makeGroomedPiste();
  // Stylised spruce mesh: tapered branch clusters with snowy branch tips. One draw call for all trees.
  const treeMat=new B.StandardMaterial('spruce vertex color',scene);
  treeMat.diffuseColor=RGB(1,1,1);treeMat.specularColor=RGB(.035,.035,.035);treeMat.useVertexColors=true;treeMat.backFaceCulling=false;
  const positions=[],indices=[],treeColors=[],uvs=[];
  const vtx=(x,y,z,c)=>{let i=positions.length/3;positions.push(x,y,z);treeColors.push(...c,1);uvs.push(0,0);return i;};
  const tri=(a,b,c)=>indices.push(a,b,c);
  const green=[[.075,.29,.26],[.095,.34,.295],[.12,.37,.33],[.065,.255,.25],[.14,.38,.315]];
  for(let k=0;k<8;k++){
    let y=1.1+k*1.60,rad=(6.6-k*.68),topy=y+3.8,segments=9;
    for(let j=0;j<segments;j++){
      let a=j*Math.PI*2/segments,b=(j+1)*Math.PI*2/segments;
      const color=green[(j+k)%green.length];
      tri(vtx(rad*Math.cos(a),y,rad*Math.sin(a),color),vtx(rad*Math.cos(b),y,rad*Math.sin(b),color),vtx(0,topy,0,color));
      if(j%2===0){const snowc=[.83,.91,.94];
        tri(vtx(rad*.76*Math.cos(a),y+.6,rad*.76*Math.sin(a),snowc),vtx(rad*.76*Math.cos(b),y+.6,rad*.76*Math.sin(b),snowc),vtx(0,topy,0,snowc));}
    }
  }
  // thin trunk and smaller branches near the tip
  for(let k=0;k<8;k++){
    let a=k*Math.PI/4,b=(k+1)*Math.PI/4;
    tri(vtx(.42*Math.cos(a),0,.42*Math.sin(a),[.36,.255,.21]),vtx(.42*Math.cos(b),0,.42*Math.sin(b),[.36,.255,.21]),vtx(.18*Math.cos(a),17,.18*Math.sin(a),[.36,.255,.21]));
  }
  const tree=new B.Mesh('instanced winter spruces',scene),treeData=new B.VertexData();
  treeData.positions=positions;treeData.indices=indices;treeData.colors=treeColors;treeData.uvs=uvs;
  const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);treeData.normals=normals;treeData.applyToMesh(tree);
  tree.material=treeMat;tree.isPickable=false;tree.receiveShadows=false;
  const transforms=[];
  function addTree(x,z,s){const mat=B.Matrix.Compose(new B.Vector3(s,s,s),B.Quaternion.RotationAxis(B.Axis.Y,random()*Math.PI*2),V(x,height(x,z)-.6,z));mat.copyToArray(transforms,transforms.length);}
  for(let i=0;i<950;i++){
    const z=48+random()*820,side=random()<.5?-1:1;
    const dist=pisteWidth(z)+8+Math.pow(random(),1.75)*150;
    const x=center(z)+side*dist;
    if(Math.abs(x)>355)continue;
    addTree(x,z,.52+random()*.65);
  }
  tree.thinInstanceSetBuffer('matrix',new Float32Array(transforms),16,true);
  tree.thinInstanceRefreshBoundingInfo();
  if(shadows)shadows.addShadowCaster(tree,false);
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
  // Chairlift line in the forest. Continuous cable, support towers and moving chairs.
  function support(x,z){
    const y=height(x,z),h=22;
    const pillar=B.MeshBuilder.CreateCylinder('lift tower',{height:h,diameterTop:.8,diameterBottom:1.45,tessellation:8},scene);
    pillar.position=V(x,y+h/2,z);pillar.material=metal;if(shadows)shadows.addShadowCaster(pillar);
    const beam=B.MeshBuilder.CreateBox('lift crossbeam',{width:13,height:.65,depth:1.0},scene);
    beam.position=V(x,y+h+.5,z);beam.material=metal;if(shadows)shadows.addShadowCaster(beam);
    for(const side of [-1,1]){
      const roller=B.MeshBuilder.CreateCylinder('sheave',{height:.6,diameter:1},scene);
      roller.rotation.z=Math.PI/2;roller.position=V(x+side*4.2,y+h+1.1,z);roller.material=darkMetal;
    }
  }
  const cablePoints1=[],cablePoints2=[];
  for(let z=-40;z<800;z+=15){let x=center(z)+83,yy=height(x,z)+24;
    cablePoints1.push(V(x-4,yy,z));cablePoints2.push(V(x+4,yy,z));}
  for(let z=60;z<820;z+=135){support(center(z)+83,z);}
  for(const points of [cablePoints1,cablePoints2]){
    const l=B.MeshBuilder.CreateLines('cable wire',{points,updatable:false},scene);l.color=RGB(.24,.31,.34);
  }
  const chairs=[];
  for(let i=0;i<14;i++){
    const group=new B.TransformNode('chair '+i,scene);
    const pole=B.MeshBuilder.CreateCylinder('chair hanger',{height:4.3,diameter:.17,tessellation:6},scene);
    pole.position.y=-2;pole.parent=group;pole.material=metal;
    const seat=B.MeshBuilder.CreateBox('chair seat',{width:3.5,height:.25,depth:1.15},scene);
    seat.position.y=-4.35;seat.parent=group;seat.material=metal;
    const back=B.MeshBuilder.CreateBox('chair back',{width:3.5,height:1.3,depth:.2},scene);
    back.position=V(0,-3.55,.47);back.parent=group;back.material=metal;
    const bar=B.MeshBuilder.CreateBox('chair safety',{width:3.7,height:.13,depth:.13},scene);
    bar.position=V(0,-3.4,-.4);bar.parent=group;bar.material=darkMetal;
    chairs.push(group);
  }
  // A recognizable skier silhouette while testing the rendering pipeline.
  const skier=new B.TransformNode('skier root',scene);
  const smat=material('navy skisuit',.15,.30,.38),hat=material('orange helmet stripe',.92,.33,.17);
  const part=(name,make,par,mat,pos,rot)=>{const m=make();m.name=name;m.parent=par;m.position=pos;m.material=mat;if(rot)m.rotation=rot;if(shadows)shadows.addShadowCaster(m);return m;};
  const box=(w,h,d)=>B.MeshBuilder.CreateBox('part',{width:w,height:h,depth:d},scene);
  const sphere=(a,b)=>B.MeshBuilder.CreateSphere('rounded part',{diameter:a,segments:b||10},scene);
  const capsule=(r,h)=>B.MeshBuilder.CreateCapsule('body',{radius:r,height:h,tessellation:10},scene);
  const torso=part('torso',()=>capsule(.49,1.42),skier,jacket,V(0,1.42,0));torso.rotation.x=.22;
  const head=part('head',()=>sphere(.70,12),skier,helmet,V(0,2.35,.10));
  part('visor',()=>box(.65,.18,.24),skier,goggles,V(0,2.42,.48));
  const leftLeg=part('leg left',()=>capsule(.16,.92),skier,smat,V(-.27,.47,-.04));
  const rightLeg=part('leg right',()=>capsule(.16,.92),skier,smat,V(.27,.47,-.04));
  const leftArm=part('arm left',()=>capsule(.135,.88),skier,jacket,V(-.58,1.5,.15),V(0,0,.32));
  const rightArm=part('arm right',()=>capsule(.135,.88),skier,jacket,V(.58,1.5,.15),V(0,0,-.32));
  const lski=part('ski left',()=>box(.16,.11,2.5),skier,skiMat,V(-.29,.03,.15));
  const rski=part('ski right',()=>box(.16,.11,2.5),skier,skiMat,V(.29,.03,.15));
  const poleMat=darkMetal;
  for(const sign of [-1,1]){
    const pole=B.MeshBuilder.CreateCylinder('ski pole',{height:1.8,diameter:.035,tessellation:5},scene);
    pole.parent=skier;pole.position=V(sign*.75,.9,-.7);pole.rotation.x=.58;pole.material=poleMat;
  }
  // Individual skier meshes above already cast shadows.
  const input={left:false,right:false,brake:false};
  const state={mode:'menu',x:center(0),z:0,speed:13,lean:0,time:0,fps:0};
  const startElement=$('start'),overlay=$('overlay');
  const setMode=m=>{state.mode=m;overlay.hidden=m==='play';$('pause').textContent=m==='pause'?'▶':'Ⅱ';};
  const reset=()=>{state.x=center(0);state.z=0;state.speed=13;state.lean=0;state.time=0;skier.position=V(state.x,height(state.x,0)+.25,0);camera.position=V(state.x,height(state.x,0)+82,-38);};
  const play=()=>{if(state.mode!=='pause')reset();setMode('play');};
  const pause=()=>{if(state.mode==='play'){$('heading').textContent='PAUZA';$('subheading').textContent='Wznów zjazd, aby kontynuować test nowej kamery i oświetlenia.';startElement.textContent='▶ KONTYNUUJ';setMode('pause');}else if(state.mode==='pause')setMode('play');};
  startElement.onclick=play;$('pause').onclick=pause;
  for(const key of ['left','right','brake']){
    const el=$(key);const release=e=>{input[key]=false;el.classList.remove('pressed');e.preventDefault();};
    el.addEventListener('pointerdown',e=>{input[key]=true;el.classList.add('pressed');e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_){}});
    for(const t of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(t,release);
  }
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowDown',' ','a','A','d','D','Escape'].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')input.left=true;
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')input.right=true;
    if(e.key==='ArrowDown'||e.key===' ')input.brake=true;
    if(e.key==='Escape')pause();
  });
  window.addEventListener('keyup',e=>{
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')input.left=false;
    if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')input.right=false;
    if(e.key==='ArrowDown'||e.key===' ')input.brake=false;
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
    state.time+=dt;
    const steer=Number(input.right)-Number(input.left);
    const offPiste=Math.abs(state.x-center(state.z))>pisteWidth(state.z);
    const incline=(height(state.x,state.z)-height(state.x,state.z+3))/3;
    const accel=5+incline*8-.022*state.speed*state.speed-(input.brake?16:0)-(offPiste?9:0);
    state.speed=clamp(state.speed+accel*dt,4,25);
    state.z+=state.speed*dt;
    state.x+=steer*state.speed*.83*dt+(center(state.z)-state.x)*.06*dt;
    state.lean+=(steer-state.lean)*clamp(dt*5,0,1);
    skier.position=V(state.x,height(state.x,state.z)+.25,state.z);
    skier.rotation.z=-state.lean*.32;skier.rotation.y=-state.lean*.19;
    leftArm.rotation.x=.25+.1*Math.sin(state.time*2);rightArm.rotation.x=-.15+.1*Math.sin(state.time*2);
    setTraces();
    $('speed').innerHTML=Math.round(state.speed*3.6)+' <span>km/h</span>';
    $('clock').textContent=Math.floor(state.time/60)+':'+String(Math.floor(state.time%60)).padStart(2,'0');
    $('distance').textContent=Math.round(Math.min(650,state.z))+' / 650 m';
    $('fill').style.width=(clamp(state.z/650,0,1)*100)+'%';
    if(state.z>=650){$('heading').textContent='META!';$('subheading').textContent='Pierwszy fragment nowej scenerii ukończony. To etap I: teren, kamera i oświetlenie.';startElement.textContent='↻ JEDŹ PONOWNIE';setMode('finish');}
  }
  // Fixed world-scale chase camera; angle ~53 degrees down to the skier's viewing area.
  function updateCamera(dt){
    const x=state.x,z=state.z,y=height(x,z);
    const wanted=V(x+1.4,y+54,z-32),view=V(x,y+1,z+37);
    camera.position=B.Vector3.Lerp(camera.position,wanted,clamp(dt*3.6,0,1));
    const target=B.Vector3.Lerp(camera.getTarget(),view,clamp(dt*3.9,0,1));
    camera.setTarget(target);
  }
  let oldTime=0,fpsTimer=0,fpsFrames=0;
  engine.runRenderLoop(()=>{
    const now=performance.now(),dt=clamp(oldTime?(now-oldTime)*.001:1/60,0,.06);oldTime=now;
    update(dt);updateCamera(dt);
    for(let i=0;i<chairs.length;i++){
      const z=80+(i*51+state.time*5)%690;
      const x=center(z)+83+(i%2?4:-4);
      chairs[i].position=V(x,height(x,z)+24,z);
    }
    scene.render();
    fpsTimer+=dt;fpsFrames++;
    if(fpsTimer>1.5){$('fps').textContent=Math.round(fpsFrames/fpsTimer)+' FPS · BABYLON 0.5';fpsTimer=0;fpsFrames=0;}
  });
  window.addEventListener('resize',()=>engine.resize());
  window.__SMR_DEBUG__={
    get:()=>({version:'0.5.0',renderer:'Babylon.js',mode:state.mode,distance:state.z,speed:state.speed,fps:Math.round(engine.getFps()),trees:transforms.length/16,meshes:scene.meshes.length,activeCamera:camera.position.asArray()}),
    start:play,reset,engine,scene
  };
  reset();camera.setTarget(V(state.x,height(state.x,0)+1,26));
})();