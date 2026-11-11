const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),{chromium}=require("playwright");
const root=__dirname,errors=[];
const srv=http.createServer((req,res)=>{const u=new URL(req.url,"http://localhost"),f=path.resolve(root,"."+u.pathname);
 if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403).end();return;}
 const target=f===root?path.join(root,"index.html"):f;
 fs.readFile(target,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader("Content-Type",target.endsWith(".js")?"application/javascript":target.endsWith(".json")?"application/json":target.endsWith(".html")?"text/html":"text/plain");res.end(data);});
});
(async()=>{await new Promise(done=>srv.listen(4130,"127.0.0.1",done));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try{for(const [name,width,height] of [["landscape",1280,720],["portrait",390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  const page=await context.newPage();page.on("pageerror",e=>errors.push(name+": "+e.message));
  await page.goto("http://127.0.0.1:4130/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__SMR_DEBUG__&&window.__SMR_DEBUG__.get().terrainVertices>26000,{timeout:50000});
  let before=await page.evaluate(()=>window.__SMR_DEBUG__.get());
  if(before.version!=="1.1.0"||!before.sourceRunId||before.trees<500||!before.freeTerrain||before.cameraMode!=="aerial"||before.chairs<10||before.widthMeasured!==null)throw Error("bad geo scene: "+JSON.stringify(before));
  await page.locator("#start").click();await page.waitForFunction(()=>window.__SMR_DEBUG__.get().distance>0.2,{timeout:15000});
  const baseX=before.x;
  await page.locator("#right").dispatchEvent("pointerdown",{pointerId:5});
  await page.waitForFunction(x=>window.__SMR_DEBUG__.get().x>x+2,baseX,{timeout:25000});
  await page.locator("#right").dispatchEvent("pointerup",{pointerId:5});
  await page.locator("#camera").click();
  await page.waitForFunction(()=>window.__SMR_DEBUG__.get().cameraMode==="close",{timeout:12000});
  await page.locator("#camera").click();
  await page.locator("#zoomIn").click();
  await page.locator("#jump").dispatchEvent("pointerdown",{pointerId:6});
  await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:15000});
  await page.locator("#jump").dispatchEvent("pointerup",{pointerId:6});
  const after=await page.evaluate(()=>window.__SMR_DEBUG__.get());
  if(after.cameraMode!=="aerial"||after.zoom>=1||after.x===baseX||!after.trailPoints)throw Error("freeride/camera/zoom/track failed "+JSON.stringify(after));
  fs.mkdirSync(path.join(root,"qa"),{recursive:true});await page.screenshot({path:path.join(root,"qa",name+".png")});
  fs.writeFileSync(path.join(root,"qa",name+".json"),JSON.stringify({before,after},null,2));
  console.log("OPEN SKI MAP QA",name,JSON.stringify(after));await context.close();
 }if(errors.length)throw Error(errors.join("\n"));
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;srv.close();});
