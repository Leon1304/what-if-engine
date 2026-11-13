#!/usr/bin/env python3
# Rebuild an assembled page with a newer template.html (story, scene, voice, sfx, cast, models kept).  reengine.py old.html template.html out.html
import sys, re
old, tpl, out = sys.argv[1:4]
s = open(old, encoding='utf-8').read(); t = open(tpl, encoding='utf-8').read()
def block(x, tag):
    a, b = f'/* @{tag}-BEGIN */', f'/* @{tag}-END */'; return x[x.index(a) + len(a):x.index(b)]
def put(x, tag, body):
    a, b = f'/* @{tag}-BEGIN */', f'/* @{tag}-END */'; i, j = x.index(a) + len(a), x.index(b); return x[:i] + body + x[j:]
t = put(t, 'STORY', block(s, 'STORY')); t = put(t, 'SCENE', block(s, 'SCENE'))
for name in ['VOICE', 'SFXS', 'CAST', 'MODELS', 'TR']:
    m = re.search(r'^const ' + name + r' = .*$', s, re.M); n = re.search(r'^const ' + name + r' = .*$', t, re.M)
    if m and n: t = t[:n.start()] + m.group(0) + t[n.end():]
m = re.search(r'/\* @MOCAP \*/(.*?), _mcD = new Map', s, re.S)   # v3.24: keep the embedded mocap clips (they were dropped → figures fell back to procedural walks)
if m and '/* @MOCAP */null, _mcD = new Map' in t: t = t.replace('/* @MOCAP */null, _mcD = new Map', '/* @MOCAP */' + m.group(1) + ', _mcD = new Map', 1)
for pat in [r'<title>.*?</title>', r'aria-label="[^"]*"']:
    m = re.search(pat, s, re.S)
    if m: t = re.sub(pat, lambda _: m.group(0), t, count=1, flags=re.S)
open(out, 'w', encoding='utf-8').write(t); print('wrote', out, len(t))
