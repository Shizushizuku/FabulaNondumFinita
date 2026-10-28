const assert=require('assert'),createEnv=require('./test-harness.cjs');
for(const animated of [false,true]){
 const t=createEnv(!animated,null,true,{motion:animated}),{el,click}=t;
 const idle=()=>{while(t.context.window.MeaningMotion.isBusy())t.tickNext();};
 t.start();idle();t.advance();idle();
 const slot=()=>el('player-panel-body').children.find(b=>b.className.includes('save-slot'));
 click('save-read');slot().onclick();click('player-panel-close');idle();
 click('save-read');slot().onclick();idle();assert(el('dialog').open);
 click('dialog-cancel');idle();assert(!el('player-dialog').open);assert(!el('dialog').open);
 assert(!el('auto-read').disabled,'cancel restores playback controls');
 const before=t.saved().run.nodeId+'|'+t.saved().pageKey;
 click('auto-read');t.elapse(12000);
 assert.notEqual(t.saved().run.nodeId+'|'+t.saved().pageKey,before,'auto must advance after cancelling overwrite');
}
console.log('Save cancellation passed: playback resumes after cancelling overwrite, with and without animations.');
// Loading a page from the pause menu must also restore text hidden with H.
{
 const t=createEnv();t.start();t.advance();t.key('h');
 assert(t.el('story').classList.contains('hide-text'));
 t.key('Escape');t.el('player-panel-body').children.find(b=>b.textContent==='读取').onclick();
 t.el('player-panel-body').children.find(b=>b.className.includes('save-slot')).onclick();
 assert(!t.el('story').classList.contains('hide-text'),'loading restores visible dialogue');
}
console.log('Load visibility passed: reading is visible after loading from hidden-text mode.');
