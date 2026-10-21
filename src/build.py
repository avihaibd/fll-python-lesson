#!/usr/bin/env python3
"""Build index.html from src/: python3 src/build.py  (run from anywhere)"""
import base64, os, re
d = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(d, f), encoding='utf-8').read()
app = (rd('app.js').replace('/*@@MISSIONS@@*/', rd('missions.js'))
       .replace('@@SIMCORE@@', rd('simcore.py'))
       .replace('@@SEASONMAP@@', base64.b64encode(open(os.path.join(d, 'seasonmap.jpg'), 'rb').read()).decode()))
page = rd('page.html').replace('/*@@CSS@@*/', rd('style.css')).replace('/*@@APP@@*/', app)
i = page.index('</style>') + 8
html = ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        + page[:i].replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
        + '\n</head>\n<body>\n' + page[i:] + '\n</body>\n</html>\n')
open(os.path.join(d, '..', 'index.html'), 'w', encoding='utf-8').write(html)
if os.environ.get('FRAGMENT'):  # artifact variant (no doctype)
    open(os.environ['FRAGMENT'], 'w', encoding='utf-8').write(page)
