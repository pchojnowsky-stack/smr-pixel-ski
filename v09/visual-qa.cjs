const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=__dirname,errors=[];
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 const f=path.resolve(root,"."+pathname);
 if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const target=f===root?path.join(root,"index.html"):f;
 fs.readFile(target,(e,d)=>{if(e){res.writeHead(404).end();return;}res.setHeader("Content-Type",target.endsWith(".js")?"application/javascript":target.endsWith(".json")?"application/json":target.endsWith(".html")?"text/html":"text/plain");res.end(d);});
});
(async()=>{
 await new Promise(resolve=>server.listen(4126,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try{
  for(const [name,width,height] of [["landscape",1280,720],["portrait",390,844]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true});
   const page=await context.newPage();page.on("pageerror",e=>errors.push(name+": "+e.message));
   await page.goto("http://127.0.0.1:4126/",{waitUntil:"domcontentloaded",timeout:60000});
   await page.waitForFunction(()=>window.__SMR_DEBUG__&&window.__SMR_DEBUG__.get().terrainVertices>5000,{timeout:50000});
   const before=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(before.routeSource!==202733799||before.trees<40||before.buildings<1||before.liftPoints<2||before.widthMeasured!==null)throw Error("Invalid GIS scene "+JSON.stringify(before));
   await page.locator("#start").click();
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().distance>0.1,{timeout:20000});
   await page.locator("#tuck").dispatchEvent("pointerdown",{pointerId:31});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().tuck,{timeout:15000});
   await page.locator("#tuck").dispatchEvent("pointerup",{pointerId:31});
   await page.locator("#jump").dispatchEvent("pointerdown",{pointerId:32});
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:15000});
   await page.locator("#jump").dispatchEvent("pointerup",{pointerId:32});
   fs.mkdirSync(path.join(root,"qa"),{recursive:true});
   await page.screenshot({path:path.join(root,"qa",name+".png")});
   const after=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   fs.writeFileSync(path.join(root,"qa",name+".json"),JSON.stringify({before,after},null,2));
   console.log("GEO QA "+name,JSON.stringify(after));
   await context.close();
  }
  if(errors.length)throw Error("JavaScript errors: "+errors.join("\n"));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;server.close();});