const assert=require('assert'),createEnv=require('./test-harness.cjs');
const t=createEnv(),{el,saved,click,advance,start,mem,context}=t;
assert(el('continue-story').hidden,'obsolete storage must not load');
click('chapters');assert.equal(context.window.MeaningShell.getProgress().visited.length,0);
start();assert.equal(saved().run.nodeId,'00');assert.equal(saved().run.name,'维克多·弗兰克尔');assert.equal(saved().run.storyId,'tomorrow-20261027');
const choices={'01':1,'04':0,'05':1,'06':0,'09':0,'10':0,'11':1,'13':0,'15':0,'16':0,'17':0,'19':1};
const path=[],speakers=new Set();let manual=false,exactKey;
for(let steps=0;steps<2000;steps++){
 const id=saved().run.nodeId;if(path.at(-1)!==id)path.push(id);
 const S=context.window.MeaningStory,page=context.window.MeaningCore.pages(id,saved().run.flags,S.protagonist,S)[saved().pageIndex];
 if(page.kind==='dialogue'){
  assert(!el('reader-name').hidden);assert.equal(el('reader-name').textContent,page.speaker==='我'?'我':page.speaker);speakers.add(page.speaker);
  assert(page.text.startsWith('“'));assert(!page.text.startsWith(page.speaker+'：'));
 }else{assert(el('reader-name').hidden);assert.equal(el('reader-name').textContent,'','narration and inner thoughts have no name label');}
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
assert(speakers.has('我'));assert(speakers.has('蒂莉'));
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
assert(deathPages>=6,'death narrative must precede ending');assert.equal(el('ending-title').textContent,'死亡');assert.equal(el('ending-copy').textContent,'本次故事结束。\n\n死因：'+context.window.MeaningStory.nodes['02'].deathCause);
click('retry-choice');assert.equal(saved().run.nodeId,'01');assert.equal(saved().run.flags.otto,undefined);
assert(!JSON.stringify(saved()).includes('obsolete sentinel'));
// Old saved dialogue labels move into log metadata instead of reappearing in the body.
const oldLibrary=JSON.parse(mem.get('tomorrow.player.v1'));oldLibrary.autosave.awaitingChoice=false;
oldLibrary.autosave.log=[{key:'old-quote',chapter:'到站',text:'我：“旧存档台词。”'}];
const migrated=createEnv(true,oldLibrary);migrated.click('continue-story');
const oldQuote=migrated.saved().log.find(l=>l.key==='old-quote');assert.equal(oldQuote.text,'“旧存档台词。”');assert.equal(oldQuote.speaker,'我');
migrated.click('log-read');const article=migrated.el('player-panel-body').children[0].children[0];
assert(article.children[0].textContent.includes('我'));assert.equal(article.children[1].textContent,'“旧存档台词。”');
console.log('Controller passed: full survival, complete death text/retry, fresh storage, exact save/load, entry snapshots, invisible automatic routing and achievements.');
