/* Small, cancellable effects. Game state never depends on animation events. */
(function(){
  'use strict';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const curtain=document.getElementById('scene-curtain'),running=new WeakMap(),idle=new Set();let locks=0,covered=false;
  const available=element=>!reduced&&element&&typeof element.animate==='function';
  function cancel(element){const current=running.get(element);if(current){clearTimeout(current.timer);current.animation.cancel();running.delete(element);}}
  function animate(element,frames,duration,done=()=>{}){
    cancel(element);if(!available(element)){done();return;}
    let animation;try{animation=element.animate(frames,{duration,easing:'ease-in-out',fill:'both'});}catch{done();return;}
    const state={animation,timer:0};running.set(element,state);
    state.timer=setTimeout(()=>{if(running.get(element)!==state)return;running.delete(element);animation.cancel();done();},duration);
  }
  function release(){locks=Math.max(0,locks-1);if(!locks)for(const callback of idle)callback();}
  function enter(element,kind='panel',fast=false){
    if(fast||!element||element.hidden)return;
    const lifted=kind!=='text';animate(element,[{opacity:0,filter:'blur(2px)',...(lifted?{translate:'0 6px'}:{})},{opacity:1,filter:'blur(0)',...(lifted?{translate:'0 0'}:{})}],kind==='text'?160:kind==='scene'?420:260);
  }
  function cover(change){
    if(!available(curtain)||window.MeaningIntroduction?.isPlaying()){change();return;}
    if(locks){if(covered)change();return;}locks++;curtain.hidden=false;
    animate(curtain,[{opacity:0},{opacity:1}],220,()=>{
      covered=true;try{change();}finally{covered=false;animate(curtain,[{opacity:1},{opacity:0}],340,()=>{curtain.hidden=true;release();});}
    });
  }
  function exit(element,change,duration=150){
    if(!available(element)){change();return;}if(locks)return;locks++;
    animate(element,[{opacity:1},{opacity:0}],duration,()=>{release();change();});
  }
  function closeDialog(dialog,after=()=>{}){
    if(!dialog.open){after();return;}
    dialog.classList.add('motion-closing');exit(dialog,()=>{dialog.classList.remove('motion-closing');dialog.close();after();});
  }
  function stagger(elements){Array.from(elements).slice(0,64).forEach((element,index)=>{
    if(available(element))animate(element,[{opacity:0,translate:'0 5px'},{opacity:1,translate:'0 0'}],220+Math.min(index*7,210));
  });}
  function guard(event){if(locks&&event.target?.id!=='music-toggle'){event.preventDefault();event.stopImmediatePropagation();}}
  document.addEventListener('click',guard,true);document.addEventListener('keydown',guard,true);
  window.MeaningMotion=Object.freeze({enter,cover,exit,closeDialog,animate,cancel,stagger,isBusy:()=>locks>0,onIdle:callback=>idle.add(callback)});
})();
