"""Subset official OFL fonts, rename derivatives, and write portable web fonts.

Usage: python3 tools/build_fonts.py --source-dir /path/to/official-fonts
Requires fonttools[woff]. The input directory must also contain LICENSE.txt and
upstream.json with the original download URLs and SHA-256 hashes.
"""
from pathlib import Path
import argparse,hashlib,json
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/fonts'

def required_characters():
    paths=[ROOT/'index.html',*sorted((ROOT/'content').glob('*.md')),*sorted((ROOT/'js').glob('*.js'))]
    text=''.join(p.read_text() for p in paths)
    return set(range(32,127))|{ord(c) for c in text if ord(c)>=160}

def rename(font,family,style,postscript):
    names={1:family,2:style,3:postscript+'-WebSubset-1',4:family+' '+style,6:postscript,
           16:family,17:style,18:family+' '+style,21:family,22:style}
    table=font['name']
    table.names=[n for n in table.names if n.nameID not in names]
    for key,value in names.items():
        table.setName(value,key,3,1,0x409)
    if 'CFF ' in font:
        cff=font['CFF '].cff;cff.fontNames=[postscript]
        top=cff.topDictIndex[0];top.FullName=family+' '+style;top.FamilyName=family
        for i,fd in enumerate(getattr(top,'FDArray',[])):
            if hasattr(fd,'FontName'):fd.FontName=postscript+'-FD'+str(i)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args()
    upstream=json.loads((args.source_dir/'upstream.json').read_text())
    for entry in upstream['files']:
        assert hashlib.sha256((args.source_dir/entry['name']).read_bytes()).hexdigest()==entry['sha256'],entry['name']
    OUT.mkdir(exist_ok=True)
    (OUT/'OFL.txt').write_bytes((args.source_dir/'LICENSE.txt').read_bytes())
    regular=required_characters();manifest={'upstream':upstream,'license':'OFL.txt','fonts':[]}
    for weight,style,family,ps,filename,characters in [
        (400,'Regular','Tomorrow Songti','TomorrowSongti-Regular','tomorrow-songti.woff2',regular),
        (900,'Heavy','Tomorrow Mincho Title','TomorrowMinchoTitle-Heavy','tomorrow-mincho-title.woff2',{ord(c) for c in '始终'})
    ]:
        source_name='SourceHanSerifSC-'+style+'.otf';font=TTFont(args.source_dir/source_name,recalcTimestamp=False)
        cmap=font.getBestCmap();supported=characters&set(cmap);missing=sorted(characters-set(cmap))
        # Icons may fall back to system fonts; all Chinese characters must be covered.
        assert not [n for n in missing if 0x3400<=n<=0x9fff],missing
        options=subset.Options();options.name_IDs=['*'];options.name_languages=['*'];options.name_legacy=True
        options.notdef_outline=True;options.recommended_glyphs=True
        worker=subset.Subsetter(options=options);worker.populate(unicodes=supported);worker.subset(font)
        rename(font,family,style,ps)
        font.flavor='woff2';path=OUT/filename;font.save(path)
        actual=sorted(TTFont(path).getBestCmap())
        manifest['fonts'].append({'file':filename,'family':family,'weight':weight,'source':source_name,
            'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'unicodeCount':len(actual),'unicode':actual,'fallbackCharacters':[{ 'codepoint':hex(n),'character':chr(n)} for n in missing]})
        print(filename,path.stat().st_size,'bytes;',len(supported),'characters; fallbacks:',[chr(n) for n in missing])
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
