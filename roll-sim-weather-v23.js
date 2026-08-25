(() => {
  let root = null;
  let rootObserver = null;
  let documentObserver = null;
  let queued = false;

  function cleanWeatherUi() {
    if (!root) return;

    root.querySelectorAll('.rs-scenario[data-scenario]').forEach((panel) => {
      const scheduleButton = panel.querySelector('[data-rs-action="weather-mode"][data-weather-mode="schedule"]');
      if (scheduleButton?.classList.contains('active')) {
        panel.querySelector('[data-rs-action="weather-mode"][data-weather-mode="none"]')?.click();
      }
      scheduleButton?.remove();

      panel.querySelectorAll('[data-weather-schedule-wrap]').forEach((wrap) => wrap.remove());
    });
  }

  function scheduleClean() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      cleanWeatherUi();
    });
  }

  function attach() {
    root = document.getElementById('rollSimulatorV15');
    if (!root) return false;

    cleanWeatherUi();
    rootObserver = new MutationObserver(scheduleClean);
    rootObserver.observe(root, { childList: true, subtree: true });
    documentObserver?.disconnect();
    documentObserver = null;
    return true;
  }

  if (!attach()) {
    documentObserver = new MutationObserver(() => attach());
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
