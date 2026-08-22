const BORDERS = {
  Platinum: { denominator: 100, luckId: "platinumLuck" },
  Crystal: { denominator: 10_000, luckId: "crystalLuck" },
  Ruby: { denominator: 100_000, luckId: "rubyLuck" },
  Galaxy: { denominator: 1_000_000, luckId: "galaxyLuck" },
};

const TIME_UNITS = {
  second: 1,
  minute: 60,
  hour: 3_600,
  day: 86_400,
  week: 604_800,
};

const NUMBER_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
const $ = (id) => document.getElementById(id);

const els = {
  resetBtn: $("resetBtn"),
  rollSpeed: $("rollSpeed"),
  speedStructure: $("speedStructure"),
  timeStorm: $("timeStorm"),
  selectedBorders: $("selectedBorders"),
  averageRolls: $("averageRolls"),
  averageTime: $("averageTime"),
  cardsPerSecond: $("cardsPerSecond"),
  rollsPerHour: $("rollsPerHour"),
  timeValue: $("timeValue"),
  timeUnit: $("timeUnit"),
  timeRolls: $("timeRolls"),
  borderChanceResults: $("borderChanceResults"),
};

const selected = new Set(["Platinum"]);

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
  if (percent < 1) {
    return `1 / ${formatNumber(1 / probability, 2)}`;
  }

  if (percent >= 10) return `${trimFixed(percent, 1)}%`;
  return `${trimFixed(percent, 2)}%`;
}

function getStats() {
  return {
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
  const stormMultiplier = els.timeStorm.checked ? 2 : 1;
  return (stats.rollSpeed / 100) * speedStructureMultiplier() * stormMultiplier;
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
  if (!selected.size) return 0;
  return combinationRate([...selected], stats);
}

function performance(stats) {
  const rate = selectedRate(stats);
  const cardsPerSecond = rollsPerSecond(stats);
  const rolls = rate > 0 ? 1 / rate : Infinity;
  const time = cardsPerSecond > 0 ? rolls / cardsPerSecond : Infinity;

  return {
    rolls,
    time,
    cardsPerSecond,
    rollsPerHour: cardsPerSecond * 3600,
  };
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
    if (!selected.has(name)) continue;
    els.selectedBorders.append(makeBorderChip(name));
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
    for (let i = 0; i < names.length; i += 1) {
      if (mask & (1 << i)) combo.push(names[i]);
    }

    const rate = combinationRate(combo, stats);
    if (rate > 0) combinations.push({ names: combo, rate });
  }

  combinations.sort((a, b) => {
    if (a.names.length !== b.names.length) return a.names.length - b.names.length;
    return b.rate - a.rate;
  });

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
  const value = readNumber(els.timeValue, 0, 0);
  return value * TIME_UNITS[els.timeUnit.value];
}

function renderTimeSpan(stats) {
  const rolls = Math.max(0, Math.floor(timeSpanSeconds() * rollsPerSecond(stats)));
  els.timeRolls.textContent = formatNumber(rolls, 0);
  els.borderChanceResults.replaceChildren();

  if (rolls <= 0) {
    const empty = document.createElement("div");
    empty.className = "chance-empty";
    empty.textContent = "No rolls in this span";
    els.borderChanceResults.append(empty);
    return;
  }

  const combinations = getAllCombinations(stats);
  if (!combinations.length) {
    const empty = document.createElement("div");
    empty.className = "chance-empty";
    empty.textContent = "No possible border hits";
    els.borderChanceResults.append(empty);
    return;
  }

  for (const combo of combinations) {
    const item = document.createElement("article");
    item.className = "chance-item";

    const chips = document.createElement("div");
    chips.className = "chance-chips";
    for (const name of combo.names) chips.append(makeBorderChip(name));

    const chance = document.createElement("strong");
    chance.className = "chance-value";
    chance.textContent = formatChance(chanceAtLeastOnce(combo.rate, rolls));

    item.append(chips, chance);
    els.borderChanceResults.append(item);
  }
}

function render() {
  const stats = getStats();
  const perf = performance(stats);

  updateTargetUI();
  els.averageRolls.textContent = selected.size ? formatNumber(perf.rolls, perf.rolls < 100 ? 2 : 0) : "—";
  els.averageTime.textContent = selected.size ? formatTime(perf.time) : "—";
  els.cardsPerSecond.textContent = trimFixed(perf.cardsPerSecond, perf.cardsPerSecond < 10 ? 2 : 1);
  els.rollsPerHour.textContent = formatNumber(perf.rollsPerHour, 0);
  renderTimeSpan(stats);
}

function reset() {
  selected.clear();
  selected.add("Platinum");
  els.rollSpeed.value = "100";
  els.speedStructure.value = "0";
  els.timeStorm.checked = false;
  els.timeValue.value = "1";
  els.timeUnit.value = "hour";

  for (const border of Object.values(BORDERS)) {
    $(border.luckId).value = "1";
  }

  render();
}

document.querySelectorAll(".border-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.border;
    if (selected.has(name)) selected.delete(name);
    else selected.add(name);
    render();
  });
});

for (const id of [
  "rollSpeed",
  "speedStructure",
  "timeStorm",
  "platinumLuck",
  "crystalLuck",
  "rubyLuck",
  "galaxyLuck",
  "timeValue",
  "timeUnit",
]) {
  const element = $(id);
  element.addEventListener("input", render);
  element.addEventListener("change", render);
}

els.resetBtn.addEventListener("click", reset);
render();
