// Story, part two: „Die Wahrheit über Tannbach“. After the five village notes (part one, Kurt) Kurt hands you his old hand radio.
// Six diary pages of Hannes Brandt (Blender: Tagebuch_1 … 6, userData.diary) tell what really happened; radio messages on channel 7
// come in one after another (each needs enough pages and a few game hours since the last one, only between 7:00 and 23:00).
// It ends at the detonator in the quarry (use 'zuender') with a decision the player makes: tell the truth or take Brandt's money.
// Everything is kept in S.diary (page → day), S.radio (message id → day) and S.flags.ending ('wahrheit' | 'schweigen').

export const DIARY = {
  1: ['14. September', 'Der Gutachter aus der Stadt war wieder da. Er hat die Bohrkerne aus dem Steinbruch gegen das Licht gehalten und gepfiffen. <b>Violett.</b> Wie die Kristalle aus dem alten Stollen am Steinberg – nur viel mehr. Eine ganze Ader, sagt er, quer unter dem Hang durch bis unter das Dorf.<br>Ich habe ihm gesagt, er soll den Mund halten. Gerd lässt mich abends in seiner Werkstatt sitzen, da fragt keiner.'],
  2: ['29. September', 'Die Gemeinde will keine Sprengungen mehr, nicht so nah an den Häusern. Huber hat Unterschriften gesammelt, sogar Kurt hat unterschrieben.<br>Dabei liegt da unten mehr Geld, als das ganze Dorf in hundert Jahren verdient. Wenn die Leute nicht da wären …'],
  3: ['1. Oktober', 'Probesprengung im Stollen am Steinberg – ich wollte sehen, wie die Ader verläuft. <b>Zu viel Pulver.</b> Der halbe Hang ist auf die Passstraße gerutscht. Keiner weiß, dass ich das war.<br>Albers sitzt jetzt oben in der Hütte fest. Ich bete, dass ihm nichts passiert ist.'],
  4: ['18. Oktober', 'Ich habe die Idee mit dem Damm. Seit 1890 hält er, aber das wissen nur die Alten. Ein Gutachten mit meinem Stempel, ein paar Fotos von Rissen – und der Bürgermeister unterschreibt die Räumung.<br>Vier Wochen Ruhe. Mehr brauche ich nicht.'],
  5: ['24. Oktober', 'Das Dorf ist leer. Nur Kurt ist geblieben, der alte Sturkopf, und geht jeden Abend mit der Laterne zum Damm.<br>Die Ladungen im Steinbruch liegen, die <b>Zündmaschine</b> steht bei der Hütte. Ein Druck – und die Ader liegt offen.<br>Und wenn der Hang weiter rutscht als geplant? Dann trifft es die ersten Häuser.'],
  6: ['2. November', 'Ich kann nicht mehr schlafen. Wenn ich zünde, bin ich reich – und Tannbach ist vielleicht weg. Wenn ich es nicht tue, bin ich pleite, und alle erfahren, was ich getan habe.<br>Ich lege die Entscheidung in Gottes Hand. Oder in die Hand von dem, der diese Seiten findet. <b>Die Zündmaschine steht bereit.</b><br>– Hannes Brandt'],
};
const n = g => Object.keys(g.S.diary || {}).length;
// radio messages on channel 7: who speaks, what, and when it can come
export const RADIO = [
  { id: 'lena1', from: '👧 Lena (Notunterkunft)', need: () => true,
    x: '„… Lena hier, aus der Notunterkunft in der Kreisstadt. Hört mich jemand in Tannbach? Oma ist bei mir, es geht ihr gut. Ist Kurt noch im Dorf?<br>Herr Brandt war heute hier und sagt, der Damm kann jeden Tag brechen. Bitte – wer das hört: Bleibt weg vom Steinbruch!“' },
  { id: 'brandt1', from: '🎙️ Unbekannt (Brandt?)', need: g => n(g) >= 1,
    x: '„Albers? Sind Sie das auf Kanal 7? Hier Brandt. Wenn Sie aus der Hütte raus sind: Kommen Sie nicht ins Dorf, der Damm ist gefährlich. Und halten Sie sich von meinem Steinbruch fern. Ende.“' },
  { id: 'bergwacht1', from: '⛑️ Bergwacht Nordwald', need: g => n(g) >= 3,
    x: '„Bergwacht Nordwald an alle auf Kanal 7: Der Steinschlag an der Passstraße vom 1. Oktober war <b>kein Naturereignis</b>. Unser Gutachter hat Sprengspuren gefunden – Schwarzpulver, wie im alten Stollen. Wer etwas weiß, meldet sich. Ende.“' },
  { id: 'brandt2', from: '🎙️ Hannes Brandt', need: g => n(g) >= 5,
    x: '„Ich weiß, dass Sie im Steinbruch waren. Ich weiß nicht, wer Sie sind – aber Sie haben meine Seiten.<br>Machen wir es kurz: <b>500 Euro und zwei Kristalle</b>. Sie lassen die Zündmaschine in Ruhe und vergessen alles. Ein Umschlag liegt bereit. Denken Sie drüber nach. Ende.“' },
  { id: 'lena2', from: '👧 Lena (Notunterkunft)', need: g => n(g) >= 6,
    x: '„Hier Lena. In der Turnhalle erzählen sie, Brandt hat eine Sprengung beantragt – am Damm, zur „Sicherung“. Opa Huber sagt, das ist Unsinn. Was passiert da bei euch? Bitte melde dich!“' },
  // epilogues (after the decision at the detonator)
  { id: 'ende_w1', from: '⛑️ Bergwacht Nordwald', need: g => g.S.flags.ending === 'wahrheit', gap: .5,
    x: '„Bergwacht an Kanal 7: Danke für Ihre Meldung. <b>Hannes Brandt wurde heute in der Kreisstadt festgenommen.</b> Die Ladungen im Steinbruch sind geräumt, der Damm ist geprüft – er hält. Die Räumung von Tannbach ist aufgehoben. Ende.“' },
  { id: 'ende_w2', from: '👧 Lena', need: g => g.S.radio?.ende_w1, onGet: g => { g.S.flags.villageBack = 1; },
    x: '„Wir kommen nach Hause! Heute Abend fährt der erste Bus. Kurt soll Kaffee kochen. Danke – wer immer du bist!“<br><i>Ab jetzt brennt abends wieder Licht in Tannbach.</i>' },
  { id: 'ende_s1', from: '🎙️ Hannes Brandt', need: g => g.S.flags.ending === 'schweigen' && g.S.flags.blastDone, gap: .5,
    x: '„Kluge Entscheidung. Es ist vorbei – die Ader liegt offen. Niemand muss je erfahren, wer mir geholfen hat. Ende.“' },
  { id: 'ende_s2', from: '👧 Lena', need: g => g.S.radio?.ende_s1,
    x: '„Hier Lena … Der Hang am Steinbruch ist abgerutscht. Die Kapelle hat einen Riss, sagen sie. Wir dürfen erst mal nicht zurück. Hat das denn niemand kommen sehen?“' },
];

export class Story {
  constructor(game) { this.g = game; this.t = 3; }
  get S() { return this.g.S; }
  pages() { return n(this.g); }
  // E on a diary page (world.js interactive with u.diary)
  readPage(it) {
    const g = this.g, S = g.S, k = it.u.diary, [date, text] = DIARY[k] || ['', ''];
    S.diary ||= {};
    if (!S.diary[k]) { S.diary[k] = S.day; g.progress.add(25, 'Tagebuchseite'); setTimeout(() => g.ui.toast(`📖 Brandts Tagebuch: Seite ${this.pages()}/6 (B → Tagebuch & Funk)`, 'good'), 400); }
    g.ui.read(`Tagebuchseite – ${date}`, text);
  }
  // radio messages arrive one by one (hand radio needed)
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 2;
    const g = this.g, S = g.S; if (!g.has('handfunk') || S.flags.dead) return;
    S.radio ||= {};
    if (S.time < 7 || S.time > 23) return;
    const m = RADIO.find(r => !S.radio[r.id] && r.need(g)); if (!m) return;
    if (S.abs < (S.radioLast || 0) + (m.gap ?? 2.5)) return;
    S.radio[m.id] = S.day; S.radioLast = S.abs; m.onGet?.(g); g.audio.sfx('radio');
    g.ui.toast(`📻 Funkspruch auf Kanal 7 von ${m.from} – J zum Anhören`, 'good'); this.last = m.id;
  }
  // the detonator in the quarry: the decision
  zuender() {
    const g = this.g, S = g.S;
    if (S.flags.ending) return g.ui.toast(S.flags.ending === 'wahrheit' ? 'Die Kabel sind gekappt. Hier wird nichts mehr gesprengt.' : 'Die Zündmaschine ist leer. Der Hang über dem Steinbruch ist abgerutscht.');
    if (this.pages() < 6) { g.audio.sfx('error');
      return g.ui.read('Zündmaschine', 'Ein alter Zündkasten mit Kurbel und Druckgriff. Dicke Kabel führen zu roten Stangen an der Steinbruchwand – <b>Sprengladungen</b>.<br><i>Wer hat das hier aufgebaut – und warum? Vielleicht verraten es Brandts Tagebuchseiten (' + this.pages() + '/6).</i>'); }
    g.ui.read('Die Entscheidung', `Die Zündmaschine ist scharf. Die Kabel laufen zu den Ladungen an der Wand, unter dem Hang liegt die Kristallader – und darüber, keine 300 Meter entfernt, die ersten Häuser von Tannbach.<br>Unter der Kurbel klemmt ein dicker Umschlag: <b>500 €</b> und zwei Bergkristalle. „Für Ihr Schweigen. – H. B.“<br><br><button data-choice="wahrheit">✂️ Kabel kappen und alles der Bergwacht funken</button><button data-choice="schweigen" class="sec">💶 Umschlag nehmen und schweigen</button><button data-choice="spaeter" class="sec">Noch nicht entscheiden</button>`);
  }
  choose(c) {
    const g = this.g, S = g.S; if (S.flags.ending || c === 'spaeter') return;
    S.flags.ending = c; S.radioLast = S.abs; g.audio.sfx('quest');
    if (c === 'wahrheit') {
      g.progress.add(300, 'Die Wahrheit'); g.ui.toast('✂️ Du kappst die Kabel. Über Funk erzählst du der Bergwacht alles – von der Probesprengung bis zum Damm.', 'good');
    } else {
      S.money = +(S.money + 500).toFixed(2); g.add('bergkristall', 2, true); g.progress.add(150, 'Schweigegeld');
      g.ui.toast('💶 Du steckst den Umschlag ein: 500 € und zwei Bergkristalle. Brandt wird heute Nacht zünden.', 'warn'); S.blastAt = S.abs + 3;
    }
    g.save();
  }
  // per frame: Brandt's blast after „schweigen“, lights in the village after „wahrheit“
  frame(dark) {
    const g = this.g, S = g.S;
    if (S.blastAt && S.abs >= S.blastAt && !S.flags.blastDone) {
      S.flags.blastDone = 1; delete S.blastAt; g.audio.sfx('boom'); setTimeout(() => g.audio.sfx('thunder'), 900); g.shake = 1.2;
      g.ui.toast('💥 In der Ferne donnert es dumpf – der Boden zittert. Brandt hat im Steinbruch gezündet.', 'warn');
    }
    const on = S.flags.villageBack && dark > .35;
    if (on !== this._lit) { this._lit = on;
      this.windows ||= (() => { const out = []; g.scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.name === 'Glas_Dorf' && !out.includes(m)) out.push(m); }); return out; })();
      for (const m of this.windows) { if (!m.emissive) continue; m.emissive.set(on ? '#ffc874' : '#000000'); m.emissiveIntensity = on ? 1.1 : 0; m.opacity = on ? .85 : m.userData.op0 ?? (m.userData.op0 = m.opacity); }
    }
  }
  html() {
    const S = this.S, g = this.g, D = S.diary || {}, R = S.radio || {};
    let h = `<p>Was ist in Tannbach wirklich passiert? Brandts Tagebuch: <b>${this.pages()}/6</b> Seiten${g.has('handfunk') ? ' · 📻 Handfunkgerät (Kanal 7) dabei' : ' · ein Handfunkgerät bekommst du von Kurt, wenn du ihm von den 5 Notizen erzählst'}.</p>`;
    h += `<h4>📖 Brandts Tagebuch</h4>`;
    for (let k = 1; k <= 6; k++) h += D[k] ? `<div class="diary"><b>${DIARY[k][0]}</b><p>${DIARY[k][1]}</p></div>` : `<div class="diary off">Seite ${k} – noch nicht gefunden</div>`;
    const got = RADIO.filter(r => R[r.id]);
    h += `<h4>📻 Funksprüche (Kanal 7)</h4>` + (got.length ? got.map(r => `<div class="diary radio${r.id === this.last ? ' new' : ''}"><b>${r.from} · Tag ${R[r.id]}</b><p>${r.x}</p></div>`).join('') : '<p class="tip">Noch nichts empfangen.</p>');
    if (S.flags.ending) h += `<p class="tip">${S.flags.ending === 'wahrheit' ? '✂️ Du hast die Kabel gekappt und die Wahrheit gefunkt.' : '💶 Du hast Brandts Geld genommen und geschwiegen.'}</p>`;
    return h;
  }
}
