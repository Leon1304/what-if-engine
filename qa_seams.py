#!/usr/bin/env python3
"""v3.1 QA: pops at the borders between render chunks (render.mjs --seams N runs it after the encode).
qa_seams.py <frames dir> --borders i,j,…  → "CAND <i> <ratio>" for every border frame i whose change from frame i-1 stands out against
                                             the changes between the neighbouring frames (i-2→i-1, i→i+1, i+1→i+2), worst first; exit 0 always.
qa_seams.py --diff a.jpg b.jpg            → "SAME <share>" or "DIFF <share> of the pixels differ" (the stored frame vs. the same frame rendered again).
A camera cut on a border also stands out; render.mjs tells it apart by rendering the frame again (a cut renders the same, a seam does not)."""
import sys, os, subprocess
try:
    import numpy as np
except ImportError:
    print('seams: skipped (numpy missing)', file=sys.stderr); sys.exit(0)

def gray(path, w=270):   # small grayscale copy: enough to see a pop, fast
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={w}:-2', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).astype(np.float32).reshape(-1, w)

if sys.argv[1] == '--diff':
    a, b = (gray(p, 540) for p in sys.argv[2:4])
    if a.shape != b.shape: print('DIFF size'); sys.exit(0)
    share = float((np.abs(a - b) > 12).mean())   # JPEG noise stays far below 12 grey levels; a moved hair, hand or prop does not
    print(f'DIFF {share * 100:.2f} %' if share > 0.0005 else f'SAME {share * 100:.3f} %'); sys.exit(0)

d = sys.argv[1]; B = [int(x) for x in sys.argv[sys.argv.index('--borders') + 1].split(',') if x]
f = lambda i: os.path.join(d, f'f{i:05d}.jpg')
cache = {}
def G(i):
    if i not in cache: cache[i] = gray(f(i)) if os.path.exists(f(i)) else None
    return cache[i]
def ch(i):   # change from frame i-1 to frame i (mean absolute grey difference)
    a, b = G(i - 1), G(i)
    return None if a is None or b is None else float(np.abs(b - a).mean())
out = []
for i in B:
    c = ch(i); nb = [x for x in (ch(i - 1), ch(i + 1), ch(i + 2)) if x is not None]
    if c is None or len(nb) < 2: continue
    base = float(np.median(nb)); r = c / (base + 0.3)
    if c > 1.8 * base + 0.6: out.append((r, i))
    for k in (i - 2, i - 1, i): cache.pop(k, None)   # keep memory flat on long videos
for r, i in sorted(out, reverse=True): print(f'CAND {i} {r:.1f}')
print(f'seams: {len(B)} borders, {len(out)} suspect', file=sys.stderr)
