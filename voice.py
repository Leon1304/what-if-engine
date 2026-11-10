#!/usr/bin/env python3
# voice.py — offline voice-over (Kokoro TTS) for a video: one spoken line per caption beat + the end-card question
#   python3 voice.py <slug> [--voice deep|deep-uk|narrator|<kokoro voice>] [--speed 1.06] [--pitch -1.1]   CFG.voice: { gap: 0.22 } = pause after a sentence
#   reads <slug>.story.js (CFG.voice, BEATS[].say, END.say), writes <slug>.voice.mp3 + <slug>.voice.json (word timings)
#   assemble.py runs this automatically and embeds the result; the music ducks under the voice.
import hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TTS = os.path.join(HERE, 'tts')
PRESETS = {   # style blends; F0 ≈ 80–90 Hz before the pitch shift
    'deep':     {'mix': {'am_michael': 0.55, 'am_onyx': 0.35, 'am_fenrir': 0.1}, 'lang': 'en-us', 'pitch': -1.1},   # warmer, more expressive
    'deep-uk':  {'mix': {'bm_lewis': 0.7, 'bm_george': 0.3}, 'lang': 'en-gb', 'pitch': -1.2},
    'narrator': {'mix': {'am_michael': 0.6, 'am_onyx': 0.4}, 'lang': 'en-us', 'pitch': -0.8},
    'steve':    {'mix': {'am_puck': 0.75, 'am_echo': 0.25}, 'lang': 'en-us', 'pitch': 0},   # Dr. Steve: lighter, smug
}
CAST_VOICE = {'steve': 'steve'}   # BEATS[].who → voice preset

args = sys.argv[1:]
slug = args[0]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d

# --- read the story with node (top level only; helpers are stubbed) ---
js = r"""
const fs = require('fs'); const src = fs.readFileSync(process.argv[1], 'utf8'), names = [];
for (let k = 0; k < 60; k++) try {   // unknown helpers used at top level become stubs
  const f = new Function(...names, src + '\n;return { BEATS, END: typeof END === "undefined" ? null : END, CFG, DUR: CFG.dur };');
  process.stdout.write(JSON.stringify(f(...names.map(() => () => [])))); process.exit(0);
} catch (e) { const m = /^(\w+) is not defined/.exec(e.message); if (!m || names.includes(m[1])) throw e; names.push(m[1]); }
"""
r = subprocess.run(['node', '-e', js, f'{slug}.story.js'], capture_output=True, text=True)
if r.returncode: sys.exit('could not read story: ' + r.stderr[-800:])
S = json.loads(r.stdout)
CFG, BEATS, END, DUR = S['CFG'], S['BEATS'], S.get('END'), S['DUR']
vc = CFG.get('voice', 'deep')
if vc in (None, False, 'none', 'off'):
    for f in (f'{slug}.voice.json', f'{slug}.voice.mp3'):
        if os.path.exists(f): os.remove(f)
    print('voice: off'); sys.exit(0)
if isinstance(vc, str): vc = {'name': vc}
name = opt('voice', vc.get('name', 'deep'))
P = PRESETS.get(name, {'mix': {name: 1.0}, 'lang': 'en-gb' if name.startswith('b') else 'en-us', 'pitch': 0})
speed = float(opt('speed', vc.get('speed', 1.06)))   # natural pace
GAP = float(vc.get('gap', 0.22))                       # short natural pause after a sentence (s)
pitch = float(opt('pitch', vc.get('pitch', P['pitch'])))
gain = float(vc.get('gain', 1.0))

clean = lambda s: re.sub(r'\s+([,.!?;:])', r'\1', re.sub(r'\s+', ' ', re.sub(r'[*_]', '', s).replace('~', ' ').replace('…', '').replace('–', ',').replace('—', ','))).strip()
toks = lambda s: [t for t in s.split() if t]
def weight(tok):   # rough spoken length of a caption token
    w = clean(tok); syl = sum(max(1, len(re.findall(r'[aeiouy]+', p.lower()))) for p in re.findall(r"[A-Za-z']+", w)) or 1
    syl += 2 * len(re.findall(r'\d', w))
    return syl + (0.8 if re.search(r'[.,!?:;]$', w) else 0)

# --- lines: (key, start, window, spoken text, caption tokens, spoken-prefix weight) ---
lines = []
starts = [b['t'] for b in BEATS] + ([END['t']] if END else []) + [DUR]
for i, b in enumerate(BEATS):
    if b.get('say') is False: continue
    nxt = min([s for s in starts if s > b['t'] + 0.01] or [DUR])
    cap = toks(b['text']); kick = clean(b.get('kick', '')) if b.get('kick') else ''
    say = clean(b['say']) if isinstance(b.get('say'), str) else ((kick + ' ' if kick else '') + clean(b['text']))
    pre = sum(weight(w) for w in kick.split()) if kick and not isinstance(b.get('say'), str) else 0
    who = b.get('who') if isinstance(b.get('who'), str) else None
    lines.append((i, b['t'] + (0.1 if b['t'] < 0.05 else 0.06), nxt - b['t'] - 0.16, say, cap, pre, b.get('voice') or CAST_VOICE.get(who)))
RV = (END or {}).get('review')
if END and END.get('say') is not False:
    say = clean(END['say']) if isinstance(END.get('say'), str) else clean(END['q'])
    lines.append(('end', END['t'] + 0.35, (RV['t'] - 0.35 if RV else DUR) - END['t'] - 0.6, say, [], 0, None))
if RV and RV.get('say') is not False:
    n = int(RV.get('stars', 1)); words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five']
    say = clean(RV['say']) if isinstance(RV.get('say'), str) else clean(f"{words[n] if 0 <= n <= 5 else n} star{'' if n == 1 else 's'}. {RV.get('text', '')}")
    lines.append(('review', RV['t'] + 1.3, DUR - RV['t'] - 1.6, say, [], 0, None))

# --- synthesis (cached per line) ---
from kokoro_onnx import Kokoro
K = Kokoro(os.path.join(TTS, 'kokoro-v1.0.int8.onnx'), os.path.join(TTS, 'voices-v1.0.bin'))
STYLES = {}
def style_for(v):   # None = the main voice; otherwise a preset name or a raw kokoro voice
    mix = P['mix'] if not v else (PRESETS.get(v) or {'mix': {v: 1.0}})['mix']
    k = json.dumps(mix, sort_keys=True)
    if k not in STYLES:
        try: STYLES[k] = (mix, sum(K.get_voice_style(n) * w for n, w in mix.items()).astype(np.float32))
        except Exception: STYLES[k] = (P['mix'], sum(K.get_voice_style(n) * w for n, w in P['mix'].items()).astype(np.float32))
    return STYLES[k]
SR = 24000
os.makedirs('.voice', exist_ok=True)
def synth(text, sp, v=None):
    mix, style = style_for(v)
    key = hashlib.md5(json.dumps([text, mix, P['lang'], round(sp, 3)]).encode()).hexdigest()[:16]
    f = f'.voice/{key}.npy'
    if os.path.exists(f): return np.load(f)
    a, sr = K.create(text, voice=style, speed=sp, lang=P['lang'], trim=True)
    np.save(f, a.astype(np.float32)); return a.astype(np.float32)

def speak(say, sp, vo, gap):   # sentence by sentence, with a real pause between sentences
    parts = [p for p in re.split(r'(?<=[.!?])\s+', say) if p.strip()]   # pause only after full stops, ? and !
    out = []
    for k, p in enumerate(parts):
        if k: out.append(np.zeros(int(gap * SR), np.float32))
        out.append(synth(p, sp, vo))
    return np.concatenate(out) if out else np.zeros(1, np.float32)

track = np.zeros(int(SR * DUR) + SR, np.float32)
report, timing, segs = [], {}, []
for key, t0, win, say, cap, pre, vo in lines:
    sp, gap = speed, GAP; a = speak(say, sp, vo, gap); d = len(a) / SR
    if d > win and win > 0.4:   # too long: first shorter pauses, then speak faster (max 1.3×)
        gap = 0.12; a = speak(say, sp, vo, gap); d = len(a) / SR
        if d > win:
            sp = min(1.3, speed * d / win * 1.03); a = speak(say, sp, vo, gap); d = len(a) / SR
    ok = d <= win + 0.05
    note = 'ok' if gap == GAP and sp <= speed * 1.06 else 'ok, rushed (short pauses) – shorten text or lengthen beat'
    report.append(f"  {str(key):>3}  {d:4.2f}s / {win:4.2f}s  ×{sp:.2f}  {note if ok else 'TOO LONG – shorten text or lengthen beat'}  “{say}”")
    i0 = int(t0 * SR); n = min(len(a), len(track) - i0); track[i0:i0 + n] += a[:n]
    segs.append([round(t0, 3), round(t0 + d, 3)])
    if cap:   # word onsets: spread token weights over the voiced frames only (pauses are skipped)
        hop = int(0.01 * SR); rms = np.array([np.sqrt((a[j:j + hop] ** 2).mean()) for j in range(0, len(a) - hop, hop)])
        voiced = rms > max(0.012, 0.12 * np.percentile(rms, 90)); cum = np.cumsum(voiced) * 0.01
        W = [weight(w) for w in cap]; tot = pre + sum(W); acc = pre; on = []
        for w in W:
            target = acc / tot * cum[-1]; j = int(np.searchsorted(cum, target + 1e-6))
            on.append(round(t0 - BEATS[key]['t'] + j * 0.01, 3)); acc += w
        timing[key] = on

# --- deep voice: pitch shift (tempo kept), warmth, gentle compression → mp3 ---
tmp = tempfile.mkdtemp(); raw = os.path.join(tmp, 'v.f32')
track.tofile(raw); rr = 2 ** (pitch / 12)
af = (f'asetrate={SR * rr:.1f},aresample=48000,atempo={1 / rr:.5f},highpass=f=70,'
      'equalizer=f=140:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2,'
      f'acompressor=threshold=-20dB:ratio=2:attack=8:release=160:makeup=1.6,volume={gain}')
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw, '-af', af,
       '-t', f'{DUR:.3f}', '-c:a', 'libmp3lame', '-b:a', '96k', f'{slug}.voice.mp3']
subprocess.run(cmd, check=True)
beats = [timing.get(i) for i in range(len(BEATS))]
json.dump({'voice': name, 'pitch': pitch, 'speed': speed, 'segs': segs, 'beats': beats}, open(f'{slug}.voice.json', 'w'))
print(f'voice: {name} · pitch {pitch:+.1f} st · {len(lines)} lines → {slug}.voice.mp3')
print('\n'.join(report))
