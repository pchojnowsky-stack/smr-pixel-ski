/* Real browser WebGL2 smoke + dual-stick mobile interactions for SnowEngine 1.5 */
const fs=require("node:fs"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright");
const root=path.resolve(__dirname,".."),out=path.join(__dirname,"qa");
const mime={".html":"text/html",".js":"application/javascript",".json":"application/json",".css":"text/css"};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,"http://localhost"),pathname=decodeURIComponent(url.pathname);
 const f=path.resolve(root,"."+pathname),safe=f===root||f.startsWith(root+path.sep);
 if(!safe){res.writeHead(403).end();return;}
 const file=f===path.join(root,"v15")?path.join(f,"index.html"):f;
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end("Not found");return;}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(4156,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try{
  fs.mkdirSync(out,{recursive:true});
  for(const [name,width,height,zone,run] of [["landscape",1280,720,"hala","4"],["portrait",390,844,"golgota","10"]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
   await page.goto("http://127.0.0.1:4156/v16/?zone="+zone+"&run="+run,{waitUntil:"domcontentloaded",timeout:60000});
   try{await page.waitForFunction(()=>window.__SMR_DEBUG__?.get().frame>2,{timeout:60000});}
    catch(e){const diag=await page.evaluate(()=>({error:document.querySelector("#error")?.textContent,errorHidden:document.querySelector("#error")?.hidden,ready:document.readyState,debug:!!window.__SMR_DEBUG__,scripts:[...document.scripts].map(x=>x.src),html:document.querySelector("#overlay")?.hidden}));throw Error(name+" startup failed: "+JSON.stringify(diag)+" JS: "+errors.join(" | ")+" :: "+e.message);}
   const initial=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(initial.version!=="1.6.0"||!initial.webgl2||initial.pistePosts<20||initial.extraTrees<10||!initial.liftTypes?.length||initial.buildingDetails<1)throw Error("Bad piste scene: "+JSON.stringify(initial));
   if(!await page.locator("#incline").count())throw Error("Slope HUD missing");
   if(await page.locator("#controls button").count()!==2)throw Error("Expected two pole controls");
   await page.locator("#start").click();
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().mode==="play");
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
   console.log(name+" PASS "+JSON.stringify({pistePosts:result.pistePosts,netPanels:result.netPanels,extraTrees:result.extraTrees,trees:result.trees,trickCompleted:result.trickCompleted,buildingDetails:result.buildingDetails,buildingWindows:result.buildingWindows,lifts:result.liftTypes,grade:result.inclinePercent,frame:result.frame}));
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;server.close();});