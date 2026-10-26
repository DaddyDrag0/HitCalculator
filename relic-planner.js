(() => {
  'use strict';
  const STORAGE = 'card-rng-relic-upgrades-20261026';
  const root = document.getElementById('relicRoot');
  if (!root) return;

  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, chr =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[chr]));
  const number = n => Number(n || 0).toLocaleString('en-US');
  const clampLevel = n => Math.max(0, Math.min(4, Math.floor(Number(n) || 0)));

  let data = null;
  let settings = {};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) settings = saved;
  } catch (_) {}

  function entry(key) {
    const saved = settings[key] || {};
    const current = clampLevel(saved.current);
    const target = Math.max(current, clampLevel(saved.target));
    return { current, target };
  }

  function save() {
    try { localStorage.setItem(STORAGE, JSON.stringify(settings)); } catch (_) {}
  }

  function detail(relic, value) {
    if (relic.key === 'ChronoShard') return 'Battle Speed +' + value;
    if (relic.key === 'TheDice') return (1 + value / 100).toFixed(2).replace(/\.?0+$/, '') + '× Luck every 25th roll';
    if (relic.key === 'Vicissitudes') return '+' + value + '% / −10% border odds';
    if (relic.key === 'Quickdraw') return '+' + value + '% Roll Speed / −20% Luck';
    if (relic.key === 'HeavyHand') return '+' + value + '% Luck / −10% Roll Speed';
    if (relic.key === 'LuckySurge') return '+' + value + '% Luck on proc';
    return '+' + value + '%';
  }

  function levelSelect(relic, kind, value, min) {
    return '<select aria-label="' + escape(relic.name + ' ' + kind) + '" data-relic="' +
      escape(relic.key) + '" data-relic-field="' + kind + '">' +
      data.grades.map((name, level) => '<option value="' + level + '"' +
        (level === value ? ' selected' : '') +
        (level < min ? ' disabled' : '') +
        '>' + escape(name) + '</option>').join('') + '</select>';
  }

  function materialTotals() {
    const all = new Map();
    let totalSteps = 0;
    for (const relic of data.relics) {
      const {current,target} = entry(relic.key);
      for (let step = current; step < target; step++) {
        totalSteps++;
        const ingredients = relic.recipes[step] || {};
        for (const [name,amount] of Object.entries(ingredients)) {
          all.set(name, (all.get(name) || 0) + amount);
        }
      }
    }
    return {all,totalSteps};
  }

  function render() {
    const cards = $('relicCards');
    cards.innerHTML = data.relics.map(relic => {
      const {current,target} = entry(relic.key);
      const materials = new Map();
      for (let step = current; step < target; step++) {
        for (const [name,amount] of Object.entries(relic.recipes[step])) {
          materials.set(name,(materials.get(name)||0)+amount);
        }
      }
      const info = [...materials.entries()].sort(([a],[b])=>a.localeCompare(b));
      const subtotal = info.length
        ? '<div class="relic-card-cost"><span>Needed</span><div>' +
          info.map(([name,amount]) => '<small>' + number(amount) + ' ' + escape(name) + '</small>').join('') +
          '</div></div>'
        : '<p class="relic-no-cost">No upgrades selected</p>';
      return '<article class="relic-card"><header><div><h3>' + escape(relic.name) + '</h3>' +
        '<p>' + escape(relic.description) + '</p></div>' +
        '<span class="relic-grade">' + escape(data.grades[current]) + '</span></header>' +
        '<div class="relic-current"><span>Current</span><strong>' + escape(detail(relic,relic.values[current])) + '</strong></div>' +
        '<div class="relic-fields"><label><span>Owned tier</span>' +
        levelSelect(relic,'current',current,0) + '</label><label><span>Target tier</span>' +
        levelSelect(relic,'target',target,current) + '</label></div>' +
        '<div class="relic-target"><span>Target bonus</span><strong>' +
        escape(detail(relic,relic.values[target])) + '</strong></div>' + subtotal + '</article>';
    }).join('');

    const {all,totalSteps} = materialTotals();
    $('relicSteps').textContent = number(totalSteps);
    $('relicItemCount').textContent = number([...all.values()].reduce((sum,n)=>sum+n,0));
    const materials = [...all.entries()].sort(([a],[b])=>a.localeCompare(b));
    $('relicMaterials').innerHTML = materials.length
      ? materials.map(([name,n])=>'<div class="relic-material"><span>'+escape(name)+'</span><strong>'+number(n)+'</strong></div>').join('')
      : '<p class="relic-muted">No upgrade materials needed.</p>';
  }

  root.addEventListener('change',event=>{
    const field = event.target?.dataset?.relicField;
    const key = event.target?.dataset?.relic;
    if (!field || !key || !data?.relics.some(r=>r.key===key)) return;
    const current = entry(key);
    if (field === 'current') {
      current.current = clampLevel(event.target.value);
      current.target = Math.max(current.current, current.target);
    } else if (field === 'target') {
      current.target = Math.max(current.current,clampLevel(event.target.value));
    }
    settings[key] = current;
    save();
    render();
  });

  $('relicMaxAll').addEventListener('click',()=>{
    if (!data) return;
    for (const relic of data.relics) settings[relic.key] = {...entry(relic.key),target:4};
    save();render();
  });
  $('relicResetAll').addEventListener('click',()=>{
    if (!data) return;
    for (const relic of data.relics) {
      const v = entry(relic.key);
      settings[relic.key] = {current:v.current,target:v.current};
    }
    save();render();
  });
  $('relicCopy').addEventListener('click',()=>{
    if (!data) return;
    const {all,totalSteps} = materialTotals();
    const lines = ['Relic upgrade materials ('+totalSteps+' steps)',
      ...[...all.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([name,n])=>name+': '+number(n))];
    const content = lines.join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(content).catch(()=>window.prompt('Copy materials',content));
    } else window.prompt('Copy materials',content);
  });

  fetch('./relic-upgrades.json', {cache:'no-cache'})
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(json => {
      if (json.relics?.length !== 8 || json.grades?.length !== 5 ||
          !json.relics.every(r=>r.values?.length===5 && r.recipes?.length===4)) {
        throw new Error('Unexpected relic-upgrade data');
      }
      data = json;
      render();
    })
    .catch(error => {
      $('relicCards').innerHTML = '<p class="relic-error">Unable to load relic data. Refresh the page.</p>';
      console.error('Relic planner:',error);
    });
})();
