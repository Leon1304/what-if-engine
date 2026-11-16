// English dictionary for Northwood: German source text → English. Split into parts by area; later parts win on duplicates.
// Check coverage with: node tools/i18n.mjs
import html from './en/html.js';
import world from './en/world.js';
import game from './en/game.js';
import items from './en/items.js';
import handbook from './en/handbook.js';
import core from './en/core.js';

export default { ...world, ...html, ...items, ...handbook, ...core, ...game };
