(() => {
  const STORAGE_KEY = 'hitCalcUpgradeBuilderV2';
  const BORDER_NAMES = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const BORDERS = {
    Platinum: { denominator: 100, multiplier: 100 },
    Crystal: { denominator: 10000, multiplier: 10000 },
    Ruby: { denominator: 100000, multiplier: 100000 },
    Galaxy: { denominator: 1000000, multiplier: 1000000 },
  };
  const SKILLS = {
    Luck: [0, 15, 30, 45, 60, 75, 90, 150],
    RollSpeed: [0, 5, 10, 15, 20, 25, 30, 45],
    AllStat: [0, 3, 6, 11],
    Platinum: [0, 0.5, 1, 1.5, 2, 2.5, 5],
    Crystal: [0, 1.75, 3.5, 5.25, 7, 8.75, 14.75],
    Ruby: [0, 1.5, 3, 4.5, 6, 7.5, 13.5],
    Galaxy: [0, 4, 8, 12, 16, 20, 30],
  };
  const CHARMS = {
    'None': {},
    'Old Tome': { Luck: 0.5 },
    'Holy Cross': { Luck: 1 },
    'Bloodstone': { Luck: 2 },
    'Lunar Charm': { Luck: 2.5, Cooldown: 10 },
    'Blood Moon': { Luck: 3, Cooldown: 20 },
    'Ice Crystal': { Luck: 3.5, Cooldown: 30 },
    "Victor's Trophy": { Luck: 5, Cooldown: 40 },
    'Phoenix Feather': { Luck: 5.5, Cooldown: 50 },
    'Hell Charm': { Luck: 7.5, Cooldown: 60 },
    "Emperor's Hand": { Luck: 10, Cooldown: 75 },
    'Heavenly Crown': { Luck: 15, Cooldown: 100 },
    'Durandal': { Luck: 7, Cooldown: 60 },
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
  const TIME_UNITS = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  const THRESHOLDS = Array.from({ length: 22 }, (_, i) => 10 ** (i + 1));
  const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  const state = { mode: 'stats', borders: new Set(['Platinum']) };
  const $ = (id) => document.getElementById(id);

  function num(id, fallback = 0) {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  }
  function level(id, max) { return Math.max(0, Math.min(max, Math.floor(num(id, 0)))); }
  function fixed(value, digits) { return value.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1'); }
  function formatNumber(value, decimals = 0) {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= SUFFIXES.length) return value.toExponential(2);
    const scaled = value / Math.pow(1000, tier);
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${fixed(scaled, digits)}${SUFFIXES[tier]}`;
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    if (seconds < 60) return `${fixed(seconds, seconds < 10 ? 2 : 1)}s`;
    const total = Math.round(seconds);
    const years = Math.floor(total / 31557600);
    const days = Math.floor((total % 31557600) / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (years >= 1000) return `${formatNumber(years)}y`;
    const parts = [];
    if (years) parts.push(`${years}y`);
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!years && !days && !hours && secs) parts.push(`${secs}s`);
    return parts.slice(0, 3).join(' ') || '0s';
  }
  function formatSpan(expectedHits) {
    if (!Number.isFinite(expectedHits) || expectedHits <= 0) return '0%';
    const rawPercent = expectedHits * 100;
    if (rawPercent < 1) return `1 / ${formatNumber(1 / expectedHits, 2)}`;
    const percent = Math.min(2000, rawPercent);
    if (percent >= 2000) return '2000%';
    if (percent >= 10) return `${fixed(percent, 1)}%`;
    return `${fixed(percent, 2)}%`;
  }
  function chaska(points, rate) {
    let remaining = Math.max(0, Math.floor(Number(points) || 0));
    let block = 0;
    let total = 0;
    while (remaining > 0) {
      const amount = Math.min(50, remaining);
      total += amount * rate * Math.pow(0.85, block);
      remaining -= amount;
      block += 1;
    }
    return total;
  }
  function structureMultiplier(kind, lvl) {
    if (kind === 'Luck' || kind === 'Speed') return 1 + 0.5 * lvl / 7;
    return 1 + lvl / 5;
  }
  function skill(name, id) {
    const values = SKILLS[name];
    return values[level(id, values.length - 1)] || 0;
  }

  function calculateStats() {
    const rolls = Math.max(0, Math.floor(num('uvRolls', 0)));
    const charm = CHARMS[$('uvCharm')?.value] || {};
    const skillValues = {
      Luck: skill('Luck', 'uvSkillLuck'), RollSpeed: skill('RollSpeed', 'uvSkillSpeed'), AllStat: skill('AllStat', 'uvSkillAll'),
      Platinum: skill('Platinum', 'uvSkillPlatinum'), Crystal: skill('Crystal', 'uvSkillCrystal'), Ruby: skill('Ruby', 'uvSkillRuby'), Galaxy: skill('Galaxy', 'uvSkillGalaxy'),
    };
    const structures = {
      Luck: level('uvStructureLuck', 7), Speed: level('uvStructureSpeed', 7), Platinum: level('uvStructurePlatinum', 5),
      Crystal: level('uvStructureCrystal', 5), Ruby: level('uvStructureRuby', 5), Galaxy: level('uvStructureGalaxy', 5),
    };
    const quickdraw = !!$('uvQuickdraw')?.checked;
    const heavyHand = !!$('uvHeavyHand')?.checked;
    const timeStorm = !!$('uvTimeStorm')?.checked;
    const borderBoost = $('uvBorderBoost')?.checked ? 1.5 : 1;

    let luck = 1 + Math.floor(rolls / 1000000) * 0.1;
    luck += charm.Luck || 0;
    luck *= 1 + (skillValues.Luck + skillValues.AllStat) / 100;
    luck *= structureMultiplier('Luck', structures.Luck);
    luck += chaska(num('uvChaskaLuck'), 0.25);
    if (quickdraw) luck *= 0.8;
    if (heavyHand) luck *= 1.2;

    let rollSpeed = 100 + (charm.Cooldown || 0);
    rollSpeed *= 1 + (skillValues.RollSpeed + skillValues.AllStat) / 100;
    if (quickdraw) rollSpeed *= 1.1;
    if (heavyHand) rollSpeed *= 0.9;

    const allStatMultiplier = 1 + skillValues.AllStat / 100;
    const borderDisplay = {};
    const borderEffective = {};
    const chaskaBorder = {
      Platinum: chaska(num('uvChaskaPlatinum'), 0.05),
      Crystal: chaska(num('uvChaskaCrystal'), 0.10),
      Ruby: 0,
      Galaxy: chaska(num('uvChaskaGalaxy'), 0.25),
    };
    for (const name of BORDER_NAMES) {
      let nonChaska = (1 + (charm[name] || 0) + skillValues[name]) * allStatMultiplier;
      nonChaska *= structureMultiplier(name, structures[name]);
      borderDisplay[name] = nonChaska + chaskaBorder[name];
      borderEffective[name] = nonChaska * borderBoost + chaskaBorder[name];
    }

    const speedStructure = structureMultiplier('Speed', structures.Speed);
    const cardsPerSecond = (rollSpeed / 100) * speedStructure * (timeStorm ? 2 : 1);
    return {
      rolls, luck, rollSpeed, borderDisplay, borderEffective, cardsPerSecond, timeStorm,
      bossPot: !!$('uvBossPot')?.checked, luckySurge: !!$('uvLuckySurge')?.checked, theDice: !!$('uvDice')?.checked,
    };
  }

  function borderRate(name, stats) { return Math.min(1, Math.max(0, stats.borderEffective[name] / BORDERS[name].denominator)); }
  function combinationRate(names, stats) { let rate = 1; for (const name of names) rate *= borderRate(name, stats); return rate; }
  function activeCards(stats) {
    const now = Date.now() / 1000;
    const pool = typeof CARD_POOL !== 'undefined' ? CARD_POOL : [];
    return pool.filter((card) => {
      if (card.expires && card.expires <= now) return false;
      if (card.weather === 'Time Storm' && !stats.timeStorm) return false;
      return !card.weather || card.weather === 'Time Storm';
    });
  }
  function luckStates(stats) {
    const surgeShare = stats.luckySurge && stats.cardsPerSecond > 0 ? Math.min(1, 10 / (30 + 100 / stats.cardsPerSecond)) : 0;
    const diceShare = stats.theDice ? 1 / 25 : 0;
    const normalShare = 1 - diceShare;
    const states = [];
    if (1 - surgeShare > 0) {
      states.push({ multiplier: 1, weight: (1 - surgeShare) * normalShare });
      if (diceShare > 0) states.push({ multiplier: 2, weight: (1 - surgeShare) * diceShare });
    }
    if (surgeShare > 0) {
      states.push({ multiplier: 1.25, weight: surgeShare * normalShare });
      if (diceShare > 0) states.push({ multiplier: 2.5, weight: surgeShare * diceShare });
    }
    return states;
  }
  function distributionAtLuck(stats, luckMultiplier) {
    const cards = activeCards(stats);
    let remaining = 1;
    const distribution = [];
    for (const card of cards) {
      const rollRarity = card.rarity * (card.rollFactor || 1);
      const bossMultiplier = stats.bossPot && card.boss ? 5 : 1;
      const success = Math.min(1, stats.luck * luckMultiplier * bossMultiplier / rollRarity);
      const probability = remaining * success;
      if (probability > 0) distribution.push({ card, probability });
      remaining *= 1 - success;
      if (remaining <= 0) break;
    }
    if (remaining > 0 && cards.length) {
      const fallback = cards[cards.length - 1];
      const found = distribution.find((entry) => entry.card.name === fallback.name);
      if (found) found.probability += remaining;
      else distribution.push({ card: fallback, probability: remaining });
    }
    return distribution;
  }
  function cardDistribution(stats) {
    const merged = new Map();
    for (const luckState of luckStates(stats)) {
      for (const entry of distributionAtLuck(stats, luckState.multiplier)) {
        const found = merged.get(entry.card.name);
        if (found) found.probability += entry.probability * luckState.weight;
        else merged.set(entry.card.name, { card: entry.card, probability: entry.probability * luckState.weight });
      }
    }
    return [...merged.values()];
  }
  function borderOutcomes(stats) {
    const outcomes = [];
    for (let mask = 0; mask < (1 << BORDER_NAMES.length); mask += 1) {
      let probability = 1;
      let multiplier = 1;
      for (let i = 0; i < BORDER_NAMES.length; i += 1) {
        const name = BORDER_NAMES[i];
        const p = borderRate(name, stats);
        if (mask & (1 << i)) { probability *= p; multiplier *= BORDERS[name].multiplier; }
        else probability *= 1 - p;
      }
      if (probability > 0) outcomes.push({ probability, multiplier });
    }
    return outcomes;
  }
  function thresholdRate(threshold, stats, distribution, outcomes) {
    if (!(threshold > 0)) return 0;
    let total = 0;
    for (const entry of distribution) {
      let borderHit = 0;
      for (const outcome of outcomes) if (entry.card.rarity * outcome.multiplier >= threshold) borderHit += outcome.probability;
      total += entry.probability * borderHit;
    }
    return Math.min(1, Math.max(0, total));
  }
  function performance(rate, rps) { const rolls = rate > 0 ? 1 / rate : Infinity; return { rolls, time: rps > 0 ? rolls / rps : Infinity }; }
  function levelOptions(max) { return Array.from({ length: max + 1 }, (_, i) => `<option value="${i}">Lv ${i}</option>`).join(''); }
  function field(label, id, max) { return `<label class="uv-level-row"><span>${label}</span><select id="${id}">${levelOptions(max)}</select></label>`; }
  function toggle(label, id) { return `<label class="uv-toggle"><input id="${id}" type="checkbox"><span>${label}</span></label>`; }

  function buildUI() {
    const page = document.querySelector('main.page');
    if (!page) return;
    document.querySelector('.calc-mode-tabs')?.remove();
    document.getElementById('upgradeCalc')?.remove();

    const topbar = page.querySelector('.topbar');
    const main = page.querySelector(':scope > .main-grid');
    const time = page.querySelector(':scope > .time-card');
    let directView = $('directCalcView');
    if (!directView) {
      directView = document.createElement('div');
      directView.id = 'directCalcView';
      directView.className = 'direct-calc-view';
      if (main) main.before(directView);
      if (main) directView.append(main);
      if (time) directView.append(time);
    }

    const tabs = document.createElement('div');
    tabs.className = 'uv-mode-switch';
    tabs.innerHTML = '<button type="button" class="uv-mode active" data-view="stats">Stats</button><button type="button" class="uv-mode" data-view="upgrades">Upgrades</button>';
    topbar.insertAdjacentElement('afterend', tabs);

    const root = document.createElement('div');
    root.id = 'upgradeCalcV2';
    root.className = 'uv-root';
    root.style.display = 'none';
    root.innerHTML = `
      <section class="uv-stat-ribbon">
        <div class="uv-ribbon-main"><span>Luck</span><strong id="uvOutLuck">1</strong></div>
        <div><span>Roll Speed</span><strong id="uvOutSpeed">100%</strong></div>
        <div class="platinum"><span>Platinum</span><strong id="uvOutPlatinum">1×</strong></div>
        <div class="crystal"><span>Crystal</span><strong id="uvOutCrystal">1×</strong></div>
        <div class="ruby"><span>Ruby</span><strong id="uvOutRuby">1×</strong></div>
        <div class="galaxy"><span>Galaxy</span><strong id="uvOutGalaxy">1×</strong></div>
      </section>
      <section class="uv-workbench">
        <div class="uv-stack">
          <article class="uv-panel uv-account"><div class="uv-panel-title"><span>01</span><strong>Account</strong></div><label class="uv-big-field"><span>Total Rolls</span><input id="uvRolls" type="number" min="0" step="1" value="0"></label><label class="uv-big-field"><span>Charm</span><select id="uvCharm"></select></label></article>
          <article class="uv-panel"><div class="uv-panel-title"><span>02</span><strong>Skill Tree</strong></div><div class="uv-level-list">${field('Luck', 'uvSkillLuck', 7)}${field('Roll Speed', 'uvSkillSpeed', 7)}${field('All Stat', 'uvSkillAll', 3)}${field('Platinum', 'uvSkillPlatinum', 6)}${field('Crystal', 'uvSkillCrystal', 6)}${field('Ruby', 'uvSkillRuby', 6)}${field('Galaxy', 'uvSkillGalaxy', 6)}</div></article>
        </div>
        <div class="uv-stack uv-center-stack">
          <article class="uv-panel"><div class="uv-panel-title"><span>03</span><strong>Structures</strong></div><div class="uv-structure-grid">${field('Luck', 'uvStructureLuck', 7)}${field('Speed', 'uvStructureSpeed', 7)}${field('Platinum', 'uvStructurePlatinum', 5)}${field('Crystal', 'uvStructureCrystal', 5)}${field('Ruby', 'uvStructureRuby', 5)}${field('Galaxy', 'uvStructureGalaxy', 5)}</div></article>
          <article class="uv-panel uv-chaska-panel"><div class="uv-panel-title uv-panel-title-split"><div><span>04</span><strong>Chaska's Blessing</strong></div><b id="uvChaskaPoints">0 / 0</b></div><div class="uv-chaska-grid"><label><span>Luck</span><input id="uvChaskaLuck" type="number" min="0" step="1" value="0"></label><label class="platinum"><span>Platinum</span><input id="uvChaskaPlatinum" type="number" min="0" step="1" value="0"></label><label class="crystal"><span>Crystal</span><input id="uvChaskaCrystal" type="number" min="0" step="1" value="0"></label><label class="galaxy"><span>Galaxy</span><input id="uvChaskaGalaxy" type="number" min="0" step="1" value="0"></label></div></article>
        </div>
        <div class="uv-stack">
          <article class="uv-panel"><div class="uv-panel-title"><span>05</span><strong>Modifiers</strong></div><div class="uv-toggle-grid">${toggle('1.5× Border', 'uvBorderBoost')}${toggle('Time Storm', 'uvTimeStorm')}${toggle('Boss Pot', 'uvBossPot')}${toggle('Lucky Surge', 'uvLuckySurge')}${toggle('The Dice', 'uvDice')}${toggle('Quickdraw', 'uvQuickdraw')}${toggle('Heavy Hand', 'uvHeavyHand')}</div></article>
          <article class="uv-panel uv-target-panel"><div class="uv-panel-title"><span>06</span><strong>Targets</strong></div><div class="uv-target-label">Borders</div><div class="uv-border-buttons">${BORDER_NAMES.map((name) => `<button type="button" data-border="${name}" class="uv-border ${name.toLowerCase()}${name === 'Platinum' ? ' active' : ''}">${name}</button>`).join('')}</div><label class="uv-target-rarity"><span>Minimum Card Rarity</span><input id="uvCardRarity" type="number" min="1" step="any" value="1000000"></label></article>
        </div>
      </section>
      <section class="uv-results-row">
        <article class="uv-result-panel"><div class="uv-result-kicker">Border Target</div><div id="uvBorderSummary" class="uv-summary-chips"></div><div class="uv-result-values"><div><span>Average Rolls</span><strong id="uvBorderRolls">—</strong></div><div><span>Average Time</span><strong id="uvBorderTime">—</strong></div></div></article>
        <article class="uv-result-panel uv-card-result"><div class="uv-result-kicker">Card Target <b>≥ <span id="uvCardLabel">1M</span></b></div><div class="uv-result-values"><div><span>Average Rolls</span><strong id="uvCardRolls">—</strong></div><div><span>Average Time</span><strong id="uvCardTime">—</strong></div></div><div class="uv-speed-strip"><span><b id="uvCardsSecond">1</b> cards/s</span><span><b id="uvRollsHour">3.6K</b> rolls/h</span></div></article>
      </section>
      <section class="uv-time-panel"><div class="uv-time-head"><div><span class="uv-result-kicker">Time Span</span><div class="uv-time-switch"><button type="button" data-time-mode="borders" class="active">Borders</button><button type="button" data-time-mode="cards">Card Rarity</button></div></div><div class="uv-time-controls"><input id="uvTimeValue" type="number" min="0" step="any" value="1"><select id="uvTimeUnit"><option value="second">Seconds</option><option value="minute">Minutes</option><option value="hour" selected>Hours</option><option value="day">Days</option><option value="week">Weeks</option></select><div><span>Rolls</span><strong id="uvTimeRolls">3.6K</strong></div></div></div><div id="uvBorderChanceGrid" class="uv-chance-grid"></div><div id="uvCardChanceGrid" class="uv-chance-grid" style="display:none"></div></section>
    `;
    directView.insertAdjacentElement('afterend', root);
    const charm = $('uvCharm');
    for (const name of Object.keys(CHARMS)) { const option = document.createElement('option'); option.value = name; option.textContent = name; charm.append(option); }
  }

  function injectStyles() {
    document.getElementById('upgrade-v2-styles')?.remove();
    const style = document.createElement('style');
    style.id = 'upgrade-v2-styles';
    style.textContent = `
      .uv-mode-switch{display:flex;gap:8px;margin:-4px 0 18px}.uv-mode{padding:9px 18px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--muted);font-size:.76rem;font-weight:850;cursor:pointer}.uv-mode.active{background:var(--text);border-color:var(--text);color:var(--bg)}
      .direct-calc-view{display:block}.uv-root{display:grid;gap:14px}
      .uv-stat-ribbon{display:grid;grid-template-columns:1.25fr repeat(5,1fr);overflow:hidden;border:1px solid var(--line);border-radius:14px;background:linear-gradient(135deg,var(--panel),var(--panel-2))}.uv-stat-ribbon>div{min-width:0;padding:15px 16px;border-left:1px solid var(--line)}.uv-stat-ribbon>div:first-child{border-left:0}.uv-stat-ribbon span{display:block;color:var(--muted);font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.uv-stat-ribbon strong{display:block;margin-top:5px;font-size:1.12rem}.uv-ribbon-main strong{font-size:1.45rem}.uv-stat-ribbon .platinum strong{color:var(--platinum)}.uv-stat-ribbon .crystal strong{color:var(--crystal)}.uv-stat-ribbon .ruby strong{color:var(--ruby)}.uv-stat-ribbon .galaxy strong{color:var(--galaxy)}
      .uv-workbench{display:grid;grid-template-columns:.9fr 1.1fr .9fr;gap:12px;align-items:start}.uv-stack{display:grid;gap:12px}.uv-panel{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.uv-center-stack .uv-panel:first-child{background:linear-gradient(180deg,color-mix(in srgb,var(--blue) 5%,var(--panel)),var(--panel))}.uv-panel-title{display:flex;align-items:center;gap:9px;margin-bottom:13px}.uv-panel-title>span,.uv-panel-title>div>span{display:grid;place-items:center;width:25px;height:25px;border:1px solid var(--line-2);border-radius:8px;color:var(--blue);font-size:.62rem;font-weight:900}.uv-panel-title strong{font-size:.82rem;letter-spacing:.02em}.uv-panel-title-split{justify-content:space-between}.uv-panel-title-split>div{display:flex;align-items:center;gap:9px}.uv-panel-title-split>b{color:var(--muted);font-size:.7rem}.uv-panel-title-split>b.over{color:var(--ruby)}
      .uv-big-field{display:grid;gap:6px;margin-top:9px}.uv-big-field>span,.uv-target-rarity>span,.uv-target-label{color:var(--muted);font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.uv-big-field input,.uv-big-field select,.uv-level-row select,.uv-chaska-grid input,.uv-target-rarity input,.uv-time-controls input,.uv-time-controls select{height:40px;border:1px solid var(--line-2);border-radius:9px;background:#080a0e;color:#fff;outline:0;padding:0 10px;font-weight:750}.uv-big-field input:focus,.uv-big-field select:focus,.uv-level-row select:focus,.uv-chaska-grid input:focus,.uv-target-rarity input:focus{border-color:#657188}
      .uv-level-list,.uv-structure-grid{display:grid;gap:7px}.uv-structure-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-level-row{display:grid;grid-template-columns:minmax(0,1fr) 82px;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.uv-level-row>span{font-size:.72rem;font-weight:750;color:#c5ccd6}.uv-level-row select{height:34px;padding:0 7px;font-size:.72rem}
      .uv-chaska-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.uv-chaska-grid label{display:grid;gap:5px;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.uv-chaska-grid span{font-size:.68rem;font-weight:800}.uv-chaska-grid .platinum span{color:var(--platinum)}.uv-chaska-grid .crystal span{color:var(--crystal)}.uv-chaska-grid .galaxy span{color:var(--galaxy)}
      .uv-toggle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.uv-toggle{position:relative}.uv-toggle input{position:absolute;opacity:0;pointer-events:none}.uv-toggle span{display:flex;align-items:center;justify-content:center;min-height:39px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);color:var(--muted);font-size:.7rem;font-weight:800;cursor:pointer;text-align:center}.uv-toggle input:checked+span{border-color:var(--blue);background:color-mix(in srgb,var(--blue) 10%,var(--panel-2));color:#fff}
      .uv-border-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px}.uv-border{min-height:39px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);color:var(--muted);font-size:.7rem;font-weight:850;cursor:pointer}.uv-border.active.platinum{border-color:var(--platinum);color:var(--platinum)}.uv-border.active.crystal{border-color:var(--crystal);color:var(--crystal)}.uv-border.active.ruby{border-color:var(--ruby);color:var(--ruby)}.uv-border.active.galaxy{border-color:var(--galaxy);color:var(--galaxy)}.uv-target-rarity{display:grid;gap:6px;margin-top:13px}
      .uv-results-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.uv-result-panel{padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.uv-result-kicker{color:var(--muted);font-size:.68rem;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.uv-result-kicker b{margin-left:7px;color:#fff;font-size:.8rem}.uv-summary-chips{display:flex;flex-wrap:wrap;gap:6px;min-height:29px;margin-top:9px}.uv-chip{padding:5px 8px;border:1px solid var(--line-2);border-radius:999px;background:var(--panel-2);font-size:.68rem;font-weight:850}.uv-chip.platinum{color:var(--platinum)}.uv-chip.crystal{color:var(--crystal)}.uv-chip.ruby{color:var(--ruby)}.uv-chip.galaxy{color:var(--galaxy)}.uv-result-values{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.uv-result-values>div{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.uv-result-values span,.uv-speed-strip span,.uv-time-controls>div span{display:block;color:var(--muted);font-size:.64rem;font-weight:750}.uv-result-values strong{display:block;margin-top:4px;font-size:1.35rem}.uv-speed-strip{display:flex;gap:18px;margin-top:11px;padding-top:10px;border-top:1px solid var(--line)}.uv-speed-strip span{font-size:.7rem}.uv-speed-strip b{color:#fff;font-size:.82rem}
      .uv-time-panel{padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.uv-time-head{display:flex;justify-content:space-between;align-items:center;gap:14px}.uv-time-switch{display:flex;gap:5px;margin-top:9px}.uv-time-switch button{padding:7px 11px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:.68rem;font-weight:800;cursor:pointer}.uv-time-switch button.active{border-color:var(--line-2);background:#171b22;color:#fff}.uv-time-controls{display:grid;grid-template-columns:90px 115px auto;align-items:center;gap:7px}.uv-time-controls>div{padding-left:10px;border-left:1px solid var(--line)}.uv-time-controls strong{display:block;margin-top:3px;font-size:.84rem}.uv-chance-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:14px}.uv-chance{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:50px;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.uv-chance-label{display:flex;flex-wrap:wrap;gap:4px;min-width:0}.uv-mini-chip{padding:3px 6px;border:1px solid var(--line-2);border-radius:999px;font-size:.6rem;font-weight:850}.uv-chance>strong{white-space:nowrap;font-size:.78rem}
      @media(max-width:980px){.uv-workbench{grid-template-columns:1fr 1fr}.uv-workbench>.uv-stack:last-child{grid-column:1/-1;grid-template-columns:1fr 1fr}.uv-stat-ribbon{grid-template-columns:repeat(3,1fr)}.uv-stat-ribbon>div:nth-child(4){border-left:0;border-top:1px solid var(--line)}.uv-stat-ribbon>div:nth-child(n+4){border-top:1px solid var(--line)}.uv-chance-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){.uv-workbench{grid-template-columns:1fr}.uv-workbench>.uv-stack:last-child{grid-column:auto;grid-template-columns:1fr}.uv-results-row{grid-template-columns:1fr}.uv-time-head{align-items:stretch;flex-direction:column}.uv-time-controls{grid-template-columns:1fr 1fr auto}.uv-chance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.uv-mode-switch{display:grid;grid-template-columns:1fr 1fr}.uv-stat-ribbon{grid-template-columns:1fr 1fr}.uv-stat-ribbon>div:nth-child(odd){border-left:0}.uv-stat-ribbon>div:nth-child(n+3){border-top:1px solid var(--line)}.uv-structure-grid,.uv-chaska-grid,.uv-toggle-grid{grid-template-columns:1fr}.uv-result-values{grid-template-columns:1fr}.uv-time-controls{grid-template-columns:1fr 1fr}.uv-time-controls>div{grid-column:1/-1;border-left:0;border-top:1px solid var(--line);padding:8px 0 0}.uv-chance-grid{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function setMode(next) {
    state.mode = next === 'upgrades' ? 'upgrades' : 'stats';
    const showUpgrade = state.mode === 'upgrades';
    const direct = $('directCalcView');
    const upgrade = $('upgradeCalcV2');
    if (direct) { direct.hidden = showUpgrade; direct.style.setProperty('display', showUpgrade ? 'none' : 'block', 'important'); }
    if (upgrade) { upgrade.hidden = !showUpgrade; upgrade.style.setProperty('display', showUpgrade ? 'grid' : 'none', 'important'); }
    document.querySelectorAll('.uv-mode').forEach((button) => button.classList.toggle('active', button.dataset.view === state.mode));
    if (showUpgrade) render();
  }

  function borderChip(name, mini = false) { const span = document.createElement('span'); span.className = `${mini ? 'uv-mini-chip' : 'uv-chip'} ${name.toLowerCase()}`; span.textContent = name; return span; }
  function renderBorderButtons() {
    document.querySelectorAll('.uv-border').forEach((button) => button.classList.toggle('active', state.borders.has(button.dataset.border)));
    const summary = $('uvBorderSummary'); summary.replaceChildren();
    if (!state.borders.size) { const empty = document.createElement('span'); empty.className = 'uv-chip'; empty.textContent = 'Select a border'; summary.append(empty); return; }
    for (const name of BORDER_NAMES) if (state.borders.has(name)) summary.append(borderChip(name));
  }
  function chanceItem(labels, value, rarity = false) {
    const item = document.createElement('div'); item.className = 'uv-chance';
    const left = document.createElement('div'); left.className = 'uv-chance-label';
    if (rarity) { const chip = document.createElement('span'); chip.className = 'uv-mini-chip'; chip.textContent = labels; left.append(chip); }
    else labels.forEach((name) => left.append(borderChip(name, true)));
    const strong = document.createElement('strong'); strong.textContent = value; item.append(left, strong); return item;
  }
  function allBorderCombinations(stats) {
    const combos = [];
    for (let mask = 1; mask < (1 << BORDER_NAMES.length); mask += 1) {
      const names = [];
      for (let i = 0; i < BORDER_NAMES.length; i += 1) if (mask & (1 << i)) names.push(BORDER_NAMES[i]);
      const rate = combinationRate(names, stats); if (rate > 0) combos.push({ names, rate });
    }
    combos.sort((a, b) => a.names.length - b.names.length || b.rate - a.rate); return combos;
  }
  function save() {
    try {
      const values = {};
      document.querySelectorAll('#upgradeCalcV2 input, #upgradeCalcV2 select').forEach((el) => { if (el.id) values[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ values, borders: [...state.borders] }));
    } catch {}
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      for (const [id, value] of Object.entries(saved.values || {})) { const el = $(id); if (!el) continue; if (el.type === 'checkbox') el.checked = !!value; else el.value = String(value); }
      if (Array.isArray(saved.borders)) { state.borders.clear(); for (const name of saved.borders) if (BORDERS[name]) state.borders.add(name); }
    } catch {}
  }
  function resetBuilder() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    document.querySelectorAll('#upgradeCalcV2 input').forEach((el) => { if (el.type === 'checkbox') el.checked = false; else if (el.id === 'uvCardRarity') el.value = '1000000'; else if (el.id === 'uvTimeValue') el.value = '1'; else el.value = '0'; });
    document.querySelectorAll('#upgradeCalcV2 select').forEach((el) => { el.selectedIndex = 0; });
    $('uvTimeUnit').value = 'hour'; state.borders.clear(); state.borders.add('Platinum'); render();
  }

  function render() {
    const stats = calculateStats();
    const distribution = cardDistribution(stats);
    const outcomes = borderOutcomes(stats);
    const selectedRate = state.borders.size ? combinationRate([...state.borders], stats) : 0;
    const borderPerf = performance(selectedRate, stats.cardsPerSecond);
    const target = Math.max(1, num('uvCardRarity', 1000000));
    const cardRate = thresholdRate(target, stats, distribution, outcomes);
    const cardPerf = performance(cardRate, stats.cardsPerSecond);

    $('uvOutLuck').textContent = formatNumber(stats.luck, 2);
    $('uvOutSpeed').textContent = `${formatNumber(stats.rollSpeed, 2)}%`;
    $('uvOutPlatinum').textContent = `${formatNumber(stats.borderDisplay.Platinum, 2)}×`;
    $('uvOutCrystal').textContent = `${formatNumber(stats.borderDisplay.Crystal, 2)}×`;
    $('uvOutRuby').textContent = `${formatNumber(stats.borderDisplay.Ruby, 2)}×`;
    $('uvOutGalaxy').textContent = `${formatNumber(stats.borderDisplay.Galaxy, 2)}×`;
    $('uvBorderRolls').textContent = formatNumber(borderPerf.rolls);
    $('uvBorderTime').textContent = formatTime(borderPerf.time);
    $('uvCardLabel').textContent = formatNumber(target);
    $('uvCardRolls').textContent = formatNumber(cardPerf.rolls);
    $('uvCardTime').textContent = formatTime(cardPerf.time);
    $('uvCardsSecond').textContent = formatNumber(stats.cardsPerSecond, 2);
    $('uvRollsHour').textContent = formatNumber(stats.cardsPerSecond * 3600);

    const earned = Math.floor(stats.rolls / 50000);
    const used = Math.max(0, Math.floor(num('uvChaskaLuck'))) + Math.max(0, Math.floor(num('uvChaskaPlatinum'))) + Math.max(0, Math.floor(num('uvChaskaCrystal'))) + Math.max(0, Math.floor(num('uvChaskaGalaxy')));
    $('uvChaskaPoints').textContent = `${formatNumber(used)} / ${formatNumber(earned)}`;
    $('uvChaskaPoints').classList.toggle('over', used > earned);
    renderBorderButtons();

    const seconds = Math.max(0, num('uvTimeValue', 1)) * TIME_UNITS[$('uvTimeUnit').value];
    const totalRolls = Math.max(0, Math.floor(seconds * stats.cardsPerSecond));
    $('uvTimeRolls').textContent = formatNumber(totalRolls);
    const borderGrid = $('uvBorderChanceGrid'); borderGrid.replaceChildren();
    for (const combo of allBorderCombinations(stats)) borderGrid.append(chanceItem(combo.names, formatSpan(combo.rate * totalRolls)));
    const cardGrid = $('uvCardChanceGrid'); cardGrid.replaceChildren();
    for (const threshold of THRESHOLDS) cardGrid.append(chanceItem(`≥ ${formatNumber(threshold)}`, formatSpan(thresholdRate(threshold, stats, distribution, outcomes) * totalRolls), true));
    save();
  }

  function bind() {
    document.querySelectorAll('.uv-mode').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); setMode(button.dataset.view); }, true));
    document.querySelectorAll('#upgradeCalcV2 input, #upgradeCalcV2 select').forEach((el) => { el.addEventListener('input', render); el.addEventListener('change', render); });
    document.querySelectorAll('.uv-border').forEach((button) => button.addEventListener('click', () => { const name = button.dataset.border; if (state.borders.has(name)) state.borders.delete(name); else state.borders.add(name); render(); }));
    document.querySelectorAll('[data-time-mode]').forEach((button) => button.addEventListener('click', () => { const cards = button.dataset.timeMode === 'cards'; $('uvBorderChanceGrid').style.display = cards ? 'none' : 'grid'; $('uvCardChanceGrid').style.display = cards ? 'grid' : 'none'; document.querySelectorAll('[data-time-mode]').forEach((other) => other.classList.toggle('active', other === button)); }));
    $('resetBtn')?.addEventListener('click', (event) => { if (state.mode !== 'upgrades') return; event.preventDefault(); event.stopImmediatePropagation(); resetBuilder(); }, true);
  }

  function init() { injectStyles(); buildUI(); load(); bind(); render(); setMode('stats'); }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init, { once: true });
})();
