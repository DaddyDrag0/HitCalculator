(() => {
  function loadPackUi() {
    if (!document.getElementById('rollSimulatorV15')) return;
    if (document.querySelector('script[data-roll-sim-pack-ui-v19]')) return;
    const script = document.createElement('script');
    script.src = './roll-sim-pack-ui-v19.js?rev=20260825-0030';
    script.dataset.rollSimPackUiV19 = '1';
    document.head.append(script);
  }

  if (document.readyState === 'complete') loadPackUi();
  else window.addEventListener('load', loadPackUi, { once: true });
})();
