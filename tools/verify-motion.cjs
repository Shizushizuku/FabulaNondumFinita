const assert=require('assert'),createEnv=require('./test-harness.cjs');
const t=createEnv(false,null,true,{motion:true,autoCards:false}),{el,click,context}=t;
const motion=context.window.MeaningMotion;
function until(test,limit=2000){for(let n=0;!test();n++){assert(n<limit,'timed effect must finish');t.tickNext();}}
click('chapters');assert(motion.isBusy());assert(!el('scene-curtain').hidden);assert(!el('home').hidden);
click('achievements');until(()=>!motion.isBusy());assert(!el('map').hidden);assert(el('gallery').hidden);assert(el('scene-curtain').hidden);
click('achievements');until(()=>!motion.isBusy());assert(!el('gallery').hidden);
t.start();until(()=>!context.window.MeaningIntroduction.isPlaying());
t.advance();t.advance();assert(!el('auto-read').disabled);click('auto-read');
until(()=>!el('choice-screen').hidden);assert.equal(t.saved().run.nodeId,'01');assert.equal(el('auto-read').attributes['aria-pressed'],false);
assert(t.animations.some(a=>a.element===el('read-surface')));assert(t.animations.some(a=>a.element===el('scene-curtain')));
// Selecting twice during an exit animation commits a single answer.
el('choice-buttons').children[1].onclick();assert(motion.isBusy());assert.equal(t.saved().run.nodeId,'01');
el('choice-buttons').children[0].onclick();until(()=>t.saved().run.nodeId==='03');
assert(motion.isBusy());assert(!el('scene-curtain').hidden,'scene changes commit under the blackout even when the background is unchanged');
const coveredPage=t.saved().pageKey;click('read-surface');assert.equal(t.saved().pageKey,coveredPage);
t.elapse(119);assert(motion.isBusy());assert(!el('scene-curtain').hidden);
until(()=>!motion.isBusy());assert.equal(t.saved().run.nodeId,'03');assert.equal(t.saved().run.choices.length,1);
click('pause-read');assert(el('player-dialog').open);click('player-panel-close');assert(motion.isBusy());assert(el('player-dialog').open);
until(()=>!motion.isBusy());assert(!el('player-dialog').open);
const restoredPage=t.saved().pageKey;click('pause-read');el('player-panel-body').children.find(b=>b.textContent==='回到开始界面').onclick();until(()=>!motion.isBusy());assert(!el('home').hidden);
click('continue-story');assert(motion.isBusy());until(()=>!motion.isBusy());assert(!el('story').hidden);assert(el('home').hidden);assert.equal(t.saved().pageKey,restoredPage,'nested navigation under a load curtain must commit the story view');
// Fast-forward works from a manual caption, through speech and scenes, to a choice.
const fast=createEnv(false,null,true,{motion:true,autoCards:false});fast.start();
while(fast.context.window.MeaningIntroduction.isPlaying())fast.tickNext();fast.click('skip-read');
for(let n=0;fast.el('choice-screen').hidden;n++){assert(n<2000);fast.tickNext();}
assert.equal(fast.saved().run.nodeId,'01');assert.equal(fast.el('skip-read').attributes['aria-pressed'],false);assert.equal(fast.el('story').dataset.background,'camp-cover');
// A background change within a scene also goes through black, while ordinary pages do not.
const S=context.window.MeaningStory,C=context.window.MeaningCore,pages=C.pages('06A',{sunset:true},S.protagonist,S);
const reveal=pages.findIndex(p=>p.art==='sunset-open-sky');assert(reveal>0);
const save={readingVersion:S.readingVersion,pageKey:pages[reveal-1].key,pageIndex:reveal-1,log:[],run:{version:2,storyId:S.id,nodeId:'06A',name:S.protagonist,flags:{sunset:true},choices:[]}};
const sky=createEnv(false,{version:2,autosave:save,slots:[null,null,null],settings:{speed:0}},true,{motion:true});
sky.click('continue-story');while(sky.context.window.MeaningMotion.isBusy())sky.tickNext();
assert.equal(sky.el('story').dataset.background,'sunset');assert(sky.el('reader-name').hidden);
const previous=sky.saved().pageKey;sky.advance();assert(sky.context.window.MeaningMotion.isBusy());assert.equal(sky.saved().pageKey,previous);
while(sky.saved().pageKey===previous)sky.tickNext();assert(!sky.el('scene-curtain').hidden);assert.equal(sky.el('story').dataset.background,'sunset-open-sky');
while(sky.context.window.MeaningMotion.isBusy())sky.tickNext();assert(sky.el('scene-curtain').hidden);
const curtainCount=sky.animations.filter(a=>a.element===sky.el('scene-curtain')).length;sky.advance();
assert.equal(sky.animations.filter(a=>a.element===sky.el('scene-curtain')).length,curtainCount,'ordinary prose pages have no blackout');
console.log('Motion passed: black navigation, repeated-input protection, animated dialogs/choices, auto progression with animations enabled and fast-forward changing scene backgrounds.');
