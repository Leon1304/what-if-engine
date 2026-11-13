#!/usr/bin/env python3
# elaudio.py — v3.25 ElevenLabs music + sound effects made for one video (assemble.py runs it after the voice)
#   python3 elaudio.py <slug> [--lang xx] [--plan]
#   reads <slug>.events.json → "el" (whatif.elPlan(): the music score as sections + every sound prompt), writes <slug>.elaudio.json
#   { music: b64 mp3, sfx: { key: b64 mp3 } }, which assemble.py embeds (/* @ELAUDIO */). The engine plays it instead of the synth score and
#   the procedural ambience; hits with `el` get their own sound. Without ELEVENLABS_API_KEY, or if a request fails, the old sounds stay.
#   --plan: print the composition plan and the sounds, no request.  Cache: .elaudio/<hash>.mp3 (same prompt = no new request, also across videos).
#   EL_FAKE=1: sine tones instead of requests (tests).
import base64, hashlib, json, os, subprocess, sys

args = sys.argv[1:]; slug = args[0]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d
LANG = opt('lang', 'en'); OUT = slug if LANG == 'en' else f'{slug}.{LANG}'
KEY = os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('XI_API_KEY'); FAKE = os.environ.get('EL_FAKE') == '1'
API = 'https://api.elevenlabs.io/v1'; CACHE = '.elaudio'

# moods (engine AUDIO.score) → ElevenLabs styles of that section; the video's own AUDIO.musicPrompt is the global style
MOOD = {
    'horror':  ['dark horror underscore', 'low drones', 'dissonant strings', 'eerie textures', 'slow'],
    'tense':   ['suspense underscore', 'pulsing low synth', 'ticking percussion', 'building tension'],
    'action':  ['high-energy action', 'driving percussion', 'staccato strings', 'fast tempo'],
    'epic':    ['epic cinematic orchestral', 'big taiko drums', 'soaring brass', 'wide and powerful'],
    'funny':   ['quirky comedic', 'pizzicato strings', 'playful woodwinds', 'bouncy'],
    'party':   ['upbeat dance', 'four-on-the-floor beat', 'bright synths', 'festive'],
    'science': ['curious documentary underscore', 'light pulsing synths', 'marimba', 'clean and modern'],
    'chill':   ['calm ambient', 'soft piano', 'warm pads', 'gentle'],
    'triumph': ['triumphant and uplifting', 'heroic brass', 'full orchestra', 'major key resolution'],
    'sad':     ['melancholic', 'solo piano', 'slow strings', 'minor key'],
    'none':    ['near silence', 'very soft sustained low pad', 'minimal'],
}
LEVEL = {0: ['sparse minimal arrangement', 'quiet'], 1: ['light arrangement'], 2: [], 3: ['full intensity', 'climax']}
NEG = ['vocals', 'singing', 'lyrics', 'spoken word', 'vocal chops']
MIN_S, MAX_S, MAX_REQ = 3.0, 120.0, 280.0   # ElevenLabs: sections 3–120 s; one request ≤ ~5 min (longer films: several requests, joined)

def plan_music(m):
    segs = []
    for g in m['segs']:   # merge equal neighbours, then sections under 3 s into the one before (the first into the next)
        if segs and segs[-1]['mood'] == g['mood']: segs[-1]['t1'] = g['t1']
        else: segs.append(dict(g))
    segs[-1]['t1'] = m['dur']; segs[0]['t'] = 0
    i = 0
    while len(segs) > 1 and i < len(segs):
        if segs[i]['t1'] - segs[i]['t'] < MIN_S:
            if i == 0: segs[1]['t'] = 0; segs.pop(0)
            else: segs[i - 1]['t1'] = segs[i]['t1']; segs.pop(i)
            i = 0; continue
        i += 1
    out = []
    for g in segs:   # split sections over 120 s
        n = int((g['t1'] - g['t'] - 1e-6) // MAX_S) + 1; d = (g['t1'] - g['t']) / n
        out += [{**g, 't': g['t'] + k * d, 't1': g['t'] + (k + 1) * d} for k in range(n)]
    gpos = [s.strip() for s in (m.get('prompt') or '').split(',') if s.strip()] + ['instrumental', 'film score underscore for a narrated short video']
    secs = []
    for k, g in enumerate(out):
        st = MOOD.get(g['mood'], MOOD['tense']) + LEVEL.get(g.get('level', 2), [])
        if m.get('end') is not None and abs(g['t'] - m['end']) < 0.3: st = st + ['closing cadence', 'resolving ending']
        secs.append({'section_name': f"{g['mood'].title()} {k + 1}", 'positive_local_styles': st, 'negative_local_styles': [] if g['mood'] != 'none' else ['drums', 'loud'],
                     'duration_ms': int(round(g['t1'] * 1000)) - int(round(g['t'] * 1000)), 'lines': [], '_mood': g['mood']})
    reqs, cur, tot = [], [], 0   # requests of at most ~280 s, cut at section borders
    for s in secs:
        if cur and tot + s['duration_ms'] > MAX_REQ * 1000: reqs.append(cur); cur, tot = [], 0
        cur.append(s); tot += s['duration_ms']
    if cur: reqs.append(cur)
    return [{'positive_global_styles': gpos, 'negative_global_styles': NEG, 'sections': [{k: v for k, v in s.items() if not k.startswith('_')} for s in r]} for r in reqs], secs

def ff(a, inp=None):
    return subprocess.run(['ffmpeg', '-v', 'error', '-y'] + a, input=inp, capture_output=True, check=True).stdout

def cached(kind, body):
    h = hashlib.sha1(json.dumps([kind, body], sort_keys=True).encode()).hexdigest()[:16]; f = os.path.join(CACHE, f'{kind}-{h}.mp3')
    if os.path.exists(f) and os.path.getsize(f) > 1000: return f, False
    os.makedirs(CACHE, exist_ok=True)
    if FAKE:
        d = sum(s['duration_ms'] for s in body['composition_plan']['sections']) / 1000 if kind == 'music' else body.get('duration_seconds', 2)
        ff(['-f', 'lavfi', '-i', f'sine=frequency={220 if kind == "music" else 660}:duration={d}', '-ac', '2' if kind == 'music' else '1', '-b:a', '64k', f])
        return f, True
    import requests
    url = f'{API}/music' if kind == 'music' else f'{API}/sound-generation'
    r = requests.post(url, params={'output_format': 'mp3_44100_128'}, headers={'xi-api-key': KEY, 'Content-Type': 'application/json'}, json=body, timeout=600)
    if r.status_code != 200 or len(r.content) < 1000: raise RuntimeError(f'{r.status_code} {r.text[:200]}')
    open(f, 'wb').write(r.content); return f, True

def main():
    ef = f'{OUT}.events.json' if os.path.exists(f'{OUT}.events.json') else f'{slug}.events.json'
    try: P = json.load(open(ef)).get('el')
    except Exception: P = None
    if os.path.exists(f'{OUT}.elaudio.json') and not P: os.remove(f'{OUT}.elaudio.json')
    if not P: print('  elevenlabs audio: off (AUDIO.el: false or no scene events) → synth music + library sounds'); return
    reqs, secs = plan_music(P['music']) if P.get('music') else ([], [])
    if '--plan' in args:
        print(json.dumps({'music': reqs, 'sfx': P['sfx']}, indent=1, ensure_ascii=False)); return
    if not KEY and not FAKE:
        if os.path.exists(f'{OUT}.elaudio.json'): os.remove(f'{OUT}.elaudio.json')
        print('  elevenlabs audio: no ELEVENLABS_API_KEY → synth music + library sounds'); return
    new, res, warn = 0, {'music': None, 'sfx': {}}, []
    if reqs:
        try:
            parts = []
            for body in reqs:
                f, n = cached('music', {'model_id': 'music_v1', 'composition_plan': body, 'respect_sections_durations': True}); new += n; parts.append(f)
            D = P['music']['dur']; ins = sum((['-i', f] for f in parts), [])
            cat = ''.join(f'[{i}:a]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=0:a=1,' if len(parts) > 1 else ''
            # loudness like the synth score (measured: ≈ the synth score's level in the mix), exact length, no click at the start
            mp3 = ff(ins + ['-filter_complex', f'{cat}loudnorm=I=-14:TP=-1.5:LRA=11,apad,atrim=0:{D:.3f},afade=t=in:d=0.03', '-ar', '44100', '-ac', '2', '-b:a', '128k', '-f', 'mp3', '-'])
            res['music'] = base64.b64encode(mp3).decode()
        except Exception as e: warn.append(f'music failed ({str(e)[:160]}) → synth score')
    for s in P.get('sfx', []):
        body = {'text': s['text'], 'duration_seconds': s['dur'], 'prompt_influence': 0.45 if s['loop'] else 0.6, 'model_id': 'eleven_text_to_sound_v2', **({'loop': True} if s['loop'] else {})}
        try:
            f, n = cached('sfx', body); new += n
            # beds a little above the procedural ones, hits like the library sounds, the scene's v sets the level
            af = 'loudnorm=I=-35:TP=-8' if s['loop'] else 'loudnorm=I=-24:TP=-2'
            res['sfx'][s['key']] = base64.b64encode(ff(['-i', f, '-af', af, '-ar', '44100', '-ac', '1', '-b:a', '96k', '-f', 'mp3', '-'])).decode()
        except Exception as e: warn.append(f"sound failed: {s['text'][:50]} ({str(e)[:120]}) → library sound")
    json.dump(res, open(f'{OUT}.elaudio.json', 'w'))
    flow = ' → '.join(s['_mood'] for s in secs)
    beds = sum(1 for s in P.get('sfx', []) if s['loop']); hits = len(P.get('sfx', [])) - beds
    print(f"  elevenlabs audio: music {'%.1f s · %d sections (%s)' % (P['music']['dur'], len(secs), flow) if res['music'] else 'none'} · {beds} beds · {hits} sounds · {new} new requests, rest from cache")
    if P.get('music') and not (P['music'].get('prompt') or '').strip(): print('  NOTE: AUDIO.musicPrompt is empty — describe the music of this video (genre, instruments, place), e.g. "dark bluegrass, banjo and fiddle, rural farm"')
    for w in warn: print('  ELAUDIO:', w)

main()
