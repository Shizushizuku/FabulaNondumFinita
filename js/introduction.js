/* Full-screen opening and survival conclusion share the paragraph sequence. */
(function () {
  'use strict';
  const KEY='tomorrow.introduction.v1',story=window.MeaningStory;
  let paragraphs=story.introduction,mode='introduction';
  const layer=document.getElementById('introduction'),text=document.getElementById('intro-copy'),main=document.getElementById('game-main');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeIn=reduced?1:1600,fadeOut=reduced?1:1400,black=reduced?1:1800,reveal=reduced?1:1200;
  const finaleTransition=reduced?600:3600,finaleIn=reduced?1:2200;
  let seen=false,playing=false,index=0,timer=0,remaining=0,started=0,next=null,callbacks=null,previousInert=false;
  try{seen=localStorage.getItem(KEY)==='seen';}catch{}
  function arm(){if(!playing||document.hidden)return;started=Date.now();timer=setTimeout(()=>{timer=0;const callback=next;next=null;callback();},remaining);}
  function wait(ms,callback){clearTimeout(timer);remaining=ms;next=callback;arm();}
  function phase(value){layer.dataset.phase=value;}
  function paragraph(){
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
    wait(entrance?finaleIn:fadeIn,()=>{phase('hold');wait(Math.max(3600,Array.from(paragraphs[index]).length*155),()=>{
      phase('fade-out');wait(fadeOut,()=>{index++;if(index<paragraphs.length){
        if(mode==='conclusion'&&index===story.conclusionFinaleAt)wait(450,()=>{phase('threshold');wait(finaleTransition,paragraph);});
        else wait(450,paragraph);
      }else finish();});
    });});
  }
  function finish(){
    phase(mode==='conclusion'?'light':'black');wait(black,()=>{
      if(mode==='introduction'){seen=true;try{localStorage.setItem(KEY,'seen');}catch{}}
      callbacks.onCovered?.();
      wait(450,()=>{phase('reveal');wait(reveal,()=>{
        playing=false;layer.hidden=true;main.inert=previousInert;document.body.classList.remove('intro-playing');
        callbacks.onFinish?.();callbacks=null;
      });});
    });
  }
  function playSequence(handlers,type){
    if(playing)return;playing=true;mode=type;paragraphs=type==='conclusion'?story.conclusion:story.introduction;callbacks=handlers;index=0;previousInert=main.inert;
    main.inert=true;layer.classList.toggle('conclusion',mode==='conclusion');layer.setAttribute('aria-label',mode==='conclusion'?'结语':'开场白');layer.style.setProperty('--daylight','0');document.body.classList.add('intro-playing');layer.hidden=false;layer.classList.remove('is-paused');
    layer.style.setProperty('--intro-in',fadeIn+'ms');layer.style.setProperty('--intro-out',fadeOut+'ms');
    layer.style.setProperty('--finale-transition',finaleTransition+'ms');layer.style.setProperty('--finale-in',finaleIn+'ms');
    layer.style.setProperty('--intro-black',black+'ms');layer.style.setProperty('--intro-reveal',reveal+'ms');
    paragraph();layer.focus({preventScroll:true});
  }
  // Reading time stops while the page is in the background.
  document.addEventListener('visibilitychange',()=>{
    if(!playing)return;layer.classList.toggle('is-paused',document.hidden);
    if(document.hidden){if(timer){clearTimeout(timer);timer=0;remaining=Math.max(0,remaining-(Date.now()-started));}}
    else if(next)arm();
  });
  document.addEventListener('keydown',event=>{
    if(!playing||event.ctrlKey||event.metaKey||event.altKey)return;
    if([' ','Spacebar','Enter','Escape','ArrowRight','ArrowLeft','Tab','1','2','h','H'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  window.MeaningIntroduction=Object.freeze({hasSeen:()=>seen,isPlaying:()=>playing,play:handlers=>playSequence(handlers,'introduction'),playConclusion:handlers=>playSequence(handlers,'conclusion')});
})();
