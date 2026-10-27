/* Pure narrative rules shared by the player and route validation. */
(function (root) {
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function matches(condition,flags){
    if(!condition)return true;
    return Object.entries(condition).every(([key,value])=>key==='any'?value.some(c=>matches(c,flags)):flags[key]===value);
  }
  function next(id,flags,nodes){const node=nodes[id];return node.routes.find(r=>matches(r.when,flags))?.to||node.next;}
  const options=(id,flags,nodes)=>nodes[id].options;
  function pages(id,flags,name,data){
    const out=[];let group='',groupKey='';
    const flush=()=>{if(group)out.push({kind:'prose',key:groupKey,text:group});group='';groupKey='';};
    const paragraphs=data.nodes[id].paragraphs.flatMap(p=>p.kind==='replay'?(data.jokes[flags.joke]||[]):[p]);
    for(const para of paragraphs){
      if(!matches(para.when,flags))continue;
      if(para.kind==='dialogue'||para.kind==='caption'){
        flush();out.push({...para,text:para.kind==='dialogue'?para.speaker+'：“'+para.text+'”':para.text,waitForClick:true});continue;
      }
      if(group&&group.length+para.text.length>125)flush();
      if(!group)groupKey=para.key;
      group+=(group?'\n\n':'')+para.text;
    }
    flush();return out;
  }
  const core={clone,matches,next,options,pages};root.MeaningCore=core;
  if(typeof module!=='undefined')module.exports=core;
})(typeof window==='undefined'?globalThis:window);
