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
  selectedBorders: $("selectedBorders"),
  averageRolls: $("averageRolls"),
  averageTime: $("averageTime"),
  rollInterval: $("rollInterval"),
  rollsPerHour: $("rollsPerHour"),
  speedNote: $("speedNote"),
};

const selected = new Set(["Platinum"]);

function readNumber(input, fallback, min = -Infinity) {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function borderLuck(name) {
  return readNumber($(BORDERS[name].luckId), 0, 0);
}

function borderHitRate(name) {
  const border = BORDERS[name];
  return Math.min(1, borderLuck(name) / border.denominator);
}

function stackedHitRate() {
  if (!selected.size) return 0;
  let rate = 1;
  for (const name of selected) rate *= borderHitRate(name);
  return rate;
}

function getRollInterval() {
  const speed = readNumber(els.rollSpeed, 100, 0.01);
  return Math.max(MIN_ROLL_SECONDS, BASE_ROLL_SECONDS / (speed / 100));
}

function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e18) return value.toExponential(3);
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;

  const total = Math.round(seconds);
  const years = Math.floor(total / 31_557_600);
  const days = Math.floor((total % 31_557_600) / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const secs = total % 60;

  const parts = [];
  if (years) parts.push(`${years}y`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!years && !days && !hours && secs) parts.push(`${secs}s`);
  return parts.slice(0, 3).join(" ") || "0s";
}

function updateTargetUI() {
  document.querySelectorAll(".border-tab").forEach((button) => {
    const active = selected.has(button.dataset.border);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll(".luck-field").forEach((field) => {
    field.classList.toggle("active", selected.has(field.dataset.luckBorder));
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

function render() {
  const hitRate = stackedHitRate();
  const interval = getRollInterval();
  const speed = readNumber(els.rollSpeed, 100, 0.01);
  const expectedRolls = hitRate > 0 ? 1 / hitRate : Infinity;
  const expectedTime = expectedRolls * interval;
  const perHour = 3600 / interval;
  const uncappedInterval = BASE_ROLL_SECONDS / (speed / 100);

  updateTargetUI();

  els.averageRolls.textContent = selected.size
    ? formatNumber(expectedRolls, expectedRolls < 100 ? 2 : 0)
    : "—";
  els.averageTime.textContent = selected.size ? formatTime(expectedTime) : "—";
  els.rollInterval.textContent = `${interval.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}s`;
  els.rollsPerHour.textContent = formatNumber(perHour, 0);

  if (uncappedInterval <= MIN_ROLL_SECONDS) {
    els.speedNote.textContent = "Roll-speed cap reached under the current model.";
    els.speedNote.classList.add("visible");
  } else {
    els.speedNote.textContent = "";
    els.speedNote.classList.remove("visible");
  }
}

function reset() {
  selected.clear();
  selected.add("Platinum");
  els.rollSpeed.value = "100";
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

for (const border of Object.values(BORDERS)) {
  const input = $(border.luckId);
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

els.rollSpeed.addEventListener("input", render);
els.rollSpeed.addEventListener("change", render);
els.resetBtn.addEventListener("click", reset);

render();