(() => {
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

  function format(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
  }

  function updateDisplayedBorderStats() {
    const root = document.getElementById("upgradeCalc");
    const boost = document.getElementById("ubBorderBoost");
    if (!root || !boost?.checked) return;

    const configs = [
      ["ubOutPlatinum", "ubChaskaPlatinum", 0.05],
      ["ubOutCrystal", "ubChaskaCrystal", 0.10],
      ["ubOutRuby", null, 0],
      ["ubOutGalaxy", "ubChaskaGalaxy", 0.25],
    ];

    for (const [outputId, chaskaId, rate] of configs) {
      const output = document.getElementById(outputId);
      if (!output) continue;
      const boosted = Number.parseFloat(output.textContent.replace(/,/g, ""));
      if (!Number.isFinite(boosted)) continue;
      const chaska = chaskaId ? chaskaBonus(document.getElementById(chaskaId)?.value, rate) : 0;
      const unboosted = ((boosted - chaska) / 1.5) + chaska;
      output.textContent = format(unboosted);
    }
  }

  function init() {
    const root = document.getElementById("upgradeCalc");
    if (!root) return;
    const refresh = () => queueMicrotask(updateDisplayedBorderStats);
    root.addEventListener("input", refresh);
    root.addEventListener("change", refresh);
    root.addEventListener("click", refresh);
    updateDisplayedBorderStats();
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();
