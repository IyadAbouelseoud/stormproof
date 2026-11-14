import {createRequire} from 'module';
const require=createRequire(process.cwd()+'/web/package.json');
const {chromium}=require('@playwright/test');
const b=await chromium.launch({channel:'chrome'});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
const urls=[];p.on('request',r=>urls.push(r.url()));
const fails=[];p.on('requestfailed',r=>fails.push(r.url()));
await p.goto('http://localhost:4173/',{waitUntil:'networkidle'});
const fontsOk=await p.evaluate(async()=>{await document.fonts.ready;return [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)});
// walk: click any buttons that look like next/continue repeatedly + toggle language
for(let i=0;i<14;i++){
  const btn=p.locator('button:visible').filter({hasText:/next|continue|launch|fly|start|build|orbit|report|refly|re-fly|go|view/i}).first();
  if(await btn.count()===0)break; try{await btn.click({timeout:2000});}catch{} await p.waitForTimeout(700);
}
const lang=p.locator('button:visible').filter({hasText:/العربية|AR|عربي/}).first();
if(await lang.count())try{await lang.click({timeout:2000});await p.waitForTimeout(800);}catch{}
const heads=await p.evaluate(()=>[...document.querySelectorAll('h1,h2')].map(h=>h.textContent).slice(0,4));
const imgs=await p.evaluate(()=>[...document.images].map(i=>i.src));
await p.waitForTimeout(800);
const origin='http://localhost:4173';
const ext=urls.filter(u=>!u.startsWith(origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'));
console.log('total requests',urls.length,'| non-same-origin',ext.length,JSON.stringify(ext));
console.log('failed',JSON.stringify(fails));
console.log('loaded fonts',JSON.stringify(fontsOk));
console.log('fonts requested',urls.filter(u=>/\.woff2/.test(u)).map(u=>u.split('/').pop()).join(','));
console.log('headings at end',JSON.stringify(heads),'lang',await p.evaluate(()=>document.documentElement.lang+' '+document.documentElement.dir));
console.log('kinds',JSON.stringify(urls.reduce((a,u)=>{const k=u.replace(origin,'').split('?')[0].split('/')[1]||'/';a[k]=(a[k]||0)+1;return a},{})));
await b.close();
