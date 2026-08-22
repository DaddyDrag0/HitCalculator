const BORDERS = {
  Platinum: { denominator: 100, multiplier: 100, luckId: "platinumLuck" },
  Crystal: { denominator: 10_000, multiplier: 10_000, luckId: "crystalLuck" },
  Ruby: { denominator: 100_000, multiplier: 100_000, luckId: "rubyLuck" },
  Galaxy: { denominator: 1_000_000, multiplier: 1_000_000, luckId: "galaxyLuck" },
};

const CARD_POOL = [{"name":"Fate Seamstress","rarity":2000000000,"expires":1788224400,"rollFactor":0.2},{"name":"Eonus","rarity":888888888,"expires":1788224400,"rollFactor":0.2},{"name":"Eclipseborn Luminant","rarity":299792458,"expires":1788224400,"rollFactor":0.2},{"name":"Fafnir","rarity":100000000,"expires":null,"rollFactor":1},{"name":"Ragon","rarity":100000000,"expires":null,"rollFactor":1},{"name":"Gilgamesh","rarity":50000000,"expires":null,"rollFactor":1},{"name":"Deus Ex","rarity":10000000,"expires":null,"rollFactor":1},{"name":"Hades","rarity":6666666,"expires":null,"rollFactor":1},{"name":"Poseidon","rarity":3000000,"expires":null,"rollFactor":1},{"name":"ToadBoiGaming","rarity":1200000,"expires":null,"rollFactor":1},{"name":"Bad Boys","rarity":1000000,"expires":null,"rollFactor":1},{"name":"Jamiy the Bald One","rarity":1000000,"expires":null,"rollFactor":1},{"name":"Phoenix","rarity":555555,"expires":null,"rollFactor":1},{"name":"Titan","rarity":500000,"expires":null,"rollFactor":1},{"name":"Frankenstein","rarity":350000,"expires":null,"rollFactor":1},{"name":"Brunhilde","rarity":250000,"expires":null,"rollFactor":1},{"name":"Leviathan","rarity":100000,"expires":null,"rollFactor":1},{"name":"Three-Legged Golden Crow","rarity":55555,"expires":null,"rollFactor":1},{"name":"Arthur of Excalibur","rarity":15000,"expires":null,"rollFactor":1},{"name":"Greedy Belly","rarity":10000,"expires":null,"rollFactor":1},{"name":"Tartarus","rarity":6666,"expires":null,"rollFactor":1},{"name":"Knightmare","rarity":5000,"expires":null,"rollFactor":1},{"name":"Skeleton King","rarity":3333,"expires":null,"rollFactor":1},{"name":"Count Muscula","rarity":2000,"expires":null,"rollFactor":1},{"name":"Michael","rarity":1000,"expires":null,"rollFactor":1},{"name":"Beelzebub","rarity":666,"expires":null,"rollFactor":1},{"name":"Arthur","rarity":500,"expires":null,"rollFactor":1},{"name":"Crown Prince","rarity":200,"expires":null,"rollFactor":1},{"name":"General Moon Zoo","rarity":100,"expires":null,"rollFactor":1},{"name":"Forest Spirit","rarity":75,"expires":null,"rollFactor":1},{"name":"Wizard","rarity":35,"expires":null,"rollFactor":1},{"name":"Baby Skeleton","rarity":20,"expires":null,"rollFactor":1},{"name":"Useless Seer","rarity":12,"expires":null,"rollFactor":1},{"name":"Good Boy","rarity":8,"expires":null,"rollFactor":1},{"name":"Shining Armor","rarity":4,"expires":null,"rollFactor":1},{"name":"Archer","rarity":2,"expires":null,"rollFactor":1}];
const CARD_THRESHOLDS = Array.from({ length: 22 }, (_, i) => 10 ** (i + 1));
const TIME_UNITS = { second: 1, minute: 60, hour: 3_600, day: 86_400, week: 604_800 };
const STORAGE_KEY = "hitCalcStatsV2";
const OLD_STORAGE_KEY = "hitCalcStatsV1";
const NUMBER_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
const $ = (id) => document.getElementById(id);

const els = {
  resetBtn: $("resetBtn"),
  luck: $("luck"),
  rollSpeed: $("rollSpeed"),
  speedStructure: $("speedStructure"),
  timeStorm: $("timeStorm"),
  selectedBorders: $("selectedBorders"),
  averageRolls: $("averageRolls"),
  averageTime: $("averageTime"),
  cardRarity: $("cardRarity"),
  cardTargetLabel: $("cardTargetLabel"),
  cardAverageRolls: $("cardAverageRolls"),
  cardAverageTime: $("cardAverageTime"),
  cardsPerSecond: $("cardsPerSecond"),
  rollsPerHour: $("rollsPerHour"),
  timeValue: $("timeValue"),
  timeUnit: $("timeUnit"),
  timeRolls: $("timeRolls"),
  borderChanceResults: $("borderChanceResults"),
  cardChanceResults: $("cardChanceResults"),
};

const selected = new Set(["Platinum"]);

function loadSavedStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const id of ["luck", "rollSpeed", "speedStructure", "platinumLuck", "crystalLuck", "rubyLuck", "galaxyLuck", "cardRarity"]) {
      if (saved[id] !== undefined && saved[id] !== null) $(id).value = String(saved[id]);
    }
    if (typeof saved.timeStorm === "boolean") els.timeStorm.checked = saved.timeStorm;
  } catch {}
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      luck: els.luck.value,
      rollSpeed: els.rollSpeed.value,
      speedStructure: els.speedStructure.value,
      timeStorm: els.timeStorm.checked,
      platinumLuck: $("platinumLuck").value,
      crystalLuck: $("crystalLuck").value,
      rubyLuck: $("rubyLuck").value,
      galaxyLuck: $("galaxyLuck").value,
      cardRarity: els.cardRarity.value,
    }));
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {}
}

function readNumber(input, fallback = 0, min = -Infinity) {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function trimFixed(value, digits) {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs < 1_000) return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  const tier = Math.floor(Math.log10(abs) / 3);
  if (tier >= NUMBER_SUFFIXES.length) return value.toExponential(2);
  const scaled = value / Math.pow(1_000, tier);
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
  if (years >= 1_000) return `${formatNumber(years)}y`;
  const parts = [];
  if (years) parts.push(`${years}y`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!years && !days && !hours && secs) parts.push(`${secs}s`);
  return parts.slice(0, 3).join(" ") || "0s";
}

function formatChance(probability) {
  if (!Number.isFinite(probability) || probability <= 0) return "0%";
  if (probability >= 1 - 1e-12) return "100%";
  const percent = probability * 100;
  if (percent < 1) return `1 / ${formatNumber(1 / probability, 2)}`;
  if (percent >= 10) return `${trimFixed(percent, 1)}%`;
  return `${trimFixed(percent, 2)}%`;
}

function getStats() {
  return {
    Luck: readNumber(els.luck, 1, 0),
    rollSpeed: readNumber(els.rollSpeed, 100, 0.01),
    Platinum: readNumber($(BORDERS.Platinum.luckId), 0, 0),
    Crystal: readNumber($(BORDERS.Crystal.luckId), 0, 0),
    Ruby: readNumber($(BORDERS.Ruby.luckId), 0, 0),
    Galaxy: readNumber($(BORDERS.Galaxy.luckId), 0, 0),
  };
}

function speedStructureMultiplier() {
  const level = Math.max(0, Math.min(7, Number(els.speedStructure.value) || 0));
  return 1 + (0.5 * level / 7);
}

function rollsPerSecond(stats) {
  return (stats.rollSpeed / 100) * speedStructureMultiplier() * (els.timeStorm.checked ? 2 : 1);
}

function borderRate(name, stats) {
  return Math.min(1, stats[name] / BORDERS[name].denominator);
}

function combinationRate(names, stats) {
  let rate = 1;
  for (const name of names) rate *= borderRate(name, stats);
  return rate;
}

function selectedRate(stats) {
  return selected.size ? combinationRate([...selected], stats) : 0;
}

function performanceForRate(rate, cardsPerSecond) {
  const rolls = rate > 0 ? 1 / rate : Infinity;
  return { rolls, time: cardsPerSecond > 0 ? rolls / cardsPerSecond : Infinity };
}

function activeCards() {
  const now = Date.now() / 1000;
  return CARD_POOL.filter((card) => !card.expires || card.expires > now);
}

function cardSelectionDistribution(stats) {
  const cards = activeCards();
  let remaining = 1;
  const distribution = [];

  for (const card of cards) {
    const rollRarity = card.rarity * card.rollFactor;
    const success = Math.min(1, stats.Luck / rollRarity);
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

function borderOutcomes(stats) {
  const names = Object.keys(BORDERS);
  const outcomes = [];
  for (let mask = 0; mask < (1 << names.length); mask += 1) {
    let probability = 1;
    let multiplier = 1;
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const p = borderRate(name, stats);
      if (mask & (1 << i)) {
        probability *= p;
        multiplier *= BORDERS[name].multiplier;
      } else {
        probability *= 1 - p;
      }
    }
    if (probability > 0) outcomes.push({ probability, multiplier });
  }
  return outcomes;
}

function cardThresholdRate(threshold, stats, distribution = null, outcomes = null) {
  if (!(threshold > 0)) return 0;
  const cards = distribution || cardSelectionDistribution(stats);
  const borders = outcomes || borderOutcomes(stats);
  let rate = 0;

  for (const entry of cards) {
    let borderHit = 0;
    for (const outcome of borders) {
      if (entry.card.rarity * outcome.multiplier >= threshold) borderHit += outcome.probability;
    }
    rate += entry.probability * borderHit;
  }

  return Math.min(1, Math.max(0, rate));
}

function updateTargetUI() {
  document.querySelectorAll(".border-tab").forEach((button) => {
    const active = selected.has(button.dataset.border);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.selectedBorders.replaceChildren();
  if (!selected.size) {
    const empty = document.createElement("span");
    empty.className = "empty-target";
    empty.textContent = "Select a border";
    els.selectedBorders.append(empty);
    return;
  }
  for (const name of Object.keys(BORDERS)) {
    if (selected.has(name)) els.selectedBorders.append(makeBorderChip(name));
  }
}

function makeBorderChip(name) {
  const chip = document.createElement("span");
  chip.className = `target-chip ${name.toLowerCase()}`;
  chip.textContent = name;
  return chip;
}

function getAllCombinations(stats) {
  const names = Object.keys(BORDERS);
  const combinations = [];
  for (let mask = 1; mask < (1 << names.length); mask += 1) {
    const combo = [];
    for (let i = 0; i < names.length; i += 1) if (mask & (1 << i)) combo.push(names[i]);
    const rate = combinationRate(combo, stats);
    if (rate > 0) combinations.push({ names: combo, rate });
  }
  combinations.sort((a, b) => a.names.length - b.names.length || b.rate - a.rate);
  return combinations;
}

function chanceAtLeastOnce(perRollRate, rolls) {
  if (rolls <= 0 || perRollRate <= 0) return 0;
  if (perRollRate >= 1) return 1;
  const exponent = rolls * Math.log1p(-perRollRate);
  if (exponent < -745) return 1;
  return -Math.expm1(exponent);
}

function timeSpanSeconds() {
  return readNumber(els.timeValue, 0, 0) * TIME_UNITS[els.timeUnit.value];
}

function makeChanceItem(labelNode, chanceText, extraClass = "") {
  const item = document.createElement("article");
  item.className = `chance-item ${extraClass}`.trim();
  const left = document.createElement("div");
  left.className = "chance-chips";
  left.append(labelNode);
  const chance = document.createElement("strong");
  chance.className = "chance-value";
  chance.textContent = chanceText;
  item.append(left, chance);
  return item;
}

function renderTimeSpan(stats, cardsPerSecond, distribution, outcomes) {
  const rolls = Math.max(0, Math.floor(timeSpanSeconds() * cardsPerSecond));
  els.timeRolls.textContent = formatNumber(rolls, 0);
  els.borderChanceResults.replaceChildren();
  els.cardChanceResults.replaceChildren();

  if (rolls <= 0) {
    for (const parent of [els.borderChanceResults, els.cardChanceResults]) {
      const empty = document.createElement("div");
      empty.className = "chance-empty";
      empty.textContent = "No rolls in this span";
      parent.append(empty);
    }
    return;
  }

  for (const combo of getAllCombinations(stats)) {
    const chips = document.createElement("div");
    chips.className = "chip-group";
    for (const name of combo.names) chips.append(makeBorderChip(name));
    els.borderChanceResults.append(makeChanceItem(chips, formatChance(chanceAtLeastOnce(combo.rate, rolls))));
  }

  for (const threshold of CARD_THRESHOLDS) {
    const label = document.createElement("span");
    label.className = "rarity-chip";
    label.textContent = `≥ ${formatNumber(threshold)}`;
    const rate = cardThresholdRate(threshold, stats, distribution, outcomes);
    els.cardChanceResults.append(makeChanceItem(label, formatChance(chanceAtLeastOnce(rate, rolls)), "rarity-chance-item"));
  }
}

function render() {
  const stats = getStats();
  const cardsPerSecond = rollsPerSecond(stats);
  const borderPerf = performanceForRate(selectedRate(stats), cardsPerSecond);
  const distribution = cardSelectionDistribution(stats);
  const outcomes = borderOutcomes(stats);
  const threshold = readNumber(els.cardRarity, 1_000_000, 1);
  const cardRate = cardThresholdRate(threshold, stats, distribution, outcomes);
  const cardPerf = performanceForRate(cardRate, cardsPerSecond);

  updateTargetUI();
  els.averageRolls.textContent = selected.size ? formatNumber(borderPerf.rolls, borderPerf.rolls < 100 ? 2 : 0) : "—";
  els.averageTime.textContent = selected.size ? formatTime(borderPerf.time) : "—";
  els.cardTargetLabel.textContent = formatNumber(threshold);
  els.cardAverageRolls.textContent = formatNumber(cardPerf.rolls, cardPerf.rolls < 100 ? 2 : 0);
  els.cardAverageTime.textContent = formatTime(cardPerf.time);
  els.cardsPerSecond.textContent = trimFixed(cardsPerSecond, cardsPerSecond < 10 ? 2 : 1);
  els.rollsPerHour.textContent = formatNumber(cardsPerSecond * 3600, 0);
  renderTimeSpan(stats, cardsPerSecond, distribution, outcomes);
}

function reset() {
  selected.clear();
  selected.add("Platinum");
  els.luck.value = "1";
  els.rollSpeed.value = "100";
  els.speedStructure.value = "0";
  els.timeStorm.checked = false;
  els.cardRarity.value = "1000000";
  els.timeValue.value = "1";
  els.timeUnit.value = "hour";
  for (const border of Object.values(BORDERS)) $(border.luckId).value = "1";
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(OLD_STORAGE_KEY); } catch {}
  render();
}

document.querySelectorAll(".border-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.border;
    if (selected.has(name)) selected.delete(name); else selected.add(name);
    render();
  });
});

for (const id of ["luck", "rollSpeed", "speedStructure", "timeStorm", "platinumLuck", "crystalLuck", "rubyLuck", "galaxyLuck", "cardRarity"]) {
  const element = $(id);
  const update = () => { saveStats(); render(); };
  element.addEventListener("input", update);
  element.addEventListener("change", update);
}

for (const id of ["timeValue", "timeUnit"]) {
  const element = $(id);
  element.addEventListener("input", render);
  element.addEventListener("change", render);
}

els.resetBtn.addEventListener("click", reset);
loadSavedStats();
render();
