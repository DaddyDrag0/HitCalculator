(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired } = tools;

    source = replaceRequired(source, "  const DUNGEON = {", "  const CHASKA_TIER_GAP = 50;\n  const DUNGEON = {", 'Chaska tier constant');

    source = replaceRequired(source,
      "  function chaskaSpent(chaska) { return Object.values(chaska).reduce((a,b)=>a+(Number(b)||0),0); }\n",
      `  function chaskaSpent(chaska) { return Object.values(chaska).reduce((a,b)=>a+(Number(b)||0),0); }\n  function normalizeChaskaAllocation(chaska) {\n    const out=Object.fromEntries(Object.keys(CHASKA).map((key)=>[key,Math.max(0,Math.floor(Number(chaska?.[key])||0))]));\n    const low=Math.min(...Object.values(out));\n    const ceiling=low+CHASKA_TIER_GAP;\n    for (const key of Object.keys(out)) out[key]=Math.min(out[key],ceiling);\n    return out;\n  }\n  function validChaskaAllocation(chaska) {\n    const values=Object.keys(CHASKA).map((key)=>Math.max(0,Math.floor(Number(chaska?.[key])||0)));\n    return Math.max(...values)-Math.min(...values)<=CHASKA_TIER_GAP;\n  }\n`,
      'Chaska helpers');

    source = replaceRequired(source,
      `  function currentAllocation(data) {\n    return {\n      skills: Object.fromEntries(Object.entries(SKILLS).map(([key,cfg])=>[key,Math.max(0,Math.min(cfg.values.length-1,Math.floor(valueOf(data,cfg.id,0))))])),\n      chaska: Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.floor(valueOf(data,cfg.id,0)))])),\n      dungeon: Object.fromEntries(Object.entries(DUNGEON).map(([key,cfg])=>[key,Math.max(0,Math.min(DUNGEON_MAX,Math.floor(valueOf(data,cfg.id,0))))])),\n    };\n  }`,
      `  function currentAllocation(data) {\n    const chaska=normalizeChaskaAllocation(Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.floor(valueOf(data,cfg.id,0)))])));\n    return {\n      skills:Object.fromEntries(Object.entries(SKILLS).map(([key,cfg])=>[key,Math.max(0,Math.min(cfg.values.length-1,Math.floor(valueOf(data,cfg.id,0))))])),\n      chaska,\n      dungeon:Object.fromEntries(Object.entries(DUNGEON).map(([key,cfg])=>[key,Math.max(0,Math.min(DUNGEON_MAX,Math.floor(valueOf(data,cfg.id,0))))])),\n    };\n  }`,
      'Chaska current allocation');

    source = replaceRequired(source,
      `  function baseCandidate(current,lockState) {\n    const c={skills:{},chaska:{},dungeon:{}};\n    for (const key of Object.keys(SKILLS)) c.skills[key]=lockState.skills.has(key)?current.skills[key]:0;\n    for (const key of Object.keys(CHASKA)) c.chaska[key]=lockState.chaska.has(key)?current.chaska[key]:0;\n    for (const key of Object.keys(DUNGEON)) c.dungeon[key]=lockState.dungeon.has(key)?current.dungeon[key]:0;\n    return c;\n  }`,
      `  function baseCandidate(current,lockState) {\n    const c={skills:{},chaska:{},dungeon:{}};\n    for (const key of Object.keys(SKILLS)) c.skills[key]=lockState.skills.has(key)?current.skills[key]:0;\n    const keys=Object.keys(CHASKA);\n    const lockedKeys=keys.filter((key)=>lockState.chaska.has(key));\n    const values=lockedKeys.map((key)=>current.chaska[key]||0);\n    if (values.length&&Math.max(...values)-Math.min(...values)>CHASKA_TIER_GAP) c.__chaskaLockError='The locked Chaska stats are more than 50 points apart.';\n    const floor=values.length?Math.max(0,Math.max(...values)-CHASKA_TIER_GAP):0;\n    for (const key of keys) c.chaska[key]=lockState.chaska.has(key)?current.chaska[key]:floor;\n    if (!validChaskaAllocation(c.chaska)) c.__chaskaLockError=c.__chaskaLockError||'The selected Chaska locks cannot form a legal 50-point tier allocation.';\n    for (const key of Object.keys(DUNGEON)) c.dungeon[key]=lockState.dungeon.has(key)?current.dungeon[key]:0;\n    return c;\n  }`,
      'Chaska locked base');

    source = replaceRequired(source,
      `        for (const [key] of Object.entries(CHASKA)) {\n          if (lockState.chaska.has(key)) continue;\n          const current=candidate.chaska[key]||0;\n          const toBoundary=50-(current%50||0);\n          const chunk=Math.min(remaining,current%50===0?Math.min(50,remaining):Math.min(toBoundary,remaining));\n          if (chunk<=0) continue;\n          const test=deepClone(candidate); test.chaska[key]=current+chunk;\n          const gain=scoreFn(test)-baseScore;\n          const efficiency=gain/chunk;\n          if (!best || efficiency>best.efficiency) best={test,cost:chunk,efficiency,gain};\n        }`,
      `        const keys=Object.keys(CHASKA);\n        for (const key of keys) {\n          if (lockState.chaska.has(key)) continue;\n          const current=candidate.chaska[key]||0;\n          const steps=[1,5,10,25,50].map((step)=>Math.min(step,remaining)).filter((step,index,array)=>step>0&&array.indexOf(step)===index);\n          for (const step of steps) {\n            const test=deepClone(candidate);\n            const target=current+step;\n            const requiredMin=Math.max(0,target-CHASKA_TIER_GAP);\n            let valid=true;\n            for (const other of keys) {\n              if (other===key) continue;\n              if ((test.chaska[other]||0)<requiredMin) {\n                if (lockState.chaska.has(other)) { valid=false; break; }\n                test.chaska[other]=requiredMin;\n              }\n            }\n            if (!valid) continue;\n            test.chaska[key]=target;\n            if (!validChaskaAllocation(test.chaska)) continue;\n            const cost=chaskaSpent(test.chaska)-chaskaSpent(candidate.chaska);\n            if (!(cost>0)||cost>remaining) continue;\n            const gain=scoreFn(test)-baseScore;\n            const efficiency=gain/cost;\n            if (!best||efficiency>best.efficiency||(efficiency===best.efficiency&&gain>best.gain)) best={test,cost,efficiency,gain};\n          }\n        }`,
      'Chaska optimizer steps');

    return source;
  });
})();
