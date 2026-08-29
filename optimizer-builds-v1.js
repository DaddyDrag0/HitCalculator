(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE = 'hitCalcSavedBuildsV1';
  const BORDER_NAMES = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const BORDER_ABBR = { Platinum:'P', Crystal:'C', Ruby:'R', Galaxy:'G' };
  const BORDERS = {
    Platinum: { denominator: 100, multiplier: 100 },
    Crystal: { denominator: 10000, multiplier: 10000 },
    Ruby: { denominator: 100000, multiplier: 100000 },
    Galaxy: { denominator: 1000000, multiplier: 1000000 },
  };
  const SKILLS = {
    Luck: { id:'uvSkillLuck', label:'Luck', values:[0,15,30,45,60,75,90,150], costs:[1,1,1,1,1,1,3] },
    Speed: { id:'uvSkillSpeed', label:'Roll Speed', values:[0,5,10,15,20,25,30,45], costs:[1,1,1,1,1,1,3] },
    All: { id:'uvSkillAll', label:'All Stat', values:[0,3,6,11], costs:[5,5,5] },
    Platinum: { id:'uvSkillPlatinum', label:'Platinum', values:[0,.5,1,1.5,2,2.5,5], costs:[1,1,1,1,1,3] },
    Crystal: { id:'uvSkillCrystal', label:'Crystal', values:[0,1.75,3.5,5.25,7,8.75,14.75], costs:[1,1,1,1,1,3] },
    Ruby: { id:'uvSkillRuby', label:'Ruby', values:[0,1.5,3,4.5,6,7.5,13.5], costs:[1,1,1,1,1,3] },
    Galaxy: { id:'uvSkillGalaxy', label:'Galaxy', values:[0,4,8,12,16,20,30], costs:[1,1,1,1,1,3] },
  };
  const CHASKA = {
    Luck: { id:'uvChaskaLuck', label:'Luck', rate:.25 },
    Platinum: { id:'uvChaskaPlatinum', label:'Platinum', rate:.05 },
    Crystal: { id:'uvChaskaCrystal', label:'Crystal', rate:.10 },
    Galaxy: { id:'uvChaskaGalaxy', label:'Galaxy', rate:.25 },
  };
  const DUNGEON = {
    Luck: { id:'uvDungeonLuck', label:'Luck', cost:1, per:10 },
    Speed: { id:'uvDungeonSpeed', label:'Roll Speed', cost:2, per:10 },
    Platinum: { id:'uvDungeonPlatinum', label:'Platinum', cost:3, per:.25 },
    Crystal: { id:'uvDungeonCrystal', label:'Crystal', cost:4, per:.5 },
    Ruby: { id:'uvDungeonRuby', label:'Ruby', cost:5, per:.75 },
    Galaxy: { id:'uvDungeonGalaxy', label:'Galaxy', cost:6, per:2 },
  };
  const DUNGEON_MAX = 25;
  const CHARM = {
    None:{}, 'Old Tome':{Luck:.5}, 'Holy Cross':{Luck:1}, Bloodstone:{Luck:2},
    'Lunar Charm':{Luck:2.5,Cooldown:10}, 'Blood Moon':{Luck:3,Cooldown:20}, 'Ice Crystal':{Luck:3.5,Cooldown:30},
    "Victor's Trophy":{Luck:5,Cooldown:40}, 'Phoenix Feather':{Luck:5.5,Cooldown:50}, 'Hell Charm':{Luck:7.5,Cooldown:60},
    "Emperor's Hand":{Luck:10,Cooldown:75}, 'Heavenly Crown':{Luck:15,Cooldown:100}, Durandal:{Luck:7,Cooldown:60},
    'Platinum Gem':{Luck:10,Platinum:.5,Cooldown:80}, 'Crystal Gem':{Luck:12,Platinum:.5,Crystal:.5,Cooldown:100},
    'Dark Star':{Luck:15,Platinum:.5,Crystal:.5,Ruby:.5,Galaxy:.5,Cooldown:125},
    'Infinity Gem':{Luck:20,Platinum:1,Crystal:1,Ruby:1,Galaxy:1,Cooldown:150},
    'Lucky Crown':{Luck:27,Platinum:1.5,Crystal:1.5,Ruby:1.5,Galaxy:1.5,Cooldown:175},
    'Forbidden Book':{Luck:35,Platinum:2,Crystal:2,Ruby:2,Galaxy:2,Cooldown:200},
    "Angel's Halo":{Luck:42,Platinum:3,Crystal:3,Ruby:3,Galaxy:3,Cooldown:200},
    'Forbidden Fruit':{Luck:50,Platinum:4,Crystal:4,Ruby:4,Galaxy:4,Cooldown:200},
    'Book of Life and Death':{Luck:66,Platinum:6,Crystal:6,Ruby:6,Galaxy:6,Cooldown:200},
  };
  const BUILD_EXCLUDE = new Set(['uvTimeValue','uvTimeUnit','uvCardRarity']);
  const SFX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let startingData = null;
  let lastRecommendation = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function trim(value, digits=2) {
    return Number(value).toFixed(digits).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1');
  }
  function fmt(value, decimals=0) {
    value = Number(value);
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs < 1000) return value.toLocaleString(undefined,{maximumFractionDigits:decimals});
    const tier = Math.floor(Math.log10(abs)/3);
    if (tier >= SFX.length) return value.toExponential(2);
    const scaled = value / 1000 ** tier;
    const digits = Math.abs(scaled)>=100?0:Math.abs(scaled)>=10?1:2;
    return `${trim(scaled,digits)}${SFX[tier]}`;
  }
  function pct(value) {
    if (!Number.isFinite(value)) return '—';
    return `${trim(value*100, Math.abs(value*100)>=10?1:2)}%`;
  }
  function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
  function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function valueOf(data, id, fallback=0) {
    const entry = data?.[id];
    if (!entry) return fallback;
    const n = Number(entry.value);
    return Number.isFinite(n) ? n : fallback;
  }
  function stringOf(data, id, fallback='') { return data?.[id]?.value ?? fallback; }
  function checkedOf(data, id) { return !!data?.[id]?.checked; }
  function setDataValue(data, id, value) {
    if (!data[id]) data[id] = { kind:'value', value:String(value) };
    else data[id].value = String(value);
  }
  function structureMultiplier(kind, level) {
    return kind === 'Luck' || kind === 'Speed' ? 1 + .5 * level / 7 : 1 + level / 5;
  }
  function chaskaBonus(points, rate) {
    let remaining = Math.max(0, Math.floor(Number(points)||0)), block=0, total=0;
    while (remaining>0) {
      const amount = Math.min(50,remaining);
      total += amount * rate * .85 ** block;
      remaining -= amount;
      block += 1;
    }
    return total;
  }
  function skillSpent(skills) {
    let total=0;
    for (const [key,cfg] of Object.entries(SKILLS)) total += cfg.costs.slice(0,skills[key]||0).reduce((a,b)=>a+b,0);
    return total;
  }
  function dungeonSpent(dungeon) {
    return Object.entries(DUNGEON).reduce((sum,[key,cfg])=>sum+(dungeon[key]||0)*cfg.cost,0);
  }
  function chaskaSpent(chaska) { return Object.values(chaska).reduce((a,b)=>a+(Number(b)||0),0); }

  function captureBuildData() {
    const root = $('upgradeCalcV2');
    const data = {};
    root?.querySelectorAll('input[id^="uv"],select[id^="uv"],textarea[id^="uv"]').forEach((el) => {
      if (BUILD_EXCLUDE.has(el.id)) return;
      if (el.type === 'checkbox') data[el.id] = { kind:'check', checked:!!el.checked };
      else data[el.id] = { kind:'value', value:String(el.value ?? '') };
    });
    return data;
  }

  function applyBuildData(data) {
    if (!data || typeof data !== 'object') return;
    for (const [id,entry] of Object.entries(data)) {
      const el = $(id);
      if (!el || !entry) continue;
      if (el.type === 'checkbox' || entry.kind === 'check') el.checked = !!entry.checked;
      else if ('value' in entry) el.value = String(entry.value);
    }
    const touched = Object.keys(data).map((id)=>$(id)).filter(Boolean);
    for (const el of touched) el.dispatchEvent(new Event('input',{bubbles:true}));
    for (const el of touched) el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function savedBuilds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE)||'[]');
      return Array.isArray(parsed) ? parsed.filter((b)=>b&&b.data&&b.name) : [];
    } catch { return []; }
  }
  function writeBuilds(builds) {
    try { localStorage.setItem(STORAGE, JSON.stringify(builds)); } catch {}
    refreshBuildOptions();
    renderBuilds();
  }
  function saveBuild(name, data, existingId=null) {
    name = String(name||'').trim().slice(0,60);
    if (!name) return null;
    const builds = savedBuilds();
    const now = Date.now();
    if (existingId) {
      const found = builds.find((b)=>b.id===existingId);
      if (found) { found.name=name; found.data=deepClone(data); found.updatedAt=now; writeBuilds(builds); return found; }
    }
    const build = { id:uid(), name, data:deepClone(data), createdAt:now, updatedAt:now };
    builds.unshift(build);
    writeBuilds(builds);
    return build;
  }

  function currentAllocation(data) {
    return {
      skills: Object.fromEntries(Object.entries(SKILLS).map(([key,cfg])=>[key,Math.max(0,Math.min(cfg.values.length-1,Math.floor(valueOf(data,cfg.id,0))))])),
      chaska: Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.floor(valueOf(data,cfg.id,0)))])),
      dungeon: Object.fromEntries(Object.entries(DUNGEON).map(([key,cfg])=>[key,Math.max(0,Math.min(DUNGEON_MAX,Math.floor(valueOf(data,cfg.id,0))))])),
    };
  }

  function contextFromData(data) {
    const structures = {
      Luck:Math.max(0,Math.min(7,Math.floor(valueOf(data,'uvStructureLuck',0)))),
      Speed:Math.max(0,Math.min(7,Math.floor(valueOf(data,'uvStructureSpeed',0)))),
      Platinum:Math.max(0,Math.min(5,Math.floor(valueOf(data,'uvStructurePlatinum',0)))),
      Crystal:Math.max(0,Math.min(5,Math.floor(valueOf(data,'uvStructureCrystal',0)))),
      Ruby:Math.max(0,Math.min(5,Math.floor(valueOf(data,'uvStructureRuby',0)))),
      Galaxy:Math.max(0,Math.min(5,Math.floor(valueOf(data,'uvStructureGalaxy',0)))),
    };
    return {
      data,
      rolls:Math.max(0,Math.floor(valueOf(data,'uvRolls',0))),
      index:Math.max(0,Math.floor(valueOf(data,'uvIndex',0))),
      dungeonTokens:Math.max(0,Math.floor(valueOf(data,'uvDungeonTokens',0))),
      charm:CHARM[stringOf(data,'uvCharm','None')]||{},
      structures,
      potLuck3:checkedOf(data,'uvPotLuck3'), potLegendaryLuck:checkedOf(data,'uvPotLegendaryLuck'),
      potCursed:checkedOf(data,'uvPotCursed'), potElixir:checkedOf(data,'uvPotElixir'), potEventLuck:checkedOf(data,'uvPotEventLuck'),
      potSpeed3:checkedOf(data,'uvPotSpeed3'), potLegendarySpeed:checkedOf(data,'uvPotLegendarySpeed'), potEventSpeed:checkedOf(data,'uvPotEventSpeed'),
      divine:checkedOf(data,'uvPotDivine'), borderBoost:checkedOf(data,'uvBorderBoost'), timeStorm:checkedOf(data,'uvTimeStorm'),
      boss:checkedOf(data,'uvBossPot'), surge:checkedOf(data,'uvLuckySurge'), dice:checkedOf(data,'uvDice'),
      quickdraw:checkedOf(data,'uvQuickdraw'), heavyHand:checkedOf(data,'uvHeavyHand'),
    };
  }

  function statsFor(context, allocation) {
    const skillValue = (key) => SKILLS[key].values[allocation.skills[key]||0] || 0;
    const allStat = skillValue('All');
    let luck = 1 + Math.floor(context.rolls/1e6)*.1 + (context.charm.Luck||0);
    luck *= 1 + (skillValue('Luck') + allStat)/100;
    if (context.potLuck3) luck += 25;
    if (context.potLegendaryLuck) luck += 40;
    if (context.potCursed) luck *= 1.5;
    if (context.potElixir) luck *= 2;
    if (context.potEventLuck) luck *= 1.25;
    luck *= structureMultiplier('Luck',context.structures.Luck);
    luck += (allocation.dungeon.Luck||0) * DUNGEON.Luck.per;
    luck += chaskaBonus(allocation.chaska.Luck||0, CHASKA.Luck.rate);
    if (context.quickdraw) luck *= .8;
    if (context.heavyHand) luck *= 1.2;

    let speed = 100 + (context.potSpeed3?300:0) + (context.potLegendarySpeed?500:0) + (context.charm.Cooldown||0);
    speed *= 1 + (skillValue('Speed') + allStat)/100;
    if (context.potEventSpeed) speed *= 1.25;
    speed += (allocation.dungeon.Speed||0) * DUNGEON.Speed.per;
    if (context.quickdraw) speed *= 1.1;
    if (context.heavyHand) speed *= .9;

    const be = {};
    const boost = context.borderBoost ? 1.5 : 1;
    const divine = context.divine ? 1.1 : 1;
    for (const name of BORDER_NAMES) {
      let base = (1 + (context.charm[name]||0) + skillValue(name)) * (1 + allStat/100);
      base *= structureMultiplier(name, context.structures[name]);
      const dungeon = (allocation.dungeon[name]||0) * DUNGEON[name].per;
      const chaska = CHASKA[name] ? chaskaBonus(allocation.chaska[name]||0, CHASKA[name].rate) : 0;
      be[name] = (base*boost + dungeon + chaska) * divine;
    }
    const cps = (speed/100) * structureMultiplier('Speed',context.structures.Speed) * (context.timeStorm?2:1);
    return { luck, speed, be, cps, boss:context.boss, surge:context.surge, dice:context.dice, timeStorm:context.timeStorm };
  }

  function borderRate(name, stats) { return Math.min(1, Math.max(0, stats.be[name]/BORDERS[name].denominator)); }
  function borderOutcomes(stats) {
    const out=[];
    for (let mask=0; mask<16; mask+=1) {
      let p=1,m=1;
      for (let i=0;i<4;i+=1) {
        const name=BORDER_NAMES[i], rate=borderRate(name,stats);
        if (mask&(1<<i)) { p*=rate; m*=BORDERS[name].multiplier; }
        else p*=1-rate;
      }
      if (p>0) out.push({mask,p,m});
    }
    return out;
  }
  function popcount(mask) { let n=0; for (;mask;mask>>=1) n+=mask&1; return n; }
  function borderTargetRate(stats, target, matchType) {
    const outcomes=borderOutcomes(stats);
    if (target.startsWith('any')) {
      const min=Number(target.slice(3))||2;
      return outcomes.reduce((sum,o)=>sum+(popcount(o.mask)>=min?o.p:0),0);
    }
    let mask=0;
    for (let i=0;i<4;i+=1) if (target.includes(BORDER_ABBR[BORDER_NAMES[i]])) mask|=1<<i;
    if (matchType==='exact') return outcomes.find((o)=>o.mask===mask)?.p||0;
    return outcomes.reduce((sum,o)=>sum+((o.mask&mask)===mask?o.p:0),0);
  }

  function activeCards(stats) {
    const now=Date.now()/1000;
    let pool=[];
    try { if (typeof CARD_POOL !== 'undefined' && Array.isArray(CARD_POOL)) pool=CARD_POOL; } catch {}
    if (!pool.length && Array.isArray(globalThis.ROLL_SIM_DATA_V16?.cards)) pool=globalThis.ROLL_SIM_DATA_V16.cards;
    return pool.filter((card)=>!(card.expires&&card.expires<=now) && (!card.weather || (card.weather==='Time Storm'&&stats.timeStorm)));
  }
  function luckStates(stats) {
    const surge=stats.surge&&stats.cps>0?Math.min(1,10/(30+100/stats.cps)):0;
    const dice=stats.dice?1/25:0, normal=1-dice, states=[];
    if (1-surge>0) { states.push([1,(1-surge)*normal]); if (dice) states.push([2,(1-surge)*dice]); }
    if (surge>0) { states.push([1.25,surge*normal]); if (dice) states.push([2.5,surge*dice]); }
    return states;
  }
  function distAt(stats,multiplier) {
    const cards=activeCards(stats), out=[]; let remaining=1;
    for (const card of cards) {
      const rarity=(Number(card.rarity)||1)*(Number(card.rollFactor)||1);
      const boss=stats.boss&&card.boss?5:1;
      const success=Math.min(1,stats.luck*multiplier*boss/rarity);
      const hit=remaining*success;
      if (hit>0) out.push({card,probability:hit});
      remaining*=1-success;
      if (remaining<=0) break;
    }
    if (remaining>0&&cards.length) {
      const card=cards[cards.length-1], found=out.find((e)=>e.card.name===card.name);
      if (found) found.probability+=remaining; else out.push({card,probability:remaining});
    }
    return out;
  }
  function distribution(stats) {
    const map=new Map();
    for (const [multiplier,weight] of luckStates(stats)) {
      for (const entry of distAt(stats,multiplier)) {
        const found=map.get(entry.card.name);
        if (found) found.probability+=entry.probability*weight;
        else map.set(entry.card.name,{card:entry.card,probability:entry.probability*weight});
      }
    }
    return [...map.values()];
  }
  function thresholdRate(target,stats) {
    const dist=distribution(stats), outcomes=borderOutcomes(stats); let rate=0;
    for (const entry of dist) {
      let bp=0;
      for (const outcome of outcomes) if ((Number(entry.card.rarity)||1)*outcome.m>=target) bp+=outcome.p;
      rate+=entry.probability*bp;
    }
    return Math.min(1,Math.max(0,rate));
  }
  function rarityQuality(stats) {
    const dist=distribution(stats), outcomes=borderOutcomes(stats); let quality=0;
    for (const entry of dist) {
      for (const outcome of outcomes) {
        quality += entry.probability*outcome.p*Math.log10(Math.max(1,(Number(entry.card.rarity)||1)*outcome.m));
      }
    }
    return quality;
  }

  function optimizerSettings() {
    return {
      goal:$('optGoal')?.value||'borders',
      borderTarget:$('optBorderTarget')?.value||'PCR',
      matchType:$('optMatchType')?.value||'contains',
      rarity:Math.max(1,Number($('optRarityTarget')?.value)||1e15),
      seconds:Math.max(60,(Number($('optDurationValue')?.value)||1) * ({hour:3600,day:86400}[ $('optDurationUnit')?.value ]||86400)),
    };
  }
  function scoreFor(stats,settings) {
    if (settings.goal==='mostRolls') return stats.cps;
    if (settings.goal==='borders') return stats.cps*borderTargetRate(stats,settings.borderTarget,settings.matchType);
    if (settings.goal==='targetRarity') return stats.cps*thresholdRate(settings.rarity,stats);
    if (settings.goal==='highestRarity') return stats.cps*rarityQuality(stats);
    const any2=borderTargetRate(stats,'any2','contains');
    return Math.log1p(stats.cps*3600) + .72*Math.log1p(stats.luck) + .42*Math.log1p(any2*1e6);
  }
  function metricFor(stats,settings) {
    if (settings.goal==='mostRolls') return { value:stats.cps*settings.seconds, label:`Rolls in ${durationShort(settings.seconds)}` };
    if (settings.goal==='borders') return { value:stats.cps*settings.seconds*borderTargetRate(stats,settings.borderTarget,settings.matchType), label:`${borderTargetLabel(settings)} hits in ${durationShort(settings.seconds)}` };
    if (settings.goal==='targetRarity') return { value:stats.cps*settings.seconds*thresholdRate(settings.rarity,stats), label:`≥ ${fmt(settings.rarity)} hits in ${durationShort(settings.seconds)}` };
    if (settings.goal==='highestRarity') return { value:stats.cps*3600*rarityQuality(stats), label:'Rarity quality / hour' };
    return { value:scoreFor(stats,settings), label:'Balanced efficiency score' };
  }
  function durationShort(seconds) {
    if (seconds%86400===0) return `${seconds/86400}d`;
    if (seconds%3600===0) return `${seconds/3600}h`;
    return `${Math.round(seconds/60)}m`;
  }
  function borderTargetLabel(settings) {
    if (settings.borderTarget.startsWith('any')) return `Any ${settings.borderTarget.slice(3)}+ Borders`;
    return settings.matchType==='exact' ? `Exact ${settings.borderTarget}` : `${settings.borderTarget}+`;
  }

  function locks() {
    const out={skills:new Set(),chaska:new Set(),dungeon:new Set()};
    document.querySelectorAll('#optimizerCalcV1 [data-opt-lock]:checked').forEach((input)=>out[input.dataset.group]?.add(input.dataset.key));
    return out;
  }
  function baseCandidate(current,lockState) {
    const c={skills:{},chaska:{},dungeon:{}};
    for (const key of Object.keys(SKILLS)) c.skills[key]=lockState.skills.has(key)?current.skills[key]:0;
    for (const key of Object.keys(CHASKA)) c.chaska[key]=lockState.chaska.has(key)?current.chaska[key]:0;
    for (const key of Object.keys(DUNGEON)) c.dungeon[key]=lockState.dungeon.has(key)?current.dungeon[key]:0;
    return c;
  }
  function candidateKey(c) {
    return `${Object.values(c.skills).join(',')}|${Object.values(c.chaska).join(',')}|${Object.values(c.dungeon).join(',')}`;
  }

  function optimizeGroup(candidate,group,budget,lockState,scoreFn) {
    let remaining = budget - (group==='skills'?skillSpent(candidate.skills):group==='chaska'?chaskaSpent(candidate.chaska):dungeonSpent(candidate.dungeon));
    if (remaining<=0) return candidate;
    let guard=0;
    while (remaining>0 && guard<5000) {
      guard+=1;
      const baseScore=scoreFn(candidate);
      let best=null;
      if (group==='skills') {
        for (const [key,cfg] of Object.entries(SKILLS)) {
          if (lockState.skills.has(key)) continue;
          const level=candidate.skills[key]||0;
          if (level>=cfg.costs.length) continue;
          const cost=cfg.costs[level];
          if (cost>remaining) continue;
          const test=deepClone(candidate); test.skills[key]=level+1;
          const gain=scoreFn(test)-baseScore;
          const efficiency=gain/cost;
          if (!best || efficiency>best.efficiency) best={test,cost,efficiency,gain};
        }
      } else if (group==='dungeon') {
        for (const [key,cfg] of Object.entries(DUNGEON)) {
          if (lockState.dungeon.has(key)) continue;
          const level=candidate.dungeon[key]||0;
          if (level>=DUNGEON_MAX || cfg.cost>remaining) continue;
          const test=deepClone(candidate); test.dungeon[key]=level+1;
          const gain=scoreFn(test)-baseScore;
          const efficiency=gain/cfg.cost;
          if (!best || efficiency>best.efficiency) best={test,cost:cfg.cost,efficiency,gain};
        }
      } else {
        for (const [key] of Object.entries(CHASKA)) {
          if (lockState.chaska.has(key)) continue;
          const current=candidate.chaska[key]||0;
          const toBoundary=50-(current%50||0);
          const chunk=Math.min(remaining,current%50===0?Math.min(50,remaining):Math.min(toBoundary,remaining));
          if (chunk<=0) continue;
          const test=deepClone(candidate); test.chaska[key]=current+chunk;
          const gain=scoreFn(test)-baseScore;
          const efficiency=gain/chunk;
          if (!best || efficiency>best.efficiency) best={test,cost:chunk,efficiency,gain};
        }
      }
      if (!best || !(best.gain>1e-12)) break;
      candidate=best.test;
      remaining-=best.cost;
    }
    return candidate;
  }

  function runOptimizer() {
    const source=startingData||captureBuildData();
    const context=contextFromData(source);
    const current=currentAllocation(source);
    const settings=optimizerSettings();
    const lockState=locks();
    const maxSkill=Math.floor(context.index/50), maxChaska=Math.floor(context.rolls/50000), maxDungeon=context.dungeonTokens;
    const budgets={
      skills:Math.max(0,Math.min(maxSkill,Math.floor(Number($('optSkillBudget')?.value)||0))),
      chaska:Math.max(0,Math.min(maxChaska,Math.floor(Number($('optChaskaBudget')?.value)||0))),
      dungeon:Math.max(0,Math.min(maxDungeon,Math.floor(Number($('optDungeonBudget')?.value)||0))),
    };
    const locked=baseCandidate(current,lockState);
    const lockedCost={skills:skillSpent(locked.skills),chaska:chaskaSpent(locked.chaska),dungeon:dungeonSpent(locked.dungeon)};
    for (const key of Object.keys(budgets)) {
      if (lockedCost[key]>budgets[key]) {
        showOptError(`Locked ${key} already use ${lockedCost[key]} but the optimizer budget is only ${budgets[key]}. Increase the budget or unlock something.`);
        return;
      }
    }
    showOptError('');
    const scoreCache=new Map();
    const scoreFn=(candidate)=>{
      const key=candidateKey(candidate);
      if (scoreCache.has(key)) return scoreCache.get(key);
      const value=scoreFor(statsFor(context,candidate),settings);
      scoreCache.set(key,value);
      return value;
    };
    const orders=[
      ['skills','dungeon','chaska'], ['chaska','skills','dungeon'], ['dungeon','chaska','skills'], ['skills','chaska','dungeon']
    ];
    let best=locked, bestScore=scoreFn(locked);
    for (const order of orders) {
      let candidate=deepClone(locked);
      for (let pass=0;pass<2;pass+=1) for (const group of order) candidate=optimizeGroup(candidate,group,budgets[group],lockState,scoreFn);
      const score=scoreFn(candidate);
      if (score>bestScore) { best=candidate; bestScore=score; }
    }
    const currentStats=statsFor(context,current), bestStats=statsFor(context,best);
    const recommendation=deepClone(source);
    for (const [key,cfg] of Object.entries(SKILLS)) setDataValue(recommendation,cfg.id,best.skills[key]);
    for (const [key,cfg] of Object.entries(CHASKA)) setDataValue(recommendation,cfg.id,best.chaska[key]);
    for (const [key,cfg] of Object.entries(DUNGEON)) setDataValue(recommendation,cfg.id,best.dungeon[key]);
    lastRecommendation={data:recommendation,allocation:best,current,context,settings,budgets,currentStats,bestStats};
    renderRecommendation(lastRecommendation);
  }

  function showOptError(message) {
    const el=$('optError'); if (!el) return; el.hidden=!message; el.textContent=message||'';
  }
  function metricText(value) {
    if (!Number.isFinite(value)) return '—';
    if (value>=1000) return fmt(value,2);
    if (value>=1) return trim(value,2);
    if (value>=.01) return trim(value,3);
    if (value>0) return trim(value,5);
    return '0';
  }
  function allocationRows(rec) {
    const rows=[];
    for (const [key,cfg] of Object.entries(SKILLS)) rows.push(['Skill Tree',cfg.label,rec.current.skills[key],rec.allocation.skills[key],`Lv ${rec.current.skills[key]}`,`Lv ${rec.allocation.skills[key]}`]);
    for (const [key,cfg] of Object.entries(CHASKA)) rows.push(["Chaska's Blessing",cfg.label,rec.current.chaska[key],rec.allocation.chaska[key],fmt(rec.current.chaska[key]),fmt(rec.allocation.chaska[key])]);
    for (const [key,cfg] of Object.entries(DUNGEON)) rows.push(['Dungeon',cfg.label,rec.current.dungeon[key],rec.allocation.dungeon[key],`Lv ${rec.current.dungeon[key]}`,`Lv ${rec.allocation.dungeon[key]}`]);
    return rows;
  }
  function renderRecommendation(rec) {
    const out=$('optResults'); if (!out) return;
    const before=metricFor(rec.currentStats,rec.settings), after=metricFor(rec.bestStats,rec.settings);
    const improvement=before.value>0?(after.value/before.value-1):after.value>0?Infinity:0;
    const rows=allocationRows(rec);
    const changed=rows.filter((row)=>row[2]!==row[3]);
    const skillUsed=skillSpent(rec.allocation.skills), chaskaUsed=chaskaSpent(rec.allocation.chaska), dungeonUsed=dungeonSpent(rec.allocation.dungeon);
    const topChanges=changed.slice(0,5).map((row)=>`${row[1]} ${row[4]} → ${row[5]}`);
    out.innerHTML=`
      <div class="opt-result-head"><div><span>Recommended Build</span><strong>${esc(before.label)}</strong></div><b class="opt-improvement">${Number.isFinite(improvement)?`${improvement>=0?'+':''}${pct(improvement)}`:'New target'}</b></div>
      <div class="opt-metric-grid">
        <div><span>Current</span><strong>${esc(metricText(before.value))}</strong></div>
        <div class="best"><span>Optimized</span><strong>${esc(metricText(after.value))}</strong></div>
        <div><span>Luck</span><strong>${esc(fmt(rec.currentStats.luck,2))} → ${esc(fmt(rec.bestStats.luck,2))}</strong></div>
        <div><span>Rolls / sec</span><strong>${esc(fmt(rec.currentStats.cps,2))} → ${esc(fmt(rec.bestStats.cps,2))}</strong></div>
      </div>
      <div class="opt-resource-grid">
        <div><span>Skill Points</span><strong>${skillUsed} / ${rec.budgets.skills}</strong><small>${rec.budgets.skills-skillUsed} left</small></div>
        <div><span>Chaska Points</span><strong>${fmt(chaskaUsed)} / ${fmt(rec.budgets.chaska)}</strong><small>${fmt(rec.budgets.chaska-chaskaUsed)} left</small></div>
        <div><span>Dungeon Tokens</span><strong>${dungeonUsed} / ${rec.budgets.dungeon}</strong><small>${rec.budgets.dungeon-dungeonUsed} left</small></div>
      </div>
      <div class="opt-final-borders">${BORDER_NAMES.map((name)=>`<div class="${name.toLowerCase()}"><span>${name}</span><strong>${fmt(rec.currentStats.be[name],2)}× → ${fmt(rec.bestStats.be[name],2)}×</strong></div>`).join('')}</div>
      <div class="opt-change-table-wrap"><table class="opt-change-table"><thead><tr><th>System</th><th>Upgrade</th><th>Current</th><th>Recommended</th></tr></thead><tbody>${rows.map((row)=>`<tr class="${row[2]!==row[3]?'changed':''}"><td>${esc(row[0])}</td><td><strong>${esc(row[1])}</strong></td><td>${esc(row[4])}</td><td>${esc(row[5])}</td></tr>`).join('')}</tbody></table></div>
      <div class="opt-why"><strong>Why this build?</strong><span>${esc(explanation(rec,topChanges))}</span></div>
      <div class="opt-result-actions"><button type="button" data-opt-action="apply">Apply Build</button><button type="button" data-opt-action="save">Save Build</button><button type="button" class="primary" data-opt-action="sim">Send to Roll Simulator</button></div>`;
  }
  function explanation(rec,topChanges) {
    const goal=rec.settings.goal==='borders'?`the most ${borderTargetLabel(rec.settings)} pulls`:rec.settings.goal==='targetRarity'?`the most ≥ ${fmt(rec.settings.rarity)} pulls`:rec.settings.goal==='mostRolls'?'the most total rolls':rec.settings.goal==='highestRarity'?'higher-rarity outcomes':'a balanced mix of speed, luck, and multi-border odds';
    const changes=topChanges.length?` The biggest allocation changes are ${topChanges.join(', ')}.`:' Your current allocation was already the best one found for the selected limits.';
    return `The optimizer compared the next Skill Tree, Chaska, and Dungeon investments by how much they improve ${goal} per resource spent. Structures, charm, potions, and modifiers stay fixed from the starting build.${changes}`;
  }

  function syncBudgetLimits(data) {
    const context=contextFromData(data||captureBuildData());
    const max={skill:Math.floor(context.index/50),chaska:Math.floor(context.rolls/50000),dungeon:context.dungeonTokens};
    const fields=[['optSkillBudget',max.skill],['optChaskaBudget',max.chaska],['optDungeonBudget',max.dungeon]];
    for (const [id,value] of fields) {
      const el=$(id); if (!el) continue; el.max=String(value); el.value=String(value);
    }
    if ($('optSkillMax')) $('optSkillMax').textContent=`Max ${fmt(max.skill)} from Index`;
    if ($('optChaskaMax')) $('optChaskaMax').textContent=`Max ${fmt(max.chaska)} from Total Rolls`;
    if ($('optDungeonMax')) $('optDungeonMax').textContent=`Max ${fmt(max.dungeon)} from Upgrades`;
  }

  function lockGrid(group,configs) {
    return Object.entries(configs).map(([key,cfg])=>`<label class="opt-lock"><input type="checkbox" data-opt-lock data-group="${group}" data-key="${key}"><span>${esc(cfg.label)}</span></label>`).join('');
  }
  function buildOptimizerUi() {
    if ($('optimizerCalcV1')) return;
    const upgrade=$('upgradeCalcV2'), page=document.querySelector('main.page');
    if (!upgrade||!page) return;
    const root=document.createElement('section');
    root.id='optimizerCalcV1'; root.className='opt-root'; root.hidden=true;
    root.innerHTML=`
      <section class="opt-hero"><div><span>Build Optimizer</span><strong>Spend your resources where they produce the best result.</strong><small>Optimizes Skill Tree, Chaska, and Dungeon. Your structures, charm, potions, and modifiers stay fixed.</small></div><button type="button" id="optSync">Sync Current Upgrades</button></section>
      <section class="opt-layout">
        <article class="opt-panel">
          <div class="opt-panel-title"><span>01</span><strong>Goal</strong></div>
          <label class="opt-field"><span>Optimize For</span><select id="optGoal"><option value="borders">Border Combination</option><option value="targetRarity">Target Card Rarity</option><option value="mostRolls">Most Rolls / Cards</option><option value="highestRarity">Highest Rarity Quality</option><option value="overall">Best Overall</option></select></label>
          <div id="optBorderOptions" class="opt-subgrid"><label class="opt-field"><span>Border Target</span><select id="optBorderTarget"><option value="P">P</option><option value="C">C</option><option value="R">R</option><option value="G">G</option><option value="PC">PC</option><option value="PR">PR</option><option value="PG">PG</option><option value="CR">CR</option><option value="CG">CG</option><option value="RG">RG</option><option value="PCR" selected>PCR</option><option value="PCG">PCG</option><option value="PRG">PRG</option><option value="CRG">CRG</option><option value="PCRG">PCRG</option><option value="any2">Any 2+ Borders</option><option value="any3">Any 3+ Borders</option><option value="any4">Any 4 Borders</option></select></label><label class="opt-field" id="optMatchWrap"><span>Target Type</span><select id="optMatchType"><option value="contains">Contains Selected Borders</option><option value="exact">Exact Combination Only</option></select></label></div>
          <label class="opt-field" id="optRarityWrap" hidden><span>Minimum Rarity</span><input id="optRarityTarget" type="number" min="1" step="any" value="1000000000000000"></label>
          <div class="opt-subgrid"><label class="opt-field"><span>Result Time</span><input id="optDurationValue" type="number" min="1" max="168" step="1" value="1"></label><label class="opt-field"><span>Unit</span><select id="optDurationUnit"><option value="hour">Hours</option><option value="day" selected>Days</option></select></label></div>
        </article>
        <article class="opt-panel">
          <div class="opt-panel-title"><span>02</span><strong>Starting Build & Resources</strong></div>
          <label class="opt-field"><span>Starting Build</span><select id="optStartingBuild"><option value="current">Current Upgrades</option></select></label>
          <div class="opt-budget-grid">
            <label><span>Skill Points</span><input id="optSkillBudget" type="number" min="0" step="1"><small id="optSkillMax"></small></label>
            <label><span>Chaska Points</span><input id="optChaskaBudget" type="number" min="0" step="1"><small id="optChaskaMax"></small></label>
            <label><span>Dungeon Tokens</span><input id="optDungeonBudget" type="number" min="0" step="1"><small id="optDungeonMax"></small></label>
          </div>
          <small class="opt-note">You can lower a budget to save resources. The maximum comes from the selected build, so applying the recommendation stays valid.</small>
        </article>
      </section>
      <section class="opt-panel opt-lock-panel"><div class="opt-panel-title"><span>03</span><strong>Locks</strong><small>Checked stats stay exactly where they are.</small></div><div class="opt-lock-groups"><div><b>Skill Tree</b><div>${lockGrid('skills',SKILLS)}</div></div><div><b>Chaska</b><div>${lockGrid('chaska',CHASKA)}</div></div><div><b>Dungeon</b><div>${lockGrid('dungeon',DUNGEON)}</div></div></div></section>
      <div id="optError" class="opt-error" hidden></div>
      <div class="opt-run-row"><button type="button" id="optRun" class="opt-run">Optimize Build</button><span>Uses the site's real stat, speed, dungeon-cost, Chaska diminishing-return, and multi-border math.</span></div>
      <section id="optResults" class="opt-results"><div class="opt-empty"><strong>Ready to optimize</strong><span>Choose a goal, then optimize to get a recommended allocation.</span></div></section>`;
    upgrade.insertAdjacentElement('afterend',root);
  }

  function buildBuildsUi() {
    if ($('savedBuildsV1')) return;
    const opt=$('optimizerCalcV1'), upgrade=$('upgradeCalcV2');
    if (!opt||!upgrade) return;
    const root=document.createElement('section'); root.id='savedBuildsV1'; root.className='builds-root'; root.hidden=true;
    root.innerHTML=`
      <section class="builds-head"><div><span>Saved Builds</span><strong>Name, load, compare, and reuse your setups.</strong><small>Saved builds stay in this browser. Export a JSON file if you want to move one to another device.</small></div><div class="builds-head-actions"><button type="button" id="buildSaveCurrent">Save Current Build</button><label class="build-import">Import Build<input id="buildImportFile" type="file" accept="application/json,.json"></label></div></section>
      <section id="buildList" class="build-list"></section>`;
    opt.insertAdjacentElement('afterend',root);
  }

  function addTabs() {
    const switcher=document.querySelector('.uv-mode-switch'); if (!switcher) return false;
    if (!switcher.querySelector('[data-view="optimizer"]')) {
      const b=document.createElement('button'); b.type='button'; b.className='uv-mode'; b.dataset.view='optimizer'; b.textContent='Optimizer';
      const roll= switcher.querySelector('[data-view="rollsim"]'); switcher.insertBefore(b,roll||null);
    }
    if (!switcher.querySelector('[data-view="builds"]')) {
      const b=document.createElement('button'); b.type='button'; b.className='uv-mode'; b.dataset.view='builds'; b.textContent='Builds'; switcher.append(b);
    }
    return true;
  }
  function showCustomView(view) {
    const upgrade=$('upgradeCalcV2'), opt=$('optimizerCalcV1'), builds=$('savedBuildsV1'), sim=$('rollSimulatorV15');
    if (view==='optimizer') {
      if (upgrade) { upgrade.hidden=true; upgrade.style.setProperty('display','none','important'); }
      if (sim) { sim.hidden=true; sim.style.setProperty('display','none','important'); }
      if (builds) { builds.hidden=true; builds.style.setProperty('display','none','important'); }
      if (opt) { opt.hidden=false; opt.style.setProperty('display','grid','important'); }
    } else if (view==='builds') {
      if (upgrade) { upgrade.hidden=true; upgrade.style.setProperty('display','none','important'); }
      if (sim) { sim.hidden=true; sim.style.setProperty('display','none','important'); }
      if (opt) { opt.hidden=true; opt.style.setProperty('display','none','important'); }
      if (builds) { builds.hidden=false; builds.style.setProperty('display','grid','important'); }
      renderBuilds();
    } else {
      if (opt) { opt.hidden=true; opt.style.setProperty('display','none','important'); }
      if (builds) { builds.hidden=true; builds.style.setProperty('display','none','important'); }
    }
    document.querySelectorAll('.uv-mode-switch .uv-mode').forEach((b)=>b.classList.toggle('active',b.dataset.view===view));
  }

  function refreshBuildOptions() {
    const select=$('optStartingBuild'); if (!select) return;
    const current=select.value;
    select.innerHTML='<option value="current">Current Upgrades</option>'+savedBuilds().map((b)=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('');
    if ([...select.options].some((o)=>o.value===current)) select.value=current;
  }
  function chooseStartingBuild() {
    const id=$('optStartingBuild')?.value||'current';
    if (id==='current') startingData=captureBuildData();
    else startingData=deepClone(savedBuilds().find((b)=>b.id===id)?.data||captureBuildData());
    syncBudgetLimits(startingData);
    lastRecommendation=null;
    if ($('optResults')) $('optResults').innerHTML='<div class="opt-empty"><strong>Starting build changed</strong><span>Run the optimizer again for this setup.</span></div>';
  }

  function buildSummary(build) {
    const d=build.data||{}; const rolls=valueOf(d,'uvRolls',0), charm=stringOf(d,'uvCharm','None');
    const sp=Math.floor(valueOf(d,'uvIndex',0)/50), ch=Math.floor(valueOf(d,'uvRolls',0)/50000), dt=valueOf(d,'uvDungeonTokens',0);
    return `${fmt(rolls)} rolls · ${charm} · ${fmt(sp)} SP · ${fmt(ch)} Chaska · ${fmt(dt)} Dungeon`;
  }
  function renderBuilds() {
    const list=$('buildList'); if (!list) return;
    const builds=savedBuilds();
    if (!builds.length) { list.innerHTML='<div class="build-empty"><strong>No saved builds yet</strong><span>Save your current Upgrades setup or save an optimizer recommendation.</span></div>'; return; }
    list.innerHTML=builds.map((b)=>`<article class="build-card" data-build-id="${esc(b.id)}"><div class="build-card-main"><strong>${esc(b.name)}</strong><span>${esc(buildSummary(b))}</span><small>Updated ${new Date(b.updatedAt||b.createdAt||Date.now()).toLocaleString()}</small></div><div class="build-actions"><button type="button" data-build-action="load">Load</button><button type="button" data-build-action="optimize">Optimize</button><button type="button" data-build-action="rename">Rename</button><button type="button" data-build-action="duplicate">Duplicate</button><button type="button" data-build-action="export">Export</button><button type="button" class="danger" data-build-action="delete">Delete</button></div></article>`).join('');
  }
  function downloadJson(filename,payload) {
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=filename.replace(/[^a-z0-9._-]+/gi,'_'); document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function handleBuildAction(event) {
    const button=event.target.closest('[data-build-action]'); if (!button) return;
    const id=button.closest('[data-build-id]')?.dataset.buildId, builds=savedBuilds(), build=builds.find((b)=>b.id===id); if (!build) return;
    const action=button.dataset.buildAction;
    if (action==='load') { applyBuildData(build.data); document.querySelector('.uv-mode-switch [data-view="upgrades"]')?.click(); return; }
    if (action==='optimize') { const tab=document.querySelector('.uv-mode-switch [data-view="optimizer"]'); tab?.click(); refreshBuildOptions(); if ($('optStartingBuild')) $('optStartingBuild').value=build.id; chooseStartingBuild(); return; }
    if (action==='rename') { const name=prompt('Build name:',build.name); if (name?.trim()) { build.name=name.trim().slice(0,60); build.updatedAt=Date.now(); writeBuilds(builds); } return; }
    if (action==='duplicate') { saveBuild(`${build.name} Copy`,build.data); return; }
    if (action==='export') { downloadJson(`${build.name}.json`,{type:'hitcalc-build',version:1,name:build.name,data:build.data}); return; }
    if (action==='delete' && confirm(`Delete "${build.name}"?`)) writeBuilds(builds.filter((b)=>b.id!==id));
  }
  async function importBuild(file) {
    if (!file) return;
    try {
      const parsed=JSON.parse(await file.text());
      if (parsed?.type!=='hitcalc-build'||!parsed?.data||typeof parsed.data!=='object') throw new Error('Not a Hit Calc build file.');
      saveBuild(String(parsed.name||file.name.replace(/\.json$/i,'')||'Imported Build'),parsed.data);
    } catch (error) { alert(`Could not import build: ${error.message||error}`); }
    if ($('buildImportFile')) $('buildImportFile').value='';
  }

  function updateGoalUi() {
    const goal=$('optGoal')?.value;
    if ($('optBorderOptions')) $('optBorderOptions').hidden=goal!=='borders';
    if ($('optRarityWrap')) $('optRarityWrap').hidden=goal!=='targetRarity';
    const target=$('optBorderTarget')?.value||'';
    if ($('optMatchWrap')) $('optMatchWrap').hidden=target.startsWith('any');
  }
  function handleOptResultAction(event) {
    const action=event.target.closest('[data-opt-action]')?.dataset.optAction; if (!action||!lastRecommendation) return;
    if (action==='apply') { applyBuildData(lastRecommendation.data); startingData=captureBuildData(); syncBudgetLimits(startingData); flashOpt('Recommended build applied to Upgrades.'); return; }
    if (action==='save') { const suggestion=lastRecommendation.settings.goal==='borders'?`${borderTargetLabel(lastRecommendation.settings)} Farm`:lastRecommendation.settings.goal==='targetRarity'?`${fmt(lastRecommendation.settings.rarity)} Hunt`:'Optimized Build'; const name=prompt('Build name:',suggestion); if (name?.trim()) { saveBuild(name,lastRecommendation.data); flashOpt(`Saved as ${name.trim()}.`); } return; }
    if (action==='sim') { applyBuildData(lastRecommendation.data); document.querySelector('.uv-mode-switch [data-view="rollsim"]')?.click(); }
  }
  function flashOpt(message) {
    const error=$('optError'); if (!error) return; error.hidden=false; error.classList.add('success'); error.textContent=message; clearTimeout(flashOpt.timer); flashOpt.timer=setTimeout(()=>{error.hidden=true;error.classList.remove('success');},2200);
  }

  function updateGoalUi() {
    const goal=$('optGoal')?.value;
    if ($('optBorderOptions')) $('optBorderOptions').hidden=goal!=='borders';
    if ($('optRarityWrap')) $('optRarityWrap').hidden=goal!=='targetRarity';
    const target=$('optBorderTarget')?.value||'';
    if ($('optMatchWrap')) $('optMatchWrap').hidden=target.startsWith('any');
  }

  function styles() {
    if ($('optimizer-builds-v1-styles')) return;
    const style=document.createElement('style'); style.id='optimizer-builds-v1-styles'; style.textContent=`
      #optimizerCalcV1,#savedBuildsV1{display:grid;gap:14px;margin-top:16px;color:var(--text)}#optimizerCalcV1[hidden],#savedBuildsV1[hidden]{display:none!important}
      .opt-hero,.builds-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}
      .opt-hero span,.builds-head span{display:block;color:var(--blue);font-size:.61rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.opt-hero strong,.builds-head strong{display:block;margin-top:4px;font-size:1rem}.opt-hero small,.builds-head small{display:block;margin-top:4px;color:var(--muted);font-size:.63rem;max-width:720px}
      .opt-hero button,.builds-head button,.build-import{min-height:36px;padding:0 13px;border:1px solid var(--line-2);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:.65rem;font-weight:850;cursor:pointer;display:inline-grid;place-items:center}.build-import input{display:none}
      .opt-layout{display:grid;grid-template-columns:1fr 1fr;gap:14px}.opt-panel{min-width:0;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.opt-panel-title{display:flex;align-items:baseline;gap:8px;margin-bottom:12px}.opt-panel-title>span{color:var(--blue);font-size:.58rem;font-weight:900}.opt-panel-title>strong{font-size:.76rem;text-transform:uppercase;letter-spacing:.06em}.opt-panel-title>small{margin-left:auto;color:var(--muted);font-size:.57rem}
      .opt-field{display:grid;gap:6px;margin-top:9px}.opt-field>span,.opt-budget-grid label>span{color:var(--muted);font-size:.61rem;font-weight:850}.opt-field input,.opt-field select,.opt-budget-grid input{width:100%;min-width:0;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:.72rem;font-weight:750;box-sizing:border-box}.opt-subgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.opt-subgrid[hidden],.opt-field[hidden]{display:none!important}
      .opt-budget-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}.opt-budget-grid label{min-width:0;padding:9px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.opt-budget-grid input{margin-top:5px;background:var(--panel)}.opt-budget-grid small{display:block;margin-top:4px;color:var(--muted);font-size:.53rem}.opt-note{display:block;margin-top:9px;color:var(--muted);font-size:.57rem}
      .opt-lock-groups{display:grid;grid-template-columns:1.2fr .8fr 1fr;gap:10px}.opt-lock-groups>div{padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.opt-lock-groups b{display:block;margin-bottom:7px;font-size:.63rem}.opt-lock-groups>div>div{display:flex;flex-wrap:wrap;gap:5px}.opt-lock{display:flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid var(--line);border-radius:7px;background:var(--panel);font-size:.58rem;font-weight:750}.opt-lock input{margin:0;accent-color:var(--blue)}
      .opt-error{padding:10px 12px;border:1px solid color-mix(in srgb,#ff6b75 55%,var(--line));border-radius:9px;background:color-mix(in srgb,#ff6b75 8%,var(--panel));color:#ff9ca3;font-size:.66rem;font-weight:750}.opt-error.success{border-color:color-mix(in srgb,#72dda3 55%,var(--line));color:#91eab8;background:color-mix(in srgb,#72dda3 8%,var(--panel))}
      .opt-run-row{display:flex;align-items:center;gap:12px}.opt-run{min-height:42px;padding:0 20px;border:1px solid var(--blue);border-radius:9px;background:var(--blue);color:#07111d;font:inherit;font-size:.72rem;font-weight:950;cursor:pointer}.opt-run:disabled{opacity:.55;cursor:wait}.opt-run-row>span{color:var(--muted);font-size:.6rem}
      .opt-results{display:grid;gap:10px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.opt-empty{min-height:130px;display:grid;place-content:center;gap:5px;text-align:center;color:var(--muted)}.opt-empty strong{color:var(--text)}
      .opt-result-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}.opt-result-head span{display:block;color:var(--blue);font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.opt-result-head strong{display:block;margin-top:3px;font-size:.88rem}.opt-improvement{font-size:1.05rem;color:#8be4b0}
      .opt-metric-grid,.opt-resource-grid,.opt-final-borders{display:grid;gap:7px}.opt-metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.opt-resource-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.opt-final-borders{grid-template-columns:repeat(4,minmax(0,1fr))}.opt-metric-grid>div,.opt-resource-grid>div,.opt-final-borders>div{padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.opt-metric-grid span,.opt-resource-grid span,.opt-final-borders span{display:block;color:var(--muted);font-size:.53rem;font-weight:850;text-transform:uppercase}.opt-metric-grid strong,.opt-resource-grid strong,.opt-final-borders strong{display:block;margin-top:4px;font-size:.74rem}.opt-resource-grid small{display:block;margin-top:2px;color:var(--muted);font-size:.52rem}.opt-metric-grid .best{border-color:color-mix(in srgb,var(--blue) 50%,var(--line))}.opt-final-borders .platinum strong{color:var(--platinum)}.opt-final-borders .crystal strong{color:var(--crystal)}.opt-final-borders .ruby strong{color:var(--ruby)}.opt-final-borders .galaxy strong{color:var(--galaxy)}
      .opt-change-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:9px}.opt-change-table{width:100%;border-collapse:collapse;min-width:560px;font-size:.62rem}.opt-change-table th,.opt-change-table td{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left}.opt-change-table th{background:var(--panel-2);color:var(--muted);font-size:.52rem;text-transform:uppercase}.opt-change-table tr:last-child td{border-bottom:0}.opt-change-table tr.changed{background:color-mix(in srgb,var(--blue) 6%,transparent)}.opt-change-table tr.changed td:last-child{color:var(--blue);font-weight:900}
      .opt-why{display:grid;gap:4px;padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.opt-why strong{font-size:.65rem}.opt-why span{color:var(--muted);font-size:.59rem;line-height:1.5}.opt-result-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:7px}.opt-result-actions button{min-height:34px;padding:0 12px;border:1px solid var(--line-2);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:.62rem;font-weight:850;cursor:pointer}.opt-result-actions button.primary{background:var(--blue);border-color:var(--blue);color:#07111d}
      .builds-head-actions{display:flex;flex-wrap:wrap;gap:7px}.build-list{display:grid;gap:8px}.build-empty{min-height:160px;display:grid;place-content:center;gap:5px;padding:20px;border:1px dashed var(--line-2);border-radius:14px;color:var(--muted);text-align:center}.build-empty strong{color:var(--text)}.build-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.build-card-main{min-width:0}.build-card-main>strong{display:block;font-size:.82rem}.build-card-main>span{display:block;margin-top:4px;color:var(--muted);font-size:.61rem;overflow-wrap:anywhere}.build-card-main>small{display:block;margin-top:3px;color:var(--muted);font-size:.52rem}.build-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;max-width:480px}.build-actions button{min-height:30px;padding:0 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel-2);color:var(--muted);font:inherit;font-size:.56rem;font-weight:850;cursor:pointer}.build-actions button:hover{color:var(--text);border-color:var(--line-2)}.build-actions button.danger:hover{color:#ff9ca3;border-color:#ff6b75}
      @media(max-width:900px){.opt-layout{grid-template-columns:1fr}.opt-lock-groups{grid-template-columns:1fr}.opt-metric-grid,.opt-final-borders{grid-template-columns:1fr 1fr}.build-card{grid-template-columns:1fr}.build-actions{justify-content:flex-start;max-width:none}}
      @media(max-width:620px){.opt-hero,.builds-head{align-items:flex-start;flex-direction:column}.opt-hero button,.builds-head-actions,.builds-head button,.build-import{width:100%}.opt-subgrid,.opt-budget-grid,.opt-metric-grid,.opt-resource-grid,.opt-final-borders{grid-template-columns:1fr}.opt-run-row{align-items:stretch;flex-direction:column}.opt-run{width:100%}.opt-result-head{align-items:flex-start;flex-direction:column}.build-actions{display:grid;grid-template-columns:1fr 1fr}.build-actions button{min-height:36px}}
    `; document.head.append(style);
  }

  function bind() {
    const switcher=document.querySelector('.uv-mode-switch');
    switcher?.addEventListener('click',(event)=>{
      const button=event.target.closest('.uv-mode'); if (!button) return;
      const view=button.dataset.view;
      if (view==='optimizer'||view==='builds') { event.preventDefault(); showCustomView(view); }
      else showCustomView(view);
    },true);
    $('optSync')?.addEventListener('click',()=>{ if ($('optStartingBuild')) $('optStartingBuild').value='current'; startingData=captureBuildData(); syncBudgetLimits(startingData); flashOpt('Synced current Upgrades.'); });
    $('optStartingBuild')?.addEventListener('change',chooseStartingBuild);
    $('optGoal')?.addEventListener('change',updateGoalUi); $('optBorderTarget')?.addEventListener('change',updateGoalUi);
    $('optRun')?.addEventListener('click',()=>{ const b=$('optRun'); b.disabled=true; b.textContent='Optimizing…'; setTimeout(()=>{ try{runOptimizer();}finally{b.disabled=false;b.textContent='Optimize Build';}},20); });
    $('optResults')?.addEventListener('click',handleOptResultAction);
    $('buildSaveCurrent')?.addEventListener('click',()=>{ const name=prompt('Build name:','My Build'); if (name?.trim()) saveBuild(name,captureBuildData()); });
    $('buildImportFile')?.addEventListener('change',(e)=>importBuild(e.target.files?.[0]));
    $('buildList')?.addEventListener('click',handleBuildAction);
  }

  function init() {
    if (!$('upgradeCalcV2')||!document.querySelector('.uv-mode-switch')) return false;
    buildOptimizerUi(); buildBuildsUi(); addTabs(); styles(); bind(); refreshBuildOptions(); renderBuilds();
    startingData=captureBuildData(); syncBudgetLimits(startingData); updateGoalUi();
    window.__hitCalcBuildsV1={capture:captureBuildData,apply:applyBuildData,list:savedBuilds};
    return true;
  }
  if (!init()) { let tries=0; const timer=setInterval(()=>{tries+=1;if(init()||tries>=120)clearInterval(timer);},50); }
})();