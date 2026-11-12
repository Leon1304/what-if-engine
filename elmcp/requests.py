# v2.49 ElevenLabs without an API key in the sandbox: voice.py talks to this shim instead of the real `requests`.
#   1) plan:  EL_LOG=el_log.jsonl ELEVENLABS_API_KEY=via-mcp PYTHONPATH=.engine/elmcp python3 assemble.py <slug>
#      → every line voice.py would send (tagged text, model, speed) lands in el_log.jsonl (placeholder audio, nothing is paid)
#   2) generate each unique text once with the ElevenLabs connector (creative_generate_speech, same voice id, eleven_v4, 1 take),
#      download the takes and write a map {text: file.mp3} (EL_MAP)
#   3) build: rm .voice/el-*.npy; EL_MAP=elraw/map.json ELEVENLABS_API_KEY=via-mcp PYTHONPATH=.engine/elmcp python3 assemble.py <slug>
#      → the takes are served at the speed voice.py asks for (ffmpeg atempo), so re-timed lines need no new generation
import json as _json, os, subprocess, numpy as np
class R:
    def __init__(s, c, code=200, text=''): s.status_code = code; s.content = c; s.text = text
def post(url, params=None, headers=None, json=None, timeout=None):
    t = json['text']; sp = json['voice_settings']['speed']
    if os.environ.get('EL_MAP'):
        M = _json.load(open(os.environ['EL_MAP'])); f = M.get(t)
        if not f: return R(b'', 404, 'no take for: ' + t)
        f = f if os.path.isabs(f) else os.path.join(os.path.dirname(os.path.abspath(os.environ['EL_MAP'])), '..', f)
        flt = f'atempo={sp:.4f}' if abs(sp - 1) > 0.005 else 'anull'
        return R(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-af', flt, '-ac', '1', '-ar', '24000', '-f', 's16le', '-'], capture_output=True, check=True).stdout)
    with open(os.environ.get('EL_LOG', 'el_log.jsonl'), 'a') as fh: fh.write(_json.dumps({'url': url, 'body': json}) + '\n')
    n = len(t.split()); return R((np.sin(np.arange(int(24000 * (0.33 * n + 0.2))) * 0.05) * 8000).astype('<i2').tobytes())
