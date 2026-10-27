const fs=require('fs'),crypto=require('crypto'),assert=require('assert'),createEnv=require('./test-harness.cjs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../assets/musics/web/manifest.json'),'utf8'));
 const t=createEnv(true,null,true,{audio:true,webAudio:true,autoCards:false});
 const music=t.context.window.MeaningMusic,data=t.context.window.MeaningMusicData,story=t.context.window.MeaningStory;
 assert.equal(Object.keys(manifest.tracks).length,8);assert.deepEqual(fs.readdirSync('assets/musics').filter(p=>p.endsWith('.flac')).sort(),Object.values(manifest.tracks).map(t=>require('path').basename(t.source)).sort());assert.deepEqual(Object.keys(data.scenes).sort(),Object.keys(story.nodes).sort());
 for(const track of Object.values(manifest.tracks)){
  const bytes=fs.readFileSync(track.file);assert.equal(bytes.toString('ascii',4,8),'ftyp');assert(bytes.includes(Buffer.from('mp4a')));assert(track.duration>30);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),track.sha256);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(track.source)).digest('hex'),track.sourceSha256);
 }
 assert.equal(t.audios.length,0,'no media allocation or autoplay before interaction');
 t.click('chapters');await flush();assert(t.audios.every(a=>a.playCalls===0),'menu interactions unlock audio without playing it');
 t.click('to-achievements');await flush();assert(t.audios.every(a=>a.paused));
 t.context.window.MeaningShell.showHome();t.click('music-toggle');t.click('music-toggle');await flush();
 assert(t.audios.every(a=>a.playCalls===0),'enabling music on the home screen stays silent');
 assert.equal(data.menu,null);assert.equal(manifest.menu,null);
 t.start();while(t.context.window.MeaningIntroduction.isPlaying())t.tickNext();await flush();
 assert.equal(t.audios.length,2);assert(t.audios.some(a=>a.src===data.tracks.tension.file&&!a.paused),'new story uses tense arrival music');
 t.elapse(1600);const before=t.audios.reduce((n,a)=>n+a.playCalls,0);music.scene('01');await flush();assert.equal(t.audios.reduce((n,a)=>n+a.playCalls,0),before,'same track continues without restart');
 music.scene('06A');await flush();assert(t.audios.some(a=>a.src===data.tracks.sunset.file&&!a.paused));
 const ramps=t.audioContexts[0].gains.slice(1).map(g=>g.events.filter(e=>e[0]==='ramp').at(-1));assert(ramps.some(r=>r[1]===0)&&ramps.some(r=>r[1]===1),'old and new decks ramp in opposite directions');
 t.elapse(1600);assert.equal(t.audios.filter(a=>!a.paused).length,1);
 music.sequence('opening');await flush();music.scene('08');await flush();assert(t.audios.some(a=>a.src===data.tracks.opening.file&&!a.paused),'intro owns the cue over hidden story setup');
 music.endSequence();await flush();assert(t.audios.some(a=>a.src===data.tracks.snow.file&&!a.paused));
 music.sequence('ending');await flush();music.view('home');await flush();assert(t.audios.some(a=>a.src===data.tracks.ending.file&&!a.paused),'ending music continues through the end card');
 music.endSequence();await flush();assert(t.audios.every(a=>a.paused),'home is silent once the end card finishes');
 t.visibility(true);t.visibility(false);await flush();assert(t.audios.every(a=>a.paused),'returning to the home tab stays silent');
 music.view('story');await flush();assert(t.audios.some(a=>!a.paused),'resuming the story restores its cue');
 t.elapse(1600);t.click('pause-read');t.el('player-panel-body').children.find(b=>b.textContent==='阅读设置').onclick();const volume=t.el('player-panel-body').children.flatMap(n=>n.children).find(n=>n.attributes['aria-label']==='音乐音量');assert(volume);volume.value='20';volume.oninput();assert.equal(music.getSettings().volume,.2);t.click('player-panel-close');music.setVolume(.2);assert.equal(music.getSettings().volume,.2);music.duck(true);assert(Math.abs(t.audioContexts[0].gains[0].gain.value-.06)<1e-9);music.duck(false);
 t.visibility(true);assert(t.audios.every(a=>a.paused));t.visibility(false);await flush();assert(t.audios.some(a=>!a.paused));
 music.setEnabled(false);t.elapse(500);await flush();assert(t.audios.every(a=>a.paused));assert.equal(JSON.parse(t.mem.get('tomorrow.audio.v1')).enabled,false);
 // Old play promises cannot pause a deck that has already been reused for a newer scene.
 const rapid=createEnv(true,null,true,{audio:true,webAudio:true});const m=rapid.context.window.MeaningMusic;
 m.unlock();m.view('story');m.scene('06A');m.scene('08');m.sequence('ending');await flush();
 assert(rapid.audios.some(a=>a.src===data.tracks.ending.file&&!a.paused));assert.equal(rapid.audios.length,2);
 m.endSequence();m.scene('06A');const failed=rapid.audios.find(a=>a.src===data.tracks.sunset.file);failed.onerror();await flush();assert(rapid.el('music-toggle').textContent.includes('重试'));
 rapid.click('music-toggle');await flush();assert(rapid.audios.some(a=>a.src===data.tracks.sunset.file&&!a.paused),'retry reloads the failed media source');
 // Whole narrative arcs retain their music across choices; sunset carries into morning.
 const steady=createEnv(true,null,true,{audio:true,webAudio:true});const steadyMusic=steady.context.window.MeaningMusic;
 steadyMusic.unlock();steadyMusic.view('story');steadyMusic.scene('06A',{sunset:true});await flush();
 const sunsetCalls=steady.audios.reduce((n,a)=>n+a.playCalls,0);steadyMusic.scene('07',{sunset:true});await flush();assert.equal(steady.audios.reduce((n,a)=>n+a.playCalls,0),sunsetCalls);
 steadyMusic.scene('08');await flush();const winterCalls=steady.audios.reduce((n,a)=>n+a.playCalls,0);
 for(const id of ['08A','09','09A','10','10A','11','11B','12','12A','13','13B','14','14B']){steadyMusic.scene(id);await flush();}
 assert.equal(steady.audios.reduce((n,a)=>n+a.playCalls,0),winterCalls,'winter choices do not switch or restart the cue');
 const core=require('../js/core.js'),survivalChanges=[];
 function count(id,flags,previous=null,changes=0){
  const rule=data.sceneRules?.[id],cue=rule?(flags[rule.flag]?rule.yes:rule.no):data.scenes[id];changes+=previous&&cue!==previous?1:0;
  const node=story.nodes[id];if(node.end){if(node.end==='survival')survivalChanges.push(changes);return;}
  if(node.options.length)for(const choice of node.options)count(choice.to,{...flags,...choice.set},cue,changes);else count(core.next(id,flags,story.nodes),flags,cue,changes);
 }
 count(story.start,{});assert(survivalChanges.length>0);assert.equal(Math.min(...survivalChanges),4);assert.equal(Math.max(...survivalChanges),5);
 // Desktop file preview has a volume-based fade when Web Audio is unavailable.
 const fallback=createEnv(true,null,true,{audio:true});fallback.context.window.MeaningMusic.view('story');fallback.context.window.MeaningMusic.scene('00');fallback.context.window.MeaningMusic.unlock();await flush();fallback.elapse(800);
 assert(fallback.audios.some(a=>a.volume>0&&a.volume<.35));fallback.elapse(800);assert(fallback.audios.some(a=>Math.abs(a.volume-.35)<1e-6));
 const denied=createEnv(true,null,true,{audio:true,audioDenied:true});denied.context.window.MeaningMusic.view('story');denied.context.window.MeaningMusic.scene('00');denied.context.window.MeaningMusic.unlock();await flush();assert(denied.el('music-toggle').textContent.includes('开启'));assert(denied.el('home').hidden===false);
 const pendingHome=createEnv(true,null,true,{audio:true,webAudio:true}),homeMusic=pendingHome.context.window.MeaningMusic;
 homeMusic.unlock();homeMusic.view('story');homeMusic.scene('00');homeMusic.view('home');await flush();
 assert(pendingHome.audios.every(a=>a.paused),'a late play promise cannot restart music after returning home');
 // Choosing sound at the end of help controls the opening; the global toggle remains available.
 for(const enabled of [true,false]){
  const consent=createEnv(false,null,false,{audio:true,webAudio:true});consent.start();
  for(let i=0;i<3;i++)consent.click('help-next');await flush();
  assert(consent.audios.every(a=>a.playCalls===0),'help remains silent before the explicit choice');
  consent.click(enabled?'help-music-on':'help-music-off');await flush();
  assert.equal(consent.context.window.MeaningMusic.getSettings().enabled,enabled);
  assert.equal(JSON.parse(consent.mem.get('tomorrow.audio.v1')).enabled,enabled);
  assert.equal(consent.audios.some(a=>!a.paused),enabled);
  consent.click('music-toggle');await flush();consent.elapse(500);
  assert.equal(consent.context.window.MeaningMusic.getSettings().enabled,!enabled);
  assert.equal(consent.audios.some(a=>!a.paused),!enabled,'the corner switch can change the initial choice');
 }
 console.log('Music passed: 8 valid AAC files, original hashes intact, all 56 scene cues, gesture unlock, two-deck crossfades, same-track continuity, sequence priority, mute/volume/background pause and load retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
