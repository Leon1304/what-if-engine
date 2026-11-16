#!/usr/bin/env bash
# baut sandbox/world.html (eine Engine-Seite für alle Zustände des Spiels) aus world.story.js + world.scene.js
# Ton, Mocap und Modelle werden eingebettet; keine Stimme, keine ElevenLabs-Sounds.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 assemble.py sandbox/world --title "What If Town" --no-voice --no-el
