(() => {
  const $ = (id) => document.getElementById(id);

  function percentText(value) {
    const pct = Math.max(0, value * 100);
    const digits = pct >= 10 ? 1 : pct >= 1 ? 2 : 3;
    return `${pct.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1')}%`;
  }

  function patchAverageColumns(root) {
    root.querySelectorAll('table.rs-table').forEach((table) => {
      const headers = [...table.querySelectorAll('thead th')];
      const avgIndex = headers.findIndex((th) => th.textContent.trim().toLowerCase() === 'avg / run');
      if (avgIndex < 0) return;
      table.querySelectorAll('tbody tr').forEach((row) => {
        const cell = row.children[avgIndex];
        if (!cell || cell.dataset.rsAvgFormatted === '1') return;
        const raw = cell.textContent.trim().replace(/,/g, '');
        if (/^\d*\.?\d+$/.test(raw)) {
          const value = Number(raw);
          if (Number.isFinite(value) && value >= 0 && value < 1) {
            cell.textContent = percentText(value);
            cell.title = `${raw} average pulls per run`;
          }
        }
        cell.dataset.rsAvgFormatted = '1';
      });
    });

    root.querySelectorAll('.rs-border-stat small,.rs-border-none small').forEach((small) => {
      if (small.dataset.rsAvgFormatted === '1') return;
      const match = small.textContent.match(/^([\d,.]+)\s+avg\/run(.*)$/i);
      if (match) {
        const value = Number(match[1].replace(/,/g, ''));
        if (Number.isFinite(value) && value >= 0 && value < 1) small.textContent = `${percentText(value)} chance/run${match[2]}`;
      }
      small.dataset.rsAvgFormatted = '1';
    });
  }

  function patchResults() {
    const root = $('rollSimulatorV15');
    if (!root) return;

    root.querySelectorAll('[data-rs-result-tab="cards"]').forEach((button) => button.remove());
    root.querySelectorAll('[data-result-panel="cards"]').forEach((panel) => panel.remove());

    root.querySelectorAll('.rs-summary-grid > div').forEach((box) => {
      const label = box.querySelector('span');
      if (label?.textContent.trim() === 'Avg Unique Cards') label.textContent = 'Avg Unique Card Types';
    });

    patchAverageColumns(root);

    const runSettings = root.querySelector('.rs-run-settings');
    if (runSettings && !root.querySelector('#rsExactRollNotice')) {
      const notice = document.createElement('div');
      notice.id = 'rsExactRollNotice';
      notice.className = 'rs-exact-roll-notice';
      notice.innerHTML = '<strong>Roll-by-roll RNG</strong><span>Each roll gets its own random card + border result. Multi-run batches use several CPU workers at once.</span>';
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
