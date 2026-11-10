#!/usr/bin/env python3
# assemble.py — build a video page from template.html + your STORY and SCENE blocks, then syntax-check it
#   python3 assemble.py <slug> --title "What if …?" [--lang en] [--no-voice]   (voice-over via voice.py when tts/ exists)
#   reads <slug>.story.js and <slug>.scene.js, writes <slug>.html
import base64, html, json, os, re, subprocess, sys

args = sys.argv[1:]
slug = args[0]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d

t = open('template.html', encoding='utf-8').read()
story = open(f'{slug}.story.js', encoding='utf-8').read().strip()
scene = open(f'{slug}.scene.js', encoding='utf-8').read().strip()

def put(t, tag, body):
    a, b = f'/* @{tag}-BEGIN */', f'/* @{tag}-END */'
    i, j = t.index(a) + len(a), t.index(b)
    return t[:i] + '\n' + body + '\n' + t[j:]

t = put(t, 'STORY', story)
t = put(t, 'SCENE', '{\n' + scene + '\n}')   # own block scope: scene names never clash with the engine
# voice-over: voice.py (cached) → embed mp3 + word timings; CFG.voice: false = no voice
if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tts', 'voices-v1.0.bin')) and '--no-voice' not in args:
    v = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice.py'), slug], capture_output=True, text=True)
    print((v.stdout or '').rstrip() or ('voice failed: ' + v.stderr[-600:]))
if os.path.exists(f'{slug}.voice.json') and os.path.exists(f'{slug}.voice.mp3'):
    vj = json.load(open(f'{slug}.voice.json')); vj['mp3'] = base64.b64encode(open(f'{slug}.voice.mp3', 'rb').read()).decode()
    t = t.replace('/* @VOICE */null', json.dumps(vj, separators=(',', ':')), 1)
title = opt('title')
if title:
    t = re.sub(r'<title>.*?</title>', lambda m: f'<title>{html.escape(title)}</title>', t, count=1, flags=re.S)
    t = re.sub(r'aria-label="[^"]*"', lambda m: f'aria-label="Animated vertical video: {html.escape(title)}"', t, count=1)
t = re.sub(r'<html lang="[^"]*">', f'<html lang="{opt("lang", "en")}">', t, count=1)
open(f'{slug}.html', 'w', encoding='utf-8').write(t)

code = re.search(r'<script type="module">(.*?)</script>', t, re.S).group(1)
open(f'.{slug}.check.mjs', 'w', encoding='utf-8').write(code)
r = subprocess.run(['node', '--check', f'.{slug}.check.mjs'], capture_output=True, text=True)
print(f'wrote {slug}.html · syntax ok' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr[-2000:])
sys.exit(r.returncode)
