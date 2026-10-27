"""Check web font integrity, names, embedding flags and current text coverage."""
from pathlib import Path
import hashlib,json,re
from io import BytesIO
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from build_fonts import required_characters

ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'assets/fonts';data=json.loads((base/'manifest.json').read_text())
license_bytes=(base/'OFL.txt').read_bytes()
assert 'SIL OPEN FONT LICENSE Version 1.1' in license_bytes.decode()
license_source=next(f for f in data['upstream']['files'] if f['name']=='LICENSE.txt')
assert hashlib.sha256(license_bytes).hexdigest()==license_source['sha256']
for item in data['fonts']:
    path=base/item['file'];blob=path.read_bytes();assert blob[:4]==b'wOF2'
    assert hashlib.sha256(blob).hexdigest()==item['sha256']
    font=TTFont(path,checkChecksums=2);font.ensureDecompiled()
    assert font['OS/2'].fsType==0;assert font['OS/2'].usWeightClass==item['weight']
    for key in [1,4,6,16]:assert 'Source' not in font['name'].getDebugName(key)
    assert 'Adobe' in font['name'].getDebugName(0)
    assert 'Open Font License' in font['name'].getDebugName(13)
    cmap=font.getBestCmap();assert set(cmap)==set(item['unicode'])
    missing=required_characters()-set(cmap) if item['weight']==400 else {ord(c) for c in '始终'}-set(cmap)
    assert missing=={int(c['codepoint'],16) for c in item['fallbackCharacters']}
    assert not [c for c in missing if 0x3400<=c<=0x9fff]
    glyphs=font.getGlyphSet()
    for char in [c for c in cmap if 0x3400<=c<=0x9fff]:
        assert cmap[char]!='.notdef';pen=BoundsPen(glyphs);glyphs[cmap[char]].draw(pen);assert pen.bounds,hex(char)
    # A complete decompression round-trip verifies the WOFF2 payload.
    font.flavor=None;decoded=BytesIO();font.save(decoded);TTFont(BytesIO(decoded.getvalue())).ensureDecompiled()
    print(item['file']+': valid WOFF2, '+str(len(cmap))+' characters, embedding flags clear, renamed OFL derivative')
css=(ROOT/'styles/fonts.css').read_text();html=(ROOT/'index.html').read_text()
for item in data['fonts']:
    assert item['file'] in css and item['file'] in html
assert html.index('styles/fonts.css')>html.index('styles/player.css')
print('Current Chinese text coverage, local CSS/preload references and original license hash passed.')
