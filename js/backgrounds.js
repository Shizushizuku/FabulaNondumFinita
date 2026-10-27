/* Latest scene wins, even when images arrive late or a request needs retrying. */
(function(){
  'use strict';
  const base=document.getElementById('story-background'),overlay=document.getElementById('story-background-next');
  const story=document.getElementById('story'),retry=document.getElementById('retry-background'),motion=window.MeaningMotion;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,prefetched=new Set();
  let serial=0,pending=null,current='',wanted='';
  function clearPending(){if(pending){clearTimeout(pending.timeout);clearTimeout(pending.retryTimer);}pending=null;}
  function switchTo(name){
    wanted=name;if(name===current){serial++;clearPending();retry.hidden=true;story.dataset.backgroundState='ready';return;}
    if(pending?.name===name)return;clearPending();const token=++serial;
    pending={name,token,timeout:0,retryTimer:0};story.dataset.backgroundState='loading';retry.hidden=true;
    load(name,token,0);
  }
  function load(name,token,attempt){
    if(token!==serial)return;
    const url='assets/'+name+'.png'+(attempt?'?retry='+token+'-'+attempt:'');const image=new Image();let settled=false;
    const failed=()=>{
      if(settled||token!==serial)return;settled=true;clearTimeout(pending?.timeout);
      if(attempt===0){pending.retryTimer=setTimeout(()=>load(name,token,1),280);return;}
      pending=null;story.dataset.backgroundState='error';retry.hidden=false;
    };
    const ready=()=>{
      if(settled||token!==serial)return;settled=true;clearTimeout(pending?.timeout);
      let committed=false,decodeTimer=0;
      const commit=()=>{
        if(token!==serial||committed)return;committed=true;clearTimeout(decodeTimer);
        const previous=base.currentSrc||base.src||'assets/train.png';
        motion.cancel(overlay);overlay.classList.remove('visible');overlay.src=previous;
        base.src=url;current=name;pending=null;story.dataset.backgroundState='ready';story.dataset.background=name;retry.hidden=true;
        if(previous!==url&&!reduced){overlay.classList.add('visible');motion.animate(overlay,[{opacity:1},{opacity:0}],520,()=>overlay.classList.remove('visible'));}
      };
      if(typeof image.decode==='function'){decodeTimer=setTimeout(commit,1800);image.decode().then(commit,commit);}else commit();
    };
    image.onload=ready;image.onerror=failed;
    pending.timeout=setTimeout(failed,12000);image.src=url;
    if(image.complete&&image.naturalWidth>0)ready();
  }
  function prefetch(names){
    for(const name of [...new Set(names)].slice(0,2)){
      if(!name||prefetched.has(name)||name===current||name===pending?.name)continue;prefetched.add(name);
      const image=new Image();image.onerror=()=>prefetched.delete(name);image.src='assets/'+name+'.png';
    }
  }
  const start=window.MeaningStory.nodes[window.MeaningStory.start];prefetch([start.art,window.MeaningStory.nodes[start.next]?.art]);
  retry.onclick=()=>switchTo(wanted);
  window.MeaningBackgrounds=Object.freeze({switchTo,prefetch});
})();
