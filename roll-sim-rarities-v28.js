(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!DATA?.cards?.length) return;

  const $ = (id) => document.getElementById(id);
  const START_POWER = 13; // 10T
  const MAX_POWER = 30;  // 1No

  const SUFFIX = {
    12: 'T',
    15: 'Qa',
    18: 'Qi',
    21: 'Sx',
    24: 'Sp',
    27: 'Oc',
    30: 'No',
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }

  function trim(value, digits = 2) {
    return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  }

  function compact(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
    const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
    if (tier >= suffixes.length) return value.toExponential(2);
    const scaled = value / 1000 ** tier;
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${trim(scaled, digits)}${suffixes[tier]}`;
  }

  function thresholdLabel(power) {
    const group = Math.floor(power / 3) * 3;
    const suffix = SUFFIX[group];
    if (!suffix) return `1e${power}`;
    const lead = 10 ** (power - group);
    return `${lead}${suffix}`;
  }

  function durationLabel(seconds) {
    const total = Math.max(1, Math.round(Number(seconds) || 1));
    if (total % 86400 === 0) {
      const value = total / 86400;
      return `${value} Day${value === 1 ? '' : 's'}`;
    }
    if (total % 3600 === 0) {
      const value = total / 3600;
      return `${value} Hour${value === 1 ? '' : 's'}`;
    }
    if (total % 60 === 0) {
      const value = total / 60;
      return `${value} Minute${value === 1 ? '' : 's'}`;
    }
    return `${total} Second${total === 1 ? '' : 's'}`;
  }

  function averageHitsText(value) {
    const average = Number(value) || 0;
    if (average >= 1000) return compact(average);
    if (average >= 1) return trim(average, 2);
    if (average >= 0.1) return trim(average, 2);
    if (average >= 0.01) return trim(average, 3);
    if (average > 0) return trim(average, 4);
    return '0';
  }

  function maskMultiplier(mask) {
    let multiplier = 1;
    for (let i = 0; i < DATA.borderNames.length; i += 1) {
      if (mask & (1 << i)) multiplier *= DATA.borders[DATA.borderNames[i]].multiplier;
    }
    return multiplier;
  }

  function thresholdCount(cardMasks, threshold) {
    let total = 0;
    for (let i = 0; i < DATA.cards.length; i += 1) {
      const masks = cardMasks?.[i];
      if (!masks) continue;
      const rarity = Number(DATA.cards[i].rarity) || 0;
      for (let mask = 0; mask < 16; mask += 1) {
        const count = Number(masks[mask]) || 0;
        if (count && rarity * maskMultiplier(mask) >= threshold) total += count;
      }
    }
    return total;
  }

  function runThresholdCount(run, threshold) {
    return thresholdCount(run?.cardMasks, threshold);
  }

  function highestObservedEffective(aggregate) {
    let max = 0;
    for (let i = 0; i < DATA.cards.length; i += 1) {
      const masks = aggregate?.cardMasks?.[i];
      if (!masks) continue;
      const rarity = Number(DATA.cards[i].rarity) || 0;
      for (let mask = 0; mask < 16; mask += 1) {
        if ((Number(masks[mask]) || 0) > 0) max = Math.max(max, rarity * maskMultiplier(mask));
      }
    }
    return max;
  }

  function thresholdsFor(aggregate) {
    const max = highestObservedEffective(aggregate);
    const maxPower = max > 0 ? Math.min(MAX_POWER, Math.max(START_POWER + 2, Math.floor(Math.log10(max)) + 1)) : START_POWER + 5;
    return Array.from({ length: maxPower - START_POWER + 1 }, (_, index) => START_POWER + index);
  }

  function buildMarkup(result, durationSeconds) {
    const aggregate = result?.aggregate;
    const runs = Array.isArray(result?.runs) ? result.runs.filter(Boolean) : [];
    const runCount = Math.max(1, Number(aggregate?.runs) || runs.length || 1);
    if (!aggregate) return '<div class="rs-rarity-empty">Run a simulation to see rarity results.</div>';

    const time = durationLabel(durationSeconds);
    const rows = thresholdsFor(aggregate).map((power) => {
      const threshold = 10 ** power;
      const total = thresholdCount(aggregate.cardMasks, threshold);
      const average = total / runCount;
      let hitRuns = 0;
      for (const run of runs) if (runThresholdCount(run, threshold) > 0) hitRuns += 1;
      const chance = runs.length ? hitRuns / runs.length : (average > 0 ? Math.min(1, average) : 0);
      const chanceText = `${trim(chance * 100, chance * 100 >= 10 ? 1 : 2)}%`;
      return { power, threshold, total, average, averageText: averageHitsText(average), chanceText };
    });

    return `
      <div class="rs28-rarity-card">
        <div class="rs28-rarity-head">
          <div><strong>Rarity Results</strong><small>Uses the card's final rarity after borders.</small></div>
          <div class="rs28-rarity-note">Average Hits = usual amount in ${esc(time)}. Chance = chance you get at least one in ${esc(time)}.</div>
        </div>
        <div class="rs-table-wrap">
          <table class="rs-table rs28-rarity-table">
            <thead><tr><th>Minimum Rarity</th><th>Average Hits in ${esc(time)}</th><th>Chance to Get 1+ in ${esc(time)}</th><th>Total Hits in ${runCount} Run${runCount === 1 ? '' : 's'}</th></tr></thead>
            <tbody>${rows.map((row) => `<tr>
              <td><strong>≥ ${esc(thresholdLabel(row.power))}</strong><small>1 / ${esc(compact(row.threshold))}+</small></td>
              <td>${esc(row.averageText)}</td>
              <td>${esc(row.chanceText)}</td>
              <td>${esc(compact(row.total))}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  function ensureUi(panel) {
    const tabs = panel.querySelector('.rs-result-tabs');
    const body = panel.querySelector('.rs-result-body');
    if (!tabs || !body) return null;

    let button = tabs.querySelector('[data-rs-result-tab="rarities"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.rsResultTab = 'rarities';
      button.textContent = 'Rarities';
      const best = tabs.querySelector('[data-rs-result-tab="best"]');
      if (best) tabs.insertBefore(button, best);
      else tabs.append(button);
    }

    let section = body.querySelector('[data-result-panel="rarities"]');
    if (!section) {
      section = document.createElement('section');
      section.className = 'rs-result-section';
      section.dataset.resultPanel = 'rarities';
      section.hidden = true;
      const bestPanel = body.querySelector('[data-result-panel="best"]');
      if (bestPanel) body.insertBefore(section, bestPanel);
      else body.append(section);
    }
    return section;
  }

  function render() {
    const root = $('rollSimulatorV15');
    const payload = window.__rollSimLastResultV21;
    if (!root || !payload) return;
    const panel = root.querySelector('.rs-result-panel[data-result-scenario="A"]');
    const result = payload.scenarios?.[0];
    if (!panel || !result) return;
    const section = ensureUi(panel);
    if (!section) return;
    const stamp = `${payload.jobId ?? 'result'}-${payload.durationSeconds ?? 0}`;
    if (section.dataset.rsRarityV28 === stamp) return;
    section.dataset.rsRarityV28 = stamp;
    section.innerHTML = buildMarkup(result, payload.durationSeconds);
  }

  function handleTabClick(event) {
    const button = event.target.closest('[data-rs-result-tab]');
    if (!button) return;
    const panel = button.closest('.rs-result-panel[data-result-scenario]');
    if (!panel) return;
    const key = button.dataset.rsResultTab;
    const tabs = panel.querySelectorAll('.rs-result-tabs [data-rs-result-tab]');
    const sections = panel.querySelectorAll('.rs-result-body [data-result-panel]');
    if (key === 'rarities') {
      tabs.forEach((node) => node.classList.toggle('active', node === button));
      sections.forEach((node) => { node.hidden = node.dataset.resultPanel !== 'rarities'; });
    } else {
      const rarity = panel.querySelector('[data-result-panel="rarities"]');
      if (rarity) rarity.hidden = true;
    }
  }

  function styles() {
    if ($('roll-sim-rarities-v28-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-sim-rarities-v28-styles';
    style.textContent = `
      #rollSimulatorV15 .rs28-rarity-card{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      #rollSimulatorV15 .rs28-rarity-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:10px}
      #rollSimulatorV15 .rs28-rarity-head strong{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}
      #rollSimulatorV15 .rs28-rarity-head small,#rollSimulatorV15 .rs28-rarity-note{color:var(--muted);font-size:.55rem}
      #rollSimulatorV15 .rs28-rarity-head small{display:block;margin-top:3px}
      #rollSimulatorV15 .rs28-rarity-note{max-width:500px;text-align:right}
      #rollSimulatorV15 .rs28-rarity-table td:first-child strong{display:block}
      #rollSimulatorV15 .rs28-rarity-table td:first-child small{display:block;margin-top:2px;color:var(--muted);font-size:.52rem}
      #rollSimulatorV15 .rs-rarity-empty{padding:16px;color:var(--muted);text-align:center}
      @media(max-width:700px){#rollSimulatorV15 .rs28-rarity-head{display:block}#rollSimulatorV15 .rs28-rarity-note{margin-top:5px;text-align:left;max-width:none}}
    `;
    document.head.append(style);
  }

  function attach() {
    const root = $('rollSimulatorV15');
    const results = $('rsResults');
    if (!root || !results) return false;
    styles();
    root.addEventListener('click', handleTabClick, true);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; render(); });
    }).observe(results, { childList:true, subtree:true });
    render();
    return true;
  }

  if (!attach()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (attach() || tries >= 100) clearInterval(timer);
    }, 50);
  }
})();
