importScripts('./roll-sim-worker-v30.js?rev=20260826-1648');

// Quick mode keeps the same card/weather/border probability model, but samples
// large groups statistically instead of iterating every roll one-by-one.
const __rollSimExactV35 = simulateRun;

function normalSampleV35(random) {
  let u = 0, v = 0;
  while (u <= Number.EPSILON) u = random.unit53();
  while (v <= Number.EPSILON) v = random.unit53();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function binomialSmallTailV35(n, p, random) {
  if (!(n > 0) || !(p > 0)) return 0;
  if (p >= 1) return n;
  const q = 1 - p;
  let probability = Math.exp(n * Math.log1p(-p));
  let cumulative = probability;
  const target = random.unit53();
  let x = 0;
  while (target > cumulative && x < n) {
    x += 1;
    probability *= ((n - x + 1) / x) * (p / q);
    cumulative += probability;
  }
  return x;
}

function binomialV35(n, p, random) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  p = Math.max(0, Math.min(1, Number(p) || 0));
  if (!n || !p) return 0;
  if (p >= 1) return n;
  if (p > 0.5) return n - binomialV35(n, 1 - p, random);

  if (n <= 48) {
    let hits = 0;
    for (let i = 0; i < n; i += 1) if (random.unit53() < p) hits += 1;
    return hits;
  }

  const mean = n * p;
  if (mean < 35) return binomialSmallTailV35(n, p, random);

  const variance = mean * (1 - p);
  const sd = Math.sqrt(Math.max(0, variance));
  const z = normalSampleV35(random);
  const skewAdjust = ((1 - 2 * p) / 6) * (z * z - 1);
  return Math.max(0, Math.min(n, Math.round(mean + sd * z + skewAdjust)));
}

function multinomialV35(n, probabilities, random, order = null) {
  const counts = new Float64Array(probabilities.length);
  let remainingN = Math.max(0, Math.floor(Number(n) || 0));
  if (!remainingN) return counts;

  const indices = order || Array.from({ length: probabilities.length }, (_, i) => i);
  let remainingP = 0;
  for (const i of indices) remainingP += Math.max(0, Number(probabilities[i]) || 0);
  if (!(remainingP > 0)) return counts;

  let lastPositive = -1;
  for (let pos = 0; pos < indices.length; pos += 1) {
    const i = indices[pos];
    const p = Math.max(0, Number(probabilities[i]) || 0);
    if (!(p > 0)) continue;
    lastPositive = i;
    if (!(remainingN > 0)) break;

    if (pos === indices.length - 1 || p >= remainingP - 1e-15) {
      counts[i] += remainingN;
      remainingN = 0;
      break;
    }

    const conditional = Math.max(0, Math.min(1, p / remainingP));
    const hit = binomialV35(remainingN, conditional, random);
    counts[i] += hit;
    remainingN -= hit;
    remainingP -= p;
  }

  if (remainingN > 0 && lastPositive >= 0) counts[lastPositive] += remainingN;
  return counts;
}

function borderMaskProbabilitiesV35(rates) {
  const out = new Float64Array(MASK_COUNT);
  for (let mask = 0; mask < MASK_COUNT; mask += 1) {
    let p = 1;
    for (let b = 0; b < BN.length; b += 1) {
      const rate = Math.max(0, Math.min(1, Number(rates[b]) || 0));
      p *= mask & (1 << b) ? rate : 1 - rate;
    }
    out[mask] = p;
  }
  return out;
}

function simulateRunQuickV35(scenario, totalSeconds, seed) {
  const random = makeRngV30(seed);
  const build = scenario.build;
  const weatherStructures = scenario.weatherStructures || {};
  const rollState = simulateRollGroups(build, scenario.weather, totalSeconds, random.unit32);

  const cardTotals = new Float64Array(CARDS.length);
  const cardMasksFlat = new Float64Array(CARDS.length * MASK_COUNT);
  const comboTotals = new Float64Array(MASK_COUNT);
  const borderTotals = new Float64Array(BN.length);
  const borderBuckets = new Map();

  // Card outcomes: preserve the same exact sequential card distribution for
  // every roll-state group, but sample the group as a multinomial batch.
  for (const [groupKey, amount] of rollState.groups) {
    const state = parseGroupKey(groupKey);
    const probabilities = makeCardDistribution(build, state.weather, state.surge, state.dice, weatherStructures);
    const counts = multinomialV35(amount, probabilities, random);

    const borderKey = `${state.weather || 'Normal'}\u0001${state.vic}`;
    let bucket = borderBuckets.get(borderKey);
    if (!bucket) {
      bucket = {
        weather: state.weather,
        vic: state.vic,
        counts: new Float64Array(CARDS.length),
      };
      borderBuckets.set(borderKey, bucket);
    }

    for (let i = 0; i < CARDS.length; i += 1) {
      const count = counts[i];
      if (!(count > 0)) continue;
      cardTotals[i] += count;
      bucket.counts[i] += count;
    }
  }

  let bestCardIndex = -1;
  let bestMask = 0;
  let bestEffective = -1;
  let bestCount = 0;

  // Borders are still independent P/C/R/G checks. Rare border combinations
  // are sampled first so their small-tail binomial draws stay highly accurate.
  for (const bucket of borderBuckets.values()) {
    const rates = borderRatesV30(build, bucket.weather, bucket.vic);
    const maskProbabilities = borderMaskProbabilitiesV35(rates);
    const maskOrder = Array.from({ length: MASK_COUNT }, (_, i) => i)
      .filter((i) => maskProbabilities[i] > 0)
      .sort((a, b) => maskProbabilities[a] - maskProbabilities[b]);

    for (let cardIndex = 0; cardIndex < CARDS.length; cardIndex += 1) {
      const totalForCard = bucket.counts[cardIndex];
      if (!(totalForCard > 0)) continue;
      const masks = multinomialV35(totalForCard, maskProbabilities, random, maskOrder);

      for (let mask = 0; mask < MASK_COUNT; mask += 1) {
        const count = masks[mask];
        if (!(count > 0)) continue;
        cardMasksFlat[cardIndex * MASK_COUNT + mask] += count;
        comboTotals[mask] += count;
        for (let b = 0; b < BN.length; b += 1) if (mask & (1 << b)) borderTotals[b] += count;

        const effective = CARDS[cardIndex].rarity * MASK_MULTIPLIERS[mask];
        if (effective > bestEffective) {
          bestCardIndex = cardIndex;
          bestMask = mask;
          bestEffective = effective;
          bestCount = count;
        } else if (effective === bestEffective && cardIndex === bestCardIndex && mask === bestMask) {
          bestCount += count;
        }
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
    quickMode: true,
    totalRolls: rollState.totalRolls,
    weatherRolls: rollState.weatherRolls,
    uniqueCards,
    cardTotals: Array.from(cardTotals),
    cardMasks,
    borderTotals: Array.from(borderTotals),
    comboTotals: Array.from(comboTotals),
    bestPull: bestCardIndex >= 0 ? {
      cardIndex: bestCardIndex,
      mask: bestMask,
      effectiveRarity: bestEffective,
      count: bestCount,
    } : null,
  };
}

simulateRun = function simulateRunV35(scenario, totalSeconds, seed) {
  return scenario?.build?.quickMode
    ? simulateRunQuickV35(scenario, totalSeconds, seed)
    : __rollSimExactV35(scenario, totalSeconds, seed);
};
