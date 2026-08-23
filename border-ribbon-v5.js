(() => {
  const BORDERS = [
    ['Platinum', 'uvOutPlatinum', 'uvChaskaPlatinum', 0.05],
    ['Crystal', 'uvOutCrystal', 'uvChaskaCrystal', 0.10],
    ['Ruby', 'uvOutRuby', null, 0],
    ['Galaxy', 'uvOutGalaxy', 'uvChaskaGalaxy', 0.25],
  ];

  function chaskaBonus(points, rate) {
    let remaining = Math.max(0, Math.floor(Number(points) || 0));
    let block = 0;
    let total = 0;
    while (remaining > 0) {
      const amount = Math.min(50, remaining);
      total += amount * rate * Math.pow(0.85, block);
      remaining -= amount;
      block += 1;
    }
    return total;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return '—';
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function syncRibbon() {
    const boost = document.getElementById('uvBorderBoost');
    if (!boost?.checked) return;

    for (const [, outputId, chaskaId, rate] of BORDERS) {
      const output = document.getElementById(outputId);
      if (!output) continue;

      const shown = Number.parseFloat(output.textContent.replace(/[^0-9.+-]/g, ''));
      if (!Number.isFinite(shown)) continue;

      const chaskaPoints = chaskaId ? Number(document.getElementById(chaskaId)?.value) || 0 : 0;
      const chaska = chaskaBonus(chaskaPoints, rate);
      const effective = (shown - chaska) * 1.5 + chaska;
      output.textContent = `${formatNumber(effective)}×`;
    }
  }

  function scheduleSync() {
    queueMicrotask(syncRibbon);
  }

  function init() {
    const root = document.getElementById('upgradeCalcV2');
    if (!root) return;

    root.addEventListener('input', scheduleSync);
    root.addEventListener('change', scheduleSync);
    root.addEventListener('click', scheduleSync);
    scheduleSync();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
