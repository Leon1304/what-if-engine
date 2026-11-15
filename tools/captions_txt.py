#!/usr/bin/env python3
"""Posting texts of one video as a plain text file for the release (next to the MP4 and the covers).

  python3 tools/captions_txt.py <slug> [out.txt]   (default: <slug>-captions.txt)

Reads gallery/captions/<slug>.json ({ youtube: { title, description, tags }, instagram, tiktok, hooks })
and writes copy-ready blocks: YouTube title, description, tags (comma-separated, as for the Studio field),
Instagram caption, TikTok caption, alternative hooks. The workflows `captions` (push of gallery/captions/*.json)
and `render` (after the encode) upload it to the release render-<slug> as <slug>-captions.txt.
"""
import json, sys, pathlib

def text(slug: str) -> str:
    root = pathlib.Path(__file__).resolve().parent.parent
    c = json.loads((root / 'gallery' / 'captions' / f'{slug}.json').read_text(encoding='utf-8'))
    yt = c.get('youtube', {}) or {}
    tags = yt.get('tags', [])
    tl = [t.strip() for t in tags] if isinstance(tags, list) else [t.strip() for t in str(tags).split(',')]
    tags = ','.join(tl); n = len(tags) + 2 * sum(' ' in t for t in tl)   # YouTube counting: commas + 2 per tag with a space (as tags.py)
    rule = '=' * 60
    parts = [f'{slug} – posting texts', rule,
             'YOUTUBE SHORTS – TITLE', yt.get('title', ''), '',
             'YOUTUBE SHORTS – DESCRIPTION', yt.get('description', ''), '',
             f'YOUTUBE SHORTS – TAGS (Studio field "Tags", {n}/500 by YouTube counting)', tags, '', rule,
             'INSTAGRAM REELS – CAPTION', c.get('instagram', ''), '', rule,
             'TIKTOK – CAPTION', c.get('tiktok', ''), '', rule,
             'ALTERNATIVE HOOKS'] + [f'- {h}' for h in c.get('hooks', [])]
    return '\n'.join(parts).rstrip() + '\n'

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    slug = sys.argv[1]; out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else f'{slug}-captions.txt')
    out.write_text(text(slug), encoding='utf-8'); print(f'wrote {out}')
