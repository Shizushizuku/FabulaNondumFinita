const assert=require('assert'),fs=require('fs'),createEnv=require('./test-harness.cjs');
const t=createEnv(),S=t.context.window.MeaningStory,C=t.context.window.MeaningCore;
// Check first appearances on every branch, including skipping the concert and writing the manuscript.
const introductions={
 '维克多·弗兰克尔':/维也纳做神经科和精神科医生/, '蒂莉':/我的妻子.*护士/,
 '马丁':/同一支工作队.*外科/, '奥托':/他也是囚犯.*工具.*工作队/,
 '莱文':/负责病区的看诊/, '塞缪尔':/从前.*(?:登台|唱歌)/,
 '瓦尔特':/另一个囚犯头目.*运煤队/, '埃米尔':/年轻囚犯.*父亲守店/,
 '约瑟夫':/约瑟夫·莫泽尔.*邮差/, '克拉拉':/妻子克拉拉·莫泽尔/
};
let routes=0;const introduced=new Set();
function walk(id,flags,seen=new Set()){
 seen=new Set(seen);const n=S.nodes[id];
 for(const page of C.pages(id,flags,S.protagonist,S)){
  assert(fs.existsSync('assets/'+page.art+'.png'),id+' missing page art');
  for(const [name,role] of Object.entries(introductions))if(page.text.includes(name)&&!seen.has(name)){
   assert(role.test(page.text),id+': '+name+' appears before their introduction');seen.add(name);introduced.add(name);
  }
 }
 if(n.end){routes++;return;}
 if(n.options.length)for(const o of n.options)walk(o.to,{...flags,...o.set},seen);
 else walk(C.next(id,flags,S.nodes),flags,seen);
}
walk(S.start,{});assert.equal(routes,413);assert.equal(introduced.size,10);
const sunset=C.pages('06A',{},S.protagonist,S),reveal=sunset.findIndex(p=>p.art==='sunset-open-sky');
assert(reveal>0);assert(sunset.slice(0,reveal).every(p=>p.art==='sunset'));
assert(sunset.slice(reveal).every(p=>p.art==='sunset-open-sky'));
assert(sunset.map(p=>p.text).join('').length>900,'sunset should be a substantial scene');
for(const id of ['06','06B'])assert(C.pages(id,{},S.protagonist,S).every(p=>p.art==='barracks'));
// Reach the new art through actual player controls, then restore both current and older saves.
t.start();const answers={'01':1,'04':0,'05':1,'06':0};
for(let steps=0;t.saved().run.nodeId!=='06A';steps++){
 assert(steps<300);if(!t.el('choice-screen').hidden)t.el('choice-buttons').children[answers[t.saved().run.nodeId]??0].onclick();else t.advance();
}
assert.equal(t.el('story').dataset.background,'sunset');
const atStart=JSON.parse(t.mem.get('tomorrow.player.v1'));
for(let i=0;i<reveal;i++)t.advance();
assert.equal(t.el('story').dataset.background,'sunset-open-sky');assert.equal(t.el('story').dataset.mood,'sunset');
const current=JSON.parse(t.mem.get('tomorrow.player.v1')),restored=createEnv(true,current);
restored.click('continue-story');assert.equal(restored.el('story').dataset.background,'sunset-open-sky');
const older=structuredClone(current);older.autosave.readingVersion=3;older.autosave.log=[{text:'旧文案标记'}];
const migrated=createEnv(true,older);migrated.click('continue-story');
assert.equal(migrated.saved().pageIndex,0);assert.equal(migrated.el('story').dataset.background,'sunset');
assert(!JSON.stringify(migrated.saved().log).includes('旧文案标记'));assert.deepEqual(migrated.saved().run.choices,current.autosave.run.choices);
for(const mode of ['auto-read','skip-read']){
 const player=createEnv(true,atStart);player.click('continue-story');player.click(mode);const backgrounds=new Set();
 for(let steps=0;player.el('choice-screen').hidden;steps++){
  assert(steps<800,mode+' did not stop at the next choice');backgrounds.add(player.el('story').dataset.background);player.tickNext();
 }
 assert(backgrounds.has('sunset-open-sky'),mode+' missed the new sunset');assert.equal(player.saved().run.nodeId,'09');
 const oldChoice=JSON.parse(player.mem.get('tomorrow.player.v1'));oldChoice.autosave.readingVersion=3;
 const reopened=createEnv(true,oldChoice);reopened.click('continue-story');
 assert(reopened.el('choice-screen').hidden,'updated choice saves must show the new introduction before choosing');assert.equal(reopened.saved().pageIndex,0);
}
console.log('Narrative passed: first introductions across 413 paths, sunset reveal after choosing to leave, manual/auto/skip art changes, exact save restore and older-text migration.');
