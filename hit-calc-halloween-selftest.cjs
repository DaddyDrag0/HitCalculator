const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const code = fs.readFileSync('roll-sim-worker-v38.js', 'utf8');
const match = code.match(/chaska = function chaskaV38\(points, rate\) \{[\s\S]*?\n\};/);
assert(match, 'roll worker must contain the corrected Chaska formula');
const ctx = vm.createContext({ chaska: null, Math, Number });
vm.runInContext(match[0], ctx);

function gameChaska(points, rate) {
  let left = Math.max(0, Math.floor(points)), spent = 0, tier = 0, total = 0;
  while (left) {
    const step = spent < 500 ? 50 : spent < 1000 ? 100 : spent < 2000 ? 250 : spent < 3000 ? 500 : spent < 4000 ? 1000 : left;
    const take = Math.min(step, left);
    total += take * rate * (0.85 ** tier);
    spent += take;
    left -= take;
    tier++;
  }
  return total;
}
for (const points of [0, 1, 49, 50, 51, 500, 501, 600, 999, 1000, 1250, 2000, 2500, 3000, 4000, 4001, 5500, 25000]) {
  for (const rate of [0.05, 0.10, 0.15, 0.25]) {
    const got = ctx.chaska(points, rate);
    const expected = gameChaska(points, rate);
    assert(Math.abs(got - expected) < 1e-7, `Chaska ${points} @ ${rate}: ${got} != ${expected}`);
  }
}

const worker16 = fs.readFileSync('roll-sim-worker-v16.js', 'utf8');
assert(worker16.includes('Ruby: 0.15'), 'Chaska Ruby must contribute 0.15 per point');
const worker30 = fs.readFileSync('roll-sim-worker-v30.js', 'utf8');
assert(worker30.includes("weather === 'Pumpkin Moon'"), 'Pumpkin Moon weather must affect roll chances');
assert(worker30.includes('!card.expiresAt'), 'time-limited Halloween3 cards must not mutate');

const halloweenCode = fs.readFileSync('roll-sim-video-game-v34.js', 'utf8');
const runPool = (unixSeconds) => {
  const data = { cards: [], weathers: [], weatherMults: {} };
  const DateMock = class extends Date { static now() { return unixSeconds * 1000; } };
  const sandbox = vm.createContext({ globalThis: { ROLL_SIM_DATA_V16: data }, Date: DateMock, Map, Set, Number });
  vm.runInContext(halloweenCode, sandbox);
  return data;
};
const live = runPool(Date.parse('2026-10-23T00:00:00Z') / 1000);
assert.equal(live.cards.length, 28);
assert(live.weathers.includes('Pumpkin Moon'));
assert.equal(live.weatherMults['Pumpkin Moon'], 2);
assert.equal(live.cards.find(c => c.name === 'Pumpkin King').weather, 'Pumpkin Moon');
assert.equal(live.cards.find(c => c.name === 'Grey Pumpkin').currentEvent, false, 'Halloween3 does not get extra event rarity boost');
assert.equal(live.cards.find(c => c.name === 'Pestilence').eventFactor, 0.5);
assert.equal(live.cards.find(c => c.name === 'The Faceless').expiredEvent, false);
const after = runPool(Date.parse('2026-11-03T00:00:00Z') / 1000);
assert.equal(after.cards.find(c => c.name === 'The Faceless').expiredEvent, true);
assert.equal(after.cards.find(c => c.name === 'Pestilence').expiredEvent, true);
assert.equal(after.cards.find(c => c.name === 'Pumpkin King').expiredEvent, undefined);
console.log('Halloween source alignment passed: Chaska, weather odds, limited card eligibility.');
