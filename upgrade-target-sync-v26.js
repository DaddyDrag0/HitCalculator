(() => {
  const $ = (id) => document.getElementById(id);
  const BN = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const B = {
    Platinum: { d: 100, m: 100 },
    Crystal: { d: 1e4, m: 1e4 },
    Ruby: { d: 1e5, m: 1e5 },
    Galaxy: { d: 1e6, m: 1e6 },
  };
  const SK = {
    Luck:[0,15,30,45,60,75,90,150], RollSpeed:[0,5,10,15,20,25,30,45], AllStat:[0,3,6,11],
    Platinum:[0,.5,1,1.5,2,2.5,5], Crystal:[0,1.75,3.5,5.25,7,8.75,14.75], Ruby:[0,1.5,3,4.5,6,7.5,13.5], Galaxy:[0,4,8,12,16,20,30],
  };
  const CH = {
    None:{}, 'Old Tome':{Luck:.5}, 'Holy Cross':{Luck:1}, Bloodstone:{Luck:2}, 'Lunar Charm':{Luck:2.5,Cooldown:10},
    'Blood Moon':{Luck:3,Cooldown:20}, 'Ice Crystal':{Luck:3.5,Cooldown:30}, "Victor's Trophy":{Luck:5,Cooldown:40},
    'Phoenix Feather':{Luck:5.5,Cooldown:50}, 'Hell Charm':{Luck:7.5,Cooldown:60}, "Emperor's Hand":{Luck:10,Cooldown:75},
    'Heavenly Crown':{Luck:15,Cooldown:100}, Durandal:{Luck:7,Cooldown:60}, 'Platinum Gem':{Luck:10,Platinum:.5,Cooldown:80},
    'Crystal Gem':{Luck:12,Platinum:.5,Crystal:.5,Cooldown:100}, 'Dark Star':{Luck:15,Platinum:.5,Crystal:.5,Ruby:.5,Galaxy:.5,Cooldown:125},
    'Infinity Gem':{Luck:20,Platinum:1,Crystal:1,Ruby:1,Galaxy:1,Cooldown:150}, 'Lucky Crown':{Luck:27,Platinum:1.5,Crystal:1.5,Ruby:1.5,Galaxy:1.5,Cooldown:175},
    'Forbidden Book':{Luck:35,Platinum:2,Crystal:2,Ruby:2,Galaxy:2,Cooldown:200}, "Angel's Halo":{Luck:42,Platinum:3,Crystal:3,Ruby:3,Galaxy:3,Cooldown:200},
    'Forbidden Fruit':{Luck:50,Platinum:4,Crystal:4,Ruby:4,Galaxy:4,Cooldown:200}, 'Book of Life and Death':{Luck:66,Platinum:6,Crystal:6,Ruby:6,Galaxy:6,Cooldown:200},
  };
  const D = { Luck:10, Speed:10, Platinum:.25, Crystal:.5, Ruby:.75, Galaxy:2 };
  const TU = { second:1, minute:60, hour:3600, day:86400, week:604800 };
  const TH = Array.from({length:22},(_,i)=>10**(i+1));
  const SFX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const NEUTRAL = Object.freeze({ Platinum:1, Crystal:1, Ruby:1, Galaxy:1 });
  const VIC = [];
  for (const plus of BN) for (const minus of BN) if (plus !== minus) {
    VIC.push(Object.fromEntries(BN.map((name)=>[name, name===plus ? 1.1 : name===minus ? .9 : 1])));
  }

  const num=(id,f=0)=>{const v=Number($(id)?.value);return Number.isFinite(v)?v:f;};
  const on=(id)=>!!$(id)?.checked;
  const lvl=(id,max)=>Math.max(0,Math.min(max,Math.floor(num(id))));
  const skill=(name,id)=>SK[name][lvl(id,SK[name].length-1)]||0;
  const sm=(kind,level)=>(kind==='Luck'||kind==='Speed'?1+.5*level/7:1+level/5);
  function chaska(points,rate){let left=Math.max(0,Math.floor(Number(points)||0)),block=0,total=0;while(left>0){const n=Math.min(50,left);total+=n*rate*.85**block;left-=n;block++;}return total;}
  function fixed(value,digits){return value.toFixed(digits).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1');}
  function fmt(value,decimals=0){if(!Number.isFinite(value))return '—';const abs=Math.abs(value);if(abs<1000)return value.toLocaleString(undefined,{maximumFractionDigits:decimals});const t=Math.floor(Math.log10(abs)/3);if(t>=SFX.length)return value.toExponential(2);const n=value/1000**t,d=Math.abs(n)>=100?0:Math.abs(n)>=10?1:2;return `${fixed(n,d)}${SFX[t]}`;}
  function ft(seconds){if(!Number.isFinite(seconds))return '—';if(seconds<60)return `${fixed(seconds,seconds<10?2:1)}s`;const total=Math.round(seconds),years=Math.floor(total/31557600),days=Math.floor((total%31557600)/86400),hours=Math.floor((total%86400)/3600),minutes=Math.floor((total%3600)/60),secs=total%60;if(years>=1000)return `${fmt(years)}y`;const p=[];if(years)p.push(`${years}y`);if(days)p.push(`${days}d`);if(hours)p.push(`${hours}h`);if(minutes)p.push(`${minutes}m`);if(!years&&!days&&!hours&&secs)p.push(`${secs}s`);return p.slice(0,3).join(' ')||'0s';}
  function fs(expected){if(!Number.isFinite(expected)||expected<=0)return '0%';const raw=expected*100;if(raw<1)return `1 / ${fmt(1/expected,2)}`;const pct=Math.min(2000,raw);if(pct>=2000)return '2000%';return pct>=10?`${fixed(pct,1)}%`:`${fixed(pct,2)}%`;}

  function stats(){
    const rolls=Math.max(0,Math.floor(num('uvRolls'))),charm=CH[$('uvCharm')?.value]||{};
    const s={Luck:skill('Luck','uvSkillLuck'),RollSpeed:skill('RollSpeed','uvSkillSpeed'),AllStat:skill('AllStat','uvSkillAll'),Platinum:skill('Platinum','uvSkillPlatinum'),Crystal:skill('Crystal','uvSkillCrystal'),Ruby:skill('Ruby','uvSkillRuby'),Galaxy:skill('Galaxy','uvSkillGalaxy')};
    const st={Luck:lvl('uvStructureLuck',7),Speed:lvl('uvStructureSpeed',7),Platinum:lvl('uvStructurePlatinum',5),Crystal:lvl('uvStructureCrystal',5),Ruby:lvl('uvStructureRuby',5),Galaxy:lvl('uvStructureGalaxy',5)};
    let luck=1+Math.floor(rolls/1e6)*.1+(charm.Luck||0);luck*=1+(s.Luck+s.AllStat)/100;
    if(on('uvPotLuck3'))luck+=25;if(on('uvPotLegendaryLuck'))luck+=40;if(on('uvPotCursed'))luck*=1.5;if(on('uvPotElixir'))luck*=2;if(on('uvPotEventLuck'))luck*=1.25;
    luck*=sm('Luck',st.Luck);luck+=lvl('uvDungeonLuck',25)*D.Luck;luck+=chaska(num('uvChaskaLuck'),.25);if(on('uvQuickdraw'))luck*=.8;if(on('uvHeavyHand'))luck*=1.2;
    let speed=100+(on('uvPotSpeed3')?300:0)+(on('uvPotLegendarySpeed')?500:0)+(charm.Cooldown||0);speed*=1+(s.RollSpeed+s.AllStat)/100;if(on('uvPotEventSpeed'))speed*=1.25;speed+=lvl('uvDungeonSpeed',25)*D.Speed;if(on('uvQuickdraw'))speed*=1.1;if(on('uvHeavyHand'))speed*=.9;
    const all=1+s.AllStat/100,boost=on('uvBorderBoost')?1.5:1,divine=on('uvPotDivine')?1.1:1,cb={Platinum:chaska(num('uvChaskaPlatinum'),.05),Crystal:chaska(num('uvChaskaCrystal'),.10),Ruby:0,Galaxy:chaska(num('uvChaskaGalaxy'),.25)},be={};
    for(const name of BN){let base=(1+(charm[name]||0)+s[name])*all;base*=sm(name,st[name]);be[name]=(base*boost+lvl(`uvDungeon${name}`,25)*D[name]+cb[name])*divine;}
    const timeStorm=on('uvTimeStorm'),cps=(speed/100)*sm('Speed',st.Speed)*(timeStorm?2:1);
    return {luck,speed,be,cps,timeStorm,boss:on('uvBossPot'),surge:on('uvLuckySurge'),dice:on('uvDice')};
  }
  function factorStates(){return on('uvVicissitudes')?VIC:[NEUTRAL];}
  function borderRate(name,s,factors){return Math.min(1,Math.max(0,s.be[name]*(factors?.[name]??1)/B[name].d));}
  function combinationRate(names,s){const states=factorStates();let total=0;for(const factors of states){let rate=1;for(const name of names)rate*=borderRate(name,s,factors);total+=rate;}return total/states.length;}
  function borderOutcomes(s){const states=factorStates(),p=Array(16).fill(0),m=Array(16).fill(1);for(let mask=0;mask<16;mask++){let mult=1;for(let i=0;i<BN.length;i++)if(mask&(1<<i))mult*=B[BN[i]].m;m[mask]=mult;}for(const factors of states){for(let mask=0;mask<16;mask++){let prob=1;for(let i=0;i<BN.length;i++){const name=BN[i],rate=borderRate(name,s,factors);prob*=mask&(1<<i)?rate:1-rate;}p[mask]+=prob/states.length;}}return p.map((prob,mask)=>({p:prob,m:m[mask]})).filter(x=>x.p>0);}
  function activeCards(s){const now=Date.now()/1000,pool=typeof CARD_POOL!=='undefined'?CARD_POOL:[];return pool.filter(card=>!(card.expires&&card.expires<=now)&&(!card.weather||(card.weather==='Time Storm'&&s.timeStorm)));}
  function luckStates(s){const surge=s.surge&&s.cps>0?Math.min(1,10/(30+100/s.cps)):0,dice=s.dice?1/25:0,normal=1-dice,out=[];if(1-surge>0){out.push([1,(1-surge)*normal]);if(dice)out.push([2,(1-surge)*dice]);}if(surge){out.push([1.25,surge*normal]);if(dice)out.push([2.5,surge*dice]);}return out;}
  function distAt(s,multiplier){const cards=activeCards(s),out=[];let remaining=1;for(const card of cards){const rarity=card.rarity*(card.rollFactor||1),boss=s.boss&&card.boss?5:1,success=Math.min(1,s.luck*multiplier*boss/rarity),hit=remaining*success;if(hit>0)out.push({card,probability:hit});remaining*=1-success;if(remaining<=0)break;}if(remaining>0&&cards.length){const card=cards[cards.length-1],found=out.find(x=>x.card.name===card.name);if(found)found.probability+=remaining;else out.push({card,probability:remaining});}return out;}
  function distribution(s){const map=new Map();for(const [multiplier,weight] of luckStates(s))for(const entry of distAt(s,multiplier)){const found=map.get(entry.card.name);if(found)found.probability+=entry.probability*weight;else map.set(entry.card.name,{card:entry.card,probability:entry.probability*weight});}return [...map.values()];}
  function thresholdRate(target,s,dist,outcomes){if(!(target>0))return 0;let rate=0;for(const entry of dist){let borderHit=0;for(const outcome of outcomes)if(entry.card.rarity*outcome.m>=target)borderHit+=outcome.p;rate+=entry.probability*borderHit;}return Math.min(1,Math.max(0,rate));}
  function selected(){const set=new Set([...document.querySelectorAll('#upgradeCalcV2 .uv-border.active')].map(b=>b.dataset.border).filter(n=>B[n]));return BN.filter(n=>set.has(n));}
  function chip(name){const span=document.createElement('span');span.className=`uv-mini-chip ${name.toLowerCase()}`;span.textContent=name;return span;}
  function item(labels,value,rarity=false){const div=document.createElement('div');div.className='uv-chance';const label=document.createElement('div');label.className='uv-chance-label';if(rarity){const c=document.createElement('span');c.className='uv-mini-chip';c.textContent=labels;label.append(c);}else for(const name of labels)label.append(chip(name));const strong=document.createElement('strong');strong.textContent=value;div.append(label,strong);return div;}

  let writing=false;
  function render(){
    const root=$('upgradeCalcV2');if(!root||root.hidden||getComputedStyle(root).display==='none')return;
    const s=stats(),dist=distribution(s),outcomes=borderOutcomes(s),sel=selected(),borderRateValue=sel.length?combinationRate(sel,s):0,borderRolls=borderRateValue>0?1/borderRateValue:Infinity,target=Math.max(1,num('uvCardRarity',1e6)),cardRate=thresholdRate(target,s,dist,outcomes),cardRolls=cardRate>0?1/cardRate:Infinity;
    writing=true;
    try{
      const values={uvBorderRolls:fmt(borderRolls),uvBorderTime:ft(borderRolls/s.cps),uvCardRolls:fmt(cardRolls),uvCardTime:ft(cardRolls/s.cps),uvCardsSecond:fmt(s.cps,2),uvRollsHour:fmt(s.cps*3600)};
      for(const [id,text] of Object.entries(values)){const el=$(id);if(el&&el.textContent!==text)el.textContent=text;}
      const seconds=Math.max(0,num('uvTimeValue',1))*(TU[$('uvTimeUnit')?.value]||3600),rolls=Math.max(0,Math.floor(seconds*s.cps));if($('uvTimeRolls'))$('uvTimeRolls').textContent=fmt(rolls);
      const borderGrid=$('uvBorderChanceGrid');if(borderGrid){borderGrid.replaceChildren();const combos=[];for(let mask=1;mask<16;mask++){const names=[];for(let i=0;i<BN.length;i++)if(mask&(1<<i))names.push(BN[i]);combos.push({names,rate:combinationRate(names,s)});}combos.sort((a,b)=>a.names.length-b.names.length||b.rate-a.rate);for(const combo of combos)borderGrid.append(item(combo.names,fs(combo.rate*rolls)));}
      const cardGrid=$('uvCardChanceGrid');if(cardGrid){cardGrid.replaceChildren();for(const threshold of TH)cardGrid.append(item(`≥ ${fmt(threshold)}`,fs(thresholdRate(threshold,s,dist,outcomes)*rolls),true));}
    } finally { writing=false; }
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;render();}));}
  function burst(){schedule();setTimeout(schedule,40);setTimeout(schedule,120);setTimeout(schedule,300);}
  function init(){const root=$('upgradeCalcV2');if(!root)return;window.__hitCalcFinalTargetsV26=burst;root.addEventListener('input',schedule);root.addEventListener('change',schedule);root.addEventListener('click',schedule);document.addEventListener('click',e=>{if(e.target.closest('.uv-mode[data-view="upgrades"]'))burst();},true);$('resetBtn')?.addEventListener('click',()=>setTimeout(burst,0));const ids=['uvBorderRolls','uvBorderTime','uvCardRolls','uvCardTime','uvCardsSecond','uvRollsHour','uvTimeRolls'].map($).filter(Boolean);if(ids.length){const obs=new MutationObserver(()=>{if(!writing)queueMicrotask(schedule);});for(const el of ids)obs.observe(el,{childList:true,characterData:true,subtree:true});}burst();}
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
