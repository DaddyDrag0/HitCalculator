(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

  function fmt(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value), suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
    if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= suffixes.length) return value.toExponential(2);
    const scaled = value / 1000 ** tier, digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
    return `${scaled.toFixed(digits).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1')}${suffixes[tier]}`;
  }
  function maskLabel(mask) {
    if (!mask) return 'No Border';
    const names = [];
    for (let i = 0; i < DATA.borderNames.length; i += 1) if (mask & (1 << i)) names.push(DATA.borderNames[i]);
    return names.join(' + ');
  }
  function maskMultiplier(mask) {
    let value = 1;
    for (let i = 0; i < DATA.borderNames.length; i += 1) if (mask & (1 << i)) value *= DATA.borders[DATA.borderNames[i]].multiplier;
    return value;
  }
  function bestMaskForCard(aggregate, cardIndex) {
    let mask = 0, effective = -1, count = 0;
    for (let m = 0; m < 16; m += 1) {
      const hits = Number(aggregate.cardMasks?.[cardIndex]?.[m]) || 0;
      if (!hits) continue;
      const next = DATA.cards[cardIndex].rarity * maskMultiplier(m);
      if (next > effective) { effective = next; mask = m; count = hits; }
    }
    return { mask, effective, count };
  }
  function meta(card) {
    return [card.pack === 'Era2' ? 'Era 2' : card.pack, card.weather, card.sin ? 'Boss' : '', card.currentEvent ? 'Current Event' : ''].filter(Boolean).join(' · ');
  }
  function buildMarkup(result) {
    const a = result.aggregate, cards = [];
    for (let i = 0; i < DATA.cards.length; i += 1) {
      const total = Number(a.cardTotals?.[i]) || 0;
      if (total) cards.push({ i, total, ...bestMaskForCard(a, i) });
    }
    const rows = cards.sort((x, y) => y.effective - x.effective || DATA.cards[y.i].rarity - DATA.cards[x.i].rarity).slice(0, 15);
    return `<div class="rs25-best-block"><div class="rs25-best-title"><strong>Best Pulls</strong><small>One entry per card, ranked by the best bordered version pulled.</small></div><div class="rs-table-wrap"><table class="rs-table"><thead><tr><th>Card</th><th>Best Border</th><th>Best Effective Rarity</th><th>Total Pulled</th></tr></thead><tbody>${rows.map((row)=>{const card=DATA.cards[row.i];return `<tr><td><strong>${esc(card.name)}</strong><small>${esc(meta(card))}</small></td><td>${esc(maskLabel(row.mask))}</td><td>1 / ${fmt(row.effective)}</td><td>${fmt(row.total)}</td></tr>`;}).join('')}</tbody></table></div></div>`;
  }
  function patch() {
    if (!DATA) return;
    const root = $('rollSimulatorV15'), payload = window.__rollSimLastResultV21, result = payload?.scenarios?.[0];
    const panel = root?.querySelector('.rs-result-panel[data-result-scenario="A"] [data-result-panel="best"]');
    if (!result || !panel) return;
    const stamp = String(payload.jobId ?? 'result');
    if (panel.dataset.rsBestV25 === stamp) return;
    panel.dataset.rsBestV25 = stamp;
    panel.innerHTML = buildMarkup(result);
  }
  function styles() {
    if ($('roll-sim-best-pulls-v25-styles')) return;
    const style = document.createElement('style');
    style.id = 'roll-sim-best-pulls-v25-styles';
    style.textContent = `#rollSimulatorV15 .rs25-best-block{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}#rollSimulatorV15 .rs25-best-title{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px}#rollSimulatorV15 .rs25-best-title strong{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em}#rollSimulatorV15 .rs25-best-title small{color:var(--muted);font-size:.55rem}#rollSimulatorV15 .rs25-best-block td small{display:block;margin-top:2px;color:var(--muted);font-size:.52rem}@media(max-width:650px){#rollSimulatorV15 .rs25-best-title{display:block}#rollSimulatorV15 .rs25-best-title small{display:block;margin-top:3px}}`;
    document.head.append(style);
  }
  function attach() {
    const root = $('rollSimulatorV15'), results = $('rsResults');
    if (!root || !results) return false;
    styles();
    let scheduled = false;
    new MutationObserver(() => { if (scheduled) return; scheduled = true; queueMicrotask(() => { scheduled = false; patch(); }); }).observe(results, { childList:true, subtree:true });
    patch();
    return true;
  }
  if (!attach()) { let attempts = 0; const timer = setInterval(() => { attempts += 1; if (attach() || attempts >= 100) clearInterval(timer); }, 50); }
})();
