import fs from 'fs';import path from 'path';
const en=JSON.parse(fs.readFileSync('web/src/i18n/en.json','utf8')),ar=JSON.parse(fs.readFileSync('web/src/i18n/ar.json','utf8'));
const srcs={};(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.tsx?$/.test(e.name))srcs[p.split(path.sep).join('/')]=fs.readFileSync(p,'utf8')}})('web/src');
const pats={OMNIWeb:/OMNI/i,DONKI:/DONKI/i,GIBS:/GIBS|Worldview/i,'solar-cycle prediction':/solar.cycle|prediction/i,IMERG:/IMERG/i};
for(const[n,re]of Object.entries(pats)){console.log('=== '+n);
 for(const[k,v]of Object.entries(en)){ if(typeof v==='string'&&re.test(v)){
  const users=Object.entries(srcs).filter(([f,s])=>s.includes("'"+k+"'")||s.includes('"'+k+'"')||s.includes('`'+k)||s.includes(k.split('.').slice(0,-1).join('.')+'.${')).map(([f])=>f.slice(8));
  console.log(' key',k,'| AR:',typeof ar[k]==='string'&&re.test(ar[k])?'has':'(AR lacks term/missing)','| used in:',users.join(',')||'(no direct ref)','|',v.slice(0,90));}}
 for(const[f,s]of Object.entries(srcs)){ if(f.includes('i18n'))continue; const m=s.split('\n').map((l,i)=>[i+1,l]).filter(([i,l])=>re.test(l)&&!/^\s*(\/\/|\*|\/\*)/.test(l)); m.slice(0,3).forEach(([i,l])=>console.log(' src',f.slice(8),i,l.trim().slice(0,110)));}}
