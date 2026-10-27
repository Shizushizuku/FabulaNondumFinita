const fs=require('fs'),vm=require('vm'),assert=require('assert');
module.exports=function createEnv(reduced=true,initialLibrary=null,introSeen=true,options={}){
process.chdir(require('path').resolve(__dirname,'..'));
// Source-level controller simulation; does not launch or inspect a browser.
const html=fs.readFileSync('index.html','utf8');
const ids=new Map(),timers=new Map(),animations=[],images=[],audios=[],audioContexts=[];let timerId=0,clock=0;
class Element{
 constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.children=[];this._id='';this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.inert=false;this.dataset={};this.attributes={};this.style={setProperty(k,v){this[k]=v}};this.className='';this.value='';this.textContent='';this.events={};this.clientWidth=1200;this.clientHeight=700;this.scrollLeft=0;this.scrollTop=0;this.offsetWidth=100;this.isConnected=true;if(options.motion)this.animate=(frames,settings)=>{const record={element:this,frames,settings,cancelled:false};animations.push(record);return{cancel(){record.cancelled=true}}};const self=this;this.classList={add(...a){let set=new Set(self.className.split(' '));a.forEach(x=>set.add(x));self.className=[...set].join(' ')},remove(...a){self.className=self.className.split(' ').filter(x=>!a.includes(x)).join(' ')},contains(a){return self.className.split(' ').includes(a)},toggle(a,b){const on=b===undefined?!this.contains(a):b;if(on)this.add(a);else this.remove(a);return on}};}
 set id(value){this._id=value;if(value)ids.set(value,this)} get id(){return this._id}
 append(...es){es.forEach(e=>{this.children.push(e);e.parent=this})}replaceChildren(...es){this.children=[];this.append(...es)}
 setAttribute(k,v){this.attributes[k]=v}getAttribute(k){return this.attributes[k]}
 focus(){if(!this.inert)document.activeElement=this}addEventListener(name,fn){(this.events[name]??=[]).push(fn)}
 showModal(){this.open=true}close(){this.open=false;for(const fn of this.events.close||[])fn()}
 querySelectorAll(selector){const out=[];const scan=n=>n.children.forEach(c=>{if(c.tagName===selector.toUpperCase())out.push(c);scan(c)});scan(this);return out}
 closest(selector){if(selector==='button,input,select')return ['BUTTON','INPUT','SELECT'].includes(this.tagName)?this:null;return null}
 get firstElementChild(){return this.children[0]}
}
for(const m of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=new Element(m[1],m[3]);e.hidden=/\bhidden\b/.test(m[2]);e.className=m[2].match(/class="([^"]+)"/)?.[1]||''}
const footer=new Element('footer');const homes=[new Element('button'),new Element('button')];
const documentEvents=new Map();
const document={activeElement:null,hidden:false,body:new Element('body'),getElementById:id=>ids.get(id),createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),querySelector:s=>s==='.read-footer'?footer:null,querySelectorAll:s=>s==='[data-home]'?homes:[],addEventListener(name,fn,capture){const list=documentEvents.get(name)||[];list.push({fn,capture:!!capture});documentEvents.set(name,list);}};
const mem=new Map([['meaning.player.v2',JSON.stringify({version:2,autosave:{run:{nodeId:'obsolete'},pageIndex:0,log:[{text:'obsolete sentinel'}]}})]]);
if(initialLibrary)mem.set('tomorrow.player.v1',JSON.stringify(initialLibrary));
if(options.progress)mem.set('tomorrow.progress.v1',JSON.stringify(options.progress));
if(introSeen)mem.set('tomorrow.introduction.v1','seen');
if(options.helpSeen??introSeen)mem.set('tomorrow.help.v1','seen');
if(options.musicChoiceSeen??introSeen)mem.set('tomorrow.music-choice.v1','chosen');
if(options.musicSettings)mem.set('tomorrow.audio.v1',JSON.stringify(options.musicSettings));
class FakeAudio{
 constructor(){audios.push(this);this.src='';this.paused=true;this.currentTime=0;this.readyState=4;this.volume=1;this.playCalls=0;}
 play(){this.playCalls++;if(options.audioDenied){const error=new Error('blocked');error.name='NotAllowedError';return Promise.reject(error);}this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
}
class FakeAudioContext{
 constructor(){this.state='running';this.destination={};this.gains=[];audioContexts.push(this);}
 get currentTime(){return clock/1000;}
 createGain(){const events=[],gain={value:1,cancelScheduledValues(t){events.push(['cancel',t]);},setValueAtTime(v,t){this.value=v;events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.value=v;events.push(['ramp',v,t]);},setTargetAtTime(v,t,s){this.value=v;events.push(['target',v,t,s]);}};const node={gain,events,connect(){}};this.gains.push(node);return node;}
 createMediaElementSource(){return{connect(){}};}
 resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
}
class ClockDate extends Date{static now(){return clock;}}
const context={console,document,Audio:options.audio?FakeAudio:undefined,Image:class{constructor(){images.push(this);this.complete=false;this.naturalWidth=0;}set src(value){this.value=value;if(options.images!=='manual'){this.complete=true;this.naturalWidth=1280;if(this.onload)this.onload();}}get src(){return this.value;}succeed(){this.complete=true;this.naturalWidth=1280;this.onload?.();}fail(){this.complete=true;this.naturalWidth=0;this.onerror?.();}},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms,due:clock+ms});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(fn){fn()},localStorage:{getItem:k=>mem.get(k)||null,setItem(k,v){mem.set(k,v)}},window:{AudioContext:options.webAudio?FakeAudioContext:undefined,location:{protocol:options.webAudio?'https:':'file:'},matchMedia:()=>({matches:reduced}),addEventListener(){},scrollTo(){}},structuredClone,Date:ClockDate,JSON,Math,Set,Object,Number,String,Array,Error};
vm.createContext(context);
for(const name of ['story-data','music-data','music','motion','shell','core','introduction','backgrounds','player'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),context,{filename:name+'.js'});
const el=id=>ids.get(id),saved=()=>JSON.parse(mem.get('tomorrow.player.v1')).autosave;
function click(id){assert.equal(typeof el(id).onclick,'function',id);if(!el(id).disabled){if(options.audio){for(const {fn} of documentEvents.get('pointerdown')||[])fn({target:el(id)});}const event={target:el(id),prevented:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},stopPropagation(){}};for(const {fn} of documentEvents.get('click')||[]){fn(event);if(event.stopped)break;}if(!event.prevented)el(id).onclick(event);}}
function advance(){
 click('read-surface');
 // Ordinary story tests wait for timed intertitles. Caption-specific tests use raw clicks and the clock.
 if(!context.window.MeaningIntroduction.isPlaying())for(let steps=0;el('story').dataset.readingKind==='caption'&&el('player-dialog').open===false&&document.hidden===false;steps++){
  assert(steps<100,'timed intertitle must finish');tickNext();
 }
}
function start(){click('start');if(el('dialog').open)click('dialog-ok');if(options.autoCards!==false&&context.window.MeaningIntroduction.isPlaying()&&el('introduction').dataset.presentation==='card'&&el('introduction').dataset.phase!=='help')finishSequence();}
function key(value,target=document.activeElement){
 const event={key:value,target,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
 const handlers=[...(documentEvents.get('keydown')||[])].sort((a,b)=>Number(b.capture)-Number(a.capture));
 for(const {fn} of handlers){fn(event);if(event.stopped)break;}
 // Simulate the native activation that made a focused first answer unsafe.
 if(!event.prevented&&(value===' '||value==='Enter')&&target?.tagName==='BUTTON'&&!target.disabled)target.onclick?.({stopPropagation(){}});
 return event;
}
function visibility(hidden){document.hidden=hidden;for(const {fn} of documentEvents.get('visibilitychange')||[])fn();}
function tickNext(){const entry=[...timers.entries()].sort((a,b)=>a[1].due-b[1].due)[0];assert(entry,'scheduled timer');timers.delete(entry[0]);clock=Math.max(clock,entry[1].due);entry[1].fn();}
function finishSequence(){let steps=0;while(context.window.MeaningIntroduction.isPlaying()){
 const entry=timers.entries().next().value;assert(entry,'sequence timer');timers.delete(entry[0]);entry[1].fn();assert(++steps<200,'sequence completion');
}}
function elapse(ms){const target=clock+ms;while([...timers.values()].some(t=>t.due<=target))tickNext();clock=target;}
return {el,saved,click,advance,start,mem,context,timers,key,visibility,finishSequence,tickNext,elapse,animations,images,audios,audioContexts,now:()=>clock};
};
