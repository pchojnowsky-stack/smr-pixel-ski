/* SMR Spruce 0.9.2: original branch-layer winter trees.
   Thin instancing keeps a single canopy draw call and one trunk draw call. */
(function(){
"use strict";
function createForest(B,scene,trees,height){
 const V=(x,y,z)=>new B.Vector3(x,y,z);
 const pos=[],cols=[],idx=[];
 const cTree=[[.085,.29,.235],[.065,.24,.22],[.105,.33,.27],[.045,.205,.205],[.11,.355,.3]];
 const cSnow=[[.83,.91,.97],[.94,.975,1],[.74,.85,.95]];
 const vertex=(x,y,z,color)=>{const i=pos.length/3;pos.push(x,y,z);cols.push(...color,1);return i;};
 const face=(a,b,c)=>idx.push(a,b,c);
 const levels=10,sides=9;
 for(let k=0;k<levels;k++){
  const h=1.1+k*1.43,span=(6.3-k*.53),bend=k*.13;
  for(let t=0;t<sides;t++){
   const a=(t+(k%2)*.5)*2*Math.PI/sides;
   const nx=Math.cos(a),nz=Math.sin(a),tx=-nz,tz=nx;
   const spread=span*(.83+.12*Math.sin(k*7.23+t*3.52));
   const width=spread*.27;
   const shade=cTree[(k+t*2)%cTree.length];
   const l=vertex(nx*.29+tx*width,h+.24,nz*.29+tz*width,shade);
   const rr=vertex(nx*.29-tx*width,h+.24,nz*.29-tz*width,shade);
   const tip=vertex(nx*spread,h-.56-bend,nz*spread,shade);
   const stem=vertex(nx*.1,h+2.2,nz*.1,cTree[(k+t+2)%cTree.length]);
   face(l,tip,stem);face(tip,rr,stem);
   if((t+k)%4!==1){
    const snow=cSnow[(t+k)%cSnow.length];
    const sl=vertex(nx*.38+tx*width*.7,h+.42,nz*.38+tz*width*.7,snow);
    const sr=vertex(nx*.38-tx*width*.7,h+.42,nz*.38-tz*width*.7,snow);
    const st=vertex(nx*spread*.84,h+.20-bend*.5,nz*spread*.84,snow);
    face(sl,st,sr);
   }
  }
 }
 for(let t=0;t<9;t++){
  const a=2*Math.PI*t/9,b=2*Math.PI*(t+1)/9;
  face(vertex(.73*Math.cos(a),15.5,.73*Math.sin(a),cTree[t%5]),
       vertex(.73*Math.cos(b),15.5,.73*Math.sin(b),cTree[(t+1)%5]),
       vertex(0,19.2,0,cTree[(t+2)%5]));
 }
 const m=new B.Mesh("SMR procedural layered snow spruce",scene),data=new B.VertexData();
 const normals=[];B.VertexData.ComputeNormals(pos,idx,normals);
 data.positions=pos;data.indices=idx;data.colors=cols;data.normals=normals;data.applyToMesh(m);
 const material=new B.StandardMaterial("spruce layered winter vertex-color",scene);
 material.diffuseColor=new B.Color3(1,1,1);
 material.specularColor=new B.Color3(.055,.065,.06);
 material.useVertexColors=true;material.backFaceCulling=false;
 m.material=material;m.isPickable=false;
 const trunk=B.MeshBuilder.CreateCylinder("spruce trunk source",{height:4.4,diameterTop:.4,diameterBottom:1.1,tessellation:7},scene);
 const wood=new B.StandardMaterial("spruce timber",scene);wood.diffuseColor=new B.Color3(.35,.26,.23);trunk.material=wood;
 const leafMatrices=[],trunkMatrices=[];
 for(let i=0;i<trees.length;i++){
  const [x,z,s]=trees[i],y=height(x,z);
  const rot=B.Quaternion.RotationAxis(B.Axis.Y,((i*2.39996)%6.283));
  B.Matrix.Compose(V(s,s,s),rot,V(x,y,z)).copyToArray(leafMatrices,leafMatrices.length);
  B.Matrix.Compose(V(s,s,s),rot,V(x,y+2*s,z)).copyToArray(trunkMatrices,trunkMatrices.length);
 }
 m.thinInstanceSetBuffer("matrix",new Float32Array(leafMatrices),16,true);
 trunk.thinInstanceSetBuffer("matrix",new Float32Array(trunkMatrices),16,true);
 m.thinInstanceRefreshBoundingInfo();trunk.thinInstanceRefreshBoundingInfo();
 return {mesh:m,trunks:trunk,count:trees.length,triangles:idx.length/3,drawMeshes:2};
}
window.SMR_FOREST={createForest,version:"0.9.2"};
})();
