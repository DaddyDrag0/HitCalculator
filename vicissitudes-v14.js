(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE = 'hitCalcVicissitudesV14';
  const BN = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const B = {
    Platinum: { d: 100, m: 100 },
    Crystal: { d: 1e4, m: 1e4 },
    Ruby: { d: 1e5, m: 1e5 },
    Galaxy: { d: 1e6, m: 1e6 },
  };
  const SK = {
    Luck: [0, 15, 30, 45, 60, 75, 90, 150],
    RollSpeed: [0, 5, 10, 15, 20, 25, 30, 45],
    AllStat: [0, 3, 6, 11],
    Platinum: [0, 0.5, 1, 1.5, 2, 2.5, 5],
    Crystal: [0, 1.75, 3.5, 5.25, 7, 8.75, 14.75],
    Ruby: [0, 1.5, 3, 4.5, 6, 7.5, 13.5],
    Galaxy: [0, 4, 8, 12, 16, 20, 30],
  };
  const CH = {
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
  const DUNGEON = {
    Luck: { id: 'uvDungeonLuck', per: 10 },
    Speed: { id: 'uvDungeonSpeed', per: 10 },
    Platinum: { id: 'uvDungeonPlatinum', per: 0.25 },
    Crystal: { id: 'uvDungeonCrystal', per: 0.5 },
    Ruby: { id: 'uvDungeonRuby', per: 0.75 },
    Galaxy: { id: 'uvDungeonGalaxy', per: 2 },
  };
  const DUNGEON_MAX = 25;
  const TU = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  const TH = Array.from({ length: 22 }, (_, i) => 10 ** (i + 1));
  const SFX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const VIC_STATES = [];

  for (const plus of BN) {
    for (const minus of BN) {
      if (plus === minus) continue;
      const factors = Object.fromEntries(BN.map((name) => [name, name === plus ? 1.1 : name === minus ? 0.9 : 1]));
      VIC_STATES.push(factors);
    }
  }

  const on = (id) => !!$(id)?.checked;
  const num = (id, fallback = 0) => {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const lvl = (id, max) => Math.max(0, Math.min(max, Math.floor(num(id))));
  const skill = (name, id) => SK[name][lvl(id, SK[name].length - 1)] || 0;
  const sm = (kind, level) => (kind === 'Luck' || kind === 'Speed' ? 1 + 0.5 * level / 7 : 1 + level / 5);

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

  function dungeonBonus(name) {
    const cfg = DUNGEON[name];
    return lvl(cfg.id, DUNGEON_MAX) * cfg.per;
  }

  function stats() {
    const rolls = Math.max(0, Math.floor(num('uvRolls')));
    const charm = CH[$('uvCharm')?.value] || {};
    const s = {
      Luck: skill('Luck', 'uvSkillLuck'),
      RollSpeed: skill('RollSpeed', 'uvSkillSpeed'),
      AllStat: skill('AllStat', 'uvSkillAll'),
      Platinum: skill('Platinum', 'uvSkillPlatinum'),
      Crystal: skill('Crystal', 'uvSkillCrystal'),
      Ruby: skill('Ruby', 'uvSkillRuby'),
      Galaxy: skill('Galaxy', 'uvSkillGalaxy'),
    };
    const st = {
      Luck: lvl('uvStructureLuck', 7),
      Speed: lvl('uvStructureSpeed', 7),
      Platinum: lvl('uvStructurePlatinum', 5),
      Crystal: lvl('uvStructureCrystal', 5),
      Ruby: lvl('uvStructureRuby', 5),
      Galaxy: lvl('uvStructureGalaxy', 5),
    };

    let luck = 1 + Math.floor(rolls / 1e6) * 0.1 + (charm.Luck || 0);
    luck *= 1 + (s.Luck + s.AllStat) / 100;
    if (on('uvPotLuck3')) luck += 25;
    if (on('uvPotLegendaryLuck')) luck += 40;
    if (on('uvPotCursed')) luck *= 1.5;
    if (on('uvPotElixir')) luck *= 2;
    if (on('uvPotEventLuck')) luck *= 1.25;
    luck *= sm('Luck', st.Luck);
    luck += dungeonBonus('Luck');
    luck += chaska(num('uvChaskaLuck'), 0.25);
    if (on('uvQuickdraw')) luck *= 0.8;
    if (on('uvHeavyHand')) luck *= 1.2;

    let speed = 100 + (on('uvPotSpeed3') ? 300 : 0) + (on('uvPotLegendarySpeed') ? 500 : 0) + (charm.Cooldown || 0);
    speed *= 1 + (s.RollSpeed + s.AllStat) / 100;
    if (on('uvPotEventSpeed')) speed *= 1.25;
    speed += dungeonBonus('Speed');
    if (on('uvQuickdraw')) speed *= 1.1;
    if (on('uvHeavyHand')) speed *= 0.9;

    const cb = {
      Platinum: chaska(num('uvChaskaPlatinum'), 0.05),
      Crystal: chaska(num('uvChaskaCrystal'), 0.10),
      Ruby: 0,
      Galaxy: chaska(num('uvChaskaGalaxy'), 0.25),
    };
    const be = {};
    const boost = on('uvBorderBoost') ? 1.5 : 1;
    const divine = on('uvPotDivine') ? 1.1 : 1;
    const all = 1 + s.AllStat / 100;
    for (const name of BN) {
      let base = (1 + (charm[name] || 0) + s[name]) * all;
      base *= sm(name, st[name]);
      be[name] = (base * boost + dungeonBonus(name) + cb[name]) * divine;
    }

    const timeStorm = on('uvTimeStorm');
    const cps = (speed / 100) * sm('Speed', st.Speed) * (timeStorm ? 2 : 1);
    return {
      luck,
      be,
      cps,
      timeStorm,
      boss: on('uvBossPot'),
      surge: on('uvLuckySurge'),
      dice: on('uvDice'),
    };
  }

  function borderRate(name, s, factors) {
    return Math.min(1, Math.max(0, (s.be[name] * factors[name]) / B[name].d));
  }

  function combinationRate(names, s) {
    let total = 0;
    for (const factors of VIC_STATES) {
      let rate = 1;
      for (const name of names) rate *= borderRate(name, s, factors);
      total += rate;
    }
    return total / VIC_STATES.length;
  }

  function borderOutcomes(s) {
    const probabilities = Array(16).fill(0);
    const multipliers = Array(16).fill(1);
    for (let mask = 0; mask < 16; mask += 1) {
      let multiplier = 1;
      for (let i = 0; i < BN.length; i += 1) if (mask & (1 << i)) multiplier *= B[BN[i]].m;
      multipliers[mask] = multiplier;
    }

    for (const factors of VIC_STATES) {
      for (let mask = 0; mask < 16; mask += 1) {
        let probability = 1;
        for (let i = 0; i < BN.length; i += 1) {
          const name = BN[i];
          const rate = borderRate(name, s, factors);
          probability *= mask & (1 << i) ? rate : 1 - rate;
        }
        probabilities[mask] += probability / VIC_STATES.length;
      }
    }

    return probabilities.map((p, mask) => ({ p, m: multipliers[mask] })).filter((entry) => entry.p > 0);
  }

  function activeCards(s) {
    const now = Date.now() / 1000;
    const pool = typeof CARD_POOL !== 'undefined' ? CARD_POOL : [];
    return pool.filter((card) => !(card.expires && card.expires <= now) && (!card.weather || (card.weather === 'Time Storm' && s.timeStorm)));
  }

  function luckStates(s) {
    const surge = s.surge && s.cps > 0 ? Math.min(1, 10 / (30 + 100 / s.cps)) : 0;
    const dice = s.dice ? 1 / 25 : 0;
    const normal = 1 - dice;
    const states = [];
    if (1 - surge > 0) {
      states.push([1, (1 - surge) * normal]);
      if (dice) states.push([2, (1 - surge) * dice]);
    }
    if (surge) {
      states.push([1.25, surge * normal]);
      if (dice) states.push([2.5, surge * dice]);
    }
    return states;
  }

  function distAt(s, multiplier) {
    const cards = activeCards(s);
    const out = [];
    let remaining = 1;
    for (const card of cards) {
      const rarity = card.rarity * (card.rollFactor || 1);
      const boss = s.boss && card.boss ? 5 : 1;
      const success = Math.min(1, s.luck * multiplier * boss / rarity);
      const hit = remaining * success;
      if (hit > 0) out.push({ card, probability: hit });
      remaining *= 1 - success;
      if (remaining <= 0) break;
    }
    if (remaining > 0 && cards.length) {
      const card = cards[cards.length - 1];
      const found = out.find((entry) => entry.card.name === card.name);
      if (found) found.probability += remaining;
      else out.push({ card, probability: remaining });
    }
    return out;
  }

  function distribution(s) {
    const map = new Map();
    for (const [multiplier, weight] of luckStates(s)) {
      for (const entry of distAt(s, multiplier)) {
        const found = map.get(entry.card.name);
        if (found) found.probability += entry.probability * weight;
        else map.set(entry.card.name, { card: entry.card, probability: entry.probability * weight });
      }
    }
    return [...map.values()];
  }

  function thresholdRate(target, s, dist, outcomes) {
    if (!(target > 0)) return 0;
    let rate = 0;
    for (const entry of dist) {
      let borderHit = 0;
      for (const outcome of outcomes) if (entry.card.rarity * outcome.m >= target) borderHit += outcome.p;
      rate += entry.probability * borderHit;
    }
    return Math.min(1, Math.max(0, rate));
  }

  const fixed = (value, digits) => value.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');

  function fn(value, decimals = 0) {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= SFX.length) return value.toExponential(2);
    const scaled = value / 1000 ** tier;
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${fixed(scaled, digits)}${SFX[tier]}`;
  }

  function ft(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    if (seconds < 60) return `${fixed(seconds, seconds < 10 ? 2 : 1)}s`;
    const total = Math.round(seconds);
    const years = Math.floor(total / 31557600);
    const days = Math.floor((total % 31557600) / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (years >= 1000) return `${fn(years)}y`;
    const parts = [];
    if (years) parts.push(`${years}y`);
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!years && !days && !hours && secs) parts.push(`${secs}s`);
    return parts.slice(0, 3).join(' ') || '0s';
  }

  function fs(expected) {
    if (!Number.isFinite(expected) || expected <= 0) return '0%';
    const raw = expected * 100;
    if (raw < 1) return `1 / ${fn(1 / expected, 2)}`;
    const percent = Math.min(2000, raw);
    if (percent >= 2000) return '2000%';
    return percent >= 10 ? `${fixed(percent, 1)}%` : `${fixed(percent, 2)}%`;
  }

  const selected = () => [...document.querySelectorAll('#upgradeCalcV2 .uv-border.active')].map((button) => button.dataset.border).filter((name) => B[name]);

  function chip(name) {
    const span = document.createElement('span');
    span.className = `uv-mini-chip ${name.toLowerCase()}`;
    span.textContent = name;
    return span;
  }

  function item(labels, value, rarity = false) {
    const div = document.createElement('div');
    div.className = 'uv-chance';
    const label = document.createElement('div');
    label.className = 'uv-chance-label';
    if (rarity) {
      const c = document.createElement('span');
      c.className = 'uv-mini-chip';
      c.textContent = labels;
      label.append(c);
    } else labels.forEach((name) => label.append(chip(name)));
    const strong = document.createElement('strong');
    strong.textContent = value;
    div.append(label, strong);
    return div;
  }

  function renderVicissitudes() {
    if (!on('uvVicissitudes')) return;
    const s = stats();
    const dist = distribution(s);
    const outcomes = borderOutcomes(s);
    const selectedBorders = selected();
    const borderRate = selectedBorders.length ? combinationRate(selectedBorders, s) : 0;
    const borderRolls = borderRate > 0 ? 1 / borderRate : Infinity;
    const target = Math.max(1, num('uvCardRarity', 1e6));
    const cardRate = thresholdRate(target, s, dist, outcomes);
    const cardRolls = cardRate > 0 ? 1 / cardRate : Infinity;

    if ($('uvBorderRolls')) $('uvBorderRolls').textContent = fn(borderRolls);
    if ($('uvBorderTime')) $('uvBorderTime').textContent = ft(borderRolls / s.cps);
    if ($('uvCardRolls')) $('uvCardRolls').textContent = fn(cardRolls);
    if ($('uvCardTime')) $('uvCardTime').textContent = ft(cardRolls / s.cps);

    const seconds = Math.max(0, num('uvTimeValue', 1)) * (TU[$('uvTimeUnit')?.value] || 3600);
    const rolls = Math.max(0, Math.floor(seconds * s.cps));

    const borderGrid = $('uvBorderChanceGrid');
    if (borderGrid) {
      borderGrid.replaceChildren();
      const combos = [];
      for (let mask = 1; mask < 16; mask += 1) {
        const names = [];
        for (let i = 0; i < BN.length; i += 1) if (mask & (1 << i)) names.push(BN[i]);
        combos.push({ names, rate: combinationRate(names, s) });
      }
      combos.sort((a, b) => a.names.length - b.names.length || b.rate - a.rate);
      for (const combo of combos) borderGrid.append(item(combo.names, fs(combo.rate * rolls)));
    }

    const cardGrid = $('uvCardChanceGrid');
    if (cardGrid) {
      cardGrid.replaceChildren();
      for (const threshold of TH) cardGrid.append(item(`≥ ${fn(threshold)}`, fs(thresholdRate(threshold, s, dist, outcomes) * rolls), true));
    }
  }

  function fixAllStatDisplay() {
    const branch = document.querySelector('#upgradeCalcV2 .uv-tree-branch.allstat');
    if (!branch) return;
    for (const node of branch.querySelectorAll('.uv-tree-node')) {
      const small = node.querySelector('.uv-tree-node-copy small');
      if (small) small.textContent = '5 SP';
    }
  }

  function buildToggle() {
    const mods = document.querySelector('#upgradeCalcV2 .uv-tool-modifiers .uv-toggle-grid');
    if (!mods || $('uvVicissitudes')) return;
    const label = document.createElement('label');
    label.className = 'uv-toggle';
    label.title = 'Every 60 seconds, one random border gets +10% final odds and a different random border gets -10%. Hit Calc averages all 12 possible states.';
    label.innerHTML = '<input id="uvVicissitudes" type="checkbox"><span>Vicissitudes</span>';
    mods.append(label);
    try { $('uvVicissitudes').checked = localStorage.getItem(STORAGE) === '1'; } catch {}
  }

  function save() {
    try { localStorage.setItem(STORAGE, on('uvVicissitudes') ? '1' : '0'); } catch {}
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      queued = false;
      fixAllStatDisplay();
      renderVicissitudes();
      save();
    }));
  }

  function bind() {
    const root = $('upgradeCalcV2');
    if (!root) return;
    root.addEventListener('input', schedule);
    root.addEventListener('change', schedule);
    root.addEventListener('click', schedule);
    $('resetBtn')?.addEventListener('click', () => setTimeout(() => {
      if ($('uvVicissitudes')) $('uvVicissitudes').checked = false;
      save();
      schedule();
    }, 0));
  }

  function init() {
    if (!$('upgradeCalcV2')) return;
    buildToggle();
    bind();
    fixAllStatDisplay();
    schedule();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
