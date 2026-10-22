#!/usr/bin/env python3
"""Optional: bundle index.html + src/ into ONE self-contained file (bundle.html), e.g. to email it or open via file://.
Usage: python3 src/build.py [out.html]"""
import base64, os, re, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rd = lambda f: open(os.path.join(root, f), encoding='utf-8').read()
h = rd('index.html')
h = re.sub(r'<link rel="stylesheet" href="(src/[^"]+)">', lambda m: '<style>\n' + rd(m[1]) + '</style>', h)
sim = '<script>window.__SIMCORE = String.raw`' + rd('src/simcore.py') + '`;</script>\n'
h = re.sub(r'<script src="(src/[^"]+)"></script>', lambda m: ('' if 'missions' not in m[1] else sim) + '<script>\n' + rd(m[1]) + '</script>', h)
h = re.sub(r'"(src/logo[^"]*\.png)"', lambda m: '"data:image/png;base64,' + base64.b64encode(open(os.path.join(root, m[1]), 'rb').read()).decode() + '"' if os.path.exists(os.path.join(root, m[1])) else m[0], h)
h = re.sub(r'"(src/robot\.jpg)"', lambda m: '"data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(root, m[1]), 'rb').read()).decode() + '"', h)
h = re.sub(r'"(src/maps/[^"]+\.jpg)"', lambda m: '"data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(root, m[1]), 'rb').read()).decode() + '"', h)
open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'bundle.html'), 'w', encoding='utf-8').write(h)
