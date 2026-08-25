(() => {
  const ROOT_ID = 'upgradeCalcV2';
  const $ = (id) => document.getElementById(id);
  const SK = {
    Luck:[0,15,30,45,60,75,90,150], RollSpeed:[0,5,10,15,20,25,30,45], AllStat:[0,3,6,11],
    Platinum:[0,.5,1,1.5,2,2.5,5], Crystal:[0,1.75,3.5,5.25,7,8.75,14.75], Ruby:[0,1.5,3,4.5,6,7.5,13.5], Galaxy:[0,4,8,12,16,20,30]
  };
  const CH = {
    None:{}, 'Old Tome':{Luck:.5}, 'Holy Cross':{Luck:1}, Bloodstone:{Luck:2}, 'Lunar Charm':{Luck:2.5,Cooldown:10},
    'Blood Moon':{Luck:3,Cooldown:20}, 'Ice Crystal':{Luck:3.5,Cooldown:30}, "Victor's Trophy":{Luck:5,Cooldown:40},
    'Phoenix Feather':{Luck:5.5,Cooldown:50}, 'Hell Charm':{Luck:7.5,Cooldown:60}, "Emperor's Hand":{Luck:10,Cooldown:75},
    'Heavenly Crown':{Luck:15,Cooldown:100}, Durandal:{Luck:7,Cooldown:60}, 'Platinum Gem':{Luck:10,Platinum:.5,Cooldown:80},
    'Crystal Gem':{Luck:12,Platinum:.5,Crystal:.5,Cooldown:100}, 'Dark Star':{Luck:15,Platinum:.5,Crystal:.5,Ruby:.5,Galaxy:.5,Cooldown:125},
    'Infinity Gem':{Luck:20,Platinum:1,Crystal:1,Ruby:1,Galaxy:1,Cooldown:150}, 'Lucky Crown':{Luck:27,Platinum:1.5,Crystal:1.5,Ruby:1.5,Galaxy:1.5,Cooldown:175},
    'Forbidden Book':{Luck:35,Platinum:2,Crystal:2,Ruby:2,Galaxy:2,Cooldown:200}, "Angel's Halo":{Luck:42,Platinum:3,Crystal:3,Ruby:3,Galaxy:3,Cooldown:200},
    'Forbidden Fruit':{Luck:50,Platinum:4,Crystal:4,Ruby:4,Galaxy:4,Cooldown:200}, 'Book of Life and Death':{Luck:66,Platinum:6,Crystal:6,Ruby:6,Galaxy:6,Cooldown:200}
  };
  const D = {Luck:10,Speed:10,Platinum:.25,Crystal:.5,Ruby:.75,Galaxy:2};
  const BN = ['Platinum','Crystal','Ruby','Galaxy'];
  const num = (id) => { const v=Number($(id)?.value); return Number.isFinite(v)?v:0; };
  const on = (id) => !!$(id)?.checked;
  const lvl = (id,max) => Math.max(0,Math.min(max,Math.floor(num(id))));
  const skill = (name,id) => SK[name][lvl(id,SK[name].length-1)]||0;
  const sm = (kind,level) => (kind==='Luck'||kind==='Speed' ? 1+.5*level/7 : 1+level/5);
  function chaska(points,rate){let left=Math.max(0,Math.floor(Number(points)||0)),block=0,total=0;while(left>0){const n=Math.min(50,left);total+=n*rate*.85**block;left-=n;block++;}return total;}
  function fmt(value){if(!Number.isFinite(value))return '—';const abs=Math.abs(value),s=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];if(abs<1000)return value.toLocaleString(undefined,{maximumFractionDigits:2});const t=Math.floor(Math.log10(abs)/3);if(t>=s.length)return value.toExponential(2);const n=value/1000**t,d=Math.abs(n)>=100?0:Math.abs(n)>=10?1:2;return `${n.toFixed(d).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1')}${s[t]}`;}
  function calc(){
    const rolls=Math.max(0,Math.floor(num('uvRolls'))), charm=CH[$('uvCharm')?.value]||{};
    const s={Luck:skill('Luck','uvSkillLuck'),RollSpeed:skill('RollSpeed','uvSkillSpeed'),AllStat:skill('AllStat','uvSkillAll'),Platinum:skill('Platinum','uvSkillPlatinum'),Crystal:skill('Crystal','uvSkillCrystal'),Ruby:skill('Ruby','uvSkillRuby'),Galaxy:skill('Galaxy','uvSkillGalaxy')};
    const st={Luck:lvl('uvStructureLuck',7),Speed:lvl('uvStructureSpeed',7),Platinum:lvl('uvStructurePlatinum',5),Crystal:lvl('uvStructureCrystal',5),Ruby:lvl('uvStructureRuby',5),Galaxy:lvl('uvStructureGalaxy',5)};
    let luck=1+Math.floor(rolls/1e6)*.1+(charm.Luck||0); luck*=1+(s.Luck+s.AllStat)/100;
    if(on('uvPotLuck3'))luck+=25;if(on('uvPotLegendaryLuck'))luck+=40;if(on('uvPotCursed'))luck*=1.5;if(on('uvPotElixir'))luck*=2;if(on('uvPotEventLuck'))luck*=1.25;
    luck*=sm('Luck',st.Luck);luck+=lvl('uvDungeonLuck',25)*D.Luck;luck+=chaska(num('uvChaskaLuck'),.25);if(on('uvQuickdraw'))luck*=.8;if(on('uvHeavyHand'))luck*=1.2;
    let speed=100+(on('uvPotSpeed3')?300:0)+(on('uvPotLegendarySpeed')?500:0)+(charm.Cooldown||0);speed*=1+(s.RollSpeed+s.AllStat)/100;if(on('uvPotEventSpeed'))speed*=1.25;speed+=lvl('uvDungeonSpeed',25)*D.Speed;if(on('uvQuickdraw'))speed*=1.1;if(on('uvHeavyHand'))speed*=.9;
    const all=1+s.AllStat/100,boost=on('uvBorderBoost')?1.5:1,divine=on('uvPotDivine')?1.1:1;
    const cb={Platinum:chaska(num('uvChaskaPlatinum'),.05),Crystal:chaska(num('uvChaskaCrystal'),.10),Ruby:0,Galaxy:chaska(num('uvChaskaGalaxy'),.25)}, borders={};
    for(const name of BN){let base=(1+(charm[name]||0)+s[name])*all;base*=sm(name,st[name]);borders[name]=(base*boost+lvl(`uvDungeon${name}`,25)*D[name]+cb[name])*divine;}
    return {luck,speed,borders};
  }
  let writing=false;
  function apply(){const root=$(ROOT_ID);if(!root||root.hidden||getComputedStyle(root).display==='none')return;const v=calc();const expected={uvOutLuck:fmt(v.luck),uvOutSpeed:`${fmt(v.speed)}%`,...Object.fromEntries(BN.map(n=>[`uvOut${n}`,`${fmt(v.borders[n])}×`]))};writing=true;try{for(const [id,text] of Object.entries(expected)){const el=$(id);if(el&&el.textContent!==text)el.textContent=text;}}finally{writing=false;}}
  function burst(){apply();requestAnimationFrame(apply);requestAnimationFrame(()=>requestAnimationFrame(apply));setTimeout(apply,40);setTimeout(apply,120);setTimeout(apply,300);}
  function init(){const root=$(ROOT_ID);if(!root)return;window.__hitCalcFinalUpgradeSyncV24=burst;document.addEventListener('click',e=>{if(e.target.closest('.uv-mode[data-view="upgrades"]'))burst();},true);root.addEventListener('input',()=>queueMicrotask(apply));root.addEventListener('change',()=>queueMicrotask(apply));root.addEventListener('click',()=>requestAnimationFrame(apply));const outputs=['uvOutLuck','uvOutSpeed',...BN.map(n=>`uvOut${n}`)].map($).filter(Boolean);if(outputs.length){const obs=new MutationObserver(()=>{if(!writing)queueMicrotask(apply);});for(const el of outputs)obs.observe(el,{childList:true,characterData:true,subtree:true});}burst();}
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
