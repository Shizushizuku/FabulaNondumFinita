const assert=require('assert'),createEnv=require('./test-harness.cjs');
const base={'01':1,'04':0,'05':1,'06':0,'09':0,'10':0,'11':1,'13':0,'15':0,'16':0,'17':0,'19':1};
for(const [death,cause,overrides,alternative] of [
 ['02','01',{'01':0},1],['08B','04',{'04':1},0],['12B','09',{'09':1},0],['14A','13',{'11':0,'13':0},1],['19A','19',{'19':0},1]
]){
 const {el,saved,click,advance,start,mem,context,finishSequence}=createEnv();start();const plan={...base,...overrides};
 function runToEnd(){for(let i=0;i<3000;i++){if(context.window.MeaningIntroduction.isPlaying())finishSequence();if(!el('ending-screen').hidden||!el('home').hidden)return;if(!el('choice-screen').hidden)el('choice-buttons').children[plan[saved().run.nodeId]??0].onclick();else advance();}throw Error('no ending');}
 runToEnd();assert.equal(saved().run.nodeId,death);assert(el('retry-choice').textContent.includes('从上一个选择开始'));assert(el('auto-read').disabled);
 const before=saved().run.choices.find(p=>p.nodeId===cause);click('retry-choice');assert.equal(saved().run.nodeId,cause);assert(!el('choice-screen').hidden);
 assert.deepEqual(saved().run.flags,before.flags,'restore causal flags');assert(!saved().run.choices.some(p=>p.nodeId===cause),'discard the failed choice and later state');
 const buttons=el('choice-buttons').children;assert.equal(buttons.filter(b=>b.children.some(n=>n.className==='previous-choice')).length,1);
 const previous=buttons.findIndex(b=>b.children.some(n=>n.className==='previous-choice'));assert.equal(previous,plan[cause]);
 // The unselected choice screen survives save/restore and keeps its neutral focus.
 click('continue-story');assert(!el('choice-screen').hidden);assert.equal(saved().run.nodeId,cause);
 el('choice-buttons').children[alternative].onclick();plan[cause]=alternative;runToEnd();assert.equal(saved().run.nodeId,'22',death+' can recover to survival');
}
console.log('Retry passed: all 5 deaths return to their causal decision; prior answer marked, downstream flags cleared, choice screen restored and survival reachable.');
