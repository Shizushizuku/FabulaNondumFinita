const fs=require('fs'),vm=require('vm'),assert=require('assert');
process.chdir(require('path').resolve(__dirname,'..'));
// Source-level controller simulation; does not launch or inspect a browser.
const html=fs.readFileSync('index.html','utf8');
const ids=new Map(),timers=new Map();let timerId=0;
class Element{
 constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.children=[];this._id='';this.id=id;this.hidden=false;this.disabled=false;this.open=false;this.inert=false;this.dataset={};this.attributes={};this.style={setProperty(k,v){this[k]=v}};this.className='';this.value='';this.textContent='';this.events={};this.clientWidth=1200;this.clientHeight=700;this.scrollLeft=0;this.scrollTop=0;this.offsetWidth=100;this.isConnected=true;const self=this;this.classList={add(...a){let set=new Set(self.className.split(' '));a.forEach(x=>set.add(x));self.className=[...set].join(' ')},remove(...a){self.className=self.className.split(' ').filter(x=>!a.includes(x)).join(' ')},contains(a){return self.className.split(' ').includes(a)},toggle(a,b){const on=b===undefined?!this.contains(a):b;if(on)this.add(a);else this.remove(a);return on}};}
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
ids.get('story-data').textContent=html.match(/<script id="story-data"[^>]*>([\s\S]*?)<\/script>/)[1];
const footer=new Element('footer');const homes=[new Element('button'),new Element('button')];
const document={activeElement:null,hidden:false,body:new Element('body'),getElementById:id=>ids.get(id),createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),querySelector:s=>s==='.read-footer'?footer:null,querySelectorAll:s=>s==='[data-home]'?homes:[],addEventListener(){}};
const legacy={savedAt:new Date().toISOString(),run:{version:2,nodeId:'H',incoming:'R2',name:'旧名字',flags:{record:'手稿',concert:'去听'},choices:[]},pageIndex:3,log:[]};
const mem=new Map([['meaning.player.v2',JSON.stringify({version:2,slots:[null,legacy,null],settings:{speed:0,font:22}})]]);
const context={console,document,Image:class{set src(value){this.value=value;if(this.onload)this.onload()}},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(fn){fn()},localStorage:{getItem:k=>mem.get(k)||null,setItem(k,v){mem.set(k,v)}},window:{matchMedia:()=>({matches:true}),addEventListener(){},scrollTo(){}},structuredClone,Date,JSON,Math,Set,Object,Number,String,Array,Error};
vm.createContext(context);
for(const name of ['shell','story-data','core','player'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),context,{filename:name+'.js'});
const el=id=>ids.get(id),saved=()=>JSON.parse(mem.get('meaning.player.v2')).autosave;
function click(id){assert.equal(typeof el(id).onclick,'function',id);el(id).onclick({stopPropagation(){}})}
function advance(){click('read-surface')}
function nameStart(){click('start');if(el('dialog').open)click('dialog-ok');el('player-name').value='林 <测试>';const form=el('player-panel-body').children.find(n=>n.tagName==='FORM');assert(form);form.onsubmit({preventDefault(){}});}
// Fresh state has no playable nodes or achievements.
click('chapters');assert.equal(el('map-status').textContent,'还没有可游玩的记录');assert(context.window.MeaningShell.getProgress().visited.length===0);
nameStart();assert.equal(saved().run.nodeId,'A');assert.equal(el('story').hidden,false);assert.equal(el('home').hidden,true);
// Follow one complete surviving route, sharing the letter and burning the paper.
const choices={M1:1,K:0,S1:1,S2:0,D:0,S3:0,J:1,Q:0,P:0,H:0,C:0,M5:1,TASK:0};
const path=[];let savedAtH=false;
for(let steps=0;steps<2000;steps++){
 const id=saved().run.nodeId;if(path.at(-1)!==id)path.push(id);
 if(id==='H'&&!savedAtH){click('save-read');const b=el('player-panel-body').children.find(x=>x.className.includes('save-slot'));b.onclick();assert(JSON.parse(mem.get('meaning.player.v2')).slots[0]);click('player-panel-close');savedAtH=true;}
 if(!el('ending-screen').hidden)break;
 if(!el('choice-screen').hidden){el('choice-buttons').children[choices[id]||0].onclick()}else advance();
}
assert.equal(saved().run.nodeId,'END');assert.equal(el('ending-title').textContent,'尚未结束');assert(path.includes('Z2'));assert(path.includes('END1'));assert(!path.includes('END2'));
const p=context.window.MeaningShell.getProgress();assert(p.achievements.includes('N10'));assert(p.snapshots.H.flags.record==='寄语');assert.equal(p.snapshots.H.flags.share,undefined);
click('ending-home');assert.equal(el('home').hidden,false);assert.equal(el('story').hidden,true);assert(el('dialog-copy').textContent.includes('新增'));click('dialog-ok');
// A named manual save restores the pre-sharing entry state, not later flags.
click('continue-story');click('load-read');const slots=el('player-panel-body').children.filter(x=>x.className.includes('save-slot'));slots[1].onclick();assert.equal(saved().run.nodeId,'H');assert.equal(saved().run.flags.share,undefined);assert.equal(saved().run.flags.record,'寄语');
// Pause and home preserve the automatic save; map resumes the stored entry.
click('pause-read');const home=el('player-panel-body').children.find(b=>b.textContent==='回到开始界面');home.onclick();click('chapters');const node=el('map-inner').children.find(n=>n.attributes['aria-label']==='是否报名夜班，从此处开始');assert(node);node.onclick();assert.equal(saved().run.nodeId,'M1');assert.equal(saved().run.flags.kurt,undefined);
for(let steps=0;steps<100;steps++){if(!el('ending-screen').hidden)break;if(!el('choice-screen').hidden)el('choice-buttons').children[0].onclick();else advance();}
assert.equal(saved().run.nodeId,'X1');assert.equal(el('ending-title').textContent,'记录止于此处');click('retry-choice');assert.equal(saved().run.nodeId,'M1');assert.equal(saved().run.flags.night,undefined);
console.log('Player controller checks passed: fresh map, name input, 8-act survival, achievements, save/load, pause/home, chapter entry state, death/retry.');console.log('Survival path: '+path.join(' → '));

// Legacy saves restart this scene after repagination, retaining route state.
click('load-read');
let rows=el('player-panel-body').children.filter(x=>x.className.includes('save-slot'));
rows[2].onclick();
assert.equal(saved().run.nodeId,'H');assert.equal(saved().pageIndex,0);
assert.equal(saved().run.flags.record,'手稿');assert.equal(saved().run.name,'旧名字');
assert.equal(saved().readingVersion,2);
assert(context.window.MeaningShell.getProgress().achievements.includes('N10'));
// New saves restore the exact spoken sentence using its stable key.
advance();assert.equal(el('story-copy').textContent,'扬：“是什么？”');
const exactKey=saved().pageKey;
click('save-read');rows=el('player-panel-body').children.filter(x=>x.className.includes('save-slot'));
rows[2].onclick();click('player-panel-close');advance();
assert.notEqual(saved().pageKey,exactKey);
click('load-read');rows=el('player-panel-body').children.filter(x=>x.className.includes('save-slot'));
rows[3].onclick();assert.equal(saved().pageKey,exactKey);
assert.equal(el('story-copy').textContent,'扬：“是什么？”');
console.log('Legacy save migration and exact dialogue-sentence save/load passed.');
