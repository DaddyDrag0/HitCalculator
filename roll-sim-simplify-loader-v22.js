(() => {
  if (window.__rollSimSimplifyLoaderV22) return;
  window.__rollSimSimplifyLoaderV22 = true;

  function loadRunUI() {
    if (document.querySelector('script[data-roll-sim-run-ui-v24]')) return;
    const ui = document.createElement('script');
    ui.src = './roll-sim-run-ui-v24.js?rev=20260825-0016';
    ui.dataset.rollSimRunUiV24 = '1';
    document.head.append(ui);
  }

  function load() {
    if (!document.getElementById('rollSimulatorV15')) return false;
    if (document.querySelector('script[data-roll-sim-simplify-v22]')) return true;
    const script = document.createElement('script');
    script.src = './roll-sim-simplify-v21.js?rev=20260824-2358';
    script.dataset.rollSimSimplifyV22 = '1';
    script.addEventListener('load', loadRunUI, { once: true });
    document.head.append(script);
    return true;
  }

  function start() {
    if (load()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (load() || attempts >= 100) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once:true });
})();
