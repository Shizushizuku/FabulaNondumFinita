const assert=require('assert'),createEnv=require('./test-harness.cjs');
const plain='成就',notice='成就（解锁了新成就！）';
function dieAndReturn(t){
 t.start();
 for(let n=0;t.el('ending-screen').hidden;n++){
  assert(n<200);if(!t.el('choice-screen').hidden)t.el('choice-buttons').children[0].onclick();else t.advance();
 }
 assert.equal(t.saved().run.nodeId,'02');t.click('ending-home');assert(!t.el('home').hidden);
}
const t=createEnv();assert.equal(t.el('achievements').textContent,plain);dieAndReturn(t);
assert.equal(t.el('achievements').textContent,notice);
const progress=JSON.parse(t.mem.get('tomorrow.progress.v1'));
assert(progress.unseenAchievements.includes('N0'));
const reloaded=createEnv(true,null,true,{progress});assert.equal(reloaded.el('achievements').textContent,notice);
reloaded.click('achievements');assert(!reloaded.el('gallery').hidden);assert.equal(reloaded.el('achievements').textContent,plain);
assert.equal(JSON.parse(reloaded.mem.get('tomorrow.progress.v1')).unseenAchievements.length,0);
reloaded.context.window.MeaningShell.showHome();dieAndReturn(reloaded);
assert.equal(reloaded.el('achievements').textContent,plain,'replaying an earned achievement does not notify again');
// A successful ending also returns with the indicator; visiting through the map acknowledges it.
const win=createEnv(),answers={'01':1,'04':0,'05':1,'06':0,'09':0,'10':0,'11':1,'13':0,'15':0,'16':0,'17':0,'19':1};win.start();
for(let n=0;win.el('home').hidden;n++){
 assert(n<2000);if(win.context.window.MeaningIntroduction.isPlaying())win.finishSequence();
 else if(!win.el('choice-screen').hidden)win.el('choice-buttons').children[answers[win.saved().run.nodeId]??0].onclick();else win.advance();
}
assert.equal(win.saved().run.nodeId,'22');assert.equal(win.el('achievements').textContent,notice);
win.click('chapters');assert.equal(win.el('achievements').textContent,notice);win.click('to-achievements');
assert.equal(win.el('achievements').textContent,plain);assert(!win.el('gallery').hidden);
// Existing saves adopt the field without treating every old achievement as newly earned.
const legacy={...progress};delete legacy.unseenAchievements;
const old=createEnv(true,null,true,{progress:legacy});assert.equal(old.el('achievements').textContent,plain);
console.log('Achievements passed: death/survival home reminders, persistent unread state, viewing acknowledgement, duplicate suppression and legacy saves.');
