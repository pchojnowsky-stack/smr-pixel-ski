const http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const root=__dirname,errors=[];
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
const filename=path.resolve(root,'.'+pathname);
if(!filename.startsWith(root)){res.writeHead(403).end();return;}
const target=filename===root?path.join(root,'index.html'):filename;
fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;}
res.setHeader('Content-Type',target.endsWith('.js')?'application/javascript':target.endsWith('.html')?'text/html':'text/plain');res.end(data);});});
(async()=>{
await new Promise(resolve=>server.listen(4125,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
try{
for(const [name,width,height] of [['landscape',1280,720],['portrait',390,844]]){
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true,isMobile:false});
const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
await page.goto('http://127.0.0.1:4125/',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>window.__SMR_DEBUG__ && window.__SMR_DEBUG__.scene.meshes.length>30,{timeout:45000});
await page.locator('#start').click();await page.waitForTimeout(850);
const status=await page.evaluate(()=>window.__SMR_DEBUG__.get());
if(status.version!=='0.8.1'||status.skierParts<20||status.liftChairs<12||status.npcs<6)throw Error('resort 0.8 scene not loaded: '+JSON.stringify(status));
await page.locator('#right').dispatchEvent('pointerdown',{pointerId:1});await page.waitForTimeout(300);await page.locator('#right').dispatchEvent('pointerup',{pointerId:1});
await page.locator('#brake').dispatchEvent('pointerdown',{pointerId:2});await page.waitForTimeout(200);await page.locator('#brake').dispatchEvent('pointerup',{pointerId:2});
if(status.mode!=='play'||status.distance<0||status.trees<300)throw Error(name+' runtime smoke failed: '+JSON.stringify(status));
const beforeTuck=await page.evaluate(()=>window.__SMR_DEBUG__.get());
await page.locator('#tuck').dispatchEvent('pointerdown',{pointerId:3});
await page.waitForTimeout(500);
const duringTuck=await page.evaluate(()=>window.__SMR_DEBUG__.get());
if(duringTuck.tuck<.65)throw Error(name+' tuck button did not engage');
await page.locator('#tuck').dispatchEvent('pointerup',{pointerId:3});
await page.locator('#jump').dispatchEvent('pointerdown',{pointerId:4});
await page.waitForFunction(()=>window.__SMR_DEBUG__.get().airborne,{timeout:20000});
const duringJump=await page.evaluate(()=>window.__SMR_DEBUG__.get());
if(!duringJump.airborne||duringJump.jumpHeight<=0)throw Error(name+' jump physics did not launch: '+JSON.stringify(duringJump));
await page.locator('#jump').dispatchEvent('pointerup',{pointerId:4});
await page.waitForFunction(()=>!window.__SMR_DEBUG__.get().airborne&&window.__SMR_DEBUG__.get().jumpHeight===0,{timeout:30000});
const landed=await page.evaluate(()=>window.__SMR_DEBUG__.get());
if(landed.airborne||landed.jumpHeight!==0)throw Error(name+' skier did not land: '+JSON.stringify(landed));
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
await page.screenshot({path:path.join(root,'qa',name+'.png')});
fs.writeFileSync(path.join(root,'qa',name+'.json'),JSON.stringify(status,null,2));
console.log('VISUAL '+name,JSON.stringify({status,beforeTuck,duringTuck,duringJump,landed}));
await context.close();
}
if(errors.length)throw Error('Runtime JS errors: '+errors.join('\n'));
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;server.close();});
