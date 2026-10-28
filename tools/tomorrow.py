"""Compile only 《留待明日》 and its production notes into the static game."""
from pathlib import Path
import hashlib
import json
import re
from speech import annotate, SPEECH

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'content/游戏文案_留待明日.md'
GUIDE=ROOT/'content/制作说明与参考.md'
source=SOURCE.read_text()
guide=GUIDE.read_text()
nodes={}
node=None
for line in source.splitlines():
    match=re.match(r'^#{2,3} (\d{2}[ABC]?)｜([^〔]+)〔([^〕]+)〕$',line)
    if match:
        key,title,reference=match.groups()
        assert key not in nodes,key
        node={'id':key,'title':title,'reference':reference,'lines':[],'options':[],'routes':[],'notes':[]}
        nodes[key]=node
    elif node is not None:
        node['lines'].append(line)

CONDITIONS={
 '若留过面包':{'bread':True},'若已吃完面包':{'bread':False},
 '若编过情诗笑话但未复述':{'joke':'poem','retold':False},'若编的是手术室笑话':{'joke':'surgery'},
 '若听过演出':{'concert':True},'若没有听过演出':{'concert':False},
 '若记录的是寄语':{'record':'letter'},'若记录的是手稿':{'record':'manuscript'},
 '若是寄语':{'record':'letter'},'若是手稿':{'record':'manuscript'},
 '若保留纸片或曾经分享':{'any':[{'paper':True},{'shared':True}]},
 '若纸毁且未分享':{'paper':False,'shared':False},
 '若纸片仍在':{'paper':True},'若纸毁但曾分享':{'paper':False,'shared':True},
}
flags={
 '01':(None,[None,None]),'04':('otto',[True,False]),'05':('bread',[False,True]),
 '06':('sunset',[True,False]),'09':('ward',[True,False]),'10':('concert',[True,False]),
 '11':('joke',['poem','surgery']),'13':('retold',[True,False]),
 '15':('record',['letter','manuscript']),'16':('shared',[True,False]),
 '17':('paper',[False,True]),'19':(None,[None,None]),
}
automatic={
 '08':[({'otto':True},'08A'),(None,'08B')],
 '12':[({'ward':True},'12A'),(None,'12B')],
 '14':[({'joke':'poem','retold':True},'14A'),(None,'14B')],
 '20':[({'paper':True},'20A'),({'shared':True},'20B'),(None,'20C')],
 '21':[({'record':'letter'},'21A'),(None,'21B')],
}
chapter_names=['到站','面包与西边','沟里的石头','仓房与病区','转述与查问','半截铅笔','引火与车队','要办的事']
def chapter(key):
    n=int(key[:2])
    return 1 if n<=3 else 2 if n<=7 else 3 if n==8 else 4 if n<=12 else 5 if n<=14 else 6 if n<=16 else 7 if n<=19 else 8

art={
 'train':['00','19A'],
 'camp-cover':['01','03','07','08A','14','16','16A','16B','18','19','19B'],
 'worksite':['02','08','08B','09B','12','12B','14A'],
 'barracks':['04','04A','04B','05','05A','05B','06','06B','10','10A','10B','11','11A','11B'],
 'sunset':['06A'],
 'ward':['09','09A','12A','13','13A','13B','14B','15A','17','17B'],
 'paper':['15','15B','17A','20A','20B','20C'],
 'freedom':['20','21','21A','21B','22'],
}
art_by_id={key:image for image,ids in art.items() for key in ids}
coverage=[]
for key,node in nodes.items():
    raw='\n'.join(node.pop('lines'))
    paragraphs=[p.strip() for p in re.split(r'\n\s*\n',raw) if p.strip()]
    node['chapter']=chapter(key)
    node['art']=art_by_id[key]
    node['paragraphs']=[]
    node['end']='death' if '死亡支线' in node.pop('reference') else 'survival' if key=='22' else None
    active_art=None
    active_music=None
    for i,block in enumerate(paragraphs):
        cue=re.fullmatch(r'〔配乐：([a-z0-9-]+)〕',block)
        if cue:
            active_music=cue[1]
            assert active_music in {'opening','ending','sunset','snow','tension','calm1','calm2','calm3'},(key,active_music)
            continue
        cause=re.fullmatch(r'〔死因：(.+)〕',block)
        if cause:
            assert node['end']=='death' and 'deathCause' not in node,(key,'Unexpected death cause')
            node['deathCause']=cause[1]
            continue
        picture=re.fullmatch(r'〔画面：([a-z0-9-]+)〕',block)
        if picture:
            active_art=picture[1]
            assert (ROOT/'assets'/(active_art+'.png')).is_file(),(key,active_art)
            continue
        options=re.findall(r'^- \*\*(.+)\*\* → (\d{2}[ABC]?)$',block,re.M)
        if options:
            node['options'].extend({'label':label,'to':target} for label,target in options)
            continue
        if block=='**选择：**':continue
        if block.startswith('〔播放 '):
            node['paragraphs'].append({'kind':'replay','key':key+':replay'})
            continue
        condition=None
        match=re.match(r'^〔([^〕]+)：〕(.+)$',block,re.S)
        if match:
            label,block=match.groups()
            assert label in CONDITIONS,(key,label)
            condition=CONDITIONS[label]
        elif block.startswith(('〔','→')):
            if re.search(r'→ (\d{2}[ABC]?)$',block):node['next']=re.search(r'→ (\d{2}[ABC]?)$',block)[1]
            continue
        coverage.append({'node':key,'paragraph':i,'text':block})
        if block.startswith('**') and block.endswith('**'):
            node['paragraphs'].append({'kind':'caption','text':block[2:-2],'key':f'{key}:p{i}',**({'music':active_music} if active_music else {})})
        else:
            node['paragraphs'].extend(dict(p,**({'art':active_art} if active_art else {}),**({'music':active_music} if active_music else {})) for p in annotate(key,i,block,condition))
    if key in automatic:node['routes']=[{'when':when,'to':to} for when,to in automatic[key]]
    if key in flags:
        flag,values=flags[key]
        assert len(node['options'])==2,key
        for option,value in zip(node['options'],values):
            if flag:option['set']={flag:value}
    for anchor in SPEECH.get(key,{}):
        assert sum(anchor in quote for quote in re.findall('“([^”]*)”',raw))==1,(key,anchor)
    if node['end']=='death':assert node.get('deathCause'),(key,'Missing death cause')

jokes={}
for kind,node_id,indices in [('poem','11A',[0]),('surgery','11B',[0,2])]:
    jokes[kind]=[dict(p,speaker='我',key='replay:'+p['key']) for p in nodes[node_id]['paragraphs']
                 if p['kind']=='dialogue' and int(p['key'].split(':p')[1].split(':')[0]) in indices]

note_text={m[1]:m[2].strip() for m in re.finditer(r'^\| (N\d+) \| [^|]+ \| ([^|]+) \|$',guide,re.M)}
assert len(note_text)==12,len(note_text)
achievement_nodes=['01','06A','09A','10A','11','14','15A','15B','17','19','20B','22']
for number,key in enumerate(achievement_nodes):nodes[key]['notes'].append('N'+str(number))
achievement_names=['衣服堆旁','西边','靠门的床','仓房里的歌','轮到谁来编','转述与查问','栗树旁边','第三章','引火','最后一批车','两个人补记','要办的事']
rows=[['00'],['01'],['02','03'],['04'],['04A','04B'],['05'],['05A','05B'],['06'],['06A','06B'],['07'],
 ['08'],['08B','08A'],['09'],['09A','09B'],['10'],['10A','10B'],['11'],['11A','11B'],['12'],['12B','12A'],
 ['13'],['13A','13B'],['14'],['14A','14B'],['15'],['15A','15B'],['16'],['16A','16B'],['17'],['17A','17B'],
 ['18'],['19'],['19A','19B'],['20'],['20A','20B','20C'],['21'],['21A','21B'],['22']]
assert {key for row in rows for key in row}==set(nodes)
edges=[]
for key,node in nodes.items():
    destinations=[o['to'] for o in node['options']]+[r['to'] for r in node['routes']]
    if node.get('next'):destinations.append(node['next'])
    for target in dict.fromkeys(destinations):
        assert target in nodes,(key,target)
        edges.append([key,target])
    assert node['end'] or destinations,key
    if not node['paragraphs']:assert node['routes'],key
    assert (ROOT/'assets'/(node['art']+'.png')).is_file(),key

reflection=re.split(r'\n\s*\n',(ROOT/'content/结语.md').read_text().strip())
finale=re.split(r'\n\s*\n',(ROOT/'content/结语_尾声.md').read_text().strip())
data={
 'id':'tomorrow-20261027','title':'留待明日','protagonist':'维克多·弗兰克尔','start':'00','readingVersion':6,
 'source':{'file':'content/游戏文案_留待明日.md','sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()},
 'conclusion':reflection+finale,'conclusionFinaleAt':len(reflection),
 'introduction':re.split(r'\n\s*\n',(ROOT/'content/开场白.md').read_text().strip()),
 'chapters':chapter_names,'nodes':nodes,'jokes':jokes,'coverage':coverage,
 'endings':{'death':{'title':'死亡','text':'本次故事结束。'},'survival':{'title':'留待明日','text':'全文完。'}},
 'map':{'nodes':[{'id':n['id'],'title':n['title'],'chapter':n['chapter']} for n in nodes.values()],
 'notes':note_text,'edges':edges,'rows':rows,'achievementNames':achievement_names,
 'triggers':{key:n['notes'] for key,n in nodes.items() if n['notes']},
 'delayed':[['04','08'],['05','07'],['09','12'],['10','16'],['11','14'],['13','14'],['15','21'],['16','20'],['17','20']]},
}
(ROOT/'js/story-data.js').write_text('/* Compiled exclusively from content/游戏文案_留待明日.md. */\nwindow.MeaningStory = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'Compiled {len(nodes)} scenes, {len(coverage)} manuscript blocks, {sum(p["kind"]=="dialogue" for n in nodes.values() for p in n["paragraphs"])} spoken sentences.')
