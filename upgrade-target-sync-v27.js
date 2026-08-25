(() => {
  const $ = (id) => document.getElementById(id);
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  const BN = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const B = {
    Platinum: { d: 100, m: 100 },
    Crystal: { d: 1e4, m: 1e4 },
    Ruby: { d: 1e5, m: 1e5 },
    Galaxy: { d: 1e6, m: 1e6 },
  };
  const SK = {
    Luck:[0,15,30,45,60,75,90,150], RollSpeed:[0,5,10,15,20,25,30,45], AllStat:[0,3,6,11],
    Platinum:[0,.5,1,1.5,2,2.5,5], Crystal:[0,1.75,3.5,5.25,7,8.75,14.75], Ruby:[0,1.5,3,4.5,6,7.5,13.5], Galaxy:[0,4,8,12,16,20,30],
  };
  const CH = {
    None:{}, 'Old Tome':{Luck:.5}, 'Holy Cross':{Luck:1}, Bloodstone:{Luck:2}, 'Lunar Charm':{Luck:2.5,Cooldown:10},
    'Blood Moon':{Luck:3,Cooldown:20}, 'Ice Crystal':{Luck:3.5,Cooldown:30}, "Victor's Trophy":{Luck:5,Cooldown:40},
    'Phoenix Feather':{Luck:5.5,Cooldown:50}, 'Hell Charm':{Luck:7.5,Cooldown:60}, "Emperor's Hand":{Luck:10,Cooldown:75},
    'Heavenly Crown':{Luck:15,Cooldown:100}, Durandal:{Luck:7,Cooldown:60}, 'Platinum Gem':{Luck:10,Platinum:.5,Cooldown:80},
    'Crystal Gem':{Luck:12,Platinum:.5,Crystal:.5,Cooldown:100}, 'Dark Star':{Luck:15,Platinum:.5,Crystal:.5,Ruby:.5,Galaxy:.5,Cooldown:125},
    'Infinity Gem':{Luck:20,Platinum:1,Crystal:1,Ruby:1,Galaxy:1,Cooldown:150}, 'Lucky Crown':{Luck:27,Platinum:1.5,Crystal:1.5,Ruby:1.5,Galaxy:1.5,Cooldown:175},
    'Forbidden Book':{Luck:35,Platinum:2,Crystal:2,Ruby:2,Galaxy:2,Cooldown:200}, "Angel's Halo":{Luck:42,Platinum:3,Crystal:3,Ruby:3,Galaxy:3,Cooldown:200},
    'Forbidden Fruit':{Luck:50,Platinum:4,Crystal:4,Ruby:4,Galaxy:4,Cooldown:200}, 'Book of Life and Death':{Luck:66,Platinum:6,Crystal:6,Ruby:6,Galaxy:6,Cooldown:200},
  };
  const D = { Luck:10, Speed:10, Platinum:.25, Crystal:.5, Ruby:.75, Galaxy:2 };
  const TU = { second:1, minute:60, hour:3600, day:86400, week:604800 };
  const TH = Array.from({ length:22 }, (_, i) => 10 ** (i + 1));
  const SFX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const NEUTRAL = Object.freeze({ Platinum:1, Crystal:1, Ruby:1, Galaxy:1 });
  const VIC = [];
  for (const plus of BN) for (const minus of BN) if (plus !== minus) {
    VIC.push(Object.fromEntries(BN.map((name) => [name, name === plus ? 1.1 : name === minus ? .9 : 1])));
  }

  const num = (id, fallback = 0) => {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const on = (id) => !!$(id)?.checked;
  const lvl = (id, max) => Math.max(0, Math.min(max, Math.floor(num(id))));
  const skill = (name, id) => SK[name][lvl(id, SK[name].length - 1)] || 0;
  const sm = (kind, level) => kind === 'Luck' || kind === 'Speed' ? 1 + .5 * level / 7 : 1 + level / 5;

  function chaska(points, rate) {
    let left = Math.max(0, Math.floor(Number(points) || 0)), block = 0, total = 0;
    while (left > 0) {
      const amount = Math.min(50, left);
      total += amount * rate * .85 ** block;
      left -= amount;
      block += 1;
    }
    return total;
  }

  function fixed(value, digits) {
    return value.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  }
  function fmt(value, decimals = 0) {
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
    if (years >= 1000) return `${fmt(years)}y`;
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
    if (raw < 1) return `1 / ${fmt(1 / expected, 2)}`;
    const pct = Math.min(2000, raw);
    if (pct >= 2000) return '2000%';
    return pct >= 10 ? `${fixed(pct, 1)}%` : `${fixed(pct, 2)}%`;
  }

  function stats() {
    const rolls = Math.max(0, Math.floor(num('uvRolls')));
    const charm = CH[$('uvCharm')?.value] || {};
    const s = {
      Luck:skill('Luck','uvSkillLuck'), RollSpeed:skill('RollSpeed','uvSkillSpeed'), AllStat:skill('AllStat','uvSkillAll'),
      Platinum:skill('Platinum','uvSkillPlatinum'), Crystal:skill('Crystal','uvSkillCrystal'), Ruby:skill('Ruby','uvSkillRuby'), Galaxy:skill('Galaxy','uvSkillGalaxy'),
    };
    const st = {
      Luck:lvl('uvStructureLuck',7), Speed:lvl('uvStructureSpeed',7), Platinum:lvl('uvStructurePlatinum',5),
      Crystal:lvl('uvStructureCrystal',5), Ruby:lvl('uvStructureRuby',5), Galaxy:lvl('uvStructureGalaxy',5),
    };

    let luck = 1 + Math.floor(rolls / 1e6) * .1 + (charm.Luck || 0);
    luck *= 1 + (s.Luck + s.AllStat) / 100;
    if (on('uvPotLuck3')) luck += 25;
    if (on('uvPotLegendaryLuck')) luck += 40;
    if (on('uvPotCursed')) luck *= 1.5;
    if (on('uvPotElixir')) luck *= 2;
    if (on('uvPotEventLuck')) luck *= 1.25;
    luck *= sm('Luck', st.Luck);
    luck += lvl('uvDungeonLuck', 25) * D.Luck;
    luck += chaska(num('uvChaskaLuck'), .25);
    if (on('uvQuickdraw')) luck *= .8;
    if (on('uvHeavyHand')) luck *= 1.2;

    let speed = 100 + (on('uvPotSpeed3') ? 300 : 0) + (on('uvPotLegendarySpeed') ? 500 : 0) + (charm.Cooldown || 0);
    speed *= 1 + (s.RollSpeed + s.AllStat) / 100;
    if (on('uvPotEventSpeed')) speed *= 1.25;
    speed += lvl('uvDungeonSpeed', 25) * D.Speed;
    if (on('uvQuickdraw')) speed *= 1.1;
    if (on('uvHeavyHand')) speed *= .9;

    const all = 1 + s.AllStat / 100;
    const boost = on('uvBorderBoost') ? 1.5 : 1;
    const divine = on('uvPotDivine') ? 1.1 : 1;
    const cb = {
      Platinum:chaska(num('uvChaskaPlatinum'), .05), Crystal:chaska(num('uvChaskaCrystal'), .10), Ruby:0, Galaxy:chaska(num('uvChaskaGalaxy'), .25),
    };
    const be = {};
    for (const name of BN) {
      let base = (1 + (charm[name] || 0) + s[name]) * all;
      base *= sm(name, st[name]);
      be[name] = (base * boost + lvl(`uvDungeon${name}`, 25) * D[name] + cb[name]) * divine;
    }

    const timeStorm = on('uvTimeStorm');
    const cps = (speed / 100) * sm('Speed', st.Speed) * (timeStorm ? 2 : 1);
    return {
      luck, speed, be, cps, timeStorm,
      boss:on('uvBossPot'), surge:on('uvLuckySurge'), dice:on('uvDice'), vic:on('uvVicissitudes'),
    };
  }

  function poolSettings() {
    const allPacks = [...new Set((DATA?.cards || []).map((card) => card.pack).filter(Boolean))];
    let packs = allPacks.slice();
    let rapture24 = false;

    const globalPacks = window.__rollSimPackSelectionsV19?.A;
    if (Array.isArray(globalPacks)) packs = globalPacks.filter((pack) => allPacks.includes(pack));
    const globalRapture = window.__rollSimRapture24V25?.A;
    if (typeof globalRapture === 'boolean') rapture24 = globalRapture;

    if (!Array.isArray(globalPacks) || typeof globalRapture !== 'boolean') {
      try {
        const saved = JSON.parse(localStorage.getItem('hitCalcRollSimPacksV19') || '{}');
        if (!Array.isArray(globalPacks) && Array.isArray(saved.A)) packs = saved.A.filter((pack) => allPacks.includes(pack));
        if (typeof globalRapture !== 'boolean' && typeof saved.rapture24?.A === 'boolean') rapture24 = saved.rapture24.A;
      } catch {}
    }

    return { packs:new Set(packs), rapture24 };
  }

  function factorStates(s) {
    return s.vic ? VIC : [NEUTRAL];
  }
  function borderRate(name, s, factors) {
    return Math.min(1, Math.max(0, s.be[name] * (factors?.[name] ?? 1) / B[name].d));
  }
  function combinationRate(names, s) {
    const states = factorStates(s);
    let total = 0;
    for (const factors of states) {
      let rate = 1;
      for (const name of names) rate *= borderRate(name, s, factors);
      total += rate;
    }
    return total / states.length;
  }
  function borderOutcomes(s) {
    const states = factorStates(s);
    const probabilities = Array(16).fill(0);
    const multipliers = Array(16).fill(1);
    for (let mask = 0; mask < 16; mask += 1) {
      let multiplier = 1;
      for (let i = 0; i < BN.length; i += 1) if (mask & (1 << i)) multiplier *= B[BN[i]].m;
      multipliers[mask] = multiplier;
    }
    for (const factors of states) {
      for (let mask = 0; mask < 16; mask += 1) {
        let probability = 1;
        for (let i = 0; i < BN.length; i += 1) {
          const name = BN[i];
          const rate = borderRate(name, s, factors);
          probability *= mask & (1 << i) ? rate : 1 - rate;
        }
        probabilities[mask] += probability / states.length;
      }
    }
    return probabilities.map((p, mask) => ({ p, m:multipliers[mask] })).filter((entry) => entry.p > 0);
  }

  function weatherForCard(card, s, settings) {
    if (!card.weather) return null;
    if (card.weather === 'Rapture' && settings.rapture24) return 'Rapture';
    if (card.weather === 'Time Storm' && s.timeStorm) return 'Time Storm';
    return false;
  }

  function adjustedCardRarity(card, s, settings) {
    if (card.pack && !settings.packs.has(card.pack)) return null;
    if (card.sin && !s.boss) return null;
    const weather = weatherForCard(card, s, settings);
    if (weather === false) return null;

    let rarity = Math.max(1e-12, Number(card.rarity) || 1);
    if (card.currentEvent) rarity *= Number(card.eventFactor) || .2;
    if (weather) rarity /= Number(DATA?.weatherMults?.[weather]) || 1;
    if (card.sin && s.boss) rarity *= Number(DATA?.bossPot?.sinRarityFactor) || .2;
    return Math.max(1e-12, rarity);
  }

  function luckStates(s) {
    const surge = s.surge && s.cps > 0 ? Math.min(1, 10 / (30 + 100 / s.cps)) : 0;
    const dice = s.dice ? 1 / 25 : 0;
    const normal = 1 - dice;
    const out = [];
    if (1 - surge > 0) {
      out.push([1, (1 - surge) * normal]);
      if (dice) out.push([2, (1 - surge) * dice]);
    }
    if (surge) {
      out.push([1.25, surge * normal]);
      if (dice) out.push([2.5, surge * dice]);
    }
    return out;
  }

  function distAt(s, multiplier, settings) {
    const cards = DATA?.cards || [];
    const out = [];
    let remaining = 1;
    let fallback = null;
    for (const card of cards) {
      const rarity = adjustedCardRarity(card, s, settings);
      if (rarity == null) continue;
      fallback = card;
      const success = Math.min(1, Math.max(0, s.luck * multiplier / rarity));
      const hit = remaining * success;
      if (hit > 0) out.push({ card, probability:hit });
      remaining *= 1 - success;
      if (remaining <= 1e-15) { remaining = 0; break; }
    }
    if (remaining > 0 && fallback) {
      const found = out.find((entry) => entry.card === fallback);
      if (found) found.probability += remaining;
      else out.push({ card:fallback, probability:remaining });
    }
    return out;
  }

  function distribution(s, settings) {
    const map = new Map();
    for (const [multiplier, weight] of luckStates(s)) {
      for (const entry of distAt(s, multiplier, settings)) {
        const found = map.get(entry.card.name);
        if (found) found.probability += entry.probability * weight;
        else map.set(entry.card.name, { card:entry.card, probability:entry.probability * weight });
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

  function selected() {
    const set = new Set([...document.querySelectorAll('#upgradeCalcV2 .uv-border.active')].map((button) => button.dataset.border).filter((name) => B[name]));
    return BN.filter((name) => set.has(name));
  }
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
    } else {
      for (const name of labels) label.append(chip(name));
    }
    const strong = document.createElement('strong');
    strong.textContent = value;
    div.append(label, strong);
    return div;
  }

  let writing = false;
  function render() {
    const root = $('upgradeCalcV2');
    if (!root || root.hidden || getComputedStyle(root).display === 'none' || !DATA?.cards) return;

    const s = stats();
    const settings = poolSettings();
    const dist = distribution(s, settings);
    const outcomes = borderOutcomes(s);
    const selectedBorders = selected();
    const selectedBorderRate = selectedBorders.length ? combinationRate(selectedBorders, s) : 0;
    const borderRolls = selectedBorderRate > 0 ? 1 / selectedBorderRate : Infinity;
    const target = Math.max(1, num('uvCardRarity', 1e6));
    const cardRate = thresholdRate(target, s, dist, outcomes);
    const cardRolls = cardRate > 0 ? 1 / cardRate : Infinity;

    writing = true;
    try {
      const values = {
        uvBorderRolls:fmt(borderRolls),
        uvBorderTime:ft(borderRolls / s.cps),
        uvCardRolls:fmt(cardRolls),
        uvCardTime:ft(cardRolls / s.cps),
        uvCardsSecond:fmt(s.cps, 2),
        uvRollsHour:fmt(s.cps * 3600),
      };
      for (const [id, text] of Object.entries(values)) {
        const el = $(id);
        if (el && el.textContent !== text) el.textContent = text;
      }

      const seconds = Math.max(0, num('uvTimeValue', 1)) * (TU[$('uvTimeUnit')?.value] || 3600);
      const rolls = Math.max(0, Math.floor(seconds * s.cps));
      if ($('uvTimeRolls')) $('uvTimeRolls').textContent = fmt(rolls);

      const borderGrid = $('uvBorderChanceGrid');
      if (borderGrid) {
        borderGrid.replaceChildren();
        const combos = [];
        for (let mask = 1; mask < 16; mask += 1) {
          const names = [];
          for (let i = 0; i < BN.length; i += 1) if (mask & (1 << i)) names.push(BN[i]);
          combos.push({ names, rate:combinationRate(names, s) });
        }
        combos.sort((a, b) => a.names.length - b.names.length || b.rate - a.rate);
        for (const combo of combos) borderGrid.append(item(combo.names, fs(combo.rate * rolls)));
      }

      const cardGrid = $('uvCardChanceGrid');
      if (cardGrid) {
        cardGrid.replaceChildren();
        for (const threshold of TH) cardGrid.append(item(`≥ ${fmt(threshold)}`, fs(thresholdRate(threshold, s, dist, outcomes) * rolls), true));
      }

      const cardRollsEl = $('uvCardRolls');
      const targetBox = cardRollsEl?.closest('.uv-result-card, .uv-target-result, .uv-result-box, article');
      if (targetBox) targetBox.title = 'Card Target uses your Roll Simulator pack selections. Weather is Normal except Time Storm and the Rapture 24/7 unlock.';
    } finally {
      writing = false;
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      queued = false;
      render();
    }));
  }
  function burst() {
    schedule();
    setTimeout(schedule, 40);
    setTimeout(schedule, 120);
    setTimeout(schedule, 300);
  }

  function init() {
    const root = $('upgradeCalcV2');
    if (!root) return;
    window.__hitCalcFinalTargetsV27 = burst;
    root.addEventListener('input', schedule);
    root.addEventListener('change', schedule);
    root.addEventListener('click', schedule);
    document.addEventListener('change', (event) => {
      if (event.target.closest?.('[data-rs-pack],[data-rs-rapture24]')) burst();
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.uv-mode[data-view="upgrades"]')) burst();
      if (event.target.closest('[data-rs-pack-action]')) setTimeout(burst, 0);
    }, true);
    $('resetBtn')?.addEventListener('click', () => setTimeout(burst, 0));

    const ids = ['uvBorderRolls','uvBorderTime','uvCardRolls','uvCardTime','uvCardsSecond','uvRollsHour','uvTimeRolls'].map($).filter(Boolean);
    if (ids.length) {
      const observer = new MutationObserver(() => { if (!writing) queueMicrotask(schedule); });
      for (const el of ids) observer.observe(el, { childList:true, characterData:true, subtree:true });
    }
    burst();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once:true });
})();
