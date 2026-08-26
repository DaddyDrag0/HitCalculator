(() => {
  const $ = (id) => document.getElementById(id);
  let queued = false;

  function clearResults() {
    queued = false;
    const results = $('rsResults');
    if (!results) return;
    window.__rollSimLastResultV21 = null;
    results.innerHTML = '<div class="rs-empty-results"><strong>Settings changed</strong><span>Run the simulation again to see results for the current setup.</span></div>';
  }

  function scheduleClear() {
    if (queued) return;
    queued = true;
    queueMicrotask(clearResults);
  }

  function isSetupClick(target) {
    return !!target.closest(
      '[data-rs-action="weather-mode"], [data-rs-pack-action], #rsRunOptions [data-rs-action="runs"]'
    );
  }

  function isSetupField(target) {
    return !!target.closest(
      '#rsDurationValue, #rsDurationUnit, [data-rs-field="fixed-weather"], [data-rs-field="weather-structure"], [data-rs-pack], [data-rs-rapture24]'
    );
  }

  document.addEventListener('click', (event) => {
    if (isSetupClick(event.target)) scheduleClear();
  });

  document.addEventListener('input', (event) => {
    if (isSetupField(event.target) || event.target.closest('#upgradeCalcV2')) scheduleClear();
  });

  document.addEventListener('change', (event) => {
    if (isSetupField(event.target) || event.target.closest('#upgradeCalcV2')) scheduleClear();
  });
})();
