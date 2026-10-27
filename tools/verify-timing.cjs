const fs=require('fs'),vm=require('vm'),assert=require('assert');
process.chdir(require('path').resolve(__dirname,'../..'));
// Source-level controller simulation; does not launch or inspect a browser.
const html=fs.readFileSync('start-screen/index.html','utf8');
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
const mem=new Map([['meaning.player.v2',JSON.stringify({version:2,slots:[],settings:{speed:34,font:22}})]]);
const context={console,document,Image:class{set src(value){this.value=value;if(this.onload)this.onload()}},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(fn){fn()},localStorage:{getItem:k=>mem.get(k)||null,setItem(k,v){mem.set(k,v)}},window:{matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){}},structuredClone,Date,JSON,Math,Set,Object,Number,String,Array,Error};
vm.createContext(context);
for(const name of ['shell','story-data','core','player'])vm.runInContext(fs.readFileSync('start-screen/js/'+name+'.js','utf8'),context,{filename:name+'.js'});
const el=id=>ids.get(id),saved=()=>JSON.parse(mem.get('meaning.player.v2')).autosave;
function click(id){assert.equal(typeof el(id).onclick,'function',id);el(id).onclick({stopPropagation(){}})}
function advance(){click('read-surface')}
function nameStart(){click('start');if(el('dialog').open)click('dialog-ok');el('player-name').value='林 <测试>';const form=el('player-panel-body').children.find(n=>n.tagName==='FORM');assert(form);form.onsubmit({preventDefault(){}});}

nameStart();
const opening=el('bulletin-copy').textContent;
assert.equal(opening.length,1);
click('pause-read');
assert.equal(el('bulletin-copy').textContent,opening);
assert(![...timers.values()].some(t=>t.ms===34));
click('player-panel-close');
assert.equal(el('bulletin-copy').textContent.length,2);
click('skip-read');
function drain(){for(let n=0;n<300;n++){const pair=[...timers].find(([id,t])=>t.ms===110);if(!pair)return;timers.delete(pair[0]);pair[1].fn()}throw Error('Skip did not stop');}
drain();assert.equal(saved().run.nodeId,'M1');assert.equal(el('choice-screen').hidden,false);assert.equal(el('skip-read').attributes['aria-pressed'],false);
el('choice-buttons').children[0].onclick();click('skip-read');drain();
assert.equal(saved().run.nodeId,'X1');assert.equal(el('ending-screen').hidden,false);
console.log('Typing/pause/resume and skip stopping at choices/endings passed.');
