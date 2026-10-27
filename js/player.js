(function () {
  'use strict';
  const C=window.MeaningCore, S=window.MeaningStory, shell=window.MeaningShell;
  const el=id=>document.getElementById(id), copy=C.clone;
  const STORAGE='meaning.player.v2';
  let library={version:2,autosave:null,slots:[null,null,null],settings:{speed:34,font:22}}, storageFailed=false;
  try { const raw=JSON.parse(localStorage.getItem(STORAGE)); if(raw?.version===2) library={...library,...raw,settings:{...library.settings,...raw.settings}}; } catch { storageFailed=true; }
  let run=null, pageIndex=0, pageList=[], log=[], typing=false, visible=0, chars=[], textTimer=0, advanceTimer=0;
  let auto=false, skip=false, active=false, displayToken=0, choiceOpen=false, pageLogged=false, panelMode='', resumeType=null;
  let pendingUnlocks=[], toastTimer=0, toastQueue=[], lastArt='', returnFocus=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const validRun=r=>r&&r.version===2&&S.nodes[r.nodeId]&&r.flags&&typeof r.flags==='object'&&typeof r.name==='string'&&Array.isArray(r.choices);
  function validSave(s){return s&&validRun(s.run)&&Number.isInteger(s.pageIndex)&&s.pageIndex>=0&&Array.isArray(s.log);}
  library.slots=Array.from({length:3},(_,i)=>validSave(library.slots?.[i])?library.slots[i]:null);
  if(!validSave(library.autosave))library.autosave=null;
  library.settings.speed=Math.max(0,Math.min(65,Number(library.settings.speed)||0));
  library.settings.font=Math.max(18,Math.min(28,Number(library.settings.font)||22));
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(library));return true;}catch{if(!storageFailed){toast('浏览器未能保存，当前进度仍可继续阅读。');storageFailed=true;}return false;}}
  function snapshot(){return {savedAt:new Date().toISOString(),readingVersion:S.readingVersion,pageKey:pageList[pageIndex]?.key,run:copy(run),pageIndex,log:copy(log.slice(-400))};}
  function autosave(){if(!run)return;library.autosave=snapshot();persist();updateContinue();}
  function halt(){clearTimeout(textTimer);clearTimeout(advanceTimer);textTimer=0;advanceTimer=0;}
  function setMode(type){const speech=pageList[pageIndex]?.waitForClick;
    if(speech){auto=false;skip=false;}else if(type==='auto'){auto=!auto;skip=false;}else if(type==='skip'){skip=!skip;auto=false;}else{auto=false;skip=false;}
    el('auto-read').setAttribute('aria-pressed',auto);el('skip-read').setAttribute('aria-pressed',skip);
    el('auto-read').textContent=auto?'自动中':'自动';el('skip-read').textContent=skip?'快进中':'快进';
    clearTimeout(advanceTimer);if((skip||(speech&&type==='skip'))&&typing)completeText();else schedule();
  }
  function schedule(){clearTimeout(advanceTimer);if(!active||typing||choiceOpen||pageList[pageIndex]?.waitForClick||el('player-dialog').open||!el('ending-screen').hidden)return;
    if(skip||auto){const delay=skip?110:Math.max(1800,chars.length*90);advanceTimer=setTimeout(advance,delay);}}
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
  function beginEntry(id,incoming=null){halt();el('story').classList.remove('hide-text');run.nodeId=id;run.incoming=incoming;pageIndex=0;pageLogged=false;choiceOpen=false;
    shell.visit(id,copy(run));pageList=C.pages(id,run.flags,run.name,S,incoming);showPlayer();render();if(S.nodes[incoming]?.options.length)unlockNotes();el('read-surface').focus({preventScroll:true});}
  function startNew(name){const p=shell.getProgress();pendingUnlocks=[];log=[];run={version:2,nodeId:'A',incoming:null,flags:{},name:name.trim().slice(0,24)||'无名',choices:[],initialNodes:p.visited.length,initialAchievements:p.achievements.length};
    setMode();beginEntry('A');}
  function restore(save){if(!validSave(save)){toast('这份存档无法读取。');return;}run=copy(save.run);log=copy(save.log);pendingUnlocks=[];
    pageList=C.pages(run.nodeId,run.flags,run.name,S,run.incoming);
    const updated=save.readingVersion!==S.readingVersion;
    const found=pageList.findIndex(p=>p.key===save.pageKey);
    pageIndex=updated?0:found>=0?found:Math.min(save.pageIndex,pageList.length-1);
    pageLogged=!!log.some(l=>l.key===run.nodeId+'|'+pageList[pageIndex].key);
    shell.visit(run.nodeId,copy(run));setMode();showPlayer();render();el('read-surface').focus({preventScroll:true});
    if(updated)toast('文字分页已更新，已回到当前场景开头；你的选择和成就仍保留。');}
  shell.onStart(({nodeId,newRun,state})=>{if(newRun){openPanel('name');return;}if(!validRun(state)){toast('这个节点缺少完整记录，请从押运车开始。');return;}
    setMode();pendingUnlocks=[];run=copy(state);run.nodeId=nodeId;log=[];beginEntry(nodeId,run.incoming);});
  function switchArt(name){if(lastArt===name)return;lastArt=name;const token=++displayToken;
    const url='assets/'+name+'.png';const img=new Image();img.onload=()=>{if(displayToken!==token)return;const next=el('story-background-next');next.src=url;next.classList.add('visible');
      setTimeout(()=>{if(displayToken!==token)return;el('story-background').src=url;next.classList.remove('visible');},reduced?0:850);};img.onerror=()=>{if(displayToken===token)el('story-background').src='assets/camp-cover.png';};img.src=url;}
  function render(){halt();choiceOpen=false;setModal(false);el('choice-screen').hidden=true;el('ending-screen').hidden=true;el('theory-note').hidden=true;
    const scene=S.nodes[run.nodeId],page=pageList[pageIndex];if(!page)throw Error('Empty story page '+run.nodeId);
    switchArt(scene.art);el('story').dataset.mood=scene.end==='death'?'death':run.nodeId==='C1'?'fire':'';
    el('chapter-caption').textContent=String(scene.chapter).padStart(2,'0')+' / '+S.chapters[scene.chapter-1];
    el('scene-caption').textContent=scene.title.replace(/^(【结算】|主要[①④⑤]：|伏笔[②③]：|新?复合伏笔[甲乙丙]：)/,'');
    el('reader-name').textContent=page.kind==='dialogue'?page.speaker:run.nodeId==='DT'||scene.chapter===8?run.name:'A-1173';
    el('story').dataset.readingKind=page.kind;
    el('auto-read').disabled=page.kind==='dialogue';
    el('text-window').scrollTop=0;
    el('page-number').textContent=String(pageIndex+1).padStart(2,'0')+' / '+String(pageList.length).padStart(2,'0');
    el('story').classList.toggle('bulletin-page',page.kind==='bulletin');el('bulletin-sheet').hidden=page.kind!=='bulletin';el('text-window').hidden=page.kind==='bulletin';
    const target=page.kind==='bulletin'?el('bulletin-copy'):el('story-copy');el('story-copy').textContent='';el('bulletin-copy').textContent='';
    chars=Array.from(page.text);visible=0;typing=true;el('continue-mark').hidden=true;el('bulletin-continue').hidden=true;
    el('reader-hint').textContent=page.kind==='dialogue'?'点击或空格，显示整句':'点击或空格，显示整段';applySettings();
    if(skip||reduced||library.settings.speed===0){visible=chars.length;target.textContent=page.text;finishText();}
    else{const tick=()=>{if(!active||el('player-dialog').open)return;visible++;target.textContent=chars.slice(0,visible).join('');
      if(visible>=chars.length){finishText();return;}const char=chars[visible-1];textTimer=setTimeout(tick,library.settings.speed*(/[。！？]/.test(char)?5:/[，；：]/.test(char)?2:1));};resumeType=tick;tick();}
    autosave();}
  function finishText(){clearTimeout(textTimer);resumeType=null;typing=false;el('continue-mark').hidden=false;el('bulletin-continue').hidden=false;el('reader-hint').textContent=pageList[pageIndex].kind==='dialogue'?'点击或空格，继续下一句':'点击或空格，继续';
    if(!pageLogged){const page=pageList[pageIndex];log.push({key:run.nodeId+'|'+page.key,chapter:S.chapters[S.nodes[run.nodeId].chapter-1],text:page.text});pageLogged=true;}
    if(pageList[pageIndex].waitForClick)setMode();
    if(pageIndex===pageList.length-1)unlockNotes();autosave();schedule();}
  function completeText(){const page=pageList[pageIndex];(page.kind==='bulletin'?el('bulletin-copy'):el('story-copy')).textContent=page.text;visible=chars.length;finishText();}
  function advance(){if(!active||el('player-dialog').open||choiceOpen||!el('ending-screen').hidden)return;if(el('story').classList.contains('hide-text')){el('story').classList.remove('hide-text');return;}if(typing){completeText();return;}halt();
    if(pageIndex<pageList.length-1){pageIndex++;pageLogged=false;render();return;}unlockNotes();const scene=S.nodes[run.nodeId];
    if(scene.end){showEnding();return;}const options=C.options(run.nodeId,run.flags,S.nodes);if(options.length){showChoices(options);return;}
    const to=C.next(run.nodeId,run.flags,S.nodes);if(!to){toast('此处暂时无法继续，请读取存档。');return;}beginEntry(to,run.nodeId);}
  function setModal(value){el('read-surface').inert=value;document.querySelector('.read-footer').inert=value;}
  function showChoices(options){setMode();choiceOpen=true;setModal(true);el('choice-buttons').replaceChildren();el('choice-question').textContent=el('scene-caption').textContent;
    options.forEach((o,i)=>{const b=document.createElement('button');b.className='story-choice';const num=document.createElement('span');num.textContent=String(i+1).padStart(2,'0');
      const label=document.createElement('span');label.textContent=o.label;b.append(num,label);b.onclick=()=>choose(i);el('choice-buttons').append(b);});
    el('choice-screen').hidden=false;el('choice-buttons').firstElementChild.focus();}
  function choose(index){if(!choiceOpen)return;const options=C.options(run.nodeId,run.flags,S.nodes),o=options[index];if(!o)return;
    const from=run.nodeId;run.choices.push({nodeId:from,incoming:run.incoming,flags:copy(run.flags)});Object.assign(run.flags,o.set||{});
    log.push({choice:true,chapter:S.chapters[S.nodes[from].chapter-1],text:o.label});choiceOpen=false;el('choice-screen').hidden=true;beginEntry(o.to,from);}
  function retry(){const point=run.choices.at(-1);if(!point){openPanel('name');return;}run.flags=copy(point.flags);run.choices.pop();log=[];setMode();beginEntry(point.nodeId,point.incoming);}
  function showEnding(){halt();setMode();setModal(true);const dead=S.nodes[run.nodeId].end==='death';el('ending-screen').hidden=false;
    el('ending-kicker').textContent=dead?'名册 · '+run.nodeId:'余页 · '+run.name;
    el('ending-title').textContent=dead?'记录止于此处':'尚未结束';el('ending-copy').textContent=dead?'你的号码从名册上被划去了。\n\n这里没有判决。这里只有登记。':'你活下来了。\n这不是因为你比别人更值得。\n\n'+run.name;
    el('retry-choice').hidden=!dead;el('reread-story').hidden=dead;el('ending-home').focus();autosave();}
  function leave(ended=false){autosave();halt();setMode();active=false;el('choice-screen').hidden=true;el('ending-screen').hidden=true;shell.showHome();
    if(ended){const p=shell.getProgress(),a=Math.max(0,p.achievements.length-(run.initialAchievements||0)),n=Math.max(0,p.visited.length-(run.initialNodes||0));
      openDialog('这一遍，留下了痕迹',`「从选择的章节开始」已可回看本轮到达的节点。新增 ${n} 个节点、${a} 项成就。已到达的节点会保留当时的选择，成就可在开始界面查看。`);}}
  function applySettings(){el('story').style.setProperty('--reader-size',library.settings.font+'px');}
  function panelButton(label,action,className=''){const b=document.createElement('button');b.textContent=label;b.className='panel-button '+className;b.onclick=action;return b;}
  function closePanel(){el('player-dialog').close();panelMode='';if(active){if(typing&&resumeType){if(library.settings.speed===0)completeText();else resumeType();}else schedule();}(returnFocus?.isConnected?returnFocus:el('read-surface')).focus({preventScroll:true});}
  function openPanel(mode){halt();setMode();returnFocus=document.activeElement;panelMode=mode;const body=el('player-panel-body');body.replaceChildren();
    const titles={name:'在号码之前',pause:'暂时停在这里',save:'保存这一页',load:'重新打开一页',log:'已经读过的文字',settings:'阅读设置'};
    el('player-panel-title').textContent=titles[mode];el('player-panel-close').hidden=mode==='name';
    if(mode==='name'){
      const p=document.createElement('p');p.textContent='曾经，也有人这样叫过我。';body.append(p);const form=document.createElement('form');
      const label=document.createElement('label');label.htmlFor='player-name';label.textContent='留下一个名字';const input=document.createElement('input');input.id='player-name';input.type='text';input.maxLength=24;input.autocomplete='off';input.placeholder='无名';input.value=library.autosave?.run.name||'';
      const note=document.createElement('p');note.className='panel-subtle';note.textContent='名字与阅读记录仅保存在这个浏览器。';
      const go=document.createElement('button');go.type='submit';go.className='panel-button primary';go.textContent='走进故事 →';form.append(label,input,note,go);form.onsubmit=e=>{e.preventDefault();el('player-dialog').close();panelMode='';startNew(input.value);};body.append(form,panelButton('返回开始',()=>{el('player-dialog').close();panelMode='';if(active)leave();}));
    }else if(mode==='pause'){
      body.append(panelButton('继续阅读',closePanel,'primary'),panelButton('保存',()=>openPanel('save')),panelButton('读取',()=>openPanel('load')),panelButton('阅读设置',()=>openPanel('settings')),panelButton('回到开始界面',()=>{el('player-dialog').close();leave();}));
    }else if(mode==='settings'){
      for(const [key,title,min,max] of [['speed','逐字间隔',0,65],['font','正文字号',18,28]]){const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.value=library.settings[key];
        const value=document.createElement('output');value.textContent=key==='speed'?(input.value==='0'?'立即显示':input.value+' ms'):input.value+' px';input.setAttribute('aria-label',title);input.oninput=()=>{library.settings[key]=Number(input.value);value.textContent=key==='speed'?(input.value==='0'?'立即显示':input.value+' ms'):input.value+' px';applySettings();persist();};label.append(input,value);body.append(label);}
      const p=document.createElement('p');p.className='panel-subtle';p.textContent='空格 / Enter：继续 · Esc：暂停 · 1 / 2：选择 · H：隐藏文字';body.append(p);
    }else if(mode==='log'){
      const area=document.createElement('div');area.className='backlog';if(!log.length){area.textContent='这一页才刚刚展开。';}
      log.forEach(l=>{const article=document.createElement('article'),small=document.createElement('small'),p=document.createElement('p');small.textContent=l.chapter;p.textContent=(l.choice?'→ ':'')+l.text;article.classList.toggle('log-choice',!!l.choice);article.append(small,p);area.append(article);});body.append(area);requestAnimationFrame(()=>area.scrollTop=area.scrollHeight);
    }else{
      const p=document.createElement('p');p.className='panel-subtle';p.textContent=mode==='save'?'选择一个位置保存。章节与成就会始终保留。':'自动存档在每一页更新。读取后保留本机已解锁的节点与成就。';body.append(p);
      const rows=mode==='load'?[['自动存档',library.autosave,-1],...library.slots.map((s,i)=>['存档 '+(i+1),s,i])]:library.slots.map((s,i)=>['存档 '+(i+1),s,i]);
      for(const [label,s,index] of rows){const b=panelButton('',()=>{
        if(mode==='load'){el('player-dialog').close();panelMode='';restore(s);return;}
        const write=()=>{library.slots[index]=snapshot();const saved=persist();openPanel('save');toast(saved?'已保存到存档 '+(index+1):'存档仅在当前页面暂存。');};
        if(s){el('player-dialog').close();openDialog('覆盖存档 '+(index+1)+'？','这会替换该位置的阅读进度，已解锁的节点与成就仍会保留。',write);}else write();
      },'save-slot');b.disabled=mode==='load'&&!s;const strong=document.createElement('strong');strong.textContent=label;const span=document.createElement('span');
      span.textContent=s?S.chapters[S.nodes[s.run.nodeId].chapter-1]+' · '+S.nodes[s.run.nodeId].title+'\n'+new Date(s.savedAt).toLocaleString('zh-CN',{hour12:false}):'尚未写下';b.append(strong,span);body.append(b);}
    }
    if(!el('player-dialog').open)el('player-dialog').showModal();if(mode==='name')setTimeout(()=>el('player-name')?.focus(),0);
  }
  el('read-surface').onclick=advance;el('next-page').onclick=e=>{e.stopPropagation();advance();};
  el('auto-read').onclick=()=>setMode('auto');el('skip-read').onclick=()=>setMode('skip');
  el('pause-read').onclick=()=>openPanel('pause');el('save-read').onclick=()=>openPanel('save');el('load-read').onclick=()=>openPanel('load');el('log-read').onclick=()=>openPanel('log');
  el('player-panel-close').onclick=closePanel;el('player-dialog').addEventListener('cancel',e=>{e.preventDefault();if(panelMode==='name'){el('player-dialog').close();panelMode='';}else closePanel();});
  el('retry-choice').onclick=retry;el('reread-story').onclick=()=>openPanel('name');el('ending-home').onclick=()=>leave(true);
  el('continue-story').onclick=()=>restore(library.autosave);el('theory-note').onclick=()=>{halt();setMode();const id=S.nodes[run.nodeId].notes[0];openDialog(ACH_NAMES[Number(id.slice(1))],DATA.notes[id]);};
  el('dialog').addEventListener('close',()=>{if(active&&!el('player-dialog').open){el('read-surface').focus();if(typing&&resumeType)resumeType();else schedule();}});
  document.addEventListener('keydown',e=>{
    if(!active||e.ctrlKey||e.metaKey||e.altKey||el('dialog').open)return;
    if(el('player-dialog').open)return;
    if(e.key==='Tab'&&(choiceOpen||!el('ending-screen').hidden)){const container=choiceOpen?el('choice-buttons'):el('ending-screen');const buttons=[...container.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);const at=buttons.indexOf(document.activeElement);if((e.shiftKey&&at<=0)||(!e.shiftKey&&at===buttons.length-1)){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}return;}
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();openPanel('pause');return;}
    if(e.key.toLowerCase()==='h'&&!choiceOpen&&el('ending-screen').hidden){el('story').classList.toggle('hide-text');return;}
    if(el('story').classList.contains('hide-text')){if(e.key===' '||e.key==='Enter'){e.preventDefault();el('story').classList.remove('hide-text');}return;}
    if(choiceOpen&&/^[12]$/.test(e.key)){e.preventDefault();choose(Number(e.key)-1);return;}
    if((e.key===' '||e.key==='Enter'||e.key==='ArrowRight')&&!e.target.closest('button,input,select')){e.preventDefault();advance();}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){halt();setMode();if(!el('player-dialog').open&&!el('dialog').open)openPanel('pause');}});
  window.addEventListener('beforeunload',()=>{if(run)autosave();});
  updateContinue();applySettings();
})();
