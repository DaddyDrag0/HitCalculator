(() => {
  const BORDER_LUCK_IDS = {
    Platinum: "platinumLuck",
    Crystal: "crystalLuck",
    Ruby: "rubyLuck",
    Galaxy: "galaxyLuck",
  };

  const style = document.createElement("style");
  style.textContent = `
    .border-option.with-luck {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 116px;
      align-items: center;
      gap: 10px;
      cursor: default;
    }
    .border-option.with-luck > input[type="checkbox"] { cursor: pointer; }
    .border-option.with-luck > span { min-width: 0; cursor: pointer; }
    .border-luck-entry {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 5px;
    }
    .border-luck-entry input {
      width: 100%;
      min-width: 0;
      min-height: 38px;
      padding: 0 9px;
      text-align: right;
    }
    .border-luck-entry .luck-suffix {
      color: var(--muted);
      font-size: .8rem;
      font-weight: 800;
    }
    .border-luck-title {
      grid-column: 1 / -1;
      margin-bottom: -2px;
      color: var(--muted);
      font-size: .66rem;
      font-weight: 700;
      text-align: right;
    }
    @media (max-width: 560px) {
      .border-option.with-luck { grid-template-columns: minmax(0, 1fr) 108px; }
    }
  `;
  document.head.append(style);

  const borderPickerHelp = document.querySelector(".border-picker > .field-help");
  if (borderPickerHelp) {
    borderPickerHelp.textContent = "Normal card borders can stack. Select every border the hit must contain, then enter your Luck for each border. Extra unselected borders do not disqualify the hit.";
  }

  const gamepassHelp = document.querySelector("#borderGamepass + span small");
  if (gamepassHelp) {
    gamepassHelp.textContent = "Adds 1.5× to each required border chance. Leave this off if your entered border luck already includes the gamepass.";
  }

  function safeLuck(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function applyLuck(border) {
    const luck = safeLuck(border.luckElement);
    border.denominator = luck > 0 ? border.baseDenominator / luck : Infinity;
  }

  function refreshBorderSummary() {
    if (!els.borderSummary) return;
    const selected = BORDER_DEFINITIONS.filter((border) => border.element.checked);
    if (!selected.length) {
      els.borderSummary.textContent = "No border required";
      return;
    }

    const parts = selected.map((border) => `${border.name} ${formatNumber(safeLuck(border.luckElement))}× Luck`);
    if (els.borderGamepass.checked) parts.push("50% GP");
    els.borderSummary.textContent = parts.join(" · ");
  }

  for (const border of BORDER_DEFINITIONS) {
    border.baseDenominator = border.denominator;

    const option = border.element.closest(".border-option");
    if (!option) continue;
    option.classList.add("with-luck");

    const entry = document.createElement("div");
    entry.className = "border-luck-entry";

    const title = document.createElement("span");
    title.className = "border-luck-title";
    title.textContent = `${border.name} Luck`;

    const input = document.createElement("input");
    input.id = BORDER_LUCK_IDS[border.name];
    input.type = "number";
    input.inputMode = "decimal";
    input.min = "0";
    input.step = "any";
    input.value = "1";
    input.setAttribute("aria-label", `${border.name} Luck multiplier`);

    const suffix = document.createElement("span");
    suffix.className = "luck-suffix";
    suffix.textContent = "×";

    entry.append(title, input, suffix);
    option.append(entry);
    border.luckElement = input;

    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("input", () => {
      applyLuck(border);
      render();
    });
    input.addEventListener("change", () => {
      applyLuck(border);
      render();
    });

    border.element.addEventListener("change", refreshBorderSummary);
    applyLuck(border);
  }

  els.borderGamepass.addEventListener("change", refreshBorderSummary);

  const originalRender = render;
  render = function borderLuckRender() {
    for (const border of BORDER_DEFINITIONS) {
      if (border.luckElement) applyLuck(border);
    }
    originalRender();
    refreshBorderSummary();
  };

  els.resetBtn.addEventListener("click", () => {
    for (const border of BORDER_DEFINITIONS) {
      if (!border.luckElement) continue;
      border.luckElement.value = "1";
      border.denominator = border.baseDenominator;
    }
    render();
  });

  render();
})();