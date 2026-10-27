const fs=require('fs'),assert=require('assert'),createEnv=require('./test-harness.cjs');
const expected=fs.readFileSync(require('path').join(__dirname,'../content/开场白.md'),'utf8').trim().split(/\n\s*\n/);
assert.equal(expected.length,5);
const t=createEnv(true,null,false),{el,start,saved,click,advance,mem,context,timers,key,visibility}=t;
const intro=context.window.MeaningIntroduction;
function finishIntro(env){
 const shown=[],phases=[];let steps=0;
 while(env.context.window.MeaningIntroduction.isPlaying()){
  const text=env.el('intro-copy').textContent;if(shown.at(-1)!==text)shown.push(text);
  const phase=env.el('introduction').dataset.phase;if(phases.at(-1)!==phase)phases.push(phase);
  const entry=env.timers.entries().next().value;assert(entry,'intro must have a timer');env.timers.delete(entry[0]);entry[1].fn();assert(++steps<100,'intro must finish');
 }
 return {shown,phases};
}
start();assert.equal(el('introduction').dataset.phase,'help');assert(el('help-prev').hidden);assert.equal(el('help-count').textContent,'1 / 4');assert.equal(timers.size,0,'help pages never force a timed advance');
click('help-next');click('help-prev');assert.equal(el('help-count').textContent,'1 / 4');
for(let i=0;i<4;i++)click('help-next');assert(intro.isPlaying());assert(!el('introduction').hidden);assert(el('game-main').inert);assert(el('intro-recall').hidden);
assert.equal(el('intro-copy').textContent,expected[0]);assert.equal(mem.has('tomorrow.introduction.v1'),false,'do not mark an unfinished opening as watched');
assert.equal(context.window.MeaningShell.getProgress().visited.length,0,'story begins after the black transition');
assert(key(' ').prevented);assert(key('Escape').prevented);advance();assert(intro.isPlaying());
visibility(true);assert.equal(timers.size,0,'hidden tab pauses the reading timer');assert(el('introduction').classList.contains('is-paused'));
visibility(false);assert(timers.size>0);assert(!el('introduction').classList.contains('is-paused'));
const first=finishIntro(t);assert.deepEqual(first.shown,expected);assert.equal(first.phases.filter(p=>p==='fade-in').length,5);assert(first.phases.includes('black'));assert(first.phases.includes('reveal'));
assert(intro.hasSeen());assert.equal(mem.get('tomorrow.introduction.v1'),'seen');assert(el('introduction').hidden);assert(!el('game-main').inert);assert.equal(saved().run.nodeId,'00');assert(el('intro-recall').hidden);
// Later starts skip the opening. Replay suspends automatic reading without changing the save.
start();assert(!intro.isPlaying());assert(!el('intro-recall').hidden);advance();click('auto-read');
const before=JSON.stringify(saved());click('intro-recall');assert(intro.isPlaying());assert.equal(el('auto-read').attributes['aria-pressed'],false);
finishIntro(t);assert.equal(JSON.stringify(saved()),before);assert(!el('intro-recall').hidden);assert.equal(context.document.activeElement,el('read-surface'));
// A new page load remembers the first viewing, including when continuing an existing save.
const loaded=createEnv(true,JSON.parse(mem.get('tomorrow.player.v1')),true);loaded.click('continue-story');
assert(!loaded.context.window.MeaningIntroduction.isPlaying());assert(!loaded.el('intro-recall').hidden);assert.equal(loaded.saved().pageKey,saved().pageKey);
// Full animation timings also complete, with more reading time for longer paragraphs.
const animated=createEnv(false,null,false);animated.start();for(let i=0;i<4;i++)animated.click('help-next');const holds=[];
for(let steps=0;animated.context.window.MeaningIntroduction.isPlaying();steps++){
 assert(steps<100);const [id,timer]=animated.timers.entries().next().value;
 if(animated.el('introduction').dataset.phase==='hold')holds.push(timer.ms);
 animated.tickNext();
}
assert.equal(holds.length,5);assert.equal(animated.now(),32400,'30-second opening plus a separate 2.4-second start card');assert.equal(animated.el('sequence-title').textContent,'始');assert(holds[3]>holds[0]);assert.equal(animated.el('introduction').hidden,true);
console.log('Introduction passed: exact five paragraphs, first-view gating, fade/hold/black/reveal sequence, hidden-tab pause, remembered skip and replay without changing the save.');

// Existing readers receive the newly added help once, then resume their exact page.
const existing=createEnv(true,JSON.parse(mem.get('tomorrow.player.v1')),true,{helpSeen:false,autoCards:false});
existing.click('continue-story');assert.equal(existing.el('introduction').dataset.phase,'help');
for(let i=0;i<4;i++)existing.click('help-next');existing.finishSequence();
assert.equal(existing.saved().pageKey,saved().pageKey);assert.equal(existing.mem.get('tomorrow.help.v1'),'seen');
const newRun=createEnv(false,null,true,{autoCards:false});newRun.start();
let cardStart=null,cardEnd=null;
while(newRun.context.window.MeaningIntroduction.isPlaying()){
 const phase=newRun.el('introduction').dataset.phase;
 if(phase==='card-in'&&cardStart===null)cardStart=newRun.now();
 if(phase==='reveal'&&cardEnd===null)cardEnd=newRun.now();
 newRun.tickNext();
}
assert.equal(cardEnd-cardStart,2400);assert.equal(newRun.el('sequence-title').textContent,'始');
