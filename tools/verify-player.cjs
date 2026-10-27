const assert=require('assert'),createEnv=require('./test-harness.cjs');
const t=createEnv(),{el,saved,click,advance,start,mem,context}=t;
assert(el('continue-story').hidden,'obsolete storage must not load');
click('chapters');assert.equal(context.window.MeaningShell.getProgress().visited.length,0);
start();assert.equal(saved().run.nodeId,'00');assert.equal(saved().run.name,'维克多·弗兰克尔');assert.equal(saved().run.storyId,'tomorrow-20261027');
const choices={'01':1,'04':0,'05':1,'06':0,'09':0,'10':0,'11':1,'13':0,'15':0,'16':0,'17':0,'19':1};
const path=[];let manual=false,exactKey;
for(let steps=0;steps<2000;steps++){
 const id=saved().run.nodeId;if(path.at(-1)!==id)path.push(id);
 if(id==='16'&&!manual){
  exactKey=saved().pageKey;click('save-read');el('player-panel-body').children.find(x=>x.className.includes('save-slot')).onclick();click('player-panel-close');
  advance();assert.notEqual(saved().pageKey,exactKey);click('load-read');el('player-panel-body').children.filter(x=>x.className.includes('save-slot'))[1].onclick();assert.equal(saved().pageKey,exactKey);manual=true;
 }
 if(context.window.MeaningIntroduction.isPlaying())t.finishSequence();
 if(!el('ending-screen').hidden||!el('home').hidden)break;
 if(!el('choice-screen').hidden)el('choice-buttons').children[choices[id]??0].onclick();else advance();
}
assert.equal(saved().run.nodeId,'22');assert(!el('home').hidden);assert(el('story').hidden);assert.equal(el('sequence-title').textContent,'终');assert(!el('dialog').open);
assert(path.includes('20B'));assert(path.includes('21A'));assert(!path.includes('21B'));assert(!path.includes('21'),'routing-only node must not show an empty page');
const p=context.window.MeaningShell.getProgress();assert(p.visited.includes('21'));assert(p.achievements.includes('N10'));assert.equal(p.snapshots['16'].flags.shared,undefined);
assert.equal(p.snapshots['16'].flags.record,'letter');
assert(!el('home').hidden);
click('continue-story');click('load-read');el('player-panel-body').children.filter(x=>x.className.includes('save-slot'))[1].onclick();
assert.equal(saved().run.nodeId,'16');assert.equal(saved().run.flags.shared,undefined);assert.equal(saved().pageKey,exactKey);
click('pause-read');el('player-panel-body').children.find(b=>b.textContent==='回到开始界面').onclick();click('chapters');
const node=el('map-inner').children.find(n=>n.attributes['aria-label']==='衣服堆旁，从此处开始');assert(node);node.onclick();assert.equal(saved().run.nodeId,'01');assert.equal(saved().run.flags.otto,undefined);
let deathPages=0;
for(let steps=0;steps<100;steps++){
 if(saved().run.nodeId==='02'&&el('ending-screen').hidden)deathPages++;
 if(context.window.MeaningIntroduction.isPlaying())t.finishSequence();
 if(!el('ending-screen').hidden||!el('home').hidden)break;
 if(!el('choice-screen').hidden)el('choice-buttons').children[0].onclick();else advance();
}
assert(deathPages>=6,'death narrative must precede ending');assert.equal(el('ending-title').textContent,'死亡');assert.equal(el('ending-copy').textContent,'本次故事结束。');
click('retry-choice');assert.equal(saved().run.nodeId,'01');assert.equal(saved().run.flags.otto,undefined);
assert(!JSON.stringify(saved()).includes('obsolete sentinel'));
console.log('Controller passed: full survival, complete death text/retry, fresh storage, exact save/load, entry snapshots, invisible automatic routing and achievements.');
