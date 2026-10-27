"""Format the new manuscript's actual quotations without rewriting their words."""
import re

SPEECH = {
 '00':{7:'蒂莉'},'01':{3:'我',10:'马丁'},'03':{2:'马丁'},
 '04':{1:'奥托',3:'奥托'},'04A':{0:'我',2:'奥托',5:'奥托'},'04B':{0:'我'},
 '05':{2:'马丁'},'06':{1:'难友'},'06A':{2:'马丁'},'08':{1:'我',3:'监工'},'08A':{1:'奥托'},
 '09':{1:'莱文',4:'莱文'},'09A':{2:'我',3:'病人'},'10':{1:'马丁'},'10A':{3:'塞缪尔',6:'塞缪尔'},
 '11':{1:'马丁'},'11A':{0:'我',3:'马丁'},'11B':{0:'我',2:'马丁'},'13':{2:'埃米尔'},
 '13B':{0:'我',2:'埃米尔'},'15A':{1:'约瑟夫',3:'约瑟夫',5:'约瑟夫',7:'我'},'15B':{2:'我'},
 '17B':{1:'我'},'19':{1:'难友'},'20B':{1:'塞缪尔',2:'塞缪尔'},
}
# Only identifying tags between halves of one utterance are elided. Actions stay.
ATTRIBUTION = re.compile(r'^(?:她说|他说|我说|他贴近我说|他忽然说|马丁捎话来|我解释|我压低声音)[，。]?$')

def sentences(words):
    pending=''
    for char in words:
        pending+=char
        if char in '。！？':
            yield pending
            pending=''
    if pending:
        yield pending

def annotate(node_id,index,text,condition=None):
    source_id=f'{node_id}:p{index}'
    speaker=SPEECH.get(node_id,{}).get(index)
    if not speaker:
        return [{'kind':'prose','text':text,'when':condition,'key':source_id}]
    quotes=list(re.finditer('“([^”]*)”',text))
    assert quotes,(node_id,index,'Speech annotation without quotation')
    if node_id=='20B':
        quotes=quotes[:1] # The later quoted correction is writing, not speech.
    events,last=[],0
    for match in quotes:
        bridge=text[last:match.start()]
        if bridge and ATTRIBUTION.fullmatch(bridge) and events and events[-1][0]=='dialogue':
            events[-1]=('dialogue',events[-1][1]+match[1])
        else:
            if bridge:events.append(('prose',bridge))
            events.append(('dialogue',match[1]))
        last=match.end()
    if text[last:]:events.append(('prose',text[last:]))
    out=[]
    for part,(kind,words) in enumerate(events):
        if kind=='dialogue':
            for number,sentence in enumerate(sentences(words)):
                out.append({'kind':kind,'speaker':speaker,'text':sentence,'when':condition,'key':f'{source_id}:{part}:{number}'})
        else:
            out.append({'kind':kind,'text':words,'when':condition,'key':f'{source_id}:{part}'})
    return out
