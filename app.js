const BASE_ROLL_SECONDS = 1.5;
const MIN_ROLL_SECONDS = 0.3;

const BORDERS = {
  Platinum: { denominator: 100, luckId: "platinumLuck" },
  Crystal: { denominator: 10_000, luckId: "crystalLuck" },
  Ruby: { denominator: 100_000, luckId: "rubyLuck" },
  Galaxy: { denominator: 1_000_000, luckId: "galaxyLuck" },
};

const $ = (id) => document.getElementById(id);

const els = {
  resetBtn: $("resetBtn"),
  rollSpeed: $("rollSpeed"),
  borderGamepass: $("borderGamepass"),
  resultCard: $("resultCard"),
  effectiveOdds: $("effectiveOdds"),
  selectedBorder: $("selectedBorder"),
  averageRolls: $("averageRolls"),
  averageTime: $("averageTime"),
  chancePerRoll: $("chancePerRoll"),
  rollInterval: $("rollInterval"),
  rollsPerHour: $("rollsPerHour"),
  speedNote: $("speedNote"),
  rolls50: $("rolls50"),
  time50: $("time50"),
  rolls75: $("rolls75"),
  time75: $("time75"),
  rolls90: $("rolls90"),
  time90: $("time90"),
  rolls95: $("rolls95"),
  time95: $("time95"),
  rolls99: $("rolls99"),
  time99: $("time99"),
};

let selectedBorder = "Platinum";

function readNumber(input, fallback, min = -Infinity) {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function borderLuck(name) {
  return readNumber($(BORDERS[name].luckId), 0, 0);
}

function borderChance(name) {
  const border = BORDERS[name];
  const luck = borderLuck(name);
  const gamepass = els.borderGamepass.checked ? 1.5 : 1;
  return Math.min(1, (luck * gamepass) / border.denominator);
}

function rollInterval() {
  const speed = readNumber(els.rollSpeed, 100, 0.01);
  return Math.max(MIN_ROLL_SECONDS, BASE_ROLL_SECONDS / (speed / 100));
}

function rollsForChance(probability, hitChance) {
  if (hitChance <= 0) return Infinity;
  if (hitChance >= 1) return 1;
  return Math.ceil(Math.log1p(-probability) / Math.log1p(-hitChance));
}

function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e15) return value.toExponential(3);
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function formatOdds(probability) {
  if (probability <= 0) return "Impossible";
  if (probability >= 1) return "1 in 1";
  const odds = 1 / probability;
  return `1 in ${formatNumber(odds, odds < 100 ? 2 : 0)}`;
}

function formatPercent(probability) {
  if (probability <= 0) return "0%";
  if (probability >= 1) return "100%";
  const value = probability * 100;
  if (value >= 1) return `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
  if (value >= 0.001) return `${value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%`;
  return `${value.toExponential(2)}%`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;

  const totalSeconds = Math.round(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!days && !hours && secs) parts.push(`${secs}s`);
  return parts.slice(0, 3).join(" ") || "0s";
}

function updateSelectedUI() {
  document.querySelectorAll(".border-tab").forEach((button) => {
    const active = button.dataset.border === selectedBorder;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });

  document.querySelectorAll(".luck-field").forEach((field) => {
    field.classList.toggle("active", field.dataset.luckBorder === selectedBorder);
  });

  els.resultCard.dataset.accent = selectedBorder;
  els.selectedBorder.textContent = selectedBorder;
}

function render() {
  const hitChance = borderChance(selectedBorder);
  const interval = rollInterval();
  const speed = readNumber(els.rollSpeed, 100, 0.01);
  const expectedRolls = hitChance > 0 ? 1 / hitChance : Infinity;
  const expectedTime = expectedRolls * interval;
  const perHour = 3600 / interval;
  const uncappedInterval = BASE_ROLL_SECONDS / (speed / 100);

  updateSelectedUI();

  els.effectiveOdds.textContent = formatOdds(hitChance);
  els.averageRolls.textContent = formatNumber(expectedRolls, expectedRolls < 100 ? 2 : 0);
  els.averageTime.textContent = formatTime(expectedTime);
  els.chancePerRoll.textContent = formatPercent(hitChance);
  els.rollInterval.textContent = `${interval.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}s`;
  els.rollsPerHour.textContent = formatNumber(perHour, 0);

  if (uncappedInterval <= MIN_ROLL_SECONDS) {
    els.speedNote.textContent = "0.3s roll-speed cap reached under the current model.";
    els.speedNote.classList.add("visible");
  } else {
    els.speedNote.textContent = "";
    els.speedNote.classList.remove("visible");
  }

  const milestones = [
    [0.50, els.rolls50, els.time50],
    [0.75, els.rolls75, els.time75],
    [0.90, els.rolls90, els.time90],
    [0.95, els.rolls95, els.time95],
    [0.99, els.rolls99, els.time99],
  ];

  for (const [probability, rollsEl, timeEl] of milestones) {
    const rolls = rollsForChance(probability, hitChance);
    rollsEl.textContent = formatNumber(rolls, 0);
    timeEl.textContent = formatTime(rolls * interval);
  }
}

function reset() {
  selectedBorder = "Platinum";
  els.rollSpeed.value = "100";
  els.borderGamepass.checked = false;
  for (const border of Object.values(BORDERS)) {
    $(border.luckId).value = "1";
  }
  render();
}

document.querySelectorAll(".border-tab").forEach((button) => {
  button.addEventListener("click", () => {
    selectedBorder = button.dataset.border;
    render();
  });
});

for (const border of Object.values(BORDERS)) {
  const input = $(border.luckId);
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

els.rollSpeed.addEventListener("input", render);
els.rollSpeed.addEventListener("change", render);
els.borderGamepass.addEventListener("change", render);
els.resetBtn.addEventListener("click", reset);

render();