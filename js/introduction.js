/* Full-screen opening and survival conclusion share the paragraph sequence. */
(function () {
  'use strict';
  const KEY='tomorrow.introduction.v1',HELP_KEY='tomorrow.help.v1',story=window.MeaningStory;
  const helpPages=[
    {title:'按自己的节奏阅读',text:'右下角可以开启自动播放或快进。\n在「暂停 → 阅读设置」里，可调整字号、行距和播放速度。'},
    {title:'随时停下，也能接着走',text:'阅读时可以随时暂停、保存进度。\n之后从主页「继续」恢复，或在「按章节开始」中回到已走过的节点。\n进度保存在当前浏览器。'},
    {title:'失败后，再试一次',text:'如果选错或未能生还，点击「从上一个选择开始」重新尝试。\n会回到影响这次结局的关键选择，之后的选择可以重做。'},
    {title:'愿你有所收获',text:'预计游玩约十分钟，选择不会被评分。\n故事并不难，请尽量尝试抵达最终结局。\n感谢游玩，愿这段经历为你留下一点思考。'}
  ];
  let helpSeen=false,helpIndex=0;
  let paragraphs=story.introduction,mode='introduction';
  const layer=document.getElementById('introduction'),text=document.getElementById('intro-copy'),main=document.getElementById('game-main');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finaleTransition=reduced?360:2160;
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
  try{seen=localStorage.getItem(KEY)==='seen';helpSeen=localStorage.getItem(HELP_KEY)==='seen';}catch{}
  function arm(){if(!playing||document.hidden)return;started=Date.now();timer=setTimeout(()=>{timer=0;const callback=next;next=null;callback();},remaining);}
  function wait(ms,callback){clearTimeout(timer);remaining=ms;next=callback;arm();}
  function phase(value){layer.dataset.phase=value;}
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
        if(mode==='conclusion'&&index===story.conclusionFinaleAt)wait(timing.gap,()=>{phase('threshold');wait(finaleTransition,paragraph);});
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
          playing=false;layer.hidden=true;main.inert=previousInert;document.body.classList.remove('intro-playing');
          callbacks.onFinish?.();callbacks=null;
        });};
        if(callbacks.card)titleCard(reveal);else reveal();
      });
    });
  }
  function beginPresentation(){
    layer.setAttribute('aria-label',mode==='conclusion'?'结语':'开场白');
    if(callbacks.skipOpening)finish();else paragraph();
    layer.focus({preventScroll:true});
  }
  function renderHelp(){
    phase('help');layer.setAttribute('aria-label','游玩说明');
    document.getElementById('help-title').textContent=helpPages[helpIndex].title;
    document.getElementById('help-copy').textContent=helpPages[helpIndex].text;
    document.getElementById('help-count').textContent=(helpIndex+1)+' / '+helpPages.length;
    document.getElementById('help-prev').hidden=helpIndex===0;
    document.getElementById('help-next').textContent=helpIndex===helpPages.length-1?'准备好了，开始':'下一页 →';
    document.getElementById('help-next').focus({preventScroll:true});
  }
  document.getElementById('help-prev').onclick=()=>{if(playing&&layer.dataset.phase==='help'&&helpIndex>0){helpIndex--;renderHelp();}};
  document.getElementById('help-next').onclick=()=>{
    if(!playing||layer.dataset.phase!=='help')return;
    if(helpIndex<helpPages.length-1){helpIndex++;renderHelp();}
    else{helpSeen=true;try{localStorage.setItem(HELP_KEY,'seen');}catch{}beginPresentation();}
  };
  function playSequence(handlers,type){
    if(playing)return;playing=true;mode=type;paragraphs=type==='conclusion'?story.conclusion:story.introduction;callbacks=handlers;index=0;previousInert=main.inert;
    main.inert=true;layer.classList.toggle('conclusion',mode==='conclusion');layer.setAttribute('aria-label',mode==='conclusion'?'结语':'开场白');layer.style.setProperty('--daylight','0');document.body.classList.add('intro-playing');layer.hidden=false;layer.classList.remove('is-paused');
    prepareTimeline();if(callbacks.skipOpening)closing={cover:reduced?1:180,gap:0,reveal:reduced?1:420};
    layer.style.setProperty('--finale-transition',finaleTransition+'ms');
    layer.style.setProperty('--intro-black',closing.cover+'ms');layer.style.setProperty('--intro-reveal',closing.reveal+'ms');
    layer.dataset.presentation=callbacks.skipOpening?'card':'sequence';
    if(callbacks.help&&!helpSeen){helpIndex=0;renderHelp();}else beginPresentation();
  }
  // Reading time stops while the page is in the background.
  document.addEventListener('visibilitychange',()=>{
    if(!playing)return;layer.classList.toggle('is-paused',document.hidden);
    if(document.hidden){if(timer){clearTimeout(timer);timer=0;remaining=Math.max(0,remaining-(Date.now()-started));}}
    else if(next)arm();
  });
  document.addEventListener('keydown',event=>{
    if(!playing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(layer.dataset.phase==='help'){
      const prev=document.getElementById('help-prev'),nextButton=document.getElementById('help-next');
      if(event.key==='Tab'){event.preventDefault();(event.target===nextButton&&!prev.hidden?prev:nextButton).focus();return;}
      if((event.key==='Enter'||event.key===' ')&&(event.target===prev||event.target===nextButton))return;
    }
    if([' ','Spacebar','Enter','Escape','ArrowRight','ArrowLeft','Tab','1','2','h','H'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  window.MeaningIntroduction=Object.freeze({hasSeen:()=>seen,hasSeenHelp:()=>helpSeen,isPlaying:()=>playing,play:handlers=>playSequence(handlers,'introduction'),playConclusion:handlers=>playSequence(handlers,'conclusion')});
})();
