#!/usr/bin/env python3
# upload.py — publish rendered videos to YouTube (scheduled) and Instagram Reels (when due), run by .github/workflows/publish.yml
#   renders/<slug>.post.json:
#     { "publishAt": "2026-11-14T17:00:00+01:00",            # optional; without it the video goes out right away
#       "youtube":   { "title": "…", "description": "…", "tags": ["what if", …], "privacy": "public", "thumb": "b" },   # thumb: a | b (A/B cover) – optional
#       "instagram": { "caption": "… #whatif" } }            # leave a platform out to skip it
#   python3 upload.py --due            → every post.json whose video is rendered and not yet published (state: renders/<slug>.published.json)
#   python3 upload.py --slug <slug>    → just this one (ignores publishAt for Instagram)
#   python3 upload.py --auth-youtube   → one-time: prints the consent link and turns the returned code into YT_REFRESH_TOKEN
# Secrets (GitHub → Settings → Secrets → Actions): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN · IG_USER_ID, IG_TOKEN (long-lived)
# YouTube: uploaded as private with publishAt (YouTube publishes it at that time). Instagram has no scheduling API → posted by the hourly run once publishAt has passed.
import datetime as dt, glob, json, os, sys, time, urllib.parse, urllib.request
try:
    from tags import fit_tags   # trims the tag list to YouTube's 500-character limit (commas and quotes count)
except ImportError:
    fit_tags = lambda t: t

REPO = os.environ.get('GITHUB_REPOSITORY', 'Leon1304/what-if-engine')
args = sys.argv[1:]
opt = lambda k, d=None: args[args.index('--' + k) + 1] if '--' + k in args else d


def http(url, data=None, headers=None, method=None, raw=False):
    if isinstance(data, dict): data = json.dumps(data).encode(); headers = {'Content-Type': 'application/json', **(headers or {})}
    elif isinstance(data, str): data = data.encode()
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=600) as r:
        body = r.read(); return (r, body) if raw else (json.loads(body) if body else {})


def form(url, fields):
    return http(url, urllib.parse.urlencode(fields), {'Content-Type': 'application/x-www-form-urlencoded'})


if '--auth-youtube' in args:   # one-time OAuth: create an OAuth client (type "Desktop app") in Google Cloud with the YouTube Data API v3 enabled
    cid, sec = os.environ.get('YT_CLIENT_ID') or input('client id: ').strip(), os.environ.get('YT_CLIENT_SECRET') or input('client secret: ').strip()
    q = urllib.parse.urlencode({'client_id': cid, 'redirect_uri': 'http://localhost', 'response_type': 'code', 'access_type': 'offline', 'prompt': 'consent', 'scope': 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube'})
    print('1. Open and allow:\n   https://accounts.google.com/o/oauth2/v2/auth?' + q + '\n2. The browser then shows an error page on localhost – copy the "code=…" value from its address bar.')
    code = urllib.parse.unquote(input('code: ').strip())
    tok = form('https://oauth2.googleapis.com/token', {'code': code, 'client_id': cid, 'client_secret': sec, 'redirect_uri': 'http://localhost', 'grant_type': 'authorization_code'})
    print('\nYT_REFRESH_TOKEN =', tok.get('refresh_token')); sys.exit(0)


def asset(slug, name):   # release asset of the render workflow (public repo → direct download URL)
    return f'https://github.com/{REPO}/releases/download/render-{slug}/{name}'


def qa_open(slug):   # v3.24: the render workflow marks a release as pre-release when the finished frames still have open QA lines (LINES / SEAM)
    try:
        h = {'Accept': 'application/vnd.github+json'}; tok = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
        if tok: h['Authorization'] = f'Bearer {tok}'
        with urllib.request.urlopen(urllib.request.Request(f'https://api.github.com/repos/{REPO}/releases/tags/render-{slug}', headers=h), timeout=30) as r:
            return bool(json.load(r).get('prerelease'))
    except Exception as e:
        print(f'  {slug}: could not read the release state ({e}) – not posting'); return True


def exists(url):
    try: http(url, method='HEAD', raw=True); return True
    except Exception: return False


def youtube(slug, P, publish_at):
    cid, sec, rt = (os.environ.get(k) for k in ('YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'))
    if not (cid and sec and rt): print('  youtube: secrets missing – skipped'); return None
    tok = form('https://oauth2.googleapis.com/token', {'client_id': cid, 'client_secret': sec, 'refresh_token': rt, 'grant_type': 'refresh_token'})['access_token']
    Y = P['youtube']; video = urllib.request.urlopen(asset(slug, f'{slug}.mp4'), timeout=600).read()
    status = {'privacyStatus': 'private' if publish_at else Y.get('privacy', 'public'), 'selfDeclaredMadeForKids': False}
    if publish_at: status['publishAt'] = publish_at.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    meta = {'snippet': {'title': Y['title'][:100], 'description': Y.get('description', ''), 'tags': fit_tags(Y.get('tags', [])), 'categoryId': str(Y.get('category', 24)), 'defaultLanguage': P.get('lang', 'en')}, 'status': status}
    r, _ = http('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', meta,
                {'Authorization': 'Bearer ' + tok, 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': str(len(video))}, 'POST', raw=True)
    vid = http(r.headers['Location'], video, {'Authorization': 'Bearer ' + tok, 'Content-Type': 'video/mp4'}, 'PUT')['id']
    th = Y.get('thumb', 'a'); cover = f'{slug}-cover.jpg' if th == 'a' else f'{slug}-cover-{th}.jpg'
    try:   # custom thumbnails need a verified channel; Shorts show them in search/channel pages
        http(f'https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}', urllib.request.urlopen(asset(slug, cover)).read(), {'Authorization': 'Bearer ' + tok, 'Content-Type': 'image/jpeg'}, 'POST')
    except Exception as e: print('  youtube: thumbnail not set –', e)
    print(f'  youtube: https://youtube.com/shorts/{vid}' + (f' (goes public {status["publishAt"]})' if publish_at else '')); return vid


def instagram(slug, P):
    uid, tok = os.environ.get('IG_USER_ID'), os.environ.get('IG_TOKEN')
    if not (uid and tok): print('  instagram: secrets missing – skipped'); return None
    G = 'https://graph.facebook.com/v21.0'; name = f'{slug}-ig.mp4' if exists(asset(slug, f'{slug}-ig.mp4')) else f'{slug}.mp4'
    c = form(f'{G}/{uid}/media', {'media_type': 'REELS', 'video_url': asset(slug, name), 'caption': P['instagram'].get('caption', ''), 'share_to_feed': 'true', 'access_token': tok})['id']
    for _ in range(60):   # Instagram fetches and processes the video first
        st = http(f'{G}/{c}?fields=status_code&access_token={tok}').get('status_code')
        if st == 'FINISHED': break
        if st == 'ERROR': raise RuntimeError('instagram processing failed')
        time.sleep(10)
    mid = form(f'{G}/{uid}/media_publish', {'creation_id': c, 'access_token': tok})['id']
    print(f'  instagram: published {mid}'); return mid


def run(slug, force=False):
    P = json.load(open(f'renders/{slug}.post.json', encoding='utf-8')); done_f = f'renders/{slug}.published.json'
    done = json.load(open(done_f)) if os.path.exists(done_f) else {}
    if not exists(asset(slug, f'{slug}.mp4')): print(f'{slug}: not rendered yet'); return False
    if not force and qa_open(slug): print(f'{slug}: release is a pre-release (open QA warnings in the finished frames) – fix and re-render, or --slug to post anyway'); return False
    pa = dt.datetime.fromisoformat(P['publishAt']) if P.get('publishAt') else None
    if pa and pa.tzinfo is None: pa = pa.replace(tzinfo=dt.timezone.utc)
    now, changed = dt.datetime.now(dt.timezone.utc), False
    print(slug + (f' · publishAt {pa.isoformat()}' if pa else ''))
    if 'youtube' in P and 'youtube' not in done:
        future = pa if pa and pa > now + dt.timedelta(minutes=20) else None
        v = youtube(slug, P, future)
        if v: done['youtube'] = v; changed = True
    if 'instagram' in P and 'instagram' not in done and (force or not pa or pa <= now):
        v = instagram(slug, P)
        if v: done['instagram'] = v; changed = True
    if changed: json.dump(done, open(done_f, 'w'), indent=1)
    return changed


if __name__ == '__main__':
    if opt('slug'): run(opt('slug'), force=True)
    elif '--due' in args:
        for f in sorted(glob.glob('renders/*.post.json')):
            try: run(os.path.basename(f)[:-10])
            except Exception as e: print('  error:', e)
    else: print(__doc__ or 'see the header of upload.py')
