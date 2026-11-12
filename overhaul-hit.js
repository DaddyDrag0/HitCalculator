(function HitOverhaulModifiers(){
"use strict";
const charmSlots={"Old Tome":["Green"],"Holy Cross":["Green"],Bloodstone:["Green"],"Lunar Charm":["Green","Blue"],"Blood Moon":["Green","Blue"],"Ice Crystal":["Blue","Green"],"Victor's Trophy":["Green","Blue","Red"],"Phoenix Feather":["Green","Blue","Red"],Durandal:["Green","Blue","Red"],"Hell Charm":["Green","Blue","Red","Yellow"],"Emperor's Hand":["Green","Blue","Red","Yellow"],"Platinum Gem":["Green","Blue","Yellow","Purple"],"Heavenly Crown":["Green","Blue","Yellow","Purple"],"Crystal Gem":["Green","Blue","Yellow","Purple"],"Dark Star":["Green","Blue","Red","Purple"],"Infinity Gem":["Green","Blue","Blue","Red"],"Lucky Crown":["Red","Red","Yellow","Yellow"],"Forbidden Book":["Green","Blue","Red","Yellow","Purple"],"Angel's Halo":["Red","Red","Yellow","Purple","Purple"],"Forbidden Fruit":["Green","Blue","Yellow","Yellow","Purple"],"Sacred Heart":["Red","Red","Red","Blue","Blue","Green"],"Book of Life and Death":["Green","Green","Blue","Blue","Red","Red","Yellow"],"Astral Hourglass":["Green","Green","Blue","Blue","Yellow","Yellow","Purple","Purple"]};
const gradeBonus={None:0,Common:2.5,Uncommon:5,Rare:7.5,Epic:10,Legendary:15};
const weathers={None:[0,0,0], "The Great Deluge":[25,10,10],"Reality Fracture":[30,15,15],Dreamfall:[35,20,20]};
const key="hit-calc-overhaul-2026-test";
let st={apply:false,eligible:false,rolls:0,weather:"None",charm:"Forbidden Book",grades:[],bossClears:0};
try{st={...st,...JSON.parse(localStorage.getItem(key)||"{}")};}catch(_){}
const esc=x=>String(x).replace(/[&<>"']/g,z=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[z]));
const fmt=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(n)||0);
function bonuses(){
const g={Green:0,Blue:0,Red:0,Yellow:0,Purple:0},slots=charmSlots[st.charm]||[];
slots.forEach((color,i)=>g[color]+=gradeBonus[st.grades[i]]||0);
const rollCount=Math.max(0,Number(st.rolls)||0);
const beginner=st.eligible?(rollCount<5000000?2:rollCount<10000000?1.5:rollCount<15000000?1.25:1):1;
const w=weathers[st.weather]||[0,0,0];
return {luck:(1+g.Green/100)*(1+w[0]/100)*beginner,speed:(1+g.Blue/100)*(1+w[1]/100),border:(1+g.Purple/100)*(1+w[2]/100),double:Math.min(1,g.Yellow/100),pve:1+g.Red/100,bossLuck:Math.max(0,Math.min(5,Number(st.bossClears)||0)),beginner,gem:g};
}
window.HIT_OVERHAUL_MODIFIERS={get:()=>st.apply?bonuses():{luck:1,speed:1,border:1,double:0,pve:1,bossLuck:0,beginner:1,gem:{Green:0,Blue:0,Red:0,Yellow:0,Purple:0}},preview:bonuses,config:st};
function init(){
const anchor=document.querySelector(".page .topbar");
if(!anchor)return;
const box=document.createElement("section");box.className="nov-overhaul";anchor.insertAdjacentElement("afterend",box);
function draw(){
const b=bonuses(),slots=charmSlots[st.charm]||[];
box.innerHTML=`<div class="nov-head"><div><div class="nov-kicker">NOVEMBER 2026 · BIGGEST UPDATE</div><h2>New rolling modifiers</h2><p>Gems, Mythical Weathers and eligible New Player Luck. Boss Luck applies only to the selected Boss card.</p></div><label class="nov-switch"><input id="novApply" type="checkbox" ${st.apply?"checked":""}><span>Apply to Hit odds</span></label></div>
<div class="nov-body"><div class="nov-fields">
<label><span>Equipped Charm</span><select id="novCharm">${Object.keys(charmSlots).map(x=>`<option ${x===st.charm?"selected":""}>${esc(x)}</option>`).join("")}</select></label>
<label><span>Mythical Weather</span><select id="novWeather">${Object.keys(weathers).map(x=>`<option ${x===st.weather?"selected":""}>${esc(x)}</option>`).join("")}</select></label>
<label><span>Total rolls</span><input type="number" id="novRolls" min="0" value="${esc(st.rolls)}"></label>
<label class="nov-check"><span>Eligible new account?</span><input type="checkbox" id="novEligible" ${st.eligible?"checked":""}><small>Do not enable for existing players</small></label>
<label><span>Boss difficulty clears</span><select id="novBossClears">${[0,1,2,3,4,5].map(x=>`<option value="${x}" ${Number(st.bossClears)===x?"selected":""}>${x} / 5</option>`).join("")}</select></label>
</div>
<div class="nov-sockets">${slots.map((color,i)=>`<label><span>${color} Gem · slot ${i+1}</span><select data-socket="${i}">${Object.keys(gradeBonus).map(x=>`<option ${x===(st.grades[i]||"None")?"selected":""}>${x}</option>`).join("")}</select></label>`).join("")}</div>
<div class="nov-metrics"><div><span>Effective Luck factor</span><strong>×${b.luck.toFixed(3)}</strong></div><div><span>Effective roll speed</span><strong>×${b.speed.toFixed(3)}</strong></div><div><span>Border odds factor</span><strong>×${b.border.toFixed(3)}</strong></div><div><span>Extra rolls (expected)</span><strong>+${fmt(b.double*100)}%</strong></div><div><span>PvE HP & damage</span><strong>+${fmt((b.pve-1)*100)}%</strong></div><div><span>Boss-specific Luck</span><strong>+${b.bossLuck}×</strong></div></div>
<p class="nov-warning">Only apply these modifiers if your input stats do not already include them. Boss Potions were removed. Cannon Event gives an event-specific 3× rarity benefit through November 15, 2026 (UTC), not 3× global Luck. Instant Packs have their own upgrades. New player eligibility must be confirmed in-game. Core Hit odds use the Apply toggle; separate legacy roll simulation/optimizer paths still require server-parity checks.</p></div>`;
function bind(id,key,type){const el=box.querySelector("#"+id);el?.addEventListener("change",()=>{st[key]=type==="check"?el.checked:type==="num"?Number(el.value):el.value;saveAndDraw()})}
bind("novApply","apply","check");bind("novCharm","charm");bind("novWeather","weather");bind("novRolls","rolls","num");bind("novEligible","eligible","check");bind("novBossClears","bossClears","num");
box.querySelectorAll("[data-socket]").forEach(el=>el.addEventListener("change",()=>{st.grades[Number(el.dataset.socket)]=el.value;saveAndDraw()}));
}
function saveAndDraw(){try{localStorage.setItem(key,JSON.stringify(st))}catch(_){ }draw();document.getElementById("luck")?.dispatchEvent(new Event("change",{bubbles:false}))}
draw();document.getElementById("luck")?.dispatchEvent(new Event("change",{bubbles:false}));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();