(() => {
  const $ = (id) => document.getElementById(id);
  const MAX_ROLLS = 10_000_000_000;
  let worker = null;
  let currentJob = 0;
  let invalidateTimer = null;

  const num = (id) => {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : 0;
  };
  const checked = (id) => !!$(id)?.checked;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
  function trim(value, digits = 2) {
    return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  }
  function compact(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
    if (tier >= suffixes.length) return value.toExponential(2);
    const scaled = value / 1000 ** tier;
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${trim(scaled, digits)}${suffixes[tier]}`;
  }
  function pct(value) {
    const p = Math.max(0, Math.min(1, Number(value) || 0)) * 100;
    if (p >= 99.995) return '100%';
    if (p >= 10) return `${trim(p, 1)}%`;
    if (p >= 1) return `${trim(p, 2)}%`;
    if (p >= 0.01) return `${trim(p, 3)}%`;
    if (p > 0) return `${trim(p, 5)}%`;
    return '0%';
  }
  function durationLabel(seconds) {
    seconds = Math.round(Number(seconds) || 0);
    if (seconds % 86400 === 0) {
      const n = seconds / 86400;
      return `${n} Day${n === 1 ? '' : 's'}`;
    }
    if (seconds % 3600 === 0) {
      const n = seconds / 3600;
      return `${n} Hour${n === 1 ? '' : 's'}`;
    }
    if (seconds % 60 === 0) {
      const n = seconds / 60;
      return `${n} Minute${n === 1 ? '' : 's'}`;
    }
    return `${seconds} Seconds`;
  }
  function thresholdLabel(power) {
    const suffix = { 12:'T', 15:'Qa', 18:'Qi', 21:'Sx', 24:'Sp', 27:'Oc', 30:'No' };
    const group = Math.floor(power / 3) * 3;
    return `${10 ** (power - group)}${suffix[group] || `e${group}`}`;
  }

  function captureBuild() {
    const enabledPacks = Array.isArray(window.__rollSimPackSelectionsV19?.A)
      ? [...window.__rollSimPackSelectionsV19.A]
      : [];
    return {
      rolls: Math.max(0, Math.min(MAX_ROLLS, Math.floor(num('uvRolls')))),
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
      enabledPacks,
      rapture24: !!window.__rollSimRapture24V25?.A,
    };
  }

  function scenarioSettings() {
    const panel = document.querySelector('#rollSimulatorV15 .rs-scenario[data-scenario="A"]');
    const activeWeather = panel?.querySelector('[data-rs-action="weather-mode"].active')?.dataset.weatherMode || 'none';
    const fixed = panel?.querySelector('[data-rs-field="fixed-weather"]')?.value || null;
    const structures = { Snow: 0, Storm: 0, Aurora: 0, Shroud: 0, Chaos: 0 };
    panel?.querySelectorAll('[data-rs-field="weather-structure"]').forEach((select) => {
      const name = select.dataset.structure;
      if (name in structures) structures[name] = Math.max(0, Math.min(5, Math.floor(Number(select.value) || 0)));
    });
    return {
      build: captureBuild(),
      weather: activeWeather === 'fixed' ? fixed : null,
      weatherStructures: structures,
    };
  }

  function durationSeconds() {
    const value = Math.max(0, Number($('rsDurationValue')?.value) || 0);
    const unit = $('rsDurationUnit')?.value || 'hour';
    const mult = unit === 'day' ? 86400 : unit === 'minute' ? 60 : 3600;
    return Math.max(1, Math.min(172800, value * mult));
  }
  function selectedRuns() {
    const active = document.querySelector('#rsRunOptions [data-rs-action="runs"].active');
    return Math.max(1, Math.min(1000, Math.floor(Number(active?.dataset.runs) || 1)));
  }

  function ensurePanel() {
    const results = $('rsResults');
    if (!results) return null;
    let panel = $('rsFastEstimateTestResults');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'rsFastEstimateTestResults';
      panel.className = 'rs-fast-test-results';
      panel.innerHTML = `
        <div class="rs-fast-test-head">
          <div><span>TEST ONLY</span><strong>Fast Estimate</strong><small>Uses probability math instead of storing simulated run histories.</small></div>
        </div>
        <div class="rs-fast-test-empty"><strong>Ready</strong><span>Choose your setup, then click Fast Estimate.</span></div>`;
      results.insertAdjacentElement('beforebegin', panel);
    }
    return panel;
  }

  function render(result) {
    const panel = ensurePanel();
    if (!panel) return;
    const time = durationLabel(result.durationSeconds);
    const runs = result.runs;

    const rarityRows = result.thresholds.map((row) => `
      <tr>
        <td><strong>≥ ${esc(thresholdLabel(row.power))}</strong><small>1 / ${esc(compact(10 ** row.power))}+</small></td>
        <td>${esc(compact(row.expectedPerRun))}</td>
        <td>${esc(pct(row.chancePerRun))}</td>
        <td>${esc(trim(row.chancePerRun * runs, 2))} / ${runs}</td>
        <td>${esc(compact(row.expectedPerRun * runs))}</td>
      </tr>`).join('');

    const comboRows = [...result.combos]
      .sort((a, b) => b.mask - a.mask)
      .map((row) => `<tr><td>${esc(row.label)}</td><td>${esc(compact(row.expectedPerRun))}</td><td>${esc(pct(row.share))}</td><td>${esc(compact(row.expectedTotal))}</td></tr>`)
      .join('');

    const outcomeRows = result.outcomes.length ? result.outcomes.map((row) => {
      const meta = [row.pack, row.weather].filter(Boolean).join(' · ');
      return `<tr>
        <td><strong>${esc(row.card)}</strong>${meta ? `<small>${esc(meta)}</small>` : ''}</td>
        <td>${esc(row.border)}</td>
        <td>1 / ${esc(compact(row.effectiveRarity))}</td>
        <td>${esc(pct(row.chancePerRun))}</td>
        <td>${esc(trim(row.expectedRunsHit, 2))} / ${runs}</td>
        <td>${esc(pct(row.chanceAcrossRuns))}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="6">No outcome reached the display threshold.</td></tr>';

    panel.innerHTML = `
      <div class="rs-fast-test-head">
        <div><span>TEST ONLY</span><strong>Fast Estimate</strong><small>Probability calculation, not random run histories.</small></div>
        <div class="rs-fast-test-summary"><b>${esc(time)}</b><b>${runs} runs</b><b>${esc(compact(result.totalRollsPerRun))} rolls/run</b><b>${esc(trim(result.uniqueExpected,1))} expected card types/run</b></div>
      </div>
      <div class="rs-fast-tabs" role="tablist">
        <button type="button" class="active" data-fast-tab="rarities">Rarities</button>
        <button type="button" data-fast-tab="borders">Borders</button>
        <button type="button" data-fast-tab="highest">Highest Outcomes</button>
      </div>
      <div class="rs-fast-tab-panels">
        <section data-fast-panel="rarities">
          <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Minimum Rarity</th><th>Average Hits in ${esc(time)}</th><th>Chance to Get 1+ in ${esc(time)}</th><th>Expected Runs Hit</th><th>Expected Total in ${runs} Runs</th></tr></thead><tbody>${rarityRows}</tbody></table></div>
        </section>
        <section data-fast-panel="borders" hidden>
          <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Combination</th><th>Average / Run</th><th>Share of Rolls</th><th>Expected Total</th></tr></thead><tbody>${comboRows}</tbody></table></div>
        </section>
        <section data-fast-panel="highest" hidden>
          <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Card</th><th>Border</th><th>Effective Rarity</th><th>Chance / Run</th><th>Expected Runs Hit</th><th>Chance Across All Runs</th></tr></thead><tbody>${outcomeRows}</tbody></table></div>
        </section>
      </div>`;
  }

  function cancelEstimate(markStale = false) {
    currentJob += 1;
    if (worker) {
      try { worker.terminate(); } catch {}
      worker = null;
    }
    const button = $('rsFastEstimateButton');
    if (button) {
      button.disabled = false;
      button.textContent = 'Fast Estimate (TEST)';
    }
    if (markStale) {
      const panel = ensurePanel();
      if (panel) panel.innerHTML = `
        <div class="rs-fast-test-head"><div><span>TEST ONLY</span><strong>Fast Estimate</strong><small>Uses probability math instead of storing simulated run histories.</small></div></div>
        <div class="rs-fast-test-empty"><strong>Settings changed</strong><span>Click Fast Estimate again for the new setup.</span></div>`;
    }
  }

  function scheduleInvalidate() {
    clearTimeout(invalidateTimer);
    invalidateTimer = setTimeout(() => cancelEstimate(true), 180);
  }

  function runEstimate() {
    clearTimeout(invalidateTimer);
    cancelEstimate(false);
    const panel = ensurePanel();
    const button = $('rsFastEstimateButton');
    if (!panel || !button) return;

    const job = ++currentJob;
    worker = new Worker('./fast-estimate-worker-v1.js?rev=20260826-2148');
    button.disabled = true;
    button.textContent = 'Calculating…';
    panel.innerHTML = `
      <div class="rs-fast-test-head"><div><span>TEST ONLY</span><strong>Fast Estimate</strong><small>Probability calculation, not random run histories.</small></div></div>
      <div class="rs-fast-test-empty"><strong>Calculating…</strong><span>This should finish quickly without processing every roll one-by-one.</span></div>`;

    worker.addEventListener('message', (event) => {
      if (job !== currentJob) return;
      const data = event.data || {};
      if (data.type === 'estimate-result') render(data);
      else if (data.type === 'estimate-error') panel.innerHTML = `<div class="rs-fast-test-empty"><strong>Fast Estimate Error</strong><span>${esc(data.message || 'Unknown error')}</span></div>`;
      if (job === currentJob) cancelEstimate(false);
    });
    worker.addEventListener('error', (event) => {
      if (job !== currentJob) return;
      panel.innerHTML = `<div class="rs-fast-test-empty"><strong>Fast Estimate Error</strong><span>${esc(event.message || 'Worker failed to start.')}</span></div>`;
      cancelEstimate(false);
    });
    worker.postMessage({ type:'estimate', durationSeconds: durationSeconds(), runs: selectedRuns(), scenario: scenarioSettings() });
  }

  function groupWeatherOnce() {
    const root = $('rollSimulatorV15');
    if (!root) return false;
    let changed = false;
    root.querySelectorAll('.rs-scenario[data-scenario]').forEach((panel) => {
      if (panel.querySelector(':scope > .rs-fast-weather-section')) return;
      const pack = panel.querySelector(':scope > .rs-pack-section');
      const title = [...panel.children].find((node) => node.classList?.contains('rs-subtitle') && node.textContent.trim() === 'Weather');
      const mode = panel.querySelector(':scope > .rs-weather-mode');
      const fixed = panel.querySelector(':scope > .rs-fixed-weather');
      const structures = panel.querySelector(':scope > .rs-advanced');
      if (!pack || !mode) return;

      const wrap = document.createElement('section');
      wrap.className = 'rs-fast-weather-section';
      wrap.innerHTML = '<div class="rs-fast-category-title">Weather</div>';
      for (const node of [mode, fixed, structures]) if (node) wrap.append(node);
      title?.remove();
      panel.insertBefore(wrap, pack);
      changed = true;
    });
    return changed;
  }

  function arrangeCategoriesWithRetry() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const root = $('rollSimulatorV15');
      const panels = root?.querySelectorAll('.rs-scenario[data-scenario]') || [];
      groupWeatherOnce();
      const ready = panels.length > 0 && [...panels].every((panel) => panel.querySelector(':scope > .rs-fast-weather-section') && panel.querySelector(':scope > .rs-pack-section'));
      if (ready || tries >= 40) clearInterval(timer);
    }, 100);
  }

  function install() {
    const root = $('rollSimulatorV15');
    const runBar = root?.querySelector('.rs-run-bar');
    if (!root || !runBar) return false;

    if (!$('rsFastEstimateButton')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'rsFastEstimateButton';
      button.className = 'rs-fast-test-button';
      button.textContent = 'Fast Estimate (TEST)';
      button.addEventListener('click', runEstimate);
      runBar.insertBefore(button, $('rsCancelButton') || runBar.children[1] || null);
    }

    root.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-fast-tab]');
      if (tab) {
        const key = tab.dataset.fastTab;
        const panel = $('rsFastEstimateTestResults');
        panel?.querySelectorAll('[data-fast-tab]').forEach((button) => button.classList.toggle('active', button === tab));
        panel?.querySelectorAll('[data-fast-panel]').forEach((section) => { section.hidden = section.dataset.fastPanel !== key; });
        return;
      }

      if (event.target.closest('#rsFastEstimateButton')) return;
      if (event.target.closest('[data-rs-action], [data-rs-pack-action]')) scheduleInvalidate();
    });
    root.addEventListener('change', (event) => {
      if (event.target.closest('[data-rs-field], [data-rs-pack], [data-rs-rapture24], #rsDurationUnit, #rsDurationValue')) scheduleInvalidate();
    });
    root.addEventListener('input', (event) => {
      if (event.target.matches('#rsDurationValue')) scheduleInvalidate();
    });

    ensurePanel();
    arrangeCategoriesWithRetry();
    return true;
  }

  const style = document.createElement('style');
  style.id = 'fast-estimate-test-v2-styles';
  style.textContent = `
    #rollSimulatorV15 .rs-fast-test-button{min-height:36px;padding:0 16px;border:1px solid color-mix(in srgb,var(--galaxy,#a78bfa) 60%,var(--line));border-radius:7px;background:color-mix(in srgb,var(--panel) 82%,var(--galaxy,#a78bfa) 18%);color:var(--text);font:inherit;font-size:.66rem;font-weight:900;cursor:pointer}
    #rollSimulatorV15 .rs-fast-test-button:disabled{opacity:.6;cursor:wait}
    #rollSimulatorV15 .rs-fast-weather-section{margin:0 0 14px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
    #rollSimulatorV15 .rs-fast-category-title{margin-bottom:8px;color:var(--text);font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
    #rollSimulatorV15 .rs-fast-weather-section>.rs-advanced{margin-top:10px}
    #rsFastEstimateTestResults{display:grid;gap:10px;margin-top:16px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
    #rsFastEstimateTestResults .rs-fast-test-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
    #rsFastEstimateTestResults .rs-fast-test-head span{display:block;color:var(--muted);font-size:.52rem;font-weight:900;letter-spacing:.08em}
    #rsFastEstimateTestResults .rs-fast-test-head strong{display:block;margin-top:2px;color:var(--text);font-size:.9rem}
    #rsFastEstimateTestResults .rs-fast-test-head small{display:block;margin-top:3px;color:var(--muted);font-size:.56rem}
    #rsFastEstimateTestResults .rs-fast-test-summary{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}
    #rsFastEstimateTestResults .rs-fast-test-summary b{padding:5px 7px;border:1px solid var(--line);border-radius:6px;background:var(--panel-2);font-size:.57rem}
    #rsFastEstimateTestResults .rs-fast-test-empty{min-height:100px;display:grid;place-content:center;gap:5px;text-align:center;color:var(--muted)}
    #rsFastEstimateTestResults .rs-fast-test-empty strong{color:var(--text)}
    #rsFastEstimateTestResults .rs-fast-tabs{display:flex;gap:5px;padding:4px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}
    #rsFastEstimateTestResults .rs-fast-tabs button{flex:1;min-height:31px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);font:inherit;font-size:.6rem;font-weight:900;cursor:pointer}
    #rsFastEstimateTestResults .rs-fast-tabs button.active{border-color:var(--line-2);background:var(--panel);color:var(--text)}
    #rsFastEstimateTestResults [data-fast-panel]{min-width:0}
    #rsFastEstimateTestResults .rs-table td>small{display:block;margin-top:2px;color:var(--muted);font-size:.52rem}
    @media(max-width:700px){#rsFastEstimateTestResults .rs-fast-test-head{display:block}#rsFastEstimateTestResults .rs-fast-test-summary{justify-content:flex-start;margin-top:8px}#rsFastEstimateTestResults .rs-fast-tabs{display:grid;grid-template-columns:1fr}}
  `;
  document.head.append(style);

  if (!install()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries >= 120) clearInterval(timer);
    }, 50);
  }
})();
