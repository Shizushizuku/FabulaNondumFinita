const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
process.chdir(require('path').resolve(__dirname,'..'));
const context={window:{}};vm.runInNewContext(fs.readFileSync('js/story-data.js','utf8'),context);
const S=context.window.MeaningStory,C=require('../js/core.js');
const text=fs.readFileSync(S.source.file,'utf8');assert.equal(S.source.sha256,crypto.createHash('sha256').update(text).digest('hex'));
assert.equal(S.coverage.length,216);
for(const block of S.coverage){assert(text.includes(block.text));
 const paragraphs=S.nodes[block.node].paragraphs.filter(p=>p.key.startsWith(block.node+':p'+block.paragraph+':')||p.key===block.node+':p'+block.paragraph);
 assert(paragraphs.length,JSON.stringify(block));
 const rendered=paragraphs.map(p=>p.text).join('');
 // The only removed characters are formatting quotes and explicit speaker attribution tags.
 const clean=s=>s.replaceAll('**','').replace(/[“”]/g,'').replace(/(?:她说|他说|我说|他贴近我说|他忽然说|马丁捎话来|我解释|我压低声音)[，。]?/g,'');
 assert.equal(clean(rendered),clean(block.text),block.node+':'+block.paragraph);
}
const pages=(id,flags)=>C.pages(id,flags,S.protagonist,S), joined=(id,flags)=>pages(id,flags).map(p=>p.text).join('');
for(const joke of ['poem','surgery']){
 const replay=pages('13A',{joke}).filter(p=>p.kind==='dialogue');
 assert.deepEqual(replay.map(p=>p.text),S.jokes[joke].map(p=>'我：“'+p.text+'”'));
 assert(replay.every(p=>p.waitForClick));assert(!replay.some(p=>p.text.includes('你可别当着')));
}
assert(joined('13A',{joke:'surgery'}).includes('病人的肚子是不是也得敞着'));
const conditions={
 '07':[{bread:true},{bread:false}], '14B':[{joke:'poem',retold:false},{joke:'surgery',retold:true}],
 '16':[{concert:true},{concert:false}], '16A':[{record:'letter'},{record:'manuscript'}],
 '20B':[{record:'letter'},{record:'manuscript'}],
 '21A':[{paper:true,shared:false},{paper:false,shared:true},{paper:false,shared:false}],
 '21B':[{paper:true,shared:false},{paper:false,shared:true},{paper:false,shared:false}]
};
for(const [id,variants] of Object.entries(conditions))for(const flags of variants){
 const conditional=S.nodes[id].paragraphs.filter(p=>p.when),expected=conditional.filter(p=>C.matches(p.when,flags));assert(expected.length,id);
 const output=joined(id,flags);for(const p of conditional)assert.equal(output.includes(p.text),expected.includes(p),id+JSON.stringify(flags));
 for(const p of S.nodes[id].paragraphs.filter(p=>!p.when&&p.kind==='prose'))assert(output.includes(p.text));
}
const generated=fs.readFileSync('js/story-data.js','utf8');assert(!generated.includes('【名字】'));assert.equal(S.protagonist,'维克多·弗兰克尔');
console.log('Reading passed: all 216 manuscript blocks preserved, exact joke replay, conditional variants, dialogue punctuation and manual pauses.');
