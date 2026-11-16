// Eine Welt = ein iframe mit sandbox/world.html (Engine im Live-Modus). Die Hülle hält mehrere davon:
// die ruhige Stadt (bleibt im Hintergrund geladen → „Stadt zurücksetzen“ ist sofort da), die aktive Szene und eine, die gerade lädt.
let seq = 0;
const WORLD_URL = new URL('../world.html', import.meta.url).href;

export function camHash(c) {   // cam() → Hash-Wert az,el,dist,atX,atZ,fov
  if (!c) return '';
  const r = v => Math.round(v * 100) / 100;
  return [r(c.az), r(c.el), r(c.dist), r(c.at[0]), r(c.at[2]), r(c.fov)].join(',');
}

export class World {
  constructor(host, params, { onError } = {}) {
    this.params = params; this.id = ++seq; this.api = null; this.win = null; this.dead = false; this.audio = null;
    const q = new URLSearchParams(); for (const [k, v] of Object.entries(params)) if (v != null && v !== '') q.set(k, v);
    this.hash = q.toString();
    const f = this.frame = document.createElement('iframe');
    f.className = 'world loading'; f.title = '3D-Welt'; f.setAttribute('allow', 'autoplay');
    f.src = `${WORLD_URL}?w=${this.id}#${this.hash}`;   // ?w= erzwingt eine neue Seite (nur ein anderer Hash würde nicht neu laden)
    host.appendChild(f);
    this.t0 = performance.now();
    this.ready = this._wait(onError);
  }
  async _wait(onError) {
    // whatif.live gibt es erst, wenn die Seite fertig gebaut ist (Physik, Massen-Simulation laufen vorher per top-level await)
    let hooked = null;
    while (!this.dead) {
      const w = this.frame.contentWindow, d = w?.document;   // contentWindow bleibt dasselbe Objekt, das Dokument wechselt beim Laden
      if (d && d !== hooked && /world\.html/.test(d.URL)) {   // Fehler der Welt in der Konsole der Hülle sichtbar machen
        hooked = d;
        w.addEventListener('error', e => { console.error('[Welt]', e.message); onError?.(e.message); });
        w.addEventListener('unhandledrejection', e => { console.error('[Welt]', String(e.reason?.message ?? e.reason)); onError?.(String(e.reason)); });
      }
      if (w?.whatif?.live) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (this.dead) throw new Error('abgebrochen');
    this.win = this.frame.contentWindow; this.api = this.win.whatif.live;
    // ein Bild muss gezeichnet sein, bevor umgeschaltet wird: zwei rAF im iframe abwarten
    await new Promise(r => this.win.requestAnimationFrame(() => this.win.requestAnimationFrame(r)));
    this.loadMs = performance.now() - this.t0;
    return this;
  }
  show(on) {
    this.frame.classList.toggle('loading', !on); this.frame.classList.toggle('active', !!on);
    this.frame.tabIndex = on ? 0 : -1;
  }
  destroy() {
    this.dead = true; this.audio = null;
    try { this.api?.pause(); } catch (e) {}
    this.frame.src = 'about:blank'; setTimeout(() => this.frame.remove(), 50);
  }
}
