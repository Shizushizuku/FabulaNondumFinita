const assert=require('assert'),createEnv=require('./test-harness.cjs');
// Intertitles reveal automatically in manual mode; clicking cannot cut short the 1.5-second hold.
const t=createEnv(false),{el,saved,context}=t;
t.start();assert.equal(el('story').dataset.readingKind,'caption');assert(el('auto-read').disabled);
const key=saved().pageKey;
t.click('read-surface');t.key(' ');assert.equal(saved().pageKey,key);
assert.equal(el('story').dataset.captionPhase,'enter');t.elapse(599);assert.equal(saved().pageKey,key);
t.elapse(1);assert.equal(el('story').dataset.captionPhase,'hold');
t.elapse(1499);assert.equal(el('story').dataset.captionPhase,'hold');
t.elapse(1);assert.equal(el('story').dataset.captionPhase,'exit');
t.elapse(399);assert.equal(saved().pageKey,key);
t.elapse(1);assert.notEqual(saved().pageKey,key);assert.equal(el('story').dataset.readingKind,'prose');
assert.equal(el('chapter-caption').textContent,'01 到站');assert.equal(el('scene-caption').textContent,'到站');
// Pause/resume and tab visibility retain the remaining dwell, rather than advancing underneath a panel.
const paused=createEnv(false);paused.start();paused.elapse(600+500);paused.click('pause-read');
assert.equal(paused.el('player-panel-title').textContent,'暂停');const held=paused.saved().pageKey;
paused.elapse(5000);assert.equal(paused.saved().pageKey,held);
paused.click('player-panel-close');paused.elapse(999);assert.equal(paused.el('story').dataset.captionPhase,'hold');
paused.elapse(1);assert.equal(paused.el('story').dataset.captionPhase,'exit');paused.elapse(400);assert.notEqual(paused.saved().pageKey,held);
const hidden=createEnv(false);hidden.start();hidden.elapse(300);hidden.visibility(true);hidden.elapse(9000);
assert.equal(hidden.saved().pageIndex,0);hidden.visibility(false);hidden.click('player-panel-close');hidden.elapse(299);
assert.equal(hidden.el('story').dataset.captionPhase,'enter');hidden.elapse(1);assert.equal(hidden.el('story').dataset.captionPhase,'hold');
// The recall invitation starts at the first spoken sentence, remains for four pages, and slides out.
const hint=createEnv(false,null,true,{motion:true});hint.start();assert(hint.el('intro-recall').hidden);
for(let n=0;hint.el('intro-recall').hidden;n++){assert(n<40);hint.advance();}
assert.equal(hint.el('story').dataset.readingKind,'dialogue');
assert(hint.animations.some(a=>a.element===hint.el('intro-recall')&&a.frames[0].translate==='70px 0'));
for(let n=0;n<3;n++){
 const previous=hint.saved().pageKey;
 for(let steps=0;hint.saved().pageKey===previous;steps++){assert(steps<100);if(hint.context.window.MeaningMotion.isBusy())hint.tickNext();else hint.advance();}
 assert(!hint.el('intro-recall').hidden);
}
const previous=hint.saved().pageKey;
for(let steps=0;hint.saved().pageKey===previous;steps++){assert(steps<100);if(hint.context.window.MeaningMotion.isBusy())hint.tickNext();else hint.advance();}
assert(hint.el('intro-recall').classList.contains('is-leaving'));
hint.elapse(340);assert(hint.el('intro-recall').hidden);
assert(hint.animations.some(a=>a.element===hint.el('intro-recall')&&a.frames.at(-1).translate==='70px 0'));
// Every option is still reachable and its label omits the first-person subject.
for(const node of Object.values(context.window.MeaningStory.nodes))for(const option of node.options)assert(!option.label.startsWith('我'));
console.log('Presentation passed: timed intertitles, pause/visibility recovery, four-page recall entrance/exit, chapter labels, pause title and option subjects.');
