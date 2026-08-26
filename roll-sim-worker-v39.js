importScripts('./roll-sim-worker-v38.js?rev=20260826-1702');

// Quick Simulation is intentionally isolated from the exact roll loop.
// Every run below has bounded work: <= 24 weather segments, <= 4 card states
// per segment, 183 cards, and 16 border masks. It never loops once per roll.

function normalV39(random) {
  const u = Math.max(Number.MIN_VALUE, random.unit53());
  const v = random.unit53();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function poissonV39(lambda, random) {
  lambda = Math.max(0, Number(lambda) || 0);
  if (!lambda) return 0;

  if (lambda < 24) {
    const stop = Math.exp(-lambda);
    let product = 1;
    for (let k = 0; k < 128; k += 1) {
      product *= Math.max(Number.MIN_VALUE, random.unit53());
      if (product <= stop) return k;
    }
  }

  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normalV39(random)));
}

function binomialV39(n, p, random) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  p = Math.max(0, Math.min(1, Number(p) || 0));
  if (!n || !p) return 0;
  if (p >= 1) return n;
  if (p > 0.5) return n - binomialV39(n, 1 - p, random);

  if (n <= 64) {
    let hits = 0;
    for (let i = 0; i < n; i += 1) if (random.unit53() < p) hits += 1;
    return hits;
  }

  const mean = n * p;
  if (mean < 24 && p <= 0.08) return Math.min(n, poissonV39(mean, random));

  const variance = Math.max(0, mean * (1 - p));
  const z = normalV39(random);
  const skew = ((1 - 2 * p) / 6) * (z * z - 1);
  return Math.max(0, Math.min(n, Math.round(mean + Math.sqrt(variance) * z + skew)));
}

function multinomialV39(n, probabilities, random, order = null) {
  const counts = new Uint32Array(probabilities.length);
  let remainingN = Math.max(0, Math.floor(Number(n) || 0));
  if (!remainingN) return counts;

  const indices = order || Array.from({ length: probabilities.length }, (_, i) => i);
  let remainingP = 0;
  let last = -1;
  for (const i of indices) {
    const p = Math.max(0, Number(probabilities[i]) || 0);
    if (p > 0) {
      remainingP += p;
      last = i;
    }
  }
  if (!(remainingP > 0) || last < 0) return counts;

  for (const i of indices) {
    const p = Math.max(0, Number(probabilities[i]) || 0);
    if (!(p > 0) || !(remainingN > 0)) continue;
    if (i === last || p >= remainingP - 1e-15) {
      counts[i] += remainingN;
      remainingN = 0;
      break;
    }
    const conditional = Math.max(0, Math.min(1, p / remainingP));
    const hit = binomialV39(remainingN, conditional, random);
    counts[i] += hit;
    remainingN -= hit;
    remainingP = Math.max(0, remainingP - p);
  }

  if (remainingN > 0) counts[last] += remainingN;
  return counts;
}

function weatherPlanV39(config, totalSeconds) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const mode = config?.mode || 'none';
  if (mode === 'fixed') return [{ weather: config?.fixed || null, seconds: total }];
  if (mode !== 'schedule') return [{ weather: null, seconds: total }];

  const plan = [];
  let used = 0;
  for (const segment of (config?.segments || []).slice(0, 24)) {
    if (used >= total) break;
    const seconds = Math.max(0, Math.min(total - used, Number(segment?.durationSeconds) || 0));
    if (!seconds) continue;
    plan.push({ weather: segment?.weather || null, seconds });
    used += seconds;
  }
  if (used < total) plan.push({ weather: null, seconds: total - used });
  return plan.length ? plan : [{ weather: null, seconds: total }];
}

function borderMaskProbabilitiesV39(build, weather) {
  const out = new Float64Array(MASK_COUNT);
  const vicEnabled = !!build?.modifiers?.vicissitudes;
  const states = vicEnabled ? VIC_STATES.map((_, i) => i) : [-1];

  for (const vicIndex of states) {
    const rates = borderRatesV30(build, weather, vicIndex);
    for (let mask = 0; mask < MASK_COUNT; mask += 1) {
      let p = 1;
      for (let b = 0; b < BN.length; b += 1) {
        const rate = Math.max(0, Math.min(1, Number(rates[b]) || 0));
        p *= mask & (1 << b) ? rate : 1 - rate;
      }
      out[mask] += p / states.length;
    }
  }
  return out;
}

function surgeFractionV39(build, rps) {
  if (!build?.modifiers?.luckySurge || !(rps > 0)) return 0;
  // Same steady-state approximation already used by the target calculator:
  // ~100 rolls to proc at 1%, 10s active, 30s cooldown.
  return Math.max(0, Math.min(1, 10 / (30 + 100 / rps)));
}

function simulateRunQuickV39(scenario, totalSeconds, seed) {
  const random = makeRngV30(seed);
  const build = scenario?.build || {};
  const weatherStructures = scenario?.weatherStructures || {};
  const plan = weatherPlanV39(scenario?.weather, totalSeconds);

  const cardTotals = new Uint32Array(CARDS.length);
  const cardMasksFlat = new Uint32Array(CARDS.length * MASK_COUNT);
  const comboTotals = new Uint32Array(MASK_COUNT);
  const borderTotals = new Uint32Array(BN.length);
  const weatherRolls = {};

  let totalRolls = 0;
  let rollFraction = 0;
  let diceCounter = 0;
  let bestCardIndex = -1;
  let bestMask = 0;
  let bestEffective = -1;
  let bestCount = 0;

  for (const segment of plan) {
    const weather = segment.weather || null;
    const rps = rollsPerSecond(build, weather);
    const exactRolls = segment.seconds * rps + rollFraction;
    const segmentRolls = Math.max(0, Math.floor(exactRolls + 1e-9));
    rollFraction = Math.max(0, exactRolls - segmentRolls);
    if (!segmentRolls) continue;

    totalRolls += segmentRolls;
    const weatherKey = weather || 'Normal';
    weatherRolls[weatherKey] = (weatherRolls[weatherKey] || 0) + segmentRolls;

    let diceRolls = 0;
    if (build?.modifiers?.dice) {
      diceRolls = Math.floor((diceCounter + segmentRolls) / 25);
      diceCounter = (diceCounter + segmentRolls) % 25;
    }
    const ordinaryRolls = segmentRolls - diceRolls;
    const surgeFraction = surgeFractionV39(build, rps);
    const surgeOrdinary = binomialV39(ordinaryRolls, surgeFraction, random);
    const surgeDice = binomialV39(diceRolls, surgeFraction, random);

    const groups = [
      { amount: ordinaryRolls - surgeOrdinary, surge: false, dice: false },
      { amount: diceRolls - surgeDice, surge: false, dice: true },
      { amount: surgeOrdinary, surge: true, dice: false },
      { amount: surgeDice, surge: true, dice: true },
    ];

    const segmentCards = new Uint32Array(CARDS.length);
    for (const group of groups) {
      if (!(group.amount > 0)) continue;
      const probabilities = makeCardDistribution(build, weather, group.surge, group.dice, weatherStructures);
      const counts = multinomialV39(group.amount, probabilities, random);
      for (let cardIndex = 0; cardIndex < CARDS.length; cardIndex += 1) {
        const count = counts[cardIndex];
        if (!count) continue;
        cardTotals[cardIndex] += count;
        segmentCards[cardIndex] += count;
      }
    }

    const maskProbabilities = borderMaskProbabilitiesV39(build, weather);
    const maskOrder = Array.from({ length: MASK_COUNT }, (_, i) => i)
      .filter((i) => maskProbabilities[i] > 0)
      .sort((a, b) => maskProbabilities[a] - maskProbabilities[b]);

    for (let cardIndex = 0; cardIndex < CARDS.length; cardIndex += 1) {
      const amount = segmentCards[cardIndex];
      if (!amount) continue;
      const masks = multinomialV39(amount, maskProbabilities, random, maskOrder);
      for (let mask = 0; mask < MASK_COUNT; mask += 1) {
        const count = masks[mask];
        if (!count) continue;
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
    cardMasksFlat.subarray(index * MASK_COUNT, index * MASK_COUNT + MASK_COUNT)
  );

  return {
    seed,
    quickMode: true,
    totalRolls,
    weatherRolls,
    uniqueCards,
    cardTotals,
    cardMasks,
    borderTotals,
    comboTotals,
    bestPull: bestCardIndex >= 0 ? {
      cardIndex: bestCardIndex,
      mask: bestMask,
      effectiveRarity: bestEffective,
      count: bestCount,
    } : null,
  };
}

simulateRun = simulateRunQuickV39;
