(() => {
  if (window.__hitCalcPlayerStatAuraV41) return;
  window.__hitCalcPlayerStatAuraV41 = true;

  const STORAGE = 'hitCalcPlayerStatAuraV1';
  const AURAS = {
    "": { label: "None", stat: "", base: 0, max: 0 },
    "Fortune's Bloom": { stat: "Luck", base: 10, max: 50 },
    "Verdant Haste": { stat: "RollSpeed", base: 5, max: 25 },
    "Unstable Growth": { stat: "Mutation", base: 10, max: 50 },
    "Platinum Clover": { stat: "Platinum", base: 10, max: 35 },
    "Crystal Blossom": { stat: "Crystal", base: 10, max: 35 },
    "Ruby Thorn": { stat: "Ruby", base: 10, max: 35 },
    "Astral Sprout": { stat: "Galaxy", base: 10, max: 35 },
    "Worldroot": { stat: "AllStat", base: 4, max: 20 },
  };
  const BORDER_PROGRESS = { Base: 0, Platinum: 0.25, Crystal: 0.5, Galaxy: 1 };
  const $ = (id) => document.getElementById(id);

  function auraValue(name, border) {
    const aura = AURAS[name];
    if (!aura || !aura.stat) return 0;
    const progress = BORDER_PROGRESS[border] ?? 0;
    return aura.base + (aura.max - aura.base) * progress;
  }

  function auraBonus(stat) {
    const name = $('playerStatAura')?.value || '';
    const border = $('playerStatAuraBorder')?.value || 'Base';
    const aura = AURAS[name];
    if (!aura || !aura.stat) return 0;
    return aura.stat === stat || aura.stat === 'AllStat' ? auraValue(name, border) : 0;
  }

  function statLabel(stat) {
    return {
      Luck: 'Luck',
      RollSpeed: 'Roll Speed',
      Mutation: 'Mutation Luck',
      Platinum: 'Platinum Luck',
      Crystal: 'Crystal Luck',
      Ruby: 'Ruby Luck',
      Galaxy: 'Galaxy Luck',
      AllStat: 'all player stats',
    }[stat] || stat;
  }

  function updateReadout() {
    const out = $('playerStatAuraReadout');
    const name = $('playerStatAura')?.value || '';
    const border = $('playerStatAuraBorder')?.value || 'Base';
    const aura = AURAS[name];
    if (!out) return;
    if (!aura?.stat) {
      out.innerHTML = '<span>Player Stat Aura</span><strong>None</strong>';
      return;
    }
    const value = auraValue(name, border);
    out.innerHTML = `<span>${name} · ${border}</span><strong>+${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}% ${statLabel(aura.stat)}</strong>`;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({
        name: $('playerStatAura')?.value || '',
        border: $('playerStatAuraBorder')?.value || 'Base',
      }));
    } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      if (AURAS[saved.name] && $('playerStatAura')) $('playerStatAura').value = saved.name;
      if (saved.border in BORDER_PROGRESS && $('playerStatAuraBorder')) $('playerStatAuraBorder').value = saved.border;
    } catch {}
  }

  function installUi() {
    if ($('playerStatAura')) return;
    const statsGrid = document.querySelector('.setup-card .stats-grid');
    if (!statsGrid) return;

    const wrap = document.createElement('div');
    wrap.className = 'player-stat-aura-box';
    wrap.innerHTML = `
      <div class="player-stat-aura-head"><span>Player Stat Aura</span><small>New Stat Aura Pack cards</small></div>
      <div class="player-stat-aura-fields">
        <label><span>Aura Card</span><select id="playerStatAura">
          <option value="">None</option>
          <option>Fortune's Bloom</option>
          <option>Verdant Haste</option>
          <option>Unstable Growth</option>
          <option>Platinum Clover</option>
          <option>Crystal Blossom</option>
          <option>Ruby Thorn</option>
          <option>Astral Sprout</option>
          <option>Worldroot</option>
        </select></label>
        <label><span>Border</span><select id="playerStatAuraBorder">
          <option>Base</option><option>Platinum</option><option>Crystal</option><option>Galaxy</option>
        </select></label>
      </div>
      <div id="playerStatAuraReadout" class="player-stat-aura-readout"></div>
    `;
    statsGrid.insertAdjacentElement('afterend', wrap);

    if (!$('playerStatAuraStyles')) {
      const style = document.createElement('style');
      style.id = 'playerStatAuraStyles';
      style.textContent = `
        .player-stat-aura-box{margin:14px 0 4px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
        .player-stat-aura-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}
        .player-stat-aura-head>span{font-size:.7rem;font-weight:850;color:var(--text)}
        .player-stat-aura-head>small{font-size:.58rem;color:var(--muted)}
        .player-stat-aura-fields{display:grid;grid-template-columns:1.45fr .75fr;gap:8px}
        .player-stat-aura-fields label>span{display:block;margin:0 0 5px 2px;color:var(--muted);font-size:.58rem;font-weight:800;text-transform:uppercase}
        .player-stat-aura-fields select{width:100%;min-height:36px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);padding:7px 9px}
        .player-stat-aura-readout{display:flex;justify-content:space-between;gap:10px;margin-top:8px;padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.12);font-size:.63rem}
        .player-stat-aura-readout span{color:var(--muted)}.player-stat-aura-readout strong{color:var(--text);text-align:right}
        @media(max-width:560px){.player-stat-aura-fields{grid-template-columns:1fr}}
      `;
      document.head.append(style);
    }

    load();
    for (const id of ['playerStatAura','playerStatAuraBorder']) {
      $(id)?.addEventListener('change', () => {
        save();
        updateReadout();
        try { render(); } catch {}
      });
    }
    updateReadout();

    document.getElementById('resetBtn')?.addEventListener('click', () => {
      if ($('playerStatAura')) $('playerStatAura').value = '';
      if ($('playerStatAuraBorder')) $('playerStatAuraBorder').value = 'Base';
      try { localStorage.removeItem(STORAGE); } catch {}
      updateReadout();
      setTimeout(() => { try { render(); } catch {} }, 0);
    });
  }

  installUi();

  if (typeof getStats === 'function' && !getStats.__playerStatAuraV41) {
    const baseGetStats = getStats;
    const wrapped = function() {
      const stats = baseGetStats();
      stats.Luck *= 1 + auraBonus('Luck') / 100;
      stats.rollSpeed *= 1 + auraBonus('RollSpeed') / 100;
      stats.Platinum *= 1 + auraBonus('Platinum') / 100;
      stats.Crystal *= 1 + auraBonus('Crystal') / 100;
      stats.Ruby *= 1 + auraBonus('Ruby') / 100;
      stats.Galaxy *= 1 + auraBonus('Galaxy') / 100;
      return stats;
    };
    wrapped.__playerStatAuraV41 = true;
    getStats = wrapped;
  }

  if (typeof mutationRate === 'function' && !mutationRate.__playerStatAuraV41) {
    const baseMutationRate = mutationRate;
    const wrapped = function() {
      return Math.min(1, baseMutationRate() * (1 + auraBonus('Mutation') / 100));
    };
    wrapped.__playerStatAuraV41 = true;
    mutationRate = wrapped;
  }

  window.HIT_CALC_PLAYER_STAT_AURAS = { AURAS, BORDER_PROGRESS, auraValue, auraBonus };
  try { render(); } catch {}
})();