const fs=require('fs'),vm=require('vm'),assert=require('assert');
process.chdir(require('path').resolve(__dirname,'../..'));
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('start-screen/js/story-data.js','utf8'),context);
const data=context.window.MeaningStory,C=require('../js/core.js');
const seen=new Set(),ends={},notes=new Set();let routes=0,checks=0;
function walk(id,flags={},from=null,depth=0){
  assert(depth<75,'Unexpected narrative cycle');assert(data.nodes[id],id);seen.add(id);
  const n=data.nodes[id],pages=C.pages(id,flags,'测试名字',data,from);
  assert(pages.length,id);
  for(const page of pages){assert(page.text.trim());assert(!page.text.includes('【名字】'));assert(!/\*\*如果|`\[|→/.test(page.text));}
  checks++;n.notes.forEach(a=>notes.add(a));
  if(n.end){ends[id]=(ends[id]||0)+1;routes++;return;}
  const options=C.options(id,flags,data.nodes);
  if(id==='TASK')assert.equal(options.length,1);
  if(options.length)for(const o of options)walk(o.to,{...flags,...o.set},id,depth+1);
  else walk(C.next(id,flags,data.nodes),flags,id,depth+1);
}
walk('A');
assert.equal(seen.size,61);assert.equal(notes.size,12);
assert.deepEqual(Object.keys(ends).sort(),['END','X1','X2','X3','X4','X5']);
for(const poem of ['改诗','手术室'])for(const retell of ['复述','不复述'])
  assert.equal(C.next('M4',{poem,retell},data.nodes),poem==='改诗'&&retell==='复述'?'X4':'F');
for(const burn of ['烧','不烧'])for(const share of ['谈','不谈'])
  assert.equal(C.next('CHECK',{burn,share},data.nodes),burn==='不烧'?'Z1':share==='谈'?'Z2':'Z3');
for(const bread of ['吃光','留一块']){
  const text=C.pages('R1',{bread},'名',data).map(p=>p.text).join('');
  assert(text.includes('铁丝网上挂着白霜'));
  assert.equal(text.includes('我取出那块面包'),bread==='留一块');
  assert.equal(text.includes('我系好鞋带'),bread==='吃光');
}
console.log(JSON.stringify({routes,sceneVisits:checks,nodes:seen.size,achievements:notes.size,endings:ends},null,2));
