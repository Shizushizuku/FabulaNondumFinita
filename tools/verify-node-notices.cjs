const assert=require('assert'),createEnv=require('./test-harness.cjs');
const plain='流程图',notice='流程图（解锁了新的节点！）';
function finishDeath(t){
 t.start();for(let n=0;t.el('ending-screen').hidden;n++){
  assert(n<200);if(!t.el('choice-screen').hidden)t.el('choice-buttons').children[0].onclick();else t.advance();
 }assert.equal(t.saved().run.nodeId,'02');t.click('ending-home');assert(!t.el('home').hidden);
}
const t=createEnv();assert.equal(t.el('chapters').textContent,plain);finishDeath(t);
assert.equal(t.el('chapters').textContent,notice);
const progress=JSON.parse(t.mem.get('tomorrow.progress.v1'));
assert(progress.unseenNodes.includes('00')&&progress.unseenNodes.includes('02'));
const loaded=createEnv(true,null,true,{progress});assert.equal(loaded.el('chapters').textContent,notice);
loaded.click('achievements');assert.equal(loaded.el('chapters').textContent,notice,'viewing achievements does not clear the map reminder');
loaded.click('to-map');assert(!loaded.el('map').hidden);assert.equal(loaded.el('chapters').textContent,plain);
assert.equal(JSON.parse(loaded.mem.get('tomorrow.progress.v1')).unseenNodes.length,0);
loaded.context.window.MeaningShell.showHome();finishDeath(loaded);
assert.equal(loaded.el('chapters').textContent,plain,'revisiting known nodes does not notify');
loaded.context.window.MeaningShell.visit('03',loaded.saved().run);loaded.context.window.MeaningShell.showHome();
assert.equal(loaded.el('chapters').textContent,notice);loaded.click('chapters');assert.equal(loaded.el('chapters').textContent,plain);
const legacy={...progress};delete legacy.unseenNodes;
assert.equal(createEnv(true,null,true,{progress:legacy}).el('chapters').textContent,plain);
// Onboarding uses both new button names.
const help=createEnv(true,null,false);help.start();help.click('help-next');
assert(help.el('help-copy').textContent.includes('「流程图」'));assert(help.el('help-copy').textContent.includes('「从头开始」'));
assert(!help.el('help-copy').textContent.includes('按章节开始'));
console.log('Node notices passed: newly visited nodes, persistent unread state, map-only acknowledgement, repeat suppression, legacy saves and updated onboarding.');
