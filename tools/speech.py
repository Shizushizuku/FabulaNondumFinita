"""Format the new manuscript's actual quotations without rewriting their words."""
import re

SPEECH = {'00': {'进去以后，找人问问医生在哪儿，': '蒂莉'},
 '01': {'劳驾，这些纸能不能让我留着？我知道别的都得交，这': '我', '明天可能转营，': '马丁'},
 '03': {'白吓了一夜，': '马丁'},
 '04': {'听说你从前是精神科医生？': '奥托', '她姐姐一直瞧不上我。': '奥托'},
 '04A': {'我气的是她总把我当外人，懂吗？什么事都跟姐姐说。': '奥托', '我问你从前叫什么。得啦，去吧，明天还来这儿领。': '奥托', '我不能单凭这几行字，就知道她在想什么。': '我'},
 '04B': {'我怕回去就领不到汤了。您要是没别的吩咐……': '我'},
 '05': {'明早还得走呢，': '马丁'},
 '06': {'出来瞧瞧吧，西边！快些，等会儿就没了。': '难友'},
 '06A': {'我太太会说，这种颜色配窗帘准难看，': '马丁', '我刚才竟想不起，我家的窗子朝哪边了。': '我', '先看着吧，': '马丁'},
 '08': {'医生，': '我', '难怪，先生嫌我们的活脏。明天你单独干，看看你这双': '监工'},
 '08A': {'那边缺人，你站着干什么？数错了又要重新点。': '奥托'},
 '09': {'传染病区还缺一个人。没有多少药，去了主要是看着他': '莱文', '你先想想，别急着答应。我等到今晚。': '莱文'},
 '09A': {'慢点儿，我又没催您。': '我', '杯子刮嘴，您没瞧见吗？': '病人'},
 '10': {'仓房那边，晚饭以后，': '马丁'},
 '10A': {'诸位将就些吧，今天这位伴奏也没吃饱。': '塞缪尔', '您还嫌我偷懒哪？下回替我站前面试试。得啦，帮我把': '塞缪尔'},
 '11': {'咱们每天得编一件回去以后的事，': '马丁'},
 '11A': {'他那朵百合要是懂事，': '我', '行啦，再学我真忍不住。你可别当着别的人说，他认得': '马丁'},
 '11B': {'我想好了一件。回去给人做手术，助手拿来一把钳子，': '我', '那可麻烦了，钳子少一把，病人的肚子是不是也得敞着': '马丁'},
 '13': {'有人说，您把马丁逗得差点丢了桶。给我也讲讲吧，我': '埃米尔'},
 '13B': {'等你好些再说吧。你方才说你家开铺子，是卖什么的？': '我', '他要是在这儿，准会说这个听不出毛病，先得上发条。': '埃米尔'},
 '15A': {'门旁边有棵栗树。屋顶要是还在，烟囱是歪的，您从坡': '约瑟夫',
         '再添一句，我没有卖她那只表。她一直当是我卖了，我': '约瑟夫',
         '算了。您就说，我还欠她一个解释。要是您真能碰见她': '约瑟夫',
         '地址我收好了，': '我'},
 '15B': {'有件事我想了好几年，': '我'},
 '17B': {'我坐这儿，您把手也放进来，别老露在外面。': '我'},
 '19': {'去说一声，还能赶上，': '难友'},
 '20B': {'莫泽尔吧？您当时念过两遍。还有一句……他欠她一个': '塞缪尔', '您讲过车站上的谈话，开头那个例子。我当时嫌您绕得': '塞缪尔'}}

# Only identifying tags between halves of one utterance are elided. Actions stay.
ATTRIBUTION = re.compile(r'^(?:她说|他说|我说|马丁说|他贴近我说|他忽然说|马丁捎话来|我解释|我压低声音)[，。]?$')

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
    speakers=[speaker for anchor,speaker in SPEECH.get(node_id,{}).items() if any(anchor in words for words in re.findall('“([^”]*)”',text))]
    assert len(speakers)<=1,(node_id,index,'Ambiguous speaker anchors')
    speaker=speakers[0] if speakers else None
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
