const fs=require('fs'),vm=require('vm'),assert=require('assert');
module.exports=function createEnv(reduced=true){
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
const footer=new Element('footer');const homes=[new Element('button'),new Element('button')];
const document={activeElement:null,hidden:false,body:new Element('body'),getElementById:id=>ids.get(id),createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),querySelector:s=>s==='.read-footer'?footer:null,querySelectorAll:s=>s==='[data-home]'?homes:[],addEventListener(){}};
const mem=new Map([['meaning.player.v2',JSON.stringify({version:2,autosave:{run:{nodeId:'obsolete'},pageIndex:0,log:[{text:'obsolete sentinel'}]}})]]);
const context={console,document,Image:class{set src(value){this.value=value;if(this.onload)this.onload()}},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(fn){fn()},localStorage:{getItem:k=>mem.get(k)||null,setItem(k,v){mem.set(k,v)}},window:{matchMedia:()=>({matches:reduced}),addEventListener(){},scrollTo(){}},structuredClone,Date,JSON,Math,Set,Object,Number,String,Array,Error};
vm.createContext(context);
for(const name of ['story-data','shell','core','player'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),context,{filename:name+'.js'});
const el=id=>ids.get(id),saved=()=>JSON.parse(mem.get('tomorrow.player.v1')).autosave;
function click(id){assert.equal(typeof el(id).onclick,'function',id);el(id).onclick({stopPropagation(){}})}
function advance(){click('read-surface')}
function start(){click('start');if(el('dialog').open)click('dialog-ok');}
return {el,saved,click,advance,start,mem,context,timers};
};
