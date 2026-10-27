(function () {
  'use strict';
  const C=window.MeaningCore, S=window.MeaningStory, shell=window.MeaningShell, introduction=window.MeaningIntroduction, motion=window.MeaningMotion, backgrounds=window.MeaningBackgrounds, music=window.MeaningMusic;
  const el=id=>document.getElementById(id), copy=C.clone;
  const STORAGE='tomorrow.player.v1';
  let library={version:2,autosave:null,slots:[null,null,null],lastChoices:{},settings:{speed:34,font:22,autoRate:3,lineHeight:1.95}}, storageFailed=false;
  try { const raw=JSON.parse(localStorage.getItem(STORAGE)); if(raw?.version===2) library={...library,...raw,settings:{...library.settings,...raw.settings}}; } catch { storageFailed=true; }
  let run=null, pageIndex=0, pageList=[], log=[], typing=false, visible=0, chars=[], textTimer=0, advanceTimer=0;
  let auto=false, skip=false, active=false, choiceOpen=false, pageLogged=false, panelMode='', resumeType=null;
  let pendingUnlocks=[], toastTimer=0, toastQueue=[], returnFocus=null, hintTimer=0, playbackVersion=0, lastRenderedScene=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const validRun=r=>r&&r.version===2&&r.storyId===S.id&&S.nodes[r.nodeId]&&r.flags&&typeof r.flags==='object'&&typeof r.name==='string'&&Array.isArray(r.choices);
  function validSave(s){return s&&validRun(s.run)&&Number.isInteger(s.pageIndex)&&s.pageIndex>=0&&Array.isArray(s.log);}
  library.slots=Array.from({length:3},(_,i)=>validSave(library.slots?.[i])?library.slots[i]:null);
  if(!validSave(library.autosave))library.autosave=null;
  library.settings.speed=Math.max(0,Math.min(65,Number(library.settings.speed)||0));
  library.settings.font=Math.max(18,Math.min(28,Number(library.settings.font)||22));
  library.settings.autoRate=Math.max(1,Math.min(5,Number(library.settings.autoRate)||3));
  library.settings.lineHeight=Math.max(1.6,Math.min(2.6,Number(library.settings.lineHeight)||1.95));
  if(!library.lastChoices||typeof library.lastChoices!=='object'||Array.isArray(library.lastChoices))library.lastChoices={};
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(library));return true;}catch{if(!storageFailed){toast('浏览器未能保存，当前进度仍可继续阅读。');storageFailed=true;}return false;}}
  function snapshot(){return {savedAt:new Date().toISOString(),readingVersion:S.readingVersion,pageKey:pageList[pageIndex]?.key,run:copy(run),pageIndex,awaitingChoice:choiceOpen,log:copy(log.slice(-400))};}
  function autosave(){if(!run)return;library.autosave=snapshot();persist();updateContinue();}
  function halt(){clearTimeout(textTimer);clearTimeout(advanceTimer);clearTimeout(hintTimer);textTimer=0;advanceTimer=0;hintTimer=0;playbackVersion++;}
  function autoAvailable(){return active&&!choiceOpen&&el('ending-screen').hidden&&!el('player-dialog').open&&(auto||pageList[pageIndex]?.kind!=='caption');}
  function syncControls(){
    el('auto-read').disabled=!autoAvailable();
    el('auto-read').title=el('auto-read').disabled?'此处需手动继续或做出选择':'连续阅读至下一个选项';
    el('auto-read').setAttribute('aria-pressed',auto);el('skip-read').setAttribute('aria-pressed',skip);
    el('auto-read').textContent=auto?'自动中':'自动';el('skip-read').textContent=skip?'快进中':'快进';
  }
  function setMode(type){
    if(type==='auto'){if(!autoAvailable())return;auto=!auto;skip=false;}
    else if(type==='skip'){if(!active||choiceOpen||!el('ending-screen').hidden)return;auto=false;skip=!skip;}
    else{auto=false;skip=false;}
    syncControls();clearTimeout(advanceTimer);
    if((auto||skip)&&typing)completeText();else schedule();
  }
  function schedule(){
    clearTimeout(advanceTimer);clearTimeout(hintTimer);advanceTimer=0;hintTimer=0;const version=++playbackVersion;
    if(!active||typing||choiceOpen||document.hidden||introduction.isPlaying()||motion.isBusy()||el('player-dialog').open||el('dialog').open||!el('ending-screen').hidden)return;
    if(!auto&&!skip){el('reader-hint').textContent=pageList[pageIndex]?.kind==='dialogue'?'点击或空格，继续下一句':'点击或空格，继续';return;}
    const delay=skip?130:Math.round([6500,5000,3800,2600,1600][library.settings.autoRate-1]*Math.max(1,Math.min(1.5,chars.length/100)));
    const deadline=Date.now()+delay,node=run.nodeId,key=pageList[pageIndex].key;
    const hint=()=>{if(version!==playbackVersion)return;el('reader-hint').textContent=skip?'快进中 · 遇到选项停止':'自动阅读中 · '+Math.max(1,Math.ceil((deadline-Date.now())/1000))+' 秒后翻页';if(auto)hintTimer=setTimeout(hint,500);};hint();
    advanceTimer=setTimeout(()=>{if(version!==playbackVersion||run.nodeId!==node||pageList[pageIndex]?.key!==key)return;advanceTimer=0;advance();},delay);
  }
  function announceAchievement(id){toastQueue.push(id);if(!toastTimer)showAchievement();}
  function showAchievement(){const id=toastQueue.shift();if(!id){toastTimer=0;return;}el('achievement-toast-name').textContent=ACH_NAMES[Number(id.slice(1))];el('achievement-toast').hidden=false;
    toastTimer=setTimeout(()=>{el('achievement-toast').hidden=true;toastTimer=setTimeout(showAchievement,450);},3500);}
  function unlockNotes(){const notes=S.nodes[run.nodeId].notes;
    for(const id of notes){if(!shell.getProgress().achievements.includes(id)){shell.unlock([id]);pendingUnlocks.push(id);announceAchievement(id);}}
    el('theory-note').hidden=!notes.length;
    el('theory-note').textContent=notes.length?'页边笺 · '+ACH_NAMES[Number(notes[0].slice(1))]:'';
  }
  function updateContinue(){el('continue-story').hidden=!library.autosave;}
  function showPlayer(){shell.show('story');active=true;el('read-surface').focus({preventScroll:true});}
  function beginEntry(id,incoming=null,atChoice=false){halt();el('story').classList.remove('hide-text');run.nodeId=id;run.incoming=incoming;pageIndex=0;pageLogged=false;choiceOpen=false;
    shell.visit(id,copy(run));pageList=C.pages(id,run.flags,run.name,S,incoming);if(!pageList.length){const to=C.next(id,run.flags,S.nodes);if(!to)throw Error('Empty routing scene '+id);beginEntry(to,id);return;}if(atChoice)pageIndex=pageList.length-1;showPlayer();render();if(S.nodes[incoming]?.options.length)unlockNotes();if(atChoice){completeText();showChoices(C.options(id,run.flags,S.nodes));}else el('read-surface').focus({preventScroll:true});}
  function beginNewRun(){const p=shell.getProgress();pendingUnlocks=[];log=[];run={version:2,storyId:S.id,nodeId:S.start,incoming:null,flags:{},name:S.protagonist,choices:[],initialNodes:p.visited.length,initialAchievements:p.achievements.length};
    setMode();beginEntry(S.start);}
  function restoreSave(save){if(!validSave(save)){toast('这份存档无法读取。');return;}run=copy(save.run);log=copy(save.log);pendingUnlocks=[];
    pageList=C.pages(run.nodeId,run.flags,run.name,S,run.incoming);
    const updated=save.readingVersion!==S.readingVersion;
    if(updated)log=[];
    const found=pageList.findIndex(p=>p.key===save.pageKey);
    pageIndex=updated?0:found>=0?found:Math.min(save.pageIndex,pageList.length-1);
    pageLogged=!!log.some(l=>l.key===run.nodeId+'|'+pageList[pageIndex].key);
    shell.visit(run.nodeId,copy(run));setMode();showPlayer();render();if(save.awaitingChoice&&!updated){completeText();showChoices(C.options(run.nodeId,run.flags,S.nodes));}else el('read-surface').focus({preventScroll:true});
    if(updated)toast('文案已更新，已回到当前场景开头；你的选择和成就仍保留。');}
  function playIntroduction(launch,options={}){
    if(introduction.isPlaying())return;
    halt();setMode();let resumeActive=active;active=false;syncControls();
    introduction.play({...options,onCovered(){
      if(launch){launch();resumeActive=active;}halt();active=false;syncControls();
    },onFinish(){
      active=resumeActive;syncControls();
      if(active){if(typing&&resumeType)resumeType();else schedule();
        (choiceOpen?el('choice-question'):!el('ending-screen').hidden?el('ending-home'):el('read-surface')).focus({preventScroll:true});}
    }});
  }
  function launchWithIntroduction(launch,newRun=false){
    const seen=introduction.hasSeen(),helpNeeded=!introduction.hasSeenHelp();el('intro-recall').hidden=!seen;
    if(!seen||helpNeeded||newRun)playIntroduction(launch,{help:helpNeeded,skipOpening:seen,card:newRun?'始':null});
    else launch();
  }
  function startNew(){launchWithIntroduction(beginNewRun,true);}
  function restore(save){if(!validSave(save)){toast('这份存档无法读取。');return;}halt();launchWithIntroduction(()=>motion.cover(()=>restoreSave(save)));}
  shell.onStart(({nodeId,newRun,state})=>{if(newRun){startNew();return;}if(!validRun(state)){toast('这个节点缺少完整记录，请从押运车开始。');return;}
    launchWithIntroduction(()=>{setMode();pendingUnlocks=[];run=copy(state);run.nodeId=nodeId;log=[];beginEntry(nodeId,run.incoming);});});
  function render(){halt();choiceOpen=false;setModal(false);el('choice-screen').hidden=true;el('ending-screen').hidden=true;el('story').classList.remove('bright-ending');el('theory-note').hidden=true;
    const scene=S.nodes[run.nodeId],page=pageList[pageIndex];if(!page)throw Error('Empty story page '+run.nodeId);
    const art=page.art||scene.art;
    music.scene(run.nodeId,run.flags);backgrounds.switchTo(art);
    const nextIds=[scene.next,...scene.options.map(o=>o.to),...scene.routes.map(r=>r.to)].filter(Boolean);
    backgrounds.prefetch([...new Set([...pageList.slice(pageIndex+1).map(p=>p.art).filter(a=>a&&a!==art),...nextIds.map(id=>S.nodes[id].art)])]);
    el('story').dataset.mood=scene.end==='death'?'death':run.nodeId==='17A'?'fire':art==='sunset-open-sky'?'sunset':'';
    el('chapter-caption').textContent=String(scene.chapter).padStart(2,'0')+' / '+S.chapters[scene.chapter-1];
    el('scene-caption').textContent=scene.title;
    el('reader-name').textContent=page.kind==='dialogue'?page.speaker:S.protagonist;
    el('story').dataset.readingKind=page.kind;
    syncControls();
    el('text-window').scrollTop=0;
    el('page-number').textContent=String(pageIndex+1).padStart(2,'0')+' / '+String(pageList.length).padStart(2,'0');
    el('story').classList.toggle('bulletin-page',page.kind==='caption');el('bulletin-sheet').hidden=page.kind!=='caption';el('text-window').hidden=page.kind==='caption';
    const target=page.kind==='caption'?el('bulletin-copy'):el('story-copy');el('story-copy').textContent='';el('bulletin-copy').textContent='';
    chars=Array.from(page.text);visible=0;typing=true;el('continue-mark').hidden=true;el('bulletin-continue').hidden=true;
    el('reader-hint').textContent=page.kind==='dialogue'?'点击或空格，显示整句':'点击或空格，显示整段';applySettings();
    motion.enter(el('read-surface'),lastRenderedScene!==run.nodeId?'scene':'text',skip);if(lastRenderedScene!==run.nodeId)motion.enter(document.querySelector('.story-heading'),'panel',skip);lastRenderedScene=run.nodeId;
    if(auto||skip||reduced||library.settings.speed===0){visible=chars.length;target.textContent=page.text;finishText();}
    else{const tick=()=>{textTimer=0;if(!active||el('player-dialog').open||introduction.isPlaying()||motion.isBusy())return;visible++;target.textContent=chars.slice(0,visible).join('');
      if(visible>=chars.length){finishText();return;}const char=chars[visible-1];textTimer=setTimeout(tick,library.settings.speed*(/[。！？]/.test(char)?5:/[，；：]/.test(char)?2:1));};resumeType=tick;tick();}
    autosave();}
  function finishText(){clearTimeout(textTimer);resumeType=null;typing=false;el('continue-mark').hidden=false;el('bulletin-continue').hidden=false;el('reader-hint').textContent=auto?'自动阅读中 · 到选项时停止':pageList[pageIndex].kind==='dialogue'?'点击或空格，继续下一句':'点击或空格，继续';
    if(!pageLogged){const page=pageList[pageIndex];log.push({key:run.nodeId+'|'+page.key,chapter:S.chapters[S.nodes[run.nodeId].chapter-1],text:page.text});pageLogged=true;}
    if(pageIndex===pageList.length-1)unlockNotes();autosave();schedule();}
  function completeText(){const page=pageList[pageIndex];(page.kind==='caption'?el('bulletin-copy'):el('story-copy')).textContent=page.text;visible=chars.length;finishText();}
  function advance(){if(motion.isBusy()||!active||el('player-dialog').open||choiceOpen||!el('ending-screen').hidden)return;if(el('story').classList.contains('hide-text')){el('story').classList.remove('hide-text');return;}if(typing){completeText();return;}halt();
    if(pageIndex<pageList.length-1){pageIndex++;pageLogged=false;render();return;}unlockNotes();const scene=S.nodes[run.nodeId];
    if(scene.end){showEnding();return;}const options=C.options(run.nodeId,run.flags,S.nodes);if(options.length){showChoices(options);return;}
    const to=C.next(run.nodeId,run.flags,S.nodes);if(!to){toast('此处暂时无法继续，请读取存档。');return;}beginEntry(to,run.nodeId);}
  function setModal(value){el('read-surface').inert=value;document.querySelector('.read-footer').inert=value;}
  function showChoices(options){setMode();choiceOpen=true;setModal(true);el('choice-buttons').replaceChildren();el('choice-question').textContent=el('scene-caption').textContent;
    options.forEach((o,i)=>{const b=document.createElement('button');b.className='story-choice';const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');
      const label=document.createElement('span');label.textContent=o.label;b.append(num,label);if(library.lastChoices[run.nodeId]===o.to){const badge=document.createElement('small');badge.className='previous-choice';badge.textContent='上次选择';b.append(badge);}b.onclick=()=>choose(i);el('choice-buttons').append(b);});
    el('choice-screen').hidden=false;motion.enter(el('choice-screen'));motion.stagger(el('choice-buttons').children);syncControls();el('choice-question').focus();autosave();}
  function choose(index){if(!choiceOpen||motion.isBusy())return;const options=C.options(run.nodeId,run.flags,S.nodes),o=options[index];if(!o)return;
    motion.exit(el('choice-screen'),()=>{
      const from=run.nodeId;library.lastChoices[from]=o.to;run.choices.push({nodeId:from,to:o.to,incoming:run.incoming,flags:copy(run.flags)});Object.assign(run.flags,o.set||{});
      log.push({choice:true,chapter:S.chapters[S.nodes[from].chapter-1],text:o.label});choiceOpen=false;el('choice-screen').hidden=true;beginEntry(o.to,from);
    });
  }
  function retryPoint(){
    const cause={'02':'01','08B':'04','12B':'09','14A':'13','19A':'19'}[run.nodeId];
    const index=run.choices.findLastIndex(point=>point.nodeId===cause);
    const failed={'02':'02','08B':'04B','12B':'09B','14A':'13A','19A':'19A'}[run.nodeId];
    return index>=0?{point:run.choices[index],index,failed}:null;
  }
  function retry(){const target=retryPoint();if(!target){startNew();return;}
    motion.cover(()=>{const {point,index,failed}=target;library.lastChoices[point.nodeId]=point.to||failed;run.flags=copy(point.flags);run.choices=run.choices.slice(0,index);log=[];setMode();beginEntry(point.nodeId,point.incoming,true);});
  }
  function showEnding(){
    if(S.nodes[run.nodeId].end==='death'){revealEnding();return;}
    if(introduction.isPlaying())return;halt();setMode();active=false;syncControls();
    introduction.playConclusion({card:'终',onCovered(){leave();},onFinish(){el('start').focus({preventScroll:true});}});
  }
  function revealEnding(){halt();setMode();setModal(true);const dead=S.nodes[run.nodeId].end==='death';el('ending-screen').hidden=false;motion.enter(el('ending-screen'),'scene');el('story').classList.toggle('bright-ending',!dead);
    el('ending-kicker').textContent=dead?S.title:S.protagonist;
    const ending=S.endings[dead?'death':'survival'];el('ending-title').textContent=ending.title;el('ending-copy').textContent=ending.text;
    el('retry-choice').hidden=!dead;const target=dead?retryPoint():null;el('retry-choice').textContent=target?'从上一个选择开始 · '+S.nodes[target.point.nodeId].title:'从头重新开始';syncControls();el('reread-story').hidden=dead;el('ending-home').focus();autosave();}
  function leave(ended=false){music.duck(false);autosave();halt();setMode();active=false;syncControls();el('choice-screen').hidden=true;el('ending-screen').hidden=true;shell.showHome();
    if(ended){const p=shell.getProgress(),a=Math.max(0,p.achievements.length-(run.initialAchievements||0)),n=Math.max(0,p.visited.length-(run.initialNodes||0));
      openDialog('这一遍，留下了痕迹',`「按章节开始」已可回看本轮到达的节点。新增 ${n} 个节点、${a} 项成就。已到达的节点会保留当时的选择，成就可在开始界面查看。`);}}
  function applySettings(){el('story').style.setProperty('--reader-size',library.settings.font+'px');el('story').style.setProperty('--reader-leading',library.settings.lineHeight);}
  function panelButton(label,action,className=''){const b=document.createElement('button');b.textContent=label;b.className='panel-button '+className;b.onclick=action;return b;}
  function resumeReading(){
    if(!active||introduction.isPlaying()||motion.isBusy()||document.hidden||el('player-dialog').open||el('dialog').open)return;
    if(typing&&resumeType&&!textTimer){if(library.settings.speed===0)completeText();else resumeType();}else schedule();
  }
  motion.onIdle(resumeReading);
  function closePanel(){motion.closeDialog(el('player-dialog'),()=>{music.duck(false);panelMode='';syncControls();resumeReading();(returnFocus?.isConnected?returnFocus:el('read-surface')).focus({preventScroll:true});});}
  function openPanel(mode){music.duck(true);halt();setMode();returnFocus=document.activeElement;panelMode=mode;const body=el('player-panel-body');body.replaceChildren();
    const titles={pause:'暂时停在这里',save:'保存这一页',load:'重新打开一页',log:'已经读过的文字',settings:'阅读设置'};
    el('player-panel-title').textContent=titles[mode];el('player-panel-close').hidden=false;
    if(mode==='pause'){
      body.append(panelButton('继续阅读',closePanel,'primary'),panelButton('保存',()=>openPanel('save')),panelButton('读取',()=>openPanel('load')),panelButton('阅读设置',()=>openPanel('settings')),panelButton('回到开始界面',()=>motion.closeDialog(el('player-dialog'),()=>leave())));
    }else if(mode==='settings'){
      for(const [key,title,min,max] of [['speed','逐字间隔',0,65],['autoRate','自动翻页速度',1,5],['font','正文字号',18,28],['lineHeight','正文行距',1.6,2.6]]){const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=key==='lineHeight'?'.05':'1';input.value=library.settings[key];
        const format=()=>key==='lineHeight'?Number(input.value).toFixed(2)+' 倍':key==='autoRate'?['慢','较慢','标准','较快','快'][Number(input.value)-1]:key==='speed'?(Number(input.value)===0?'立即显示':input.value+' ms'):input.value+' px';const value=document.createElement('output');value.textContent=format();input.setAttribute('aria-label',title);input.oninput=()=>{library.settings[key]=Number(input.value);value.textContent=format();applySettings();persist();};label.append(input,value);body.append(label);}
      const soundLabel=document.createElement('label');soundLabel.textContent='音乐音量';const soundInput=document.createElement('input');soundInput.type='range';soundInput.min=0;soundInput.max=100;soundInput.step=1;soundInput.value=Math.round(music.getSettings().volume*100);soundInput.setAttribute('aria-label','音乐音量');const soundValue=document.createElement('output');soundValue.textContent=soundInput.value+'%';soundInput.oninput=()=>{soundValue.textContent=soundInput.value+'%';music.setVolume(Number(soundInput.value)/100);};soundLabel.append(soundInput,soundValue);body.append(soundLabel);
      const p=document.createElement('p');p.className='panel-subtle';p.textContent='自动会显示整页文字并按设定速度翻页，快进会快速推进；两者均在选项处停止。翻页速度控制每页停留时间。空格 / Enter：继续 · Esc：暂停 · 1 / 2：选择 · H：隐藏文字';body.append(p);
    }else if(mode==='log'){
      const area=document.createElement('div');area.className='backlog';if(!log.length){area.textContent='这一页才刚刚展开。';}
      log.forEach(l=>{const article=document.createElement('article'),small=document.createElement('small'),p=document.createElement('p');small.textContent=l.chapter;p.textContent=(l.choice?'→ ':'')+l.text;article.classList.toggle('log-choice',!!l.choice);article.append(small,p);area.append(article);});body.append(area);requestAnimationFrame(()=>area.scrollTop=area.scrollHeight);
    }else{
      const p=document.createElement('p');p.className='panel-subtle';p.textContent=mode==='save'?'选择一个位置保存。章节与成就会始终保留。':'自动存档在每一页更新。读取后保留本机已解锁的节点与成就。';body.append(p);
      const rows=mode==='load'?[['自动存档',library.autosave,-1],...library.slots.map((s,i)=>['存档 '+(i+1),s,i])]:library.slots.map((s,i)=>['存档 '+(i+1),s,i]);
      for(const [label,s,index] of rows){const b=panelButton('',()=>{
        if(mode==='load'){motion.closeDialog(el('player-dialog'),()=>{music.duck(false);panelMode='';restore(s);});return;}
        const write=()=>{library.slots[index]=snapshot();const saved=persist();openPanel('save');toast(saved?'已保存到存档 '+(index+1):'存档仅在当前页面暂存。');};
        if(s){motion.closeDialog(el('player-dialog'),()=>openDialog('覆盖存档 '+(index+1)+'？','这会替换该位置的阅读进度，已解锁的节点与成就仍会保留。',write));}else write();
      },'save-slot');b.disabled=mode==='load'&&!s;const strong=document.createElement('strong');strong.textContent=label;const span=document.createElement('span');
      span.textContent=s?S.chapters[S.nodes[s.run.nodeId].chapter-1]+' · '+S.nodes[s.run.nodeId].title+'\n'+new Date(s.savedAt).toLocaleString('zh-CN',{hour12:false}):'尚未写下';b.append(strong,span);body.append(b);}
    }
    if(!el('player-dialog').open){el('player-dialog').showModal();motion.enter(el('player-dialog'));}else motion.enter(body);syncControls();
  }
  el('intro-recall').onclick=()=>playIntroduction();
  el('read-surface').onclick=advance;el('next-page').onclick=e=>{e.stopPropagation();advance();};
  el('auto-read').onclick=()=>setMode('auto');el('skip-read').onclick=()=>setMode('skip');
  el('pause-read').onclick=()=>openPanel('pause');el('save-read').onclick=()=>openPanel('save');el('load-read').onclick=()=>openPanel('load');el('log-read').onclick=()=>openPanel('log');
  el('player-panel-close').onclick=closePanel;el('player-dialog').addEventListener('cancel',e=>{e.preventDefault();closePanel();});
  el('retry-choice').onclick=retry;el('reread-story').onclick=()=>startNew();el('ending-home').onclick=()=>leave(true);
  el('continue-story').onclick=()=>restore(library.autosave);el('theory-note').onclick=()=>{halt();setMode();const id=S.nodes[run.nodeId].notes[0];openDialog(ACH_NAMES[Number(id.slice(1))],DATA.notes[id]);};
  el('dialog').addEventListener('close',()=>{if(active&&!el('player-dialog').open){el('read-surface').focus();if(typing&&resumeType)resumeType();else schedule();}});
  document.addEventListener('keydown',e=>{
    if(!active||e.ctrlKey||e.metaKey||e.altKey||el('dialog').open)return;
    if(el('player-dialog').open)return;
    if(e.key==='Tab'&&(choiceOpen||!el('ending-screen').hidden)){const container=choiceOpen?el('choice-buttons'):el('ending-screen');const buttons=[...container.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);const at=buttons.indexOf(document.activeElement);if((e.shiftKey&&at<=0)||(!e.shiftKey&&at===buttons.length-1)){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}return;}
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();openPanel('pause');return;}
    if(e.key.toLowerCase()==='h'&&!choiceOpen&&el('ending-screen').hidden){el('story').classList.toggle('hide-text');return;}
    if(el('story').classList.contains('hide-text')){if(e.key===' '||e.key==='Enter'){e.preventDefault();el('story').classList.remove('hide-text');}return;}
    if(choiceOpen){if(/^[12]$/.test(e.key)){e.preventDefault();choose(Number(e.key)-1);}else if(e.key===' '||e.key==='Spacebar'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();}return;}
    if((e.key===' '||e.key==='Enter'||e.key==='ArrowRight')&&!e.target.closest('button,input,select')){e.preventDefault();advance();}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){halt();setMode();if(!el('player-dialog').open&&!el('dialog').open)openPanel('pause');}});
  window.addEventListener('beforeunload',()=>{if(run)autosave();});
  updateContinue();applySettings();syncControls();
})();
