(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired, replaceSection } = tools;

    source = replaceSection(source,
      "  function deepSearchCandidates(locked,budgets,lockState,scoreFn) {",
      "  function optimizerWorkerBuild",
      `  function deepSearchCandidates(locked,budgets,lockState,scoreFn) {\n    const orders=[\n      ['skills','dungeon','chaska'],['skills','chaska','dungeon'],['dungeon','skills','chaska'],\n      ['dungeon','chaska','skills'],['chaska','skills','dungeon'],['chaska','dungeon','skills']\n    ];\n    const seeds=[deepClone(locked)];\n    for (const order of orders) {\n      let candidate=deepClone(locked);\n      for (let pass=0;pass<5;pass+=1) for (const group of order) candidate=optimizeGroup(candidate,group,budgets[group],lockState,scoreFn,false);\n      seeds.push(candidate);\n      seeds.push(refillCandidate(candidate,budgets,lockState,scoreFn,true,order));\n\n      const reversed=order.slice().reverse();\n      let alternate=deepClone(locked);\n      for (let pass=0;pass<4;pass+=1) for (const group of reversed) alternate=optimizeGroup(alternate,group,budgets[group],lockState,scoreFn,pass>1);\n      seeds.push(alternate);\n      seeds.push(refillCandidate(alternate,budgets,lockState,scoreFn,true,reversed));\n    }\n\n    let ranked=rankUniqueCandidates(seeds,scoreFn,40);\n    const skillKeys=Object.keys(SKILLS);\n    const dungeonKeys=Object.keys(DUNGEON);\n    const chaskaKeys=Object.keys(CHASKA);\n    const chaskaSteps=[1,5,10,25,50,100];\n\n    for (let round=0;round<8;round+=1) {\n      const expanded=ranked.map((entry)=>entry.candidate);\n      const parents=ranked.slice(0,Math.min(20,ranked.length));\n\n      for (const entry of parents) {\n        const base=entry.candidate;\n\n        // Single Skill Tree withdrawals, including two-level retreats, then fully refill.\n        for (const key of skillKeys) {\n          if (lockState.skills.has(key)) continue;\n          const level=base.skills[key]||0;\n          for (let remove=1;remove<=Math.min(2,level);remove+=1) {\n            const test=deepClone(base);test.skills[key]=level-remove;\n            expanded.push(refillCandidate(test,budgets,lockState,scoreFn,true));\n          }\n        }\n        // Pair Skill Tree swaps catch paths that require giving up two different upgrades at once.\n        for (let i=0;i<skillKeys.length;i+=1) for (let j=i+1;j<skillKeys.length;j+=1) {\n          const a=skillKeys[i],b=skillKeys[j];\n          if (lockState.skills.has(a)||lockState.skills.has(b)||(base.skills[a]||0)<=0||(base.skills[b]||0)<=0) continue;\n          const test=deepClone(base);test.skills[a]-=1;test.skills[b]-=1;\n          expanded.push(refillCandidate(test,budgets,lockState,scoreFn,true));\n        }\n\n        // Dungeon explores deeper withdrawals and two-stat swaps before re-spending tokens.\n        for (const key of dungeonKeys) {\n          if (lockState.dungeon.has(key)) continue;\n          const level=base.dungeon[key]||0;\n          for (let remove=1;remove<=Math.min(3,level);remove+=1) {\n            const test=deepClone(base);test.dungeon[key]=level-remove;\n            expanded.push(refillCandidate(test,budgets,lockState,scoreFn,true));\n          }\n        }\n        for (let i=0;i<dungeonKeys.length;i+=1) for (let j=i+1;j<dungeonKeys.length;j+=1) {\n          const a=dungeonKeys[i],b=dungeonKeys[j];\n          if (lockState.dungeon.has(a)||lockState.dungeon.has(b)||(base.dungeon[a]||0)<=0||(base.dungeon[b]||0)<=0) continue;\n          const test=deepClone(base);test.dungeon[a]-=1;test.dungeon[b]-=1;\n          expanded.push(refillCandidate(test,budgets,lockState,scoreFn,true));\n        }\n\n        // Chaska searches small adjustments, large 50/100-point milestone shifts, and paired retreats.\n        for (const key of chaskaKeys) {\n          const current=base.chaska[key]||0;\n          for (const step of chaskaSteps) {\n            if (current<step) continue;\n            const test=deepClone(base);test.chaska[key]=current-step;\n            if (!validChaskaAllocation(test.chaska)) continue;\n            expanded.push(refillCandidate(test,budgets,lockState,scoreFn,true));\n          }\n        }\n        for (let i=0;i<chaskaKeys.length;i+=1) for (let j=i+1;j<chaskaKeys.length;j+=1) {\n          const a=chaskaKeys[i],b=chaskaKeys[j];\n          const amount=Math.min(50,base.chaska[a]||0,base.chaska[b]||0);\n          if (!(amount>0)) continue;\n          const test=deepClone(base);test.chaska[a]-=amount;test.chaska[b]-=amount;\n          if (!validChaskaAllocation(test.chaska)) continue;\n          expanded.push(refillCandidate(test,budgets,lockState,scoreFn,true));\n        }\n\n        // Try each spending order again from strong neighbors so a local winner is not locked to one greedy path.\n        for (const order of orders) expanded.push(refillCandidate(base,budgets,lockState,scoreFn,true,order));\n      }\n\n      ranked=rankUniqueCandidates(expanded,scoreFn,40);\n    }\n    return ranked.slice(0,20);\n  }\n\n`,
      'ultra deep optimizer search'
    );

    source = replaceSection(source,
      "  async function validateFinalists(records,baseline,settings,onProgress) {",
      "  function appendSimulationSummary",
      `  async function validateFinalists(records,baseline,settings,onProgress) {\n    // Long validation on purpose: 20 full simulations per build up to 1 day, 12 per build above 1 day.\n    const runsPerBuild=settings.seconds>86400?12:20;\n    const all=[baseline,...records];\n    for (const record of all) {record.simValues=[];record.simAverage=0;}\n    const tasks=[];\n    for (const record of all) for (let i=0;i<runsPerBuild;i+=1) tasks.push({record,index:i});\n    let next=0,completed=0;\n    const concurrency=Math.max(1,Math.min(4,Number(navigator.hardwareConcurrency)||4,tasks.length));\n    async function lane(){\n      while(next<tasks.length){\n        const task=tasks[next++];\n        const value=await runOptimizerSimulation(task.record,settings);\n        task.record.simValues.push(value);\n        completed+=1;\n        onProgress?.(completed,tasks.length);\n      }\n    }\n    await Promise.all(Array.from({length:concurrency},()=>lane()));\n    for(const record of all) {\n      record.simAverage=record.simValues.reduce((a,b)=>a+b,0)/Math.max(1,record.simValues.length);\n      const mean=record.simAverage;\n      record.simVariance=record.simValues.reduce((sum,value)=>sum+(value-mean)**2,0)/Math.max(1,record.simValues.length);\n      record.simStdDev=Math.sqrt(record.simVariance);\n    }\n    return {runsPerBuild,baseline,records};\n  }\n  function appendSimulationSummary`,
      'ultra deep simulation validation'
    );

    source = replaceRequired(
      source,
      "      const chosenRelics=quickRelics.slice(0,Math.min(6,quickRelics.length));",
      "      const chosenRelics=quickRelics.slice(0,Math.min(26,quickRelics.length));",
      'search all practical relic combinations'
    );

    source = replaceRequired(
      source,
      ".slice(0,3);\n      if(!finalists.length)",
      ".slice(0,10);\n      if(!finalists.length)",
      'ten simulation finalists'
    );

    source = replaceRequired(
      source,
      "if(runButton)runButton.textContent='Deep search '+(r+1)+' / '+chosenRelics.length;",
      "if(runButton)runButton.textContent='Ultra deep search '+(r+1)+' / '+chosenRelics.length;",
      'ultra deep progress label'
    );

    return source;
  });
})();
