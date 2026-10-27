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
el('choice-buttons').children[0].onclick();until(()=>!motion.isBusy());assert.equal(t.saved().run.nodeId,'03');assert.equal(t.saved().run.choices.length,1);
click('pause-read');assert(el('player-dialog').open);click('player-panel-close');assert(motion.isBusy());assert(el('player-dialog').open);
until(()=>!motion.isBusy());assert(!el('player-dialog').open);
const restoredPage=t.saved().pageKey;click('pause-read');el('player-panel-body').children.find(b=>b.textContent==='回到开始界面').onclick();until(()=>!motion.isBusy());assert(!el('home').hidden);
click('continue-story');assert(motion.isBusy());until(()=>!motion.isBusy());assert(!el('story').hidden);assert(el('home').hidden);assert.equal(t.saved().pageKey,restoredPage,'nested navigation under a load curtain must commit the story view');
// Fast-forward works from a manual caption, through speech and scenes, to a choice.
const fast=createEnv(false,null,true,{motion:true,autoCards:false});fast.start();
while(fast.context.window.MeaningIntroduction.isPlaying())fast.tickNext();fast.click('skip-read');
for(let n=0;fast.el('choice-screen').hidden;n++){assert(n<2000);fast.tickNext();}
assert.equal(fast.saved().run.nodeId,'01');assert.equal(fast.el('skip-read').attributes['aria-pressed'],false);assert.equal(fast.el('story').dataset.background,'camp-cover');
console.log('Motion passed: black navigation, repeated-input protection, animated dialogs/choices, auto progression with animations enabled and fast-forward changing scene backgrounds.');
