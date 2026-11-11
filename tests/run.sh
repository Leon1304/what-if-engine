#!/usr/bin/env bash
# Smoke test for the engine: builds the example story from template.html and every tests/<name>.story.js + .scene.js,
# renders a few frames of each and fails on any page error.   bash tests/run.sh [name …]   (SMOKE_DIR = work folder)
set -u
R=$(cd "$(dirname "$0")/.." && pwd); W=${SMOKE_DIR:-$(mktemp -d)}; mkdir -p "$W"; cd "$W"
cp "$R/template.html" "$R/assemble.py" "$R/render.mjs" .; ln -sfn "${NODE_MODULES:-$R/node_modules}" node_modules; ln -sfn "$R/sfx" sfx
sed -n '/@STORY-BEGIN/,/@STORY-END/p' template.html | sed '1d;$d' > example.story.js
sed -n '/@SCENE-BEGIN/,/@SCENE-END/p' template.html | sed '1d;$d' > example.scene.js
cp "$R"/tests/*.story.js "$R"/tests/*.scene.js .
names=${*:-example $(cd "$R/tests" && ls *.story.js | sed 's/\.story\.js$//')}
fail=0
for s in $names; do
  if ! python3 assemble.py "$s" --title "Smoke test" --no-voice > "$s.log" 2>&1; then echo "FAIL $s (assemble)"; tail -6 "$s.log"; fail=1; continue; fi
  timeout 600 node render.mjs "$s.html" --shots 1,4,8 --w 270 --out "shots_$s" >> "$s.log" 2>&1
  if grep -q "PAGE DID NOT START\|PAGE ERRORS" "$s.log" || [ "$(ls shots_$s/*.png 2>/dev/null | wc -l)" -lt 3 ]; then echo "FAIL $s"; grep -A10 "PAGE" "$s.log" | head -14; fail=1
  else echo "ok   $s  $(grep -o '"meshes":[0-9]*' "$s.log" | head -1)"; fi
done
echo "work folder: $W"; exit $fail
