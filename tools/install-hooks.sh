#!/usr/bin/env bash
# Installs the repo's git hooks (v3.24: tools/pre-push = quality gate for renders/*.html) for this clone.
#   bash tools/install-hooks.sh          → git config core.hooksPath tools   (relative: every worktree runs its own tools/pre-push; the config is shared by all worktrees)
#   bash tools/install-hooks.sh --link   → instead symlink .git/hooks/pre-push to this checkout's tools/pre-push (keeps other hooks in .git/hooks working;
#                                          worktrees share .git/hooks, so all of them run THIS checkout's copy)
#   bash tools/install-hooks.sh --off    → remove both again
# Bypass for one push: git push --no-verify
set -eu
ROOT=$(git rev-parse --show-toplevel); cd "$ROOT"
HOOKS=$(cd "$(git rev-parse --git-common-dir)" && pwd)/hooks
chmod +x tools/pre-push
case "${1:-}" in
  --off)
    git config --unset core.hooksPath 2>/dev/null || true
    [ -L "$HOOKS/pre-push" ] && rm "$HOOKS/pre-push"
    echo "hooks off (core.hooksPath unset, $HOOKS/pre-push link removed)"; exit 0;;
  --link)
    mkdir -p "$HOOKS"
    if [ -e "$HOOKS/pre-push" ] && [ ! -L "$HOOKS/pre-push" ]; then echo "$HOOKS/pre-push exists and is not ours – move it away first"; exit 1; fi
    ln -sfn "$ROOT/tools/pre-push" "$HOOKS/pre-push"
    [ -n "$(git config --get core.hooksPath || true)" ] && echo "note: core.hooksPath is set ($(git config --get core.hooksPath)) – git ignores .git/hooks while it is set"
    echo "linked $HOOKS/pre-push → $ROOT/tools/pre-push"; exit 0;;
  "") ;;
  *) echo "usage: bash tools/install-hooks.sh [--link | --off]"; exit 2;;
esac
own=$(ls "$HOOKS" 2>/dev/null | grep -v '\.sample$' || true)
if [ -n "$own" ]; then echo "note: $HOOKS has own hooks ($(echo $own)) – core.hooksPath turns them off; copy them into tools/ or use --link instead"; fi
git config core.hooksPath tools
echo "core.hooksPath = tools → tools/pre-push runs the quality gate (node render.mjs <page> --gate) for every pushed renders/*.html (bypass: git push --no-verify)"
