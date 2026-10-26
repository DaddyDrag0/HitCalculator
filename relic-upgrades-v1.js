(() => {
  'use strict';
  const STORAGE='hitcalc-relic-upgrade-levels-v1';
  const grades=['Base','Platinum','Crystal','Ruby','Galaxy'];
  const relics=[
    {id:'ChronoShard',name:'Chrono Shard',stat:'Battle Speed',values:[1,1.25,1.5,1.75,2],suffix:''},
    {id:'BountifulDelve',name:'Bountiful Delve',stat:'Depths rare loot',values:[25,30,35,40,50],suffix:'%'},
    {id:'LuckySurge',name:'Lucky Surge',stat:'Proc Luck',values:[25,30,35,40,50],suffix:'%'},
    {id:'TheDice',name:'The Dice',stat:'Every 25th roll bonus',values:[100,125,175,225,300],suffix:'%'},
    {id:'PotionMaster',name:'Potion Master',stat:'Potion duration',values:[50,60,70,80,100],suffix:'%'},
    {id:'Vicissitudes',name:'Vicissitudes',stat:'Positive border shift',values:[10,15,20,25,30],suffix:'%'},
    {id:'Quickdraw',name:'Quickdraw',stat:'Roll Speed',values:[10,15,20,25,30],suffix:'%'},
    {id:'HeavyHand',name:'Heavy Hand',stat:'Luck',values:[20,25,30,35,40],suffix:'%'},
  ];
  const index=new Map(relics.map(r=>[r.id,r]));
  let stored={};
  try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(raw&&typeof raw==='object')stored=raw}catch(_){}
  const clamp=n=>Math.max(0,Math.min(4,Math.floor(Number(n)||0)));
  const level=id=>clamp(stored[id]);
  const value=id=>(index.get(id)?.values[level(id)]??0);
  const levels=()=>Object.fromEntries(relics.map(r=>[r.id,level(r.id)]));
  window.HIT_RELIC_LEVELS={level,value,levels,grades};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inject(){
    const root=document.getElementById('upgradeCalcV2');
    if(!root||document.getElementById('hitRelicLevels'))return;
    const element=document.createElement('details');
    element.id='hitRelicLevels';
    element.className='hit-relic-panel';
    element.innerHTML='<summary>Relic Upgrades <small>Base → Galaxy</small></summary>'
      +'<div class="hit-relic-rows">'+relics.map(relic=>
        '<label class="hit-relic-row"><span><strong>'+esc(relic.name)+'</strong><small>'+esc(relic.stat)+'</small></span>'
        +'<select aria-label="'+esc(relic.name)+' grade" data-relic-id="'+relic.id+'">'
        +grades.map((grade,n)=>'<option value="'+n+'"'+(level(relic.id)===n?' selected':'')+'>'+grade+'</option>').join('')
        +'</select><b data-relic-value="'+relic.id+'">'+esc(String(value(relic.id))+relic.suffix)+'</b></label>'
      ).join('')+'</div>'
      +'<p class="hit-relic-foot">Quickdraw keeps its −20% Luck, Heavy Hand keeps its −10% Roll Speed and Vicissitudes keeps its −10% negative shift. '
      +'<a href="./relics.html" target="_blank" rel="noopener">View upgrade costs</a>.</p>';
    const after=root.querySelector('.uv-workbench');
    if(after)after.insertAdjacentElement('afterend',element);
    else root.append(element);
    element.addEventListener('change',event=>{
      const id=event.target?.dataset?.relicId;
      if(!index.has(id))return;
      stored[id]=clamp(event.target.value);
      try{localStorage.setItem(STORAGE,JSON.stringify(stored))}catch(_){}
      const output=element.querySelector('[data-relic-value="'+id+'"]');
      if(output)output.textContent=String(value(id))+index.get(id).suffix;
      const trigger=document.getElementById('uvRolls');
      if(trigger)trigger.dispatchEvent(new Event('input',{bubbles:true}));
      window.dispatchEvent(new CustomEvent('hitreliclevelchange',{detail:{id,level:level(id)}}));
    });
  }
  const style=document.createElement('style');
  style.textContent='.hit-relic-panel{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:12px 16px}'
    +'.hit-relic-panel summary{cursor:pointer;font-size:13px;font-weight:800;color:var(--text)}'
    +'.hit-relic-panel summary small{font-weight:600;color:var(--muted);margin-left:6px}'
    +'.hit-relic-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0}'
    +'.hit-relic-row{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 110px 45px;gap:7px;align-items:center;background:var(--panel-2);padding:10px;border:1px solid var(--line);border-radius:9px}'
    +'.hit-relic-row strong,.hit-relic-row small{display:block;font-size:11px}.hit-relic-row small{font-size:10px;color:var(--muted)}'
    +'.hit-relic-row select{min-width:0;padding:7px 5px;border:1px solid var(--line);background:var(--bg);color:var(--text);border-radius:6px;font-size:11px}'
    +'.hit-relic-row b{color:var(--blue);font-size:11px;text-align:right}.hit-relic-foot{color:var(--muted);font-size:11px;margin:0}'
    +'.hit-relic-foot a{color:var(--blue)}'
    +'@media(max-width:800px){.hit-relic-rows{grid-template-columns:1fr}}'
    +'@media(max-width:420px){.hit-relic-row{grid-template-columns:minmax(0,1fr) 90px 40px}}';
  document.head.append(style);
  if(document.readyState==='complete')setTimeout(inject,0);
  else window.addEventListener('load',()=>setTimeout(inject,0),{once:true});
})();