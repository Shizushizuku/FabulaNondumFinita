# Local fonts

Both web fonts are derivatives of Adobe's Source Han Serif SC, Version 2.003,
licensed under the SIL Open Font License 1.1. The complete original copyright and
license are included in OFL.txt; the font binaries retain their copyright and
license metadata. These files may be bundled with this website and served by
GitHub Pages under that license.

- `tomorrow-songti.woff2`: Regular (400), used for Chinese reading text. Contains
  the characters currently used by the project, plus printable ASCII.
- `tomorrow-mincho-title.woff2`: Heavy (900), contains 始 and 终 for the two title
  cards. Its heavy Mincho strokes and condensed styling evoke an EVA-like title
  treatment; this is not an official EVA font or an original EVA asset.

The subset derivatives have been renamed **Tomorrow Songti** and **Tomorrow
Mincho Title**, including their internal family and PostScript names, to respect
the upstream Reserved Font Name “Source”. Both derivatives remain under OFL 1.1.

Official source: https://github.com/adobe-fonts/source-han-serif/tree/release/OTF/SimplifiedChinese

Official license: https://github.com/adobe-fonts/source-han-serif/blob/release/LICENSE.txt

`manifest.json` records upstream download URLs, original SHA-256 hashes, output
hashes, glyph coverage and any system-font fallback symbols. Full original OTFs
are build inputs only and are not needed to run the website.

For a changed manuscript, rebuild after installing `fonttools[woff]`:

```sh
python3 tools/build_fonts.py --source-dir /path/to/official-font-inputs
python3 tools/verify_fonts.py
```

The input directory must contain the two official OTFs, LICENSE.txt and an
upstream.json matching the `upstream` record in manifest.json. Download each
upstream file from its recorded official URL and verify its recorded hash before
building. The build does not download or install fonts on the user's device.
