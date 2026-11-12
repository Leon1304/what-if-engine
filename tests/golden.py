#!/usr/bin/env python3
"""v3.0 reference frames: every test scene's smoke shots are compared with tests/golden/<scene>_<k>.png (small, blurred, so tiny GPU/driver
differences do not count). A frame that changed more than the threshold is reported — so a fix in one place cannot quietly change another scene.
  golden.py <smoke dir>            → CHANGED: / NEW: lines (exit 0; --strict: exit 1 if anything changed)
  golden.py <smoke dir> --update   → writes the current shots as the new references (CI: workflow 'test' with update_golden = true commits them)"""
import sys, os, glob, subprocess
try:
    import numpy as np
except ImportError:
    print('golden: skipped (numpy missing)'); sys.exit(0)
src = sys.argv[1]; upd = '--update' in sys.argv; strict = '--strict' in sys.argv
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'golden'); os.makedirs(G, exist_ok=True)
W, H, TH = 72, 128, 7.5   # compare at 72×128, mean absolute difference in 0–255 grey levels
def small(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=area,gblur=sigma=1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W).astype(np.float32) if len(raw) == W * H else None
changed = new = same = 0
for d in sorted(glob.glob(os.path.join(src, 'shots_*'))):
    name = os.path.basename(d)[6:]
    for k, f in enumerate(sorted(glob.glob(os.path.join(d, 's*.png')))):
        ref = os.path.join(G, f'{name}_{k}.png')
        if upd:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-vf', f'scale={W}:{H}:flags=area', ref]); continue
        if not os.path.exists(ref): new += 1; print(f'NEW: {name} shot {k} has no reference yet'); continue
        a, b = small(f), small(ref)
        if a is None or b is None: continue
        diff = float(np.abs(a - b).mean())
        if diff > TH: changed += 1; print(f'CHANGED: {name} shot {k} differs from its reference by {diff:.1f} (limit {TH}) – intended? then update the references')
        else: same += 1
if upd: print('golden: references written to', G)
else: print(f'golden: {same} unchanged, {changed} changed, {new} without reference')
sys.exit(1 if strict and changed else 0)
