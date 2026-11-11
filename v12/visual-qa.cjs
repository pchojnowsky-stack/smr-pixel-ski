const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),{chromium}=require("playwright");
const root=__dirname;
const srv=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://127.0.0.1"),f=path.resolve(root,"."+decodeURIComponent(u.pathname));
 if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const dest=f===root?path.join(root,"index.html"):f;
 fs.readFile(dest,(e,b)=>{if(e){res.writeHead(404).end();return;}
  res.setHeader("Content-Type",dest.endsWith(".html")?"text/html":dest.endsWith(".js")?"application/javascript":dest.endsWith(".json")?"application/json":"application/octet-stream");res.end(b);
 });
});
(async()=>{
 await new Promise(ok=>srv.listen(4132,"127.0.0.1",ok));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try{for(const [name,width,height] of [["landscape",1280,720],["portrait",390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},hasTouch:true});
   const page=await ctx.newPage();const issues=[];
   page.on("pageerror",e=>issues.push(e.message));
   await page.goto("http://127.0.0.1:4132/",{waitUntil:"domcontentloaded",timeout:60000});
   await page.waitForFunction(()=>window.__SMR_DEBUG__&&window.__SMR_DEBUG__.get().frame>=1,{timeout:70000});
   const first=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(first.version!=="1.2.0"||!first.webgl2||!first.noBabylon||!first.freeTerrain||first.terrainVertices<25000||first.trees<250||first.widthMeasured!==null)
    throw Error(name+" engine source contract failed "+JSON.stringify(first));
   await page.locator("#start").click();
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().mode==="play"&&window.__SMR_DEBUG__.get().frame>3,{timeout:25000});
   const before=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   await page.locator("#right").dispatchEvent("pointerdown",{pointerId:4});
   await page.waitForFunction(h=>window.__SMR_DEBUG__.get().heading>h+.01,before.heading,{timeout:32000});
   await page.locator("#right").dispatchEvent("pointerup",{pointerId:4});
   await page.locator("#camera").click();await page.waitForFunction(()=>window.__SMR_DEBUG__.get().camera==="close");
   await page.locator("#camera").click();await page.locator("#zoomIn").click();
   await page.locator("#jump").dispatchEvent("pointerdown",{pointerId:5});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:32000});
   await page.locator("#jump").dispatchEvent("pointerup",{pointerId:5});
   const after=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(after.zoom>=1||after.camera!=="aerial")throw Error(name+" camera/zoom failed");
   if(issues.length)throw Error(name+" JS errors: "+issues.join(" | "));
   fs.mkdirSync(path.join(root,"qa"),{recursive:true});
   await page.screenshot({path:path.join(root,"qa",name+".png")});
   fs.writeFileSync(path.join(root,"qa",name+".json"),JSON.stringify({first,before,after},null,2));
   console.log("WEBGL2 "+name+" PASS",JSON.stringify(after));await ctx.close();
  }}finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;srv.close();});
