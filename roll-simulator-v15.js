(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V15;
  if (!DATA) return;

  const STORAGE = 'hitCalcRollSimulatorV15';
  const RUN_OPTIONS = [1, 3, 8, 25, 50, 100];
  const TIME_UNITS = { minute: 60, hour: 3600, day: 86400 };
  const MAX_SECONDS = 172800;
  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const defaultScenario = () => ({
    snapshot: null,
    weatherMode: 'none',
    fixedWeather: 'Manga',
    segments: [],
    weatherStructures: { Snow: 0, Storm: 0, Aurora: 0, Shroud: 0, Chaos: 0 },
  });

  const state = {
    mode: 'batch',
    durationValue: 8,
    durationUnit: 'hour',
    runs: 8,
    scenarios: { A: defaultScenario(), B: defaultScenario() },
    worker: null,
    jobId: 0,
    running: false,
    lastResult: null,
  };

  function deepMergeScenario(target, source) {
    if (!source || typeof source !== 'object') return target;
    target.snapshot = source.snapshot && typeof source.snapshot === 'object' ? source.snapshot : null;
    target.weatherMode = ['none', 'fixed', 'schedule'].includes(source.weatherMode) ? source.weatherMode : target.weatherMode;
    target.fixedWeather = DATA.weathers.includes(source.fixedWeather) ? source.fixedWeather : target.fixedWeather;
    target.segments = Array.isArray(source.segments) ? source.segments.slice(0, 24).map((segment) => ({
      weather: DATA.weathers.includes(segment.weather) ? segment.weather : (segment.weather === null || segment.weather === 'Normal' ? null : null),
      value: Math.max(0, Number(segment.value) || 0),
      unit: ['minute', 'hour'].includes(segment.unit) ? segment.unit : 'minute',
    })) : [];
    for (const key of ['Snow', 'Storm', 'Aurora', 'Shroud', 'Chaos']) target.weatherStructures[key] = Math.max(0, Math.min(5, Math.floor(Number(source.weatherStructures?.[key]) || 0)));
    return target;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      if (saved.mode === 'compare' || saved.mode === 'batch') state.mode = saved.mode;
      if (RUN_OPTIONS.includes(Number(saved.runs))) state.runs = Number(saved.runs);
      if (TIME_UNITS[saved.durationUnit]) state.durationUnit = saved.durationUnit;
      if (Number.isFinite(Number(saved.durationValue)) && Number(saved.durationValue) > 0) state.durationValue = Number(saved.durationValue);
      deepMergeScenario(state.scenarios.A, saved.scenarios?.A);
      deepMergeScenario(state.scenarios.B, saved.scenarios?.B);
    } catch {}
    clampDurationState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({
        mode: state.mode,
        durationValue: state.durationValue,
        durationUnit: state.durationUnit,
        runs: state.runs,
        scenarios: state.scenarios,
      }));
    } catch {}
  }

  function clampDurationState() {
    const unitSeconds = TIME_UNITS[state.durationUnit] || 3600;
    const max = MAX_SECONDS / unitSeconds;
    state.durationValue = Math.max(1 / unitSeconds, Math.min(max, Number(state.durationValue) || 1));
  }

  function durationSeconds() {
    return Math.max(1, Math.min(MAX_SECONDS, state.durationValue * (TIME_UNITS[state.durationUnit] || 3600)));
  }

  function num(id) {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : 0;
  }

  function checked(id) {
    return !!$(id)?.checked;
  }

  function captureCurrentBuild() {
    return {
      capturedAt: Date.now(),
      rolls: Math.max(0, Math.floor(num('uvRolls'))),
      charm: $('uvCharm')?.value || 'None',
      skills: {
        Luck: num('uvSkillLuck'), Speed: num('uvSkillSpeed'), All: num('uvSkillAll'),
        Platinum: num('uvSkillPlatinum'), Crystal: num('uvSkillCrystal'), Ruby: num('uvSkillRuby'), Galaxy: num('uvSkillGalaxy'),
      },
      structures: {
        Luck: num('uvStructureLuck'), Speed: num('uvStructureSpeed'), Platinum: num('uvStructurePlatinum'),
        Crystal: num('uvStructureCrystal'), Ruby: num('uvStructureRuby'), Galaxy: num('uvStructureGalaxy'),
      },
      chaska: {
        Luck: num('uvChaskaLuck'), Platinum: num('uvChaskaPlatinum'), Crystal: num('uvChaskaCrystal'), Ruby: 0, Galaxy: num('uvChaskaGalaxy'),
      },
      dungeon: {
        Luck: num('uvDungeonLuck'), Speed: num('uvDungeonSpeed'), Platinum: num('uvDungeonPlatinum'),
        Crystal: num('uvDungeonCrystal'), Ruby: num('uvDungeonRuby'), Galaxy: num('uvDungeonGalaxy'),
      },
      potions: {
        speed3: checked('uvPotSpeed3'), luck3: checked('uvPotLuck3'), legendarySpeed: checked('uvPotLegendarySpeed'),
        legendaryLuck: checked('uvPotLegendaryLuck'), elixir: checked('uvPotElixir'), cursed: checked('uvPotCursed'),
        eventSpeed: checked('uvPotEventSpeed'), eventLuck: checked('uvPotEventLuck'), divine: checked('uvPotDivine'),
      },
      modifiers: {
        borderBoost: checked('uvBorderBoost'), bossPot: checked('uvBossPot'), luckySurge: checked('uvLuckySurge'),
        dice: checked('uvDice'), quickdraw: checked('uvQuickdraw'), heavyHand: checked('uvHeavyHand'), vicissitudes: checked('uvVicissitudes'),
      },
    };
  }

  function formatNumber(value, decimals = 0) {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= suffixes.length) return value.toExponential(2);
    const scaled = value / 1000 ** tier;
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${scaled.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1')}${suffixes[tier]}`;
  }

  function formatDuration(seconds) {
    seconds = Math.round(Number(seconds) || 0);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!days && !hours && secs) parts.push(`${secs}s`);
    return parts.join(' ') || '0s';
  }

  function borderMaskLabel(mask) {
    if (!mask) return 'No Border';
    const names = [];
    for (let i = DATA.borderNames.length - 1; i >= 0; i -= 1) if (mask & (1 << i)) names.push(DATA.borderNames[i]);
    return names.join(' + ');
  }

  function maskMultiplier(mask) {
    let multiplier = 1;
    for (let i = 0; i < DATA.borderNames.length; i += 1) if (mask & (1 << i)) multiplier *= DATA.borders[DATA.borderNames[i]].multiplier;
    return multiplier;
  }

  function chancePercent(hitRuns, runs) {
    return runs ? `${((hitRuns / runs) * 100).toFixed(hitRuns === 0 || hitRuns === runs ? 0 : 1)}%` : '0%';
  }

  function buildSummary(build) {
    if (!build) return '<span class="rs-empty-build">Not captured</span>';
    const active = [];
    if (build.modifiers?.bossPot) active.push('Boss Pot');
    if (build.modifiers?.luckySurge) active.push('Lucky Surge');
    if (build.modifiers?.dice) active.push('The Dice');
    if (build.modifiers?.vicissitudes) active.push('Vicissitudes');
    if (build.modifiers?.quickdraw) active.push('Quickdraw');
    if (build.modifiers?.heavyHand) active.push('Heavy Hand');
    return `<strong>${formatNumber(build.rolls)} rolls · ${escapeHtml(build.charm || 'None')}</strong><small>${active.length ? escapeHtml(active.join(' · ')) : 'No relic modifiers selected'}</small>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function weatherOptions(selected, includeNormal = false) {
    const options = [];
    if (includeNormal) options.push(`<option value="Normal"${selected == null || selected === 'Normal' ? ' selected' : ''}>Normal</option>`);
    for (const weather of DATA.weathers) options.push(`<option value="${escapeHtml(weather)}"${selected === weather ? ' selected' : ''}>${escapeHtml(weather)}</option>`);
    return options.join('');
  }

  function scenarioHtml(key) {
    const scenario = state.scenarios[key];
    const label = state.mode === 'compare' ? `Scenario ${key}` : 'Simulation Setup';
    const rows = scenario.segments.map((segment, index) => scheduleRowHtml(key, segment, index)).join('');
    return `
      <article class="rs-panel rs-scenario" data-scenario="${key}">
        <div class="rs-panel-head">
          <div><span>${label}</span><strong>${state.mode === 'compare' ? `Build ${key}` : 'Current Upgrades Build'}</strong></div>
          <button type="button" class="rs-small-btn" data-rs-action="capture" data-scenario="${key}">Capture Current Upgrades</button>
        </div>
        <div class="rs-build-summary" data-build-summary="${key}">${buildSummary(scenario.snapshot)}</div>

        <div class="rs-subtitle">Weather</div>
        <div class="rs-segments rs-weather-mode" role="group" aria-label="Weather mode">
          ${['none', 'fixed', 'schedule'].map((mode) => `<button type="button" data-rs-action="weather-mode" data-scenario="${key}" data-weather-mode="${mode}" class="${scenario.weatherMode === mode ? 'active' : ''}">${mode === 'none' ? 'No Weather' : mode === 'fixed' ? 'Fixed Weather' : 'Schedule'}</button>`).join('')}
        </div>

        <div class="rs-fixed-weather" data-weather-fixed-wrap="${key}"${scenario.weatherMode === 'fixed' ? '' : ' hidden'}>
          <label><span>Weather</span><select data-rs-field="fixed-weather" data-scenario="${key}">${weatherOptions(scenario.fixedWeather)}</select></label>
        </div>

        <div class="rs-schedule" data-weather-schedule-wrap="${key}"${scenario.weatherMode === 'schedule' ? '' : ' hidden'}>
          <div class="rs-schedule-list" data-schedule-list="${key}">${rows}</div>
          <div class="rs-schedule-foot">
            <button type="button" class="rs-small-btn" data-rs-action="add-segment" data-scenario="${key}">+ Add Segment</button>
            <small>Segments run in order. Any unused simulation time is Normal weather.</small>
          </div>
        </div>

        <details class="rs-advanced">
          <summary>Weather Structures</summary>
          <div class="rs-weather-structures">
            ${['Snow', 'Storm', 'Aurora', 'Shroud', 'Chaos'].map((name) => `<label><span>${name}</span><select data-rs-field="weather-structure" data-scenario="${key}" data-structure="${name}">${Array.from({ length: 6 }, (_, i) => `<option value="${i}"${scenario.weatherStructures[name] === i ? ' selected' : ''}>Lv ${i}</option>`).join('')}</select></label>`).join('')}
          </div>
        </details>
      </article>
    `;
  }

  function scheduleRowHtml(key, segment, index) {
    return `
      <div class="rs-schedule-row" data-segment-index="${index}">
        <select data-rs-field="segment-weather" data-scenario="${key}">${weatherOptions(segment.weather, true)}</select>
        <input data-rs-field="segment-value" data-scenario="${key}" type="number" min="0.01" step="any" value="${Number(segment.value) || 10}">
        <select data-rs-field="segment-unit" data-scenario="${key}">
          <option value="minute"${segment.unit === 'minute' ? ' selected' : ''}>Minutes</option>
          <option value="hour"${segment.unit === 'hour' ? ' selected' : ''}>Hours</option>
        </select>
        <button type="button" aria-label="Remove weather segment" data-rs-action="remove-segment" data-scenario="${key}">×</button>
      </div>
    `;
  }

  function buildRoot() {
    if ($('rollSimulatorV15')) return;
    const page = q('main.page');
    const switcher = q('.uv-mode-switch');
    if (!page || !switcher) return;

    if (!q('[data-view="rollsim"]', switcher)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'uv-mode';
      button.dataset.view = 'rollsim';
      button.textContent = 'Roll Simulator';
      switcher.append(button);
    }

    const root = document.createElement('section');
    root.id = 'rollSimulatorV15';
    root.className = 'rs-root';
    root.hidden = true;
    root.style.display = 'none';
    root.innerHTML = `
      <section class="rs-toolbar">
        <article class="rs-panel rs-run-settings">
          <div class="rs-panel-head"><div><span>Roll Simulator</span><strong>Simulation Settings</strong></div></div>
          <div class="rs-settings-grid">
            <label><span>Duration</span><div class="rs-duration"><input id="rsDurationValue" type="number" min="0.01" step="any" value="${state.durationValue}"><select id="rsDurationUnit"><option value="minute">Minutes</option><option value="hour">Hours</option><option value="day">Days</option></select></div><small>Maximum 2 days per run</small></label>
            <div><span class="rs-field-label">Runs</span><div class="rs-segments" id="rsRunOptions">${RUN_OPTIONS.map((value) => `<button type="button" data-rs-action="runs" data-runs="${value}" class="${state.runs === value ? 'active' : ''}">${value}</button>`).join('')}</div></div>
            <div><span class="rs-field-label">Mode</span><div class="rs-segments"><button type="button" data-rs-action="mode" data-mode="batch" class="${state.mode === 'batch' ? 'active' : ''}">Batch / Average</button><button type="button" data-rs-action="mode" data-mode="compare" class="${state.mode === 'compare' ? 'active' : ''}">Compare A vs B</button></div></div>
          </div>
          <div class="rs-run-bar">
            <button type="button" id="rsRunButton" class="rs-primary">Run Simulation</button>
            <button type="button" id="rsCancelButton" class="rs-cancel" hidden>Cancel</button>
            <div class="rs-progress" id="rsProgress" hidden><i id="rsProgressFill"></i><span id="rsProgressText">Preparing…</span></div>
          </div>
          <div id="rsError" class="rs-error" hidden></div>
        </article>
      </section>
      <section class="rs-scenarios" id="rsScenarios"></section>
      <section class="rs-results" id="rsResults"><div class="rs-empty-results"><strong>Ready to simulate</strong><span>Uses your Upgrades build, real card pool, weather rules, borders, relic rolls, and up to 100 independent runs.</span></div></section>
    `;

    const upgrade = $('upgradeCalcV2');
    if (upgrade) upgrade.insertAdjacentElement('afterend', root);
    else page.append(root);
    $('rsDurationUnit').value = state.durationUnit;
    renderScenarios();
    updateDurationMax();
  }

  function renderScenarios() {
    const container = $('rsScenarios');
    if (!container) return;
    container.innerHTML = scenarioHtml('A') + (state.mode === 'compare' ? scenarioHtml('B') : '');
  }

  function updateDurationMax() {
    const input = $('rsDurationValue');
    const unit = $('rsDurationUnit');
    if (!input || !unit) return;
    const max = MAX_SECONDS / (TIME_UNITS[unit.value] || 3600);
    input.max = String(max);
    input.title = `Maximum ${max} ${unit.value}${max === 1 ? '' : 's'}`;
  }

  function showSimulator() {
    const direct = $('directCalcView');
    const upgrade = $('upgradeCalcV2');
    const sim = $('rollSimulatorV15');
    if (direct) { direct.hidden = true; direct.style.setProperty('display', 'none', 'important'); }
    if (upgrade) { upgrade.hidden = true; upgrade.style.setProperty('display', 'none', 'important'); }
    if (sim) { sim.hidden = false; sim.style.setProperty('display', 'grid', 'important'); }
    qa('.uv-mode').forEach((button) => button.classList.toggle('active', button.dataset.view === 'rollsim'));
  }

  function hideSimulator() {
    const sim = $('rollSimulatorV15');
    if (sim) { sim.hidden = true; sim.style.setProperty('display', 'none', 'important'); }
  }

  function syncDurationFromDom() {
    state.durationUnit = $('rsDurationUnit')?.value || 'hour';
    state.durationValue = Math.max(0, Number($('rsDurationValue')?.value) || 0);
    clampDurationState();
    if ($('rsDurationValue')) $('rsDurationValue').value = String(state.durationValue);
    updateDurationMax();
    saveState();
  }

  function syncScenarioField(target) {
    const key = target.dataset.scenario;
    const scenario = state.scenarios[key];
    if (!scenario) return;
    const field = target.dataset.rsField;
    if (field === 'fixed-weather') scenario.fixedWeather = target.value;
    if (field === 'weather-structure') scenario.weatherStructures[target.dataset.structure] = Math.max(0, Math.min(5, Math.floor(Number(target.value) || 0)));
    if (field && field.startsWith('segment-')) {
      const row = target.closest('.rs-schedule-row');
      const index = Number(row?.dataset.segmentIndex);
      const segment = scenario.segments[index];
      if (!segment) return;
      if (field === 'segment-weather') segment.weather = target.value === 'Normal' ? null : target.value;
      if (field === 'segment-value') segment.value = Math.max(0.01, Number(target.value) || 0.01);
      if (field === 'segment-unit') segment.unit = target.value;
    }
    saveState();
  }

  function captureScenario(key) {
    const build = captureCurrentBuild();
    state.scenarios[key].snapshot = build;
    const summary = q(`[data-build-summary="${key}"]`);
    if (summary) summary.innerHTML = buildSummary(build);
    saveState();
  }

  function resetSimulator() {
    stopWorker();
    state.mode = 'batch';
    state.durationValue = 8;
    state.durationUnit = 'hour';
    state.runs = 8;
    state.scenarios.A = defaultScenario();
    state.scenarios.B = defaultScenario();
    state.lastResult = null;
    saveState();
    if ($('rsDurationValue')) $('rsDurationValue').value = '8';
    if ($('rsDurationUnit')) $('rsDurationUnit').value = 'hour';
    qa('#rsRunOptions button').forEach((button) => button.classList.toggle('active', Number(button.dataset.runs) === 8));
    qa('[data-rs-action="mode"]').forEach((button) => button.classList.toggle('active', button.dataset.mode === 'batch'));
    renderScenarios();
    if ($('rsResults')) $('rsResults').innerHTML = '<div class="rs-empty-results"><strong>Ready to simulate</strong><span>Uses your Upgrades build, real card pool, weather rules, borders, relic rolls, and up to 100 independent runs.</span></div>';
    setError('');
    updateDurationMax();
  }

  function scenarioForJob(key, useCurrent = false) {
    const scenario = state.scenarios[key];
    const build = useCurrent ? captureCurrentBuild() : (scenario.snapshot || captureCurrentBuild());
    if (useCurrent) {
      scenario.snapshot = build;
      const summary = q(`[data-build-summary="${key}"]`);
      if (summary) summary.innerHTML = buildSummary(build);
    }
    const segments = scenario.segments.map((segment) => ({
      weather: segment.weather || null,
      durationSeconds: Math.max(0, Number(segment.value) || 0) * (segment.unit === 'hour' ? 3600 : 60),
    }));
    return {
      build,
      weather: { mode: scenario.weatherMode, fixed: scenario.fixedWeather, segments },
      weatherStructures: { ...scenario.weatherStructures },
    };
  }

  function ensureWorker() {
    if (state.worker) return state.worker;
    const worker = new Worker('./roll-sim-worker-v15.js?rev=20260824-2004');
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', (event) => finishWithError(event.message || 'The simulator worker failed to start.'));
    state.worker = worker;
    return worker;
  }

  function stopWorker() {
    if (state.worker) state.worker.terminate();
    state.worker = null;
    state.running = false;
    setRunningUi(false);
  }

  function setRunningUi(running) {
    state.running = running;
    const run = $('rsRunButton');
    const cancel = $('rsCancelButton');
    const progress = $('rsProgress');
    if (run) run.disabled = running;
    if (cancel) cancel.hidden = !running;
    if (progress) progress.hidden = !running;
    if (!running && $('rsProgressFill')) $('rsProgressFill').style.width = '0%';
  }

  function setError(message) {
    const el = $('rsError');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
  }

  function runSimulation() {
    syncDurationFromDom();
    if (!(state.durationValue > 0)) {
      setError('Enter a simulation duration greater than 0.');
      return;
    }
    const seconds = durationSeconds();
    if (seconds > MAX_SECONDS) {
      setError('Simulation duration cannot exceed 2 days.');
      return;
    }
    setError('');
    const scenarios = state.mode === 'compare'
      ? [scenarioForJob('A', false), scenarioForJob('B', false)]
      : [scenarioForJob('A', true)];
    saveState();
    const jobId = ++state.jobId;
    const worker = ensureWorker();
    setRunningUi(true);
    if ($('rsProgressText')) $('rsProgressText').textContent = `0 / ${state.runs * scenarios.length} runs`;
    if ($('rsProgressFill')) $('rsProgressFill').style.width = '0%';
    worker.postMessage({ type: 'run', jobId, durationSeconds: seconds, runs: state.runs, scenarios });
  }

  function handleWorkerMessage(event) {
    const message = event.data || {};
    if (message.jobId !== state.jobId) return;
    if (message.type === 'progress') {
      const percent = Math.max(0, Math.min(100, (message.completed / message.total) * 100));
      if ($('rsProgressFill')) $('rsProgressFill').style.width = `${percent}%`;
      if ($('rsProgressText')) $('rsProgressText').textContent = `${message.completed} / ${message.total} runs`;
      return;
    }
    if (message.type === 'error') {
      finishWithError(message.message || 'Simulation failed.');
      return;
    }
    if (message.type === 'result') {
      state.lastResult = message;
      setRunningUi(false);
      renderResults(message);
    }
  }

  function finishWithError(message) {
    stopWorker();
    setError(message);
  }

  function bestPulls(result, limit = 15) {
    const rows = [];
    const aggregate = result.aggregate;
    for (let i = 0; i < DATA.cards.length; i += 1) {
      for (let mask = 0; mask < 16; mask += 1) {
        const count = aggregate.cardMasks[i][mask];
        if (!count) continue;
        let hitRuns = 0;
        for (const run of result.runs) if (run.cardMasks[i][mask] > 0) hitRuns += 1;
        rows.push({ cardIndex: i, mask, count, hitRuns, effective: DATA.cards[i].rarity * maskMultiplier(mask) });
      }
    }
    rows.sort((a, b) => b.effective - a.effective || b.count - a.count);
    return rows.slice(0, limit);
  }

  function pullBadges(card, mask) {
    const badges = [];
    if (mask) badges.push(`<span class="rs-border-badge">${escapeHtml(borderMaskLabel(mask))}</span>`);
    if (card.sin) badges.push('<span class="rs-tag boss">Boss</span>');
    if (card.currentEvent) badges.push('<span class="rs-tag event">Current Event</span>');
    if (card.weather) badges.push(`<span class="rs-tag weather">${escapeHtml(card.weather)}</span>`);
    return badges.join(' ');
  }

  function scenarioSummaryHtml(result, label, duration) {
    const a = result.aggregate;
    const best = a.bestPull;
    const bestCard = best ? DATA.cards[best.cardIndex] : null;
    return `
      <div class="rs-result-head"><div><span>${escapeHtml(label)}</span><strong>${a.runs} run${a.runs === 1 ? '' : 's'} × ${formatDuration(duration)}</strong></div></div>
      <div class="rs-summary-grid">
        <div><span>Avg Rolls / Run</span><strong>${formatNumber(a.averageRolls)}</strong></div>
        <div><span>Avg Unique Cards</span><strong>${a.averageUniqueCards.toFixed(1)}</strong></div>
        <div><span>Total Rolls Simulated</span><strong>${formatNumber(a.totalRolls)}</strong></div>
        <div><span>Best Pull</span><strong>${bestCard ? `${escapeHtml(borderMaskLabel(best.mask))} ${escapeHtml(bestCard.name)}` : '—'}</strong></div>
      </div>
    `;
  }

  function bestPullTable(result) {
    const rows = bestPulls(result);
    if (!rows.length) return '<div class="rs-no-data">No pulls.</div>';
    return `<div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Pull</th><th>Effective Rarity</th><th>Total</th><th>Runs Hit</th></tr></thead><tbody>${rows.map((row) => {
      const card = DATA.cards[row.cardIndex];
      return `<tr><td><strong>${escapeHtml(card.name)}</strong><div class="rs-row-meta">${pullBadges(card, row.mask)}</div></td><td>1 / ${formatNumber(row.effective)}</td><td>${formatNumber(row.count)}</td><td>${row.hitRuns} / ${result.aggregate.runs} <small>(${chancePercent(row.hitRuns, result.aggregate.runs)})</small></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function cardPullTable(result, resultKey) {
    const a = result.aggregate;
    const rows = [];
    for (let i = 0; i < DATA.cards.length; i += 1) {
      const total = a.cardTotals[i];
      if (!total) continue;
      const bordered = a.cardMasks[i].slice(1).reduce((sum, count) => sum + count, 0);
      const detail = a.cardMasks[i].map((count, mask) => ({ count, mask })).filter((entry) => entry.mask > 0 && entry.count > 0).sort((x, y) => y.count - x.count).slice(0, 5);
      rows.push({ i, total, bordered, detail });
    }
    rows.sort((x, y) => DATA.cards[y.i].rarity - DATA.cards[x.i].rarity);
    return `
      <div class="rs-table-tools"><input type="search" placeholder="Search card pulls" data-rs-card-search="${resultKey}"><span>${rows.length} cards pulled</span></div>
      <div class="rs-table-wrap"><table class="rs-table" data-rs-card-table="${resultKey}"><thead><tr><th>Card</th><th>Base Rarity</th><th>Avg / Run</th><th>Total</th><th>Runs Hit</th><th>Borders On This Card</th></tr></thead><tbody>
        ${rows.map((row) => {
          const card = DATA.cards[row.i];
          const meta = [card.sin ? 'Boss' : '', card.currentEvent ? 'Current Event' : '', card.weather || ''].filter(Boolean).join(' · ');
          const borders = row.detail.length ? row.detail.map((entry) => `${escapeHtml(borderMaskLabel(entry.mask))} ×${formatNumber(entry.count)}`).join('<br>') : '—';
          return `<tr data-card-name="${escapeHtml(card.name.toLowerCase())}"><td><strong>${escapeHtml(card.name)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}</td><td>1 / ${formatNumber(card.rarity)}</td><td>${formatNumber(row.total / a.runs, 2)}</td><td>${formatNumber(row.total)}</td><td>${a.cardHitRuns[row.i]} / ${a.runs}</td><td>${row.bordered ? borders : '—'}</td></tr>`;
        }).join('')}
      </tbody></table></div>
    `;
  }

  function borderResultsHtml(result) {
    const a = result.aggregate;
    const borderCards = DATA.borderNames.map((name, index) => `
      <div class="rs-border-stat ${name.toLowerCase()}"><span>${name}</span><strong>${formatNumber(a.borderTotals[index])}</strong><small>${formatNumber(a.borderTotals[index] / a.runs, 2)} avg/run · ${a.borderHitRuns[index]}/${a.runs} runs</small></div>
    `).join('');
    const combos = [];
    for (let mask = 1; mask < 16; mask += 1) if (a.comboTotals[mask] > 0) combos.push({ mask, total: a.comboTotals[mask], hitRuns: a.comboHitRuns[mask] });
    combos.sort((x, y) => y.total - x.total);
    return `
      <div class="rs-border-grid">${borderCards}</div>
      <div class="rs-border-none"><span>No Border</span><strong>${formatNumber(a.comboTotals[0])}</strong><small>${formatNumber(a.comboTotals[0] / a.runs, 2)} avg/run</small></div>
      <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Border Combination</th><th>Total</th><th>Avg / Run</th><th>Runs Hit</th></tr></thead><tbody>${combos.map((row) => `<tr><td><strong>${escapeHtml(borderMaskLabel(row.mask))}</strong></td><td>${formatNumber(row.total)}</td><td>${formatNumber(row.total / a.runs, 2)}</td><td>${row.hitRuns} / ${a.runs}</td></tr>`).join('')}</tbody></table></div>
    `;
  }

  function individualRunHtml(result, resultKey, selectedIndex = 0) {
    const index = Math.max(0, Math.min(result.runs.length - 1, selectedIndex));
    const run = result.runs[index];
    if (!run) return '';
    const cardRows = run.cardTotals.map((count, i) => ({ count, i })).filter((row) => row.count > 0).sort((a, b) => DATA.cards[b.i].rarity - DATA.cards[a.i].rarity).slice(0, 30);
    const best = run.bestPull;
    return `
      <div class="rs-run-picker"><label><span>Individual Run</span><select data-rs-run-select="${resultKey}">${result.runs.map((_, i) => `<option value="${i}"${i === index ? ' selected' : ''}>Run ${i + 1}</option>`).join('')}</select></label><div><span>Rolls</span><strong>${formatNumber(run.totalRolls)}</strong></div><div><span>Best</span><strong>${best ? `${escapeHtml(borderMaskLabel(best.mask))} ${escapeHtml(DATA.cards[best.cardIndex].name)}` : '—'}</strong></div></div>
      <div class="rs-individual-grid">
        <div><h4>Borders</h4>${DATA.borderNames.map((name, i) => `<p><span>${name}</span><strong>${formatNumber(run.borderTotals[i])}</strong></p>`).join('')}</div>
        <div><h4>Top Card Pulls</h4>${cardRows.map((row) => `<p><span>${escapeHtml(DATA.cards[row.i].name)}</span><strong>${formatNumber(row.count)}</strong></p>`).join('')}</div>
      </div>
    `;
  }

  function scenarioDetailsHtml(result, label, duration, key) {
    return `
      <article class="rs-panel rs-result-panel" data-result-scenario="${key}">
        ${scenarioSummaryHtml(result, label, duration)}
        <div class="rs-result-tabs" data-result-tabs="${key}">
          <button type="button" class="active" data-rs-result-tab="best" data-result-key="${key}">Best Pulls</button>
          <button type="button" data-rs-result-tab="cards" data-result-key="${key}">Card Pulls</button>
          <button type="button" data-rs-result-tab="borders" data-result-key="${key}">Borders Pulled</button>
          <button type="button" data-rs-result-tab="runs" data-result-key="${key}">Individual Runs</button>
        </div>
        <div class="rs-result-body" data-result-body="${key}">
          <section data-result-panel="best">${bestPullTable(result)}</section>
          <section data-result-panel="cards" hidden>${cardPullTable(result, key)}</section>
          <section data-result-panel="borders" hidden>${borderResultsHtml(result)}</section>
          <section data-result-panel="runs" hidden>${individualRunHtml(result, key, 0)}</section>
        </div>
      </article>
    `;
  }

  function compareOverviewHtml(a, b, duration) {
    const metrics = [
      ['Avg Rolls / Run', a.aggregate.averageRolls, b.aggregate.averageRolls, 'number'],
      ['Avg Unique Cards', a.aggregate.averageUniqueCards, b.aggregate.averageUniqueCards, 'decimal'],
      ...DATA.borderNames.map((name, i) => [`Avg ${name}`, a.aggregate.borderTotals[i] / a.aggregate.runs, b.aggregate.borderTotals[i] / b.aggregate.runs, 'decimal']),
    ];
    return `
      <article class="rs-panel rs-compare-overview">
        <div class="rs-panel-head"><div><span>Compare</span><strong>${a.aggregate.runs} runs each × ${formatDuration(duration)}</strong></div></div>
        <div class="rs-table-wrap"><table class="rs-table rs-compare-table"><thead><tr><th>Metric</th><th>Scenario A</th><th>Scenario B</th><th>Difference</th></tr></thead><tbody>${metrics.map(([label, av, bv, type]) => {
          const diff = bv - av;
          const format = (value) => type === 'decimal' ? formatNumber(value, 2) : formatNumber(value);
          return `<tr><td><strong>${label}</strong></td><td>${format(av)}</td><td>${format(bv)}</td><td class="${diff > 0 ? 'rs-positive' : diff < 0 ? 'rs-negative' : ''}">${diff > 0 ? '+' : ''}${format(diff)}</td></tr>`;
        }).join('')}</tbody></table></div>
      </article>
    `;
  }

  function renderResults(message) {
    const root = $('rsResults');
    if (!root) return;
    if (message.scenarios.length >= 2) {
      root.innerHTML = compareOverviewHtml(message.scenarios[0], message.scenarios[1], message.durationSeconds)
        + scenarioDetailsHtml(message.scenarios[0], 'Scenario A', message.durationSeconds, 'A')
        + scenarioDetailsHtml(message.scenarios[1], 'Scenario B', message.durationSeconds, 'B');
    } else {
      root.innerHTML = scenarioDetailsHtml(message.scenarios[0], 'Batch Results', message.durationSeconds, 'A');
    }
  }

  function switchResultTab(key, tab) {
    const panel = q(`[data-result-scenario="${key}"]`);
    if (!panel) return;
    qa('[data-rs-result-tab]', panel).forEach((button) => button.classList.toggle('active', button.dataset.rsResultTab === tab));
    qa('[data-result-panel]', panel).forEach((section) => { section.hidden = section.dataset.resultPanel !== tab; });
  }

  function renderSelectedRun(key, index) {
    if (!state.lastResult) return;
    const scenarioIndex = key === 'B' ? 1 : 0;
    const result = state.lastResult.scenarios?.[scenarioIndex];
    const panel = q(`[data-result-scenario="${key}"] [data-result-panel="runs"]`);
    if (result && panel) panel.innerHTML = individualRunHtml(result, key, index);
  }

  function injectStyles() {
    if ($('roll-simulator-v15-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-simulator-v15-styles';
    style.textContent = `
      #rollSimulatorV15{display:grid;gap:14px;margin-top:16px;color:var(--text)}
      #rollSimulatorV15[hidden]{display:none!important}
      .rs-toolbar,.rs-scenarios,.rs-results{display:grid;gap:14px;min-width:0}
      .rs-scenarios{grid-template-columns:repeat(2,minmax(0,1fr))}
      .rs-scenarios>.rs-scenario:only-child{grid-column:1/-1}
      .rs-panel{min-width:0;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}
      .rs-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .rs-panel-head span{display:block;color:var(--muted);font-size:.62rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
      .rs-panel-head strong{display:block;margin-top:3px;font-size:1rem}
      .rs-settings-grid{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(260px,1fr) minmax(260px,1fr);gap:12px;align-items:end}
      .rs-settings-grid>label,.rs-settings-grid>div{min-width:0}
      .rs-settings-grid label>span,.rs-field-label,.rs-fixed-weather label>span,.rs-weather-structures label>span{display:block;margin-bottom:6px;color:var(--muted);font-size:.65rem;font-weight:800}
      .rs-settings-grid small{display:block;margin-top:5px;color:var(--muted);font-size:.58rem}
      .rs-duration{display:grid;grid-template-columns:minmax(0,1fr) 110px;gap:6px}
      #rollSimulatorV15 input,#rollSimulatorV15 select{min-width:0;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:.75rem;font-weight:750;outline:none}
      #rollSimulatorV15 input:focus,#rollSimulatorV15 select:focus{border-color:var(--blue);box-shadow:0 0 0 2px color-mix(in srgb,var(--blue) 14%,transparent)}
      .rs-segments{display:flex;flex-wrap:wrap;gap:5px;padding:4px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}
      .rs-segments button{flex:1 1 auto;min-height:30px;padding:5px 9px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);font-size:.65rem;font-weight:850;cursor:pointer;white-space:nowrap}
      .rs-segments button.active{border-color:var(--line-2);background:color-mix(in srgb,var(--panel) 84%,var(--blue) 16%);color:#fff}
      .rs-run-bar{display:flex;align-items:center;gap:9px;margin-top:14px}
      .rs-primary,.rs-cancel,.rs-small-btn{border:1px solid var(--line-2);border-radius:8px;font:inherit;font-weight:850;cursor:pointer}
      .rs-primary{min-height:38px;padding:0 18px;background:var(--blue);color:#06101e;border-color:var(--blue)}
      .rs-primary:disabled{opacity:.45;cursor:not-allowed}
      .rs-cancel,.rs-small-btn{min-height:32px;padding:0 11px;background:var(--panel-2);color:var(--text);font-size:.65rem}
      .rs-progress{position:relative;flex:1;min-width:150px;height:34px;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:var(--panel-2)}
      .rs-progress i{position:absolute;inset:0 auto 0 0;width:0;background:color-mix(in srgb,var(--blue) 25%,transparent);transition:width .12s linear}
      .rs-progress span{position:relative;z-index:1;display:grid;place-items:center;height:100%;color:var(--muted);font-size:.63rem;font-weight:850}
      .rs-error{margin-top:10px;padding:9px 11px;border:1px solid color-mix(in srgb,#ff5964 55%,var(--line));border-radius:8px;background:color-mix(in srgb,#ff5964 8%,var(--panel-2));color:#ff9299;font-size:.7rem;font-weight:750}
      .rs-build-summary{display:grid;gap:3px;padding:10px 12px;margin-bottom:14px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      .rs-build-summary strong{font-size:.72rem}.rs-build-summary small,.rs-empty-build{color:var(--muted);font-size:.61rem}
      .rs-subtitle{margin:2px 0 7px;color:var(--muted);font-size:.62rem;font-weight:850;text-transform:uppercase;letter-spacing:.08em}
      .rs-fixed-weather{margin-top:9px}.rs-fixed-weather label{display:grid;grid-template-columns:80px minmax(0,1fr);align-items:center;gap:8px}.rs-fixed-weather label>span{margin:0}
      .rs-schedule{margin-top:9px}.rs-schedule-list{display:grid;gap:6px}.rs-schedule-row{display:grid;grid-template-columns:minmax(120px,1fr) 90px 90px 34px;gap:6px}.rs-schedule-row button{border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-weight:900;cursor:pointer}
      .rs-schedule-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}.rs-schedule-foot small{color:var(--muted);font-size:.58rem;text-align:right}
      .rs-advanced{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.rs-advanced summary{color:var(--muted);font-size:.64rem;font-weight:850;cursor:pointer}.rs-weather-structures{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:9px}.rs-weather-structures label>span{margin-bottom:4px}
      .rs-results{margin-bottom:30px}.rs-empty-results{display:grid;place-items:center;gap:5px;min-height:150px;padding:24px;border:1px dashed var(--line-2);border-radius:16px;color:var(--muted);text-align:center}.rs-empty-results strong{color:var(--text);font-size:.95rem}.rs-empty-results span{max-width:620px;font-size:.7rem}
      .rs-result-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.rs-result-head span{display:block;color:var(--blue);font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.09em}.rs-result-head strong{display:block;margin-top:3px;font-size:1.05rem}
      .rs-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.rs-summary-grid>div{min-width:0;padding:10px 11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.rs-summary-grid span{display:block;color:var(--muted);font-size:.56rem;font-weight:800;text-transform:uppercase}.rs-summary-grid strong{display:block;margin-top:4px;font-size:.78rem;overflow-wrap:anywhere}
      .rs-result-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:14px 0 10px;padding:4px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.rs-result-tabs button{flex:1 1 110px;min-height:31px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);font-size:.63rem;font-weight:850;cursor:pointer}.rs-result-tabs button.active{border-color:var(--line-2);background:var(--panel);color:#fff}
      .rs-table-tools{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.rs-table-tools input{width:min(300px,60%)}.rs-table-tools span{color:var(--muted);font-size:.61rem}
      .rs-table-wrap{width:100%;overflow-x:auto;border:1px solid var(--line);border-radius:10px}.rs-table{width:100%;border-collapse:collapse;min-width:650px}.rs-table th,.rs-table td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.rs-table tr:last-child td{border-bottom:0}.rs-table th{color:var(--muted);background:var(--panel-2);font-size:.55rem;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.rs-table td{font-size:.67rem}.rs-table td>strong{font-size:.7rem}.rs-table td>small,.rs-table td small{color:var(--muted);font-size:.57rem}.rs-table td>strong+small{display:block;margin-top:3px}.rs-row-meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
      .rs-border-badge,.rs-tag{display:inline-block;padding:2px 5px;border:1px solid var(--line);border-radius:5px;background:var(--panel-2);color:var(--muted);font-size:.52rem;font-weight:850}.rs-tag.boss{color:#ff9494}.rs-tag.event{color:#ffd27a}.rs-tag.weather{color:#9fd3ff}.rs-border-badge{color:var(--text)}
      .rs-border-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:8px}.rs-border-stat,.rs-border-none{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.rs-border-stat span,.rs-border-none span{display:block;color:var(--muted);font-size:.58rem;font-weight:850;text-transform:uppercase}.rs-border-stat strong,.rs-border-none strong{display:block;margin-top:3px;font-size:1rem}.rs-border-stat small,.rs-border-none small{display:block;margin-top:2px;color:var(--muted);font-size:.56rem}.rs-border-stat.platinum strong{color:#d6dbe3}.rs-border-stat.crystal strong{color:#a8edff}.rs-border-stat.ruby strong{color:#ff7e9c}.rs-border-stat.galaxy strong{color:#c59cff}.rs-border-none{margin-bottom:8px}
      .rs-run-picker{display:grid;grid-template-columns:minmax(180px,1fr) 140px minmax(180px,1fr);gap:8px;margin-bottom:8px}.rs-run-picker>label,.rs-run-picker>div{padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.rs-run-picker span{display:block;color:var(--muted);font-size:.56rem;font-weight:800;text-transform:uppercase}.rs-run-picker strong{display:block;margin-top:4px;font-size:.7rem;overflow-wrap:anywhere}.rs-run-picker select{width:100%;margin-top:5px}
      .rs-individual-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rs-individual-grid>div{padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.rs-individual-grid h4{margin:0 0 7px;font-size:.68rem}.rs-individual-grid p{display:flex;justify-content:space-between;gap:10px;margin:0;padding:5px 0;border-top:1px solid var(--line);font-size:.61rem}.rs-individual-grid p:first-of-type{border-top:0}.rs-individual-grid p span{color:var(--muted)}
      .rs-compare-overview{background:radial-gradient(circle at 50% 0%,color-mix(in srgb,var(--blue) 8%,transparent),transparent 45%),var(--panel)}.rs-positive{color:#88e3ad}.rs-negative{color:#ff9299}
      .rs-no-data{padding:16px;color:var(--muted);font-size:.7rem;text-align:center}
      @media(max-width:980px){.rs-settings-grid{grid-template-columns:1fr 1fr}.rs-settings-grid>label{grid-column:1/-1}.rs-scenarios{grid-template-columns:1fr}.rs-summary-grid{grid-template-columns:1fr 1fr}.rs-weather-structures{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:620px){.rs-panel{padding:14px}.rs-settings-grid{grid-template-columns:1fr}.rs-panel-head{align-items:flex-start;flex-direction:column}.rs-panel-head .rs-small-btn{width:100%}.rs-duration{grid-template-columns:1fr 100px}.rs-run-bar{flex-wrap:wrap}.rs-primary,.rs-cancel{flex:1}.rs-progress{flex-basis:100%}.rs-schedule-row{grid-template-columns:minmax(0,1fr) 80px}.rs-schedule-row select:nth-of-type(2){grid-column:1}.rs-schedule-row button{grid-column:2;grid-row:2}.rs-schedule-foot{align-items:flex-start;flex-direction:column}.rs-schedule-foot small{text-align:left}.rs-weather-structures{grid-template-columns:1fr 1fr}.rs-summary-grid,.rs-border-grid,.rs-individual-grid,.rs-run-picker{grid-template-columns:1fr}.rs-table-tools{align-items:stretch;flex-direction:column}.rs-table-tools input{width:100%}}
    `;
    document.head.append(style);
  }

  function bind() {
    const switcher = q('.uv-mode-switch');
    if (switcher) {
      switcher.addEventListener('click', (event) => {
        const button = event.target.closest('.uv-mode');
        if (!button) return;
        if (button.dataset.view === 'rollsim') {
          event.preventDefault();
          event.stopPropagation();
          showSimulator();
        } else {
          hideSimulator();
        }
      }, true);
    }

    window.addEventListener('click', (event) => {
      if (event.target?.id !== 'resetBtn' || $('rollSimulatorV15')?.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      resetSimulator();
    }, true);

    $('rollSimulatorV15')?.addEventListener('click', (event) => {
      const action = event.target.closest('[data-rs-action]')?.dataset.rsAction;
      const button = event.target.closest('[data-rs-action]');
      if (!action || !button) return;
      if (action === 'runs') {
        state.runs = Number(button.dataset.runs);
        qa('#rsRunOptions button').forEach((other) => other.classList.toggle('active', other === button));
        saveState();
      } else if (action === 'mode') {
        state.mode = button.dataset.mode === 'compare' ? 'compare' : 'batch';
        qa('[data-rs-action="mode"]').forEach((other) => other.classList.toggle('active', other.dataset.mode === state.mode));
        renderScenarios();
        saveState();
      } else if (action === 'capture') {
        captureScenario(button.dataset.scenario);
      } else if (action === 'weather-mode') {
        const key = button.dataset.scenario;
        const scenario = state.scenarios[key];
        scenario.weatherMode = button.dataset.weatherMode;
        if (scenario.weatherMode === 'schedule' && !scenario.segments.length) scenario.segments.push({ weather: 'Manga', value: 10, unit: 'minute' });
        renderScenarios();
        saveState();
      } else if (action === 'add-segment') {
        const key = button.dataset.scenario;
        if (state.scenarios[key].segments.length < 24) state.scenarios[key].segments.push({ weather: 'Manga', value: 10, unit: 'minute' });
        renderScenarios();
        saveState();
      } else if (action === 'remove-segment') {
        const key = button.dataset.scenario;
        const row = button.closest('.rs-schedule-row');
        state.scenarios[key].segments.splice(Number(row?.dataset.segmentIndex), 1);
        renderScenarios();
        saveState();
      }
    });

    $('rollSimulatorV15')?.addEventListener('input', (event) => {
      if (event.target.id === 'rsDurationValue') syncDurationFromDom();
      if (event.target.dataset.rsField) syncScenarioField(event.target);
      if (event.target.matches('[data-rs-card-search]')) {
        const key = event.target.dataset.rsCardSearch;
        const needle = event.target.value.trim().toLowerCase();
        qa(`[data-rs-card-table="${key}"] tbody tr`).forEach((row) => { row.hidden = !!needle && !row.dataset.cardName.includes(needle); });
      }
    });

    $('rollSimulatorV15')?.addEventListener('change', (event) => {
      if (event.target.id === 'rsDurationUnit' || event.target.id === 'rsDurationValue') syncDurationFromDom();
      if (event.target.dataset.rsField) syncScenarioField(event.target);
      if (event.target.matches('[data-rs-run-select]')) renderSelectedRun(event.target.dataset.rsRunSelect, Number(event.target.value));
    });

    $('rollSimulatorV15')?.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-rs-result-tab]');
      if (tab) switchResultTab(tab.dataset.resultKey, tab.dataset.rsResultTab);
    });

    $('rsRunButton')?.addEventListener('click', runSimulation);
    $('rsCancelButton')?.addEventListener('click', () => {
      stopWorker();
      if ($('rsProgressText')) $('rsProgressText').textContent = 'Cancelled';
    });
  }

  function init() {
    loadState();
    injectStyles();
    buildRoot();
    bind();
    if (!state.scenarios.A.snapshot) captureScenario('A');
    if (!state.scenarios.B.snapshot) captureScenario('B');
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
