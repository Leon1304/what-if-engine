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
# v3.25 ElevenLabs music + sounds (EL_FAKE=1: sine tones instead of requests): short sections merge, the track plays, a 'none' segment stays silent
case " $names " in *" el-audio "*)
  cp "$R/elaudio.py" .; cp el-audio.story.js elf.story.js; cp el-audio.scene.js elf.scene.js
  env -u ELEVENLABS_API_KEY -u XI_API_KEY EL_FAKE=1 python3 assemble.py elf --title "EL" --no-voice > elf.log 2>&1
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
# cover stage: thumbnails (THUMB, A/B variants → cover-b.jpg …) of example + every scene with an A/B THUMB array; COVERS=all = every scene that defines THUMB
cv=""; for s in $names; do case "$s" in example) cv="$cv $s";; *) [ -f "$s.html" ] || continue; if [ "${COVERS:-}" = all ]; then grep -q '^const THUMB' "$s.story.js" && cv="$cv $s"; else grep -q '^const THUMB = \[' "$s.story.js" && cv="$cv $s"; fi;; esac; done
cover() { s=$1; rm -f "cover_$s.jpg" "cover_$s"-[a-h].jpg; timeout 300 node render.mjs "$s.html" --cover "cover_$s.jpg" > "cover_$s.log" 2>&1; n=$(grep -c '^const THUMB = \[' "$s.story.js" 2>/dev/null); want=$(( n > 0 ? 2 : 1 ))
  if grep -q "PAGE ERRORS\|PAGE DID NOT START" "cover_$s.log" || [ "$(ls "cover_$s.jpg" "cover_$s"-[a-h].jpg 2>/dev/null | wc -l)" -lt "$want" ]; then echo "FAIL cover $s"; grep -A6 "PAGE" "cover_$s.log" | head -8; else echo "ok   cover $s  $(ls "cover_$s.jpg" "cover_$s"-[a-h].jpg 2>/dev/null | wc -l | tr -d ' ') image(s)"; fi; }
export -f cover
if [ -n "$cv" ]; then out=$(printf '%s\n' $cv | xargs -P "$J" -I{} bash -c 'cover "$1"' _ {}); echo "$out"; echo "$out" | grep -q '^FAIL' && fail=1; fi
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
