const assert=require('assert'),createEnv=require('./test-harness.cjs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const seed=createEnv(),S=seed.context.window.MeaningStory,C=seed.context.window.MeaningCore,D=seed.context.window.MeaningMusicData;
 const triggers={
  '02':'第四天，我把一只木鞋穿错了脚','08B':'第三天，右胳膊已经举不到肩上','12B':'到了下午，车轮每转一圈',
  '14A':'第五晚，值班的人把我拖回病区','19A':'天黑以后，门从外面上了栓'
 };
 const camp=C.pages('01',{},S.protagonist,S),settle=camp.findIndex(p=>p.kind==='caption');
 assert(settle>0);assert(camp.slice(settle).every(p=>p.music==='calm1'),'camp daily life settles before the night-shift choice');
 assert.equal(D.scenes['02'],'calm1');
 for(const [id,words] of Object.entries(triggers)){
  const pages=C.pages(id,{},S.protagonist,S),onset=pages.findIndex(p=>p.music==='tension');
  assert(onset>0,id+' must not start with the death cue');assert(pages[onset].text.startsWith(words),id+' cue misses the warning');
  assert(pages.slice(0,onset).every(p=>!p.music));assert(pages.slice(onset).every(p=>p.music==='tension'));
  const save={readingVersion:S.readingVersion,pageIndex:0,pageKey:pages[0].key,log:[],run:{version:2,storyId:S.id,nodeId:id,name:S.protagonist,flags:{},choices:[]}};
  const t=createEnv(true,{version:2,autosave:save,slots:[null,null,null],settings:{speed:0}},true,{audio:true,webAudio:true});
  t.click('continue-story');await flush();t.elapse(1600);
  const normal=D.tracks[D.scenes[id]].file,tension=D.tracks.tension.file;
  assert(t.audios.some(a=>a.src===normal&&!a.paused),id+' should retain the prior scene music');
  for(let n=1;n<=onset;n++){
   t.advance();await flush();
   assert.equal(t.audios.some(a=>a.src===tension&&!a.paused),n===onset,id+' death cue enters too early or late');
  }
  t.elapse(1600);assert.equal(t.audios.filter(a=>!a.paused).length,1);assert(t.audios.some(a=>a.src===tension&&!a.paused));
  const library=JSON.parse(t.mem.get('tomorrow.player.v1'));
  const restored=createEnv(true,library,true,{audio:true,webAudio:true});restored.click('continue-story');await flush();
  assert(restored.audios.some(a=>a.src===tension&&!a.paused),id+' restored post-warning save needs its current cue');
  restored.context.window.MeaningMusic.scene('04');await flush();assert(restored.audios.some(a=>a.src===D.tracks.calm1.file&&!a.paused),'death override must clear on retry or scene change');
 }
 console.log('Death music passed: five warning-aligned cue changes, prior music retained at entry, crossfades, direct post-warning save restore and override reset.');
})().catch(error=>{console.error(error);process.exitCode=1;});
