(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired, replaceSection } = tools;

    source = replaceRequired(source,
      "  function setDataValue(data, id, value) {\n    if (!data[id]) data[id] = { kind:'value', value:String(value) };\n    else data[id].value = String(value);\n  }",
      "  function setDataValue(data, id, value) {\n    if (!data[id]) data[id] = { kind:'value', value:String(value) };\n    else data[id].value = String(value);\n  }\n  function setDataChecked(data,id,checked) { data[id]={kind:'check',checked:!!checked}; }",
      'checkbox setter');

    source = replaceRequired(source,
      "      quickdraw:checkedOf(data,'uvQuickdraw'), heavyHand:checkedOf(data,'uvHeavyHand'),\n",
      "      quickdraw:checkedOf(data,'uvQuickdraw'), heavyHand:checkedOf(data,'uvHeavyHand'), vicissitudes:checkedOf(data,'uvVicissitudes'),\n",
      'Vicissitudes context');

    source = replaceRequired(source,
      "    return { luck, speed, be, cps, boss:context.boss, surge:context.surge, dice:context.dice, timeStorm:context.timeStorm };",
      "    return { luck, speed, be, cps, boss:context.boss, surge:context.surge, dice:context.dice, timeStorm:context.timeStorm, vicissitudes:context.vicissitudes };",
      'Vicissitudes stats');

    source = replaceSection(source,
      "  function borderOutcomes(stats) {",
      "  function popcount(mask)",
      `  function borderOutcomes(stats) {\n    const multipliers=Array(16).fill(1);\n    for (let mask=0;mask<16;mask+=1) for (let i=0;i<4;i+=1) if (mask&(1<<i)) multipliers[mask]*=BORDERS[BORDER_NAMES[i]].multiplier;\n    const states=[];\n    if (stats.vicissitudes) {\n      for (let plus=0;plus<4;plus+=1) for (let minus=0;minus<4;minus+=1) if (plus!==minus) states.push({plus,minus,weight:1/12});\n    } else states.push({plus:-1,minus:-1,weight:1});\n    const probabilities=Array(16).fill(0);\n    for (const state of states) {\n      for (let mask=0;mask<16;mask+=1) {\n        let p=1;\n        for (let i=0;i<4;i+=1) {\n          const name=BORDER_NAMES[i];\n          let rate=borderRate(name,stats);\n          if (i===state.plus) rate=Math.min(1,rate*1.1);\n          if (i===state.minus) rate=Math.max(0,rate*0.9);\n          p*=mask&(1<<i)?rate:1-rate;\n        }\n        probabilities[mask]+=p*state.weight;\n      }\n    }\n    return probabilities.map((p,mask)=>({mask,p,m:multipliers[mask]})).filter((o)=>o.p>0);\n  }\n`,
      'Vicissitudes border outcomes');

    source = replaceSection(source,
      "  function optimizerSettings() {",
      "  function scoreFor(stats,settings)",
      `  const RELIC_DEFS=[\n    {key:'quickdraw',id:'uvQuickdraw',input:'optRelicQuickdraw',label:'Quickdraw'},\n    {key:'heavyHand',id:'uvHeavyHand',input:'optRelicHeavyHand',label:'Heavy Hand'},\n    {key:'vicissitudes',id:'uvVicissitudes',input:'optRelicVicissitudes',label:'Vicissitudes'},\n  ];\n  const RARITY_SUFFIX={k:1e3,m:1e6,b:1e9,t:1e12,qa:1e15,qi:1e18,sx:1e21,sp:1e24,oc:1e27,no:1e30,dc:1e33};\n  function parseRarityInput(raw) {\n    const text=String(raw??'').trim().replace(/,/g,'').replace(/\\s+/g,'');\n    if (!text) return NaN;\n    const direct=Number(text);\n    if (Number.isFinite(direct)&&direct>0) return direct;\n    const match=text.toLowerCase().match(/^([0-9]*\\.?[0-9]+)([a-z]+)$/);\n    if (!match||!RARITY_SUFFIX[match[2]]) return NaN;\n    const value=Number(match[1])*RARITY_SUFFIX[match[2]];\n    return Number.isFinite(value)&&value>0?value:NaN;\n  }\n  function relicCombos() {\n    const slots=Math.max(1,Math.min(2,Math.floor(Number($('optRelicSlots')?.value)||1)));\n    const available=RELIC_DEFS.filter((r)=>$(r.input)?.checked).map((r)=>r.key);\n    const combos=[[]];\n    for (let i=0;i<available.length;i+=1) combos.push([available[i]]);\n    if (slots>=2) for (let i=0;i<available.length;i+=1) for (let j=i+1;j<available.length;j+=1) combos.push([available[i],available[j]]);\n    return combos;\n  }\n  function contextWithRelics(context,relics) {\n    const set=new Set(relics);\n    return {...context,quickdraw:set.has('quickdraw'),heavyHand:set.has('heavyHand'),vicissitudes:set.has('vicissitudes')};\n  }\n  function relicLabels(keys) { return keys?.length?keys.map((key)=>RELIC_DEFS.find((r)=>r.key===key)?.label||key).join(' + '):'None'; }\n  function currentRelics(context) { return [context.quickdraw?'quickdraw':null,context.heavyHand?'heavyHand':null,context.vicissitudes?'vicissitudes':null].filter(Boolean); }\n  function maximumObtainableRarity(context,allocation) {\n    const stats=statsFor(context,allocation);\n    const cards=activeCards(stats);\n    const maxBase=cards.reduce((max,card)=>Math.max(max,Number(card.rarity)||0),0);\n    return maxBase*BORDER_NAMES.reduce((product,name)=>product*BORDERS[name].multiplier,1);\n  }\n  function optimizerSettings() {\n    return {\n      goal:$('optGoal')?.value||'borders',\n      borderTarget:$('optBorderTarget')?.value||'PCR',\n      matchType:$('optMatchType')?.value||'contains',\n      rarity:parseRarityInput($('optRarityTarget')?.value),\n      seconds:Math.max(60,(Number($('optDurationValue')?.value)||1)*({hour:3600,day:86400}[$('optDurationUnit')?.value]||86400)),\n    };\n  }\n`,
      'relic and rarity helpers');

    source = replaceSection(source,
      "  function scoreFor(stats,settings)",
      "  function metricFor(stats,settings)",
      `  function scoreFor(stats,settings) {\n    if (settings.goal==='borders') return stats.cps*borderTargetRate(stats,settings.borderTarget,settings.matchType);\n    return stats.cps*thresholdRate(settings.rarity,stats);\n  }\n`,
      'optimizer score');

    source = replaceSection(source,
      "  function metricFor(stats,settings)",
      "  function durationShort(seconds)",
      `  function metricFor(stats,settings) {\n    if (settings.goal==='borders') return {value:stats.cps*settings.seconds*borderTargetRate(stats,settings.borderTarget,settings.matchType),label:\`${'${borderTargetLabel(settings)}'} hits in ${'${durationShort(settings.seconds)}'}\`};\n    return {value:stats.cps*settings.seconds*thresholdRate(settings.rarity,stats),label:\`≥ ${'${fmt(settings.rarity)}'} hits in ${'${durationShort(settings.seconds)}'}\`};\n  }\n`,
      'optimizer metric');

    source = replaceSection(source,
      "  function runOptimizer() {",
      "  function showOptError(message)",
      `  function runOptimizer() {\n    const source=startingData||captureBuildData();\n    const baseContext=contextFromData(source);\n    const current=currentAllocation(source);\n    const settings=optimizerSettings();\n    if (settings.goal==='targetRarity'&&!Number.isFinite(settings.rarity)) { showOptError('Enter a valid rarity such as 1Qa, 25Qi, or 1e18.'); return; }\n    if (settings.goal==='targetRarity') {\n      const maxPossible=maximumObtainableRarity(baseContext,current);\n      if (!(maxPossible>0)) { showOptError('There are no active cards available for this build.'); return; }\n      if (settings.rarity>maxPossible) { showOptError(\`That target is above the highest currently obtainable final rarity (${'${fmt(maxPossible)}'}). Lower the target and try again.\`); return; }\n    }\n    const lockState=locks();\n    const maxSkill=Math.floor(baseContext.index/50),maxChaska=Math.floor(baseContext.rolls/50000),maxDungeon=baseContext.dungeonTokens;\n    const budgets={\n      skills:Math.max(0,Math.min(maxSkill,Math.floor(Number($('optSkillBudget')?.value)||0))),\n      chaska:Math.max(0,Math.min(maxChaska,Math.floor(Number($('optChaskaBudget')?.value)||0))),\n      dungeon:Math.max(0,Math.min(maxDungeon,Math.floor(Number($('optDungeonBudget')?.value)||0))),\n    };\n    const locked=baseCandidate(current,lockState);\n    if (locked.__chaskaLockError) { showOptError(locked.__chaskaLockError); return; }\n    const lockedCost={skills:skillSpent(locked.skills),chaska:chaskaSpent(locked.chaska),dungeon:dungeonSpent(locked.dungeon)};\n    for (const key of Object.keys(budgets)) if (lockedCost[key]>budgets[key]) { showOptError(\`Locked ${'${key}'} already use ${'${lockedCost[key]}'} but the optimizer budget is only ${'${budgets[key]}'} . Increase the budget or unlock something.\`.replace(' .','.')); return; }\n    showOptError('');\n    const orders=[['skills','dungeon','chaska'],['chaska','skills','dungeon'],['dungeon','chaska','skills'],['skills','chaska','dungeon']];\n    let best=deepClone(locked),bestScore=-Infinity,bestContext=baseContext,bestRelics=[];\n    for (const relicSet of relicCombos()) {\n      const context=contextWithRelics(baseContext,relicSet);\n      const scoreCache=new Map();\n      const scoreFn=(candidate)=>{\n        const key=candidateKey(candidate);\n        if (scoreCache.has(key)) return scoreCache.get(key);\n        const value=scoreFor(statsFor(context,candidate),settings);\n        scoreCache.set(key,value);\n        return value;\n      };\n      for (const order of orders) {\n        let candidate=deepClone(locked);\n        for (let pass=0;pass<2;pass+=1) for (const group of order) candidate=optimizeGroup(candidate,group,budgets[group],lockState,scoreFn);\n        const score=scoreFn(candidate);\n        if (score>bestScore) { best=candidate;bestScore=score;bestContext=context;bestRelics=relicSet.slice(); }\n      }\n    }\n    const currentStats=statsFor(baseContext,current),bestStats=statsFor(bestContext,best);\n    const recommendation=deepClone(source);\n    for (const [key,cfg] of Object.entries(SKILLS)) setDataValue(recommendation,cfg.id,best.skills[key]);\n    for (const [key,cfg] of Object.entries(CHASKA)) setDataValue(recommendation,cfg.id,best.chaska[key]);\n    for (const [key,cfg] of Object.entries(DUNGEON)) setDataValue(recommendation,cfg.id,best.dungeon[key]);\n    for (const relic of RELIC_DEFS) setDataChecked(recommendation,relic.id,bestRelics.includes(relic.key));\n    lastRecommendation={data:recommendation,allocation:best,current,context:bestContext,baseContext,settings,budgets,currentStats,bestStats,relics:bestRelics};\n    renderRecommendation(lastRecommendation);\n  }\n\n`,
      'relic-aware run');

    return source;
  });
})();
