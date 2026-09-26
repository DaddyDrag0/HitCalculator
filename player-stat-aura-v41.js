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