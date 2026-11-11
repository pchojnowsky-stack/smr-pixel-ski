/* SMR Alpine 0.7 | modular skier / carving FX.
   Original procedural low-poly character; no external 3D asset licenses. */
(function(){
"use strict";
function createSkier(B,scene,shadowGenerator) {
  const root=new B.TransformNode("skier-07 world-root",scene);
  const figure=new B.TransformNode("skier-07 figure",scene);
  figure.parent=root;
  const mats={};
  function mat(name,color,rough=.82){
    const m=new B.PBRMaterial("07 / "+name,scene);
    m.albedoColor=B.Color3.FromHexString(color);m.metallic=0;m.roughness=rough;m.backFaceCulling=true;
    return m;
  }
  mats.jacket=mat("jacket red-orange","#d83b29");
  mats.jacketShade=mat("jacket inset","#a82c25");
  mats.jacketAccent=mat("jacket seams","#ffad57");
  mats.pants=mat("pants navy","#1a3449");
  mats.boots=mat("boots","#142433");
  mats.skin=mat("face","#e2a27a");
  mats.helmet=mat("helmet","#233949",.54);
  mats.goggles=mat("goggles blue glass","#72bdd1",.21);
  mats.goggleStrap=mat("goggle elastic","#26303d");
  mats.backpack=mat("backpack blue","#2e6983");
  mats.straps=mat("backpack strap","#203b48");
  mats.gloves=mat("gloves","#27313d");
  mats.skis=mat("skis orange","#e79744",.40);
  mats.skiBase=mat("ski bindings","#1b313d");
  mats.poles=mat("aluminium poles","#3a505c",.33);
  mats.poleGrip=mat("pole grips","#111e29");
  const V=(x,y,z)=>new B.Vector3(x,y,z);
  const tracked=[];
  const fixNormals=(mesh)=>{mesh.isPickable=false;mesh.receiveShadows=false;return mesh;};
  function add(name,fn,parent,material,x=0,y=0,z=0){
    const m=fixNormals(fn());m.name="skier07 / "+name;m.parent=parent;m.position=V(x,y,z);m.material=material;
    tracked.push(m);
    if(shadowGenerator)shadowGenerator.addShadowCaster(m);
    return m;
  }
  function blob(name,parent,material,px,py,pz,sx,sy,sz,segments=12){
    const m=add(name,()=>B.MeshBuilder.CreateSphere(name,{diameter:1,segments},scene),parent,material,px,py,pz);
    m.scaling=V(sx,sy,sz);return m;
  }
  function capsule(name,parent,material,px,py,pz,r,h){
    return add(name,()=>B.MeshBuilder.CreateCapsule(name,{radius:r,height:h,tessellation:10,capSubdivisions:3},scene),parent,material,px,py,pz);
  }
  function box(name,parent,material,px,py,pz,w,h,d){
    return add(name,()=>B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene),parent,material,px,py,pz);
  }
  function cyl(name,parent,material,px,py,pz,d1,d2,h){
    return add(name,()=>B.MeshBuilder.CreateCylinder(name,{diameterTop:d1,diameterBottom:d2,height:h,tessellation:9},scene),parent,material,px,py,pz);
  }
  // 3D human-like hierarchy, knees and shoulders are movable.
  const hips=new B.TransformNode("skier07 / hips",scene);hips.parent=figure;hips.position.y=1.2;
  const upper=new B.TransformNode("skier07 / spine pivot",scene);upper.parent=hips;upper.position.y=.12;
  blob("hips tailored fabric",hips,mats.pants,0,0,0,.77,.47,.53);
  const jacket=capsule("shaped jacket",upper,mats.jacket,0,.49,0,.47,1.18);
  jacket.rotation.x=.13;
  blob("jacket shoulders",upper,mats.jacket,0,.81,0,.98,.32,.53);
  box("front jacket zip",upper,mats.jacketAccent,0,.56,.462,.045,.77,.048);
  blob("neck collar",upper,mats.jacketShade,0,1.12,.04,.39,.22,.38);
  // Helmet, face and goggles: distinct layers visible from third-person view.
  blob("face",upper,mats.skin,0,1.37,.13,.52,.56,.50);
  blob("rounded helmet",upper,mats.helmet,0,1.64,.05,.64,.36,.58,16);
  box("goggle strap left",upper,mats.goggleStrap,-.35,1.52,.30,.10,.12,.15);
  box("goggle strap right",upper,mats.goggleStrap,.35,1.52,.30,.10,.12,.15);
  blob("ski goggles",upper,mats.goggles,0,1.53,.51,.50,.18,.13);
  box("helmet rear strip",upper,mats.jacketAccent,0,1.73,-.47,.35,.045,.045);
  // Back protection / straps are visible in follow-camera view.
  const bag=blob("backpack main",upper,mats.backpack,0,.61,-.49,.68,.82,.29);
  box("backpack centre accent",upper,mats.jacketAccent,0,.57,-.789,.12,.64,.025);
  for(const sign of [-1,1]){
    const strap=box("shoulder strap",upper,mats.straps,sign*.34,.75,-.37,.13,.78,.07);
    strap.rotation.z=-sign*.11;
  }
  const legPivots=[],armPivots=[],skiBlades=[],poleMeshes=[];
  for(const sign of [-1,1]){
    const leg=new B.TransformNode("skier07 / hip joint "+sign,scene);leg.parent=hips;leg.position=V(sign*.29,-.25,0);
    legPivots.push(leg);
    const thigh=capsule("thigh",leg,mats.pants,0,-.19,.09,.21,.69);thigh.rotation.x=-.1;
    const knee=blob("knee pad",leg,mats.pants,0,-.48,.24,.43,.33,.40);
    const shin=capsule("shin",leg,mats.pants,0,-.74,.15,.18,.68);shin.rotation.x=.13;
    const boot=box("ski boot",leg,mats.boots,0,-1.01,.32,.36,.30,.63);
    // Longer lightweight skis with a slightly raised tip.
    const ski=new B.TransformNode("skier07 / independent ski "+sign,scene);
    ski.parent=root;ski.position.x=sign*.33;skiBlades.push(ski);
    box("ski board",ski,mats.skis,0,.10,.23,.23,.075,2.8);
    box("binding",ski,mats.skiBase,0,.19,.25,.31,.17,.37);
    const tip=box("uplifted tip",ski,mats.skis,0,.22,1.56,.24,.08,.48);tip.rotation.x=-.16;
    const arm=new B.TransformNode("skier07 / shoulder "+sign,scene);arm.parent=upper;arm.position=V(sign*.62,.91,.08);
    armPivots.push(arm);
    const upperArm=capsule("upper arm",arm,mats.jacket,sign*.16,-.25,.09,.16,.57);
    upperArm.rotation.z=-sign*.32;
    const forearm=capsule("forearm",arm,mats.jacket,sign*.31,-.64,.30,.125,.48);
    forearm.rotation.x=.30;
    blob("glove",arm,mats.gloves,sign*.34,-.85,.43,.31,.24,.25);
    // Poles sit near the gloves, angled backward as a skier would hold them.
    const pole=cyl("ski pole",arm,mats.poles,sign*.43,-1.24,.12,.042,.042,1.15);
    pole.rotation.x=.23;pole.rotation.z=sign*.09;poleMeshes.push(pole);
    cyl("basket",arm,mats.poleGrip,sign*.53,-1.78,-.02,.25,.25,.025);
  }
  // White soft snow flecks. Re-uses one texture, bounded to a small particle pool.
  const dyn=new B.DynamicTexture("skier07 snow spray sprite",{width:64,height:64},scene,false);
  const ctx=dyn.getContext(),grad=ctx.createRadialGradient(32,32,0,32,32,30);
  grad.addColorStop(0,"rgba(255,255,255,0.93)");
  grad.addColorStop(.35,"rgba(250,253,255,0.8)");
  grad.addColorStop(1,"rgba(239,248,255,0)");
  ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);dyn.hasAlpha=true;dyn.update();
  const particles=new B.ParticleSystem("skier07 soft snow edge spray",100,scene);
  particles.particleTexture=dyn;
  particles.emitter=V(0,-100,0);
  particles.minEmitBox=V(-.4,0,0);particles.maxEmitBox=V(.4,0,0);
  particles.color1=new B.Color4(.95,.98,1,.70);
  particles.color2=new B.Color4(.79,.91,1,.48);
  particles.colorDead=new B.Color4(.92,.96,1,0);
  particles.minSize=.22;particles.maxSize=.65;
  particles.minLifeTime=.17;particles.maxLifeTime=.53;
  particles.minEmitPower=.4;particles.maxEmitPower=1.45;
  particles.updateSpeed=.024;particles.emitRate=0;particles.minAngularSpeed=-2;particles.maxAngularSpeed=2;
  particles.gravity=V(0,-6,0);
  particles.direction1=V(-1.4,.7,-.7);particles.direction2=V(1.4,1.1,-1.6);
  particles.start();
  let lastLean=0;
  const api={
    root,particles,skierMeshes:tracked.length,
    reset(){
      root.rotation.set(0,0,0);
      figure.rotation.set(0,0,0);
      hips.rotation.set(0,0,0);upper.rotation.set(0,0,0);
      for(const arm of armPivots)arm.rotation.set(0,0,0);
      for(const leg of legPivots)leg.rotation.set(0,0,0);
      particles.emitRate=0;lastLean=0;
    },
    animate({turn=0,speed=0,time=0,braking=false,tuck=0,airborne=false,impact=0,active=false,dt=.016,px=0,py=0,pz=0}={}){
      const damping=Math.min(1,Math.max(0,dt)*7);
      lastLean+=(turn-lastLean)*damping;
      const carve=lastLean;
      // A skier leans into edge and keeps shoulders stable while knees bend.
      upper.rotation.z=-carve*(.33+tuck*.23);
      upper.rotation.x=.21+tuck*.53+(airborne?-.12:0)+(braking?-.15:0);
      upper.rotation.y=-carve*.10;
      hips.rotation.z=-carve*.14;
      hips.position.y=1.20-tuck*.30-impact*.13-(braking?.10:0)+Math.sin(time*4)*.014;
      legPivots[0].rotation.x=.10+Math.max(0,-carve)*.22+tuck*.23+(airborne?-.20:0)+(braking?.18:0);
      legPivots[1].rotation.x=.10+Math.max(0,carve)*.22+tuck*.23+(airborne?-.20:0)+(braking?.18:0);
      legPivots[0].rotation.z=carve*.10;
      legPivots[1].rotation.z=carve*.10;
      armPivots[0].rotation.z=-.14+carve*.24+tuck*.20;
      armPivots[1].rotation.z=.14+carve*.24-tuck*.20;
      armPivots[0].rotation.x=Math.sin(time*3)*.035-tuck*.47+(airborne?.25:0)+(braking?-.28:0);
      armPivots[1].rotation.x=-Math.sin(time*3)*.035-tuck*.47+(airborne?.25:0)+(braking?-.28:0);
      figure.rotation.y=-carve*.09;
      figure.rotation.x=(braking?-.12:0)+(airborne?-.14:0)+impact*.08;
      for(const ski of skiBlades){
        ski.rotation.y=-carve*.10;
        ski.rotation.z=-carve*.13;
        ski.rotation.x=airborne?-.16:impact*.08;
      }
      // Continuous but short-lived powder, only when edging or stopping.
      particles.emitter.copyFromFloats(px,py+.33,pz-.50);
      const strength=(Math.min(Math.abs(carve),1)*.65+(braking?.65:0));
      particles.emitRate=active&&!airborne ? Math.min(50,Math.floor(strength*32+Math.max(0,speed-13)*.55)) : 0;
    }
  };
  return api;
}
window.SMR_SKIER={createSkier,version:"0.7.0"};
})();
