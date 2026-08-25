(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  const root = document.getElementById('rollSimulatorV15');
  if (!DATA || !root) return;

  const RUNS = [1, 50, 100, 500, 1000];
  const RUN_STORAGE = 'hitCalcRollSimRunsV21';
  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatNumber(value, decimals = 0) {
    value = Number(value);
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

  function percent(value) {
    const p = Math.max(0, Number(value) || 0) * 100;
    if (p === 0) return '0%';
    if (p < 0.001) return `${p.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}%`;
    if (p < 0.1) return `${p.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`;
    if (p < 10) return `${p.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
    return `${p.toFixed(1).replace(/\.0$/, '')}%`;
  }

  function perRun(value) {
    value = Math.max(0, Number(value) || 0);
    return value < 1 ? `${percent(value)} chance per run` : `${formatNumber(value, 2)} average per run`;
  }

  function maskLabel(mask) {
    if (!mask) return 'No Border';
    const out = [];
    for (let i = DATA.borderNames.length - 1; i >= 0; i -= 1) if (mask & (1 << i)) out.push(DATA.borderNames[i]);
    return out.join(' + ');
  }

  function maskMultiplier(mask) {
    let value = 1;
    for (let i = 0; i < DATA.borderNames.length; i += 1) {
      if (mask & (1 << i)) value *= DATA.borders[DATA.borderNames[i]].multiplier;
    }
    return value;
  }

  function forceAverageMode() {
    const batch = root.querySelector('[data-rs-action="mode"][data-mode="batch"]');
    if (batch && !batch.classList.contains('active')) batch.click();
    const modeLabel = [...root.querySelectorAll('.rs-field-label')].find((el) => el.textContent.trim().toLowerCase() === 'mode');
    modeLabel?.parentElement?.remove();
  }

  function selectedRuns() {
    try {
      const saved = Number(localStorage.getItem(RUN_STORAGE));
      if (RUNS.includes(saved)) return saved;
    } catch {}
    return 50;
  }

  function installRunOptions() {
    const wrap = $('rsRunOptions');
    if (!wrap || wrap.dataset.rsV21 === '1') return;
    const chosen = selectedRuns();
    wrap.innerHTML = RUNS.map((value) => `<button type="button" data-rs-action="runs" data-runs="${value}" class="${value === chosen ? 'active' : ''}">${value}</button>`).join('');
    wrap.dataset.rsV21 = '1';
    const button = wrap.querySelector(`[data-runs="${chosen}"]`);
    if (button) button.click();
  }

  function saveRunChoice(event) {
    const button = event.target.closest('#rsRunOptions [data-runs]');
    if (!button) return;
    const value = Number(button.dataset.runs);
    if (!RUNS.includes(value)) return;
    try { localStorage.setItem(RUN_STORAGE, String(value)); } catch {}
  }

  function rebuildBorderResults(panel, result) {
    if (!panel || panel.dataset.rsV21 === '1') return;
    panel.dataset.rsV21 = '1';
    const a = result.aggregate;
    const runs = Math.max(1, Number(a.runs) || 1);
    const borderCards = DATA.borderNames.map((name, index) => {
      const total = Number(a.borderTotals?.[index]) || 0;
      return `<div class="rs-border-stat ${name.toLowerCase()}"><span>${name}</span><strong>${formatNumber(total)}</strong><small>${perRun(total / runs)}</small></div>`;
    }).join('');

    const combos = [];
    for (let mask = 1; mask < 16; mask += 1) {
      const total = Number(a.comboTotals?.[mask]) || 0;
      if (total > 0) combos.push({ mask, total });
    }
    combos.sort((x, y) => y.total - x.total);
    const noBorder = Number(a.comboTotals?.[0]) || 0;

    panel.innerHTML = `
      <div class="rs-border-grid">${borderCards}</div>
      <div class="rs-border-none"><span>No Border</span><strong>${formatNumber(noBorder)}</strong><small>${perRun(noBorder / runs)}</small></div>
      <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Border Combination</th><th>Total</th><th>Per Run</th></tr></thead><tbody>
        ${combos.map((row) => `<tr><td><strong>${escapeHtml(maskLabel(row.mask))}</strong></td><td>${formatNumber(row.total)}</td><td>${perRun(row.total / runs)}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  function bestObservedMask(run, cardIndex) {
    let bestMask = 0;
    let bestEffective = -1;
    const masks = run.cardMasks?.[cardIndex] || [];
    for (let mask = 0; mask < 16; mask += 1) {
      if (!(Number(masks[mask]) > 0)) continue;
      const effective = DATA.cards[cardIndex].rarity * maskMultiplier(mask);
      if (effective > bestEffective) {
        bestEffective = effective;
        bestMask = mask;
      }
    }
    return { mask: bestMask, effective: bestEffective };
  }

  function individualRunMarkup(result, index) {
    const runs = result.runs || [];
    index = Math.max(0, Math.min(runs.length - 1, Number(index) || 0));
    const run = runs[index];
    if (!run) return '<div class="rs-no-data">No individual run data.</div>';

    const totalRolls = Math.max(1, Number(run.totalRolls) || 0);
    const noBorder = Number(run.comboTotals?.[0]) || 0;
    const bordered = Math.max(0, totalRolls - noBorder);
    const best = run.bestPull;
    const bestText = best ? `${maskLabel(best.mask)} ${DATA.cards[best.cardIndex]?.name || ''}` : '—';

    const comboRows = [];
    for (let mask = 0; mask < 16; mask += 1) {
      const count = Number(run.comboTotals?.[mask]) || 0;
      if (count > 0) comboRows.push({ mask, count });
    }
    comboRows.sort((a, b) => b.count - a.count);

    const cardRows = [];
    for (let i = 0; i < DATA.cards.length; i += 1) {
      const count = Number(run.cardTotals?.[i]) || 0;
      if (!count) continue;
      const observed = bestObservedMask(run, i);
      cardRows.push({ i, count, ...observed });
    }
    cardRows.sort((a, b) => b.effective - a.effective || DATA.cards[b.i].rarity - DATA.cards[a.i].rarity);

    const weatherRows = Object.entries(run.weatherRolls || {}).sort((a, b) => b[1] - a[1]);

    return `
      <div class="rs-run-picker rs-v21-run-picker">
        <label><span>Individual Run</span><select data-rs-v21-run-select>${runs.map((_, i) => `<option value="${i}"${i === index ? ' selected' : ''}>Run ${i + 1}</option>`).join('')}</select></label>
        <div><span>Total Rolls</span><strong>${formatNumber(run.totalRolls)}</strong></div>
        <div><span>Unique Card Types</span><strong>${formatNumber(run.uniqueCards)}</strong></div>
        <div><span>Best Pull</span><strong>${escapeHtml(bestText)}</strong></div>
      </div>

      <div class="rs-v21-summary-grid">
        <div><span>Bordered Cards</span><strong>${formatNumber(bordered)}</strong><small>${percent(bordered / totalRolls)} of rolls</small></div>
        <div><span>No Border</span><strong>${formatNumber(noBorder)}</strong><small>${percent(noBorder / totalRolls)} of rolls</small></div>
        <div><span>Seed</span><strong>${escapeHtml(run.seed ?? '—')}</strong><small>RNG seed for this run</small></div>
      </div>

      <div class="rs-v21-section-title">Borders Pulled</div>
      <div class="rs-border-grid">${DATA.borderNames.map((name, i) => {
        const count = Number(run.borderTotals?.[i]) || 0;
        return `<div class="rs-border-stat ${name.toLowerCase()}"><span>${name}</span><strong>${formatNumber(count)}</strong><small>${percent(count / totalRolls)} of rolls</small></div>`;
      }).join('')}</div>

      <div class="rs-v21-section-title">Border Combinations</div>
      <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Combination</th><th>Pulls</th><th>Share of Rolls</th></tr></thead><tbody>
        ${comboRows.map((row) => `<tr><td><strong>${escapeHtml(maskLabel(row.mask))}</strong></td><td>${formatNumber(row.count)}</td><td>${percent(row.count / totalRolls)}</td></tr>`).join('')}
      </tbody></table></div>

      <div class="rs-v21-section-title">Notable Card Pulls</div>
      <div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Card</th><th>Base Rarity</th><th>Total Pulls</th><th>Best Border Seen</th><th>Best Effective Pull</th></tr></thead><tbody>
        ${cardRows.slice(0, 30).map((row) => {
          const card = DATA.cards[row.i];
          return `<tr><td><strong>${escapeHtml(card.name)}</strong></td><td>1 / ${formatNumber(card.rarity)}</td><td>${formatNumber(row.count)}</td><td>${escapeHtml(maskLabel(row.mask))}</td><td>1 / ${formatNumber(row.effective)}</td></tr>`;
        }).join('')}
      </tbody></table></div>

      ${weatherRows.length ? `<div class="rs-v21-section-title">Rolls by Weather</div><div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Weather</th><th>Rolls</th><th>Share</th></tr></thead><tbody>${weatherRows.map(([weather, count]) => `<tr><td><strong>${escapeHtml(weather)}</strong></td><td>${formatNumber(count)}</td><td>${percent(count / totalRolls)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    `;
  }

  function rebuildIndividual(panel, result) {
    if (!panel || panel.dataset.rsV21 === '1') return;
    panel.dataset.rsV21 = '1';
    panel.innerHTML = individualRunMarkup(result, 0);
  }

  function patchResults() {
    const payload = window.__rollSimLastResultV21;
    const result = payload?.scenarios?.[0];
    if (!result) return;
    const scenarioPanel = root.querySelector('.rs-result-panel[data-result-scenario="A"]');
    if (!scenarioPanel) return;

    const heading = scenarioPanel.querySelector('.rs-result-head span');
    if (heading && heading.textContent.trim() === 'Batch Results') heading.textContent = 'Average Results';

    rebuildBorderResults(scenarioPanel.querySelector('[data-result-panel="borders"]'), result);
    rebuildIndividual(scenarioPanel.querySelector('[data-result-panel="runs"]'), result);
  }

  function installStyles() {
    if ($('roll-sim-simplify-v21-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-sim-simplify-v21-styles';
    style.textContent = `
      #rollSimulatorV15 .rs-settings-grid{grid-template-columns:minmax(220px,.8fr) minmax(360px,1.2fr)!important}
      #rollSimulatorV15 .rs-v21-run-picker{grid-template-columns:minmax(190px,1fr) repeat(3,minmax(150px,1fr))}
      #rollSimulatorV15 .rs-v21-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 0 14px}
      #rollSimulatorV15 .rs-v21-summary-grid>div{padding:10px 11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      #rollSimulatorV15 .rs-v21-summary-grid span{display:block;color:var(--muted);font-size:.56rem;font-weight:800;text-transform:uppercase}
      #rollSimulatorV15 .rs-v21-summary-grid strong{display:block;margin-top:4px;font-size:.78rem;overflow-wrap:anywhere}
      #rollSimulatorV15 .rs-v21-summary-grid small{display:block;margin-top:3px;color:var(--muted);font-size:.55rem}
      #rollSimulatorV15 .rs-v21-section-title{margin:15px 0 7px;color:var(--text);font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
      @media(max-width:900px){#rollSimulatorV15 .rs-settings-grid{grid-template-columns:1fr!important}#rollSimulatorV15 .rs-v21-run-picker{grid-template-columns:1fr 1fr}#rollSimulatorV15 .rs-v21-summary-grid{grid-template-columns:1fr}}
      @media(max-width:560px){#rollSimulatorV15 .rs-v21-run-picker{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function setup() {
    forceAverageMode();
    installRunOptions();
    installStyles();
    patchResults();
  }

  root.addEventListener('click', saveRunChoice, true);
  root.addEventListener('change', (event) => {
    const select = event.target.closest('[data-rs-v21-run-select]');
    if (!select) return;
    const payload = window.__rollSimLastResultV21;
    const result = payload?.scenarios?.[0];
    const panel = root.querySelector('.rs-result-panel[data-result-scenario="A"] [data-result-panel="runs"]');
    if (result && panel) panel.innerHTML = individualRunMarkup(result, Number(select.value));
  });

  window.addEventListener('click', (event) => {
    if (event.target?.id !== 'resetBtn' || root.hidden) return;
    setTimeout(() => {
      try { localStorage.setItem(RUN_STORAGE, '50'); } catch {}
      const wrap = $('rsRunOptions');
      if (wrap) {
        wrap.dataset.rsV21 = '';
        installRunOptions();
      }
    }, 0);
  }, true);

  setup();
  const results = $('rsResults');
  if (results) {
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        patchResults();
      });
    }).observe(results, { childList: true });
  }
})();
