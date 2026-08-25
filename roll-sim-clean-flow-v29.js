(() => {
  const $ = (id) => document.getElementById(id);

  function clean() {
    const root = $('rollSimulatorV15');
    if (!root) return false;

    root.querySelector('#rsExactRollNotice')?.remove();
    root.querySelectorAll('.rs-scenario').forEach((scenario) => {
      scenario.querySelector(':scope > .rs-panel-head')?.remove();
      scenario.querySelector(':scope > .rs-build-summary')?.remove();
    });
    return true;
  }

  function attach() {
    if (!clean()) return false;
    const scenarios = $('rsScenarios');
    if (scenarios && scenarios.dataset.rsCleanFlowV29 !== '1') {
      scenarios.dataset.rsCleanFlowV29 = '1';
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          clean();
        });
      }).observe(scenarios, { childList:true, subtree:true });
    }
    return true;
  }

  if (!attach()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (attach() || tries >= 120) clearInterval(timer);
    }, 50);
  }
})();
