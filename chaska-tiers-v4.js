(() => {
  const STEP = 50;
  const ROLLS_PER_POINT = 50_000;
  const NO_CAP_STORAGE = 'hitCalcChaskaNoCapV4';
  const FIELDS = [
    { id: 'uvChaskaLuck', label: 'Luck', className: 'luck' },
    { id: 'uvChaskaPlatinum', label: 'Platinum', className: 'platinum' },
    { id: 'uvChaskaCrystal', label: 'Crystal', className: 'crystal' },
    { id: 'uvChaskaGalaxy', label: 'Galaxy', className: 'galaxy' },
  ];

  const $ = (id) => document.getElementById(id);
  let syncing = false;
  const lastValid = new Map();

  function noCapEnabled() {
    return !!$('uvChaskaNoCap')?.checked;
  }

  function saveNoCap() {
    try { localStorage.setItem(NO_CAP_STORAGE, noCapEnabled() ? '1' : '0'); } catch {}
  }

  function loadNoCap() {
    try {
      const input = $('uvChaskaNoCap');
      if (input) input.checked = localStorage.getItem(NO_CAP_STORAGE) === '1';
    } catch {}
  }

  function integerValue(id) {
    const value = Math.floor(Number($(id)?.value) || 0);
    return Math.max(0, value);
  }

  function values() {
    return Object.fromEntries(FIELDS.map((field) => [field.id, integerValue(field.id)]));
  }

  function earnedPoints() {
    return Math.floor(Math.max(0, Math.floor(Number($('uvRolls')?.value) || 0)) / ROLLS_PER_POINT);
  }

  function totalSpent(nextValues = values()) {
    return Object.values(nextValues).reduce((sum, value) => sum + value, 0);
  }

  function unlockedCap(nextValues = values()) {
    const minimum = Math.min(...Object.values(nextValues));
    return (Math.floor(minimum / STEP) + 1) * STEP;
  }

  function capForField(id, nextValues = values()) {
    if (noCapEnabled()) return Infinity;
    const others = Object.entries(nextValues).filter(([key]) => key !== id).map(([, value]) => value);
    const minimumOther = Math.min(...others);
    return (Math.floor(minimumOther / STEP) + 1) * STEP;
  }

  function minimumForField(id, nextValues = values()) {
    if (noCapEnabled()) return 0;
    const others = Object.entries(nextValues).filter(([key]) => key !== id).map(([, value]) => value);
    const highestOther = Math.max(...others);
    if (highestOther <= STEP) return 0;
    return Math.max(0, (Math.ceil(highestOther / STEP) - 1) * STEP);
  }

  function setInputValue(input, value, notify = true) {
    const next = String(Math.max(0, Math.floor(value)));
    if (input.value === next) return;
    input.value = next;
    if (notify) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function normalizeField(input) {
    if (syncing) return;
    syncing = true;

    const id = input.id;
    const current = values();
    const earned = earnedPoints();
    const othersSpent = totalSpent(current) - current[id];
    const pointCap = Math.max(0, earned - othersSpent);
    let requested = Math.max(0, Math.floor(Number(input.value) || 0));

    if (noCapEnabled()) {
      requested = Math.min(requested, pointCap);
      current[id] = requested;
    } else {
      const tierCap = capForField(id, current);
      const tierFloor = minimumForField(id, current);
      requested = Math.max(tierFloor, requested);
      requested = Math.min(requested, tierCap, pointCap);
      current[id] = requested;

      // Protect against invalid tier states caused by manually lowering one branch
      // while another branch is already in the next tier.
      const maxOther = Math.max(...Object.entries(current).filter(([key]) => key !== id).map(([, value]) => value));
      const allowedOtherMax = (Math.floor(requested / STEP) + 1) * STEP;
      if (maxOther > allowedOtherMax) requested = lastValid.get(id) ?? integerValue(id);
    }

    input.value = String(requested);
    lastValid.set(id, requested);
    syncing = false;
    refresh();
  }

  function clampToEarnedPoints() {
    if (syncing) return;
    const earned = earnedPoints();
    let current = values();
    if (totalSpent(current) <= earned) return;

    syncing = true;
    while (totalSpent(current) > earned) {
      const candidates = FIELDS
        .map((field) => ({ field, value: current[field.id] }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value);
      if (!candidates.length) break;

      let changed = false;
      for (const { field } of candidates) {
        const floor = noCapEnabled() ? 0 : minimumForField(field.id, current);
        if (current[field.id] > floor) {
          current[field.id] -= 1;
          changed = true;
          if (totalSpent(current) <= earned) break;
        }
      }
      if (!changed) break;
    }

    for (const field of FIELDS) {
      const input = $(field.id);
      if (!input) continue;
      input.value = String(current[field.id]);
      lastValid.set(field.id, current[field.id]);
    }
    syncing = false;

    const first = $(FIELDS[0].id);
    first?.dispatchEvent(new Event('input', { bubbles: true }));
    first?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function addAmount(id, delta) {
    const input = $(id);
    if (!input) return;
    const current = integerValue(id);
    setInputValue(input, current + delta);
  }

  function fillToCap(id) {
    const input = $(id);
    if (!input) return;
    const current = values();
    const earned = earnedPoints();
    const othersSpent = totalSpent(current) - current[id];
    const maxByPoints = Math.max(0, earned - othersSpent);
    const max = noCapEnabled() ? maxByPoints : Math.min(capForField(id, current), maxByPoints);
    setInputValue(input, max);
  }

  function refundTier(id) {
    const input = $(id);
    if (!input) return;
    const current = integerValue(id);
    const target = Math.max(0, Math.floor((current - 1) / STEP) * STEP);
    setInputValue(input, target);
  }

  function createDashboard(panel) {
    if ($('uvChaskaTierDashboard')) return;

    const title = panel.querySelector('.uv-panel-title');
    const dashboard = document.createElement('div');
    dashboard.id = 'uvChaskaTierDashboard';
    dashboard.className = 'uv-chaska-dashboard';
    dashboard.innerHTML = `
      <div class="uv-chaska-mode-row">
        <label class="uv-chaska-no-cap"><input id="uvChaskaNoCap" type="checkbox"><span><strong>Do Not Cap</strong><small>Ignore 50-point tier gates</small></span></label>
      </div>
      <div class="uv-chaska-status">
        <div><span>Tier</span><strong id="uvChaskaTier">1</strong></div>
        <div><span>Current Cap</span><strong id="uvChaskaCap">50</strong></div>
        <div><span>Earned</span><strong id="uvChaskaEarned">0</strong></div>
        <div><span>Spent</span><strong id="uvChaskaSpent">0</strong></div>
        <div class="available"><span>Available</span><strong id="uvChaskaAvailable">0</strong></div>
      </div>
      <div class="uv-chaska-unlock">
        <div><span id="uvChaskaUnlockText">Reach 50 on all four stats to unlock 100.</span><b id="uvChaskaUnlockCount">0 / 4</b></div>
        <div class="uv-chaska-unlock-bar"><i id="uvChaskaUnlockFill"></i></div>
      </div>
    `;
    title?.insertAdjacentElement('afterend', dashboard);

    const grid = panel.querySelector('.uv-chaska-grid');
    for (const field of FIELDS) {
      const input = $(field.id);
      const label = input?.closest('label');
      if (!input || !label || label.dataset.chaskaTierUi === '1') continue;
      label.dataset.chaskaTierUi = '1';
      label.classList.add('uv-chaska-stat-card', field.className);

      const controls = document.createElement('div');
      controls.className = 'uv-chaska-controls';
      controls.innerHTML = `
        <button type="button" data-chaska-action="minus" aria-label="Remove one ${field.label} point">−</button>
        <button type="button" data-chaska-action="plus" aria-label="Add one ${field.label} point">+</button>
        <button type="button" class="fill" data-chaska-action="fill">Fill</button>
        <button type="button" class="refund" data-chaska-action="refund">Tier ↓</button>
      `;
      label.append(controls);

      controls.querySelector('[data-chaska-action="minus"]').addEventListener('click', () => addAmount(field.id, -1));
      controls.querySelector('[data-chaska-action="plus"]').addEventListener('click', () => addAmount(field.id, 1));
      controls.querySelector('[data-chaska-action="fill"]').addEventListener('click', () => fillToCap(field.id));
      controls.querySelector('[data-chaska-action="refund"]').addEventListener('click', () => refundTier(field.id));
    }

    if (grid) grid.classList.add('uv-chaska-tier-grid');
  }

  function refresh() {
    const current = values();
    const earned = earnedPoints();
    const spent = totalSpent(current);
    const available = Math.max(0, earned - spent);
    const minimum = Math.min(...Object.values(current));
    const completedTier = Math.floor(minimum / STEP);
    const currentTier = completedTier + 1;
    const cap = currentTier * STEP;
    const completedAtCap = Object.values(current).filter((value) => value >= cap).length;
    const uncapped = noCapEnabled();

    const setText = (id, text) => { if ($(id)) $(id).textContent = text; };
    setText('uvChaskaTier', uncapped ? '—' : currentTier.toLocaleString());
    setText('uvChaskaCap', uncapped ? 'OFF' : cap.toLocaleString());
    setText('uvChaskaEarned', earned.toLocaleString());
    setText('uvChaskaSpent', spent.toLocaleString());
    setText('uvChaskaAvailable', available.toLocaleString());
    setText('uvChaskaUnlockText', uncapped ? 'Tier caps disabled. Total earned Chaska points still apply.' : `Reach ${cap.toLocaleString()} on all four stats to unlock ${(cap + STEP).toLocaleString()}.`);
    setText('uvChaskaUnlockCount', uncapped ? 'UNCAPPED' : `${completedAtCap} / 4`);

    const fill = $('uvChaskaUnlockFill');
    if (fill) fill.style.width = uncapped ? '100%' : `${(completedAtCap / 4) * 100}%`;

    const oldPoints = $('uvChaskaPoints');
    if (oldPoints) {
      oldPoints.textContent = `${spent.toLocaleString()} / ${earned.toLocaleString()}`;
      oldPoints.classList.toggle('over', spent > earned);
      oldPoints.title = 'Chaska points spent / earned';
    }

    for (const field of FIELDS) {
      const input = $(field.id);
      if (!input) continue;
      const fieldCap = uncapped ? Infinity : capForField(field.id, current);
      const fieldFloor = uncapped ? 0 : minimumForField(field.id, current);
      const card = input.closest('.uv-chaska-stat-card');
      if (card) {
        card.dataset.cap = uncapped ? 'OFF' : String(fieldCap);
        card.classList.toggle('at-cap', !uncapped && current[field.id] >= fieldCap);
        card.classList.toggle('tier-locked', !uncapped && current[field.id] >= fieldCap && Math.min(...Object.entries(current).filter(([key]) => key !== field.id).map(([, value]) => value)) < fieldCap);
        card.classList.toggle('uncapped', uncapped);
      }
      input.max = String(uncapped ? current[field.id] + available : Math.min(fieldCap, current[field.id] + available));
      input.min = String(fieldFloor);
      lastValid.set(field.id, current[field.id]);
    }
  }

  function injectStyles() {
    if ($('chaska-tiers-v4-styles')) return;
    const style = document.createElement('style');
    style.id = 'chaska-tiers-v4-styles';
    style.textContent = `
      .uv-chaska-dashboard{display:grid;gap:10px;margin:-2px 0 12px}.uv-chaska-mode-row{display:flex;justify-content:flex-end}.uv-chaska-no-cap{position:relative;display:block;min-width:170px}.uv-chaska-no-cap>input{position:absolute;opacity:0;pointer-events:none}.uv-chaska-no-cap>span{display:flex;flex-direction:column;justify-content:center;min-height:39px;padding:6px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);cursor:pointer}.uv-chaska-no-cap strong{color:#c9d0da;font-size:.65rem}.uv-chaska-no-cap small{margin-top:2px;color:#717b89;font-size:.53rem;font-weight:800}.uv-chaska-no-cap>input:checked+span{border-color:color-mix(in srgb,var(--blue) 68%,var(--line));background:color-mix(in srgb,var(--blue) 9%,var(--panel-2))}.uv-chaska-no-cap>input:checked+span strong{color:#fff}.uv-chaska-no-cap>input:checked+span small{color:var(--blue)}
      .uv-chaska-status{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.uv-chaska-status>div{padding:8px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}.uv-chaska-status span{display:block;color:var(--muted);font-size:.55rem;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.uv-chaska-status strong{display:block;margin-top:3px;font-size:.83rem}.uv-chaska-status .available{border-color:color-mix(in srgb,var(--blue) 42%,var(--line))}.uv-chaska-status .available strong{color:var(--blue)}
      .uv-chaska-unlock{padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--blue) 5%,var(--panel-2)),var(--panel-2))}.uv-chaska-unlock>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:10px}.uv-chaska-unlock span{color:#c7ced8;font-size:.65rem;font-weight:750}.uv-chaska-unlock b{color:var(--blue);font-size:.65rem}.uv-chaska-unlock-bar{height:4px!important;margin-top:7px!important;border:0!important;border-radius:999px!important;background:var(--line)!important;overflow:hidden}.uv-chaska-unlock-bar i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--blue),var(--crystal));transition:width .16s ease}
      .uv-chaska-tier-grid{gap:8px!important}.uv-chaska-stat-card{position:relative}.uv-chaska-stat-card::after{content:'CAP ' attr(data-cap);position:absolute;top:8px;right:8px;color:#68727f;font-size:.5rem;font-weight:900;letter-spacing:.05em}.uv-chaska-stat-card.at-cap{border-color:color-mix(in srgb,var(--blue) 40%,var(--line))}.uv-chaska-stat-card.tier-locked::after{content:'TIER LOCKED';color:var(--blue)}.uv-chaska-stat-card.uncapped::after{content:'NO CAP';color:var(--blue)}
      .uv-chaska-controls{display:grid;grid-template-columns:32px 32px 1fr 1fr;gap:5px;margin-top:2px}.uv-chaska-controls button{min-height:29px;padding:0 6px;border:1px solid var(--line);border-radius:7px;background:#0b0e13;color:#aab3bf;font-size:.62rem;font-weight:850;cursor:pointer}.uv-chaska-controls button:hover{border-color:var(--line-2);color:#fff}.uv-chaska-controls .fill{color:var(--blue)}.uv-chaska-controls .refund{color:var(--muted)}
      @media(max-width:800px){.uv-chaska-status{grid-template-columns:repeat(3,1fr)}}@media(max-width:520px){.uv-chaska-mode-row{justify-content:stretch}.uv-chaska-no-cap{width:100%}.uv-chaska-status{grid-template-columns:repeat(2,1fr)}.uv-chaska-controls{grid-template-columns:38px 38px 1fr}.uv-chaska-controls .refund{grid-column:1/-1}}
    `;
    document.head.append(style);
  }

  function init() {
    const panel = $('uvChaskaLuck')?.closest('.uv-panel');
    if (!panel) return;

    injectStyles();
    createDashboard(panel);
    loadNoCap();

    for (const field of FIELDS) {
      const input = $(field.id);
      if (!input) continue;
      lastValid.set(field.id, integerValue(field.id));
      input.addEventListener('input', () => normalizeField(input));
      input.addEventListener('change', () => normalizeField(input));
    }

    $('uvChaskaNoCap')?.addEventListener('change', () => {
      saveNoCap();
      clampToEarnedPoints();
      refresh();
      const first = $(FIELDS[0].id);
      first?.dispatchEvent(new Event('input', { bubbles: true }));
      first?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    $('uvRolls')?.addEventListener('input', () => {
      queueMicrotask(() => {
        clampToEarnedPoints();
        refresh();
      });
    });
    $('uvRolls')?.addEventListener('change', () => {
      queueMicrotask(() => {
        clampToEarnedPoints();
        refresh();
      });
    });

    $('resetBtn')?.addEventListener('click', () => setTimeout(() => {
      const toggle = $('uvChaskaNoCap');
      if (toggle) toggle.checked = false;
      try { localStorage.removeItem(NO_CAP_STORAGE); } catch {}
      refresh();
    }, 0));
    refresh();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
