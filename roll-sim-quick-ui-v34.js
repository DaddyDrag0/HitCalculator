(() => {
  const STORAGE = 'hitCalcRollSimQuickV34';
  const $ = (id) => document.getElementById(id);
  let quick = false;
  let root = null;
  let observer = null;
  let queued = false;

  try { quick = localStorage.getItem(STORAGE) === '1'; } catch {}
  window.__rollSimQuickModeV34 = quick;

  function clearResults() {
    const results = $('rsResults');
    if (!results) return;
    window.__rollSimLastResultV21 = null;
    results.innerHTML = '<div class="rs-empty-results"><strong>Settings changed</strong><span>Run the simulation again to see results for the current setup.</span></div>';
  }

  function setQuick(value) {
    quick = !!value;
    window.__rollSimQuickModeV34 = quick;
    try { localStorage.setItem(STORAGE, quick ? '1' : '0'); } catch {}
    syncButtons();
    clearResults();
  }

  function syncButtons() {
    if (!root) return;
    root.querySelectorAll('[data-rs-speed-mode]').forEach((button) => {
      const active = (button.dataset.rsSpeedMode === 'quick') === quick;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const note = root.querySelector('[data-rs-speed-note]');
    if (note) note.textContent = quick
      ? 'Quick batches the same card and PCRG chances instead of processing every roll one-by-one. Best for 500–1000 runs.'
      : 'Normal processes every simulated roll individually. Use this when you want the most exact simulation.';
  }

  function installSpeedOption() {
    const grid = root?.querySelector('.rs-run-settings .rs-settings-grid');
    if (!grid || grid.querySelector('[data-rs-speed-setting]')) return;
    const wrap = document.createElement('div');
    wrap.className = 'rs34-speed-setting';
    wrap.dataset.rsSpeedSetting = '1';
    wrap.innerHTML = `
      <span class="rs-field-label">Simulation Speed</span>
      <div class="rs-segments rs34-speed-buttons">
        <button type="button" data-rs-speed-mode="normal">Normal</button>
        <button type="button" data-rs-speed-mode="quick">Quick</button>
      </div>
      <small data-rs-speed-note></small>
    `;
    grid.append(wrap);
    syncButtons();
  }

  function moveWeatherAbovePacks() {
    if (!root) return;
    root.querySelectorAll('.rs-scenario[data-scenario]').forEach((panel) => {
      const pack = panel.querySelector(':scope > .rs-pack-section');
      if (!pack) return;
      const weatherTitle = [...panel.children].find((node) => node.classList?.contains('rs-subtitle') && node.textContent.trim() === 'Weather');
      const weatherMode = panel.querySelector(':scope > .rs-weather-mode');
      const fixed = panel.querySelector(':scope > .rs-fixed-weather');
      const schedule = panel.querySelector(':scope > .rs-schedule');
      const structures = panel.querySelector(':scope > .rs-advanced');
      for (const node of [weatherTitle, weatherMode, fixed, schedule, structures]) {
        if (node) panel.insertBefore(node, pack);
      }
    });
  }

  function markQuickResults() {
    const payload = window.__rollSimLastResultV21;
    const panel = root?.querySelector('.rs-result-panel[data-result-scenario="A"]');
    if (!payload || !panel) return;
    let tag = panel.querySelector('[data-rs34-result-mode]');
    if (!tag) {
      tag = document.createElement('small');
      tag.dataset.rs34ResultMode = '1';
      tag.className = 'rs34-result-mode';
      panel.querySelector('.rs-result-head')?.append(tag);
    }
    if (tag) tag.textContent = payload.quickMode ? 'Quick Simulation' : 'Normal Simulation';
  }

  function patch() {
    queued = false;
    installSpeedOption();
    moveWeatherAbovePacks();
    markQuickResults();
  }

  function schedulePatch() {
    if (queued) return;
    queued = true;
    queueMicrotask(patch);
  }

  function styles() {
    if ($('roll-sim-quick-ui-v34-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-sim-quick-ui-v34-styles';
    style.textContent = `
      #rollSimulatorV15 .rs34-speed-setting{grid-column:1/-1;min-width:0}
      #rollSimulatorV15 .rs34-speed-setting>small{display:block;margin-top:5px;color:var(--muted);font-size:.56rem}
      #rollSimulatorV15 .rs34-speed-buttons{max-width:520px}
      #rollSimulatorV15 .rs34-result-mode{margin-left:auto;color:var(--muted);font-size:.56rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    `;
    document.head.append(style);
  }

  function attach() {
    root = $('rollSimulatorV15');
    if (!root) return false;
    styles();
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-rs-speed-mode]');
      if (!button) return;
      setQuick(button.dataset.rsSpeedMode === 'quick');
    });
    observer = new MutationObserver(schedulePatch);
    observer.observe(root, { childList:true, subtree:true });
    patch();
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
