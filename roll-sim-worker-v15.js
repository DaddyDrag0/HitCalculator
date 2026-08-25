importScripts('./roll-sim-data-v15.js?rev=20260824-2004');

const DATA = globalThis.ROLL_SIM_DATA_V15;
const CARDS = DATA.cards;
const BN = DATA.borderNames;
const MASK_COUNT = 16;
const SKILLS = {
  Luck: [0, 15, 30, 45, 60, 75, 90, 150],
  Speed: [0, 5, 10, 15, 20, 25, 30, 45],
  All: [0, 3, 6, 11],
  Platinum: [0, 0.5, 1, 1.5, 2, 2.5, 5],
  Crystal: [0, 1.75, 3.5, 5.25, 7, 8.75, 14.75],
  Ruby: [0, 1.5, 3, 4.5, 6, 7.5, 13.5],
  Galaxy: [0, 4, 8, 12, 16, 20, 30],
};
const CHARMS = {
  None: {},
  'Old Tome': { Luck: 0.5 },
  'Holy Cross': { Luck: 1 },
  Bloodstone: { Luck: 2 },
  'Lunar Charm': { Luck: 2.5, Cooldown: 10 },
  'Blood Moon': { Luck: 3, Cooldown: 20 },
  'Ice Crystal': { Luck: 3.5, Cooldown: 30 },
  "Victor's Trophy": { Luck: 5, Cooldown: 40 },
  'Phoenix Feather': { Luck: 5.5, Cooldown: 50 },
  'Hell Charm': { Luck: 7.5, Cooldown: 60 },
  "Emperor's Hand": { Luck: 10, Cooldown: 75 },
  'Heavenly Crown': { Luck: 15, Cooldown: 100 },
  Durandal: { Luck: 7, Cooldown: 60 },
  'Platinum Gem': { Luck: 10, Platinum: 0.5, Cooldown: 80 },
  'Crystal Gem': { Luck: 12, Platinum: 0.5, Crystal: 0.5, Cooldown: 100 },
  'Dark Star': { Luck: 15, Platinum: 0.5, Crystal: 0.5, Ruby: 0.5, Galaxy: 0.5, Cooldown: 125 },
  'Infinity Gem': { Luck: 20, Platinum: 1, Crystal: 1, Ruby: 1, Galaxy: 1, Cooldown: 150 },
  'Lucky Crown': { Luck: 27, Platinum: 1.5, Crystal: 1.5, Ruby: 1.5, Galaxy: 1.5, Cooldown: 175 },
  'Forbidden Book': { Luck: 35, Platinum: 2, Crystal: 2, Ruby: 2, Galaxy: 2, Cooldown: 200 },
  "Angel's Halo": { Luck: 42, Platinum: 3, Crystal: 3, Ruby: 3, Galaxy: 3, Cooldown: 200 },
  'Forbidden Fruit': { Luck: 50, Platinum: 4, Crystal: 4, Ruby: 4, Galaxy: 4, Cooldown: 200 },
  'Book of Life and Death': { Luck: 66, Platinum: 6, Crystal: 6, Ruby: 6, Galaxy: 6, Cooldown: 200 },
};

const VIC_STATES = [];
for (let plus = 0; plus < BN.length; plus += 1) {
  for (let minus = 0; minus < BN.length; minus += 1) {
    if (plus === minus) continue;
    const factors = [1, 1, 1, 1];
    factors[plus] = 1.1;
    factors[minus] = 0.9;
    VIC_STATES.push({ plus, minus, factors });
  }
}

const MASK_MULTIPLIERS = new Float64Array(MASK_COUNT);
for (let mask = 0; mask < MASK_COUNT; mask += 1) {
  let multiplier = 1;
  for (let i = 0; i < BN.length; i += 1) {
    if (mask & (1 << i)) multiplier *= DATA.borders[BN[i]].multiplier;
  }
  MASK_MULTIPLIERS[mask] = multiplier;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function geometric(probability, rng) {
  if (!(probability > 0) || probability >= 1) return 1;
  const u = Math.max(Number.EPSILON, 1 - rng());
  return Math.max(1, Math.ceil(Math.log(u) / Math.log(1 - probability)));
}

function clampLevel(value, max) {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

function skill(build, name) {
  const values = SKILLS[name];
  return values[clampLevel(build.skills?.[name], values.length - 1)] || 0;
}

function chaska(points, rate) {
  let remaining = Math.max(0, Math.floor(Number(points) || 0));
  let block = 0;
  let total = 0;
  while (remaining > 0) {
    const amount = Math.min(50, remaining);
    total += amount * rate * 0.85 ** block;
    remaining -= amount;
    block += 1;
  }
  return total;
}

function structureMultiplier(kind, level) {
  const lvl = Math.max(0, Number(level) || 0);
  if (kind === 'Luck' || kind === 'Speed') return 1 + 0.5 * lvl / 7;
  return 1 + lvl / 5;
}

function dungeonBonus(build, name) {
  const per = { Luck: 10, Speed: 10, Platinum: 0.25, Crystal: 0.5, Ruby: 0.75, Galaxy: 2 }[name] || 0;
  return clampLevel(build.dungeon?.[name], 25) * per;
}

function baseLuck(build, weather, surgeActive) {
  const charm = CHARMS[build.charm] || {};
  let luck = 1 + Math.floor(Math.max(0, Number(build.rolls) || 0) / 1e6) * 0.1 + (charm.Luck || 0);
  if (build.charm === 'Ice Crystal' && weather === 'Snow') luck += 1;
  luck *= 1 + (skill(build, 'Luck') + skill(build, 'All')) / 100;
  if (build.potions?.luck3) luck += 25;
  if (build.potions?.legendaryLuck) luck += 40;
  if (build.potions?.cursed) luck *= 1.5;
  if (build.potions?.elixir) luck *= 2;
  if (build.potions?.eventLuck) luck *= 1.25;
  luck *= structureMultiplier('Luck', clampLevel(build.structures?.Luck, 7));
  luck += dungeonBonus(build, 'Luck');
  luck += chaska(build.chaska?.Luck, 0.25);
  if (build.modifiers?.quickdraw) luck *= 0.8;
  const percent = (build.modifiers?.heavyHand ? 20 : 0) + (surgeActive ? 25 : 0);
  if (percent) luck *= 1 + percent / 100;
  return Math.max(0, luck);
}

function rollsPerSecond(build, weather) {
  const charm = CHARMS[build.charm] || {};
  let speed = 100 + (build.potions?.speed3 ? 300 : 0) + (build.potions?.legendarySpeed ? 500 : 0) + (charm.Cooldown || 0);
  speed *= 1 + (skill(build, 'Speed') + skill(build, 'All')) / 100;
  if (build.potions?.eventSpeed) speed *= 1.25;
  speed += dungeonBonus(build, 'Speed');
  if (build.modifiers?.quickdraw) speed *= 1.1;
  if (build.modifiers?.heavyHand) speed *= 0.9;
  const structure = structureMultiplier('Speed', clampLevel(build.structures?.Speed, 7));
  return Math.max(0, (speed / 100) * structure * (weather === 'Time Storm' ? 2 : 1));
}

function baseBorderMultipliers(build, weather) {
  const charm = CHARMS[build.charm] || {};
  const all = 1 + skill(build, 'All') / 100;
  const borderBoost = build.modifiers?.borderBoost ? 1.5 : 1;
  const divine = build.potions?.divine ? 1.1 : 1;
  const chaskaRates = { Platinum: 0.05, Crystal: 0.10, Ruby: 0, Galaxy: 0.25 };
  const out = {};
  for (const name of BN) {
    let base = (1 + (charm[name] || 0) + skill(build, name)) * all;
    base *= structureMultiplier(name, clampLevel(build.structures?.[name], 5));
    if (name === 'Galaxy' && weather === 'Eclipse') base *= 1.15;
    base = base * borderBoost + dungeonBonus(build, name) + chaska(build.chaska?.[name], chaskaRates[name]);
    out[name] = Math.max(0, base * divine);
  }
  return out;
}

function borderProbabilities(build, weather, vicIndex) {
  const multipliers = baseBorderMultipliers(build, weather);
  const factors = vicIndex >= 0 ? VIC_STATES[vicIndex].factors : [1, 1, 1, 1];
  const rates = BN.map((name, i) => Math.min(1, Math.max(0, multipliers[name] * factors[i] / DATA.borders[name].denominator)));
  const probs = new Float64Array(MASK_COUNT);
  for (let mask = 0; mask < MASK_COUNT; mask += 1) {
    let p = 1;
    for (let i = 0; i < BN.length; i += 1) p *= (mask & (1 << i)) ? rates[i] : (1 - rates[i]);
    probs[mask] = p;
  }
  return probs;
}

function adjustedCardRarity(card, build, weather, weatherStructures) {
  if (card.weather && card.weather !== weather) return null;
  let rarity = Math.max(1e-12, Number(card.rarity) || 1);
  if (card.currentEvent) rarity *= Number(card.eventFactor) || 0.2;
  if (card.weather && card.weather === weather) {
    rarity /= DATA.weatherMults[weather] || 1;
    if (DATA.directWeatherStructures.includes(weather)) {
      const lvl = clampLevel(weatherStructures?.[weather], 5);
      rarity /= 1 + lvl / 5;
    }
    if (DATA.chaosWeathers.includes(weather)) {
      const lvl = clampLevel(weatherStructures?.Chaos, 5);
      rarity /= 1 + lvl / 5;
    }
  }
  if (card.boss && build.modifiers?.bossPot) rarity /= 5;
  return Math.max(1e-12, rarity);
}

function makeCardDistribution(build, weather, surgeActive, diceActive, weatherStructures) {
  const luck = baseLuck(build, weather, surgeActive) * (diceActive ? 2 : 1);
  const probabilities = new Float64Array(CARDS.length);
  let remaining = 1;
  let fallback = -1;
  for (let i = 0; i < CARDS.length; i += 1) {
    const rarity = adjustedCardRarity(CARDS[i], build, weather, weatherStructures);
    if (rarity == null) continue;
    fallback = i;
    const success = Math.min(1, Math.max(0, luck / rarity));
    const hit = remaining * success;
    probabilities[i] = hit;
    remaining *= 1 - success;
    if (remaining <= 1e-15) {
      remaining = 0;
      break;
    }
  }
  if (remaining > 0 && fallback >= 0) probabilities[fallback] += remaining;
  let sum = 0;
  for (const p of probabilities) sum += p;
  if (sum > 0 && Math.abs(sum - 1) > 1e-12) {
    for (let i = 0; i < probabilities.length; i += 1) probabilities[i] /= sum;
  }
  return probabilities;
}

function buildAlias(probabilities) {
  const n = probabilities.length;
  const prob = new Float64Array(n);
  const alias = new Uint32Array(n);
  const scaled = new Float64Array(n);
  const small = [];
  const large = [];
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += probabilities[i];
  if (!(sum > 0)) throw new Error('No rollable outcomes for this simulation state.');
  for (let i = 0; i < n; i += 1) {
    scaled[i] = probabilities[i] * n / sum;
    if (scaled[i] < 1) small.push(i); else large.push(i);
  }
  while (small.length && large.length) {
    const s = small.pop();
    const l = large.pop();
    prob[s] = scaled[s];
    alias[s] = l;
    scaled[l] = scaled[l] + scaled[s] - 1;
    if (scaled[l] < 1) small.push(l); else large.push(l);
  }
  while (large.length) prob[large.pop()] = 1;
  while (small.length) prob[small.pop()] = 1;
  return { prob, alias, n };
}

function sampleAlias(table, rng) {
  const x = rng() * table.n;
  const i = Math.min(table.n - 1, Math.floor(x));
  return (x - i) < table.prob[i] ? i : table.alias[i];
}

function jointAlias(build, weather, surge, dice, vic, weatherStructures) {
  const card = makeCardDistribution(build, weather, surge, dice, weatherStructures);
  const borders = borderProbabilities(build, weather, vic);
  const joint = new Float64Array(CARDS.length * MASK_COUNT);
  let at = 0;
  for (let c = 0; c < CARDS.length; c += 1) {
    const cp = card[c];
    for (let mask = 0; mask < MASK_COUNT; mask += 1) joint[at++] = cp * borders[mask];
  }
  return buildAlias(joint);
}

function weatherTimeline(config, totalSeconds) {
  const total = Math.max(0, totalSeconds);
  const mode = config?.mode || 'none';
  if (mode === 'fixed') return [{ start: 0, end: total, weather: config.fixed || null }];
  if (mode !== 'schedule') return [{ start: 0, end: total, weather: null }];
  const out = [];
  let cursor = 0;
  for (const segment of config.segments || []) {
    if (cursor >= total) break;
    const duration = Math.max(0, Number(segment.durationSeconds) || 0);
    if (!duration) continue;
    const end = Math.min(total, cursor + duration);
    out.push({ start: cursor, end, weather: segment.weather || null });
    cursor = end;
  }
  if (cursor < total) out.push({ start: cursor, end: total, weather: null });
  return out.length ? out : [{ start: 0, end: total, weather: null }];
}

function splitDiceRolls(n, enabled, counter) {
  if (!enabled || n <= 0) return { normal: n, dice: 0, counter };
  const until = 25 - counter;
  if (n < until) return { normal: n, dice: 0, counter: counter + n };
  const afterFirst = n - until;
  const dice = 1 + Math.floor(afterFirst / 25);
  const nextCounter = afterFirst % 25;
  return { normal: n - dice, dice, counter: nextCounter };
}

function addGroup(groups, weather, surge, dice, vic, amount) {
  if (!(amount > 0)) return;
  const key = `${weather || 'Normal'}\u0001${surge ? 1 : 0}\u0001${dice ? 1 : 0}\u0001${vic}`;
  groups.set(key, (groups.get(key) || 0) + amount);
}

function simulateRollGroups(build, weatherConfig, totalSeconds, rng) {
  const timeline = weatherTimeline(weatherConfig, totalSeconds);
  const groups = new Map();
  const weatherRolls = {};
  const lucky = !!build.modifiers?.luckySurge;
  const diceEnabled = !!build.modifiers?.dice;
  const vicEnabled = !!build.modifiers?.vicissitudes;
  let diceCounter = 0;
  let rollFraction = 0;
  let totalRolls = 0;
  let t = 0;
  let segmentIndex = 0;
  let vicIndex = vicEnabled ? Math.floor(rng() * VIC_STATES.length) : -1;
  let nextVic = vicEnabled ? 60 : Infinity;
  let surgeUntil = 0;
  let surgeEligible = 0;
  let pendingSurgeRolls = null;

  function recordRolls(n, weather, surge) {
    if (!(n > 0)) return;
    const split = splitDiceRolls(n, diceEnabled, diceCounter);
    diceCounter = split.counter;
    addGroup(groups, weather, surge, false, vicIndex, split.normal);
    addGroup(groups, weather, surge, true, vicIndex, split.dice);
    totalRolls += n;
    const key = weather || 'Normal';
    weatherRolls[key] = (weatherRolls[key] || 0) + n;
  }

  function processDuration(dt, rps, weather, surge) {
    if (!(dt > 0) || !(rps > 0)) return 0;
    const exact = dt * rps + rollFraction;
    const n = Math.max(0, Math.floor(exact + 1e-9));
    rollFraction = Math.max(0, exact - n);
    recordRolls(n, weather, surge);
    return n;
  }

  while (t < totalSeconds - 1e-9) {
    while (segmentIndex < timeline.length - 1 && t >= timeline[segmentIndex].end - 1e-9) segmentIndex += 1;
    const segment = timeline[segmentIndex];
    const weather = segment?.weather || null;
    const rps = rollsPerSecond(build, weather);

    if (vicEnabled && t >= nextVic - 1e-9) {
      vicIndex = Math.floor(rng() * VIC_STATES.length);
      nextVic += 60;
      continue;
    }

    const surgeActive = lucky && t < surgeUntil - 1e-9;
    if (surgeActive) {
      const end = Math.min(segment.end, nextVic, surgeUntil, totalSeconds);
      processDuration(end - t, rps, weather, true);
      t = end;
      continue;
    }

    if (lucky && t < surgeEligible - 1e-9) {
      const end = Math.min(segment.end, nextVic, surgeEligible, totalSeconds);
      processDuration(end - t, rps, weather, false);
      t = end;
      continue;
    }

    if (lucky) {
      if (pendingSurgeRolls == null) pendingSurgeRolls = geometric(DATA.relics.LuckySurge.procChance, rng);
      if (rps > 0) {
        const timeToProc = Math.max(0, (pendingSurgeRolls - rollFraction) / rps);
        const otherEnd = Math.min(segment.end, nextVic, totalSeconds);
        if (t + timeToProc < otherEnd - 1e-9) {
          const n = pendingSurgeRolls;
          rollFraction = 0;
          recordRolls(n, weather, false);
          t += timeToProc;
          pendingSurgeRolls = null;
          surgeUntil = t + DATA.relics.LuckySurge.duration;
          surgeEligible = t + DATA.relics.LuckySurge.cooldown;
          continue;
        }
        const n = processDuration(otherEnd - t, rps, weather, false);
        pendingSurgeRolls = Math.max(1, pendingSurgeRolls - n);
        t = otherEnd;
        continue;
      }
    }

    const end = Math.min(segment.end, nextVic, totalSeconds);
    processDuration(end - t, rps, weather, false);
    t = end;
  }

  return { groups, totalRolls, weatherRolls };
}

function parseGroupKey(key) {
  const [weatherRaw, surgeRaw, diceRaw, vicRaw] = key.split('\u0001');
  return {
    weather: weatherRaw === 'Normal' ? null : weatherRaw,
    surge: surgeRaw === '1',
    dice: diceRaw === '1',
    vic: Number(vicRaw),
  };
}

function simulateRun(scenario, totalSeconds, seed) {
  const rng = mulberry32(seed);
  const build = scenario.build;
  const weatherStructures = scenario.weatherStructures || {};
  const rollState = simulateRollGroups(build, scenario.weather, totalSeconds, rng);
  const cardTotals = new Uint32Array(CARDS.length);
  const cardMasksFlat = new Uint32Array(CARDS.length * MASK_COUNT);
  const comboTotals = new Uint32Array(MASK_COUNT);
  const borderTotals = new Uint32Array(BN.length);
  const aliasCache = new Map();
  let bestCardIndex = -1;
  let bestMask = 0;
  let bestEffective = -1;
  let bestCount = 0;

  for (const [groupKey, n] of rollState.groups) {
    const state = parseGroupKey(groupKey);
    let table = aliasCache.get(groupKey);
    if (!table) {
      table = jointAlias(build, state.weather, state.surge, state.dice, state.vic, weatherStructures);
      aliasCache.set(groupKey, table);
    }

    for (let roll = 0; roll < n; roll += 1) {
      const outcome = sampleAlias(table, rng);
      const cardIndex = outcome >>> 4;
      const mask = outcome & 15;
      cardTotals[cardIndex] += 1;
      cardMasksFlat[outcome] += 1;
      comboTotals[mask] += 1;
      for (let b = 0; b < BN.length; b += 1) if (mask & (1 << b)) borderTotals[b] += 1;

      const effective = CARDS[cardIndex].rarity * MASK_MULTIPLIERS[mask];
      if (effective > bestEffective) {
        bestCardIndex = cardIndex;
        bestMask = mask;
        bestEffective = effective;
        bestCount = 1;
      } else if (effective === bestEffective && cardIndex === bestCardIndex && mask === bestMask) {
        bestCount += 1;
      }
    }
  }

  let uniqueCards = 0;
  for (const count of cardTotals) if (count > 0) uniqueCards += 1;
  const cardMasks = Array.from({ length: CARDS.length }, (_, cardIndex) => {
    const start = cardIndex * MASK_COUNT;
    return Array.from(cardMasksFlat.subarray(start, start + MASK_COUNT));
  });

  return {
    seed,
    totalRolls: rollState.totalRolls,
    weatherRolls: rollState.weatherRolls,
    uniqueCards,
    cardTotals: Array.from(cardTotals),
    cardMasks,
    borderTotals: Array.from(borderTotals),
    comboTotals: Array.from(comboTotals),
    bestPull: bestCardIndex >= 0 ? { cardIndex: bestCardIndex, mask: bestMask, effectiveRarity: bestEffective, count: bestCount } : null,
  };
}

function aggregateRuns(runs) {
  const count = runs.length || 1;
  const cardTotals = new Array(CARDS.length).fill(0);
  const cardHitRuns = new Array(CARDS.length).fill(0);
  const cardMasks = Array.from({ length: CARDS.length }, () => new Array(MASK_COUNT).fill(0));
  const borderTotals = new Array(BN.length).fill(0);
  const borderHitRuns = new Array(BN.length).fill(0);
  const comboTotals = new Array(MASK_COUNT).fill(0);
  const comboHitRuns = new Array(MASK_COUNT).fill(0);
  const weatherRolls = {};
  let totalRolls = 0;
  let uniqueTotal = 0;
  let bestPull = null;

  for (const run of runs) {
    totalRolls += run.totalRolls;
    uniqueTotal += run.uniqueCards;
    for (const [weather, rolls] of Object.entries(run.weatherRolls || {})) weatherRolls[weather] = (weatherRolls[weather] || 0) + rolls;
    for (let i = 0; i < CARDS.length; i += 1) {
      const cardCount = run.cardTotals[i];
      cardTotals[i] += cardCount;
      if (cardCount > 0) cardHitRuns[i] += 1;
      for (let mask = 0; mask < MASK_COUNT; mask += 1) cardMasks[i][mask] += run.cardMasks[i][mask];
    }
    for (let i = 0; i < BN.length; i += 1) {
      borderTotals[i] += run.borderTotals[i];
      if (run.borderTotals[i] > 0) borderHitRuns[i] += 1;
    }
    for (let mask = 0; mask < MASK_COUNT; mask += 1) {
      comboTotals[mask] += run.comboTotals[mask];
      if (run.comboTotals[mask] > 0) comboHitRuns[mask] += 1;
    }
    if (run.bestPull && (!bestPull || run.bestPull.effectiveRarity > bestPull.effectiveRarity)) bestPull = { ...run.bestPull };
  }

  return {
    runs: runs.length,
    totalRolls,
    averageRolls: totalRolls / count,
    averageUniqueCards: uniqueTotal / count,
    cardTotals,
    cardHitRuns,
    cardMasks,
    borderTotals,
    borderHitRuns,
    comboTotals,
    comboHitRuns,
    weatherRolls,
    bestPull,
  };
}

function randomSeed() {
  return (Math.floor(Math.random() * 0xFFFFFFFF) ^ Date.now()) >>> 0;
}

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type !== 'run') return;
  const jobId = message.jobId;
  try {
    const totalSeconds = Math.max(1, Math.min(172800, Number(message.durationSeconds) || 1));
    const runCount = [1, 3, 8, 25, 50, 100].includes(Number(message.runs)) ? Number(message.runs) : 1;
    const scenarios = Array.isArray(message.scenarios) && message.scenarios.length ? message.scenarios : [];
    const allResults = [];
    const totalJobs = Math.max(1, scenarios.length * runCount);
    let completed = 0;

    for (let s = 0; s < scenarios.length; s += 1) {
      const scenario = scenarios[s];
      const runs = [];
      for (let r = 0; r < runCount; r += 1) {
        const seed = randomSeed();
        runs.push(simulateRun(scenario, totalSeconds, seed));
        completed += 1;
        self.postMessage({ type: 'progress', jobId, completed, total: totalJobs, scenarioIndex: s, runIndex: r });
      }
      allResults.push({ aggregate: aggregateRuns(runs), runs });
    }

    self.postMessage({ type: 'result', jobId, durationSeconds: totalSeconds, runCount, scenarios: allResults, exactRollSampling: true });
  } catch (error) {
    self.postMessage({ type: 'error', jobId, message: error?.message || String(error), stack: error?.stack || '' });
  }
};
