import fs from 'fs';import path from 'path';
const dir='web/public/img/art';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.webp'));
const alt=JSON.parse(fs.readFileSync('content/text/art-alt.json','utf8'));
const csvIds=new Set(fs.readFileSync('content/sources.csv','utf8').split(/\r?\n/).slice(1).map(l=>l.split(',')[0]));
const src=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.(tsx?|css)$/.test(e.name))src.push(fs.readFileSync(p,'utf8'))}})('web/src');
const all=src.join('\n');
let total=0;
for(const f of files){const id=f.replace('.webp','');const sz=fs.statSync(path.join(dir,f)).size;total+=sz;
 const a=alt[id]||alt[f];
 console.log(f.padEnd(40),String(sz).padStart(8),'csv:',csvIds.has(id)?'Y':'N','altEN/AR:',a&&a.en&&a.ar?'Y':'N','inSrc:',all.includes(id)?'Y':'N');}
console.log('total bytes',total,(total/1048576).toFixed(2),'MiB');
console.log('alt keys without file:',Object.keys(alt).filter(k=>!files.includes(k.replace(/(\.webp)?$/,'.webp'))));
