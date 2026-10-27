const fs=require('fs'),vm=require('vm'),assert=require('assert');
process.chdir(require('path').resolve(__dirname,'..'));
const context={window:{}};vm.runInNewContext(fs.readFileSync('js/story-data.js','utf8'),context);
const S=context.window.MeaningStory,C=require('../js/core.js');
const visited=new Set(),notes=new Set(),ends={},keys=new Set();let routes=0;
function walk(id,flags,depth=0){
 assert(depth<70,'cycle');const n=S.nodes[id];assert(n,id);visited.add(id);n.notes.forEach(x=>notes.add(x));
 const pages=C.pages(id,flags,S.protagonist,S);
 assert(pages.length||id==='21',id);
 for(const p of pages){keys.add(p.key);assert(!/[〔〕]|\*\*/.test(p.text),id+' exposed production marker');if(p.kind==='dialogue'){assert(p.waitForClick);assert(p.text.startsWith(p.speaker+'：“')&&p.text.endsWith('”'));}}
 if(n.end){routes++;ends[id]=(ends[id]||0)+1;return;}
 if(n.options.length)n.options.forEach(o=>walk(o.to,{...flags,...o.set},depth+1));
 else{assert(C.next(id,flags,S.nodes),id);walk(C.next(id,flags,S.nodes),flags,depth+1);}
}
walk(S.start,{});
assert.equal(visited.size,56);assert.equal(notes.size,12);assert.equal(Object.keys(ends).length,6);assert.equal(routes,413);
for(const id of ['02','08B','12B','14A','19A']){assert.equal(S.nodes[id].end,'death');assert(S.nodes[id].paragraphs.map(p=>p.text||'').join('').length>350,id+' incomplete death text');}
for(const id of ['08','12','14','20','21'])assert.equal(S.nodes[id].options.length,0);
for(const n of Object.values(S.nodes))for(const p of n.paragraphs)if(p.kind!=='replay')assert(keys.has(p.key)||p.kind==='prose',p.key+' never rendered');
assert.equal(S.map.rows.flat().length,56);assert.equal(new Set(S.map.rows.flat()).size,56);
console.log(`Routes passed: ${routes} complete paths, ${visited.size} scenes, 5 death endings, 12 notes.`);
