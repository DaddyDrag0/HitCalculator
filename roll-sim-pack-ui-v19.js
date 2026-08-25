(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  const root = document.getElementById('rollSimulatorV15');
  if (!DATA || !root) return;

  const STORAGE = 'hitCalcRollSimPacksV19';
  const ORDER = ['Anime', 'Egypt', 'Rising Sun', 'Immortal', 'Prehistoric', 'Cryptid', 'Era2'];
  const allPacks = [...new Set(DATA.cards.map((card) => card.pack).filter(Boolean))]
    .sort((a, b) => {
      const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
    });
  const counts = Object.fromEntries(allPacks.map((pack) => [pack, DATA.cards.filter((card) => card.pack === pack).length]));
  const raptureCount = DATA.cards.filter((card) => card.weather === 'Rapture').length;
  const selections = { A: new Set(allPacks), B: new Set(allPacks) };
  const rapture24 = { A: false, B: false };

  const label = (pack) => pack === 'Era2' ? 'Era 2' : pack;

  function syncGlobal() {
    window.__rollSimPackSelectionsV19 = { A: [...selections.A], B: [...selections.B] };
    window.__rollSimRapture24V25 = { A: !!rapture24.A, B: !!rapture24.B };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      for (const key of ['A', 'B']) {
        if (Array.isArray(saved[key])) selections[key] = new Set(saved[key].filter((pack) => allPacks.includes(pack)));
      }
      if (saved.rapture24 && typeof saved.rapture24 === 'object') {
        for (const key of ['A', 'B']) if (typeof saved.rapture24[key] === 'boolean') rapture24[key] = saved.rapture24[key];
      }
    } catch {}
    syncGlobal();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({
        A: [...selections.A], B: [...selections.B], rapture24: { A: !!rapture24.A, B: !!rapture24.B },
      }));
    } catch {}
    syncGlobal();
  }

  function packHtml(key, pack) {
    const checked = selections[key].has(pack);
    return `<label class="rs-pack-option${checked ? ' active' : ''}" data-rs-pack-option>
      <input type="checkbox" data-rs-pack="${pack}" data-rs-pack-scenario="${key}"${checked ? ' checked' : ''}>
      <span>${label(pack)}</span><small>${counts[pack]} cards</small>
    </label>`;
  }

  function raptureHtml(key) {
    const checked = !!rapture24[key];
    return `<label class="rs-pack-option rs-rapture-option${checked ? ' active' : ''}" data-rs-rapture-option>
      <input type="checkbox" data-rs-rapture24 data-rs-pack-scenario="${key}"${checked ? ' checked' : ''}>
      <span>Rapture</span><small>${raptureCount} cards · 24/7</small>
    </label>`;
  }

  function sectionHtml(key) {
    return `<div class="rs-pack-section" data-rs-pack-section="${key}">
      <div class="rs-pack-head">
        <div><span>Card Packs</span><small>Selected packs enter the roll pool. Rapture lets Rapture cards roll 24/7.</small></div>
        <div class="rs-pack-actions"><button type="button" data-rs-pack-action="all" data-rs-pack-scenario="${key}">All</button><button type="button" data-rs-pack-action="none" data-rs-pack-scenario="${key}">None</button></div>
      </div>
      <div class="rs-pack-grid">${allPacks.map((pack) => packHtml(key, pack)).join('')}${raptureHtml(key)}</div>
      <div class="rs-pack-status" data-rs-pack-status="${key}"></div>
    </div>`;
  }

  function updateStatus(key) {
    const status = root.querySelector(`[data-rs-pack-status="${key}"]`);
    if (!status) return;
    const selected = selections[key];
    const packCards = allPacks.reduce((sum, pack) => sum + (selected.has(pack) ? counts[pack] : 0), 0);
    const next = `${selected.size} / ${allPacks.length} packs on · ${packCards} pack cards enabled · Rapture 24/7 ${rapture24[key] ? 'ON' : 'OFF'}`;
    if (status.textContent !== next) status.textContent = next;
  }

  function injectScenario(panel) {
    const key = panel.dataset.scenario === 'B' ? 'B' : 'A';
    if (panel.querySelector(`[data-rs-pack-section="${key}"]`)) return;
    const build = panel.querySelector('.rs-build-summary');
    if (!build) return;
    build.insertAdjacentHTML('afterend', sectionHtml(key));
    updateStatus(key);
  }

  function patch() {
    root.querySelectorAll('.rs-scenario[data-scenario]').forEach(injectScenario);
  }

  function setAll(key, enabled) {
    selections[key] = enabled ? new Set(allPacks) : new Set();
    rapture24[key] = enabled;
    const section = root.querySelector(`[data-rs-pack-section="${key}"]`);
    section?.querySelectorAll('[data-rs-pack]').forEach((input) => {
      input.checked = enabled;
      input.closest('[data-rs-pack-option]')?.classList.toggle('active', enabled);
    });
    const rapture = section?.querySelector('[data-rs-rapture24]');
    if (rapture) {
      rapture.checked = enabled;
      rapture.closest('[data-rs-rapture-option]')?.classList.toggle('active', enabled);
    }
    save();
    updateStatus(key);
  }

  function injectStyles() {
    if (document.getElementById('roll-sim-pack-ui-v19-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-sim-pack-ui-v19-styles';
    style.textContent = `
      #rollSimulatorV15 .rs-pack-section{margin:0 0 14px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      #rollSimulatorV15 .rs-pack-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
      #rollSimulatorV15 .rs-pack-head>div:first-child>span{display:block;color:var(--text);font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      #rollSimulatorV15 .rs-pack-head>div:first-child>small{display:block;margin-top:3px;color:var(--muted);font-size:.56rem}
      #rollSimulatorV15 .rs-pack-actions{display:flex;gap:5px}
      #rollSimulatorV15 .rs-pack-actions button{min-height:26px;padding:0 9px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--muted);font:inherit;font-size:.56rem;font-weight:850;cursor:pointer}
      #rollSimulatorV15 .rs-pack-actions button:hover{border-color:var(--line-2);color:var(--text)}
      #rollSimulatorV15 .rs-pack-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
      #rollSimulatorV15 .rs-pack-option{position:relative;display:grid;grid-template-columns:15px minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);cursor:pointer;transition:border-color .12s ease,background .12s ease}
      #rollSimulatorV15 .rs-pack-option.active{border-color:color-mix(in srgb,var(--blue) 48%,var(--line));background:color-mix(in srgb,var(--panel) 88%,var(--blue) 12%)}
      #rollSimulatorV15 .rs-rapture-option.active{border-color:color-mix(in srgb,var(--galaxy,#a78bfa) 58%,var(--line));background:color-mix(in srgb,var(--panel) 88%,var(--galaxy,#a78bfa) 12%)}
      #rollSimulatorV15 .rs-pack-option input{grid-row:1/3;width:14px;height:14px;margin:0;padding:0;accent-color:var(--blue)}
      #rollSimulatorV15 .rs-pack-option span{font-size:.62rem;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #rollSimulatorV15 .rs-pack-option small{color:var(--muted);font-size:.52rem}
      #rollSimulatorV15 .rs-pack-status{margin-top:7px;color:var(--muted);font-size:.55rem;font-weight:750}
      @media(max-width:820px){#rollSimulatorV15 .rs-pack-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:460px){#rollSimulatorV15 .rs-pack-head{flex-direction:column}#rollSimulatorV15 .rs-pack-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.append(style);
  }

  root.addEventListener('change', (event) => {
    const raptureInput = event.target.closest('[data-rs-rapture24]');
    if (raptureInput) {
      const key = raptureInput.dataset.rsPackScenario === 'B' ? 'B' : 'A';
      rapture24[key] = !!raptureInput.checked;
      raptureInput.closest('[data-rs-rapture-option]')?.classList.toggle('active', raptureInput.checked);
      save();
      updateStatus(key);
      return;
    }

    const input = event.target.closest('[data-rs-pack]');
    if (!input) return;
    const key = input.dataset.rsPackScenario === 'B' ? 'B' : 'A';
    const pack = input.dataset.rsPack;
    if (!allPacks.includes(pack)) return;
    if (input.checked) selections[key].add(pack); else selections[key].delete(pack);
    input.closest('[data-rs-pack-option]')?.classList.toggle('active', input.checked);
    save();
    updateStatus(key);
  });

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-rs-pack-action]');
    if (!button) return;
    const key = button.dataset.rsPackScenario === 'B' ? 'B' : 'A';
    setAll(key, button.dataset.rsPackAction === 'all');
  });

  load();
  injectStyles();
  patch();
  const scenarios = document.getElementById('rsScenarios');
  if (scenarios) new MutationObserver(patch).observe(scenarios, { childList: true });
})();
