const BASE_COOLDOWN_SECONDS = 1;

const BORDERS = {
  Platinum: { denominator: 100, luckId: "platinumLuck", gainId: "gainPlatinum" },
  Crystal: { denominator: 10_000, luckId: "crystalLuck", gainId: "gainCrystal" },
  Ruby: { denominator: 100_000, luckId: "rubyLuck", gainId: "gainRuby" },
  Galaxy: { denominator: 1_000_000, luckId: "galaxyLuck", gainId: "gainGalaxy" },
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
  rollInterval: $("rollInterval"),
  rollsPerHour: $("rollsPerHour"),
  speedBreakdown: $("speedBreakdown"),
  gainRollSpeed: $("gainRollSpeed"),
  upgradeResults: $("upgradeResults"),
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

function getStats(overrides = {}) {
  const stats = {
    rollSpeed: readNumber(els.rollSpeed, 100, 0.01),
    Platinum: readNumber($(BORDERS.Platinum.luckId), 0, 0),
    Crystal: readNumber($(BORDERS.Crystal.luckId), 0, 0),
    Ruby: readNumber($(BORDERS.Ruby.luckId), 0, 0),
    Galaxy: readNumber($(BORDERS.Galaxy.luckId), 0, 0),
  };
  return Object.assign(stats, overrides);
}

function speedStructureBoostPercent() {
  const level = Math.max(0, Math.min(7, Number(els.speedStructure.value) || 0));
  return 50 * level / 7;
}

function rollInterval(stats) {
  // Expansion RNG.GetCooldown:
  // cooldownFactor / (RollSpeed / 100)
  // Speed Structure divides cooldown by (1 + structure boost / 100).
  // Time Storm divides the cooldown by 2 again.
  let cooldownFactor = BASE_COOLDOWN_SECONDS;
  const structureBoost = speedStructureBoostPercent();
  if (structureBoost > 0) cooldownFactor /= 1 + structureBoost / 100;
  if (els.timeStorm.checked) cooldownFactor /= 2;
  return cooldownFactor / (stats.rollSpeed / 100);
}

function borderRate(name, stats) {
  return Math.min(1, stats[name] / BORDERS[name].denominator);
}

function stackedRate(stats) {
  if (!selected.size) return 0;
  let rate = 1;
  for (const name of selected) rate *= borderRate(name, stats);
  return rate;
}

function performance(stats) {
  const rate = stackedRate(stats);
  const interval = rollInterval(stats);
  const rolls = rate > 0 ? 1 / rate : Infinity;
  const time = rolls * interval;
  return { rate, interval, rolls, time, rollsPerHour: 3600 / interval };
}

function updateTargetUI() {
  document.querySelectorAll(".border-tab").forEach((button) => {
    const active = selected.has(button.dataset.border);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stat-border]").forEach((field) => {
    field.classList.toggle("active", selected.has(field.dataset.statBorder));
  });

  document.querySelectorAll("[data-upgrade-border]").forEach((field) => {
    field.classList.toggle("active", selected.has(field.dataset.upgradeBorder));
  });

  els.selectedBorders.replaceChildren();
  if (!selected.size) {
    const empty = document.createElement("span");
    empty.className = "empty-target";
    empty.textContent = "Select at least one border";
    els.selectedBorders.append(empty);
    return;
  }

  for (const name of Object.keys(BORDERS)) {
    if (!selected.has(name)) continue;
    const chip = document.createElement("span");
    chip.className = `target-chip ${name.toLowerCase()}`;
    chip.textContent = name;
    els.selectedBorders.append(chip);
  }
}

function buildSpeedBreakdown(stats, perf) {
  const pieces = [`${formatNumber(stats.rollSpeed, 2)}% Roll Speed`];
  const level = Number(els.speedStructure.value) || 0;
  if (level > 0) pieces.push(`Speed Structure L${level}`);
  if (els.timeStorm.checked) pieces.push("Time Storm");
  els.speedBreakdown.textContent = `${pieces.join(" · ")} → ${trimFixed(perf.interval, 4)}s per roll`;
}

function candidateUpgradeResults(baseStats, basePerf) {
  const candidates = [];
  const speedGain = readNumber(els.gainRollSpeed, 0, 0);
  if (speedGain > 0) {
    const stats = getStats({ rollSpeed: baseStats.rollSpeed + speedGain });
    const perf = performance(stats);
    candidates.push({
      key: "RollSpeed",
      label: "Roll Speed",
      gain: `+${formatNumber(speedGain, 2)}%`,
      perf,
      affectsRolls: false,
    });
  }

  for (const name of Object.keys(BORDERS)) {
    if (!selected.has(name)) continue;
    const gain = readNumber($(BORDERS[name].gainId), 0, 0);
    if (gain <= 0) continue;
    const stats = getStats({ [name]: baseStats[name] + gain });
    const perf = performance(stats);
    candidates.push({
      key: name,
      label: `${name} Luck`,
      gain: `+${formatNumber(gain, 2)}×`,
      perf,
      affectsRolls: true,
    });
  }

  candidates.sort((a, b) => a.perf.time - b.perf.time);
  return candidates.map((candidate) => {
    const savedTime = Number.isFinite(basePerf.time) && Number.isFinite(candidate.perf.time)
      ? Math.max(0, basePerf.time - candidate.perf.time)
      : Infinity;
    const savedRolls = Number.isFinite(basePerf.rolls) && Number.isFinite(candidate.perf.rolls)
      ? Math.max(0, basePerf.rolls - candidate.perf.rolls)
      : Infinity;
    return { ...candidate, savedTime, savedRolls };
  });
}

function renderOptimizer(baseStats, basePerf) {
  els.upgradeResults.replaceChildren();

  if (!selected.size) {
    const empty = document.createElement("div");
    empty.className = "optimizer-empty";
    empty.textContent = "Select a border goal first.";
    els.upgradeResults.append(empty);
    return;
  }

  const candidates = candidateUpgradeResults(baseStats, basePerf);
  if (!candidates.length) {
    const empty = document.createElement("div");
    empty.className = "optimizer-empty";
    empty.textContent = "Enter at least one test increase above.";
    els.upgradeResults.append(empty);
    return;
  }

  candidates.forEach((candidate, index) => {
    const row = document.createElement("article");
    row.className = `upgrade-result ${candidate.key.toLowerCase()}`;

    const rank = document.createElement("div");
    rank.className = "upgrade-rank";
    rank.textContent = index === 0 ? "BEST" : `#${index + 1}`;

    const name = document.createElement("div");
    name.className = "upgrade-name";
    const strong = document.createElement("strong");
    strong.textContent = candidate.label;
    const gain = document.createElement("span");
    gain.textContent = candidate.gain;
    name.append(strong, gain);

    const newTime = document.createElement("div");
    newTime.className = "upgrade-metric";
    newTime.innerHTML = `<span>New avg time</span><strong>${formatTime(candidate.perf.time)}</strong>`;

    const saved = document.createElement("div");
    saved.className = "upgrade-metric";
    if (candidate.savedTime === Infinity) {
      saved.innerHTML = `<span>Improvement</span><strong>Makes target possible</strong>`;
    } else if (candidate.affectsRolls) {
      saved.innerHTML = `<span>Rolls saved</span><strong>${formatNumber(candidate.savedRolls, 0)}</strong>`;
    } else {
      saved.innerHTML = `<span>Time saved</span><strong>${formatTime(candidate.savedTime)}</strong>`;
    }

    row.append(rank, name, newTime, saved);
    els.upgradeResults.append(row);
  });
}

function render() {
  const stats = getStats();
  const perf = performance(stats);
  updateTargetUI();

  els.averageRolls.textContent = selected.size ? formatNumber(perf.rolls, perf.rolls < 100 ? 2 : 0) : "—";
  els.averageTime.textContent = selected.size ? formatTime(perf.time) : "—";
  els.rollInterval.textContent = `${trimFixed(perf.interval, 4)}s`;
  els.rollsPerHour.textContent = formatNumber(perf.rollsPerHour, 0);
  buildSpeedBreakdown(stats, perf);
  renderOptimizer(stats, perf);
}

function reset() {
  selected.clear();
  selected.add("Platinum");
  els.rollSpeed.value = "100";
  els.speedStructure.value = "0";
  els.timeStorm.checked = false;
  els.gainRollSpeed.value = "10";

  for (const [name, border] of Object.entries(BORDERS)) {
    $(border.luckId).value = "1";
    $(border.gainId).value = "1";
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

const reactiveIds = [
  "rollSpeed", "speedStructure", "timeStorm",
  "platinumLuck", "crystalLuck", "rubyLuck", "galaxyLuck",
  "gainRollSpeed", "gainPlatinum", "gainCrystal", "gainRuby", "gainGalaxy",
];

for (const id of reactiveIds) {
  const element = $(id);
  element.addEventListener("input", render);
  element.addEventListener("change", render);
}

els.resetBtn.addEventListener("click", reset);
render();