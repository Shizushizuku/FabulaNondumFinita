/* Full-screen opening and survival conclusion share the paragraph sequence. */
(function () {
  'use strict';
  const KEY='tomorrow.introduction.v1',HELP_KEY='tomorrow.help.v1',MUSIC_CHOICE_KEY='tomorrow.music-choice.v1',story=window.MeaningStory;
  const helpPages=[
    {title:'按自己的节奏阅读',text:'右下角可以开启自动播放或快进。\n在「暂停 → 阅读设置」里，可调整字号、行距和播放速度。'},
    {title:'随时停下，也能接着走',text:'阅读时可以随时暂停、保存进度。\n之后从主页「继续」恢复，或在「流程图」中回到已解锁的节点。\n选择「从头开始」可重新游玩，已解锁的节点和成就仍会保留。\n进度保存在当前浏览器。'},
    {title:'失败后，再试一次',text:'如果选错或未能生还，点击「从上一个选择开始」重新尝试。\n会回到影响这次结局的关键选择，之后的选择可以重做。'},
    {title:'愿你有所收获',text:'预计游玩约十分钟，选择不会被评分。\n故事并不难，请尽量尝试抵达最终结局。\n感谢游玩，愿这段经历为你留下一点思考。\n\n本作有音乐，可以在右上角切换开关。\n建议佩戴耳机游玩。'}
  ];
  let helpSeen=false,musicChoiceSeen=false,helpIndex=0;
  let paragraphs=story.introduction,mode='introduction';
  const layer=document.getElementById('introduction'),text=document.getElementById('intro-copy'),main=document.getElementById('game-main');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finaleTransition=reduced?{black:60,rise:240,white:60}:{black:160,rise:1800,white:200};
  let timeline=[],closing=null;
  function fitDuration(parts,budget){
    const fields=parts.flatMap(part=>Object.keys(part).map(key=>({part,key,weight:part[key]})));
    const total=fields.reduce((sum,f)=>sum+f.weight,0);
    for(const field of fields)field.part[field.key]=field.weight?Math.max(1,Math.round(field.weight*budget/total)):0;
    const difference=budget-fields.reduce((sum,f)=>sum+f.part[f.key],0);
    parts.find(part=>part.hold!==undefined).hold+=difference;
  }
  function prepareTimeline(){
    timeline=paragraphs.map((words,i)=>{
      const closingIndex=i-(paragraphs.length-3);
      const hold=Math.round(Math.max(3600,Array.from(words).length*155)*.6);
      return {fadeIn:reduced?1:mode==='conclusion'&&i===story.conclusionFinaleAt?1320:960,
        hold:mode==='conclusion'&&closingIndex>=0?Math.max(hold,[4500,6700,8500][closingIndex]):hold,
        fadeOut:reduced?1:840,gap:i<paragraphs.length-1?270:0};
    });
    closing={cover:reduced?1:1080,gap:270,reveal:reduced?1:720};
    if(mode==='introduction')fitDuration([...timeline,closing],30000);
    else{
      fitDuration(timeline.slice(0,story.conclusionFinaleAt),60000);
      fitDuration([...timeline.slice(story.conclusionFinaleAt),closing],25000);
    }
  }
  let seen=false,playing=false,index=0,timer=0,remaining=0,started=0,next=null,callbacks=null,previousInert=false;
  try{seen=localStorage.getItem(KEY)==='seen';helpSeen=localStorage.getItem(HELP_KEY)==='seen';musicChoiceSeen=localStorage.getItem(MUSIC_CHOICE_KEY)==='chosen';}catch{}
  function arm(){if(!playing||document.hidden)return;started=Date.now();timer=setTimeout(()=>{timer=0;const callback=next;next=null;callback();},remaining);}
  function wait(ms,callback){clearTimeout(timer);remaining=ms;next=callback;arm();}
  function phase(value){layer.dataset.phase=value;}
  function enterFinale(){
    layer.dataset.transition='black';phase('threshold');
    wait(finaleTransition.black,()=>{
      layer.dataset.transition='rise';wait(finaleTransition.rise,()=>{
        layer.dataset.transition='white';wait(finaleTransition.white,paragraph);
      });
    });
  }
  function paragraph(){
    const timing=timeline[index];
    layer.style.setProperty('--intro-in',timing.fadeIn+'ms');layer.style.setProperty('--intro-out',timing.fadeOut+'ms');layer.style.setProperty('--finale-in',timing.fadeIn+'ms');
    if(mode==='conclusion'){
      const daylight=Math.min(1,index/(story.conclusionFinaleAt-1));
      layer.style.setProperty('--daylight',String(daylight));
      // Pick the more readable ink for each progressively lighter background.
      const background=[10,9,8].map((c,i)=>c+([241,235,223][i]-c)*daylight);
      const luminance=rgb=>rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
      const brightness=luminance(background),light=[250,247,240],dark=[8,8,7];
      const useDark=(brightness+.05)/(luminance(dark)+.05)>(luminance(light)+.05)/(brightness+.05);
      layer.style.setProperty('--conclusion-ink',useDark?'#080807':'#faf7f0');
    }
    const isFinale=mode==='conclusion'&&index>=story.conclusionFinaleAt;
    const entrance=isFinale&&index===story.conclusionFinaleAt;
    layer.dataset.section=mode==='introduction'?'opening':isFinale?'finale':'reflection';
    layer.dataset.finalePart=isFinale?String(index-story.conclusionFinaleAt+1):'';
    layer.dataset.entrance=String(entrance);
    text.textContent=paragraphs[index];layer.dataset.paragraph=String(index+1);phase('fade-in');
    wait(timing.fadeIn,()=>{phase('hold');wait(timing.hold,()=>{
      phase('fade-out');wait(timing.fadeOut,()=>{index++;if(index<paragraphs.length){
        if(mode==='conclusion'&&index===story.conclusionFinaleAt)wait(timing.gap,enterFinale);
        else wait(timing.gap,paragraph);
      }else finish();});
    });});
  }
  function titleCard(done){
    document.getElementById('sequence-title').textContent=callbacks.card;
    layer.style.setProperty('--card-in',(reduced?1:600)+'ms');layer.style.setProperty('--card-out',(reduced?1:600)+'ms');
    phase('card-in');wait(reduced?1:600,()=>{phase('card-hold');wait(reduced?2398:1200,()=>{phase('card-out');wait(reduced?1:600,done);});});
  }
  function finish(){
    phase(mode==='conclusion'?'light':'black');wait(closing.cover,()=>{
      if(mode==='introduction'&&!callbacks.skipOpening){seen=true;try{localStorage.setItem(KEY,'seen');}catch{}}
      callbacks.onCovered?.();
      wait(closing.gap,()=>{
        const reveal=()=>{phase('reveal');wait(closing.reveal,()=>{
          playing=false;window.MeaningMusic.endSequence();layer.hidden=true;main.inert=previousInert;document.body.classList.remove('intro-playing');
          callbacks.onFinish?.();callbacks=null;
        });};
        if(callbacks.card)titleCard(reveal);else reveal();
      });
    });
  }
  function beginPresentation(){
    layer.setAttribute('aria-label',mode==='conclusion'?'结语':'开场白');
    if(callbacks.skipOpening)finish();else{window.MeaningMusic.sequence(mode==='conclusion'?'ending':'opening');paragraph();}
    layer.focus({preventScroll:true});
  }
  function renderHelp(){
    phase('help');layer.setAttribute('aria-label','游玩说明');
    document.getElementById('help-title').textContent=helpPages[helpIndex].title;
    document.getElementById('help-copy').textContent=helpPages[helpIndex].text;
    document.getElementById('help-count').textContent=(helpIndex+1)+' / '+helpPages.length;
    const last=helpIndex===helpPages.length-1;
    document.getElementById('help-prev').hidden=helpIndex===0;
    document.getElementById('help-next').hidden=last;
    document.getElementById('help-music-choice').hidden=!last;
    window.MeaningMotion.enter(document.querySelector('.help-panel'));
    document.getElementById(last?'help-title':'help-next').focus({preventScroll:true});
  }
  document.getElementById('help-prev').onclick=()=>{if(playing&&layer.dataset.phase==='help'&&helpIndex>0){helpIndex--;renderHelp();}};
  document.getElementById('help-next').onclick=()=>{
    if(!playing||layer.dataset.phase!=='help')return;
    if(helpIndex<helpPages.length-1){helpIndex++;renderHelp();}
  };
  function chooseMusic(enabled){
    if(!playing||layer.dataset.phase!=='help'||helpIndex!==helpPages.length-1)return;
    window.MeaningMusic.setEnabled(enabled);helpSeen=true;musicChoiceSeen=true;
    try{localStorage.setItem(HELP_KEY,'seen');localStorage.setItem(MUSIC_CHOICE_KEY,'chosen');}catch{}
    beginPresentation();
  }
  document.getElementById('help-music-on').onclick=()=>chooseMusic(true);
  document.getElementById('help-music-off').onclick=()=>chooseMusic(false);
  function playSequence(handlers,type){
    if(playing)return;playing=true;mode=type;paragraphs=type==='conclusion'?story.conclusion:story.introduction;callbacks=handlers;index=0;previousInert=main.inert;
    main.inert=true;layer.classList.toggle('conclusion',mode==='conclusion');layer.setAttribute('aria-label',mode==='conclusion'?'结语':'开场白');layer.style.setProperty('--daylight','0');document.body.classList.add('intro-playing');layer.hidden=false;layer.classList.remove('is-paused');
    prepareTimeline();if(callbacks.skipOpening)closing={cover:reduced?1:180,gap:0,reveal:reduced?1:420};
    layer.dataset.transition='';layer.style.setProperty('--finale-rise',finaleTransition.rise+'ms');
    layer.style.setProperty('--intro-black',closing.cover+'ms');layer.style.setProperty('--intro-reveal',closing.reveal+'ms');
    layer.dataset.presentation=callbacks.skipOpening?'card':'sequence';
    if(callbacks.help&&(!helpSeen||!musicChoiceSeen)){helpIndex=helpSeen?helpPages.length-1:0;renderHelp();}else beginPresentation();
  }
  // Reading time stops while the page is in the background.
  document.addEventListener('visibilitychange',()=>{
    if(!playing)return;layer.classList.toggle('is-paused',document.hidden);
    if(document.hidden){if(timer){clearTimeout(timer);timer=0;remaining=Math.max(0,remaining-(Date.now()-started));}}
    else if(next)arm();
  });
  document.addEventListener('keydown',event=>{
    if(!playing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target===document.getElementById('music-toggle')&&(event.key==='Enter'||event.key===' '))return;
    if(layer.dataset.phase==='help'){
      const prev=document.getElementById('help-prev'),nextButton=document.getElementById('help-next');
      const buttons=[...(!prev.hidden?[prev]:[]),...(!nextButton.hidden?[nextButton]:[document.getElementById('help-music-on'),document.getElementById('help-music-off')]),document.getElementById('music-toggle')];
      if(event.key==='Tab'){event.preventDefault();const index=buttons.indexOf(event.target);const next=index<0?(event.shiftKey?buttons.length-1:0):(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[next].focus();return;}
      if((event.key==='Enter'||event.key===' ')&&buttons.includes(event.target))return;
    }
    if(event.key==='Tab'){event.preventDefault();const toggle=document.getElementById('music-toggle');(event.target===toggle?layer:toggle).focus();return;}
    if([' ','Spacebar','Enter','Escape','ArrowRight','ArrowLeft','Tab','1','2','h','H'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  window.MeaningIntroduction=Object.freeze({hasSeen:()=>seen,hasSeenHelp:()=>helpSeen&&musicChoiceSeen,isPlaying:()=>playing,play:handlers=>playSequence(handlers,'introduction'),playConclusion:handlers=>playSequence(handlers,'conclusion')});
})();
