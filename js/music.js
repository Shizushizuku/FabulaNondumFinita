/* Two streaming decks, with Web Audio gain fades and a file-preview fallback. */
(function(){
  'use strict';
  const data=window.MeaningMusicData,button=document.getElementById('music-toggle'),KEY='tomorrow.audio.v1';
  let settings={enabled:true,volume:.35};try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved)settings={enabled:saved.enabled!==false,volume:Math.max(0,Math.min(1,Number(saved.volume)||0))};}catch{}
  let context=null,master=null,decks=[],unlocked=false,blocked=false,failed=false,hidden=false,ducked=false;
  let view='home',scene=null,sceneFlags={},sceneMusic=null,sequence=null,desired=null,version=0,active=null,pending=null;
  const positions=new Map();
  const now=()=>context?context.currentTime*1000:Date.now();
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
  function status(){
    button.textContent=!settings.enabled?'音乐：关':failed?'音乐未加载，重试':!unlocked||blocked?'开启音乐':'音乐：开';
    button.setAttribute('aria-pressed',settings.enabled&&unlocked&&!blocked&&!failed);
    button.setAttribute('aria-label',!settings.enabled?'开启背景音乐':failed?'音乐加载失败，点击重试':!unlocked||blocked?'点击开启背景音乐':'关闭背景音乐');
  }
  function level(deck){const t=deck.fade;if(!t)return deck.level;const progress=Math.max(0,Math.min(1,(now()-t.start)/t.duration));return t.from+(t.to-t.from)*progress;}
  function remember(deck){if(deck.track&&Number.isFinite(deck.audio.currentTime))positions.set(deck.track,deck.audio.currentTime);}
  function applyVolume(){
    const volume=settings.volume*(ducked?.3:1);
    if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(volume,context.currentTime,.1);}
    else for(const deck of decks)deck.audio.volume=Math.max(0,Math.min(1,level(deck)*volume));
  }
  function freeze(deck){
    const value=level(deck);clearTimeout(deck.timer);deck.timer=0;deck.level=value;deck.fade=null;
    if(deck.gain){deck.gain.gain.cancelScheduledValues(context.currentTime);deck.gain.gain.setValueAtTime(value,context.currentTime);}
    return value;
  }
  function fade(deck,to,duration,done=()=>{}){
    const from=freeze(deck);deck.fade={from,to,start:now(),duration};
    if(deck.gain){deck.gain.gain.setValueAtTime(from,context.currentTime);deck.gain.gain.linearRampToValueAtTime(to,context.currentTime+duration/1000);}
    const tick=()=>{
      applyVolume();
      if(now()-deck.fade.start>=duration){deck.level=to;deck.fade=null;deck.timer=0;applyVolume();done();}
      else deck.timer=setTimeout(tick,deck.gain?Math.max(1,duration-(now()-deck.fade.start)):40);
    };
    deck.timer=setTimeout(tick,deck.gain?duration:40);
  }
  function createDeck(){
    const audio=new Audio();audio.loop=true;audio.preload='metadata';audio.volume=context?1:0;
    const deck={audio,gain:null,track:null,level:0,fade:null,timer:0,request:0,failed:false,loadTimer:0};
    if(context){const source=context.createMediaElementSource(audio);deck.gain=context.createGain();deck.gain.gain.value=0;source.connect(deck.gain);deck.gain.connect(master);}
    return deck;
  }
  function ensure(){
    if(decks.length)return true;if(typeof Audio!=='function')return false;
    const Constructor=window.AudioContext||window.webkitAudioContext;
    if(Constructor&&window.location?.protocol!=='file:'){
      try{context=new Constructor();master=context.createGain();master.gain.value=settings.volume;master.connect(context.destination);}catch{context=null;master=null;}
    }
    try{decks=[createDeck(),createDeck()];}catch{const previous=context;context=null;master=null;try{previous?.close?.();}catch{}try{decks=[createDeck(),createDeck()];}catch{failed=true;status();return false;}}applyVolume();return true;
  }
  function quiet(deck,duration=data.fadeMs){
    fade(deck,0,duration,()=>{if(deck!==active&&deck!==pending){remember(deck);deck.audio.pause();}});
  }
  function chosen(){
    if(sequence)return sequence==='opening'?'opening':'ending';
    if(view!=='story'||!scene)return null;
    if(sceneMusic)return sceneMusic;
    const rule=data.sceneRules?.[scene];return rule?(sceneFlags[rule.flag]?rule.yes:rule.no):data.scenes[scene];
  }
  function silence(){
    version++;active=null;pending=null;blocked=false;failed=false;
    for(const deck of decks){
      deck.request=0;clearTimeout(deck.loadTimer);deck.loadTimer=0;freeze(deck);remember(deck);deck.audio.pause();deck.level=0;
      if(deck.gain)deck.gain.gain.setValueAtTime(0,context.currentTime);
    }
    applyVolume();status();
  }
  function select(){const key=chosen()||null;if(key!==desired){desired=key;version++;}if(!key){silence();return;}playDesired();}
  function playDesired(){
    status();if(!desired||!settings.enabled||!unlocked||hidden||!ensure())return;
    if(active?.track===desired&&!active.audio.paused&&!pending){if(active.fade?.to!==1&&active.level!==1)fade(active,1,data.fadeMs);return;}
    if(pending?.track===desired)return;
    const token=++version;failed=false;
    if(pending){const stale=pending;pending=null;stale.request=0;clearTimeout(stale.loadTimer);if(stale!==active){freeze(stale);remember(stale);stale.audio.pause();}}
    const key=desired,deck=active?.track===key?active:decks.find(d=>d!==active)||decks[0];pending=deck;deck.request=token;
    if(deck.track!==key||deck.failed){deck.failed=false;
      remember(deck);freeze(deck);deck.level=0;if(deck.gain)deck.gain.gain.setValueAtTime(0,context.currentTime);deck.audio.volume=context?1:0;
      deck.track=key;deck.audio.src=data.tracks[key].file;
      const seek=()=>{if(deck.request!==token)return;try{deck.audio.currentTime=(key==='opening'||key==='ending')?0:positions.get(key)||0;}catch{}};
      deck.audio.onloadedmetadata=seek;if(deck.audio.readyState>=1)seek();
    }
    const reject=error=>{
      if(deck.request!==token||token!==version)return;clearTimeout(deck.loadTimer);deck.loadTimer=0;pending=null;version++;
      blocked=error?.name==='NotAllowedError';failed=!blocked;deck.failed=failed;status();
      if(deck!==active){deck.audio.pause();freeze(deck);deck.level=0;applyVolume();}
    };
    deck.audio.onerror=()=>reject({name:'MediaError'});
    clearTimeout(deck.loadTimer);deck.loadTimer=setTimeout(()=>reject({name:'TimeoutError'}),15000);
    let result;try{result=deck.audio.play();}catch(error){reject(error);return;}
    Promise.resolve(result).then(()=>{
      if(deck.request!==token)return;
      if(token!==version||hidden||!settings.enabled){if(deck!==active)deck.audio.pause();return;}
      clearTimeout(deck.loadTimer);deck.loadTimer=0;const old=active;active=deck;pending=null;blocked=false;failed=false;fade(deck,1,data.fadeMs);
      if(old&&old!==deck)quiet(old);status();
    },reject);
  }
  function unlock(){
    if(!settings.enabled)return;if(!ensure()){failed=true;status();return;}
    unlocked=true;blocked=false;failed=false;
    if(context&&context.state!=='running'&&context.state!=='closed')context.resume().catch(()=>{blocked=true;status();});
    playDesired();
  }
  function setEnabled(value){
    settings.enabled=value;persist();version++;pending=null;
    if(value){unlock();return;}
    active=null;for(const deck of decks){clearTimeout(deck.loadTimer);deck.request=0;quiet(deck,500);}status();
  }
  button.onclick=()=>{if(settings.enabled&&(!unlocked||blocked||failed))unlock();else setEnabled(!settings.enabled);};
  document.addEventListener('pointerdown',event=>{if(event.target!==button&&settings.enabled&&!unlocked)unlock();},true);
  document.addEventListener('keydown',event=>{if(event.target!==button&&settings.enabled&&!unlocked&&!event.ctrlKey&&!event.metaKey)unlock();},true);
  document.addEventListener('visibilitychange',()=>{
    hidden=document.hidden;
    if(hidden){version++;pending=null;for(const deck of decks){clearTimeout(deck.loadTimer);freeze(deck);remember(deck);deck.audio.pause();}if(context?.state==='running')context.suspend().catch(()=>{});}
    else if(unlocked&&settings.enabled)unlock();
  });
  window.MeaningMusic=Object.freeze({
    scene(id,flags={},cue=null){scene=id;sceneFlags=flags;sceneMusic=Object.hasOwn(data.tracks,cue)?cue:null;select();},view(id){view=id;select();},
    sequence(kind){sequence=kind;select();},endSequence(){sequence=null;select();},
    duck(value){ducked=value;applyVolume();},
    getSettings:()=>({...settings}),setVolume(value){settings.volume=Math.max(0,Math.min(1,value));persist();applyVolume();},setEnabled,
    unlock
  });status();
})();
