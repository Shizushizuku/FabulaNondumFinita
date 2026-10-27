const assert=require('assert'),createEnv=require('./test-harness.cjs');
const {el,saved,click,advance,start,timers}=createEnv(false);
start();
function drainTyping(){let count=0;while(count++<10000){const entry=[...timers].find(([,t])=>t.ms<=325);if(!entry)return;timers.delete(entry[0]);entry[1].fn();}throw Error('typing loop');}
// Captions finish and wait for a real click.
advance();const first=saved().pageKey;assert(![...timers.values()].some(t=>t.ms===110||t.ms>=1800&&t.ms!==3500));
advance();assert.notEqual(saved().pageKey,first);
// Reach the first utterance, turn automatic reading on before entering it.
for(let i=0;i<30&&el('story').dataset.readingKind!=='dialogue';i++){advance();if(el('story').dataset.readingKind!=='dialogue')drainTyping();}
assert.equal(el('story').dataset.readingKind,'dialogue');const key=saved().pageKey;
click('auto-read');drainTyping();assert.equal(saved().pageKey,key);assert.equal(el('auto-read').attributes['aria-pressed'],false);
click('skip-read');assert.equal(saved().pageKey,key);assert.equal(el('skip-read').attributes['aria-pressed'],false);
assert(![...timers.values()].some(t=>t.ms===110));
advance();assert.notEqual(saved().pageKey,key);
// Pausing holds the current text; closing resumes the same page.
const paused=saved().pageKey;click('pause-read');assert(el('player-dialog').open);assert(![...timers.values()].some(t=>t.ms<=325));click('player-panel-close');assert.equal(saved().pageKey,paused);drainTyping();
console.log('Timing passed: captions wait, dialogue remains on each sentence through auto/skip, pause resumes the same page.');
