#!/usr/bin/env python3
# tags.py — YouTube tags that use the full 500-character field, counted the way YouTube counts them
#   (YouTube Data API, videos.snippet.tags: commas between tags count, a tag with a space counts as if wrapped in quotes = +2)
#   python3 tags.py "what if, zombies, zombie apocalypse, …"      → cleaned list, character count, what was cut
#   python3 tags.py --file renders/<slug>.post.json               → checks / trims youtube.tags in place
#   from tags import fit_tags  → fit_tags(list) returns the list trimmed to ≤ 500 (order kept: most important tags first)
import json, re, sys

LIMIT = 500


def tag_cost(t):
    return len(t) + (2 if ' ' in t else 0)


def total(tags):
    return sum(tag_cost(t) for t in tags) + max(0, len(tags) - 1)


def clean(t):
    t = re.sub(r'\s+', ' ', str(t).replace('#', '').replace('"', '').replace('<', '').replace('>', '')).strip(' ,')
    return t[:100]


def fit_tags(tags, limit=LIMIT):
    """dedupe (case-insensitive), clean, keep order, stop before the limit; short tags later in the list still fill the gap"""
    out, seen = [], set()
    for t in tags:
        t = clean(t)
        k = t.lower()
        if not t or k in seen: continue
        if total(out + [t]) > limit: continue
        out.append(t); seen.add(k)
    return out


def main():
    a = sys.argv[1:]
    if not a: print(__doc__ or 'usage: tags.py "a, b, c" | --file post.json'); return
    if a[0] == '--file':
        p = a[1]; P = json.load(open(p, encoding='utf-8')); Y = P.get('youtube', {})
        before = Y.get('tags', []); after = fit_tags(before); Y['tags'] = after
        json.dump(P, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f'{p}: {len(after)} tags, {total(after)}/{LIMIT} characters' + (f' · cut: {", ".join(t for t in before if clean(t) not in after)}' if len(after) < len(before) else ''))
        return
    raw = [x for x in re.split(r'[,\n]', ' '.join(a))]
    fit = fit_tags(raw)
    cut = [clean(x) for x in raw if clean(x) and clean(x) not in fit]
    print(','.join(fit))
    print(f'— {len(fit)} tags, {total(fit)}/{LIMIT} characters (YouTube counting)' + (f' · cut (too long or duplicate): {", ".join(cut)}' if cut else ''))


if __name__ == '__main__':
    main()
