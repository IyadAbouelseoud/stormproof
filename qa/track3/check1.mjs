import fs from 'fs';
const csv=fs.readFileSync('content/sources.csv','utf8').split(/\r?\n/).slice(1).filter(Boolean);
const ids=csv.map(l=>l.split(',')[0]);
const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
console.log('csv rows',ids.length,'dups',JSON.stringify(dup));
const tags={};csv.forEach(l=>{const m=l.match(/,(sourced|computed|game-balanced|[a-z-]+),/);});
const set=new Set(ids);
const consts=fs.readFileSync('engine/src/constants.ts','utf8');
const s=consts.slice(consts.indexOf('SOURCES'));
const cids=[...s.matchAll(/^\s*['"]?([\w-]+)['"]?\s*:/gm)].map(m=>m[1]);
console.log('constants SOURCES ids',cids.length,'missing in csv',JSON.stringify(cids.filter(i=>!set.has(i))));
const used=new Set();
function walk(o,f,p=''){ if(Array.isArray(o))o.forEach((x,i)=>walk(x,f,p+'['+i+']')); else if(o&&typeof o==='object'){for(const[k,v]of Object.entries(o)){ if((k==='src'||k==='source'||k==='sources')&&typeof v==='string')f(v,p+'.'+k); else if((k==='src'||k==='sources')&&Array.isArray(v))v.forEach(x=>f(x,p+'.'+k)); else walk(v,f,p+'.'+k);}}}
const files=['content/parts.json','content/rockets.json',...fs.readdirSync('content/scenarios').map(f=>'content/scenarios/'+f),...fs.readdirSync('content/text').map(f=>'content/text/'+f)];
for(const f of files){let n=0,bad=[];let txt=fs.readFileSync(f,"utf8");if(!txt.trim()){console.log(f,"EMPTY");continue}walk(JSON.parse(txt),(v,p)=>{n++;used.add(v);if(v!=='game-balanced'&&!set.has(v))bad.push(p+'='+v)});console.log(f,'src refs',n,'orphans',JSON.stringify(bad));}
const cs=new Set(cids);
console.log('csv ids never referenced by json or constants:',JSON.stringify(ids.filter(i=>!used.has(i)&&!cs.has(i))));
