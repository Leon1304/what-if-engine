#!/usr/bin/env bash
# Smoke test for the engine: builds the example story from template.html and every tests/<name>.story.js + .scene.js,
# renders a few frames of each and fails on any page error.   bash tests/run.sh [name …]   (SMOKE_DIR = work folder)
# v3.1: scenes run in parallel, SMOKE_JOBS at a time (default: half the CPU cores, 1–4). SMOKE_JOBS=1 = one after another.
set -u
R=$(cd "$(dirname "$0")/.." && pwd); W=${SMOKE_DIR:-$(mktemp -d)}; mkdir -p "$W"; cd "$W"
cp "$R/template.html" "$R/assemble.py" "$R/render.mjs" .; ln -sfn "${NODE_MODULES:-$R/node_modules}" node_modules; ln -sfn "$R/sfx" sfx; ln -sfn "$R/models" models; ln -sfn "$R/assets" assets
sed -n '/@STORY-BEGIN/,/@STORY-END/p' template.html | sed '1d;$d' > example.story.js
sed -n '/@SCENE-BEGIN/,/@SCENE-END/p' template.html | sed '1d;$d' > example.scene.js
cp "$R"/tests/*.story.js "$R"/tests/*.scene.js .
names=${*:-example $(cd "$R/tests" && ls *.story.js | sed 's/\.story\.js$//')}
names=$(echo $names)   # one line, single spaces: the " $names " checks below (gate, crowd QA, channel) also run in a full run (ls gave newlines)
cores=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 2); J=${SMOKE_JOBS:-$(( cores / 2 ))}; [ "$J" -lt 1 ] && J=1; [ -z "${SMOKE_JOBS:-}" ] && [ "$J" -gt 4 ] && J=4
one() {   # one scene → its result in <name>.res (first line "ok …" or "FAIL …")
  s=$1
  if ! python3 assemble.py "$s" --title "Smoke test" --no-voice --no-el > "$s.log" 2>&1; then { echo "FAIL $s (assemble)"; tail -6 "$s.log"; } > "$s.res"; return; fi
  timeout 600 node render.mjs "$s.html" --shots 1,4,8 --w 270 --out "shots_$s" >> "$s.log" 2>&1
  if grep -q "PAGE DID NOT START\|PAGE ERRORS\|model missing\|cam path missing" "$s.log" || [ "$(ls shots_$s/*.png 2>/dev/null | wc -l)" -lt 3 ]; then { echo "FAIL $s"; grep -A10 "PAGE" "$s.log" | head -14; } > "$s.res"
  else echo "ok   $s  $(grep -o '"meshes":[0-9]*' "$s.log" | head -1)" > "$s.res"; fi
}
export -f one
echo "smoke: $(echo $names | wc -w) scenes, $J at a time"
rm -f *.res; printf '%s\n' $names | xargs -P "$J" -I{} bash -c 'one "$1"; head -1 "$1.res"' _ {}
fail=0; for s in $names; do [ -f "$s.res" ] || echo "FAIL $s (no result)" > "$s.res"; case "$(head -1 "$s.res")" in ok*) ;; *) cat "$s.res"; fail=1;; esac; done
# v3.2 render plan: interleaved chunks of 10–30 frames by default, one block per shard with CFG.shard: 'block'
ck() { node render.mjs "$1.html" --probe 'window.whatif.plan(12).chunk' 2>&1 | tail -1; }
sed "s#^const CFG = {#const CFG = { shard: 'block',#" example.story.js > plan_block.story.js; cp example.scene.js plan_block.scene.js
python3 assemble.py plan_block --title "Plan" --no-voice --no-el > plan_block.log 2>&1; c1=$(ck example); c2=$(ck plan_block)
if [ "$c1" -ge 10 ] 2>/dev/null && [ "$c1" -le 30 ] && [ "$c2" -gt 30 ] 2>/dev/null; then echo "ok   render plan  chunk $c1 · block $c2"; else echo "FAIL render plan: chunk '$c1' · block '$c2'"; fail=1; fi
# v3.24 quality gate: qa-gate has one QA: BACKWARD line, waived in QA_OK → --gate exits 0; the same scene without QA_OK → exit 3
case " $names " in *" qa-gate "*)
  sed '/^const QA_OK/,/^\];/d' qa-gate.story.js > gate_open.story.js; cp qa-gate.scene.js gate_open.scene.js
  python3 assemble.py gate_open --title "Gate" --no-voice --no-el > gate_open.log 2>&1
  { timeout 600 node render.mjs qa-gate.html --gate > gate_ok.out 2>&1; echo $? > gate_ok.rc; } & { timeout 600 node render.mjs gate_open.html --gate > gate_open.out 2>&1; echo $? > gate_open.rc; } & wait
  g1=$(cat gate_ok.rc); g2=$(cat gate_open.rc)
  if [ "$g1" = 0 ] && grep -q '^QA-OK: QA: BACKWARD' gate_ok.out && grep -q '^GATE: ok (1 waived' gate_ok.out && [ "$g2" = 3 ] && grep -q '^GATE: 1 open' gate_open.out; then echo "ok   quality gate  waived → exit 0 · open → exit 3"
  else echo "FAIL quality gate: waived exit $g1, open exit $g2"; tail -4 gate_ok.out gate_open.out; fail=1; fi;;
esac
# v3.24 crowd QA by what the viewer sees (tests/crowd-qa): members inside each other close to the lens are reported, the same cram behind the camera is not
case " $names " in *" crowd-qa "*) q=$(node render.mjs crowd-qa.html --probe 'qaCrowds()' 2>&1)
  if echo "$q" | grep -q 'crowd #0: .*close to the camera' && ! echo "$q" | grep -q 'crowd #1'; then echo "ok   crowd QA  near lens reported, off screen not"; else echo "FAIL crowd QA: $(echo "$q" | tail -5)"; fail=1; fi;; esac
# v3.44 post-FX QA (tests/post-qa): the finished picture — LINES + BLOCKY (old 16-tap blur, CFG.blurLegacy), FRINGE (CFG.fringeMax: 8 + shake) and WASHOUT (white veil after a
# flash) are reported; the same scene without those switches reports none of them; the tilt-shift scene stays free of BLOCKY / LINES / FRINGE / WASHOUT
case " $names " in *" post-qa "*)
  sed 's/^  blurLegacy: true, fringeMax: 8, washVeil: true };$/};/' post-qa.story.js > pq_off.story.js; cp post-qa.scene.js pq_off.scene.js
  python3 assemble.py pq_off --title "PQ" --no-voice --no-el > pq_off.log 2>&1
  { timeout 900 node render.mjs post-qa.html --audit --no-fresh > pq_on.out 2>&1; } & { timeout 900 node render.mjs pq_off.html --audit --no-fresh > pq_off.out 2>&1; } & wait
  tsq=0; [ -f tilt-shift.log ] && tsq=$(grep -c '^QA: \(BLOCKY\|LINES\|FRINGE\|WASHOUT\)' tilt-shift.log)
  if grep -q '^QA: LINES' pq_on.out && grep -q '^QA: BLOCKY' pq_on.out && grep -q '^QA: FRINGE' pq_on.out && grep -q '^QA: WASHOUT' pq_on.out && ! grep -q '^QA: \(LINES\|BLOCKY\|FRINGE\|WASHOUT\)' pq_off.out && [ "$tsq" = 0 ]; then echo "ok   post-FX QA  LINES · BLOCKY · FRINGE · WASHOUT reported, gone with the engine defaults; tilt-shift clean"
  else echo "FAIL post-FX QA: tilt-shift lines $tsq"; grep -E '^QA: (LINES|BLOCKY|FRINGE|WASHOUT)|failed' pq_on.out pq_off.out | cut -c1-200; fail=1; fi;;
esac
# clip QA (tests/clip-qa): two houses in each other → OVERLAP, a figure in the side of a van → INSIDE, one under a beam that may not duck → HEADCLIP; the room, doorway, car, hug,
# high awning, the figures that duck (beam, crawl tunnel, motorbike tunnel), drivers in every vehicle kind and the city figure (its tower is left out) stay quiet
case " $names " in *" clip-qa "*) q=$(WHATIF_START_TIMEOUT=600 node render.mjs clip-qa.html --probe '[...qaOverlap(), ...qaClip()]' 2>&1)
  if [ "$(echo "$q" | grep -c 'OVERLAP – ')" = 1 ] && echo "$q" | grep -q "OVERLAP – 'house' at (-10.0, -8.0)" && echo "$q" | grep -q "INSIDE – 'Inside'" && echo "$q" | grep -q "HEADCLIP – 'Beam'" \
    && ! echo "$q" | grep -q "'Duck'\|'Room'\|'Door'\|'Driver'\|'HugA'\|'HugB'\|'Shade'\|'City'\|'Crawl'\|'Rider'\|'Seat\|failed"; then echo "ok   clip QA  OVERLAP · INSIDE · HEADCLIP reported, the rest quiet"; else echo "FAIL clip QA: $(echo "$q" | tail -8)"; fail=1; fi;; esac
# v3.25 ElevenLabs music + sounds (EL_FAKE=1: sine tones instead of requests): short sections merge, the track plays, a 'none' segment stays silent
case " $names " in *" el-audio "*)
  cp "$R/elaudio.py" .; cp el-audio.story.js elf.story.js; cp el-audio.scene.js elf.scene.js
  env -u ELEVENLABS_API_KEY -u XI_API_KEY EL_FAKE=1 python3 assemble.py elf --title "EL" --no-voice --el > elf.log 2>&1
  pl=$(python3 elaudio.py elf --plan 2>&1 | python3 -c "import json,sys; d=json.load(sys.stdin); print(' '.join(s['section_name'] + ':' + str(s['duration_ms']) for s in d['music'][0]['sections']), len(d['sfx']))" 2>&1)
  timeout 600 node render.mjs elf.html --audio elf.wav > elf_a.log 2>&1
  lv=$(python3 -c "
import subprocess, numpy as np
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'elf.wav', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout, dtype='<i2').astype(float)
def e(t0, t1):
    s = a[int(t0 * 48000):int(t1 * 48000)]; f = np.fft.rfftfreq(len(s), 1 / 48000); return np.abs(np.fft.rfft(s))[(f > 214) & (f < 226)].sum()
print('%.0f' % (e(0.5, 5) / max(1, e(9.5, 11.5))))" 2>&1)
  if [ "$pl" = "Tense 1:5500 Epic 2:3500 None 3:3000 4" ] && grep -q 'elevenlabs audio: music 12.0 s · 3 sections' elf.log && grep -q '@ELAUDIO \*/{' elf.html && ! grep -q 'PAGE ERRORS' elf_a.log && [ "${lv:-0}" -gt 10 ] 2>/dev/null; then echo "ok   elevenlabs audio  plan $pl · music on/off ${lv}×"
  else echo "FAIL elevenlabs audio: plan '$pl' · level '$lv'"; grep -E 'eleven|ELAUDIO' elf.log; tail -3 elf_a.log; fail=1; fi;;
esac
# v3.36 engine music styles: bluegrass style renders (banjo/fiddle/upright via Karplus-Strong), music plays and differs from the plain mood instruments
case " $names " in *" music-styles "*)
  sed "s/style: 'bluegrass'/style: false/" music-styles.story.js > msf.story.js; cp music-styles.scene.js msf.scene.js
  python3 assemble.py msf --title "MS" --no-voice --no-el > msf.log 2>&1
  timeout 600 node render.mjs music-styles.html --audio ms_a.wav > ms_a.log 2>&1; timeout 600 node render.mjs msf.html --audio ms_b.wav > ms_b.log 2>&1
  ms=$(python3 -c "
import subprocess, numpy as np
r = lambda f: np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout, dtype='<i2').astype(float) / 32768
a, b = r('ms_a.wav'), r('ms_b.wav'); n = min(len(a), len(b)); a, b = a[48000:n - 48000], b[48000:n - 48000]
print('%.1f %.2f %.3f' % (20 * np.log10(np.sqrt((a ** 2).mean()) + 1e-9), np.abs(a).max(), np.sqrt(((a - b) ** 2).mean()) / (np.sqrt((a ** 2).mean()) + 1e-9)))" 2>&1)
  set -- $ms
  if ! grep -q 'PAGE ERRORS' ms_a.log && python3 -c "import sys; l, p, d = map(float, sys.argv[1:4]); sys.exit(0 if l > -40 and p < 1.0 and d > 0.3 else 1)" $ms 2>/dev/null; then echo "ok   music styles  bluegrass ${1} dB · peak ${2} · differs ${3}×"
  else echo "FAIL music styles: '$ms'"; tail -3 ms_a.log; fail=1; fi;;
esac
# v3.44 camera (tests/camera-react): the blast front hits the camera only after it got there (camReact), the speed ramp slows the scene and snaps back with a whoosh,
#   punch-in whoosh, every frame the same when jumped to from elsewhere, tilt-shift policy (close shot 0, far hand key on)
case " $names " in *" camera-react "*)
  cr=$(node render.mjs camera-react.html --probe '(() => { stepScene(6.0); const k0 = CAMHIT.k; stepScene(6.8); const k1 = CAMHIT.k; const slow = ST(6.4) - ST(6.3); stepScene(9); const m1 = camFx.mini; stepScene(11); const m2 = camFx.mini;
    stepScene(6.75); const A = camera.position.toArray().join() + camera.quaternion.toArray().join(); stepScene(2); stepScene(6.75); const B = camera.position.toArray().join() + camera.quaternion.toArray().join();
    const H = AUDIO.hits, w1 = H.some(h => h.k === "whoosh" && Math.abs(h.t - 6.48) < 0.05), w2 = H.some(h => h.k === "whoosh" && Math.abs(h.t - 5.42) < 0.05);
    return ["k0=" + k0.toFixed(2), "k1=" + k1.toFixed(2), "slow=" + slow.toFixed(3), "mini=" + m1.toFixed(2) + "/" + m2.toFixed(2), "pure=" + (A === B), "snap=" + w1, "punch=" + w2].join(" "); })()' 2>&1 | tail -1 | tr -d '"')
  if echo "$cr" | grep -q 'k0=0.00 ' && echo "$cr" | grep -q 'pure=true snap=true punch=true' && echo "$cr" | grep -q 'mini=0.00/1.00' && python3 -c "import sys; d = dict(x.split('=') for x in sys.argv[1:]); sys.exit(0 if float(d['k1']) > 0.3 and float(d['slow']) < 0.04 else 1)" $cr 2>/dev/null
  then echo "ok   camera react  $cr"; else echo "FAIL camera react: '$cr'"; fail=1; fi;;
esac
# v3.44 idle life (tests/life): a figure posed with a fixed time still moves (head / arms), has clothing detail, a bystander turns to the explosion
case " $names " in *" life "*) q=$(node render.mjs life.html --probe "(() => { const g = RIGS.find(r => r.tag === 'still'), a = RIGS.find(r => r.tag === 'bysA'); stepScene(0.3); const n0 = g.neck.quaternion.clone(), e0 = g.foreL.quaternion.clone(); stepScene(1.3); const mv = g.neck.quaternion.angleTo(n0) + g.foreL.quaternion.angleTo(e0); stepScene(6.9); const y0 = a.neck.rotation.y; stepScene(8.2); const y1 = a.neck.rotation.y; return [mv > 0.01 ? 'moves' : 'frozen', (g._tlr?.length ?? 0) > 3 ? 'tailor' : 'plain', Math.abs(y1 - y0) > 0.15 ? 'attends' : 'ignores'].join(' '); })()" 2>&1 | tail -1)
  case "$q" in *"moves tailor attends"*) echo "ok   idle life  $q";; *) echo "FAIL idle life: '$q'"; fail=1;; esac;; esac
# v3.44 focus HUD + caption chunks + highlight rule (tests/overlay-hud): no badge / clock, one counter only while it counts, 2–4-word chunks, THE white in *The air*, one CAPHL, safe zone, dodge off the close-up's torso
case " $names " in *" overlay-hud "*)
  oh=$(node render.mjs overlay-hud.html --probe "(() => { const vis = t => { whatif.seek(t); return [...document.querySelectorAll('.stat')].filter(e => e.style.display !== 'none' && +e.style.opacity > 0.02).map(e => e.querySelector('.l').textContent).join('+') || '-'; };
    const hud = [1, 3.5, 5.5, 7].map(vis).join(','); whatif.seek(1); const pos1 = document.getElementById('cap').className, ph = document.getElementById('phase').textContent || '-', bd = document.getElementById('badge').style.display || 'shown';
    whatif.seek(5.2); const pos2 = document.getElementById('cap').className;
    const ch = BEATS.map(b => { const d = document.createElement('div'); d.innerHTML = markup(b.text); const ws = [...d.querySelectorAll('.w')]; return capChunks(ws).map(p => p.map(i => ws[i].textContent).join(' ')); }).flat();
    const bad = ch.filter(c => { const w = c.split(' '); return w.length > 4 || (w.length > 1 && !/[.,!?]$/.test(c) && isFWord(w[w.length - 1])) || /\\d$/.test(c); });
    const d = document.createElement('div'); d.innerHTML = markup('*The air* burns'); const hl = [...d.querySelectorAll('.w')].map(w => w.classList.contains('hl') ? 1 : 0).join('');
    return [hud, bd, ph, pos1, pos2, hl, qaCapHL().length, bad.length, ch.join(' / ')].join('|'); })()" 2>&1 | tail -1 | tr -d '"')
  IFS='|' read -r h1 h2 h3 h4 h5 h6 h7 h8 h9 <<< "$oh"
  if [ "$h1" = "Impact in,Fuel,-,Impact in" ] && [ "$h2" = none ] && [ "$h3" = - ] && [ "$h4" = safe ] && [ "$h5" != safe ] && [ "$h6" = 010 ] && [ "$h7" = 1 ] && [ "$h8" = 0 ]; then echo "ok   focus HUD + captions  counters $h1 · close-up caption → $h5 · chunks: $h9"
  else echo "FAIL focus HUD + captions: '$oh'"; fail=1; fi;;
esac
# v3.44 sound dynamics (tests/sound-dynamics): impact at 6 s, cut sounds at 2 and 3.2 (dense → quieter), none in the hush before the hit; the 0.25 s before the hit ≥ 10 dB quieter than the bed, sub-drop on the hit
case " $names " in *" sound-dynamics "*)
  sp=$(node render.mjs sound-dynamics.html --probe "JSON.stringify([impactTimes(), AUDIO.hits.filter(h => h.k === 'cuthit').map(h => +h.t.toFixed(2)), AUDIO.hits.some(h => h.k === 'whoosh' && Math.abs(h.t - 8.68) < 0.05)])" 2>&1 | tail -1)
  timeout 600 node render.mjs sound-dynamics.html --audio sd.wav > sd.log 2>&1
  sl=$(python3 -c "
import subprocess, numpy as np
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'sd.wav', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout, dtype='<i2').astype(float) / 32768
r = lambda t0, t1: np.sqrt((a[int(t0 * 48000):int(t1 * 48000)] ** 2).mean()) + 1e-9
def lo(t0, t1):
    s = a[int(t0 * 48000):int(t1 * 48000)]; f = np.fft.rfftfreq(len(s), 1 / 48000); return np.abs(np.fft.rfft(s))[(f > 18) & (f < 90)].sum() / len(s)
print('%.1f %.1f' % (20 * np.log10(r(3.6, 4.4) / r(5.73, 5.98)), lo(6.0, 7.0) / max(1e-12, lo(3.6, 4.4))))" 2>&1)
  set -- $sl
  if [ "$sp" = '"[[6],[2,3.2],true]"' ] && ! grep -q 'PAGE ERRORS' sd.log && python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) >= 10 and float(sys.argv[2]) >= 3 else 1)" $sl 2>/dev/null; then echo "ok   sound dynamics  impact $sp · hush ${1} dB under the bed · sub ×${2}"
  else echo "FAIL sound dynamics: probe $sp · levels '$sl'"; tail -3 sd.log; fail=1; fi;;
esac
# v3.44 directing (tests/direction): CFG.autoCut splits the long shot and cuts to 'you' on "you notice", reactCut() lets 'you' react, the directing QA reports exactly
#   HOOK · PACING (the cuts: false shot 5.4–9.4 s) · YOU · MISMATCH · ENDCARD
case " $names " in *" direction "*)
  dq=$(node render.mjs direction.html --probe 'JSON.stringify({ ac: AUTOCUTS, rx: (TRACK.you.rig._rx ?? []).length, n: CUTS.length, qa: qaDirect() })' 2>&1 | tail -1)
  dr=$(printf '%s' "$dq" | python3 -c "
import json, re, sys
try: d = json.loads(json.loads(sys.stdin.read()))
except Exception as e: print('bad probe output'); sys.exit()
qa = sorted(l.split(' ')[0] + ((' ' + re.search(r'\(([\d.]+–[\d.]+) s\)', l).group(1)) if l.startswith('PACING') else '') for l in d['qa'])
you = any(a['kind'] == 'react' and a.get('who') == 'you' for a in d['ac'])
print('ok' if qa == ['ENDCARD', 'HOOK', 'MISMATCH', 'PACING 5.40–9.40', 'YOU'] and you and d['rx'] >= 1 and d['n'] >= 11 else 'got ' + ' · '.join(qa) + ' | you cut %s | react %s | cuts %s' % (you, d['rx'], d['n']))" 2>&1)
  if [ "$dr" = ok ]; then echo "ok   directing  autoCut → 'you' · reactCut · HOOK PACING YOU MISMATCH ENDCARD"; else echo "FAIL directing: $dr"; fail=1; fi;;
esac
# cover stage: thumbnails (THUMB, A/B variants → cover-b.jpg …) of example + every scene with an A/B THUMB array; COVERS=all = every scene that defines THUMB
cv=""; for s in $names; do case "$s" in example) cv="$cv $s";; *) [ -f "$s.html" ] || continue; if [ "${COVERS:-}" = all ]; then grep -q '^const THUMB' "$s.story.js" && cv="$cv $s"; else grep -q '^const THUMB = \[' "$s.story.js" && cv="$cv $s"; fi;; esac; done
cover() { s=$1; rm -f "cover_$s.jpg" "cover_$s"-[a-h].jpg; timeout 300 node render.mjs "$s.html" --cover "cover_$s.jpg" > "cover_$s.log" 2>&1; n=$(grep -c '^const THUMB = \[' "$s.story.js" 2>/dev/null); want=$(( n > 0 ? 2 : 1 ))
  if grep -q "PAGE ERRORS\|PAGE DID NOT START" "cover_$s.log" || [ "$(ls "cover_$s.jpg" "cover_$s"-[a-h].jpg 2>/dev/null | wc -l)" -lt "$want" ]; then echo "FAIL cover $s"; grep -A6 "PAGE" "cover_$s.log" | head -8; else echo "ok   cover $s  $(ls "cover_$s.jpg" "cover_$s"-[a-h].jpg 2>/dev/null | wc -l | tr -d ' ') image(s)"; fi; }
export -f cover
if [ -n "$cv" ]; then out=$(printf '%s\n' $cv | xargs -P "$J" -I{} bash -c 'cover "$1"' _ {}); echo "$out"; echo "$out" | grep -q '^FAIL' && fail=1; fi
# v3.44 cover styles (tests/cover-styles): four variants → four images, styles split · number · frame · an automatic pick
case " $names " in *" cover-styles "*) cs=$(node render.mjs cover-styles.html --probe "THV.map(coverStyle).join(',')" 2>&1 | tail -1 | tr -d '"'); nc=$(ls cover_cover-styles.jpg cover_cover-styles-[a-h].jpg 2>/dev/null | wc -l | tr -d ' ')
  case "$cs" in split,number,frame,split|split,number,frame,number|split,number,frame,frame|split,number,frame,pop|split,number,frame,rays) [ "$nc" = 4 ] && echo "ok   cover styles  $cs · $nc images" || { echo "FAIL cover styles: $nc images"; fail=1; };; *) echo "FAIL cover styles: '$cs'"; fail=1;; esac;; esac
# channel handle: default '@whatifthishappenedscenarios' in every video, CFG.channel overrides it (tests/signs-beams)
chan() { node render.mjs "$1.html" --probe "document.getElementById('chan').textContent" 2>&1 | tail -1; }
case " $names " in *" example "*) c=$(chan example); case "$c" in *@whatifthishappenedscenarios*) echo "ok   channel default";; *) echo "FAIL channel default: '$c'"; fail=1;; esac;; esac
case " $names " in *" signs-beams "*) c=$(chan signs-beams); case "$c" in *@signs.test*) echo "ok   channel CFG.channel";; *) echo "FAIL channel CFG.channel: '$c'"; fail=1;; esac;; esac
# v2.48 narrator voice by category (no synthesis, no API call)
cp "$R/voice.py" .
for c in "story:Denzel" "explain:Adam" "conspiracy:Declan Sage" "horror:Storm Styles" "series:JM" "truecrime:Declan Sage" "history:Adam"; do
  k=${c%%:*}; want=${c#*:}; sed -n '/@STORY-BEGIN/,/@STORY-END/p' template.html | sed '1d;$d' > "vp_$k.story.js"
  if [ "$k" = series ]; then sed -i "s#  series: null,#  series: { name: 'Test', ep: 2 },#" "vp_$k.story.js"; else sed -i "s#  kind: 'story',#  kind: '$k',#" "vp_$k.story.js"; fi
  got=$(ELEVENLABS_API_KEY=test python3 voice.py "vp_$k" --which 2>&1)
  case "$got" in *"$want"*) echo "ok   voice $k → $want";; *) echo "FAIL voice $k: $got"; fail=1;; esac
done
echo "work folder: $W"; exit $fail
