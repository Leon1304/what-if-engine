#!/usr/bin/env bash
# Smoke test for the engine: builds the example story from template.html and every tests/<name>.story.js + .scene.js,
# renders a few frames of each and fails on any page error.   bash tests/run.sh [name …]   (SMOKE_DIR = work folder)
# v3.1: scenes run in parallel, SMOKE_JOBS at a time (default: half the CPU cores, 1–4). SMOKE_JOBS=1 = one after another.
set -u
R=$(cd "$(dirname "$0")/.." && pwd); W=${SMOKE_DIR:-$(mktemp -d)}; mkdir -p "$W"; cd "$W"
cp "$R/template.html" "$R/assemble.py" "$R/render.mjs" .; ln -sfn "${NODE_MODULES:-$R/node_modules}" node_modules; ln -sfn "$R/sfx" sfx
sed -n '/@STORY-BEGIN/,/@STORY-END/p' template.html | sed '1d;$d' > example.story.js
sed -n '/@SCENE-BEGIN/,/@SCENE-END/p' template.html | sed '1d;$d' > example.scene.js
cp "$R"/tests/*.story.js "$R"/tests/*.scene.js .
names=${*:-example $(cd "$R/tests" && ls *.story.js | sed 's/\.story\.js$//')}
cores=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 2); J=${SMOKE_JOBS:-$(( cores / 2 ))}; [ "$J" -lt 1 ] && J=1; [ -z "${SMOKE_JOBS:-}" ] && [ "$J" -gt 4 ] && J=4
one() {   # one scene → its result in <name>.res (first line "ok …" or "FAIL …")
  s=$1
  if ! python3 assemble.py "$s" --title "Smoke test" --no-voice > "$s.log" 2>&1; then { echo "FAIL $s (assemble)"; tail -6 "$s.log"; } > "$s.res"; return; fi
  timeout 600 node render.mjs "$s.html" --shots 1,4,8 --w 270 --out "shots_$s" >> "$s.log" 2>&1
  if grep -q "PAGE DID NOT START\|PAGE ERRORS" "$s.log" || [ "$(ls shots_$s/*.png 2>/dev/null | wc -l)" -lt 3 ]; then { echo "FAIL $s"; grep -A10 "PAGE" "$s.log" | head -14; } > "$s.res"
  else echo "ok   $s  $(grep -o '"meshes":[0-9]*' "$s.log" | head -1)" > "$s.res"; fi
}
export -f one
echo "smoke: $(echo $names | wc -w) scenes, $J at a time"
rm -f *.res; printf '%s\n' $names | xargs -P "$J" -I{} bash -c 'one "$1"; head -1 "$1.res"' _ {}
fail=0; for s in $names; do [ -f "$s.res" ] || echo "FAIL $s (no result)" > "$s.res"; case "$(head -1 "$s.res")" in ok*) ;; *) cat "$s.res"; fail=1;; esac; done
# v3.2 render plan: interleaved chunks of 10–30 frames by default, one block per shard with CFG.shard: 'block'
ck() { node render.mjs "$1.html" --probe 'window.whatif.plan(12).chunk' 2>&1 | tail -1; }
sed "s#^const CFG = {#const CFG = { shard: 'block',#" example.story.js > plan_block.story.js; cp example.scene.js plan_block.scene.js
python3 assemble.py plan_block --title "Plan" --no-voice > plan_block.log 2>&1; c1=$(ck example); c2=$(ck plan_block)
if [ "$c1" -ge 10 ] 2>/dev/null && [ "$c1" -le 30 ] && [ "$c2" -gt 30 ] 2>/dev/null; then echo "ok   render plan  chunk $c1 · block $c2"; else echo "FAIL render plan: chunk '$c1' · block '$c2'"; fail=1; fi
# v2.48 narrator voice by category (no synthesis, no API call)
cp "$R/voice.py" .
for c in "story:Denzel" "explain:Adam" "conspiracy:Declan Sage" "horror:Storm Styles" "series:JM" "truecrime:Declan Sage"; do
  k=${c%%:*}; want=${c#*:}; sed -n '/@STORY-BEGIN/,/@STORY-END/p' template.html | sed '1d;$d' > "vp_$k.story.js"
  if [ "$k" = series ]; then sed -i "s#  series: null,#  series: { name: 'Test', ep: 2 },#" "vp_$k.story.js"; else sed -i "s#  kind: 'story',#  kind: '$k',#" "vp_$k.story.js"; fi
  got=$(ELEVENLABS_API_KEY=test python3 voice.py "vp_$k" --which 2>&1)
  case "$got" in *"$want"*) echo "ok   voice $k → $want";; *) echo "FAIL voice $k: $got"; fail=1;; esac
done
echo "work folder: $W"; exit $fail
