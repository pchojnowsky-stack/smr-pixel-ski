/* SMR 0.8 — original modular resort scenery, no third party 3D assets. */
(function(){
"use strict";
function createResort(B,scene,{height,center,shadowGenerator,terrainEnd=820}){
 const V=(x,y,z)=>new B.Vector3(x,y,z),objects=[],chairs=[],skiers=[];
 const mat=(name,color)=>{const m=new B.StandardMaterial("resort08 "+name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(.07,.07,.07);return m;};
 const M={timber:mat("timber","#8a6146"),woodDark:mat("timber trim","#473d37"),glass:mat("glass","#78aabb"),roof:mat("slate","#334652"),steel:mat("steel","#748592"),black:mat("cables","#243642"),orange:mat("route accents","#f0a84e"),blue:mat("sign blue","#285c80"),white:mat("snow","#e9f4ff"),red:mat("npc red","#db543e"),teal:mat("npc teal","#2f9d9e")};
 function box(name,parent,w,h,d,x,y,z,material){const v=B.MeshBuilder.CreateBox("resort08 "+name,{width:w,height:h,depth:d},scene);v.parent=parent;v.position=V(x,y,z);v.material=material;v.isPickable=false;objects.push(v);return v;}
 function cyl(name,parent,h,top,bottom,x,y,z,material){const v=B.MeshBuilder.CreateCylinder("resort08 "+name,{height:h,diameterTop:top,diameterBottom:bottom,tessellation:8},scene);v.parent=parent;v.position=V(x,y,z);v.material=material;v.isPickable=false;objects.push(v);return v;}
 function root(name,x,z){const n=new B.TransformNode(name,scene);n.position=V(x,height(x,z),z);return n;}
 function building(name,x,z,width=17,depth=12,station=false){
   const n=root("resort08 "+name,x,z);
   box(name+" base",n,width+3,1.3,depth+3,0,.65,0,M.woodDark);
   box(name+" timber facade",n,width,8,depth,0,5.1,0,M.timber);
   box(name+" upper band",n,width+.7,.6,depth+.7,0,9.2,0,M.woodDark);
   for(const side of [-1,1]){const e=box(name+" roof",n,width/2+2,.6,depth+3,side*(width/4),11.2,0,M.roof);e.rotation.z=side*.34;}
   for(let i=-2;i<=2;i++)box(name+" panoramic window",n,2.25,3,.19,i*(width-3)/5,5,-depth/2-.12,M.glass);
   box(name+" entrance",n,2.7,4,.24,0,3.1,-depth/2-.2,M.woodDark);
   if(station){box(name+" canopy",n,width+6,.6,depth+4,0,10.0,-depth/2-3,M.roof);}
   return n;
 }
 // Place station buildings beside the groomed route; human-sized details are preserved.
 building("top lift station",center(55)+84,55,17,13,true);
 building("bottom lift station",center(690)+84,690,19,15,true);
 const lodge=building("piste terrace bar",center(300)-87,300,24,14);
 box("terrace decking",lodge,30,.55,17,0,1.55,-14,M.timber);
 for(let i=-3;i<=3;i++){
   box("terrace table "+i,lodge,2.2,.16,2.2,i*3.9,2.65,-15,M.woodDark);
   cyl("table leg "+i,lodge,1,.23,.23,i*3.9,2.02,-15,M.steel);
   box("terrace chair "+i,lodge,1.2,.26,1.1,i*3.9,2.17,-12.5,M.timber);
 }
 for(let i=-5;i<=5;i++)box("terrace fence "+i,lodge,.17,1.7,.17,i*2.9,2.4,-22,M.timber);
 // One fully closed chairlift circulation loop (ascending on one side, descending on the other).
 const startZ=65,endZ=685,lineOffset=83,lane=4.2,upperHeight=23;
 const lineX=z=>center(z)+lineOffset;
 const lineY=z=>height(lineX(z),z)+upperHeight;
 const ptsA=[],ptsB=[];
 for(let z=startZ;z<=endZ;z+=8){const yy=lineY(z);ptsA.push(V(lineX(z)-lane,yy,z));ptsB.push(V(lineX(z)+lane,yy,z));}
 function cable(points){const l=B.MeshBuilder.CreateLines("resort08 lift cable",{points},scene);l.color=B.Color3.FromHexString("#34434c");l.isPickable=false;objects.push(l);}
 cable(ptsA);cable(ptsB);
 for(let z=95;z<=660;z+=110){
   const r=root("resort08 support "+z,lineX(z),z);
   cyl("lift column",r,22,1,1.5,0,11,0,M.steel);
   box("lift crossbeam",r,13,.55,1.1,0,22.2,0,M.steel);
   for(const side of [-1,1]){
     const roller=cyl("lift sheave",r,.35,1.1,1.1,side*lane,22.9,0,M.black);roller.rotation.z=Math.PI/2;
   }
 }
 for(let i=0;i<16;i++){
   const n=new B.TransformNode("resort08 circulating chair "+i,scene);
   cyl("chair hanger "+i,n,4.6,.14,.14,0,-2.35,0,M.steel);
   box("chair seat "+i,n,3.35,.23,1.08,0,-4.7,0,M.blue);
   box("chair back "+i,n,3.35,1.4,.23,0,-3.94,.47,M.blue);
   box("chair safety bar "+i,n,3.5,.14,.16,0,-3.8,-.42,M.steel);
   chairs.push(n);
 }
 // Sloped piste wayfinding; these are stylised signs, not authoritative SMR maps.
 for(const [z,labelSide] of [[170,1],[420,-1],[585,1]]){
   const x=center(z)+labelSide*45,n=root("resort08 piste sign "+z,x,z);
   cyl("route post",n,5,.23,.28,0,2.5,0,M.steel);
   box("route blue sign",n,4.1,1.6,.3,0,5.0,0,M.blue);
   box("route white arrow",n,1.8,.17,.34,labelSide*.5,5,0,M.white);
 }
 // NPC shapes share common materials; animation is only updated while near player.
 for(let i=0;i<9;i++){
   const n=new B.TransformNode("resort08 npc skier "+i,scene);
   const body=cyl("npc jacket",n,1.5,.68,.9,0,1.85,0,i%2?M.teal:M.red);
   const head=B.MeshBuilder.CreateSphere("resort08 npc helmet",{diameter:.55,segments:8},scene);head.parent=n;head.position.y=2.8;head.material=M.black;objects.push(head);
   for(const side of [-1,1])box("npc ski",n,.20,.08,2.25,side*.27,.12,.3,M.orange);
   n.position=V(center(115+i*57)+Math.sin(i*17)*18,height(center(115+i*57),115+i*57),115+i*57);
   skiers.push({root:n,phase:i*1.7,start:115+i*57,lane:Math.sin(i*17)*18});
 }
 function update(time,playerZ){
   const range=endZ-startZ,period=range*2;
   for(let i=0;i<chairs.length;i++){
     const d=((i/chairs.length)*period+time*6)%period;
     const down=d<range,z=down?startZ+d:endZ-(d-range);
     const x=lineX(z)+(down?-lane:lane);
     chairs[i].position=V(x,lineY(z),z);
     chairs[i].rotation.y=down?0:Math.PI;
     chairs[i].setEnabled(Math.abs(z-playerZ)<390);
   }
   for(let i=0;i<skiers.length;i++){
     const p=skiers[i],z=115+((p.start-115+time*(4+i%3))%590);
     const x=center(z)+p.lane+Math.sin(time*1.3+p.phase)*2.5;
     const visible=Math.abs(z-playerZ)<145;
     p.root.setEnabled(visible);
     if(visible){p.root.position.copyFromFloats(x,height(x,z)+.1,z);p.root.rotation.z=Math.sin(time*1.3+p.phase)*.08;}
   }
 }
 update(0,0);
 return {update,stats:()=>({resortMeshes:objects.length,liftChairs:chairs.length,liftTowers:6,npcs:skiers.length})};
}
window.SMR_RESORT={version:"0.8.0",createResort};
})();