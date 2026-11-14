import {createRequire} from 'module';
const require=createRequire(process.cwd()+'/web/package.json');
const {chromium}=require('@playwright/test');
const b=await chromium.launch({channel:'chrome'});
for(const u of ['https://github.com/IyadAbouelseoud/stormproof','https://iyadabouelseoud.github.io/stormproof/']){
 const ctx=await b.newContext();const p=await ctx.newPage();
 const reqs=[];p.on('request',r=>reqs.push(r.url()));
 const r=await p.goto(u,{waitUntil:'networkidle'});await p.waitForTimeout(1500);
 const login=await p.locator('input[type=password],form[action*="session"]').count();
 const body=(await p.locator('body').innerText()).slice(0,160).replace(/\s+/g,' ');
 const scripts=await p.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean));
 console.log(u,'\n status',r.status(),'final',p.url(),'\n title',JSON.stringify(await p.title()),'\n loginWall inputs',login,'\n body',JSON.stringify(body),'\n scripts',JSON.stringify(scripts.map(s=>s.split('/').pop())),'\n h2/h1',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('h1,h2')].map(h=>h.textContent.trim()).slice(0,3))));
 if(u.includes('github.io')){const bad=[];reqs.forEach(x=>{});console.log(' 404s?',reqs.length,'requests');}
 await ctx.close();}
await b.close();
