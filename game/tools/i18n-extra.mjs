// Extra panels for the runtime part of tools/i18n.mjs (game in English): opened through the game's own objects
// (window.__game.game, window.__ui from main.js), collect(name) after each one gathers missing T() texts and visible German.
export default async (page, collect) => {
  const ev = (f, a) => page.evaluate(f, a).catch(e => console.log('  EXTRA ERROR', e.message.split('\n')[0]));
  const wait = ms => page.waitForTimeout(ms);
  const open = async (name, prep) => {
    await ev(([n, p]) => { const G = window.__game.game; window.__ui.closePanel(); if (p) (0, eval)(p)(G); window.__ui.openPanel(n); }, [name, prep ? String(prep) : null]);
    await wait(150); await collect(`panel ${name}`);
  };
  await open('inv');
  await open('map');
  await open('trade');
  await open('creative');
  await open('code', G => { G.codeFor = G.W.interactives.find(it => it.u.code) || null; });
  // build menu: every category
  await open('build');
  const cats = await page.evaluate(() => [...document.querySelectorAll('#buildpanel [data-cat]')].map(b => b.dataset.cat)).catch(() => []);
  for (const c of cats) {
    await ev(cat => { const G = window.__game.game; G.build.cat = cat; document.getElementById('buildpanel').innerHTML = G.build.menuHtml(); }, c);
    await wait(60); await collect(`build ${c}`);
  }
  await ev(() => window.__ui.closePanel());
  // pause menu (save slots, places, settings, language)
  await ev(() => window.__ui.pause()); await wait(150); await collect('pause menu');
  await ev(() => window.__ui.ui.show('pause', false));
  // death screen and win screen
  await ev(() => { const G = window.__game.game; G.lastCause = 'Wolf'; G.die(); }); await wait(150); await collect('death screen');
  await ev(() => { const G = window.__game.game; G.ui.show('dead', false); G.S.flags.dead = 0; G.win(); }); await wait(150); await collect('win screen');
  await ev(() => window.__game.game.ui.show('win', false));
};
