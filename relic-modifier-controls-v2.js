(() => {
  'use strict';
  const definitions = [
    ['uvLuckySurge','LuckySurge'], ['uvDice','TheDice'],
    ['uvQuickdraw','Quickdraw'], ['uvHeavyHand','HeavyHand'],
    ['uvVicissitudes','Vicissitudes']
  ];
  const values = {
    LuckySurge:[25,30,35,40,50],TheDice:[100,125,175,225,300],
    Quickdraw:[10,15,20,25,30],HeavyHand:[20,25,30,35,40],
    Vicissitudes:[10,15,20,25,30]
  };
  const grades=['Base','Platinum','Crystal','Ruby','Galaxy'];
  const key='hitcalc-relic-modifier-tiers-v1';
  let saved={};
  try { saved=JSON.parse(localStorage.getItem(key)||'{}')||{}; } catch (_) {}
  const level=(id)=>Math.max(0,Math.min(4,Number(document.getElementById('uvRelicTier'+id)?.value ?? saved[id] ?? 0)||0));
  window.HIT_RELIC_LEVELS={
    level,grades,
    value:id=>values[id]?.[level(id)],
    levels:()=>Object.fromEntries(Object.keys(values).map(id=>[id,level(id)]))
  };
  const style=document.createElement('style');
  style.id='relic-modifier-controls-v2-style';
  style.textContent='.uv-relic-modifier{min-width:0;display:flex;flex-direction:column;gap:5px}.uv-relic-modifier>.uv-toggle{display:block}.uv-relic-modifier>.uv-relic-tier{box-sizing:border-box;display:block;width:100%;min-width:0;border:1px solid #485974;border-radius:7px;background:#161f2d;color:#e1eaf9;padding:5px 4px;font-size:11px;font-weight:700;cursor:pointer}.uv-relic-modifier>.uv-relic-tier:focus-visible{outline:2px solid #86aaf6}';
  document.head.append(style);
  function apply(){
    const root=document.getElementById('upgradeCalcV2');
    if(!root)return;
    for(const [checkbox,id] of definitions){
      const input=document.getElementById(checkbox);
      const toggle=input?.closest('.uv-toggle');
      if(!toggle)continue;
      let parent=toggle.parentElement;
      if(!parent?.classList.contains('uv-relic-modifier')){
        const wrapper=document.createElement('div');
        wrapper.className='uv-relic-modifier';
        toggle.before(wrapper);
        wrapper.append(toggle);
        parent=wrapper;
      }
      if(!parent.querySelector('#uvRelicTier'+id)){
        const sel=document.createElement('select');
        sel.id='uvRelicTier'+id;
        sel.className='uv-relic-tier';
        sel.setAttribute('aria-label',id+' relic upgrade tier');
        sel.innerHTML=grades.map((grade,i)=>'<option value="'+i+'">'+grade+'</option>').join('');
        sel.value=String(level(id));
        sel.addEventListener('change',()=>{
          saved[id]=Number(sel.value);
          try {localStorage.setItem(key,JSON.stringify(saved));}catch(_){}
          input.dispatchEvent(new Event('change',{bubbles:true}));
          document.dispatchEvent(new CustomEvent('hitcalc-relic-tier-change',{detail:{id,value:values[id][level(id)]}}));
        });
        parent.append(sel);
      }
    }
  }
  function init(){
    apply();
    const root=document.getElementById('upgradeCalcV2');
    if(!root)return;
    const observer=new MutationObserver(()=>apply());
    observer.observe(root,{childList:true,subtree:true});
    document.getElementById('resetBtn')?.addEventListener('click',()=>{
      saved={};
      try{localStorage.removeItem(key);}catch(_){}
      root.querySelectorAll('.uv-relic-tier').forEach(s=>s.value='0');
    });
  }
  if(document.readyState==='complete')setTimeout(init,0);
  else window.addEventListener('load',()=>setTimeout(init,0),{once:true});
})();
