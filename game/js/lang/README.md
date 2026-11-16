# Northwood – languages

German is the source language. Every text the player can see is written in German in the code and wrapped in `T()` from `js/i18n.js`.
The German text itself is the key; `lang/en.js` (merged from the parts in `lang/en/`) maps it to English.

## Rules for code
- `import { T, TN } from './i18n.js';` and wrap **every** player-visible string: toasts, prompts („E: …“), panel headings, buttons,
  item names/descriptions/messages, recipes, quest texts, story, radio, diary, notes, handbook, badges, death causes, tooltips, HUD.
- Placeholders instead of pieces: `T('Noch {n} Plätze frei.', { n })`, never `T(\`Noch ${n} …\`)` and never `T('Noch ') + n + T(' Plätze')`.
  Whole sentences, so a translation can reorder words. HTML (`<b>`, `<br>`), emoji and `{name}` must survive in the translation.
- Numbers: `TN(n, 'ein Baum', '{n} Bäume')` (both forms are keys).
- Static tables (ITEMS, RECIPES, quests …) may call `T()` at module load: the language is fixed before any module runs and a change reloads the page.
- **Never translate ids or logic keys**: item ids, difficulty ids (`aus`/`leicht`/…), quality ids, save data, `data-*` values, object names from the map,
  anything compared with `===`, used as a Map/Set key or written into a save. Saves store ids or the **German** source text; translate when showing it.
- Texts from the map (`userData.label`, `userData.text`) are translated once on load in `world.js` (`it.label`, `u.text` are already in the chosen language).
- Static HTML in `index.html`: put `data-t` on the element; its German innerHTML is the key. `data-t-title` translates the `title` attribute.
- Mark a line with `// i18n-ok` when a literal with German letters is not shown to the player (an id like `'kühlbox'`, a debug log).

## Rules for the English text
- American English, concise, the same cozy-but-tense survival tone. Second person („you“) like the German „du“.
- Keys: keep the key names (W A S D, E, F, Tab …); „Leertaste“ → Space, „Strg“ → Ctrl, „Shift“ → Shift, „Mausrad“ → mouse wheel, „Esc“ → Esc.
- Keep units metric (m, km, °C, liters) and € prices.
- Names stay: Northwood (the game), Waldtank (the gas station brand), Tannbach, Hirschkopf, Steinberg, Falkenstein, Bernd, Kurt, Henning, Bello, Grimm …
  Translate what a name describes: „Burgruine Falkenstein“ → „Falkenstein Castle ruins“, „Opa Willi“ → „Grandpa Willi“, „Der alte Grimm“ → „Old Grimm“.
- 3D lettering in the map (HOCHSITZ, BERND, HIRSCHKOPF 612 m …) is geometry and stays German – the game is set in a German forest.

## Check
`node game/tools/i18n.mjs` → `I18N OK` (static: all T() literals, data-t, map labels/texts have English, no unwrapped German literals;
runtime: the game in English, menus, panels and handbook show no German). `--static` skips the browser part, `--list` shows everything.
The other game tools run in German (`?lang=de`), so their text checks keep working.

## New language
Copy `lang/en.js` and the folder `lang/en/` to `<code>`, translate the values, add the code to `LANGS` and `DICTS` in `js/i18n.js`.
