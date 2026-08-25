(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  const root = document.getElementById('rollSimulatorV15');
  if (!DATA || !root) return;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function fmt(value, decimals = 0) {
    value = Number(value);
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value), s = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= s.length) return value.toExponential(2);
    const n = value / 1000 ** tier, d = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
    return `${n.toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1')}${s[tier]}`;
  }
  function pct(value) {
    const p = Math.max(0, Number(value) || 0) * 100;
    if (!p) return '0%';
    if (p < .01) return `${p.toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}%`;
    if (p < 1) return `${p.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}%`;
    return `${p.toFixed(1).replace(/\.0$/,'')}%`;
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
  function bestMask(run, cardIndex) {
    let mask = 0, effective = DATA.cards[cardIndex]?.rarity || 0;
    for (let m = 0; m < 16; m += 1) {
      if (!(Number(run.cardMasks?.[cardIndex]?.[m]) > 0)) continue;
      const next = (DATA.cards[cardIndex]?.rarity || 0) * maskMultiplier(m);
      if (next > effective) { effective = next; mask = m; }
    }
    return mask;
  }
  function markup(result, index) {
    const runs = result?.runs || [];
    if (!runs.length) return '<div class="rs-no-data">No individual run data.</div>';
    index = Math.max(0, Math.min(runs.length - 1, Number(index) || 0));
    const run = runs[index], total = Math.max(1, Number(run.totalRolls) || 0), best = run.bestPull;
    const bestCard = best ? DATA.cards[best.cardIndex] : null;
    const bestText = bestCard ? `${maskLabel(best.mask)} ${bestCard.name}` : '—';

    const combos = [];
    for (let mask = 0; mask < 16; mask += 1) {
      const count = Number(run.comboTotals?.[mask]) || 0;
      if (count > 0) combos.push({ mask, count });
    }
    combos.sort((a, b) => b.count - a.count);

    const cards = [];
    for (let i = 0; i < DATA.cards.length; i += 1) {
      const count = Number(run.cardTotals?.[i]) || 0;
      if (!count) continue;
      cards.push({ i, count, mask: bestMask(run, i) });
    }
    cards.sort((a, b) => (DATA.cards[b.i]?.rarity || 0) - (DATA.cards[a.i]?.rarity || 0) || b.count - a.count);

    const noBorder = Number(run.comboTotals?.[0]) || 0;
    return `
      <div class="rs26-summary">
        <label><span>Run</span><select data-rs-v26-run-select>${runs.map((_,i)=>`<option value="${i}"${i===index?' selected':''}>Run ${i+1}</option>`).join('')}</select></label>
        <div><span>Total Rolls</span><strong>${fmt(run.totalRolls)}</strong></div>
        <div><span>Card Types Pulled</span><strong>${fmt(run.uniqueCards)}</strong></div>
        <div><span>Best Pull</span><strong>${esc(bestText)}</strong></div>
      </div>

      <section class="rs26-section">
        <div class="rs26-title"><strong>Borders</strong><small>Border totals for this run</small></div>
        <div class="rs26-border-grid">
          ${DATA.borderNames.map((name,i)=>{const count=Number(run.borderTotals?.[i])||0;return `<div class="rs26-border ${name.toLowerCase()}"><span>${name}</span><strong>${fmt(count)}</strong><small>${pct(count/total)}</small></div>`;}).join('')}
          <div class="rs26-border"><span>No Border</span><strong>${fmt(noBorder)}</strong><small>${pct(noBorder/total)}</small></div>
        </div>
      </section>

      <section class="rs26-section">
        <div class="rs26-title"><strong>Border Combinations</strong><small>Exact combinations on cards</small></div>
        <div class="rs26-table-wrap"><table class="rs26-table"><thead><tr><th>Combination</th><th>Pulled</th><th>Share</th></tr></thead><tbody>
          ${combos.map(row=>`<tr><td>${esc(maskLabel(row.mask))}</td><td>${fmt(row.count)}</td><td>${pct(row.count/total)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>

      <section class="rs26-section">
        <div class="rs26-title"><strong>All Cards Pulled</strong><small>${cards.length} different cards · sorted by base rarity</small></div>
        <div class="rs26-card-tools"><input type="search" placeholder="Search cards" data-rs-v26-card-search></div>
        <div class="rs26-table-wrap rs26-card-scroll"><table class="rs26-table" data-rs-v26-card-table><thead><tr><th>Card</th><th>Base Rarity</th><th>Pulled</th><th>Best Border Seen</th></tr></thead><tbody>
          ${cards.map(row=>{const card=DATA.cards[row.i];return `<tr data-card-name="${esc(card.name.toLowerCase())}"><td><strong>${esc(card.name)}</strong></td><td>1 / ${fmt(card.rarity)}</td><td>${fmt(row.count)}</td><td>${esc(maskLabel(row.mask))}</td></tr>`;}).join('')}
        </tbody></table></div>
      </section>`;
  }
  function panel(){return root.querySelector('.rs-result-panel[data-result-scenario="A"] [data-result-panel="runs"]');}
  function patch(index=0, force=false){const result=window.__rollSimLastResultV21?.scenarios?.[0],target=panel();if(!result||!target)return;if(!force&&target.dataset.rsRunV26===String(window.__rollSimLastResultV21?.jobId??'result'))return;target.dataset.rsV21='1';target.dataset.rsRunV26=String(window.__rollSimLastResultV21?.jobId??'result');target.innerHTML=markup(result,index);}
  function styles(){if($('roll-sim-run-ui-v26-styles'))return;const style=document.createElement('style');style.id='roll-sim-run-ui-v26-styles';style.textContent=`
    #rollSimulatorV15 .rs26-summary{display:grid;grid-template-columns:150px 150px 170px minmax(220px,1fr);gap:7px;margin-bottom:9px}
    #rollSimulatorV15 .rs26-summary>*{min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}
    #rollSimulatorV15 .rs26-summary span,#rollSimulatorV15 .rs26-border span{display:block;color:var(--muted);font-size:.54rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
    #rollSimulatorV15 .rs26-summary strong{display:block;margin-top:4px;font-size:.76rem;overflow-wrap:anywhere}
    #rollSimulatorV15 .rs26-summary select{width:100%;height:29px;margin-top:4px;padding:0 7px;font-size:.65rem}
    #rollSimulatorV15 .rs26-section{margin-top:8px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
    #rollSimulatorV15 .rs26-title{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px}
    #rollSimulatorV15 .rs26-title strong{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em}#rollSimulatorV15 .rs26-title small{color:var(--muted);font-size:.54rem}
    #rollSimulatorV15 .rs26-border-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
    #rollSimulatorV15 .rs26-border{padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}#rollSimulatorV15 .rs26-border strong{display:block;margin-top:4px;font-size:.8rem}#rollSimulatorV15 .rs26-border small{display:block;margin-top:2px;color:var(--muted);font-size:.52rem}
    #rollSimulatorV15 .rs26-border.platinum strong{color:var(--platinum,#d9e7ef)}#rollSimulatorV15 .rs26-border.crystal strong{color:var(--crystal,#79e6ff)}#rollSimulatorV15 .rs26-border.ruby strong{color:var(--ruby,#ff5b78)}#rollSimulatorV15 .rs26-border.galaxy strong{color:var(--galaxy,#a78bfa)}
    #rollSimulatorV15 .rs26-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel)}#rollSimulatorV15 .rs26-card-scroll{max-height:520px}
    #rollSimulatorV15 .rs26-table{width:100%;border-collapse:collapse;font-size:.62rem}#rollSimulatorV15 .rs26-table th{position:sticky;top:0;z-index:1;padding:7px 9px;background:var(--panel);color:var(--muted);text-align:left;font-size:.52rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--line)}#rollSimulatorV15 .rs26-table td{padding:7px 9px;border-bottom:1px solid var(--line)}#rollSimulatorV15 .rs26-table tr:last-child td{border-bottom:0}
    #rollSimulatorV15 .rs26-card-tools{display:flex;justify-content:flex-end;margin-bottom:7px}#rollSimulatorV15 .rs26-card-tools input{width:min(260px,100%);height:30px;font-size:.64rem}
    @media(max-width:900px){#rollSimulatorV15 .rs26-summary{grid-template-columns:1fr 1fr}#rollSimulatorV15 .rs26-border-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){#rollSimulatorV15 .rs26-summary,#rollSimulatorV15 .rs26-border-grid{grid-template-columns:1fr}#rollSimulatorV15 .rs26-title{display:block}#rollSimulatorV15 .rs26-title small{display:block;margin-top:3px}}
  `;document.head.append(style);}

  root.addEventListener('change',(e)=>{const select=e.target.closest('[data-rs-v26-run-select]');if(select)patch(Number(select.value),true);});
  root.addEventListener('input',(e)=>{const input=e.target.closest('[data-rs-v26-card-search]');if(!input)return;const term=input.value.trim().toLowerCase();root.querySelectorAll('[data-rs-v26-card-table] tbody tr').forEach(row=>{row.hidden=!!term&&!row.dataset.cardName.includes(term);});});
  styles();
  let scheduled=false;const results=$('rsResults');if(results)new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;patch();});}).observe(results,{childList:true,subtree:true});
  patch();
})();
