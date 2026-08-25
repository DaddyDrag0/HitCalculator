(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!DATA?.cards) return;

  function patch() {
    const root = document.getElementById('rollSimulatorV15');
    if (!root) return;
    root.querySelectorAll('[data-rs-pack]').forEach((input) => {
      const pack = input.dataset.rsPack;
      const option = input.closest('[data-rs-pack-option]');
      const small = option?.querySelector('small');
      if (!small || !pack) return;
      const cards = DATA.cards.filter((card) => card.pack === pack);
      const weather = cards.filter((card) => !!card.weather).length;
      const text = `${cards.length} cards${weather ? ` · ${weather} weather-only` : ''}`;
      if (small.textContent !== text) small.textContent = text;
      option.title = weather ? `${weather} cards from this pack still require their matching weather. Rapture cards can use the Rapture 24/7 unlock.` : '';
    });
    root.querySelectorAll('.rs-pack-status').forEach((status) => {
      const next = status.textContent.replace('pack cards enabled', 'pack cards unlocked');
      if (next !== status.textContent) status.textContent = next;
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; patch(); });
  }

  function start() {
    const root = document.getElementById('rollSimulatorV15');
    if (!root) return false;
    patch();
    const scenarios = document.getElementById('rsScenarios');
    if (scenarios) new MutationObserver(schedule).observe(scenarios, { childList:true, subtree:true });
    return true;
  }

  if (!start()) {
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (start() || attempts >= 100) clearInterval(timer); }, 50);
  }
})();
