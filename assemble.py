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

if re.search(r'\bconst\s+GUESS\b', story) and not re.search(r'questionCards:\s*true|card:\s*true', story):
    print('NOTE: GUESS shows no card any more (v2.39) — ask the question in a beat (the narrator says it, e.g. "Quick guess: lava, the Sun, or five times hotter?") and give the answer in the last beat before the end card; delete GUESS')
if re.search(r'\bconst\s+MYTH\b', story) and not re.search(r'questionCards:\s*true|card:\s*true', story):
    print('NOTE: MYTH shows no claim card any more (v2.39) — the narrator states the claim in a beat right after the hook; only the verdict stamp appears, right before the end card (verdictAt), together with the spoken verdict in the last beat')
def _block(name):   # source text of `const NAME = [ … ];` in the story
    m = re.search(r'\bconst\s+' + name + r'\s*=\s*\[', story)
    if not m: return ''
    d, i = 0, m.end() - 1
    for j in range(i, len(story)):
        c = story[j]
        if c == '[': d += 1
        elif c == ']':
            d -= 1
            if d == 0: return story[i:j + 1]
    return story[i:]
def _strs(src, key):   # values of key: '…' | "…" | `…`
    return [m.group(2) for m in re.finditer(key + r"""\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1""", src, re.S)]
_num = lambda s: len(re.findall(r'(?<![A-Za-z#])\d[\d.,]*', re.sub(r'\bb\d+\b', '', s)))
if re.search(r"kind:\s*'(explain|conspiracy|debunk)'", re.sub(r'//[^\n]*', '', story)) and not re.search(r"numbers:\s*'all'", story):
    # v2.37: explainer / conspiracy videos show few numbers — count what the viewer would have to read
    _cap = sum(_num(s) for s in _strs(_block('BEATS'), 'text'))
    _st = _block('STATS'); _cnt = len(re.findall(r'\blabel\s*:', _st)) - len(re.findall(r"type:\s*'(?:meter|timeline|stars)'", _st)) - len(re.findall(r'\bnum:\s*false', _st))
    _co = len(re.findall(r'\bvalue\s*:', _block('CALLOUTS'))) + len(re.findall(r'callout\([^;]*\bvalue\s*:', scene)) + len(re.findall(r'\bconst\s+RULER\b', story))
    _co += sum(_num(s) for s in _strs(_block('CALLOUTS'), 'text') + _strs(_block('CALLOUTS'), 'sub')) + sum(_num(s) for ln in scene.split('\n') if 'callout(' in ln for s in _strs(ln, 'text'))
    _cards = len(_strs(_block('FACTS'), 'big')) + sum(_num(s) for s in _strs(_block('GUESS'), 'text') + _strs(_block('MYTH'), 'text') + _strs(_block('FACTS'), 'text'))
    _tot = _cap + _co + _cards
    print(f'numbers on screen: {_tot} (captions {_cap} · callouts/ruler {_co} · cards {_cards}) + {max(0, _cnt)} counter(s)')
    if _tot > 4 or _cnt > 1:
        print(f"WARNING: too many numbers for an explainer / conspiracy video — budget: 4 on screen in the whole video (one of them the FACTS card) and at most 1 counter. Keep a number only where the viewer needs it to follow or to be amazed; say the rest in words (\"hotter than the Sun's surface\", \"in under a second\") or leave it out. Counters only when a quantity is the story (height, speed, temperature).")
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
# v2.29 gore (YouTube / Instagram): gore stays a short punchline — no gore words on screen or in the thumbnail, at most 3 cuts, only after 15 s (checked at render: info().gore)
_cuts = len(re.findall(r"\bdismember\s*\(|\.lose\s*\(|\bsever\s*:", scene))
if _cuts or re.search(r"\b(bleed|ouch)\s*\(", scene):
    _txt = ' '.join(m_[1] for m_ in re.findall(r"\b(?:text|say|q|kick|label|sub|loop|cta)\s*:\s*(['\"`])(.*?)\1", story)) + ' ' + (opt('title') or '')
    _bad = sorted(set(w_.lower() for w_ in re.findall(r"\b(gore|gory|blood\w*|bleed\w*|bled|brutal\w*|dismember\w*|sever(?:ed|s)?|decapitat\w*|behead\w*|mutilat\w*|guts|dead body|corpse\w*)\b", _txt, re.I)))
    if _bad: print(f"WARNING: gore words in captions / voice / title / thumbnail ({', '.join(_bad)}) — say it dryly without them (\"He didn't need that arm anyway.\"), YouTube and Instagram read the words too")
    if _cuts > 3: print(f"WARNING: {_cuts} severed parts — keep it to 1–3 moments per video (gore as a punchline, not the topic)")
    if not re.search(r"gore:\s*'", story): print("NOTE: CFG.gore not set — zombie fluid is green goo ('goo'); set gore: 'blood' for dark cartoon blood or 'off'")
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
_code = re.sub(r'(?m)^\s*//.*$|\s//\s.*$', '', story + scene)   # names in comments don't count
names = set(re.findall(r"model\(\s*'([^']+)'", _code)) | set(re.findall(r'"model"\s*:\s*"([^"]+)"', t))
# asset library (assets/<pack>/<name>.glb): asset(p, 'pack/name', …) and model('pack/name')
names |= set(re.findall(r"asset\(\s*[^,()]*,\s*'([^']+/[^']+)'", _code))
# names built in lists ([x, z, 'nature/rock_2']) — any 'pack/name' string with a file in assets/ is embedded too
_here = os.path.dirname(os.path.abspath(__file__))
names |= {n for n in re.findall(r"['\"]([a-z0-9_]+/[a-z0-9_]+)['\"]", _code) if any(os.path.exists(os.path.join(_here, d, 'assets', n + '.glb')) for d in ('', '.engine'))}
# human({ sex: 'f' }) → human_f.glb, every other human() call → human_m.glb (only the bodies a video uses get embedded)
_calls, _fem = len(re.findall(r'\bhuman\(', _code)), len(re.findall(r"""\bsex:\s*['"]f""", _code))
if _fem: names.add('human_f')
if _calls > _fem: names.add('human_m')
if names:
    here = os.path.dirname(os.path.abspath(__file__)); found = {}
    for nm in sorted(names):
        for d in (os.path.join(here, 'models'), os.path.join(here, '.engine', 'models'), os.path.join(here, 'assets'), os.path.join(here, '.engine', 'assets')):
            f = os.path.join(d, nm + '.glb')
            if os.path.exists(f): found[nm] = base64.b64encode(open(f, 'rb').read()).decode(); print('model:', f); break
        else: print('model missing:', nm + '.glb')
    t = t.replace('/* @MODELS */{}', '/* @MODELS */' + json.dumps(found, separators=(',', ':')), 1)
# v3.6 mocap on figure(): anim(f, …) / figure({ mocap: true }) / CFG.mocap → the named clips of models/mocap.json (+ the gait clips with mocap: true)
if re.search(r'\banim\(|\bmocap\s*:', _code):
    for d in (os.path.join(_here, 'models'), os.path.join(_here, '.engine', 'models')):
        f = os.path.join(d, 'mocap.json')
        if os.path.exists(f):
            M = json.load(open(f, encoding='utf-8')); al = M.get('alias', {}); want = set()
            for q in re.findall(r"['\"]([A-Za-z0-9_]+)['\"]", _code):
                if q in M['clips']: want.add(q)
                elif q in al and re.search(r"\banim\(", _code): want.add(al[q])
            if re.search(r'\bmocap\s*:\s*true', _code): want |= {'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Crouch_Fwd_Loop', 'Zombie_Walk_Fwd_Loop', 'Zombie_Idle_Loop'}
            if want:
                M['clips'] = {k: v for k, v in M['clips'].items() if k in want}
                t = t.replace('/* @MOCAP */null', '/* @MOCAP */' + json.dumps(M, separators=(',', ':')), 1); print('mocap clips:', ', '.join(sorted(want)))
            break
# real sound effects: sfx/<kind>.mp3 (CC0) → embedded, played for AUDIO.hits of that kind
here_ = os.path.dirname(os.path.abspath(__file__)); sfx = {}
for d in (os.path.join(here_, 'sfx'), os.path.join(here_, '.engine', 'sfx')):
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith('.mp3') and f[:-4] not in sfx: sfx[f[:-4]] = base64.b64encode(open(os.path.join(d, f), 'rb').read()).decode()
if sfx: t = t.replace('/* @SFX */{}', '/* @SFX */' + json.dumps(sfx, separators=(',', ':')), 1)
# voice-over: voice.py (cached) → embed mp3 + word timings; CFG.voice: false = no voice
if (os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tts', 'voices-v1.0.bin')) or os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('XI_API_KEY')) and '--no-voice' not in args:
    # v2.38: the narrator reacts to the scene — ask the built page what happens when (loud hits, shakes, music mood, counters that jump);
    # cached per story + scene; if the page cannot be probed, voice.py falls back to what the story file itself lists
    import hashlib
    _hd = os.path.dirname(os.path.abspath(__file__)); _eh = hashlib.md5((story + scene).encode()).hexdigest()[:12]; _ef = f'{OUT}.events.json'
    try: _have = json.load(open(_ef)).get('hash') == _eh
    except Exception: _have = False
    if not _have and '--no-probe' not in args and not re.search(r"voice:\s*(false|\{[^}]*auto:\s*false)", story):
        _pf = f'{OUT}.probe.html'; open(_pf, 'w', encoding='utf-8').write(t)
        try:
            _r = subprocess.run(['node', os.path.join(_hd, 'render.mjs'), _pf, '--probe', 'whatif.events()'], capture_output=True, text=True, timeout=240)
            _ev = json.loads(_r.stdout[_r.stdout.index('{'):_r.stdout.rindex('}') + 1]); _ev['hash'] = _eh; json.dump(_ev, open(_ef, 'w'))
            print(f"scene events for the voice: {len(_ev.get('hits', []))} sounds · {len(_ev.get('shakes', []))} shakes · {len(_ev.get('stats', []))} counter jumps")
        except Exception as e: print('NOTE: could not read the scene events (voice reacts to the story file only):', str(e)[:120])
        finally:
            if os.path.exists(_pf): os.remove(_pf)
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
