#!/usr/bin/env python3
"""gallery/build.py — Video-Übersicht (Artifact "WhatIf – Videos") aus renders/ + GitHub-Releases bauen.

    python3 gallery/build.py            # alle Videos abgleichen: neue Cover laden, site/videos.json neu schreiben
    python3 gallery/build.py --changed  # zusätzlich die geänderten Dateien ausgeben
    python3 gallery/build.py --files-json  # Zeile "FILES [...]" = files-Argument für publish_files (patch)

Quellen
  renders/<slug>.html            Titel, Format, Serie, Hook, Endcard-Frage, Länge, Akzentfarbe
  Release render-<slug>          MP4, Cover A/B, SRT, Datum (Download-Links zeigen direkt dorthin)
  gallery/captions/<slug>.json   die gelieferten Posting-Texte (vom /whatif-Skill geschrieben):
                                   { "youtube": {"title", "description", "tags": [..]},
                                     "instagram": "…", "tiktok": "…", "hooks": ["…", "…", "…"] }
                                 fehlt die Datei, werden Texte aus der Story erzeugt (auto: true)
  gallery/previews.json          slug → Link zur Live-Vorschau (Artifact), optional

Ausgabe
  gallery/site/index.html        die Seite (statisch, liest videos.json)
  gallery/site/videos.json       alle Einträge, neueste zuerst
  gallery/site/covers/<slug>.jpg verkleinertes Cover (Artifacts laden keine fremden Bilder)
"""
import html, io, json, os, re, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
G = ROOT / 'gallery'
SITE = G / 'site'
REPO = 'Leon1304/what-if-engine'
DL = f'https://github.com/{REPO}/releases/download'
SKIP = {'selftest'}
HASH = {  # Stand November 2026, siehe SKILL.md Abschnitt 5
    'youtube': '#shorts #viral #trending #youtubeshorts #fyp',
    'instagram': '#reels #viral #explore #reelsinstagram #trending',
    'tiktok': '#fyp #foryou #foryoupage #viral #trending',
}
sys.path.insert(0, str(ROOT))
from tags import fit_tags, total  # noqa: E402


def releases():
    try:
        out = subprocess.run(['gh', 'api', f'repos/{REPO}/releases?per_page=100', '--paginate'],
                             capture_output=True, text=True, timeout=60)
        if out.returncode == 0:
            return json.loads(out.stdout.replace('][', ','))
    except Exception:
        pass
    with urllib.request.urlopen(f'https://api.github.com/repos/{REPO}/releases?per_page=100', timeout=60) as r:
        return json.load(r)


def plain(s):
    s = html.unescape(s or '')
    s = re.sub(r'[*_]', '', s).replace('~', ' ').replace('…', '…')
    return re.sub(r'\s+', ' ', s).strip()


def block(src, name):
    m = re.search(r'const ' + name + r'\s*=\s*([\[{])', src)
    if not m: return ''
    i, depth, q = m.end() - 1, 0, None
    for j in range(i, min(len(src), i + 60000)):
        c = src[j]
        if q:
            if c == '\\': continue
            if c == q and src[j - 1] != '\\': q = None
        elif c in '\'"`': q = c
        elif c in '[{': depth += 1
        elif c in ']}':
            depth -= 1
            if depth == 0: return src[i:j + 1]
    return src[i:i + 4000]


def jstr(s, key):
    m = re.search(r'\b' + key + r"""\s*:\s*(['"])((?:\\.|(?!\1).)*)\1""", s)
    return m.group(2).replace("\\'", "'").replace('\\"', '"') if m else None


def story(slug):
    src = (ROOT / 'renders' / f'{slug}.html').read_text(encoding='utf-8', errors='ignore')
    cfg, end, beats = block(src, 'CFG'), block(src, 'END'), block(src, 'BEATS')
    title = plain((re.search(r'<title>([^<]*)', src) or [None, slug])[1])
    kind = jstr(cfg, 'kind') or 'story'
    if kind not in ('story', 'explain', 'conspiracy', 'history'): kind = 'story'
    dur = float((re.search(r'\bdur:\s*([0-9.]+)', cfg) or [0, 0])[1])
    aspect = jstr(cfg, 'aspect') or '9:16'
    accent = jstr(cfg, 'accent') or '#FFD23F'
    series = None
    m = re.search(r'series:\s*\{([^}]*)', cfg)
    if m:
        series = {'name': jstr(m.group(1), 'name') or '', 'ep': int((re.search(r'ep:\s*(\d+)', m.group(1)) or [0, 1])[1])}
    lines = [plain(jstr(b, 'text') or '') for b in re.findall(r'\{[^{}]*\btext:[^{}]*\}', beats)]
    lines = [l for l in lines if l]
    q = plain(jstr(end, 'q') or '')
    opts = re.search(r'opts:\s*\[([^\]]*)\]', end)
    opts = [plain(o[1]) for o in re.findall(r"""(['"])((?:\\.|(?!\1).)*)\1""", opts.group(1))] if opts else []
    ending = None
    m = re.search(r'ending:\s*\{([^}]*)', end)
    if m: ending = {'type': jstr(m.group(1), 'type'), 'title': plain(jstr(m.group(1), 'title') or '')}
    return dict(title=title, kind=kind, dur=round(dur, 1), aspect=aspect, accent=accent, series=series,
                lines=lines, q=q, opts=opts, ending=ending)


def auto_captions(slug, s):
    hook = s['lines'][1] if len(s['lines']) > 1 else (s['lines'][0] if s['lines'] else s['title'])
    letters = 'ABC'[:max(2, len(s['opts']))] if s['opts'] else ''
    if s['ending']:
        ask = ('You survived. ' if s['ending']['type'] == 'survived' else 'You didn’t make it. ') + 'What would you have done? 👇'
    elif s['q']:
        ask = s['q'] + ' ' + (' · '.join(f'{l}) {o}' for l, o in zip('ABC', s['opts'])) + ' — ' if s['opts'] else '') \
            + ('Comment ' + ', '.join(letters[:-1]) + ' or ' + letters[-1] + ' 👇' if letters else 'Tell me in the comments 👇')
    else:
        ask = 'What would you have done? 👇'
    part = f"Part {s['series']['ep']} of {s['series']['name']}." if s['series'] and s['series']['name'] else ''
    yt_title = s['title'] if len(s['title']) <= 70 else s['title'][:67].rstrip() + '…'
    desc = '\n'.join([x for x in [hook, ask, part] if x] + ['', HASH['youtube']])
    core = re.sub(r'[^\w\s$,]', '', s['title'].lower()).strip()
    words = [w for w in re.split(r'[-\s]+', slug) if w and not w.isdigit()]
    tags = [core, core.replace('what if ', '').replace('what happens if ', ''), ' '.join(words)]
    if s['series'] and s['series']['name']:
        n = s['series']['name'].lower()
        tags += [n, f"{n} part {s['series']['ep']}", f'{n} series']
    tags += {'explain': ['explained', 'how it works', 'science explained', 'what happens if'],
             'conspiracy': ['conspiracy theory', 'myth busted', 'conspiracy explained', 'is it true'],
             'history': ['history', 'history explained', 'history shorts']}.get(s['kind'], ['what if story', 'survival', 'animated story'])
    tags += ['what if', 'what if scenarios', 'what if shorts', 'shorts', '3d animation', 'animation',
             'whatifthishappenedscenarios', 'hypothetical', 'viral', 'trending', 'fyp', 'youtube shorts', 'storytime']
    tags += words + ['what if ' + w for w in words if len(w) > 3]
    tags += ['what would you do', 'would you survive', 'animated short', 'what if video', 'what if animation',
             'scenario', 'cartoon', 'funny animation', 'shorts video', 'viral shorts', 'trending shorts', 'foryou']
    ig = '\n'.join([s['title'], ask + (' Follow for part ' + str(s['series']['ep'] + 1) + '.' if s['series'] and not s['ending'] else ''), '', HASH['instagram']])
    tt = '\n'.join([s['title'], ask, '', HASH['tiktok']])
    hooks = [l for l in s['lines'][1:6] if len(l.split()) >= 4][:3]
    return {'youtube': {'title': yt_title, 'description': desc, 'tags': fit_tags(tags)},
            'instagram': ig, 'tiktok': tt, 'hooks': hooks}


def thumb(url, dst):
    if dst.exists(): return False
    from PIL import Image
    raw = subprocess.run(['curl', '-sSLf', url], capture_output=True, timeout=120).stdout
    if not raw: return False
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w = 432 if im.width < im.height else 768
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'JPEG', quality=80, optimize=True, progressive=True)
    return True


def main():
    changed = []
    rel = {r['tag_name'][7:]: r for r in releases() if r['tag_name'].startswith('render-')}
    prev = json.loads((G / 'previews.json').read_text()) if (G / 'previews.json').exists() else {}
    items = []
    for f in sorted((ROOT / 'renders').glob('*.html')):
        slug = f.stem
        if slug in SKIP or '.' in slug: continue
        s = story(slug)
        r = rel.get(slug)
        assets = {a['name']: a for a in (r or {}).get('assets', [])}
        files = {}
        for key, name in [('mp4', f'{slug}.mp4'), ('coverA', f'{slug}-cover.jpg'), ('coverB', f'{slug}-cover-b.jpg'), ('srt', f'{slug}.srt')]:
            if name in assets: files[key] = {'url': f'{DL}/render-{slug}/{name}', 'size': assets[name]['size']}
        for key, name in [('coverA', 'covers/%s.jpg' % slug), ('coverB', 'covers/%s-b.jpg' % slug)]:
            if key in files and thumb(files[key]['url'], SITE / name): changed.append(name)
            if (SITE / name).exists(): files[key]['thumb'] = name
        cp = G / 'captions' / f'{slug}.json'
        cap = json.loads(cp.read_text()) if cp.exists() else auto_captions(slug, s)
        tags = cap.get('youtube', {}).get('tags', [])
        if isinstance(tags, str): tags = [t.strip() for t in tags.split(',') if t.strip()]
        cap.setdefault('youtube', {})['tags'] = tags
        cap['youtube']['tagChars'] = total(tags)
        items.append({'slug': slug, **{k: s[k] for k in ('title', 'kind', 'dur', 'aspect', 'accent', 'series', 'ending')},
                      'date': (r or {}).get('published_at') or (r or {}).get('created_at'),
                      'status': 'ready' if 'mp4' in files else 'pending', 'files': files,
                      'preview': prev.get(slug), 'captions': cap, 'auto': not cp.exists()})
    items.sort(key=lambda x: (x['date'] or '9999'), reverse=True)
    out = json.dumps({'updated': max([i['date'] or '' for i in items] or ['']), 'videos': items}, ensure_ascii=False, indent=1)
    vj = SITE / 'videos.json'
    if not vj.exists() or vj.read_text() != out:
        vj.write_text(out); changed.append('videos.json')
    ready = sum(i['status'] == 'ready' for i in items)
    print(f'gallery: {len(items)} videos ({ready} with MP4), {sum(i["auto"] for i in items)} with auto captions')
    if '--changed' in sys.argv:
        print('changed: ' + ' '.join(changed) if changed else 'changed: nothing')
    if '--files-json' in sys.argv:  # fertiges files-Argument für publish_files (patch)
        print('FILES ' + json.dumps([{'as': c, 'path': str(SITE / c)} for c in changed]))


if __name__ == '__main__':
    main()
