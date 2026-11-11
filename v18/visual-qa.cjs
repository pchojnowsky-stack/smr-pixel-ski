/* Real browser WebGL2 smoke + dual-stick mobile interactions for SnowEngine 1.5 */
const fs=require("node:fs"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright");
const root=path.resolve(__dirname,".."),out=path.join(__dirname,"qa");
const mime={".html":"text/html",".js":"application/javascript",".json":"application/json",".css":"text/css"};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,"http://localhost"),pathname=decodeURIComponent(url.pathname);
 const f=path.resolve(root,"."+pathname),safe=f===root||f.startsWith(root+path.sep);
 if(!safe){res.writeHead(403).end();return;}
 const file=f===path.join(root,"v18")?path.join(f,"index.html"):f;
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end("Not found");return;}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(4158,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try{
  fs.mkdirSync(out,{recursive:true});
  for(const [name,width,height,zone,run] of [["landscape",1280,720,"hala","4"],["portrait",390,844,"golgota","10"],["skrzyczne",1280,720,"skrzyczne","21"]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
   await page.goto("http://127.0.0.1:4158/v18/?zone="+zone+"&run="+run,{waitUntil:"domcontentloaded",timeout:60000});
   try{await page.waitForFunction(()=>window.__SMR_DEBUG__?.get().frame>2,{timeout:60000});}
    catch(e){const diag=await page.evaluate(()=>({error:document.querySelector("#error")?.textContent,errorHidden:document.querySelector("#error")?.hidden,ready:document.readyState,debug:!!window.__SMR_DEBUG__,scripts:[...document.scripts].map(x=>x.src),html:document.querySelector("#overlay")?.hidden}));throw Error(name+" startup failed: "+JSON.stringify(diag)+" JS: "+errors.join(" | ")+" :: "+e.message);}
   const initial=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(zone==="skrzyczne"&&!initial.liftTypes.some(l=>l.ref==="C10"&&l.type==="drag"))throw Error("C10 orczyk not modeled");
   if(!initial.nmtSource||initial.nmtSource!=="GUGiK NMT"||initial.terrainSpacingM>9)
    throw Error("Real GUGiK NMT terrain missing from "+zone+": "+JSON.stringify({source:initial.terrainSource,nmt:initial.nmtSource,spacing:initial.terrainSpacingM}));
   if(zone==="hala"&&(initial.landmarkCount<3||initial.landmarkVertices<600))
    throw Error("Author landmark geometry not present: "+JSON.stringify({count:initial.landmarkCount,verts:initial.landmarkVertices}));
   if(initial.version!=="1.8.0"||!initial.webgl2||initial.pistePosts<20||initial.extraTrees!==0||initial.osmTreesOnly!==true||initial.resortTrees<40||initial.resortBuildings<5||!initial.liftTypes?.length||initial.buildingDetails<1)throw Error("Bad piste scene: "+JSON.stringify(initial));
   if(!await page.locator("#incline").count())throw Error("Slope HUD missing");
   if(await page.locator("#controls button").count()!==2)throw Error("Expected two pole controls");
   await page.locator("#start").click();
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().mode==="play");
   // Regression: real browser hit-testing. Synthetic dispatchEvent used below does NOT
   // catch pointer-events:none inherited from #controls.
   for(const [id,sign] of [["left",-1],["right",1]]){
    const button=page.locator("#"+id),rect=await button.boundingBox();
    if(!rect||rect.width<32||rect.height<32)throw Error(id+" pole button not visible");
    const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    const hit=await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.closest("button")?.id||null,[x,y]);
    if(hit!==id)throw Error(id+" button is not touch-hit-testable, element hit="+hit);
    const before=await page.evaluate(()=>window.__SMR_DEBUG__.get().heading);
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.waitForFunction(id=>window.__SMR_DEBUG__.get().controls[id]===true,id,{timeout:10000});
    await page.waitForFunction(([before,sign])=>{
     const heading=window.__SMR_DEBUG__.get().heading;
     return sign*(heading-before)>.06;
    },[before,sign],{timeout:18000});
    await page.mouse.up();
    await page.waitForFunction(id=>!window.__SMR_DEBUG__.get().controls[id],id,{timeout:5000});
   }
   await page.locator("#left").dispatchEvent("pointerdown",{pointerId:1});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().controls.left);
   await page.locator("#right").dispatchEvent("pointerdown",{pointerId:2});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().controls.tuck);
   await page.waitForTimeout(300);
   await page.locator("#left").dispatchEvent("pointerup",{pointerId:1});
   await page.locator("#right").dispatchEvent("pointerup",{pointerId:2});
   await page.waitForFunction(()=>!window.__SMR_DEBUG__.get().controls.tuck);
   await page.locator("#left").dispatchEvent("pointerdown",{pointerId:3});
   await page.waitForTimeout(150);
   await page.locator("#left").dispatchEvent("pointerup",{pointerId:3});
   await page.locator("#left").dispatchEvent("pointerdown",{pointerId:4});
   await page.locator("#right").dispatchEvent("pointerdown",{pointerId:5});
   await page.locator("#left").dispatchEvent("pointerup",{pointerId:4});
   await page.locator("#right").dispatchEvent("pointerup",{pointerId:5});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:12000});
   await page.locator("#right").dispatchEvent("pointerdown",{pointerId:6});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().trickActive||window.__SMR_DEBUG__.get().trickCompleted>0,{timeout:12000});
   await page.locator("#right").dispatchEvent("pointerup",{pointerId:6});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().trickCompleted>0,{timeout:12000});
   await page.screenshot({path:path.join(out,name+".png")});
   const result=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   fs.writeFileSync(path.join(out,name+".json"),JSON.stringify({initial,result,errors},null,2));
   if(errors.length)throw Error(name+": "+errors.join(" | "));
   console.log(name+" PASS "+JSON.stringify({pistePosts:result.pistePosts,netPanels:result.netPanels,extraTrees:result.extraTrees,trees:result.trees,trickCompleted:result.trickCompleted,buildingDetails:result.buildingDetails,buildingWindows:result.buildingWindows,lifts:result.liftTypes,grade:result.inclinePercent,source:result.terrainSource,terrainVertices:result.terrainVertices,landmarkCount:result.landmarkCount,osmTreesOnly:result.osmTreesOnly,osmForestPolygonCount:result.osmForestPolygonCount,osmMappedBuildings:result.osmTotalMappedBuildings,frame:result.frame}));
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;server.close();});