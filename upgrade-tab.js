(() => {
  const STORAGE_KEY = "hitCalcUpgradeBuilderV1";

  const UB_BORDERS = {
    Platinum: { denominator: 100, multiplier: 100 },
    Crystal: { denominator: 10_000, multiplier: 10_000 },
    Ruby: { denominator: 100_000, multiplier: 100_000 },
    Galaxy: { denominator: 1_000_000, multiplier: 1_000_000 },
  };

  const SKILL_VALUES = {
    Luck: [0, 15, 30, 45, 60, 75, 90, 150],
    RollSpeed: [0, 5, 10, 15, 20, 25, 30, 45],
    AllStat: [0, 3, 6, 11],
    Platinum: [0, 0.5, 1, 1.5, 2, 2.5, 5],
    Crystal: [0, 1.75, 3.5, 5.25, 7, 8.75, 14.75],
    Ruby: [0, 1.5, 3, 4.5, 6, 7.5, 13.5],
    Galaxy: [0, 4, 8, 12, 16, 20, 30],
  };

  const CHARMS = {
    "None": {},
    "Old Tome": { Luck: 0.5 },
    "Holy Cross": { Luck: 1 },
    "Bloodstone": { Luck: 2 },
    "Lunar Charm": { Luck: 2.5, Cooldown: 10 },
    "Blood Moon": { Luck: 3, Cooldown: 20 },
    "Ice Crystal": { Luck: 3.5, Cooldown: 30 },
    "Victor's Trophy": { Luck: 5, Cooldown: 40 },
    "Phoenix Feather": { Luck: 5.5, Cooldown: 50 },
    "Hell Charm": { Luck: 7.5, Cooldown: 60 },
    "Emperor's Hand": { Luck: 10, Cooldown: 75 },
    "Heavenly Crown": { Luck: 15, Cooldown: 100 },
    "Durandal": { Luck: 7, Cooldown: 60 },
    "Platinum Gem": { Luck: 10, Platinum: 0.5, Cooldown: 80 },
    "Crystal Gem": { Luck: 12, Platinum: 0.5, Crystal: 0.5, Cooldown: 100 },
    "Dark Star": { Luck: 15, Platinum: 0.5, Crystal: 0.5, Ruby: 0.5, Galaxy: 0.5, Cooldown: 125 },
    "Infinity Gem": { Luck: 20, Platinum: 1, Crystal: 1, Ruby: 1, Galaxy: 1, Cooldown: 150 },
    "Lucky Crown": { Luck: 27, Platinum: 1.5, Crystal: 1.5, Ruby: 1.5, Galaxy: 1.5, Cooldown: 175 },
    "Forbidden Book": { Luck: 35, Platinum: 2, Crystal: 2, Ruby: 2, Galaxy: 2, Cooldown: 200 },
    "Angel's Halo": { Luck: 42, Platinum: 3, Crystal: 3, Ruby: 3, Galaxy: 3, Cooldown: 200 },
    "Forbidden Fruit": { Luck: 50, Platinum: 4, Crystal: 4, Ruby: 4, Galaxy: 4, Cooldown: 200 },
    "Book of Life and Death": { Luck: 66, Platinum: 6, Crystal: 6, Ruby: 6, Galaxy: 6, Cooldown: 200 },
  };

  const NUMBER_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  const TIME_UNITS = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  const CARD_THRESHOLDS = Array.from({ length: 22 }, (_, i) => 10 ** (i + 1));

  const selectedBorders = new Set(["Platinum"]);
  let mode = "stats";

  function trimFixed(value, digits) {
    return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
  }

  function formatNumber(value, decimals = 0) {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= NUMBER_SUFFIXES.length) return value.toExponential(2);
    const scaled = value / Math.pow(1000, tier);
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${trimFixed(scaled, digits)}${NUMBER_SUFFIXES[tier]}`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "—";
    if (seconds < 60) return `${trimFixed(seconds, seconds < 10 ? 2 : 1)}s`;
    const total = Math.round(seconds);
    const years = Math.floor(total / 31_557_600);
    const days = Math.floor((total % 31_557_600) / 86_400);
    const hours = Math.floor((total % 86_400) / 3_600);
    const minutes = Math.floor((total % 3_600) / 60);
    const secs = total % 60;
    if (years >= 1000) return `${formatNumber(years)}y`;
    const parts = [];
    if (years) parts.push(`${years}y`);
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!years && !days && !hours && secs) parts.push(`${secs}s`);
    return parts.slice(0, 3).join(" ") || "0s";
  }

  function formatSpanValue(expectedHits) {
    if (!Number.isFinite(expectedHits) || expectedHits <= 0) return "0%";
    const rawPercent = expectedHits * 100;
    if (rawPercent < 1) return `1 / ${formatNumber(1 / expectedHits, 2)}`;
    const percent = Math.min(2000, rawPercent);
    if (percent >= 2000) return "2000%";
    if (percent >= 10) return `${trimFixed(percent, 1)}%`;
    return `${trimFixed(percent, 2)}%`;
  }

  function chaskaBonus(points, rate) {
    let left = Math.max(0, Math.floor(Number(points) || 0));
    let block = 0;
    let total = 0;
    while (left > 0) {
      const amount = Math.min(left, 50);
      total += amount * rate * Math.pow(0.85, block);
      left -= amount;
      block += 1;
    }
    return total;
  }

  function readNumber(id, fallback = 0) {
    const el = document.getElementById(id);
    const value = Number(el?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function readLevel(id, max) {
    return Math.max(0, Math.min(max, Math.floor(readNumber(id, 0))));
  }

  function skillValue(name, id) {
    const values = SKILL_VALUES[name];
    return values[readLevel(id, values.length - 1)] || 0;
  }

  function structureMultiplier(kind, level) {
    if (kind === "Luck" || kind === "Speed") return 1 + (0.5 * level / 7);
    return 1 + (level / 5);
  }

  function calculateStats() {
    const rolls = Math.max(0, Math.floor(readNumber("ubRolls", 0)));
    const charm = CHARMS[document.getElementById("ubCharm")?.value] || {};
    const skill = {
      Luck: skillValue("Luck", "ubSkillLuck"),
      RollSpeed: skillValue("RollSpeed", "ubSkillRollSpeed"),
      AllStat: skillValue("AllStat", "ubSkillAllStat"),
      Platinum: skillValue("Platinum", "ubSkillPlatinum"),
      Crystal: skillValue("Crystal", "ubSkillCrystal"),
      Ruby: skillValue("Ruby", "ubSkillRuby"),
      Galaxy: skillValue("Galaxy", "ubSkillGalaxy"),
    };

    const structures = {
      Luck: readLevel("ubStructureLuck", 7),
      Speed: readLevel("ubStructureSpeed", 7),
      Platinum: readLevel("ubStructurePlatinum", 5),
      Crystal: readLevel("ubStructureCrystal", 5),
      Ruby: readLevel("ubStructureRuby", 5),
      Galaxy: readLevel("ubStructureGalaxy", 5),
    };

    const borderBoost = document.getElementById("ubBorderBoost")?.checked ? 1.5 : 1;
    const quickdraw = !!document.getElementById("ubQuickdraw")?.checked;
    const heavyHand = !!document.getElementById("ubHeavyHand")?.checked;
    const timeStorm = !!document.getElementById("ubTimeStorm")?.checked;

    let luck = 1 + Math.floor(rolls / 1_000_000) * 0.1;
    luck += charm.Luck || 0;
    luck *= 1 + (skill.Luck + skill.AllStat) / 100;
    luck *= structureMultiplier("Luck", structures.Luck);
    luck += chaskaBonus(readNumber("ubChaskaLuck"), 0.25);
    if (quickdraw) luck *= 0.8;
    if (heavyHand) luck *= 1.2;

    let rollSpeed = 100 + (charm.Cooldown || 0);
    rollSpeed *= 1 + (skill.RollSpeed + skill.AllStat) / 100;
    if (quickdraw) rollSpeed *= 1.1;
    if (heavyHand) rollSpeed *= 0.9;

    const allStatMultiplier = 1 + skill.AllStat / 100;
    const borderLuck = {};
    for (const name of Object.keys(UB_BORDERS)) {
      let value = (1 + (charm[name] || 0) + skill[name]) * allStatMultiplier;
      value *= structureMultiplier(name, structures[name]);
      value *= borderBoost;
      if (name === "Platinum") value += chaskaBonus(readNumber("ubChaskaPlatinum"), 0.05);
      if (name === "Crystal") value += chaskaBonus(readNumber("ubChaskaCrystal"), 0.10);
      if (name === "Galaxy") value += chaskaBonus(readNumber("ubChaskaGalaxy"), 0.25);
      borderLuck[name] = value;
    }

    const speedStructure = structureMultiplier("Speed", structures.Speed);
    const cardsPerSecond = (rollSpeed / 100) * speedStructure * (timeStorm ? 2 : 1);

    return {
      rolls,
      luck,
      rollSpeed,
      borderLuck,
      cardsPerSecond,
      timeStorm,
      bossPot: !!document.getElementById("ubBossPot")?.checked,
      luckySurge: !!document.getElementById("ubLuckySurge")?.checked,
      theDice: !!document.getElementById("ubTheDice")?.checked,
    };
  }

  function borderRate(name, stats) {
    return Math.min(1, Math.max(0, stats.borderLuck[name] / UB_BORDERS[name].denominator));
  }

  function combinationRate(names, stats) {
    let rate = 1;
    for (const name of names) rate *= borderRate(name, stats);
    return rate;
  }

  function performance(rate, rps) {
    const rolls = rate > 0 ? 1 / rate : Infinity;
    return { rolls, time: rps > 0 ? rolls / rps : Infinity };
  }

  function activeCards(stats) {
    const now = Date.now() / 1000;
    const pool = typeof CARD_POOL !== "undefined" ? CARD_POOL : [];
    return pool.filter((card) => {
      if (card.expires && card.expires <= now) return false;
      if (card.weather === "Time Storm" && !stats.timeStorm) return false;
      return !card.weather || card.weather === "Time Storm";
    });
  }

  function luckStates(stats) {
    const surgeShare = stats.luckySurge && stats.cardsPerSecond > 0
      ? Math.min(1, 10 / (30 + (100 / stats.cardsPerSecond)))
      : 0;
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

  function distributionAtLuck(stats, multiplier) {
    const cards = activeCards(stats);
    let remaining = 1;
    const distribution = [];
    for (const card of cards) {
      const rollRarity = card.rarity * (card.rollFactor || 1);
      const bossMultiplier = stats.bossPot && card.boss ? 5 : 1;
      const success = Math.min(1, (stats.luck * multiplier * bossMultiplier) / rollRarity);
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
    for (const state of luckStates(stats)) {
      for (const entry of distributionAtLuck(stats, state.multiplier)) {
        const found = merged.get(entry.card.name);
        if (found) found.probability += entry.probability * state.weight;
        else merged.set(entry.card.name, { card: entry.card, probability: entry.probability * state.weight });
      }
    }
    return [...merged.values()];
  }

  function borderOutcomes(stats) {
    const names = Object.keys(UB_BORDERS);
    const outcomes = [];
    for (let mask = 0; mask < (1 << names.length); mask += 1) {
      let probability = 1;
      let multiplier = 1;
      for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        const p = borderRate(name, stats);
        if (mask & (1 << i)) {
          probability *= p;
          multiplier *= UB_BORDERS[name].multiplier;
        } else {
          probability *= 1 - p;
        }
      }
      if (probability > 0) outcomes.push({ probability, multiplier });
    }
    return outcomes;
  }

  function thresholdRate(threshold, stats, distribution, outcomes) {
    if (!(threshold > 0)) return 0;
    let rate = 0;
    for (const entry of distribution) {
      let borderHit = 0;
      for (const outcome of outcomes) {
        if (entry.card.rarity * outcome.multiplier >= threshold) borderHit += outcome.probability;
      }
      rate += entry.probability * borderHit;
    }
    return Math.min(1, Math.max(0, rate));
  }

  function makeChip(name) {
    const chip = document.createElement("span");
    chip.className = `target-chip ${name.toLowerCase()}`;
    chip.textContent = name;
    return chip;
  }

  function makeChanceItem(labelNode, value, extraClass = "") {
    const item = document.createElement("article");
    item.className = `chance-item ${extraClass}`.trim();
    const left = document.createElement("div");
    left.className = "chance-chips";
    left.append(labelNode);
    const strong = document.createElement("strong");
    strong.className = "chance-value";
    strong.textContent = value;
    item.append(left, strong);
    return item;
  }

  function allBorderCombinations(stats) {
    const names = Object.keys(UB_BORDERS);
    const combos = [];
    for (let mask = 1; mask < (1 << names.length); mask += 1) {
      const selected = [];
      for (let i = 0; i < names.length; i += 1) if (mask & (1 << i)) selected.push(names[i]);
      const rate = combinationRate(selected, stats);
      if (rate > 0) combos.push({ names: selected, rate });
    }
    combos.sort((a, b) => a.names.length - b.names.length || b.rate - a.rate);
    return combos;
  }

  function renderSelectedBorders() {
    document.querySelectorAll("#upgradeCalc .ub-border-tab").forEach((button) => {
      const active = selectedBorders.has(button.dataset.border);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const box = document.getElementById("ubSelectedBorders");
    box.replaceChildren();
    if (!selectedBorders.size) {
      const empty = document.createElement("span");
      empty.className = "empty-target";
      empty.textContent = "Select a border";
      box.append(empty);
      return;
    }
    for (const name of Object.keys(UB_BORDERS)) if (selectedBorders.has(name)) box.append(makeChip(name));
  }

  function render() {
    const stats = calculateStats();
    const selectedRate = selectedBorders.size ? combinationRate([...selectedBorders], stats) : 0;
    const borderPerf = performance(selectedRate, stats.cardsPerSecond);
    const threshold = Math.max(1, readNumber("ubCardRarity", 1_000_000));
    const distribution = cardDistribution(stats);
    const outcomes = borderOutcomes(stats);
    const cardRate = thresholdRate(threshold, stats, distribution, outcomes);
    const cardPerf = performance(cardRate, stats.cardsPerSecond);

    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText("ubOutLuck", formatNumber(stats.luck, 2));
    setText("ubOutRollSpeed", `${formatNumber(stats.rollSpeed, 2)}%`);
    setText("ubOutPlatinum", `${formatNumber(stats.borderLuck.Platinum, 2)}×`);
    setText("ubOutCrystal", `${formatNumber(stats.borderLuck.Crystal, 2)}×`);
    setText("ubOutRuby", `${formatNumber(stats.borderLuck.Ruby, 2)}×`);
    setText("ubOutGalaxy", `${formatNumber(stats.borderLuck.Galaxy, 2)}×`);
    setText("ubAverageRolls", formatNumber(borderPerf.rolls));
    setText("ubAverageTime", formatTime(borderPerf.time));
    setText("ubCardTargetLabel", formatNumber(threshold));
    setText("ubCardAverageRolls", formatNumber(cardPerf.rolls));
    setText("ubCardAverageTime", formatTime(cardPerf.time));
    setText("ubCardsPerSecond", formatNumber(stats.cardsPerSecond, 2));
    setText("ubRollsPerHour", formatNumber(stats.cardsPerSecond * 3600));

    const earned = Math.floor(stats.rolls / 50_000);
    const used = Math.max(0, Math.floor(readNumber("ubChaskaLuck")))
      + Math.max(0, Math.floor(readNumber("ubChaskaPlatinum")))
      + Math.max(0, Math.floor(readNumber("ubChaskaCrystal")))
      + Math.max(0, Math.floor(readNumber("ubChaskaGalaxy")));
    const points = document.getElementById("ubChaskaPoints");
    if (points) {
      points.textContent = `${formatNumber(used)} / ${formatNumber(earned)}`;
      points.classList.toggle("over", used > earned);
    }

    renderSelectedBorders();

    const seconds = Math.max(0, readNumber("ubTimeValue", 1)) * TIME_UNITS[document.getElementById("ubTimeUnit")?.value || "hour"];
    const totalRolls = Math.max(0, Math.floor(seconds * stats.cardsPerSecond));
    setText("ubTimeRolls", formatNumber(totalRolls));

    const borderGrid = document.getElementById("ubBorderChanceResults");
    borderGrid.replaceChildren();
    for (const combo of allBorderCombinations(stats)) {
      const group = document.createElement("div");
      group.className = "chip-group";
      combo.names.forEach((name) => group.append(makeChip(name)));
      borderGrid.append(makeChanceItem(group, formatSpanValue(combo.rate * totalRolls)));
    }

    const rarityGrid = document.getElementById("ubCardChanceResults");
    rarityGrid.replaceChildren();
    for (const value of CARD_THRESHOLDS) {
      const chip = document.createElement("span");
      chip.className = "rarity-chip";
      chip.textContent = `≥ ${formatNumber(value)}`;
      rarityGrid.append(makeChanceItem(chip, formatSpanValue(thresholdRate(value, stats, distribution, outcomes) * totalRolls), "rarity-chance-item"));
    }

    save();
  }

  function save() {
    try {
      const inputs = {};
      document.querySelectorAll("#upgradeCalc input, #upgradeCalc select").forEach((el) => {
        if (!el.id || el.type === "radio") return;
        inputs[el.id] = el.type === "checkbox" ? el.checked : el.value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        inputs,
        selectedBorders: [...selectedBorders],
        timeView: document.getElementById("ubTimeViewCards")?.checked ? "cards" : "borders",
      }));
    } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      for (const [id, value] of Object.entries(saved.inputs || {})) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.type === "checkbox") el.checked = !!value;
        else el.value = String(value);
      }
      if (Array.isArray(saved.selectedBorders)) {
        selectedBorders.clear();
        for (const name of saved.selectedBorders) if (UB_BORDERS[name]) selectedBorders.add(name);
      }
      if (saved.timeView === "cards") document.getElementById("ubTimeViewCards").checked = true;
    } catch {}
  }

  function resetBuilder() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const defaults = {
      ubRolls: "0",
      ubCharm: "None",
      ubSkillLuck: "0", ubSkillRollSpeed: "0", ubSkillAllStat: "0", ubSkillPlatinum: "0", ubSkillCrystal: "0", ubSkillRuby: "0", ubSkillGalaxy: "0",
      ubStructureLuck: "0", ubStructureSpeed: "0", ubStructurePlatinum: "0", ubStructureCrystal: "0", ubStructureRuby: "0", ubStructureGalaxy: "0",
      ubChaskaLuck: "0", ubChaskaPlatinum: "0", ubChaskaCrystal: "0", ubChaskaGalaxy: "0",
      ubCardRarity: "1000000", ubTimeValue: "1", ubTimeUnit: "hour",
    };
    for (const [id, value] of Object.entries(defaults)) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
    for (const id of ["ubBorderBoost", "ubTimeStorm", "ubBossPot", "ubLuckySurge", "ubTheDice", "ubQuickdraw", "ubHeavyHand"]) {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    }
    selectedBorders.clear();
    selectedBorders.add("Platinum");
    document.getElementById("ubTimeViewBorders").checked = true;
    render();
  }

  function options(count) {
    return Array.from({ length: count + 1 }, (_, i) => `<option value="${i}">Level ${i}</option>`).join("");
  }

  function buildMarkup() {
    const page = document.querySelector("main.page");
    if (!page || document.getElementById("upgradeCalc")) return;

    const tabs = document.createElement("nav");
    tabs.className = "calc-mode-tabs";
    tabs.innerHTML = '<button class="calc-mode-tab active" type="button" data-calc-mode="stats">Stats</button><button class="calc-mode-tab" type="button" data-calc-mode="upgrades">Upgrades</button>';
    const topbar = page.querySelector(".topbar");
    topbar.insertAdjacentElement("afterend", tabs);

    const upgrade = document.createElement("div");
    upgrade.id = "upgradeCalc";
    upgrade.hidden = true;
    upgrade.innerHTML = `
      <section class="ub-main-grid">
        <div class="card ub-setup-card">
          <div class="section-title">Progress</div>
          <div class="ub-grid two">
            <label class="stat-field luck-field"><span>Total Rolls</span><div class="input-wrap"><input id="ubRolls" type="number" min="0" step="1" value="0"></div></label>
            <label class="stat-field"><span>Charm</span><select id="ubCharm"></select></label>
          </div>

          <div class="divider"></div>
          <div class="section-title">Skill Tree</div>
          <div class="ub-grid skill-grid">
            <label class="stat-field luck-field"><span>Luck</span><select id="ubSkillLuck">${options(7)}</select></label>
            <label class="stat-field speed-field"><span>Roll Speed</span><select id="ubSkillRollSpeed">${options(7)}</select></label>
            <label class="stat-field"><span>All Stat</span><select id="ubSkillAllStat">${options(3)}</select></label>
            <label class="stat-field platinum-field"><span>Platinum</span><select id="ubSkillPlatinum">${options(6)}</select></label>
            <label class="stat-field crystal-field"><span>Crystal</span><select id="ubSkillCrystal">${options(6)}</select></label>
            <label class="stat-field ruby-field"><span>Ruby</span><select id="ubSkillRuby">${options(6)}</select></label>
            <label class="stat-field galaxy-field"><span>Galaxy</span><select id="ubSkillGalaxy">${options(6)}</select></label>
          </div>

          <div class="divider"></div>
          <div class="section-title">Structures</div>
          <div class="ub-grid structure-grid">
            <label class="stat-field luck-field"><span>Luck</span><select id="ubStructureLuck">${options(7)}</select></label>
            <label class="stat-field speed-field"><span>Speed</span><select id="ubStructureSpeed">${options(7)}</select></label>
            <label class="stat-field platinum-field"><span>Platinum</span><select id="ubStructurePlatinum">${options(5)}</select></label>
            <label class="stat-field crystal-field"><span>Crystal</span><select id="ubStructureCrystal">${options(5)}</select></label>
            <label class="stat-field ruby-field"><span>Ruby</span><select id="ubStructureRuby">${options(5)}</select></label>
            <label class="stat-field galaxy-field"><span>Galaxy</span><select id="ubStructureGalaxy">${options(5)}</select></label>
          </div>

          <div class="divider"></div>
          <div class="ub-section-line"><div class="section-title">Chaska's Blessing</div><strong id="ubChaskaPoints" class="ub-points">0 / 0</strong></div>
          <div class="ub-grid chaska-grid">
            <label class="stat-field luck-field"><span>Luck</span><div class="input-wrap"><input id="ubChaskaLuck" type="number" min="0" step="1" value="0"></div></label>
            <label class="stat-field platinum-field"><span>Platinum</span><div class="input-wrap"><input id="ubChaskaPlatinum" type="number" min="0" step="1" value="0"></div></label>
            <label class="stat-field crystal-field"><span>Crystal</span><div class="input-wrap"><input id="ubChaskaCrystal" type="number" min="0" step="1" value="0"></div></label>
            <label class="stat-field galaxy-field"><span>Galaxy</span><div class="input-wrap"><input id="ubChaskaGalaxy" type="number" min="0" step="1" value="0"></div></label>
          </div>

          <div class="divider"></div>
          <div class="section-title">Effects</div>
          <div class="ub-check-grid">
            <label class="check-row"><input id="ubBorderBoost" type="checkbox"><span><strong>1.5× Border</strong></span></label>
            <label class="check-row"><input id="ubTimeStorm" type="checkbox"><span><strong>Time Storm</strong></span></label>
            <label class="check-row"><input id="ubBossPot" type="checkbox"><span><strong>Boss Pot</strong></span></label>
            <label class="check-row"><input id="ubLuckySurge" type="checkbox"><span><strong>Lucky Surge</strong></span></label>
            <label class="check-row"><input id="ubTheDice" type="checkbox"><span><strong>The Dice</strong></span></label>
            <label class="check-row"><input id="ubQuickdraw" type="checkbox"><span><strong>Quickdraw</strong></span></label>
            <label class="check-row"><input id="ubHeavyHand" type="checkbox"><span><strong>Heavy Hand</strong></span></label>
          </div>

          <div class="divider"></div>
          <div class="section-title">Goal Borders</div>
          <div class="border-tabs ub-border-tabs">
            ${Object.keys(UB_BORDERS).map((name) => `<button class="border-tab ub-border-tab ${name.toLowerCase()}${name === "Platinum" ? " active" : ""}" type="button" data-border="${name}" aria-pressed="${name === "Platinum"}"><span class="border-dot"></span><strong>${name}</strong><span class="checkmark">✓</span></button>`).join("")}
          </div>

          <div class="divider"></div>
          <div class="section-title">Card Rarity Target</div>
          <label class="rarity-target"><span>Minimum rarity</span><div class="input-wrap"><input id="ubCardRarity" type="number" min="1" step="any" value="1000000"></div></label>
        </div>

        <aside class="card ub-result-card">
          <div class="result-label">Calculated Stats</div>
          <div class="ub-output-grid">
            <div><span>Luck</span><strong id="ubOutLuck">1</strong></div>
            <div><span>Roll Speed</span><strong id="ubOutRollSpeed">100%</strong></div>
            <div class="platinum"><span>Platinum</span><strong id="ubOutPlatinum">1×</strong></div>
            <div class="crystal"><span>Crystal</span><strong id="ubOutCrystal">1×</strong></div>
            <div class="ruby"><span>Ruby</span><strong id="ubOutRuby">1×</strong></div>
            <div class="galaxy"><span>Galaxy</span><strong id="ubOutGalaxy">1×</strong></div>
          </div>

          <div class="result-divider"></div>
          <div class="result-block">
            <div class="result-label">Border Target</div>
            <div id="ubSelectedBorders" class="selected-borders"></div>
            <div class="primary-results">
              <div class="primary-stat"><span>Average rolls</span><strong id="ubAverageRolls">100</strong></div>
              <div class="primary-stat"><span>Average time</span><strong id="ubAverageTime">1m 40s</strong></div>
            </div>
          </div>

          <div class="result-divider"></div>
          <div class="result-block">
            <div class="result-label">Card Target</div>
            <div class="rarity-readout">≥ <strong id="ubCardTargetLabel">1M</strong></div>
            <div class="primary-results">
              <div class="primary-stat"><span>Average rolls</span><strong id="ubCardAverageRolls">—</strong></div>
              <div class="primary-stat"><span>Average time</span><strong id="ubCardAverageTime">—</strong></div>
            </div>
          </div>

          <div class="secondary-results">
            <div><span>Cards / second</span><strong id="ubCardsPerSecond">1</strong></div>
            <div><span>Rolls / hour</span><strong id="ubRollsPerHour">3.6K</strong></div>
          </div>
        </aside>
      </section>

      <section class="card time-card ub-time-card">
        <input class="time-view-input" type="radio" name="ubTimeView" id="ubTimeViewBorders" checked>
        <input class="time-view-input" type="radio" name="ubTimeView" id="ubTimeViewCards">
        <div class="time-head">
          <div class="section-title">Time Span</div>
          <div class="time-controls">
            <div class="input-wrap time-value-wrap"><input id="ubTimeValue" type="number" min="0" step="any" value="1"></div>
            <select id="ubTimeUnit"><option value="second">Seconds</option><option value="minute">Minutes</option><option value="hour" selected>Hours</option><option value="day">Days</option><option value="week">Weeks</option></select>
            <div class="span-rolls"><span>Rolls</span><strong id="ubTimeRolls">3.6K</strong></div>
          </div>
        </div>
        <div class="time-tabs ub-time-tabs" role="tablist">
          <label class="time-tab" for="ubTimeViewBorders">Borders</label>
          <label class="time-tab" for="ubTimeViewCards">Card Rarity</label>
        </div>
        <div class="ub-time-panel ub-border-time-panel"><div id="ubBorderChanceResults" class="chance-results"></div></div>
        <div class="ub-time-panel ub-card-time-panel"><div id="ubCardChanceResults" class="chance-results rarity-results"></div></div>
      </section>
    `;
    page.append(upgrade);

    const charmSelect = document.getElementById("ubCharm");
    for (const name of Object.keys(CHARMS)) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      charmSelect.append(option);
    }
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.id = "upgrade-calc-styles";
    style.textContent = `
      .calc-mode-tabs{display:inline-flex;gap:4px;margin:0 0 14px;padding:4px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}
      .calc-mode-tab{min-width:100px;padding:8px 14px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);font-size:.76rem;font-weight:800;cursor:pointer}
      .calc-mode-tab.active{border-color:var(--line-2);background:#171b22;color:#fff}
      .ub-main-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(330px,.82fr);gap:14px;align-items:start}
      .ub-setup-card,.ub-result-card{padding:19px}.ub-result-card{position:static}
      .ub-grid{display:grid;gap:9px;margin-top:12px}.ub-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .skill-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.structure-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.chaska-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .ub-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.ub-check-grid .check-row{margin-top:0}
      .ub-section-line{display:flex;align-items:center;justify-content:space-between;gap:10px}.ub-points{color:var(--muted);font-size:.76rem}.ub-points.over{color:var(--ruby)}
      .ub-output-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.ub-output-grid>div{padding:11px 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2)}.ub-output-grid span{display:block;color:var(--muted);font-size:.66rem;font-weight:700}.ub-output-grid strong{display:block;margin-top:4px;font-size:1rem}.ub-output-grid .platinum strong{color:var(--platinum)}.ub-output-grid .crystal strong{color:var(--crystal)}.ub-output-grid .ruby strong{color:var(--ruby)}.ub-output-grid .galaxy strong{color:var(--galaxy)}
      #upgradeCalc .time-view-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.ub-time-tabs{display:inline-flex;gap:4px;margin-top:18px;padding:4px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.ub-time-tabs .time-tab{min-width:112px;padding:8px 14px;border:1px solid transparent;border-radius:6px;color:var(--muted);font-size:.76rem;font-weight:800;text-align:center;cursor:pointer}.ub-time-panel{display:none}.ub-time-panel .chance-results{margin-top:12px}#ubTimeViewBorders:checked~.ub-time-tabs label[for="ubTimeViewBorders"],#ubTimeViewCards:checked~.ub-time-tabs label[for="ubTimeViewCards"]{border-color:var(--line-2);background:#171b22;color:#fff}#ubTimeViewBorders:checked~.ub-border-time-panel,#ubTimeViewCards:checked~.ub-card-time-panel{display:block}
      @media(max-width:900px){.ub-main-grid{grid-template-columns:1fr}.skill-grid,.structure-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.ub-grid.two,.skill-grid,.structure-grid,.chaska-grid,.ub-check-grid{grid-template-columns:1fr}}
      @media(max-width:520px){.ub-setup-card,.ub-result-card{padding:14px}.calc-mode-tabs{display:grid;grid-template-columns:1fr 1fr;width:100%}.calc-mode-tab{min-width:0}.ub-output-grid{grid-template-columns:1fr}.ub-time-tabs{display:grid;grid-template-columns:1fr 1fr;width:100%}}
    `;
    document.head.append(style);
  }

  function setMode(next) {
    mode = next;
    const upgrade = document.getElementById("upgradeCalc");
    const directMain = document.querySelector("main.page > .main-grid");
    const directTime = document.querySelector("main.page > .time-card:not(.ub-time-card)");
    const showUpgrade = next === "upgrades";
    if (directMain) directMain.hidden = showUpgrade;
    if (directTime) directTime.hidden = showUpgrade;
    if (upgrade) upgrade.hidden = !showUpgrade;
    document.querySelectorAll(".calc-mode-tab").forEach((button) => button.classList.toggle("active", button.dataset.calcMode === next));
    if (showUpgrade) render();
  }

  function init() {
    if (document.getElementById("upgradeCalc")) return;
    injectStyles();
    buildMarkup();
    load();

    document.querySelectorAll(".calc-mode-tab").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.calcMode)));
    document.querySelectorAll("#upgradeCalc input, #upgradeCalc select").forEach((el) => {
      if (el.type === "radio") el.addEventListener("change", save);
      else el.addEventListener("input", render);
      el.addEventListener("change", render);
    });
    document.querySelectorAll("#upgradeCalc .ub-border-tab").forEach((button) => button.addEventListener("click", () => {
      const name = button.dataset.border;
      if (selectedBorders.has(name)) selectedBorders.delete(name); else selectedBorders.add(name);
      render();
    }));

    document.getElementById("resetBtn")?.addEventListener("click", () => {
      if (mode === "upgrades") resetBuilder();
    });

    render();
    setMode("stats");
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();
