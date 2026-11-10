#!/usr/bin/env python3
# voice.py — offline voice-over (Kokoro TTS) for a video: one spoken line per caption beat + the end-card question
#   python3 voice.py <slug> [--voice deep|deep-uk|narrator|<kokoro voice>] [--speed 1.06] [--pitch -1.1]   CFG.voice: { gap: 0.22 } = pause after a sentence
#   reads <slug>.story.js (CFG.voice, BEATS[].say, END.say), writes <slug>.voice.mp3 + <slug>.voice.json (word timings)
#   assemble.py runs this automatically and embeds the result; the music ducks under the voice.
#   BEATS[].say may contain ' | ' = a deliberate pause (0.3 s) · BEATS[].tone: calm | tense | excited | whisper | shout | sad (tempo + loudness)
#   lines spoken by an on-screen character (who: 'steve' | 'you' | any char name) get a mouth track (open/shape per 1/30 s) → lip sync in the video
#   --lang es|fr|it|pt|hi|ja|zh + <slug>.<lang>.json (translated texts) → language version (voice + captions in that language)
import hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TTS = os.path.join(HERE, 'tts')
PRESETS = {   # style blends; naturally deep voices, no pitch shift (a shift makes it sound synthetic)
    'deep':     {'mix': {'am_onyx': 0.5, 'am_michael': 0.4, 'am_fenrir': 0.1}, 'lang': 'en-us', 'pitch': 0},   # deep, warm, expressive
    'deep-uk':  {'mix': {'bm_lewis': 0.7, 'bm_george': 0.3}, 'lang': 'en-gb', 'pitch': 0},
    'narrator': {'mix': {'am_michael': 0.6, 'am_onyx': 0.4}, 'lang': 'en-us', 'pitch': 0},
    'steve':    {'mix': {'am_puck': 0.75, 'am_echo': 0.25}, 'lang': 'en-us', 'pitch': 0},   # Dr. Steve: lighter, smug
    'warm':     {'mix': {'am_michael': 0.7, 'am_onyx': 0.3}, 'lang': 'en-us', 'pitch': 0},   # friendly explainer
    'documentary': {'mix': {'bm_george': 0.6, 'bm_daniel': 0.4}, 'lang': 'en-gb', 'pitch': 0},   # calm British nature-film narrator
    'storyteller': {'mix': {'af_heart': 0.6, 'af_bella': 0.4}, 'lang': 'en-us', 'pitch': 0},   # female narrator
    'young':    {'mix': {'am_liam': 0.6, 'am_eric': 0.4}, 'lang': 'en-us', 'pitch': 0},   # on-screen "you": lighter than the narrator
}
CAST_VOICE = {'steve': 'steve', 'you': 'young'}   # BEATS[].who → voice preset (BEATS[].voice overrides)

args = sys.argv[1:]
slug = args[0]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d
LANG = opt('lang', 'en')
LANGV = {   # Kokoro voices per language (deep male narrator where available)
    'es': {'mix': {'em_alex': 0.7, 'em_santa': 0.3}, 'lang': 'es'}, 'fr': {'mix': {'ff_siwis': 1.0}, 'lang': 'fr-fr'}, 'it': {'mix': {'im_nicola': 1.0}, 'lang': 'it'},
    'pt': {'mix': {'pm_alex': 0.7, 'pm_santa': 0.3}, 'lang': 'pt-br'}, 'hi': {'mix': {'hm_omega': 0.6, 'hm_psi': 0.4}, 'lang': 'hi'}, 'ja': {'mix': {'jm_kumo': 1.0}, 'lang': 'ja'}, 'zh': {'mix': {'zm_yunjian': 1.0}, 'lang': 'cmn'} }
OUT = slug if LANG == 'en' else f'{slug}.{LANG}'

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
if LANG != 'en':   # translated texts: { beats: [{ text, say }], end: { say }, review: { say, text } } — same order as BEATS
    TR = json.load(open(f'{slug}.{LANG}.json', encoding='utf-8'))
    for b, tb in zip(BEATS, TR.get('beats', [])):
        if tb: b.update({k: v for k, v in tb.items() if k in ('text', 'say', 'kick')})
    if END and TR.get('end'): END.update({k: v for k, v in TR['end'].items() if k in ('say', 'q', 'cta')})
    if END and END.get('review') and TR.get('review'): END['review'].update({k: v for k, v in TR['review'].items() if k in ('say', 'text', 'title')})
vc = CFG.get('voice', 'documentary' if CFG.get('kind') in ('explain', 'conspiracy', 'debunk') else 'deep')   # explainers + debunks: calm documentary narrator by default
if vc in (None, False, 'none', 'off'):
    for f in (f'{OUT}.voice.json', f'{OUT}.voice.mp3'):
        if os.path.exists(f): os.remove(f)
    print('voice: off'); sys.exit(0)
if isinstance(vc, str): vc = {'name': vc}
name = opt('voice', vc.get('name', 'deep'))
P = PRESETS.get(name, {'mix': {name: 1.0}, 'lang': 'en-gb' if name.startswith('b') else 'en-us', 'pitch': 0})
if LANG != 'en': P = {**LANGV[LANG], 'pitch': 0}; PRESETS = {k: ({**v, 'mix': LANGV[LANG]['mix']} if k != 'steve' else {**v, 'mix': LANGV[LANG]['mix'], 'speed': 1.08}) for k, v in PRESETS.items()}
speed = float(opt('speed', vc.get('speed', 1.06)))   # natural pace
GAP = float(vc.get('gap', 0.22)); BREATH = vc.get('breath', True)                       # short natural pause after a sentence (s)
pitch = float(opt('pitch', vc.get('pitch', P['pitch'])))
gain = float(vc.get('gain', 1.0))

clean = lambda s: re.sub(r'\s+([,.!?;:…])', r'\1', re.sub(r'\s+', ' ', re.sub(r'[*_]', '', s).replace('~', ' ').replace(' – ', ' — ').replace('–', '—'))).strip()   # keeps … and — (intonation, pauses)
toks = lambda s: [t for t in s.split() if t]
def speakable(s):   # read numbers the way a narrator says them: $48.9K → 48.9 thousand dollars, 12% → 12 percent, km/h, °C, vs …
    if LANG != 'en': return s
    U = {'k': 'thousand', 'm': 'million', 'b': 'billion'}
    s = re.sub(r'\$\s?(\d[\d,]*(?:\.\d+)?)\s?([KkMmBb])\b', lambda m: f'{m.group(1)} {U[m.group(2).lower()]} dollars', s)
    s = re.sub(r'\$\s?(\d[\d,]*(?:\.\d+)?)', lambda m: m.group(1) + (' dollar' if m.group(1) == '1' else ' dollars'), s)
    s = re.sub(r'(?<=\d)\s?([KkMB])\b', lambda m: ' ' + {'k': 'thousand', 'K': 'thousand', 'M': 'million', 'B': 'billion'}[m.group(1)], s)
    for a, b in ((r'(?<=\d)\s?%', ' percent'), (r'(?<=\d)\s?°C', ' degrees Celsius'), (r'(?<=\d)\s?°F', ' degrees Fahrenheit'), (r'(?<=\d)\s?km/h', ' kilometers per hour'), (r'(?<=\d)\s?mph\b', ' miles per hour'),
                 (r'(?<=\d)\s?km\b', ' kilometers'), (r'(?<=\d)\s?kg\b', ' kilograms'), (r'(?<=\d)\s?m\b', ' meters'), (r'(?<=\d)x\b', ' times'), (r'\bvs\.?(?=[\s…])', 'versus'), (r'\s&\s', ' and '), (r'#(?=\d)', 'number ')):
        s = re.sub(a, b, s)
    return s
def weight(tok):   # rough spoken length of a caption token
    w = clean(tok); syl = sum(max(1, len(re.findall(r'[aeiouyáéíóúàèìòùâêîôûãõäöü]+', p.lower()))) for p in re.findall(r"[^\W\d_']+|'", w)) or 1
    syl += 2 * len(re.findall(r'\d', w))
    return syl + (0.8 if re.search(r'[.,!?:;]$', w) else 0)

# --- lines: (key, start, window, spoken text, caption tokens, spoken-prefix weight, voice, pace, speaker, gain) ---
TONES = {'dramatic': (0.92, 1.0), 'calm': (0.96, 0.92), 'tense': (0.93, 0.95), 'excited': (1.07, 1.1), 'whisper': (0.9, 0.62), 'shout': (1.05, 1.22), 'sad': (0.9, 0.9)}   # tone → (tempo, loudness)
lines = []
starts = [b['t'] for b in BEATS] + ([END['t']] if END else []) + [DUR]
for i, b in enumerate(BEATS):
    if b.get('say') is False: continue
    nxt = min([s for s in starts if s > b['t'] + 0.01] or [DUR])
    cap = toks(b['text']); kick = clean(b.get('kick', '')) if b.get('kick') else ''
    src = b['say'] if isinstance(b.get('say'), str) else b['text']
    if b.get('tone') == 'dramatic' and '*' in src: k_ = src.rfind('*', 0, src.rfind('*')); src = src[:k_].rstrip() + '… ' + src[k_:] if k_ > 0 else src   # a beat before the reveal
    say = speakable(clean(src)) if isinstance(b.get('say'), str) else ((kick + ' ' if kick else '') + speakable(clean(src)))
    pre = sum(weight(w) for w in kick.split()) if kick and not isinstance(b.get('say'), str) else 0
    who = b.get('who') if isinstance(b.get('who'), str) else None
    lines.append((i, b['t'] + (0.1 if b['t'] < 0.05 else 0.06), nxt - b['t'] - 0.16, say, cap, pre, b.get('voice') or CAST_VOICE.get(who), b.get('pace', 1) * TONES.get(b.get('tone'), (1, 1))[0], who, TONES.get(b.get('tone'), (1, 1))[1]))
RV = (END or {}).get('review')
# explainer / conspiracy videos: the closing line follows the question on the end card ("Did you believe it? A, B or C — drop your pick in the comments.")
# instead of the story outro "What would you have done?"; a stray story outro in END.say / review.say is replaced
EXPL = CFG.get('kind') in ('explain', 'conspiracy', 'debunk')
WWYD = re.compile(r"\s*What would you have done\??(\s*Drop it in the comments\.?)?", re.I)
def outro():
    opts = (END or {}).get('opts') or []; q = clean((END or {}).get('q') or '')
    ab = ', '.join('ABCD'[:len(opts) - 1]) + ' or ' + 'ABCD'[len(opts) - 1] if len(opts) > 1 else ''
    return f"{q} {ab} — drop your pick in the comments." if ab else f"{q} Tell me in the comments."
if END and END.get('say') is not False and (isinstance(END.get('say'), str) or END.get('q')):
    say = clean(END['say']) if isinstance(END.get('say'), str) else (outro() if EXPL and END.get('q') else clean(END['q']))
    if EXPL and WWYD.search(say): say = WWYD.sub(' ', say).strip() or outro()
    lines.append(('end', END['t'] + 0.35, (RV['t'] - 0.35 if RV else DUR) - END['t'] - 0.6, say, [], 0, None, END.get('pace', 1), None, 1))
if RV and RV.get('say') is not False and (LANG == 'en' or isinstance(RV.get('say'), str)):
    n = int(RV.get('stars', 1)); words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five']
    say = clean(RV['say']) if isinstance(RV.get('say'), str) else clean(f"{words[n] if 0 <= n <= 5 else n} star{'' if n == 1 else 's'}. {RV.get('text', '')}")
    if EXPL and WWYD.search(say): say = WWYD.sub(' ', say).strip() or clean(f"{words[n] if 0 <= n <= 5 else n} star{'' if n == 1 else 's'}. {RV.get('text', '')}")
    lines.append(('review', RV['t'] + 1.3, DUR - RV['t'] - 1.6, say, [], 0, None, RV.get('pace', 1), None, 1))

# --- synthesis (cached per line) ---
from kokoro_onnx import Kokoro
MODEL = next(f for f in ('kokoro-v1.0.onnx', 'kokoro-v1.0.int8.onnx') if os.path.exists(os.path.join(TTS, f)))   # full model sounds cleaner than int8
K = Kokoro(os.path.join(TTS, MODEL), os.path.join(TTS, 'voices-v1.0.bin'))
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
    key = hashlib.md5(json.dumps([text, mix, P['lang'], round(sp, 3), MODEL]).encode()).hexdigest()[:16]
    f = f'.voice/{key}.npy'
    if os.path.exists(f): return np.load(f)
    a, sr = K.create(text, voice=style, speed=sp, lang=P['lang'], trim=True)
    np.save(f, a.astype(np.float32)); return a.astype(np.float32)

def pace_of(sent):   # tempo per sentence: dramatic lines slower, punchlines faster
    w = len(sent.split()); low = sent.lower()
    if '…' in sent or '...' in sent or 'worse' in low: return 0.88
    if w <= 3: return 1.07
    if sent.endswith('!'): return 1.05
    if sent.endswith('?'): return 0.97
    return 1.0
_br = np.random.default_rng(7)
def breath(n_ms=190, v=0.018):   # soft inhale: band-limited noise with a swell
    n = int(SR * n_ms / 1000); x = _br.standard_normal(n).astype(np.float32)
    x = np.convolve(x, np.ones(9) / 9, mode='same') - np.convolve(x, np.ones(60) / 60, mode='same')   # crude band-pass ~400–2.5 kHz
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return (x * env * v / (np.abs(x).max() + 1e-6)).astype(np.float32)
def speak(say, sp, vo, gap):   # sentence by sentence: own tempo each, short pause after full stops, a breath before long sentences; ' | ' = deliberate pause (0.32 s)
    out = []
    for chunk in say.split('|'):
        for k, p in enumerate(q for q in re.split(r'(?<=[.!?…])\s+', chunk.strip()) if q.strip()):
            if out: out.append(np.zeros(int((gap if k else 0.32) * SR), np.float32))
            if BREATH and len(p.split()) >= 6 and vo is None: out += [breath(), np.zeros(int(0.03 * SR), np.float32)]
            out.append(synth(p, min(1.35, sp * pace_of(p)), vo))
    return np.concatenate(out) if out else np.zeros(1, np.float32)

track = np.zeros(int(SR * DUR) + SR, np.float32)
report, timing, segs = [], {}, []
MOUTH = []
def mouth_track(a):   # per 1/30 s: opening 0–9 (loudness) and mouth shape a (open) · w (wide: e, i) · r (round: o, u) · f (teeth: s, f, sh) · n (closed: m, b, p, pause)
    hop = SR // 30; n = max(1, len(a) // hop); rms = np.array([np.sqrt((a[i * hop:(i + 1) * hop] ** 2).mean()) for i in range(n)]); ref = np.percentile(rms, 95) + 1e-6
    op = np.convolve(np.clip(rms / ref, 0, 1) ** 0.75, [0.25, 0.5, 0.25], 'same'); sh = []
    for i in range(n):
        seg = a[i * hop:i * hop + 1024]
        if len(seg) < 256 or rms[i] < 0.1 * ref: sh.append('n'); continue
        sp_ = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; fr = np.fft.rfftfreq(len(seg), 1 / SR)
        lo, mid, hi = sp_[(fr > 150) & (fr < 1000)].sum(), sp_[(fr > 1500) & (fr < 3500)].sum(), sp_[fr > 4000].sum()
        zc = (np.abs(np.diff(np.sign(seg))) > 0).mean()
        b1 = (fr > 200) & (fr < 950); f1 = fr[b1][np.argmax(sp_[b1])]; b2 = (fr > max(800, f1 + 250)) & (fr < 2900); f2 = fr[b2][np.argmax(sp_[b2])]   # rough formants
        sh.append('f' if hi > 0.8 * (lo + mid) or zc > 0.25 else 'w' if f2 > 1900 else 'r' if f1 < 430 and f2 < 1350 else 'a')
    return ''.join(str(min(9, int(v * 9.99))) for v in op), ''.join(sh)
for key, t0, win, say, cap, pre, vo, pace, who, lgain in lines:
    sp, gap = speed * pace, GAP; a = speak(say, sp, vo, gap); d = len(a) / SR
    if d > win and win > 0.4:   # too long: first shorter pauses, then speak faster (max 1.3×)
        gap = 0.12; a = speak(say, sp, vo, gap); d = len(a) / SR
        if d > win:
            sp = min(1.3, speed * d / win * 1.03); a = speak(say, sp, vo, gap); d = len(a) / SR
    ok = d <= win + 0.05
    note = 'ok' if gap == GAP and sp <= speed * pace * 1.06 else 'ok, rushed (short pauses) – shorten text or lengthen beat'
    report.append(f"  {str(key):>3}  {d:4.2f}s / {win:4.2f}s  ×{sp:.2f}  {note if ok else 'TOO LONG – shorten text or lengthen beat'}  “{say}”")
    vo_ = np.abs(a) > 0.01; rms_ = float(np.sqrt((a[vo_] ** 2).mean())) if vo_.any() else 0.0
    if rms_ > 1e-4: a = a * float(np.clip(0.085 / rms_, 0.5, 2.5))   # same loudness for every line
    if who: o_, s_ = mouth_track(a); MOUTH.append({'who': who, 't0': round(t0, 3), 'o': o_, 's': s_})
    i0 = int(t0 * SR); n = min(len(a), len(track) - i0); track[i0:i0 + n] += a[:n] * lgain
    segs.append([round(t0, 3), round(t0 + d, 3)])
    if cap:   # word onsets: spread token weights over the voiced frames only (pauses are skipped)
        hop = int(0.01 * SR); rms = np.array([np.sqrt((a[j:j + hop] ** 2).mean()) for j in range(0, len(a) - hop, hop)])
        voiced = rms > max(0.012, 0.12 * np.percentile(rms, 90)); cum = np.cumsum(voiced) * 0.01
        W = [weight(w) for w in cap]; tot = pre + sum(W); acc = pre; on = []
        for w in W:
            target = acc / tot * cum[-1]; j = int(np.searchsorted(cum, target + 1e-6))
            on.append(round(t0 - BEATS[key]['t'] + j * 0.01, 3)); acc += w
        timing[key] = on

# --- voice polish: optional pitch shift, warmth, small room, gentle compression → mp3 ---
tmp = tempfile.mkdtemp(); raw = os.path.join(tmp, 'v.f32')
track.tofile(raw); rr = 2 ** (pitch / 12)
shift = f'asetrate={SR * rr:.1f},aresample=48000,atempo={1 / rr:.5f},' if abs(pitch) > 0.05 else 'aresample=48000,'
af = (shift + 'highpass=f=70,equalizer=f=140:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=1.5,deesser=i=0.35:m=0.5:f=0.5,'
      'aecho=0.85:0.6:23|41:0.10|0.06,'                                   # a little room: sounds recorded, not synthesized
      f'acompressor=threshold=-20dB:ratio=2:attack=8:release=160:makeup=1.6,volume={gain}')
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw, '-af', af,
       '-t', f'{DUR:.3f}', '-c:a', 'libmp3lame', '-b:a', '96k', f'{OUT}.voice.mp3']
subprocess.run(cmd, check=True)
beats = [timing.get(i) for i in range(len(BEATS))]
json.dump({'voice': name, 'lang': LANG, 'pitch': pitch, 'speed': speed, 'segs': segs, 'beats': beats, 'mouth': MOUTH}, open(f'{OUT}.voice.json', 'w'))
print(f'voice: {name} · {LANG} · pitch {pitch:+.1f} st · {len(lines)} lines · {len(MOUTH)} lip-sync tracks → {OUT}.voice.mp3')
print('\n'.join(report))
