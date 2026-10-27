const fs=require('fs'),vm=require('vm'),assert=require('assert');
process.chdir(require('path').resolve(__dirname,'..'));
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/story-data.js','utf8'),context);
const S=context.window.MeaningStory,C=require('../js/core.js');
const pages=(id,flags={},incoming)=>C.pages(id,flags,'林',S,incoming);
const spoken=(id,flags={},incoming)=>pages(id,flags,incoming).filter(p=>p.kind==='dialogue').map(p=>p.text);
assert.deepEqual(spoken('A').slice(0,4),[
  '我：“先生，这是我的手稿。”','我：“我写了十年。”','看守：“这里谁没有十年？”','登记员：“姓名？”'
]);
const arrival=pages('A');
const first=arrival.findIndex(p=>p.kind==='dialogue');
assert.equal(arrival[first-1].kind,'prose');assert.equal(arrival[first+2].kind,'prose');
assert(arrival.filter(p=>p.kind==='prose').some(p=>p.text.includes('然后我又想：纸拿走了')));
assert.deepEqual(spoken('Z1',{record:'手稿'}),['扬：“写完没有？”','我：“没有。”','扬：“还写吗？”','我：“写。”']);
assert(spoken('Z1',{record:'寄语'}).length===0);
assert.deepEqual(spoken('M4',{poem:'改诗'}),[
  '埃利亚斯：“不会查到的。”','我：“怎么知道？”','埃利亚斯：“不知道。”',
  '埃利亚斯：“我只是不想看您抖。”','埃利亚斯：“真查来，就说是我讲的。”'
]);
assert(spoken('KT',{},'KR').includes('炉前老者：“学。”'));
const verse=spoken('J1',{},'J');assert(verse[0].startsWith('我：“你的眼睛'));
assert(!spoken('J2',{},'J').some(t=>t.startsWith('酷霸：')),'A joke is still told by the protagonist');
assert(pages('J').filter(p=>p.kind==='prose').some(p=>p.text.includes('最熟的两句是：')));
for(const id of Object.keys(S.nodes))for(const record of ['手稿','寄语']){
  const ps=pages(id,{record,poem:'改诗',bread:'留一块',kurt:'听完',ward:'去',concert:'去听'});
  const keys=new Set();for(const p of ps){assert(p.key);assert(!keys.has(p.key),id+': duplicate page key');keys.add(p.key);
    if(p.kind==='dialogue'){assert(p.waitForClick);assert(p.text.startsWith(p.speaker+'：“'));assert(p.text.endsWith('”'));assert(!p.text.includes('\n\n'));}
  }
}
const blocks=[...Object.values(S.nodes).map(n=>n.paragraphs),...Object.values(S.transitions)];
const sources=blocks.flat().filter(p=>p.sourceText).map(p=>p.sourceText).join('\n');
const manuscript=fs.readFileSync('../生命的意义_互动文案_一万字.md','utf8').split('# 正文')[1].split('# 附录')[0];
const lines=manuscript.split('\n').filter(l=>l.trim()&&!/^(#|>|`|\*\*|---|- \*\*)/.test(l));
for(const line of lines)assert(sources.includes(line.trim()),'Unaccounted source text: '+line);
assert.equal(lines.length,405);
console.log('Reading checks passed: dialogue formatting, individual waits, speakers, narrative/inner-monologue boundaries, branch-specific speech, unique page keys, and all 405 source lines accounted for.');
