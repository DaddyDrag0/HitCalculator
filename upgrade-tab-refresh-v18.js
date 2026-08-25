(() => {
  const $ = (id) => document.getElementById(id);

  function refreshUpgradeStats() {
    const root = $('upgradeCalcV2');
    if (!root) return;
    root.dispatchEvent(new Event('input', { bubbles: true }));
    requestAnimationFrame(() => {
      root.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function scheduleRefresh() {
    requestAnimationFrame(() => {
      requestAnimationFrame(refreshUpgradeStats);
    });
  }

  function init() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.uv-mode[data-view="upgrades"]');
      if (!button) return;
      scheduleRefresh();
    }, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
