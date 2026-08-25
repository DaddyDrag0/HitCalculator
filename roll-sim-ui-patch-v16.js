(() => {
  const $ = (id) => document.getElementById(id);

  function patchResults() {
    const root = $('rollSimulatorV15');
    if (!root) return;

    root.querySelectorAll('[data-rs-result-tab="cards"]').forEach((button) => button.remove());
    root.querySelectorAll('[data-result-panel="cards"]').forEach((panel) => panel.remove());

    const runSettings = root.querySelector('.rs-run-settings');
    if (runSettings && !root.querySelector('#rsExactRollNotice')) {
      const notice = document.createElement('div');
      notice.id = 'rsExactRollNotice';
      notice.className = 'rs-exact-roll-notice';
      notice.innerHTML = '<strong>Roll-by-roll RNG</strong><span>Every simulated roll now receives its own random card + border result. State timelines are precomputed only for speed.</span>';
      const runBar = runSettings.querySelector('.rs-run-bar');
      if (runBar) runBar.insertAdjacentElement('beforebegin', notice);
      else runSettings.append(notice);
    }
  }

  function injectStyles() {
    if ($('roll-sim-ui-patch-v16-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-sim-ui-patch-v16-styles';
    style.textContent = `
      #rollSimulatorV15 .rs-exact-roll-notice{
        display:flex;align-items:center;gap:8px;flex-wrap:wrap;
        margin-top:12px;padding:8px 10px;border:1px solid var(--line);
        border-radius:8px;background:var(--panel-2)
      }
      #rollSimulatorV15 .rs-exact-roll-notice strong{color:var(--blue);font-size:.63rem}
      #rollSimulatorV15 .rs-exact-roll-notice span{color:var(--muted);font-size:.59rem}
    `;
    document.head.append(style);
  }

  function init() {
    const root = $('rollSimulatorV15');
    if (!root) return;
    injectStyles();
    patchResults();
    const results = $('rsResults');
    if (results) new MutationObserver(patchResults).observe(results, { childList: true, subtree: true });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
