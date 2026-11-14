import fs from 'fs';import {createRequire} from 'module';
const require=createRequire(process.cwd()+'/web/package.json');
const {chromium}=require('@playwright/test');
const dir=process.cwd().split(String.fromCharCode(92)).join('/')+'/web/public/img/art/';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.webp'));
const out=process.argv[2];
const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:1600,height:1000}});
for(let s=0;s<3;s++){const part=files.slice(s*9,s*9+9);
 const html='<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(3,1fr);gap:4px">'+part.map(f=>`<figure style="margin:0;color:#fff;font:12px sans-serif"><img src="file:///${dir}${f}" style="width:100%;height:300px;object-fit:contain">${f}</figure>`).join('');
 fs.writeFileSync(out+`/sheet${s}.html`,html);await p.goto('file:///'+out+`/sheet${s}.html`);await p.waitForTimeout(500);await p.screenshot({path:out+`/sheet${s}.png`});}
await b.close();
