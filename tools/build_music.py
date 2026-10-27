"""Create small AAC web copies from the user's FLAC files; preserve originals."""
from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/musics';OUT=BASE/'web';OUT.mkdir(exist_ok=True)
TRACKS={
 'opening':('005','opening','开场白'), 'ending':('007','ending','结语'),
 'sunset':('003','sunset','晚霞'), 'snow':('018','snow','雪地与寒冷劳役'),
 'tension':('041','tension','紧张、追查与濒死'),
 'calm1':('056','calm-one','较放松的日常'), 'calm2':('008','calm-two','倾听、病区与获释'),
 'calm3':('023','calm-three','主页、演出、笑话与写作')
}
SCENES={
 'tension':['00','01','02','04','04B','08','08B','12B','14','14A','18','19','19A'],
 'calm1':['03','04A','05','05A','05B','06','06B','08A','10','10B','14B'],
 'snow':['07','09B','12','16','17B'],
 'calm2':['09','09A','12A','13','13B','15','15A','16A','16B','17','17A','19B','20','20A','20B','20C','21','21A'],
 'calm3':['10A','11','11A','11B','13A','15B','21B','22'], 'sunset':['06A']
}
def flac_duration(path):
 data=path.read_bytes();assert data[:4]==b'fLaC'
 position=4
 while position<len(data):
  kind=data[position]&127;length=int.from_bytes(data[position+1:position+4],'big');block=data[position+4:position+4+length]
  if kind==0:
   value=int.from_bytes(block[10:18],'big');rate=value>>44;return (value&((1<<36)-1))/rate
  position+=4+length
 raise ValueError('Missing FLAC stream metadata')
tracks={}
for key,(number,slug,description) in TRACKS.items():
 sources=list(BASE.glob(number+'*.flac'));assert len(sources)==1,(key,sources)
 source=sources[0];target=OUT/(number+'-'+slug+'.m4a')
 subprocess.run(['/usr/bin/afconvert',str(source),str(target),'-f','m4af','-d','aac','-b','160000'],check=True,capture_output=True)
 info=subprocess.run(['/usr/bin/afinfo',str(target)],check=True,capture_output=True,text=True).stdout
 assert 'aac' in info.lower(),target
 tracks[key]={'file':str(target.relative_to(ROOT)),'source':str(source.relative_to(ROOT)),
  'description':description,'duration':round(flac_duration(source),3),'bytes':target.stat().st_size,
  'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
 print(key,tracks[key]['duration'],'seconds,',target.stat().st_size,'bytes')
scenes={scene:key for key,ids in SCENES.items() for scene in ids};assert len(scenes)==sum(map(len,SCENES.values()))==56
manifest={'format':'audio/mp4; codecs="mp4a.40.2"','fadeMs':1600,'tracks':tracks,'scenes':scenes,'menu':'calm3'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
runtime={**manifest,'tracks':{key:{'file':value['file'],'duration':value['duration']} for key,value in tracks.items()}}
(ROOT/'js/music-data.js').write_text('/* Generated from the music filenames and scene mapping by tools/build_music.py. */\nwindow.MeaningMusicData = '+json.dumps(runtime,ensure_ascii=False,separators=(',',':'))+';\n')
