#!/usr/bin/env bash
# baut die 3D-Welt jedes Falls: krimi/cases/<ordner>/world.html aus world.story.js + world.scene.js (Engine im Live-Modus)
# Ton, Mocap und Modelle werden eingebettet; keine Stimme, keine ElevenLabs-Sounds.   bash krimi/build.sh [ordner …]
set -euo pipefail
cd "$(dirname "$0")/.."
dirs=${*:-$(cd krimi/cases && ls -d */ | tr -d /)}
for d in $dirs; do
  [ -f "krimi/cases/$d/world.scene.js" ] || continue
  python3 assemble.py "krimi/cases/$d/world" --title "Red String – $d" --no-voice --no-el
done
