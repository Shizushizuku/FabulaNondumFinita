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
assert(!el('ending-screen').hidden);assert(el('story').classList.contains('bright-ending'));assert.equal(context.document.activeElement,el('ending-home'));
assert.deepEqual(saved().run,before.run);assert.deepEqual(saved().log,before.log);assert.equal(mem.get('tomorrow.introduction.v1'),introFlag);
const survived=saved();click('ending-home');click('dialog-ok');start();assert(!el('story').classList.contains('bright-ending'));
// Every successful completion plays the conclusion, including a loaded last page.
const loaded=createEnv(true,{version:2,autosave:survived,slots:[null,null,null]},true);loaded.click('continue-story');loaded.advance();
assert(loaded.context.window.MeaningIntroduction.isPlaying());assert(loaded.el('introduction').classList.contains('conclusion'));loaded.finishSequence();assert(!loaded.el('ending-screen').hidden);
// Death remains immediate, dark, and does not show a survival reflection.
const dead=createEnv();dead.start();for(let i=0;dead.el('ending-screen').hidden;i++){
 assert(i<200);if(!dead.el('choice-screen').hidden)dead.el('choice-buttons').children[0].onclick();else dead.advance();
 assert(!dead.context.window.MeaningIntroduction.isPlaying());
}
assert.equal(dead.saved().run.nodeId,'02');assert(!dead.el('story').classList.contains('bright-ending'));
console.log('Conclusion passed: exact sixteen paragraphs after survival and a single finale transition, progressive daylight, light ending, timer pause, replay on later success and no playback after death.');

// Normal-motion timing pauses on the expanding light seam before the first new paragraph.
const animated=createEnv(false,{version:2,autosave:survived,slots:[null,null,null]},true);
animated.click('continue-story');animated.advance();animated.advance();let thresholdDelay=null;
for(let i=0;animated.context.window.MeaningIntroduction.isPlaying();i++){
 assert(i<200);const [id,timer]=animated.timers.entries().next().value;
 if(animated.el('introduction').dataset.phase==='threshold')thresholdDelay=timer.ms;
 animated.timers.delete(id);timer.fn();
}
assert.equal(thresholdDelay,3600);assert.equal(animated.el('introduction').style['--finale-in'],'2200ms');
