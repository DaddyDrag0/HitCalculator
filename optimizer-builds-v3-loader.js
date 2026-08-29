(() => {
  const sourceUrl = './optimizer-builds-v1.js?rev=20260829-1200';

  function fail(message) {
    console.error('[Optimizer v3 loader]', message);
    const show = () => {
      const switcher = document.querySelector('.uv-mode-switch');
      if (!switcher || switcher.querySelector('[data-view="optimizer-load-error"]')) return;
      const note = document.createElement('span');
      note.dataset.view = 'optimizer-load-error';
      note.style.cssText = 'align-self:center;color:#ff9299;font-size:.62rem;font-weight:800';
      note.textContent = 'Optimizer failed to load. Refresh the test page.';
      switcher.append(note);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once:true });
    else show();
  }

  function replaceRequired(source, search, replacement, label) {
    if (!source.includes(search)) throw new Error(`Patch target missing: ${label}`);
    return source.replace(search, replacement);
  }

  async function load() {
    try {
      const response = await fetch(sourceUrl, { cache:'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let source = await response.text();

      source = replaceRequired(
        source,
        "  const DUNGEON = {",
        "  const CHASKA_TIER_GAP = 50;\n  const DUNGEON = {",
        'Chaska tier-gap constant'
      );

      source = replaceRequired(
        source,
        "  function chaskaSpent(chaska) { return Object.values(chaska).reduce((a,b)=>a+(Number(b)||0),0); }\n",
        `  function chaskaSpent(chaska) { return Object.values(chaska).reduce((a,b)=>a+(Number(b)||0),0); }\n  function normalizeChaskaAllocation(chaska) {\n    const out = Object.fromEntries(Object.keys(CHASKA).map((key)=>[key,Math.max(0,Math.floor(Number(chaska?.[key])||0))]));\n    const low = Math.min(...Object.values(out));\n    const ceiling = low + CHASKA_TIER_GAP;\n    for (const key of Object.keys(out)) out[key] = Math.min(out[key], ceiling);\n    return out;\n  }\n  function validChaskaAllocation(chaska) {\n    const values = Object.keys(CHASKA).map((key)=>Math.max(0,Math.floor(Number(chaska?.[key])||0)));\n    return Math.max(...values) - Math.min(...values) <= CHASKA_TIER_GAP;\n  }\n`,
        'Chaska tier helpers'
      );

      source = replaceRequired(
        source,
        `  function currentAllocation(data) {\n    return {\n      skills: Object.fromEntries(Object.entries(SKILLS).map(([key,cfg])=>[key,Math.max(0,Math.min(cfg.values.length-1,Math.floor(valueOf(data,cfg.id,0))))])),\n      chaska: Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.floor(valueOf(data,cfg.id,0)))])),\n      dungeon: Object.fromEntries(Object.entries(DUNGEON).map(([key,cfg])=>[key,Math.max(0,Math.min(DUNGEON_MAX,Math.floor(valueOf(data,cfg.id,0))))])),\n    };\n  }`,
        `  function currentAllocation(data) {\n    const chaska = normalizeChaskaAllocation(Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.floor(valueOf(data,cfg.id,0)))])));\n    return {\n      skills: Object.fromEntries(Object.entries(SKILLS).map(([key,cfg])=>[key,Math.max(0,Math.min(cfg.values.length-1,Math.floor(valueOf(data,cfg.id,0))))])),\n      chaska,\n      dungeon: Object.fromEntries(Object.entries(DUNGEON).map(([key,cfg])=>[key,Math.max(0,Math.min(DUNGEON_MAX,Math.floor(valueOf(data,cfg.id,0))))])),\n    };\n  }`,
        'starting Chaska tier normalization'
      );

      source = replaceRequired(
        source,
        `  function baseCandidate(current,lockState) {\n    const c={skills:{},chaska:{},dungeon:{}};\n    for (const key of Object.keys(SKILLS)) c.skills[key]=lockState.skills.has(key)?current.skills[key]:0;\n    for (const key of Object.keys(CHASKA)) c.chaska[key]=lockState.chaska.has(key)?current.chaska[key]:0;\n    for (const key of Object.keys(DUNGEON)) c.dungeon[key]=lockState.dungeon.has(key)?current.dungeon[key]:0;\n    return c;\n  }`,
        `  function baseCandidate(current,lockState) {\n    const c={skills:{},chaska:{},dungeon:{}};\n    for (const key of Object.keys(SKILLS)) c.skills[key]=lockState.skills.has(key)?current.skills[key]:0;\n\n    const chaskaKeys = Object.keys(CHASKA);\n    const lockedChaska = chaskaKeys.filter((key)=>lockState.chaska.has(key));\n    const lockedValues = lockedChaska.map((key)=>current.chaska[key]||0);\n    if (lockedValues.length && Math.max(...lockedValues)-Math.min(...lockedValues)>CHASKA_TIER_GAP) {\n      c.__chaskaLockError = 'The locked Chaska stats are more than 50 points apart. Unlock one of them or make the locked values follow the Chaska tier rule.';\n    }\n    const requiredFloor = lockedValues.length ? Math.max(0,Math.max(...lockedValues)-CHASKA_TIER_GAP) : 0;\n    for (const key of chaskaKeys) c.chaska[key]=lockState.chaska.has(key)?current.chaska[key]:requiredFloor;\n    if (!validChaskaAllocation(c.chaska)) c.__chaskaLockError = c.__chaskaLockError || 'The selected Chaska locks cannot form a legal 50-point tier allocation.';\n\n    for (const key of Object.keys(DUNGEON)) c.dungeon[key]=lockState.dungeon.has(key)?current.dungeon[key]:0;\n    return c;\n  }`,
        'Chaska-aware locked starting candidate'
      );

      source = replaceRequired(
        source,
        "    const locked=baseCandidate(current,lockState);\n    const lockedCost={skills:skillSpent(locked.skills),chaska:chaskaSpent(locked.chaska),dungeon:dungeonSpent(locked.dungeon)};",
        "    const locked=baseCandidate(current,lockState);\n    if (locked.__chaskaLockError) { showOptError(locked.__chaskaLockError); return; }\n    const lockedCost={skills:skillSpent(locked.skills),chaska:chaskaSpent(locked.chaska),dungeon:dungeonSpent(locked.dungeon)};",
        'invalid Chaska-lock guard'
      );

      source = replaceRequired(
        source,
        `        for (const [key] of Object.entries(CHASKA)) {\n          if (lockState.chaska.has(key)) continue;\n          const current=candidate.chaska[key]||0;\n          const toBoundary=50-(current%50||0);\n          const chunk=Math.min(remaining,current%50===0?Math.min(50,remaining):Math.min(toBoundary,remaining));\n          if (chunk<=0) continue;\n          const test=deepClone(candidate); test.chaska[key]=current+chunk;\n          const gain=scoreFn(test)-baseScore;\n          const efficiency=gain/chunk;\n          if (!best || efficiency>best.efficiency) best={test,cost:chunk,efficiency,gain};\n        }`,
        `        const chaskaKeys=Object.keys(CHASKA);\n        for (const key of chaskaKeys) {\n          if (lockState.chaska.has(key)) continue;\n          const current=candidate.chaska[key]||0;\n          const steps=[1,5,10,25,50].map((step)=>Math.min(step,remaining)).filter((step,index,array)=>step>0&&array.indexOf(step)===index);\n          for (const step of steps) {\n            const test=deepClone(candidate);\n            const target=current+step;\n            const requiredMin=Math.max(0,target-CHASKA_TIER_GAP);\n            let valid=true;\n            for (const other of chaskaKeys) {\n              if (other===key) continue;\n              if ((test.chaska[other]||0)<requiredMin) {\n                if (lockState.chaska.has(other)) { valid=false; break; }\n                test.chaska[other]=requiredMin;\n              }\n            }\n            if (!valid) continue;\n            test.chaska[key]=target;\n            if (!validChaskaAllocation(test.chaska)) continue;\n            const cost=chaskaSpent(test.chaska)-chaskaSpent(candidate.chaska);\n            if (!(cost>0) || cost>remaining) continue;\n            const gain=scoreFn(test)-baseScore;\n            const efficiency=gain/cost;\n            if (!best || efficiency>best.efficiency || (efficiency===best.efficiency&&gain>best.gain)) best={test,cost,efficiency,gain};\n          }\n        }`,
        'Chaska tier-aware optimizer steps'
      );

      source = source.replace(
        'Optimizes Skill Tree, Chaska, and Dungeon. Your structures, charm, potions, and modifiers stay fixed.',
        'Optimizes Skill Tree, Chaska, and Dungeon. Chaska uses 50-point tiers: no stat may be more than 50 points ahead of the lowest Chaska stat. Your structures, charm, potions, and modifiers stay fixed.'
      );

      source = source.replace(
        'Uses the site\'s real stat, speed, dungeon-cost, Chaska diminishing-return, and multi-border math.',
        'Uses the site\'s real stat, speed, dungeon-cost, Chaska diminishing-return + 50-point tier rule, and multi-border math.'
      );

      (0, eval)(`${source}\n//# sourceURL=optimizer-builds-v3-runtime.js`);
    } catch (error) {
      fail(error?.message || String(error));
    }
  }

  load();
})();
