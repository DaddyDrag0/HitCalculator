(() => {
  const $ = (id) => document.getElementById(id);

  function removeStats() {
    const switcher = document.querySelector('.uv-mode-switch');
    const upgrade = $('upgradeCalcV2');
    if (!switcher || !upgrade) return false;

    switcher.querySelector('[data-view="stats"]')?.remove();
    $('directCalcView')?.remove();

    const rollSim = $('rollSimulatorV15');
    const rollSimVisible = !!rollSim && !rollSim.hidden && getComputedStyle(rollSim).display !== 'none';
    if (!rollSimVisible) {
      const upgradeButton = switcher.querySelector('[data-view="upgrades"]');
      if (upgradeButton) {
        upgradeButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        upgradeButton.classList.add('active');
      } else {
        upgrade.hidden = false;
        upgrade.style.setProperty('display', 'grid', 'important');
      }
    }

    switcher.querySelectorAll('.uv-mode').forEach((button) => {
      if (button.dataset.view !== 'upgrades' && button.dataset.view !== 'rollsim') button.remove();
    });
    return true;
  }

  function init() {
    if (removeStats()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (removeStats() || tries >= 120) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
