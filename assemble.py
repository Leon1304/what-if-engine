#!/usr/bin/env python3
# assemble.py — build a video page from template.html + your STORY and SCENE blocks, then syntax-check it
#   python3 assemble.py <slug> --title "What if …?" [--lang en] [--no-voice]   (voice-over via voice.py when tts/ exists)
#   reads <slug>.story.js and <slug>.scene.js, writes <slug>.html
#   --lang es|fr|it|pt (+ <slug>.<lang>.json with the translated texts) → <slug>.<lang>.html: captions, HUD texts and voice in that language
import base64, html, json, os, re, subprocess, sys

args = sys.argv[1:]
slug = args[0]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d

t = open('template.html', encoding='utf-8').read()
story = open(f'{slug}.story.js', encoding='utf-8').read().strip()
scene = open(f'{slug}.scene.js', encoding='utf-8').read().strip()

if re.search(r"kind:\s*'(explain|conspiracy|debunk)'", story) and re.search(r'would you have done', story, re.I):
    print('WARNING: explainer / conspiracy videos end on a fitting question, not "What would you have done?" — change END.cta / say / loop')
_d = re.search(r"\bdur:\s*([\d.]+)", story)
_long = bool(re.search(r"aspect:\s*'(16:9|landscape)'", story)) and not re.search(r"\blong:\s*false", story)   # v2.30 long videos (normal YouTube, 3–10 min): no Shorts length / loop / tease rules
if _long:
    if _d and not 120 <= float(_d.group(1)) <= 720: print(f'NOTE: long video is {float(_d.group(1)):.0f} s — the long-video format is 3–10 min')
    if not re.search(r"\bconst STEPS\b", story): print('WARNING: long video without STEPS — chapters drive the chapter cards, the HUD and the YouTube chapter list')
    if re.search(r"\bcapWords:", story): print('NOTE: CFG.capWords is ignored in long videos — subtitles use CFG.subWords (16 words, two lines)')
if not _long and re.search(r"kind:\s*'(explain|conspiracy|debunk)'", story) and _d and float(_d.group(1)) > 52:
    print(f'WARNING: explainer / conspiracy video is {float(_d.group(1)):.0f} s — target 40–50 s (max 52): 1–2 sentences per beat, exactly 3 steps of 5–6 s, GUESS or MYTH (not both), one FACTS card, end card + loop ≤ 6 s')
# v2.20 retention + sound checks (story videos: 50–56 s, short outro, loop, flash-forward; every mood / ambience must exist in the engine)
_story = not _long and not re.search(r"kind:\s*'(explain|conspiracy|debunk)'", story)
_e = re.search(r"const END\s*=\s*\{\s*t:\s*([\d.]+)", story)
if _story and _d and float(_d.group(1)) > 58:
    print(f'WARNING: story video is {float(_d.group(1)):.0f} s — target 50–56 s (max 58): cut card and intro seconds (one intro beat, end card + loop ≤ 6 s), not narration')
if not _long and _d and _e and float(_d.group(1)) - float(_e.group(1)) > 6.5:
    print(f'WARNING: end card + loop take {float(_d.group(1)) - float(_e.group(1)):.1f} s — keep them ≤ 6 s and let the scene keep moving underneath (viewers swipe on static cards)')
if re.search(r"\breview:\s*\{", story):
    print('WARNING: END.review is gone since v2.23 (no review card) — delete it; the closing line goes in END.say, the loop line in END.loop')
if not _long and not re.search(r"\bloop:\s*false", story) and not re.search(r"\bloop:\s*['\"`]", story):
    print('NOTE: no END.loop — add the loop line (≤ 8 words) that ends at the seam and leads into the first spoken line, e.g. loop: "…which is exactly why nobody should ever ask:"')
if not _long and re.search(r"\bloop:\s*false", story):
    print('NOTE: CFG.loop is off — every video should loop seamlessly back into its hook (dissolve + END.loop line)')
if _story and _d and float(_d.group(1)) >= 40 and not re.search(r"\bconst TEASE\b", story):
    print('NOTE: no TEASE flash-forward — add one 0.5–0.7 s glimpse of the climax at the mid-video dip (~40–55 % of the runtime)')
if re.search(r"prev:\s*\{[^}]*mode:\s*'card'", story):
    print("WARNING: series recap as full-screen card on frame 0 — use the default chip (mode 'chip') and open on action from this episode")
_tpl = open('template.html', encoding='utf-8').read()
_moods = set(re.findall(r"^\s{4}(\w+):\s+\{ bpm:", _tpl, re.M)); _ambs = set(re.findall(r"^\s{6}(\w+): \(a, b, v\) =>", _tpl, re.M))
_au = re.search(r"const AUDIO\s*=\s*\{(.*?)\n\};", story, re.S); _au = _au.group(1) if _au else ''
for m_ in sorted(set(re.findall(r"mood:\s*'(\w+)'", _au)) | set(re.findall(r"\[\s*[^\[\],]+,\s*'(\w+)'\s*\]", (re.search(r"score:\s*(\[\[.*?\]\])", _au, re.S) or re.search('()', '')).group(1)))):
    if _moods and m_ not in _moods: print(f"WARNING: unknown music mood '{m_}' — use one of {', '.join(sorted(_moods))} or 'none' (no music, only sounds)")
_am = re.search(r"amb:\s*(\[\[.*?\]\])", _au, re.S)
for k_ in sorted(set(re.findall(r"\[\s*[^\[\],]+,\s*[^\[\],]+,\s*'(\w+)'", _am.group(1)) if _am else [])):
    if _ambs and k_ not in _ambs: print(f"WARNING: ambience '{k_}' does not exist yet — build it in AMB (template.html, sound section) and commit it to the engine, so later videos can reuse it")
def put(t, tag, body):
    a, b = f'/* @{tag}-BEGIN */', f'/* @{tag}-END */'
    i, j = t.index(a) + len(a), t.index(b)
    return t[:i] + '\n' + body + '\n' + t[j:]

LANG = opt('lang', 'en'); OUT = slug if LANG == 'en' else f'{slug}.{LANG}'
if LANG != 'en':
    t = t.replace('/* @TR */null', json.dumps(json.load(open(f'{slug}.{LANG}.json', encoding='utf-8')), ensure_ascii=False, separators=(',', ':')), 1)
t = put(t, 'STORY', story)
t = put(t, 'SCENE', '{\n' + scene + '\n}')   # own block scope: scene names never clash with the engine
# series cast: series/<series>/cast.json → the same look for recurring characters in every episode
m = re.search(r"series:\s*\{[^}]*?name:\s*'([^']+)'", story)
if m:
    S = re.sub(r'[^a-z0-9]+', '-', m.group(1).lower()).strip('-'); here = os.path.dirname(os.path.abspath(__file__))
    for d in (os.path.join(here, '.engine', 'series', S), os.path.join(here, 'series', S)):
        f = os.path.join(d, 'cast.json')
        if os.path.exists(f):
            t = t.replace('/* @CAST */{}', '/* @CAST */' + json.dumps(json.load(open(f, encoding='utf-8')), separators=(',', ':')), 1); print('cast:', f); break
# motion-capture models: model('name') in story/scene or "model": "name" in cast.json → models/<name>.glb embedded (base64)
names = set(re.findall(r"model\(\s*'([^']+)'", story + scene)) | set(re.findall(r'"model"\s*:\s*"([^"]+)"', t))
if names:
    here = os.path.dirname(os.path.abspath(__file__)); found = {}
    for nm in sorted(names):
        for d in (os.path.join(here, 'models'), os.path.join(here, '.engine', 'models')):
            f = os.path.join(d, nm + '.glb')
            if os.path.exists(f): found[nm] = base64.b64encode(open(f, 'rb').read()).decode(); print('model:', f); break
        else: print('model missing:', nm + '.glb')
    t = t.replace('/* @MODELS */{}', '/* @MODELS */' + json.dumps(found, separators=(',', ':')), 1)
# real sound effects: sfx/<kind>.mp3 (CC0) → embedded, played for AUDIO.hits of that kind
here_ = os.path.dirname(os.path.abspath(__file__)); sfx = {}
for d in (os.path.join(here_, 'sfx'), os.path.join(here_, '.engine', 'sfx')):
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith('.mp3') and f[:-4] not in sfx: sfx[f[:-4]] = base64.b64encode(open(os.path.join(d, f), 'rb').read()).decode()
if sfx: t = t.replace('/* @SFX */{}', '/* @SFX */' + json.dumps(sfx, separators=(',', ':')), 1)
# voice-over: voice.py (cached) → embed mp3 + word timings; CFG.voice: false = no voice
if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tts', 'voices-v1.0.bin')) and '--no-voice' not in args:
    v = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voice.py'), slug] + (['--lang', LANG] if LANG != 'en' else []), capture_output=True, text=True)
    print((v.stdout or '').rstrip() or ('voice failed: ' + v.stderr[-600:]))
if os.path.exists(f'{OUT}.voice.json') and os.path.exists(f'{OUT}.voice.mp3'):
    vj = json.load(open(f'{OUT}.voice.json')); vj['mp3'] = base64.b64encode(open(f'{OUT}.voice.mp3', 'rb').read()).decode()
    t = t.replace('/* @VOICE */null', json.dumps(vj, separators=(',', ':')), 1)
title = opt('title')
if title:
    t = re.sub(r'<title>.*?</title>', lambda m: f'<title>{html.escape(title)}</title>', t, count=1, flags=re.S)
    t = re.sub(r'aria-label="[^"]*"', lambda m: f'aria-label="Animated vertical video: {html.escape(title)}"', t, count=1)
t = re.sub(r'<html lang="[^"]*">', f'<html lang="{opt("lang", "en")}">', t, count=1)
open(f'{OUT}.html', 'w', encoding='utf-8').write(t)

code = re.search(r'<script type="module">(.*?)</script>', t, re.S).group(1)
open(f'.{OUT}.check.mjs', 'w', encoding='utf-8').write(code)
r = subprocess.run(['node', '--check', f'.{OUT}.check.mjs'], capture_output=True, text=True)
print(f'wrote {OUT}.html · syntax ok' if r.returncode == 0 else 'SYNTAX ERROR\n' + r.stderr[-2000:])
sys.exit(r.returncode)
