importScripts('./roll-sim-worker-v30.js?rev=20260826-1648');

// Separate analytical estimator used only by fast-estimate-test.html.
// It never iterates once per roll and never replaces the normal simulator worker.

chaska = function chaskaFast(points, rate) {
  const totalPoints = Math.max(0, Math.min(200000, Math.floor(Number(points) || 0)));
  if (!totalPoints || !rate) return 0;
  const blocks = Math.floor(totalPoints / 50);
  const remainder = totalPoints % 50;
  const full = blocks > 0 ? 50 * rate * (1 - 0.85 ** blocks) / 0.15 : 0;
  return full + remainder * rate * 0.85 ** blocks;
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function borderMaskProbabilities(build, weather) {
  const out = new Float64Array(MASK_COUNT);
  const states = build.modifiers?.vicissitudes ? VIC_STATES.map((_, i) => i) : [-1];
  for (const vic of states) {
    const rates = borderRatesV30(build, weather, vic);
    for (let mask = 0; mask < MASK_COUNT; mask += 1) {
      let p = 1;
      for (let b = 0; b < BN.length; b += 1) {
        const rate = clamp01(rates[b]);
        p *= (mask & (1 << b)) ? rate : 1 - rate;
      }
      out[mask] += p / states.length;
    }
  }
  return out;
}

function rollGroups(build, weather, totalSeconds) {
  const rps = Math.max(0, rollsPerSecond(build, weather));
  const totalRolls = Math.max(0, totalSeconds * rps);
  if (!(totalRolls > 0)) return { totalRolls: 0, groups: [] };

  let surgeShare = 0;
  if (build.modifiers?.luckySurge && rps > 0) {
    const procChance = Math.max(1e-12, Number(DATA.relics?.LuckySurge?.procChance) || 0.01);
    const duration = Math.max(0, Number(DATA.relics?.LuckySurge?.duration) || 10);
    const cooldown = Math.max(duration, Number(DATA.relics?.LuckySurge?.cooldown) || 30);
    const expectedWait = 1 / (procChance * rps);
    surgeShare = clamp01(duration / (cooldown + expectedWait));
  }

  const diceShare = build.modifiers?.dice ? 1 / 25 : 0;
  const groups = [];
  for (const surge of [false, true]) {
    const surgeWeight = surge ? surgeShare : 1 - surgeShare;
    if (!(surgeWeight > 0)) continue;
    for (const dice of [false, true]) {
      const diceWeight = dice ? diceShare : 1 - diceShare;
      const rolls = totalRolls * surgeWeight * diceWeight;
      if (rolls > 0) groups.push({ surge, dice, rolls });
    }
  }
  return { totalRolls, groups };
}

function safeHitChance(logNoHit) {
  if (!Number.isFinite(logNoHit)) return logNoHit === -Infinity ? 1 : 0;
  if (logNoHit >= 0) return 0;
  return clamp01(-Math.expm1(logNoHit));
}

function addNoHit(logValue, rolls, probability) {
  const p = clamp01(probability);
  if (!(rolls > 0) || !(p > 0)) return logValue;
  if (p >= 1) return -Infinity;
  return logValue + rolls * Math.log1p(-p);
}

function maskLabel(mask) {
  if (!mask) return 'No Border';
  const names = [];
  for (let i = 0; i < BN.length; i += 1) if (mask & (1 << i)) names.push(BN[i]);
  return names.join(' + ');
}

function thresholdPowers() {
  const values = [];
  for (let power = 13; power <= 30; power += 1) values.push(power);
  return values;
}

function estimate(message) {
  const scenario = message.scenario || {};
  const build = scenario.build || {};
  const weather = scenario.weather || null;
  const weatherStructures = scenario.weatherStructures || {};
  const totalSeconds = Math.max(1, Math.min(172800, Number(message.durationSeconds) || 1));
  const runCount = Math.max(1, Math.min(1000, Math.floor(Number(message.runs) || 1)));
  const rollState = rollGroups(build, weather, totalSeconds);
  const borderProbs = borderMaskProbabilities(build, weather);
  const outcomeExpected = new Float64Array(CARDS.length * MASK_COUNT);
  const outcomeNoHit = new Float64Array(CARDS.length * MASK_COUNT);
  const cardExpected = new Float64Array(CARDS.length);
  const cardNoHit = new Float64Array(CARDS.length);
  const comboExpected = new Float64Array(MASK_COUNT);
  const thresholdExpected = new Float64Array(thresholdPowers().length);
  const thresholdNoHit = new Float64Array(thresholdPowers().length);
  const powers = thresholdPowers();

  for (const group of rollState.groups) {
    const cardProbs = makeCardDistribution(build, weather, group.surge, group.dice, weatherStructures);

    for (let c = 0; c < CARDS.length; c += 1) {
      const cp = Number(cardProbs[c]) || 0;
      if (!(cp > 0)) continue;
      cardExpected[c] += group.rolls * cp;
      cardNoHit[c] = addNoHit(cardNoHit[c], group.rolls, cp);

      for (let mask = 0; mask < MASK_COUNT; mask += 1) {
        const mp = Number(borderProbs[mask]) || 0;
        if (!(mp > 0)) continue;
        const joint = cp * mp;
        const index = c * MASK_COUNT + mask;
        outcomeExpected[index] += group.rolls * joint;
        outcomeNoHit[index] = addNoHit(outcomeNoHit[index], group.rolls, joint);
      }
    }

    for (let mask = 0; mask < MASK_COUNT; mask += 1) comboExpected[mask] += group.rolls * (Number(borderProbs[mask]) || 0);

    for (let t = 0; t < powers.length; t += 1) {
      const threshold = 10 ** powers[t];
      let probability = 0;
      for (let c = 0; c < CARDS.length; c += 1) {
        const cp = Number(cardProbs[c]) || 0;
        if (!(cp > 0)) continue;
        const rarity = Number(CARDS[c].rarity) || 0;
        for (let mask = 0; mask < MASK_COUNT; mask += 1) {
          if (rarity * MASK_MULTIPLIERS[mask] < threshold) continue;
          probability += cp * (Number(borderProbs[mask]) || 0);
        }
      }
      probability = clamp01(probability);
      thresholdExpected[t] += group.rolls * probability;
      thresholdNoHit[t] = addNoHit(thresholdNoHit[t], group.rolls, probability);
    }
  }

  let uniqueExpected = 0;
  for (let c = 0; c < CARDS.length; c += 1) uniqueExpected += safeHitChance(cardNoHit[c]);

  const thresholds = powers.map((power, index) => ({
    power,
    expectedPerRun: thresholdExpected[index],
    chancePerRun: safeHitChance(thresholdNoHit[index]),
  }));

  const combos = [];
  for (let mask = 0; mask < MASK_COUNT; mask += 1) {
    const expectedPerRun = comboExpected[mask];
    combos.push({
      mask,
      label: maskLabel(mask),
      expectedPerRun,
      share: rollState.totalRolls > 0 ? expectedPerRun / rollState.totalRolls : 0,
      expectedTotal: expectedPerRun * runCount,
    });
  }

  const outcomes = [];
  for (let c = 0; c < CARDS.length; c += 1) {
    for (let mask = 0; mask < MASK_COUNT; mask += 1) {
      const index = c * MASK_COUNT + mask;
      const expectedPerRun = outcomeExpected[index];
      if (!(expectedPerRun > 0)) continue;
      const chancePerRun = safeHitChance(outcomeNoHit[index]);
      const chanceAcrossRuns = 1 - (1 - chancePerRun) ** runCount;
      if (chanceAcrossRuns < 0.001) continue;
      outcomes.push({
        cardIndex: c,
        card: CARDS[c].name,
        weather: CARDS[c].weather || null,
        pack: CARDS[c].pack || null,
        mask,
        border: maskLabel(mask),
        effectiveRarity: (Number(CARDS[c].rarity) || 0) * MASK_MULTIPLIERS[mask],
        expectedPerRun,
        chancePerRun,
        expectedRunsHit: chancePerRun * runCount,
        chanceAcrossRuns,
      });
    }
  }
  outcomes.sort((a, b) => b.effectiveRarity - a.effectiveRarity || b.chanceAcrossRuns - a.chanceAcrossRuns);

  return {
    type: 'estimate-result',
    durationSeconds: totalSeconds,
    runs: runCount,
    totalRollsPerRun: rollState.totalRolls,
    uniqueExpected,
    thresholds,
    combos,
    outcomes: outcomes.slice(0, 30),
    weather: weather || 'Normal',
  };
}

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type !== 'estimate') return;
  try {
    self.postMessage(estimate(message));
  } catch (error) {
    self.postMessage({ type: 'estimate-error', message: error?.message || String(error), stack: error?.stack || '' });
  }
};
