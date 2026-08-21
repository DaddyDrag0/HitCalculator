const BASE_ROLL_SECONDS = 1.5;
const MIN_ROLL_SECONDS = 0.3;
const CARD_DATA_URLS = Array.from({ length: 7 }, (_, i) =>
  `https://raw.githubusercontent.com/DaddyDrag0/CardRngExpansionDepths/main/src/data/cards-${i + 1}.json`
);

const $ = (id) => document.getElementById(id);

const els = {
  cardSearch: $("cardSearch"),
  cardList: $("cardList"),
  targetCard: $("targetCard"),
  targetName: $("targetName"),
  targetRarity: $("targetRarity"),
  targetSource: $("targetSource"),
  sourceWarning: $("sourceWarning"),
  luck: $("luck"),
  rollSpeed: $("rollSpeed"),
  doubleRoll: $("doubleRoll"),
  rarity: $("rarity"),
  durationValue: $("durationValue"),
  durationUnit: $("durationUnit"),
  resetBtn: $("resetBtn"),
  effectiveOdds: $("effectiveOdds"),
  perCardPercent: $("perCardPercent"),
  rollInterval: $("rollInterval"),
  speedCapText: $("speedCapText"),
  cyclesHour: $("cyclesHour"),
  cardsHour: $("cardsHour"),
  cycleChance: $("cycleChance"),
  customLabel: $("customLabel"),
  customChance: $("customChance"),
  customDetail: $("customDetail"),
  chanceBar: $("chanceBar"),
  timeTable: $("timeTable"),
  milestones: $("milestones"),
  unluckyText: $("unluckyText"),
  noHitChance: $("noHitChance"),
  calcStatus: $("calcStatus"),
  dataStatus: $("dataStatus"),
};

let cards = [];
let selectedCard = null;

const TIME_PRESETS = [
  ["10 min", 10 * 60],
  ["30 min", 30 * 60],
  ["1 hour", 60 * 60],
  ["4 hours", 4 * 60 * 60],
  ["8 hours", 8 * 60 * 60],
  ["12 hours", 12 * 60 * 60],
  ["24 hours", 24 * 60 * 60],
  ["3 days", 3 * 24 * 60 * 60],
  ["7 days", 7 * 24 * 60 * 60],
];

function numberValue(input, fallback, min = -Infinity, max = Infinity) {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value, maxDecimals = 2) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e15) {
    return value.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 3 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

function formatPercent(probability) {
  if (!Number.isFinite(probability)) return "—";
  if (probability <= 0) return "0%";
  if (probability >= 1) return "100%";
  const pct = probability * 100;
  if (pct >= 99.999999) return ">99.999999%";
  if (pct >= 10) return `${pct.toFixed(2)}%`;
  if (pct >= 1) return `${pct.toFixed(3)}%`;
  if (pct >= 0.01) return `${pct.toFixed(4)}%`;
  if (pct >= 0.000001) return `${pct.toFixed(6)}%`;
  return `${pct.toExponential(3)}%`;
}

function formatOdds(probability) {
  if (!Number.isFinite(probability) || probability <= 0) return "Impossible";
  if (probability >= 1) return "1 in 1";
  const denominator = 1 / probability;
  return `1 in ${formatNumber(denominator, denominator < 100 ? 2 : 0)}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "Effectively never";
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
  const days = hours / 24;
  if (days < 60) return `${days.toFixed(days < 10 ? 1 : 0)} days`;
  const years = days / 365.25;
  return `${years.toLocaleString(undefined, { maximumFractionDigits: years < 10 ? 2 : 1 })} years`;
}

function durationToSeconds() {
  const value = numberValue(els.durationValue, 0, 0);
  const multipliers = { minutes: 60, hours: 3600, days: 86400 };
  return value * multipliers[els.durationUnit.value];
}

function durationLabel() {
  const value = numberValue(els.durationValue, 0, 0);
  const unit = els.durationUnit.value;
  const prettyUnit = value === 1 ? unit.replace(/s$/, "") : unit;
  return `${formatNumber(value)} ${prettyUnit}`;
}

function currentModel() {
  const rarity = numberValue(els.rarity, 1, 1);
  const luck = numberValue(els.luck, 1, 0.000001);
  const rollSpeed = numberValue(els.rollSpeed, 100, 0.01);
  const doubleRoll = numberValue(els.doubleRoll, 0, 0, 100) / 100;

  // Temporary Expansion model. This is intentionally isolated so the real roll
  // selector can replace it later without touching any time/probability code.
  const perCardChance = Math.min(1, luck / rarity);

  const uncappedInterval = BASE_ROLL_SECONDS / (rollSpeed / 100);
  const interval = Math.max(MIN_ROLL_SECONDS, uncappedInterval);
  const speedCapped = uncappedInterval <= MIN_ROLL_SECONDS;

  // One base card, plus one independent bonus card with Double Roll probability.
  const logFailPerCycle = perCardChance >= 1
    ? -Infinity
    : Math.log1p(-perCardChance) + Math.log1p(-(doubleRoll * perCardChance));
  const perCycleChance = logFailPerCycle === -Infinity ? 1 : -Math.expm1(logFailPerCycle);

  return {
    rarity,
    luck,
    rollSpeed,
    doubleRoll,
    perCardChance,
    uncappedInterval,
    interval,
    speedCapped,
    logFailPerCycle,
    perCycleChance,
  };
}

function probabilityForSeconds(seconds, model) {
  const cycles = Math.max(0, Math.floor(seconds / model.interval));
  if (cycles === 0 || model.perCycleChance <= 0) return { cycles, chance: 0, noHit: 1 };
  if (model.perCycleChance >= 1) return { cycles, chance: 1, noHit: 0 };
  const logNoHit = cycles * model.logFailPerCycle;
  const noHit = Math.exp(logNoHit);
  return { cycles, chance: -Math.expm1(logNoHit), noHit };
}

function cyclesForProbability(targetProbability, model) {
  if (model.perCycleChance <= 0) return Infinity;
  if (model.perCycleChance >= 1) return 1;
  return Math.max(1, Math.ceil(Math.log1p(-targetProbability) / model.logFailPerCycle));
}

function sourceLabels(card) {
  const labels = [];
  if (card.weather) labels.push(card.weather);
  if (card.pack) labels.push(card.pack);
  if (card.boss) labels.push("Boss");
  if (card.expires) labels.push("Limited/Event");
  return labels.length ? labels : ["Base"];
}

function selectCardByName(name) {
  const needle = name.trim().toLocaleLowerCase();
  selectedCard = cards.find((card) => card.name.toLocaleLowerCase() === needle) || null;

  if (!selectedCard) {
    els.targetCard.classList.add("hidden");
    els.sourceWarning.classList.add("hidden");
    return;
  }

  els.rarity.value = selectedCard.rarity;
  els.targetName.textContent = selectedCard.name;
  els.targetRarity.textContent = `1 / ${formatNumber(selectedCard.rarity, 0)}`;
  els.targetSource.textContent = sourceLabels(selectedCard).join(" · ");
  els.targetCard.classList.remove("hidden");

  const warnings = [];
  if (selectedCard.weather) warnings.push(`Requires ${selectedCard.weather}; this estimate assumes the target is currently eligible.`);
  if (selectedCard.pack) warnings.push(`${selectedCard.name} is tied to the ${selectedCard.pack} pack, so normal-roll odds may not apply.`);
  if (selectedCard.boss) warnings.push("This card is marked as a boss-source card, so its normal-roll estimate may not reflect its actual obtainment method.");
  if (selectedCard.expires) warnings.push("This card is marked Limited/Event; current availability may differ.");

  if (warnings.length) {
    els.sourceWarning.textContent = warnings.join(" ");
    els.sourceWarning.classList.remove("hidden");
  } else {
    els.sourceWarning.classList.add("hidden");
  }
}

function render() {
  const model = currentModel();
  const cyclesPerHour = Math.floor(3600 / model.interval);
  const expectedCardsPerHour = cyclesPerHour * (1 + model.doubleRoll);

  els.effectiveOdds.textContent = formatOdds(model.perCardChance);
  els.perCardPercent.textContent = `${formatPercent(model.perCardChance)} per generated card`;
  els.rollInterval.textContent = `${model.interval.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}s`;
  els.speedCapText.textContent = model.speedCapped
    ? `${formatNumber(model.rollSpeed)}% speed · 0.3s cap reached`
    : `${formatNumber(model.rollSpeed)}% speed`;
  els.cyclesHour.textContent = formatNumber(cyclesPerHour, 0);
  els.cardsHour.textContent = formatNumber(expectedCardsPerHour, 0);
  els.cycleChance.textContent = formatPercent(model.perCycleChance);
  els.calcStatus.textContent = model.speedCapped ? "Speed capped" : "Calculated";

  const customSeconds = durationToSeconds();
  const custom = probabilityForSeconds(customSeconds, model);
  els.customLabel.textContent = `Chance in ${durationLabel()}`;
  els.customChance.textContent = formatPercent(custom.chance);
  els.customDetail.textContent = `${formatNumber(custom.cycles, 0)} roll cycles · about ${formatNumber(custom.cycles * (1 + model.doubleRoll), 0)} generated cards expected`;
  els.chanceBar.style.width = `${Math.max(0, Math.min(100, custom.chance * 100))}%`;

  els.timeTable.replaceChildren();
  for (const [label, seconds] of TIME_PRESETS) {
    const result = probabilityForSeconds(seconds, model);
    const row = document.createElement("tr");
    const timeCell = document.createElement("td");
    const cyclesCell = document.createElement("td");
    const chanceCell = document.createElement("td");
    timeCell.textContent = label;
    cyclesCell.textContent = formatNumber(result.cycles, 0);
    chanceCell.textContent = formatPercent(result.chance);
    row.append(timeCell, cyclesCell, chanceCell);
    els.timeTable.append(row);
  }

  const averageCycles = model.perCycleChance > 0 ? 1 / model.perCycleChance : Infinity;
  const milestoneRows = [
    ["Average / expected", averageCycles * model.interval],
    ["50% chance", cyclesForProbability(0.5, model) * model.interval],
    ["75% chance", cyclesForProbability(0.75, model) * model.interval],
    ["90% chance", cyclesForProbability(0.9, model) * model.interval],
    ["95% chance", cyclesForProbability(0.95, model) * model.interval],
    ["99% chance", cyclesForProbability(0.99, model) * model.interval],
  ];
  els.milestones.replaceChildren();
  for (const [label, seconds] of milestoneRows) {
    const item = document.createElement("div");
    item.className = "milestone";
    const labelEl = document.createElement("span");
    const valueEl = document.createElement("strong");
    labelEl.textContent = label;
    valueEl.textContent = formatDuration(seconds);
    item.append(labelEl, valueEl);
    els.milestones.append(item);
  }

  els.noHitChance.textContent = formatPercent(custom.noHit);
  if (custom.cycles === 0) {
    els.unluckyText.textContent = "That duration is shorter than one roll cycle, so there is no completed roll yet.";
  } else if (custom.noHit <= 0) {
    els.unluckyText.textContent = "Under this model, going this long without the target is effectively a 0% outcome.";
  } else {
    els.unluckyText.textContent = `If you went ${durationLabel()} without the target, about ${formatPercent(custom.noHit)} of equivalent sessions would also still have no hit.`;
  }
}

function reset() {
  els.cardSearch.value = "";
  els.luck.value = "1";
  els.rollSpeed.value = "100";
  els.doubleRoll.value = "0";
  els.rarity.value = "1000000";
  els.durationValue.value = "8";
  els.durationUnit.value = "hours";
  selectedCard = null;
  els.targetCard.classList.add("hidden");
  els.sourceWarning.classList.add("hidden");
  render();
}

async function loadCards() {
  try {
    const responses = await Promise.all(CARD_DATA_URLS.map((url) => fetch(url, { cache: "no-cache" })));
    if (responses.some((response) => !response.ok)) throw new Error("Card data request failed");
    const chunks = await Promise.all(responses.map((response) => response.json()));
    cards = chunks.flat()
      .filter((card) => !card.unobtainable && Number(card.rarity) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const fragment = document.createDocumentFragment();
    for (const card of cards) {
      const option = document.createElement("option");
      option.value = card.name;
      option.label = `1 / ${formatNumber(card.rarity, 0)}${card.weather ? ` · ${card.weather}` : ""}`;
      fragment.append(option);
    }
    els.cardList.replaceChildren(fragment);
    els.dataStatus.textContent = `Loaded ${cards.length} obtainable Card RNG: Expansion card entries.`;
  } catch (error) {
    console.error(error);
    els.dataStatus.textContent = "Card list could not load. Manual rarity mode still works.";
  }
}

for (const input of [els.luck, els.rollSpeed, els.doubleRoll, els.rarity, els.durationValue, els.durationUnit]) {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

els.cardSearch.addEventListener("input", () => {
  selectCardByName(els.cardSearch.value);
  render();
});
els.cardSearch.addEventListener("change", () => {
  selectCardByName(els.cardSearch.value);
  render();
});
els.resetBtn.addEventListener("click", reset);

render();
loadCards();
