importScripts('./roll-sim-worker-v19.js?rev=20261003-chaska-breakpoints-1');

const PLAYER_STAT_AURAS_V41 = {
  "Fortune's Bloom": { stat: 'Luck', base: 10, max: 50 },
  'Verdant Haste': { stat: 'RollSpeed', base: 5, max: 25 },
  'Unstable Growth': { stat: 'Mutation', base: 10, max: 50 },
  'Platinum Clover': { stat: 'Platinum', base: 10, max: 35 },
  'Crystal Blossom': { stat: 'Crystal', base: 10, max: 35 },
  'Ruby Thorn': { stat: 'Ruby', base: 10, max: 35 },
  'Astral Sprout': { stat: 'Galaxy', base: 10, max: 35 },
  Worldroot: { stat: 'AllStat', base: 4, max: 20 },
};
const PLAYER_STAT_BORDER_V41 = { Base: 0, Platinum: 0.25, Crystal: 0.5, Galaxy: 1 };

function playerStatAuraBonusV41(build, stat) {
  const selected = build?.playerStatAura;
  const aura = PLAYER_STAT_AURAS_V41[selected?.name];
  if (!aura || (aura.stat !== stat && aura.stat !== 'AllStat')) return 0;
  const progress = PLAYER_STAT_BORDER_V41[selected?.border] ?? 0;
  return aura.base + (aura.max - aura.base) * progress;
}

const baseLuckV41 = baseLuck;
baseLuck = function baseLuckWithPlayerStatAuraV41(build, weather, surgeActive) {
  let value = baseLuckV41(build, weather, surgeActive);
  const aura = playerStatAuraBonusV41(build, 'Luck');
  if (aura > 0) value *= 1 + aura / 100;
  if (weather === 'Virus' || weather === 'Manga') value *= 1.25;
  return Math.max(0, value);
};

const rollsPerSecondV41 = rollsPerSecond;
rollsPerSecond = function rollsPerSecondWithPlayerStatAuraV41(build, weather) {
  const value = rollsPerSecondV41(build, weather);
  const aura = playerStatAuraBonusV41(build, 'RollSpeed');
  return Math.max(0, value * (1 + aura / 100));
};

const baseBorderMultipliersV41 = baseBorderMultipliers;
baseBorderMultipliers = function baseBorderMultipliersWithPlayerStatAuraV41(build, weather) {
  const out = baseBorderMultipliersV41(build, weather);
  if (weather === 'Meteor Shower') out.Platinum *= 1.15;
  if (weather === 'Blood Rain') out.Ruby *= 1.15;
  if (weather === 'Armageddon') {
    out.Platinum *= 1.10;
    out.Ruby *= 1.10;
  }
  if (weather === 'Manga') {
    out.Platinum *= 1.05;
    out.Crystal *= 1.05;
    out.Ruby *= 1.05;
    out.Galaxy *= 1.05;
  }
  for (const name of BN) {
    const aura = playerStatAuraBonusV41(build, name);
    if (aura > 0) out[name] *= 1 + aura / 100;
  }
  return out;
};

// High-end RNG fix:
// - Cards are sampled from the exact sequential card distribution.
// - Borders are then rolled independently (P, C, R, G), matching the game.
// - Do not combine card + border outcomes into one 32-bit alias table; that quantizes ultra-rare outcomes.

function mix32V30(value) {
  let x = value >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

function makeRngV30(seed) {
  const s = seed >>> 0;
  let a = mix32V30(s ^ 0x9e3779b9);
  let b = mix32V30(s ^ 0x243f6a88);
  let c = mix32V30(s ^ 0xb7e15162);
  let d = mix32V30(s ^ 0xdeadbeef);
  if ((a | b | c | d) === 0) d = 1;

  function unit32() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11)) | 0;
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  function unit53() {
    const high21 = Math.floor(unit32() * 0x200000);
    const low32 = Math.floor(unit32() * 0x100000000);
    return (high21 * 4294967296 + low32) / 9007199254740992;
  }

  return { unit32, unit53 };
}

function mutationChanceV30(scenario) {
  let chance = 1 / 750;
  if (scenario?.mutation?.pass) chance *= 1.25;
  if (scenario?.mutation?.potion) chance *= 1.2;
  const aura = playerStatAuraBonusV41(scenario?.build, 'Mutation');
  if (aura > 0) chance *= 1 + aura / 100;
  return Math.min(1, Math.max(0, chance));
}

function mutationEligibleV30(card, weather) {
  return !!weather
    && weather !== 'Rapture'
    && !!card
    && !card.weather
    && !card.boss
    && !card.sin
    && !card.currentEvent
    && !card.expiredEvent
    && card.rollable !== false;
}

function borderRatesV30(build, weather, vicIndex) {
  const multipliers = baseBorderMultipliers(build, weather);
  const factors = vicIndex >= 0 ? VIC_STATES[vicIndex].factors : [1, 1, 1, 1];
  return BN.map((name, index) => Math.min(1, Math.max(0,
    multipliers[name] * factors[index] / DATA.borders[name].denominator
  )));
}

function simulateRunV30(scenario, totalSeconds, seed) {
  const random = makeRngV30(seed);
  const build = scenario.build;
  const weatherStructures = scenario.weatherStructures || {};
  const rollState = simulateRollGroups(build, scenario.weather, totalSeconds, random.unit32);
  const cardTotals = new Uint32Array(CARDS.length);
  const cardMasksFlat = new Uint32Array(CARDS.length * MASK_COUNT);
  const comboTotals = new Uint32Array(MASK_COUNT);
  const borderTotals = new Uint32Array(BN.length);
  const mutationTotals = {};
  const mutationChance = mutationChanceV30(scenario);
  const samplerCache = new Map();
  let bestCardIndex = -1;
  let bestMask = 0;
  let bestEffective = -1;
  let bestCount = 0;

  for (const [groupKey, amount] of rollState.groups) {
    const state = parseGroupKey(groupKey);
    let sampler = samplerCache.get(groupKey);
    if (!sampler) {
      sampler = {
        cards: buildAlias(makeCardDistribution(build, state.weather, state.surge, state.dice, weatherStructures)),
        borders: borderRatesV30(build, state.weather, state.vic),
      };
      samplerCache.set(groupKey, sampler);
    }

    for (let roll = 0; roll < amount; roll += 1) {
      const cardIndex = sampleAlias(sampler.cards, random.unit53);
      let mask = 0;
      for (let border = 0; border < BN.length; border += 1) {
        if (random.unit32() < sampler.borders[border]) mask |= 1 << border;
      }

      cardTotals[cardIndex] += 1;
      cardMasksFlat[cardIndex * MASK_COUNT + mask] += 1;
      comboTotals[mask] += 1;
      for (let border = 0; border < BN.length; border += 1) {
        if (mask & (1 << border)) borderTotals[border] += 1;
      }

      if (mutationEligibleV30(CARDS[cardIndex], state.weather) && random.unit32() < mutationChance) {
        mutationTotals[state.weather] = (mutationTotals[state.weather] || 0) + 1;
      }

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
  const cardMasks = Array.from({ length: CARDS.length }, (_, index) =>
    Array.from(cardMasksFlat.subarray(index * MASK_COUNT, index * MASK_COUNT + MASK_COUNT))
  );

  return {
    seed,
    totalRolls: rollState.totalRolls,
    weatherRolls: rollState.weatherRolls,
    uniqueCards,
    cardTotals: Array.from(cardTotals),
    cardMasks,
    borderTotals: Array.from(borderTotals),
    comboTotals: Array.from(comboTotals),
    mutationTotals,
    bestPull: bestCardIndex >= 0 ? {
      cardIndex: bestCardIndex,
      mask: bestMask,
      effectiveRarity: bestEffective,
      count: bestCount,
    } : null,
  };
}

simulateRun = simulateRunV30;

randomSeed = function randomSeedV30() {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      globalThis.crypto.getRandomValues(value);
      return value[0] >>> 0;
    }
  } catch {}
  return (Math.floor(Math.random() * 0x100000000) ^ Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
};
