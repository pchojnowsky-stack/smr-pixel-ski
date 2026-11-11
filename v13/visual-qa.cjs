const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),{chromium}=require("playwright");
const root=__dirname;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://localhost"),f=path.resolve(root,"."+decodeURIComponent(u.pathname));
 if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const target=f===root?path.join(root,"index.html"):f;
 fs.readFile(target,(err,bytes)=>{if(err){res.writeHead(404).end();return;}
  res.setHeader("Content-Type",target.endsWith(".html")?"text/html":target.endsWith(".js")?"application/javascript":target.endsWith(".json")?"application/json":"application/octet-stream");res.end(bytes);});
});
async function press(page,id,pointerId=7){
 await page.locator("#"+id).dispatchEvent("pointerdown",{pointerId});
}
async function release(page,id,pointerId=7){await page.locator("#"+id).dispatchEvent("pointerup",{pointerId});}
(async()=>{
 await new Promise(r=>server.listen(4133,"127.0.0.1",r));
 const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--no-sandbox"]});
 try{
  for(const [name,width,height] of [["phone-landscape",844,390],["phone-portrait",390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.goto("http://127.0.0.1:4133/",{waitUntil:"domcontentloaded",timeout:60000});
   await page.waitForFunction(()=>window.__SMR_DEBUG__?.get().frame>1,{timeout:70000});
   if(await page.locator("#controls button").count()!==4)throw Error(name+" not exactly four touch controls");
   if(await page.locator("#brake, #tuck").count())throw Error(name+" legacy controls still visible");
   await page.locator("#start").click();await page.waitForFunction(()=>window.__SMR_DEBUG__.get().mode==="play");
   const initial=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   await press(page,"accelerate",11);
   await page.waitForFunction(v=>window.__SMR_DEBUG__.get().speed>v+1,initial.speed,{timeout:25000});
   await release(page,"accelerate",11);
   await press(page,"jump",12);
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:25000});
   await release(page,"jump",12);
   await press(page,"right",13);
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().trickActive,{timeout:12000});
   await release(page,"right",13);
   await page.waitForFunction(()=>window.__SMR_DEBUG__.get().trickCompleted===1,{timeout:22000});
   const after=await page.evaluate(()=>window.__SMR_DEBUG__.get());
   if(after.trickDirection!==1||after.trickScore!==100||!after.lastTrick.includes("360"))throw Error(name+" no 360 right "+JSON.stringify(after));
   fs.mkdirSync(path.join(root,"qa"),{recursive:true});await page.screenshot({path:path.join(root,"qa",name+".png")});
   fs.writeFileSync(path.join(root,"qa",name+".json"),JSON.stringify({initial,after},null,2));
   if(errors.length)throw Error(name+" JS "+errors.join(" | "));
   console.log(name+" PASS",JSON.stringify(after));await ctx.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;server.close();});