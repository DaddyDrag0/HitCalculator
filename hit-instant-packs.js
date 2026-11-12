(function HitInstantPackPlanner(){
"use strict";
const config=[["Luck",1,25,40],["Platinum",1,25,1.25],["Crystal",2,25,3],["Ruby",3,25,4],["Galaxy",4,25,5],["Mutation",2,25,7.5],["MultiCardChance",3,20,0]];
const STORAGE="crx-hit-instant-packs-v2026";
let state={packs:10000,discoveries:0,levels:{}};
try{state={...state,...JSON.parse(localStorage.getItem(STORAGE)||"{}")}}catch(_){}
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const fmt=x=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(x);
function build(){
 let spent=0;
 const list=config.map(([name,cost,max,effect])=>{
 const level=Math.max(0,Math.min(max,Math.floor(Number(state.levels[name])||0)));
 spent+=level*cost;
 return {name,cost,max,effect,level};
 });
 const lv=list.find(x=>x.name==="MultiCardChance").level;
 const double=.15*lv/20,triple=.05*lv/20,mean=1+double+2*triple;
 const packs=Math.max(0,Number(state.packs)||0),discoveries=Math.max(0,Number(state.discoveries)||0);
 const input=`<div class="ip-fields"><label>Normal Instant Packs<input id="ip-packs" type="number" min="0" max="1000000000" value="${esc(packs)}"></label><label>Unique index discoveries<input id="ip-discoveries" type="number" min="0" value="${esc(discoveries)}"></label></div>`;
 const fields=list.map(x=>`<label>${x.name.replace("MultiCardChance","Multi-card Chance")} <small>${x.cost} pt/lvl</small><input type="number" data-ip-level="${x.name}" min="0" max="${x.max}" step="1" value="${x.level}"></label>`).join("");
 return `${input}<div class="ip-levels">${fields}</div>
 <div class="ip-totals"><span>Points spent <strong>${fmt(spent)}</strong></span><span>2-card packs <strong>${(double*100).toFixed(2)}%</strong></span><span>3-card packs <strong>${(triple*100).toFixed(2)}%</strong></span><span>Expected cards <strong>${fmt(packs*mean)}</strong></span></div>
 <div class="ip-note">Pack upgrades are separate from normal rolling. The game configuration uses 5 discoveries/point; the announcement says 50. At max Multi-card level, average cards per pack = 1.25. Server odds for specific card pulls aren't verified.</div>`;
}
function ready(){
 const target=document.querySelector(".nov-overhaul")||document.querySelector(".page>.topbar");
 if(!target)return;
 const wrap=document.createElement("details");
 wrap.id="hit-instant-pack-planner";wrap.className="ip-compact";
 wrap.innerHTML=`<summary>Normal Instant Packs <span>Upgrade planner & opening estimates</span></summary><div class="ip-inner"></div>`;
 target.after(wrap);
 function render(){
  const container=wrap.querySelector(".ip-inner");container.innerHTML=build();
  const assign=(selector,key)=>container.querySelector(selector)?.addEventListener("change",e=>{state[key]=Math.max(0,Number(e.target.value)||0);saveAndRender()});
  assign("#ip-packs","packs");assign("#ip-discoveries","discoveries");
  container.querySelectorAll("[data-ip-level]").forEach(el=>el.addEventListener("change",()=>{const def=config.find(x=>x[0]===el.dataset.ipLevel);state.levels[el.dataset.ipLevel]=Math.max(0,Math.min(def[2],Math.floor(Number(el.value)||0)));saveAndRender()}));
 }
 function saveAndRender(){try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch(_){}render()}
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
})();