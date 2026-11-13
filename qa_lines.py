#!/usr/bin/env python3
"""v3.0 QA: thin stray lines in rendered frames (a 1–3 px stripe through the picture, like the light-blue line through a screen).
qa_lines.py <frames dir> [--every 15]  → "LINES: …" per frame with a stripe that runs through more than 55 % of the picture; exit 0 always.
A stripe = pixels that differ from BOTH sides 3 px away (an edge between two areas does not count, a pole does not reach that far).
v3.21: a stripe that is there in the next frame too (± 4 px) is scene geometry (wall joint, cable, roof edge) and is not reported; glitches flicker."""
import sys, os, subprocess
try:
    import numpy as np
except ImportError:
    print('lines: skipped (numpy missing)'); sys.exit(0)
d = sys.argv[1]; every = int(sys.argv[sys.argv.index('--every') + 1]) if '--every' in sys.argv else 15
allf = sorted(f for f in os.listdir(d) if f.endswith(('.jpg', '.png'))); files = allf[::every]
def gray(path):
    p = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True)
    w, h = map(int, p.stdout.strip().split(',')[:2])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float32)
hits = []
for f in files:
    I = gray(os.path.join(d, f)); h, w = I.shape; k = 3; m0, m1 = int(h * 0.12), int(h * 0.88)   # skip the HUD bands at top and bottom
    J = I[m0:m1]
    for axis, name in ((1, 'vertical'), (0, 'horizontal')):
        A = J if axis == 1 else J.T
        mid, l, r = A[:, k:-k], A[:, :-2 * k], A[:, 2 * k:]
        D = np.minimum(np.abs(mid - l), np.abs(mid - r)) * (np.sign(mid - l) == np.sign(mid - r))   # differs from both sides the same way
        frac = (D > 22).mean(axis=0)
        for x in np.where(frac > 0.55)[0]:
            hits.append((f, name, int(x + k) + (0 if axis == 1 else m0), float(frac[x])))
def stripes(I, axis):
    h = I.shape[0]; m0, m1 = int(h * 0.12), int(h * 0.88); J = I[m0:m1]; A = J if axis == 1 else J.T; k = 3
    mid, l, r = A[:, k:-k], A[:, :-2 * k], A[:, 2 * k:]
    return (np.minimum(np.abs(mid - l), np.abs(mid - r)) * (np.sign(mid - l) == np.sign(mid - r)) > 22).mean(axis=0), k, m0
def stable(f, name, x):   # v3.21: the same stripe (± 4 px) in the very next frame = a real edge of the scene (wall joint, cable, roof line), not a glitch
    i = allf.index(f)
    if i + 1 >= len(allf): return False
    frac, k, m0 = stripes(gray(os.path.join(d, allf[i + 1])), 1 if name == 'vertical' else 0)
    x0 = x - k - (0 if name == 'vertical' else m0)
    return frac[max(0, x0 - 4):x0 + 5].max(initial=0) > 0.4
seen = set(); geo = 0
for f, name, x, fr in hits:
    key = (name, x // 4)
    if key in seen: continue
    seen.add(key)
    if stable(f, name, x): geo += 1; continue   # steady from frame to frame: scene geometry
    print(f'LINES: {name} stripe at {"x" if name == "vertical" else "y"} = {x} px in {f} (through {fr * 100:.0f} % of the picture) – flickers between frames, check that frame')
if not hits or geo == len(seen): print(f'lines: ok ({len(files)} frames checked' + (f', {geo} steady line(s) = scene edges' if geo else '') + ')')
elif geo: print(f'lines: {geo} steady line(s) skipped (scene edges such as wall joints or cables)')
