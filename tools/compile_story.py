"""Compile the supplied manuscript, retaining every scene and transition paragraph."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / '生命的意义_互动文案_一万字.md'
text = SOURCE.read_text()
nodes, transitions, bulletins = {}, {}, {}
chapter = 0
target = None

for line in text.splitlines():
    if line.startswith('# 附录'):
        break
    match = re.match(r'## 第[一二三四五六七八]幕｜(.+)', line)
    if match:
        chapter += 1
        bulletins[chapter] = []
        target = None
        continue
    match = re.match(r'### ([A-Z]+\d*)｜(.+)', line)
    if match:
        key, title = match.groups()
        nodes[key] = {'id': key, 'title': title, 'chapter': chapter, 'lines': []}
        target = nodes[key]['lines']
        continue
    match = re.match(r'#### 过渡 ([A-Z]+\d*)→([A-Z]+\d*)', line)
    if match:
        key = '>'.join(match.groups())
        transitions[key] = []
        target = transitions[key]
        continue
    if target is not None:
        target.append(line)
    elif chapter and line.startswith('>'):
        bulletins[chapter].append(re.sub(r'^>\s*', '', line).replace('**', ''))

# The manuscript puts shared prose after the second condition without an explicit
# closing marker. These anchors restore the shared tail for BOTH alternatives.
common = {
    'R1': '铁丝网上挂着白霜。',
    'Q': '他还没听，已经笑得咳嗽',
    'M4': '埃利亚斯说，不会查到的。',
    'C1': '树枝终于着了。',
    'Z1': '太阳照在纸上，',
}

def paragraphs(lines, node_id=''):
    result, pending = [], []
    condition = None

    def flush():
        if pending:
            result.append({'text': '\n'.join(pending), 'when': condition})
            pending.clear()

    for line in lines:
        line = line.strip()
        if not line:
            flush()
            continue
        if node_id in common and line.startswith(common[node_id]):
            flush()
            condition = None
        match = re.match(r'\*\*如果 `([^`]+)`：\*\*', line)
        if match:
            flush()
            if '→' not in line:
                condition = match.group(1)
            continue
        if (line.startswith(('---', '`[', '> **边注', '**选项', '**否则', '- **'))
                or '→' in line):
            flush()
            continue
        pending.append(line)
    flush()
    return result

for key, node in nodes.items():
    lines = node.pop('lines')
    node['paragraphs'] = paragraphs(lines, key)
    note = re.search(r'> \*\*边注 (N\d+)\*\*', '\n'.join(lines))
    node['notes'] = [note.group(1)] if note else []
    options = re.findall(r'^- \*\*[甲乙]｜(.+?)\*\* → ([A-Z]+\d*)', '\n'.join(lines), re.M)
    node['options'] = [{'label': label, 'to': to} for label, to in options]
    node['end'] = 'death' if key.startswith('X') else 'survival' if key == 'END' else None

destinations = {'第二幕':'K', '第四幕':'D', '第五幕':'Q', '第六幕':'P', '第八幕':'R3'}
# Normal routes follow the supplied flowchart. Conditionals are resolved in core.js.
for key, node in nodes.items():
    block = re.search(r'^### '+key+r'｜[^\n]+\n(.*?)(?=^### |\Z)', text.split('# 附录')[0], re.M | re.S).group(1)
    direct = re.search(r'`\[ 继续 \]` → ([A-Z]+\d*|第[一二三四五六七八]幕)', block)
    node['next'] = destinations.get(direct.group(1), direct.group(1)) if direct else None

settings = {
    'M1':('night', ['报名','不报名']), 'K':('kurt',['听完','结束']),
    'S1':('bread',['吃光','留一块']), 'S2':('sunset',['出去','留下']),
    'D':('ward',['去','不去']), 'S3':('concert',['去听','休息']),
    'J':('poem',['改诗','手术室']), 'Q':('retell',['复述','不复述']),
    'P':('record',['寄语','手稿']), 'H':('share',['谈','不谈']),
    'C':('burn',['烧','不烧']), 'M5':('board',['争取登车','留下']),
}
for key, (flag, values) in settings.items():
    for option, value in zip(nodes[key]['options'], values):
        option['set'] = {flag: value}

scenes = {
    'train': ['A','X1','X5'],
    'barracks': ['K','K1','K2','S1','B1','B2','V2','J','J1','J2','X4','D2','S3','E1','E2'],
    'worksite': ['T','KR','X2','W','X3'],
    'ward': ['D','D1','DR','DT','Q','Q1','Q2','F','P','C','C2'],
    'sunset': ['S2','V1'],
    'paper': ['P1','P2','C1','CHECK','Z1','Z2','Z3','TASK'],
    'forest': ['R2','H','H1','H2'],
    'freedom': ['END1','END2','END'],
    'camp-cover': ['M1','B','R1','KT','L','M4','N','M5','G','R3'],
}
for art, ids in scenes.items():
    for key in ids:
        nodes[key]['art'] = art

first = ['A','K','T','D','Q','P','C','R3']
for i, key in enumerate(first, 1):
    nodes[key]['bulletin'] = '\n'.join(bulletins[i])

data = {'nodes': nodes, 'transitions': {k: paragraphs(v) for k,v in transitions.items()},
        'chapters': ['站台','面包与晚霞','棍子','病区','笑话','纸','火','之后']}
assert len(nodes) == 61, len(nodes)
for node in nodes.values():
    assert node['paragraphs'], node['id']
    assert node.get('art'), node['id']
    for option in node['options']:
        assert option['to'] in nodes
data_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
(ROOT/'js'/'story-data.js').write_text('/* Generated from the supplied manuscript by tools/compile_story.py. */\nwindow.MeaningStory = '+data_json+';\n')
print(f'Compiled {len(nodes)} nodes, {len(transitions)} transitions, {sum(len(n["paragraphs"]) for n in nodes.values())} paragraphs.')
