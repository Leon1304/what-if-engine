#!/bin/bash
# Räumt den Projektordner nach jedem Video auf (Skill Abschnitt 5c, Leons Vorgabe ab 18.11.2026).
#   bash tools/cleanup.sh [--keep <slug>] [--dry] [--hours N]
# 1. work/ im Haupt-Checkout: alles löschen, was nicht mit <slug> beginnt und seit N Stunden (Standard 6) unverändert ist
#    (Stimm-Caches .voice/.elaudio bleiben).
# 2. .claude/worktrees/*: alte Arbeitskopien früherer Sitzungen entfernen. Commits, die nicht in origin/main sind,
#    werden vorher als Branch archiv/<branch> nach GitHub gepusht (und dort geprüft).
#    Nie angefasst: der Worktree, aus dem das Skript läuft; gesperrte Worktrees einer noch laufenden Sitzung;
#    Worktrees mit Änderungen in den letzten N Stunden; Worktrees mit nicht eingecheckten Änderungen (nur gemeldet).
# Läuft mit macOS-bash 3.2 (keine GNU-Tools nötig).
set -u
KEEP= DRY= HOURS=6
while [ $# -gt 0 ]; do
  case "$1" in
    --keep) KEEP="${2:-}"; shift ;;
    --dry) DRY=1 ;;
    --hours) HOURS="${2:-6}"; shift ;;
    *) echo "unbekannt: $1" >&2; exit 2 ;;
  esac; shift
done
MIN=$((HOURS * 60))
COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || { echo "kein Git-Repo" >&2; exit 1; }
ROOT=$(dirname "$COMMON")
HERE=$(git rev-parse --show-toplevel)
kb() { du -sk "$1" 2>/dev/null | cut -f1; }
FREED=0 SKIPPED=
run() { if [ -n "$DRY" ]; then echo "  (dry) $*"; else "$@"; fi; }
recent() { [ -n "$(find "$1" -mmin -"$MIN" -not -path '*/node_modules/*' -print 2>/dev/null | head -1)" ]; }

# --- 1. work/ ---
if [ -d "$ROOT/work" ]; then
  for p in "$ROOT"/work/* "$ROOT"/work/.[!.]*; do
    [ -e "$p" ] || continue
    n=$(basename "$p")
    case "$n" in .voice|.elaudio) continue ;; esac   # Stimm-Caches: neu erzeugen kostet ElevenLabs-Credits
    if [ -n "$KEEP" ]; then case "$n" in "$KEEP"|"$KEEP".*|"$KEEP"-*|."$KEEP".*) continue ;; esac; fi
    recent "$p" && continue
    s=$(kb "$p"); FREED=$((FREED + ${s:-0}))
    run rm -rf "$p"
  done
fi

# --- 2. Worktrees ---
git -C "$ROOT" fetch -q origin main 2>/dev/null
git -C "$ROOT" worktree list --porcelain | awk '/^worktree /{print substr($0,10)}' | while read -r w; do
  case "$w" in "$ROOT"/.claude/worktrees/*) ;; *) continue ;; esac
  [ "$w" = "$HERE" ] && continue
  id=$(basename "$w")
  if [ ! -d "$w" ]; then continue; fi
  gd=$(git -C "$w" rev-parse --path-format=absolute --git-dir 2>/dev/null) || continue
  if [ -f "$gd/locked" ]; then
    pid=$(sed -n 's/.*pid \([0-9][0-9]*\).*/\1/p' "$gd/locked" | head -1)
    if [ -z "$pid" ] || kill -0 "$pid" 2>/dev/null; then echo "  bleibt: $id (Sitzung läuft noch)"; continue; fi
  fi
  if recent "$w"; then echo "  bleibt: $id (in den letzten ${HOURS} h geändert)"; continue; fi
  # nicht eingecheckt: Symlinks tts/node_modules und node_modules-Ordner zählen nicht
  dirty=$(git -C "$w" status --porcelain | grep -v -E '^\?\? (tts|node_modules)/?$')
  if [ -n "$dirty" ]; then echo "  bleibt: $id (nicht eingecheckte Änderungen: $(echo "$dirty" | wc -l | tr -d ' ') Dateien)"; continue; fi
  b=$(git -C "$w" branch --show-current)
  head=$(git -C "$w" rev-parse HEAD)
  ahead=$(git -C "$ROOT" rev-list --count "origin/main..$head")
  if [ "$ahead" -gt 0 ]; then
    ref="archiv/${b:-$id}"
    if [ -n "$DRY" ]; then echo "  (dry) push $ref ($ahead Commits)"; else
      git -C "$ROOT" push -q origin "${head}:refs/heads/${ref}" 2>/dev/null
      remote=$(git -C "$ROOT" ls-remote origin "refs/heads/${ref}" | cut -f1)
      if [ "$remote" != "$head" ]; then echo "  bleibt: $id (Push nach $ref fehlgeschlagen)"; continue; fi
      echo "  gesichert: $ref ($ahead Commits)"
    fi
  fi
  s=$(kb "$w")
  run git -C "$ROOT" worktree remove --force "$w" && echo "  entfernt: $id ($((s / 1024)) MB)"
  [ -n "$b" ] && [ -z "$DRY" ] && git -C "$ROOT" branch -D -q "$b" 2>/dev/null
done
run git -C "$ROOT" worktree prune
# lose Dateien (Logs) im Worktree-Ordner
find "$ROOT/.claude/worktrees" -maxdepth 1 -type f -mmin +"$MIN" 2>/dev/null | while read -r f; do run rm -f "$f"; done

echo "CLEANUP: work/ $((FREED / 1024)) MB frei · Ordner jetzt $(du -sh "$ROOT" 2>/dev/null | cut -f1)"
