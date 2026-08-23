(() => {
  const SKILLS = {
    AllStat: [0, 3, 6, 11],
    Platinum: [0, 0.5, 1, 1.5, 2, 2.5, 5],
    Crystal: [0, 1.75, 3.5, 5.25, 7, 8.75, 14.75],
    Ruby: [0, 1.5, 3, 4.5, 6, 7.5, 13.5],
    Galaxy: [0, 4, 8, 12, 16, 20, 30],
  };

  const CHARM_BORDERS = {
    'Platinum Gem': { Platinum: 0.5 },
    'Crystal Gem': { Platinum: 0.5, Crystal: 0.5 },
    'Dark Star': { Platinum: 0.5, Crystal: 0.5, Ruby: 0.5, Galaxy: 0.5 },
    'Infinity Gem': { Platinum: 1, Crystal: 1, Ruby: 1, Galaxy: 1 },
    'Lucky Crown': { Platinum: 1.5, Crystal: 1.5, Ruby: 1.5, Galaxy: 1.5 },
    'Forbidden Book': { Platinum: 2, Crystal: 2, Ruby: 2, Galaxy: 2 },
    "Angel's Halo": { Platinum: 3, Crystal: 3, Ruby: 3, Galaxy: 3 },
    'Forbidden Fruit': { Platinum: 4, Crystal: 4, Ruby: 4, Galaxy: 4 },
    'Book of Life and Death': { Platinum: 6, Crystal: 6, Ruby: 6, Galaxy: 6 },
  };

  const CONFIG = {
    Platinum: { output: 'uvOutPlatinum', skill: 'uvSkillPlatinum', structure: 'uvStructurePlatinum', chaska: 'uvChaskaPlatinum', rate: 0.05 },
    Crystal: { output: 'uvOutCrystal', skill: 'uvSkillCrystal', structure: 'uvStructureCrystal', chaska: 'uvChaskaCrystal', rate: 0.10 },
    Ruby: { output: 'uvOutRuby', skill: 'uvSkillRuby', structure: 'uvStructureRuby', chaska: null, rate: 0 },
    Galaxy: { output: 'uvOutGalaxy', skill: 'uvSkillGalaxy', structure: 'uvStructureGalaxy', chaska: 'uvChaskaGalaxy', rate: 0.25 },
  };

  const $ = (id) => document.getElementById(id);

  function level(id, max) {
    return Math.max(0, Math.min(max, Math.floor(Number($(id)?.value) || 0)));
  }

  function chaskaBonus(points, rate) {
    let remaining = Math.max(0, Math.floor(Number(points) || 0));
    let block = 0;
    let total = 0;
    while (remaining > 0) {
      const amount = Math.min(50, remaining);
      total += amount * rate * Math.pow(0.85, block);
      remaining -= amount;
      block += 1;
    }
    return total;
  }

  function format(value) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function syncRibbon() {
    const root = $('upgradeCalcV2');
    if (!root) return;

    const charmName = $('uvCharm')?.value || 'None';
    const charm = CHARM_BORDERS[charmName] || {};
    const allStat = SKILLS.AllStat[level('uvSkillAll', SKILLS.AllStat.length - 1)] || 0;
    const allStatMultiplier = 1 + allStat / 100;
    const borderBoost = $('uvBorderBoost')?.checked ? 1.5 : 1;

    for (const [name, cfg] of Object.entries(CONFIG)) {
      const values = SKILLS[name];
      const skillValue = values[level(cfg.skill, values.length - 1)] || 0;
      const structureLevel = level(cfg.structure, 5);
      const structureMultiplier = 1 + structureLevel / 5;
      const nonChaska = (1 + (charm[name] || 0) + skillValue) * allStatMultiplier * structureMultiplier;
      const chaska = cfg.chaska ? chaskaBonus(Number($(cfg.chaska)?.value) || 0, cfg.rate) : 0;
      const effective = nonChaska * borderBoost + chaska;
      const output = $(cfg.output);
      if (output) output.textContent = `${format(effective)}×`;
    }
  }

  function schedule() {
    requestAnimationFrame(syncRibbon);
  }

  function init() {
    const root = $('upgradeCalcV2');
    if (!root) return;
    root.addEventListener('input', schedule);
    root.addEventListener('change', schedule);
    root.addEventListener('click', schedule);
    syncRibbon();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
