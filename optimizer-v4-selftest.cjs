const fs = require('fs');
const vm = require('vm');

global.window = global;
global.__OPT_V4_PATCHES = [];
for (const file of ['optimizer-v4-patch-chaska.js','optimizer-v4-patch-engine.js','optimizer-v4-patch-ui.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(search, replacement);
}
function replaceSection(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Patch start missing: ${label}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Patch end missing: ${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let source = fs.readFileSync('optimizer-builds-v1.js', 'utf8');
for (const patch of global.__OPT_V4_PATCHES) source = patch(source, { replaceRequired, replaceSection });
new Function(source);

const required = [
  '<option value="borders">Border Combination</option><option value="targetRarity">Target Card Rarity</option>',
  'id="optRelicSlots"',
  'id="optRelicQuickdraw"',
  'id="optRelicHeavyHand"',
  'id="optRelicVicissitudes"',
  'const CHASKA_TIER_GAP = 50;',
  'That target is above the highest currently obtainable final rarity',
  '<strong>Optimizer</strong>',
  '<strong>Builds</strong>',
];
for (const needle of required) if (!source.includes(needle)) throw new Error(`Required v4 output missing: ${needle}`);

const forbidden = [
  '<option value="mostRolls">Most Rolls / Cards</option>',
  '<option value="highestRarity">Highest Rarity Quality</option>',
  '<option value="overall">Best Overall</option>',
  '<div class="opt-why">',
  '<span>01</span><strong>Goal</strong>',
];
for (const needle of forbidden) if (source.includes(needle)) throw new Error(`Old optimizer UI still present: ${needle}`);

console.log('Optimizer v4 patched source compiled and assertions passed.');
