(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE = 'hitCalcPotionsV10';

  const POTIONS = [
    ['uvPotSpeed3', 'Speed III', '+300% Speed'],
    ['uvPotLuck3', 'Luck III', '+25 Luck'],
    ['uvPotLegendarySpeed', 'Legendary Speed', '+500% Speed'],
    ['uvPotLegendaryLuck', 'Legendary Luck', '+40 Luck'],
    ['uvPotElixir', 'Elixir', '×2 Luck'],
    ['uvPotCursed', 'Cursed Potion', '×1.5 Luck'],
    ['uvPotEventSpeed', 'Event Speed', '×1.25 Speed'],
    ['uvPotEventLuck', 'Event Luck', '×1.25 Luck'],
    ['uvPotDivine', 'Divine Potion', '×1.1 Final Borders'],
  ];

  const DUNGEON = {
    Luck: { id: 'uvDungeonLuck', label: 'Luck', cost: 1, per: 10, suffix: ' Luck' },
    Speed: { id: 'uvDungeonSpeed', label: 'Roll Speed', cost: 2, per: 10, suffix: '%' },
    Platinum: { id: 'uvDungeonPlatinum', label: 'Platinum', cost: 3, per: 0.25, suffix: '×' },
    Crystal: { id: 'uvDungeonCrystal', label: 'Crystal', cost: 4, per: 0.5, suffix: '×' },
    Ruby: { id: 'uvDungeonRuby', label: 'Ruby', cost: 5, per: 0.75, suffix: '×' },
    Galaxy: { id: 'uvDungeonGalaxy', label: 'Galaxy', cost: 6, per: 2, suffix: '×' },
  };
  const DUNGEON_MAX = 25;

  const B = {
    Platinum: { d: 100, m: 100 },
    Crystal: { d: 1e4, m: 1e4 },
    Ruby: { d: 1e5, m: 1e5 },
    Galaxy: { d: 1e6, m: 1e6 },
  };
  const BN = Object.keys(B);

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

  const SFX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const TU = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  const TH = Array.from({ length: 22 }, (_, i) => 10 ** (i + 1));

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

  function dungeonLevel(name) {
    return lvl(DUNGEON[name].id, DUNGEON_MAX);
  }

  function dungeonBonus(name) {
    return dungeonLevel(name) * DUNGEON[name].per;
  }

  function dungeonSpent() {
    return Object.values(DUNGEON).reduce((sum, cfg) => sum + lvl(cfg.id, DUNGEON_MAX) * cfg.cost, 0);
  }

  function dungeonTokens() {
    return Math.max(0, Math.floor(num('uvDungeonTokens', 0)));
  }

  function dungeonAvailable() {
    return Math.max(0, dungeonTokens() - dungeonSpent());
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
      rolls,
      luck,
      speed,
      be,
      cps,
      timeStorm,
      boss: on('uvBossPot'),
      surge: on('uvLuckySurge'),
      dice: on('uvDice'),
    };
  }

  const br = (name, s) => Math.min(1, Math.max(0, s.be[name] / B[name].d));
  const cr = (names, s) => names.reduce((rate, name) => rate * br(name, s), 1);

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

  function borderOutcomes(s) {
    const outcomes = [];
    for (let mask = 0; mask < 16; mask += 1) {
      let probability = 1;
      let multiplier = 1;
      for (let i = 0; i < 4; i += 1) {
        const name = BN[i];
        const rate = br(name, s);
        if (mask & (1 << i)) {
          probability *= rate;
          multiplier *= B[name].m;
        } else probability *= 1 - rate;
      }
      if (probability > 0) outcomes.push({ p: probability, m: multiplier });
    }
    return outcomes;
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

  function syncBorderRibbon(s) {
    const write = () => {
      for (const name of BN) {
        const el = $(`uvOut${name}`);
        if (el) el.textContent = `${fn(s.be[name], 2)}×`;
      }
    };
    write();
    requestAnimationFrame(write);
  }

  function render() {
    if (!$('upgradeCalcV2')) return;
    const s = stats();
    const dist = distribution(s);
    const outcomes = borderOutcomes(s);
    const selectedBorders = selected();
    const borderRate = selectedBorders.length ? cr(selectedBorders, s) : 0;
    const borderRolls = borderRate > 0 ? 1 / borderRate : Infinity;
    const target = Math.max(1, num('uvCardRarity', 1e6));
    const cardRate = thresholdRate(target, s, dist, outcomes);
    const cardRolls = cardRate > 0 ? 1 / cardRate : Infinity;

    if ($('uvOutLuck')) $('uvOutLuck').textContent = fn(s.luck, 2);
    if ($('uvOutSpeed')) $('uvOutSpeed').textContent = `${fn(s.speed, 2)}%`;
    syncBorderRibbon(s);
    if ($('uvBorderRolls')) $('uvBorderRolls').textContent = fn(borderRolls);
    if ($('uvBorderTime')) $('uvBorderTime').textContent = ft(borderRolls / s.cps);
    if ($('uvCardRolls')) $('uvCardRolls').textContent = fn(cardRolls);
    if ($('uvCardTime')) $('uvCardTime').textContent = ft(cardRolls / s.cps);
    if ($('uvCardsSecond')) $('uvCardsSecond').textContent = fn(s.cps, 2);
    if ($('uvRollsHour')) $('uvRollsHour').textContent = fn(s.cps * 3600);

    const seconds = Math.max(0, num('uvTimeValue', 1)) * (TU[$('uvTimeUnit')?.value] || 3600);
    const rolls = Math.max(0, Math.floor(seconds * s.cps));
    if ($('uvTimeRolls')) $('uvTimeRolls').textContent = fn(rolls);

    const borderGrid = $('uvBorderChanceGrid');
    if (borderGrid) {
      borderGrid.replaceChildren();
      const combos = [];
      for (let mask = 1; mask < 16; mask += 1) {
        const names = [];
        for (let i = 0; i < 4; i += 1) if (mask & (1 << i)) names.push(BN[i]);
        combos.push({ names, rate: cr(names, s) });
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

  function dungeonSetLevel(name, nextLevel) {
    const cfg = DUNGEON[name];
    const input = $(cfg.id);
    if (!input) return;
    input.value = String(Math.max(0, Math.min(DUNGEON_MAX, Math.floor(nextLevel))));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function updateDungeonUI() {
    const panel = $('uvDungeonPanel');
    if (!panel) return;
    const spent = dungeonSpent();
    let tokens = dungeonTokens();
    const tokenInput = $('uvDungeonTokens');
    if (tokens < spent && tokenInput) {
      tokens = spent;
      tokenInput.value = String(tokens);
    }
    const available = Math.max(0, tokens - spent);
    if ($('uvDungeonSpent')) $('uvDungeonSpent').textContent = spent.toLocaleString();
    if ($('uvDungeonAvailable')) $('uvDungeonAvailable').textContent = available.toLocaleString();

    for (const [name, cfg] of Object.entries(DUNGEON)) {
      const level = dungeonLevel(name);
      const bonus = level * cfg.per;
      const levelEl = $(`uvDungeon${name}Level`);
      const bonusEl = $(`uvDungeon${name}Bonus`);
      if (levelEl) levelEl.textContent = `${level} / ${DUNGEON_MAX}`;
      if (bonusEl) bonusEl.textContent = `+${fixed(bonus, Number.isInteger(cfg.per) ? 0 : 2)}${cfg.suffix}`;
      const minus = panel.querySelector(`[data-dungeon-stat="${name}"][data-dungeon-action="minus"]`);
      const plus = panel.querySelector(`[data-dungeon-stat="${name}"][data-dungeon-action="plus"]`);
      const max = panel.querySelector(`[data-dungeon-stat="${name}"][data-dungeon-action="max"]`);
      if (minus) minus.disabled = level <= 0;
      if (plus) plus.disabled = level >= DUNGEON_MAX || available < cfg.cost;
      if (max) max.disabled = level >= DUNGEON_MAX || available < cfg.cost;
    }
  }

  function handleDungeonClick(event) {
    const button = event.target.closest('[data-dungeon-action]');
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.dungeonAction;
    if (action === 'reset') {
      for (const name of Object.keys(DUNGEON)) dungeonSetLevel(name, 0);
      return;
    }
    const name = button.dataset.dungeonStat;
    const cfg = DUNGEON[name];
    if (!cfg) return;
    const current = dungeonLevel(name);
    if (action === 'minus') {
      dungeonSetLevel(name, current - 1);
      return;
    }
    if (action === 'plus') {
      if (current < DUNGEON_MAX && dungeonAvailable() >= cfg.cost) dungeonSetLevel(name, current + 1);
      return;
    }
    if (action === 'max') {
      const add = Math.min(DUNGEON_MAX - current, Math.floor(dungeonAvailable() / cfg.cost));
      if (add > 0) dungeonSetLevel(name, current + add);
    }
  }

  function buildDungeon() {
    const root = $('upgradeCalcV2');
    const tools = root?.querySelector('.uv-tools-grid');
    if (!root || !tools || $('uvDungeonPanel')) return;

    const panel = document.createElement('article');
    panel.id = 'uvDungeonPanel';
    panel.className = 'uv-panel uv-tool-dungeon';
    panel.innerHTML = `
      <div class="uv-dungeon-head">
        <div class="uv-panel-title"><strong>Dungeon Investment</strong></div>
        <button type="button" class="uv-dungeon-reset" data-dungeon-action="reset">Reset</button>
      </div>
      <div class="uv-dungeon-dashboard">
        <label class="uv-dungeon-token-field"><span>Dungeon Tokens</span><input id="uvDungeonTokens" type="number" min="0" step="1" value="0"></label>
        <div><span>Spent</span><strong id="uvDungeonSpent">0</strong></div>
        <div><span>Available</span><strong id="uvDungeonAvailable">0</strong></div>
      </div>
      <div class="uv-dungeon-grid">
        ${Object.entries(DUNGEON).map(([name, cfg]) => `
          <div class="uv-dungeon-card uv-dungeon-${name.toLowerCase()}">
            <input id="${cfg.id}" type="hidden" value="0">
            <div class="uv-dungeon-card-top"><strong>${cfg.label}</strong><span id="uvDungeon${name}Level">0 / ${DUNGEON_MAX}</span></div>
            <div class="uv-dungeon-bonus" id="uvDungeon${name}Bonus">+0${cfg.suffix}</div>
            <small>${cfg.cost} Token${cfg.cost === 1 ? '' : 's'} / Level</small>
            <div class="uv-dungeon-controls">
              <button type="button" data-dungeon-stat="${name}" data-dungeon-action="minus">−</button>
              <button type="button" data-dungeon-stat="${name}" data-dungeon-action="plus">+</button>
              <button type="button" data-dungeon-stat="${name}" data-dungeon-action="max">Max</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const structures = tools.querySelector('.uv-tool-structures');
    const chaska = tools.querySelector('.uv-tool-chaska-s-blessing');
    if (structures) structures.insertAdjacentElement('afterend', panel);
    else if (chaska) chaska.insertAdjacentElement('beforebegin', panel);
    else tools.append(panel);

    panel.addEventListener('click', handleDungeonClick);
    $('uvDungeonTokens')?.addEventListener('input', updateDungeonUI);
    $('uvDungeonTokens')?.addEventListener('change', updateDungeonUI);
  }

  function save() {
    try {
      const value = {};
      for (const [id] of POTIONS) value[id] = on(id);
      value.uvBossPot = on('uvBossPot');
      value.uvDungeonTokens = dungeonTokens();
      for (const cfg of Object.values(DUNGEON)) value[cfg.id] = lvl(cfg.id, DUNGEON_MAX);
      localStorage.setItem(STORAGE, JSON.stringify(value));
    } catch {}
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      for (const [id] of POTIONS) if (typeof value[id] === 'boolean' && $(id)) $(id).checked = value[id];
      if (typeof value.uvBossPot === 'boolean' && $('uvBossPot')) $('uvBossPot').checked = value.uvBossPot;
      if (Number.isFinite(Number(value.uvDungeonTokens)) && $('uvDungeonTokens')) $('uvDungeonTokens').value = String(Math.max(0, Math.floor(Number(value.uvDungeonTokens))));
      for (const cfg of Object.values(DUNGEON)) {
        if (Number.isFinite(Number(value[cfg.id])) && $(cfg.id)) $(cfg.id).value = String(Math.max(0, Math.min(DUNGEON_MAX, Math.floor(Number(value[cfg.id])))));
      }
    } catch {}
  }

  function buildPotions() {
    const root = $('upgradeCalcV2');
    const row = root?.querySelector('.uv-pre-tree-row');
    const mods = root?.querySelector('.uv-tool-modifiers');
    if (!root || !row || !mods || root.querySelector('.uv-tool-potions')) return;
    const panel = document.createElement('article');
    panel.className = 'uv-panel uv-tool-potions';
    panel.innerHTML = `<div class="uv-panel-title"><strong>Potions</strong></div><div class="uv-potion-grid">${POTIONS.map(([id, label, effect]) => `<label class="uv-potion-toggle"><input id="${id}" type="checkbox"><span><strong>${label}</strong><small>${effect}</small></span></label>`).join('')}</div>`;
    const bossInput = $('uvBossPot');
    const bossLabel = bossInput?.closest('.uv-toggle');
    if (bossLabel) {
      bossLabel.classList.remove('uv-toggle');
      bossLabel.classList.add('uv-potion-toggle', 'uv-boss-potion-toggle');
      bossLabel.querySelector('span').innerHTML = '<strong>Boss Pot</strong><small>5× Boss Cards</small>';
      panel.querySelector('.uv-potion-grid').append(bossLabel);
    }
    row.insertBefore(panel, mods);
  }

  function css() {
    if ($('potions-v10-styles')) return;
    const style = document.createElement('style');
    style.id = 'potions-v10-styles';
    style.textContent = `
      #upgradeCalcV2 .uv-pre-tree-row{grid-template-columns:minmax(235px,290px) minmax(0,1fr)!important;grid-template-areas:'account potions' 'account modifiers';align-items:stretch!important}
      #upgradeCalcV2 .uv-tool-account{grid-area:account!important}
      #upgradeCalcV2 .uv-tool-potions{grid-area:potions!important;padding:14px!important;min-width:0}
      #upgradeCalcV2 .uv-tool-modifiers{grid-area:modifiers!important}
      #upgradeCalcV2 .uv-tool-potions .uv-panel-title{margin-bottom:9px!important}
      #upgradeCalcV2 .uv-tool-potions .uv-panel-title strong{font-size:.78rem;text-transform:uppercase;letter-spacing:.075em;color:var(--muted)}
      #upgradeCalcV2 .uv-potion-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
      #upgradeCalcV2 .uv-potion-toggle{position:relative;display:block;min-width:0}
      #upgradeCalcV2 .uv-potion-toggle>input{position:absolute;opacity:0;pointer-events:none}
      #upgradeCalcV2 .uv-potion-toggle>span{display:flex;flex-direction:column;justify-content:center;min-height:47px;padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);cursor:pointer;min-width:0}
      #upgradeCalcV2 .uv-potion-toggle strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#c9d0da;font-size:.66rem}
      #upgradeCalcV2 .uv-potion-toggle small{margin-top:3px;color:#717b89;font-size:.54rem;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #upgradeCalcV2 .uv-potion-toggle>input:checked+span{border-color:color-mix(in srgb,var(--blue) 68%,var(--line));background:color-mix(in srgb,var(--blue) 9%,var(--panel-2))}
      #upgradeCalcV2 .uv-potion-toggle>input:checked+span strong{color:#fff}
      #upgradeCalcV2 .uv-potion-toggle>input:checked+span small{color:var(--blue)}
      #upgradeCalcV2 .uv-boss-potion-toggle>input:checked+span{border-color:color-mix(in srgb,var(--ruby) 58%,var(--line));background:color-mix(in srgb,var(--ruby) 8%,var(--panel-2))}
      #upgradeCalcV2 .uv-pre-tree-row .uv-tool-modifiers .uv-toggle-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}

      #upgradeCalcV2 .uv-tool-dungeon{grid-column:1/-1!important;min-width:0;padding:16px!important}
      #upgradeCalcV2 .uv-dungeon-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      #upgradeCalcV2 .uv-dungeon-head .uv-panel-title{margin:0!important}
      #upgradeCalcV2 .uv-dungeon-reset{height:31px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-weight:900;font-size:.62rem;cursor:pointer}
      #upgradeCalcV2 .uv-dungeon-reset:hover{border-color:var(--line-2);color:#fff}
      #upgradeCalcV2 .uv-dungeon-dashboard{display:grid;grid-template-columns:minmax(190px,1.35fr) minmax(100px,.65fr) minmax(100px,.65fr);gap:8px;margin-bottom:11px}
      #upgradeCalcV2 .uv-dungeon-dashboard>div,#upgradeCalcV2 .uv-dungeon-token-field{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);box-sizing:border-box}
      #upgradeCalcV2 .uv-dungeon-dashboard span{color:var(--muted);font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.055em}
      #upgradeCalcV2 .uv-dungeon-dashboard strong{font-size:.85rem;color:#d7dde6}
      #upgradeCalcV2 .uv-dungeon-token-field input{width:105px!important;min-width:0!important;max-width:48%!important;box-sizing:border-box!important;text-align:right}
      #upgradeCalcV2 .uv-dungeon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #upgradeCalcV2 .uv-dungeon-card{min-width:0;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      #upgradeCalcV2 .uv-dungeon-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
      #upgradeCalcV2 .uv-dungeon-card-top strong{font-size:.72rem;color:#cbd2dc}
      #upgradeCalcV2 .uv-dungeon-card-top span{font-size:.58rem;font-weight:900;color:var(--muted)}
      #upgradeCalcV2 .uv-dungeon-bonus{margin-top:6px;font-size:1rem;font-weight:950;color:var(--blue)}
      #upgradeCalcV2 .uv-dungeon-card small{display:block;margin-top:2px;color:#717b89;font-size:.54rem;font-weight:800}
      #upgradeCalcV2 .uv-dungeon-controls{display:grid;grid-template-columns:36px 36px minmax(58px,1fr);gap:6px;margin-top:9px}
      #upgradeCalcV2 .uv-dungeon-controls button{min-width:0;height:30px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:#aeb7c4;font-weight:950;font-size:.65rem;cursor:pointer}
      #upgradeCalcV2 .uv-dungeon-controls button:hover:not(:disabled){border-color:var(--blue);color:#fff}
      #upgradeCalcV2 .uv-dungeon-controls button:disabled{opacity:.35;cursor:not-allowed}
      #upgradeCalcV2 .uv-dungeon-platinum .uv-dungeon-bonus{color:var(--platinum,#d9e7ef)}
      #upgradeCalcV2 .uv-dungeon-crystal .uv-dungeon-bonus{color:var(--crystal,#79e6ff)}
      #upgradeCalcV2 .uv-dungeon-ruby .uv-dungeon-bonus{color:var(--ruby,#ff5b78)}
      #upgradeCalcV2 .uv-dungeon-galaxy .uv-dungeon-bonus{color:var(--galaxy,#a78bfa)}

      @media(max-width:1120px){
        #upgradeCalcV2 .uv-potion-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        #upgradeCalcV2 .uv-dungeon-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:760px){
        #upgradeCalcV2 .uv-pre-tree-row{grid-template-columns:1fr!important;grid-template-areas:'account' 'potions' 'modifiers'}
        #upgradeCalcV2 .uv-potion-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        #upgradeCalcV2 .uv-dungeon-dashboard{grid-template-columns:1fr 1fr}
        #upgradeCalcV2 .uv-dungeon-token-field{grid-column:1/-1}
      }
      @media(max-width:520px){
        #upgradeCalcV2 .uv-dungeon-grid{grid-template-columns:1fr}
      }
    `;
    document.head.append(style);
  }

  let queued = false;
  function qr() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      updateDungeonUI();
      render();
      save();
    });
  }

  function bind() {
    const root = $('upgradeCalcV2');
    if (!root) return;
    root.addEventListener('input', qr);
    root.addEventListener('change', qr);
    root.addEventListener('click', (event) => {
      if (event.target.closest('.uv-border,.uv-tree-node,.uv-chaska-controls,[data-time-mode]')) qr();
    });
    $('resetBtn')?.addEventListener('click', () => {
      if (getComputedStyle(root).display === 'none') return;
      try { localStorage.removeItem(STORAGE); } catch {}
      setTimeout(() => {
        for (const [id] of POTIONS) if ($(id)) $(id).checked = false;
        if ($('uvBossPot')) $('uvBossPot').checked = false;
        if ($('uvDungeonTokens')) $('uvDungeonTokens').value = '0';
        for (const cfg of Object.values(DUNGEON)) if ($(cfg.id)) $(cfg.id).value = '0';
        updateDungeonUI();
        render();
      }, 0);
    });
  }

  function init() {
    if (!$('upgradeCalcV2')) return;
    css();
    buildPotions();
    buildDungeon();
    load();
    updateDungeonUI();
    bind();
    render();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
