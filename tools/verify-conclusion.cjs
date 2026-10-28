const fs=require('fs'),assert=require('assert'),createEnv=require('./test-harness.cjs');
const read=name=>fs.readFileSync(require('path').join(__dirname,'../content/'+name),'utf8').trim().split(/\n\s*\n/);
const expected=[...read('结语.md'),...read('结语_尾声.md')];
assert.equal(expected.length,16);
const plan={'01':1,'04':0,'05':1,'06':0,'09':0,'10':0,'11':1,'13':0,'15':0,'16':0,'17':0,'19':1};
const t=createEnv(),{el,saved,click,start,advance,context,mem,timers,visibility,key}=t;start();
for(let steps=0;!context.window.MeaningIntroduction.isPlaying();steps++){
 assert(steps<2000);assert(el('ending-screen').hidden,'no ending UI before conclusion');
 if(!el('choice-screen').hidden)el('choice-buttons').children[plan[saved().run.nodeId]??0].onclick();else advance();
}
assert.equal(saved().run.nodeId,'22');assert(el('introduction').classList.contains('conclusion'));assert.equal(el('introduction').attributes['aria-label'],'结语');
assert.equal(el('introduction').dataset.phase,'entry-fade');assert.equal(el('intro-copy').textContent,'','conclusion text waits for the long transition');
while(el('introduction').dataset.phase.startsWith('entry-'))t.tickNext();
assert.equal(el('intro-copy').textContent,expected[0]);assert(el('game-main').inert);assert(key(' ').prevented);
const before=saved(),introFlag=mem.get('tomorrow.introduction.v1'),shown=[],brightness=[],phases=[];
const activeTimers=timers.size;visibility(true);assert.equal(timers.size,activeTimers-1,'sequence timer pauses');visibility(false);
for(let steps=0;context.window.MeaningIntroduction.isPlaying();steps++){
 assert(steps<200);const text=el('intro-copy').textContent;if(shown.at(-1)!==text){shown.push(text);brightness.push(Number(el('introduction').style['--daylight']));}
 const phase=el('introduction').dataset.phase;if(phases.at(-1)!==phase)phases.push(phase);
 if(phase==='threshold'){assert.equal(shown.length,12);assert.equal(text,expected[11]);}
 const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();
}
assert.deepEqual(shown,expected);assert.equal(brightness[0],0);assert.equal(brightness.at(-1),1);assert(brightness.every((n,i)=>i===0||n>=brightness[i-1]));
assert.equal(phases.filter(p=>p==='threshold').length,1,'one transition before the appended finale');assert.deepEqual(brightness.slice(12),[1,1,1,1]);
assert(phases.includes('light'));assert(!phases.includes('black'));assert(phases.includes('reveal'));assert(el('introduction').hidden);assert(!el('game-main').inert);
assert(el('ending-screen').hidden);assert(!el('home').hidden);assert(el('story').hidden);assert.equal(el('sequence-title').textContent,'终');assert.equal(context.document.activeElement,el('start'));assert(!el('dialog').open);
assert.deepEqual(saved().run,before.run);assert.deepEqual(saved().log,before.log);assert.equal(mem.get('tomorrow.introduction.v1'),introFlag);
const survived=saved();start();assert(!el('story').classList.contains('bright-ending'));
// Every successful completion plays the conclusion, including a loaded last page.
const loaded=createEnv(true,{version:2,autosave:survived,slots:[null,null,null]},true);loaded.click('continue-story');loaded.advance();
assert(loaded.context.window.MeaningIntroduction.isPlaying());assert(loaded.el('introduction').classList.contains('conclusion'));loaded.finishSequence();assert(!loaded.el('home').hidden);assert.equal(loaded.el('sequence-title').textContent,'终');
// Death remains immediate, dark, and does not show a survival reflection.
const dead=createEnv();dead.start();for(let i=0;dead.el('ending-screen').hidden;i++){
 assert(i<200);if(!dead.el('choice-screen').hidden)dead.el('choice-buttons').children[0].onclick();else dead.advance();
 assert(!dead.context.window.MeaningIntroduction.isPlaying());
}
assert.equal(dead.saved().run.nodeId,'02');assert(!dead.el('story').classList.contains('bright-ending'));
console.log('Conclusion passed: exact sixteen paragraphs after survival and a single finale transition, progressive daylight, light ending, timer pause, replay on later success and no playback after death.');

// Black, gradual brightening and a full-white hold all precede the first new paragraph.
const animated=createEnv(false,{version:2,autosave:survived,slots:[null,null,null]},true);
animated.click('continue-story');animated.advance();animated.advance();let reflectionStart=null,reflectionEnd=null,finaleStart=null;const closingHolds=[],transitionStages=[],entryStages=[];
for(let i=0;animated.context.window.MeaningIntroduction.isPlaying();i++){
 assert(i<200);const [id,timer]=[...animated.timers.entries()].sort((a,b)=>a[1].due-b[1].due)[0];
 if(animated.el('introduction').dataset.phase.startsWith('entry-')){
  const phase=animated.el('introduction').dataset.phase;
  if(entryStages.at(-1)?.[0]!==phase)entryStages.push([phase,animated.now()]);
  assert.equal(animated.el('intro-copy').textContent,'');
 }
 if(animated.el('introduction').dataset.paragraph==='1'&&reflectionStart===null)reflectionStart=animated.now();
 if(animated.el('introduction').dataset.phase==='threshold'){
  if(reflectionEnd===null)reflectionEnd=animated.now();
  transitionStages.push([animated.el('introduction').dataset.transition,timer.ms]);
  assert.equal(animated.el('intro-copy').textContent,expected[11],'new text must wait until the white screen has finished');
 }
 if(Number(animated.el('introduction').dataset.paragraph)===13&&finaleStart===null)finaleStart=animated.now();
 if(animated.el('introduction').dataset.phase==='hold'&&Number(animated.el('introduction').dataset.paragraph)>=14)closingHolds.push(timer.ms);
 animated.tickNext();
}
assert.deepEqual(transitionStages,[['black',160],['rise',1800],['white',200]]);
assert.deepEqual(entryStages.map(([phase,start],i)=>[phase,(entryStages[i+1]?.[1]??reflectionStart)-start]),[['entry-fade',1500],['entry-hold',2000],['entry-reveal',500]]);assert.equal(reflectionStart,4000);
assert.equal(reflectionEnd-reflectionStart,60000,'first 12 paragraphs including fades and gaps');assert.equal(finaleStart,66160,'finale starts after the entry and light transitions');assert.equal(animated.now()-finaleStart,27400,'25-second finale plus a separate end card');assert.equal(animated.now(),93560);assert.equal(closingHolds.length,3);assert(closingHolds[0]<closingHolds[1]&&closingHolds[1]<closingHolds[2]);
// The long ending transition pauses with the tab and cannot reveal text early.
const entryPause=createEnv(false);entryPause.context.window.MeaningIntroduction.playConclusion({});entryPause.elapse(750);entryPause.visibility(true);entryPause.elapse(5000);
assert.equal(entryPause.el('introduction').dataset.phase,'entry-fade');entryPause.visibility(false);entryPause.elapse(749);assert.equal(entryPause.el('intro-copy').textContent,'');
entryPause.elapse(1);assert.equal(entryPause.el('introduction').dataset.phase,'entry-hold');entryPause.elapse(1999);assert.equal(entryPause.el('intro-copy').textContent,'');
entryPause.elapse(1);assert.equal(entryPause.el('introduction').dataset.phase,'entry-reveal');entryPause.elapse(499);assert.equal(entryPause.el('intro-copy').textContent,'');
entryPause.elapse(1);assert.equal(entryPause.el('intro-copy').textContent,expected[0]);
// Hiding the tab during either the blackout or the brightening preserves remaining time.
const paused=createEnv(false);paused.context.window.MeaningIntroduction.playConclusion({});
while(paused.el('introduction').dataset.phase!=='threshold')paused.tickNext();
assert.equal(paused.el('introduction').dataset.transition,'black');paused.elapse(80);paused.visibility(true);paused.elapse(5000);
assert.equal(paused.el('introduction').dataset.transition,'black');paused.visibility(false);paused.elapse(79);
assert.equal(paused.el('introduction').dataset.transition,'black');paused.elapse(1);assert.equal(paused.el('introduction').dataset.transition,'rise');
paused.elapse(900);paused.visibility(true);paused.elapse(5000);assert.equal(paused.el('introduction').dataset.transition,'rise');
paused.visibility(false);paused.elapse(899);assert.equal(paused.el('introduction').dataset.transition,'rise');
paused.elapse(1);assert.equal(paused.el('introduction').dataset.transition,'white');assert.equal(paused.el('introduction').dataset.paragraph,'12');
paused.elapse(199);assert.equal(paused.el('introduction').dataset.paragraph,'12');paused.elapse(1);assert.equal(paused.el('introduction').dataset.paragraph,'13');
assert.equal(paused.el('introduction').dataset.finalePart,'1');
console.log('Finale transition passed: hard blackout, gradual brightening, full-white hold, original text timing and background-tab pause.');
