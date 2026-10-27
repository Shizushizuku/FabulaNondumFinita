const assert=require('assert'),createEnv=require('./test-harness.cjs');
const t=createEnv(),{el,saved,click,advance,start,timers,key,context,mem}=t;
function drain(){let count=0;while(timers.size&&count++<5000){const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();}assert(count<5000,'timer loop');}
start();assert(el('auto-read').disabled,'initial caption must disable auto');click('auto-read');assert.equal(el('auto-read').attributes['aria-pressed'],false);
advance();assert(!el('auto-read').disabled);click('auto-read');assert.equal(el('auto-read').attributes['aria-pressed'],true);
// Automatic playback crosses dialogue and later time captions, but stops on the first choice.
drain();assert.equal(saved().run.nodeId,'01');assert(!el('choice-screen').hidden);assert.equal(el('auto-read').attributes['aria-pressed'],false);assert(el('auto-read').disabled);
assert.equal(context.document.activeElement,el('choice-question'),'no answer receives default focus');
const choices=el('choice-buttons').children;
key(' ');key('Enter');advance();el('choice-screen').onclick?.();assert.equal(saved().run.nodeId,'01');assert(!el('choice-screen').hidden);
// Even after deliberately focusing an answer, Space cannot accidentally activate it.
choices[0].focus();assert(key(' ').prevented);assert.equal(saved().run.nodeId,'01');
key('2');assert.equal(saved().run.nodeId,'03');assert.equal(JSON.parse(mem.get('tomorrow.player.v1')).lastChoices['01'],'03');
// Pausing holds the current page. Speed choices persist and change the next delay.
const paused=saved().pageKey;click('pause-read');assert(el('player-dialog').open);assert(el('auto-read').disabled);
el('player-panel-body').children.find(b=>b.textContent==='阅读设置').onclick();
const input=el('player-panel-body').children.flatMap(n=>n.children).find(n=>n.attributes['aria-label']==='自动翻页速度');assert(input);
const spacing=el('player-panel-body').children.flatMap(n=>n.children).find(n=>n.attributes['aria-label']==='正文行距');assert(spacing);spacing.value='2.2';spacing.oninput();assert.equal(el('story').style['--reader-leading'],2.2);
input.value='5';input.oninput();assert.equal(JSON.parse(mem.get('tomorrow.player.v1')).settings.autoRate,5);click('player-panel-close');assert.equal(saved().pageKey,paused);
click('auto-read');const text=el('story-copy').textContent;assert([...timers.values()].some(t=>t.ms===Math.round(1600*Math.max(1,Math.min(1.5,Array.from(text).length/100)))),'fast setting controls dwell time');
click('auto-read');assert.equal(el('auto-read').attributes['aria-pressed'],false);
// With auto off, dialogue waits. Fast-forward must now cross it and stop at the next choice.
for(let i=0;i<20&&el('story').dataset.readingKind!=='dialogue';i++)advance();
assert.equal(el('story').dataset.readingKind,'dialogue');const speech=saved().pageKey;click('skip-read');drain();assert.notEqual(saved().pageKey,speech);assert.equal(saved().run.nodeId,'04');assert(!el('choice-screen').hidden);assert.equal(el('skip-read').attributes['aria-pressed'],false);
console.log('Controls passed: no default answer, Space/background blocked, explicit choices, auto across speech/captions until choice, disabled states and adjustable persistent speed.');
// Exercise real typewriter timers as well as instant text used above.
{
 const live=createEnv(false);live.start();live.advance();live.advance();live.click('auto-read');
 let steps=0;while(live.timers.size&&steps++<15000){const [id,timer]=live.timers.entries().next().value;live.timers.delete(id);timer.fn();}
 assert(steps<15000);assert.equal(live.saved().run.nodeId,'01');assert(!live.el('choice-screen').hidden);assert.equal(live.el('auto-read').attributes['aria-pressed'],false);
}
console.log('Typewriter timers also reach the next choice and stop.');
