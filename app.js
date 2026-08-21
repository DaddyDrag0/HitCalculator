const BASE_ROLL_SECONDS = 1.5;
const MIN_ROLL_SECONDS = 0.3;
const CARD_DATA_URLS = Array.from({ length: 7 }, (_, i) =>
  `https://raw.githubusercontent.com/DaddyDrag0/CardRngExpansionDepths/main/src/data/cards-${i + 1}.json`
);

// These match the Expansion normal-card border rarity multipliers carried over
// from the extracted BorderUtil/Util data into CardRngExpansionDepths.
const BORDER_DEFINITIONS = [
  { name: "Platinum", checkboxId: "borderPlatinum", denominator: 100, rarityMultiplier: 100 },
  { name: "Crystal", checkboxId: "borderCrystal", denominator: 10_000, rarityMultiplier: 10_000 },
  { name: "Ruby", checkboxId: "borderRuby", denominator: 100_000, rarityMultiplier: 100_000 },
  { name: "Galaxy", checkboxId: "borderGalaxy", denominator: 1_000_000, rarityMultiplier: 1_000_000 },
];

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
  rarity: $("rarity"),
  borderGamepass: $("borderGamepass"),
  weatherRow: $("weatherRow"),
  weatherActive: $("weatherActive"),
  weatherTitle: $("weatherTitle"),
  weatherHelp: $("weatherHelp"),
  durationValue: $("durationValue"),
  durationUnit: $("durationUnit"),
  resetBtn: $("resetBtn"),
  combinedOdds: $("combinedOdds"),
  combinedPercent: $("combinedPercent"),
  cardOdds: $("cardOdds"),
  cardPercent: $("cardPercent"),
  borderOdds: $("borderOdds"),
  borderSummary: $("borderSummary"),
  rollInterval: $("rollInterval"),
  speedCapText: $("speedCapText"),
  rollsHour: $("rollsHour"),
  hitsHour: $("hitsHour"),
  eligibility: $("eligibility"),
  eligibilityDetail: $("eligibilityDetail"),
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

for (const border of BORDER_DEFINITIONS) {
  border.element = $(border.checkboxId);
}

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

const LARGE_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

function numberValue(input, fallback, min = -Infinity, max = Infinity) {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value, maxDecimals = 2) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 1000) {
    const tier = Math.min(Math.floor(Math.log10(abs) / 3), LARGE_SUFFIXES.length - 1);
    if (tier > 0 && tier < LARGE_SUFFIXES.length) {
      const scaled = value / Math.pow(1000, tier);
      const decimals = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
      return `${scaled.toLocaleString(undefined, { maximumFractionDigits: decimals })}${LARGE_SUFFIXES[tier]}`;
    }
  }
  if (abs < 0.001) return value.toExponential(3);
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

function formatFullNumber(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e21) return value.toExponential(4);
  return Math.round(value).toLocaleString();
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
  if (!Number.isFinite(probability)) return "Not eligible";
  if (probability <= 0) return "Impossible";
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
  if (days < 365.25) return `${days.toFixed(days < 10 ? 1 : 0)} days`;
  const years = days / 365.25;
  return `${formatNumber(years, years < 10 ? 2 : 1)} years`;
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

function selectedBorders() {
  return BORDER_DEFINITIONS.filter((border) => border.element.checked);
}

function sourceLabels(card) {
  const labels = [];
  if (card.weather) labels.push(card.weather);
  if (card.pack) labels.push(card.pack);
  if (card.boss) labels.push("Boss");
  if (card.expires) labels.push("Limited/Event");
  return labels.length ? labels : ["Base"];
}

function normalRollSourceStatus() {
  if (!selectedCard) {
    return { eligible: true, label: "Manual rarity", detail: "Manual normal-roll estimate" };
  }
  if (selectedCard.pack) {
    return {
      eligible: false,
      label: "Pack source",
      detail: `${selectedCard.pack} pack card — normal card rolling does not apply`,
    };
  }
  if (selectedCard.boss) {
    return {
      eligible: false,
      label: "Boss source",
      detail: "Boss-source card — normal card rolling does not apply",
    };
  }
  if (selectedCard.weather && !els.weatherActive.checked) {
    return {
      eligible: false,
      label: "Weather inactive",
      detail: `${selectedCard.weather} must be active for this target`,
    };
  }
  if (selectedCard.weather) {
    return {
      eligible: true,
      label: "Eligible",
      detail: `Conditional on ${selectedCard.weather} being active`,
    };
  }
  if (selectedCard.expires) {
    return {
      eligible: true,
      label: "Conditional",
      detail: "Limited/Event availability must still be active",
    };
  }
  return { eligible: true, label: "Eligible", detail: "Normal roll target" };
}

function currentModel() {
  const rarity = numberValue(els.rarity, 1, 1);
  const luck = numberValue(els.luck, 1, 0.000001);
  const rollSpeed = numberValue(els.rollSpeed, 100, 0.01);

  // Temporary normal-card selector until the live Expansion roll resolver is
  // recovered again. Kept isolated so this can be replaced without touching
  // the cumulative probability/time code below.
  const cardChance = Math.min(1, luck / rarity);

  // Temporary roll-speed interpretation agreed for this calculator.
  const uncappedInterval = BASE_ROLL_SECONDS / (rollSpeed / 100);
  const interval = Math.max(MIN_ROLL_SECONDS, uncappedInterval);
  const speedCapped = uncappedInterval <= MIN_ROLL_SECONDS;

  const borders = selectedBorders();
  const borderGamepassMultiplier = els.borderGamepass.checked ? 1.5 : 1;
  let borderChance = 1;
  for (const border of borders) {
    borderChance *= Math.min(1, borderGamepassMultiplier / border.denominator);
  }

  const source = normalRollSourceStatus();
  const combinedChance = source.eligible ? Math.min(1, cardChance * borderChance) : 0;
  const logFailPerRoll = combinedChance >= 1 ? -Infinity : Math.log1p(-combinedChance);

  return {
    rarity,
    luck,
    rollSpeed,
    cardChance,
    interval,
    uncappedInterval,
    speedCapped,
    borders,
    borderGamepassMultiplier,
    borderChance,
    combinedChance,
    logFailPerRoll,
    source,
  };
}

function probabilityForSeconds(seconds, model) {
  const rolls = Math.max(0, Math.floor(seconds / model.interval));
  if (rolls === 0 || model.combinedChance <= 0) return { rolls, chance: 0, noHit: 1 };
  if (model.combinedChance >= 1) return { rolls, chance: 1, noHit: 0 };
  const logNoHit = rolls * model.logFailPerRoll;
  const noHit = Math.exp(logNoHit);
  return { rolls, chance: -Math.expm1(logNoHit), noHit };
}

function rollsForProbability(targetProbability, model) {
  if (model.combinedChance <= 0) return Infinity;
  if (model.combinedChance >= 1) return 1;
  return Math.max(1, Math.ceil(Math.log1p(-targetProbability) / model.logFailPerRoll));
}

function selectCardByName(name) {
  const needle = name.trim().toLocaleLowerCase();
  selectedCard = cards.find((card) => card.name.toLocaleLowerCase() === needle) || null;

  if (!selectedCard) {
    els.targetCard.classList.add("hidden");
    els.sourceWarning.classList.add("hidden");
    els.weatherRow.classList.add("hidden");
    return;
  }

  els.rarity.value = selectedCard.rarity;
  els.targetName.textContent = selectedCard.name;
  els.targetRarity.textContent = `1 / ${formatFullNumber(selectedCard.rarity)}`;
  els.targetSource.textContent = sourceLabels(selectedCard).join(" · ");
  els.targetCard.classList.remove("hidden");

  if (selectedCard.weather && !selectedCard.pack) {
    els.weatherTitle.textContent = `${selectedCard.weather} is active`;
    els.weatherHelp.textContent = `${selectedCard.name} requires ${selectedCard.weather}; uncheck this to model the weather being inactive.`;
    els.weatherRow.classList.remove("hidden");
  } else {
    els.weatherRow.classList.add("hidden");
  }

  const warnings = [];
  if (selectedCard.pack) {
    warnings.push(`${selectedCard.name} is a ${selectedCard.pack} pack card. Normal rolling probability is disabled for this source.`);
  } else if (selectedCard.boss) {
    warnings.push(`${selectedCard.name} is a boss-source card. Normal rolling probability is disabled for this source.`);
  } else if (selectedCard.weather) {
    warnings.push(`This is a ${selectedCard.weather} card. The displayed odds are conditional on that weather being active; random weather uptime is not folded into long AFK sessions yet.`);
  }
  if (selectedCard.expires) {
    warnings.push("This card is marked Limited/Event, so current live availability still matters.");
  }

  if (warnings.length) {
    els.sourceWarning.textContent = warnings.join(" ");
    els.sourceWarning.classList.remove("hidden");
  } else {
    els.sourceWarning.classList.add("hidden");
  }
}

function render() {
  const model = currentModel();
  const rollsPerHour = 3600 / model.interval;
  const expectedHitsPerHour = rollsPerHour * model.combinedChance;

  els.combinedOdds.textContent = model.source.eligible ? formatOdds(model.combinedChance) : "Not a normal roll";
  els.combinedPercent.textContent = model.source.eligible
    ? `${formatPercent(model.combinedChance)} per roll`
    : model.source.detail;

  els.cardOdds.textContent = formatOdds(model.cardChance);
  els.cardPercent.textContent = `${formatPercent(model.cardChance)} after Luck`;
  els.borderOdds.textContent = formatOdds(model.borderChance);
  els.borderSummary.textContent = model.borders.length
    ? `${model.borders.map((border) => border.name).join(" + ")}${els.borderGamepass.checked ? " · 50% GP" : ""}`
    : "No border required";

  els.rollInterval.textContent = `${model.interval.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}s`;
  els.speedCapText.textContent = model.speedCapped
    ? `${formatNumber(model.rollSpeed)}% · temporary 0.3s cap reached`
    : `${formatNumber(model.rollSpeed)}% Roll Speed`;
  els.rollsHour.textContent = formatNumber(rollsPerHour, 0);
  els.hitsHour.textContent = formatNumber(expectedHitsPerHour, 4);
  els.eligibility.textContent = model.source.label;
  els.eligibilityDetail.textContent = model.source.detail;

  if (!model.source.eligible) {
    els.calcStatus.textContent = "Source blocked";
  } else if (model.speedCapped) {
    els.calcStatus.textContent = "Speed capped";
  } else {
    els.calcStatus.textContent = "Calculated";
  }

  const customSeconds = durationToSeconds();
  const custom = probabilityForSeconds(customSeconds, model);
  els.customLabel.textContent = `Chance in ${durationLabel()}`;
  els.customChance.textContent = model.source.eligible ? formatPercent(custom.chance) : "N/A";
  els.customDetail.textContent = model.source.eligible
    ? `${formatFullNumber(custom.rolls)} rolls at ${formatNumber(model.rollSpeed)}% Roll Speed`
    : model.source.detail;
  els.chanceBar.style.width = `${Math.max(0, Math.min(100, custom.chance * 100))}%`;

  els.timeTable.replaceChildren();
  for (const [label, seconds] of TIME_PRESETS) {
    const result = probabilityForSeconds(seconds, model);
    const row = document.createElement("tr");
    const timeCell = document.createElement("td");
    const rollsCell = document.createElement("td");
    const chanceCell = document.createElement("td");
    timeCell.textContent = label;
    rollsCell.textContent = formatFullNumber(result.rolls);
    chanceCell.textContent = model.source.eligible ? formatPercent(result.chance) : "N/A";
    row.append(timeCell, rollsCell, chanceCell);
    els.timeTable.append(row);
  }

  const averageRolls = model.combinedChance > 0 ? 1 / model.combinedChance : Infinity;
  const milestoneRows = [
    ["Average / expected", averageRolls * model.interval],
    ["50% chance", rollsForProbability(0.5, model) * model.interval],
    ["75% chance", rollsForProbability(0.75, model) * model.interval],
    ["90% chance", rollsForProbability(0.9, model) * model.interval],
    ["95% chance", rollsForProbability(0.95, model) * model.interval],
    ["99% chance", rollsForProbability(0.99, model) * model.interval],
  ];
  els.milestones.replaceChildren();
  for (const [label, seconds] of milestoneRows) {
    const item = document.createElement("div");
    item.className = "milestone";
    const labelEl = document.createElement("span");
    const valueEl = document.createElement("strong");
    labelEl.textContent = label;
    valueEl.textContent = model.source.eligible ? formatDuration(seconds) : "N/A";
    item.append(labelEl, valueEl);
    els.milestones.append(item);
  }

  els.noHitChance.textContent = model.source.eligible ? formatPercent(custom.noHit) : "N/A";
  if (!model.source.eligible) {
    els.unluckyText.textContent = model.source.detail;
  } else if (custom.rolls === 0) {
    els.unluckyText.textContent = "That duration is shorter than one roll under the current speed model.";
  } else if (custom.noHit <= 0) {
    els.unluckyText.textContent = "Under this model, going this long without the target is effectively a 0% outcome.";
  } else {
    els.unluckyText.textContent = `If you went ${durationLabel()} without this exact target, about ${formatPercent(custom.noHit)} of equivalent sessions would also still have no hit.`;
  }
}

function reset() {
  els.cardSearch.value = "";
  els.luck.value = "1";
  els.rollSpeed.value = "100";
  els.rarity.value = "1000000";
  els.durationValue.value = "8";
  els.durationUnit.value = "hours";
  els.borderGamepass.checked = false;
  els.weatherActive.checked = true;
  for (const border of BORDER_DEFINITIONS) border.element.checked = false;
  selectedCard = null;
  els.targetCard.classList.add("hidden");
  els.sourceWarning.classList.add("hidden");
  els.weatherRow.classList.add("hidden");
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
      const source = sourceLabels(card).join(" · ");
      option.value = card.name;
      option.label = `1 / ${formatFullNumber(card.rarity)} · ${source}`;
      fragment.append(option);
    }
    els.cardList.replaceChildren(fragment);
    els.dataStatus.textContent = `Loaded ${cards.length} obtainable Card RNG: Expansion card entries.`;
  } catch (error) {
    console.error(error);
    els.dataStatus.textContent = "Card list could not load. Manual rarity mode still works.";
  }
}

const reactiveInputs = [
  els.luck,
  els.rollSpeed,
  els.rarity,
  els.borderGamepass,
  els.weatherActive,
  els.durationValue,
  els.durationUnit,
  ...BORDER_DEFINITIONS.map((border) => border.element),
];

for (const input of reactiveInputs) {
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