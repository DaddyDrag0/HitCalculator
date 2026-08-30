// Build check for the optimizer runtime patches.
const fs = require('fs');
const vm = require('vm');

global.window = global;
global.__OPT_V4_PATCHES = [];
for (const file of [
  'optimizer-v4-patch-chaska.js',
  'optimizer-v4-patch-engine.js',
  'optimizer-v4-patch-ui.js',
  'optimizer-v5-third-relic.js',
  'optimizer-v5-patch-ui.js',
  'optimizer-v6-target-first.js',
  'optimizer-v7-deep-sim.js',
  'optimizer-v8-async-click-fix.js',
]) {
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
  '<option value="targetRarity">Target Card Rarity</option><option value="borders">Border Combination</option>',
  'id="optRelicSlots"',
  '<option value="3">3 Relics</option>',
  'id="optRelicQuickdraw"',
  'id="optRelicHeavyHand"',
  'id="optRelicVicissitudes"',
  'id="optRelicLuckySurge"',
  'id="optRelicDice"',
  "{key:'surge',id:'uvLuckySurge'",
  "{key:'dice',id:'uvDice'",
  "surge:set.has('surge')",
  "dice:set.has('dice')",
  'const CHASKA_TIER = 50;',
  'function requiredChaskaFloor(value)',
  'Math.floor((value-1)/CHASKA_TIER)*CHASKA_TIER',
  'That target is above the highest currently obtainable final rarity',
  '<strong>Optimizer</strong>',
  '<strong>Builds</strong>',
  'async function runOptimizer()',
  'function deepSearchCandidates(',
  'function validateFinalists(',
  "new Worker('./roll-sim-worker-v30.js?rev=20260829-optdeep1')",
  'Math.min(172800',
  "settings.seconds>86400?3:5",
  "$('optRun')?.addEventListener('click',()=>{ runOptimizer(); });",
];
for (const needle of required) if (!source.includes(needle)) throw new Error(`Required optimizer output missing: ${needle}`);

const forbidden = [
  '<option value="mostRolls">Most Rolls / Cards</option>',
  '<option value="highestRarity">Highest Rarity Quality</option>',
  '<option value="overall">Best Overall</option>',
  '<div class="opt-why">',
  '<span>01</span><strong>Goal</strong>',
  `<div><b>Chaska</b><div>${'${'}lockGrid('chaska',CHASKA)}</div></div>`,
  "$('optRun')?.addEventListener('click',()=>{ const b=$('optRun'); b.disabled=true;",
];
for (const needle of forbidden) if (source.includes(needle)) throw new Error(`Old optimizer UI/rule still present: ${needle}`);

console.log('Optimizer patched source compiled and assertions passed.');
