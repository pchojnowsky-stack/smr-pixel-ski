const fs=require("node:fs"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright");
const root=__dirname;
const srv=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://127.0.0.1"),f=path.resolve(root,"."+decodeURIComponent(u.pathname));
 if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const dest=f===root?path.join(root,"index.html"):f;
 fs.readFile(dest,(err,buf)=>{if(err){res.writeHead(404).end();return;}
  res.setHeader("Content-Type",dest.endsWith(".js")?"application/javascript":dest.endsWith(".json")?"application/json":dest.endsWith(".html")?"text/html":"application/octet-stream");res.end(buf);});
});
(async()=>{
 await new Promise(r=>srv.listen(4134,"127.0.0.1",r));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try {
  const cases=[
   ["hala", "4", 5,2,844,390],
   ["golgota","10",3,1,844,390],
   ["skrzyczne","21",8,4,844,390],
   ["hala","5",5,2,390,844]
  ];
  for(const [zone,ref,runs,lifts,width,height] of cases){
   const name=zone+"-"+ref+(height>width?"-portrait":"-landscape");
   const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});
   const page=await ctx.newPage();const errors=[];
   page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
   await page.goto("http://127.0.0.1:4134/?zone="+zone+"&run="+ref,{waitUntil:"domcontentloaded",timeout:60000});
   try{await page.waitForFunction(()=>window.__SMR_DEBUG__&&window.__SMR_DEBUG__.get().frame>2,{timeout:65000});}
   catch(e){throw Error(name+" startup failed "+JSON.stringify(await page.evaluate(()=>({error:document.querySelector("#error")?.textContent,html:document.querySelector("#error")?.hidden,ready:document.readyState})))+" "+errors.join(" | "));}
   const initial=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(initial.zone!==zone||initial.runRef!==ref||initial.resortRunCount!==runs||initial.resortLiftCount!==lifts||initial.terrainVertices<10000||initial.chairs<5)
    throw Error(name+" wrong scene "+JSON.stringify(initial));
   if(await page.locator("#sectorSelect option").count()!==3||await page.locator("#runSelect option").count()!==runs)
    throw Error(name+" broken resort selection");
   if(await page.locator("#controls button").count()!==4)throw Error(name+" four-button mobile contract broken");
   await page.locator("#start").click();
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().mode==="play",{timeout:10000});
   if(zone==="hala"&&ref==="4"){
    const before=await page.evaluate(()=>window.__SMR_DEBUG__.get());
    await page.locator("#accelerate").dispatchEvent("pointerdown",{pointerId:13});
    await page.waitForFunction(v=>window.__SMR_DEBUG__.get().speed>v+1,before.speed,{timeout:30000});
    await page.locator("#accelerate").dispatchEvent("pointerup",{pointerId:13});
    await page.locator("#jump").dispatchEvent("pointerdown",{pointerId:15});
    await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:25000});
    await page.locator("#jump").dispatchEvent("pointerup",{pointerId:15});
    await page.locator("#left").dispatchEvent("pointerdown",{pointerId:16});
    await page.waitForFunction(()=>window.__SMR_DEBUG__.get().trickActive,{timeout:18000});
    await page.locator("#left").dispatchEvent("pointerup",{pointerId:16});
    await page.waitForFunction(()=>window.__SMR_DEBUG__.get().trickCompleted===1,{timeout:25000});
   }
   if(zone==="skrzyczne"){await page.locator("#resortMenu").click();await page.waitForFunction(()=>window.__SMR_DEBUG__.get().mode==="pause");}
   fs.mkdirSync(path.join(root,"qa"),{recursive:true});
   await page.screenshot({path:path.join(root,"qa",name+".png")});
   const last=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   fs.writeFileSync(path.join(root,"qa",name+".json"),JSON.stringify({initial,last},null,2));
   if(errors.length)throw Error(name+" JS console errors: "+errors.join(" | "));
   console.log("RESORT MOBILE QA "+name+" PASS "+JSON.stringify({runs:last.resortRunCount,lifts:last.resortLiftCount,trees:last.resortTrees,cells:last.terrainVertices}));
   await ctx.close();
  }
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;srv.close();});