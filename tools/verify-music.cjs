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
 t.start();while(t.context.window.MeaningIntroduction.isPlaying())t.tickNext();await flush();
 assert.equal(t.audios.length,2);assert(t.audios.some(a=>a.src===data.tracks.tension.file&&!a.paused),'new story uses tense arrival music');
 t.elapse(1600);const before=t.audios.reduce((n,a)=>n+a.playCalls,0);music.scene('01');await flush();assert.equal(t.audios.reduce((n,a)=>n+a.playCalls,0),before,'same track continues without restart');
 music.scene('06A');await flush();assert(t.audios.some(a=>a.src===data.tracks.sunset.file&&!a.paused));
 const ramps=t.audioContexts[0].gains.slice(1).map(g=>g.events.filter(e=>e[0]==='ramp').at(-1));assert(ramps.some(r=>r[1]===0)&&ramps.some(r=>r[1]===1),'old and new decks ramp in opposite directions');
 t.elapse(1600);assert.equal(t.audios.filter(a=>!a.paused).length,1);
 music.sequence('opening');await flush();music.scene('07');await flush();assert(t.audios.some(a=>a.src===data.tracks.opening.file&&!a.paused),'intro owns the cue over hidden story setup');
 music.endSequence();await flush();assert(t.audios.some(a=>a.src===data.tracks.snow.file&&!a.paused));
 music.sequence('ending');await flush();music.view('home');await flush();assert(t.audios.some(a=>a.src===data.tracks.ending.file&&!a.paused),'ending music continues through the end card');
 music.endSequence();await flush();assert(t.audios.some(a=>a.src===data.tracks.calm3.file&&!a.paused));
 t.elapse(1600);t.click('pause-read');t.el('player-panel-body').children.find(b=>b.textContent==='阅读设置').onclick();const volume=t.el('player-panel-body').children.flatMap(n=>n.children).find(n=>n.attributes['aria-label']==='音乐音量');assert(volume);volume.value='20';volume.oninput();assert.equal(music.getSettings().volume,.2);t.click('player-panel-close');music.setVolume(.2);assert.equal(music.getSettings().volume,.2);music.duck(true);assert(Math.abs(t.audioContexts[0].gains[0].gain.value-.06)<1e-9);music.duck(false);
 t.visibility(true);assert(t.audios.every(a=>a.paused));t.visibility(false);await flush();assert(t.audios.some(a=>!a.paused));
 music.setEnabled(false);t.elapse(500);await flush();assert(t.audios.every(a=>a.paused));assert.equal(JSON.parse(t.mem.get('tomorrow.audio.v1')).enabled,false);
 // Old play promises cannot pause a deck that has already been reused for a newer scene.
 const rapid=createEnv(true,null,true,{audio:true,webAudio:true});const m=rapid.context.window.MeaningMusic;
 m.unlock();m.view('story');m.scene('06A');m.scene('08');m.sequence('ending');await flush();
 assert(rapid.audios.some(a=>a.src===data.tracks.ending.file&&!a.paused));assert.equal(rapid.audios.length,2);
 m.endSequence();m.scene('06A');const failed=rapid.audios.find(a=>a.src===data.tracks.sunset.file);failed.onerror();await flush();assert(rapid.el('music-toggle').textContent.includes('重试'));
 rapid.click('music-toggle');await flush();assert(rapid.audios.some(a=>a.src===data.tracks.sunset.file&&!a.paused),'retry reloads the failed media source');
 // Desktop file preview has a volume-based fade when Web Audio is unavailable.
 const fallback=createEnv(true,null,true,{audio:true});fallback.context.window.MeaningMusic.unlock();await flush();fallback.elapse(800);
 assert(fallback.audios.some(a=>a.volume>0&&a.volume<.35));fallback.elapse(800);assert(fallback.audios.some(a=>Math.abs(a.volume-.35)<1e-6));
 const denied=createEnv(true,null,true,{audio:true,audioDenied:true});denied.context.window.MeaningMusic.unlock();await flush();assert(denied.el('music-toggle').textContent.includes('开启'));assert(denied.el('home').hidden===false);
 console.log('Music passed: 8 valid AAC files, original hashes intact, all 56 scene cues, gesture unlock, two-deck crossfades, same-track continuity, sequence priority, mute/volume/background pause and load retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
