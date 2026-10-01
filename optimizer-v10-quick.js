(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired } = tools;

    source = replaceRequired(
      source,
      '<div class="opt-run-row"><button type="button" id="optRun" class="opt-run">Optimize Build</button></div>',
      '<div class="opt-run-row"><button type="button" id="optQuick" class="opt-run opt-quick-run">Quick Optimize</button><button type="button" id="optRun" class="opt-run">Full Optimize</button></div>',
      'quick optimizer button'
    );

    source = replaceRequired(
      source,
      "  async function runOptimizer() {",
      `  function appendQuickOptimizerSummary() {
    const out=$('optResults'); if(!out) return;
    out.querySelector('.opt-quick-summary')?.remove();
    const box=document.createElement('div');
    box.className='opt-quick-summary';
    box.innerHTML='<div><span>Quick Optimize</span><strong>Fast analytic search</strong></div><small>Uses the same stat, border, relic, Dungeon, and Chaska math. It skips the ultra-deep swap search and Monte Carlo simulation validation, so Full Optimize can still find a slightly better build.</small>';
    const actions=out.querySelector('.opt-result-actions');
    (actions||out).insertAdjacentElement(actions?'beforebegin':'beforeend',box);
    if(!$('optQuickStyles')){
      const style=document.createElement('style');style.id='optQuickStyles';
      style.textContent='#optimizerCalcV1 .opt-run-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}#optimizerCalcV1 .opt-quick-run{background:var(--panel-2);color:var(--text);border-color:var(--line-2)}#optimizerCalcV1 .opt-quick-summary{display:grid;gap:4px;margin-top:8px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2)}#optimizerCalcV1 .opt-quick-summary span{display:block;color:var(--muted);font-size:.52rem;font-weight:850;text-transform:uppercase}#optimizerCalcV1 .opt-quick-summary strong{display:block;margin-top:2px;font-size:.7rem}#optimizerCalcV1 .opt-quick-summary small{color:var(--muted);font-size:.58rem;line-height:1.45}';
      document.head.append(style);
    }
  }

  async function runQuickOptimizer() {
    const quickButton=$('optQuick'),fullButton=$('optRun');
    if(quickButton?.disabled||fullButton?.disabled)return;
    const quickText=quickButton?.textContent||'Quick Optimize';
    if(quickButton){quickButton.disabled=true;quickButton.textContent='Quick optimizing…';}
    if(fullButton)fullButton.disabled=true;
    try {
      const source=startingData||captureBuildData();
      const baseContext=contextFromData(source);
      const current=currentAllocation(source);
      const settings=optimizerSettings();
      if(settings.goal==='targetRarity'&&!Number.isFinite(settings.rarity)){showOptError('Enter a valid rarity such as 1Qa, 25Qi, or 1e18.');return;}
      if(settings.goal==='targetRarity'){
        const maxPossible=maximumObtainableRarity(baseContext,current);
        if(!(maxPossible>0)){showOptError('There are no active cards available for this build.');return;}
        if(settings.rarity>maxPossible){showOptError('That target is above the highest currently obtainable final rarity ('+fmt(maxPossible)+'). Lower the target and try again.');return;}
      }

      const lockState=locks();
      const maxSkill=Math.floor(baseContext.index/50),maxChaska=Math.floor(baseContext.rolls/50000),maxDungeon=baseContext.dungeonTokens;
      const budgets={
        skills:Math.max(0,Math.min(maxSkill,Math.floor(Number($('optSkillBudget')?.value)||0))),
        chaska:Math.max(0,Math.min(maxChaska,Math.floor(Number($('optChaskaBudget')?.value)||0))),
        dungeon:Math.max(0,Math.min(maxDungeon,Math.floor(Number($('optDungeonBudget')?.value)||0)))
      };
      const locked=baseCandidate(current,lockState);
      const lockedCost={skills:skillSpent(locked.skills),chaska:chaskaSpent(locked.chaska),dungeon:dungeonSpent(locked.dungeon)};
      for(const key of Object.keys(budgets))if(lockedCost[key]>budgets[key]){showOptError('Locked '+key+' already use '+lockedCost[key]+' but the optimizer budget is only '+budgets[key]+'. Increase the budget or unlock something.');return;}
      showOptError('');

      const orders=[
        ['skills','dungeon','chaska'],
        ['chaska','skills','dungeon'],
        ['dungeon','chaska','skills']
      ];
      let winner=null;
      const combos=relicCombos();
      for(let r=0;r<combos.length;r+=1){
        if(quickButton)quickButton.textContent='Quick '+(r+1)+' / '+combos.length;
        if(r%4===0)await new Promise((resolve)=>setTimeout(resolve,0));
        const relicSet=combos[r];
        const context=contextWithRelics(baseContext,relicSet);
        const cache=new Map();
        const scoreFn=(candidate)=>{
          const key=candidateKey(candidate);
          if(cache.has(key))return cache.get(key);
          const value=scoreFor(statsFor(context,candidate),settings);
          cache.set(key,value);
          return value;
        };
        let best=deepClone(locked),bestScore=scoreFn(best);
        for(const order of orders){
          let candidate=deepClone(locked);
          for(const group of order)candidate=optimizeGroup(candidate,group,budgets[group],lockState,scoreFn,false);
          const score=scoreFn(candidate);
          if(score>bestScore){best=candidate;bestScore=score;}
        }
        if(!winner||bestScore>winner.score)winner={candidate:best,score:bestScore,context,relics:relicSet.slice()};
      }
      if(!winner)throw new Error('Quick Optimize could not produce a legal candidate build.');

      const best=winner.candidate,bestContext=winner.context,bestRelics=winner.relics;
      const currentStats=statsFor(baseContext,current),bestStats=statsFor(bestContext,best);
      const recommendation=deepClone(source);
      for(const [key,cfg] of Object.entries(SKILLS))setDataValue(recommendation,cfg.id,best.skills[key]);
      for(const [key,cfg] of Object.entries(CHASKA))setDataValue(recommendation,cfg.id,best.chaska[key]);
      for(const [key,cfg] of Object.entries(DUNGEON))setDataValue(recommendation,cfg.id,best.dungeon[key]);
      for(const relic of RELIC_DEFS)setDataChecked(recommendation,relic.id,bestRelics.includes(relic.key));
      lastRecommendation={data:recommendation,allocation:best,current,context:bestContext,baseContext,settings,budgets,currentStats,bestStats,relics:bestRelics,quick:true};
      renderRecommendation(lastRecommendation);
      appendQuickOptimizerSummary();
    } catch(error) {
      console.error(error);
      showOptError(error?.message||'Quick Optimize failed.');
    } finally {
      if(quickButton){quickButton.disabled=false;quickButton.textContent=quickText;}
      if(fullButton)fullButton.disabled=false;
    }
  }

  async function runOptimizer() {`,
      'quick optimizer runner'
    );

    source = replaceRequired(
      source,
      "    $('optRun')?.addEventListener('click',()=>{ runOptimizer(); });",
      "    $('optQuick')?.addEventListener('click',()=>{ runQuickOptimizer(); });\n    $('optRun')?.addEventListener('click',()=>{ runOptimizer(); });",
      'quick optimizer click handler'
    );

    return source;
  });
})();
