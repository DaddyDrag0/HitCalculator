(() => {
  const ROLLS_PER_POINT = 50_000;
  const FIELDS = [
    { id: 'uvChaskaLuck', label: 'Luck', className: 'luck' },
    { id: 'uvChaskaPlatinum', label: 'Platinum', className: 'platinum' },
    { id: 'uvChaskaCrystal', label: 'Crystal', className: 'crystal' },
    { id: 'uvChaskaGalaxy', label: 'Galaxy', className: 'galaxy' },
  ];

  const $ = (id) => document.getElementById(id);
  let syncing = false;

  function integerValue(id) {
    return Math.max(0, Math.floor(Number($(id)?.value) || 0));
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

  function availablePoints(nextValues = values()) {
    return Math.max(0, earnedPoints() - totalSpent(nextValues));
  }

  function dispatch(input) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setInputValue(input, value, notify = true) {
    if (!input) return;
    const next = Math.max(0, Math.floor(Number(value) || 0));
    if (input.value === String(next)) {
      refresh();
      return;
    }
    input.value = String(next);
    if (notify) dispatch(input);
    else refresh();
  }

  // Chaska has no per-stat/tier cap in the calculator. The only limit is
  // the total number of Chaska points earned from Total Rolls.
  function normalizeField(input) {
    if (syncing) return;
    syncing = true;

    const current = values();
    const requested = Math.max(0, Math.floor(Number(input.value) || 0));
    const othersSpent = totalSpent(current) - current[input.id];
    const maxForField = Math.max(0, earnedPoints() - othersSpent);
    input.value = String(Math.min(requested, maxForField));

    syncing = false;
    refresh();
  }

  function clampToEarnedPoints() {
    if (syncing) return;
    const earned = earnedPoints();
    const current = values();
    let over = totalSpent(current) - earned;
    if (over <= 0) {
      refresh();
      return;
    }

    syncing = true;
    const ordered = FIELDS
      .map((field) => ({ field, value: current[field.id] }))
      .sort((a, b) => b.value - a.value);

    for (const entry of ordered) {
      if (over <= 0) break;
      const remove = Math.min(entry.value, over);
      current[entry.field.id] -= remove;
      over -= remove;
    }

    for (const field of FIELDS) {
      const input = $(field.id);
      if (input) input.value = String(current[field.id]);
    }
    syncing = false;

    const first = $(FIELDS[0].id);
    if (first) dispatch(first);
    else refresh();
  }

  function addAmount(id, delta) {
    const input = $(id);
    if (!input) return;
    const current = values();
    const present = current[id];

    if (delta > 0) {
      const maxForField = Math.max(0, earnedPoints() - (totalSpent(current) - present));
      setInputValue(input, Math.min(present + delta, maxForField));
    } else {
      setInputValue(input, Math.max(0, present + delta));
    }
  }

  function fill(id) {
    const input = $(id);
    if (!input) return;
    const current = values();
    const othersSpent = totalSpent(current) - current[id];
    setInputValue(input, Math.max(0, earnedPoints() - othersSpent));
  }

  function createDashboard(panel) {
    if ($('uvChaskaTierDashboard')) return;

    const title = panel.querySelector('.uv-panel-title');
    const dashboard = document.createElement('div');
    dashboard.id = 'uvChaskaTierDashboard';
    dashboard.className = 'uv-chaska-dashboard';
    dashboard.innerHTML = `
      <div class="uv-chaska-status">
        <div><span>Earned</span><strong id="uvChaskaEarned">0</strong></div>
        <div><span>Spent</span><strong id="uvChaskaSpent">0</strong></div>
        <div class="available"><span>Available</span><strong id="uvChaskaAvailable">0</strong></div>
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
      `;
      label.append(controls);

      controls.querySelector('[data-chaska-action="minus"]')?.addEventListener('click', () => addAmount(field.id, -1));
      controls.querySelector('[data-chaska-action="plus"]')?.addEventListener('click', () => addAmount(field.id, 1));
      controls.querySelector('[data-chaska-action="fill"]')?.addEventListener('click', () => fill(field.id));
    }

    if (grid) grid.classList.add('uv-chaska-tier-grid');
  }

  function refresh() {
    const current = values();
    const earned = earnedPoints();
    const spent = totalSpent(current);
    const available = Math.max(0, earned - spent);

    const setText = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text;
    };

    setText('uvChaskaEarned', earned.toLocaleString());
    setText('uvChaskaSpent', spent.toLocaleString());
    setText('uvChaskaAvailable', available.toLocaleString());

    const oldPoints = $('uvChaskaPoints');
    if (oldPoints) {
      oldPoints.textContent = `${spent.toLocaleString()} / ${earned.toLocaleString()}`;
      oldPoints.classList.toggle('over', spent > earned);
      oldPoints.title = 'Chaska points spent / earned';
    }

    for (const field of FIELDS) {
      const input = $(field.id);
      if (!input) continue;
      const maxForField = current[field.id] + available;
      input.min = '0';
      input.max = String(maxForField);

      const card = input.closest('.uv-chaska-stat-card');
      card?.removeAttribute('data-cap');
      card?.classList.remove('at-cap', 'tier-locked', 'uncapped');

      const minus = card?.querySelector('[data-chaska-action="minus"]');
      const plus = card?.querySelector('[data-chaska-action="plus"]');
      const fillButton = card?.querySelector('[data-chaska-action="fill"]');
      if (minus) minus.disabled = current[field.id] <= 0;
      if (plus) plus.disabled = available <= 0;
      if (fillButton) fillButton.disabled = available <= 0;
    }
  }

  function injectStyles() {
    if ($('chaska-tiers-v4-styles')) return;
    const style = document.createElement('style');
    style.id = 'chaska-tiers-v4-styles';
    style.textContent = `
      .uv-chaska-dashboard{display:grid;gap:10px;margin:-2px 0 12px}
      .uv-chaska-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
      .uv-chaska-status>div{padding:8px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}
      .uv-chaska-status span{display:block;color:var(--muted);font-size:.55rem;font-weight:850;letter-spacing:.06em;text-transform:uppercase}
      .uv-chaska-status strong{display:block;margin-top:3px;font-size:.83rem}
      .uv-chaska-status .available{border-color:color-mix(in srgb,var(--blue) 42%,var(--line))}
      .uv-chaska-status .available strong{color:var(--blue)}
      .uv-chaska-tier-grid{gap:8px!important}
      .uv-chaska-stat-card{position:relative}
      #upgradeCalcV2 .uv-builder-left .uv-chaska-controls{display:grid!important;grid-template-columns:36px 36px minmax(70px,1fr)!important;gap:6px!important;width:100%;min-width:0;margin-top:4px!important}
      #upgradeCalcV2 .uv-builder-left .uv-chaska-controls button{width:100%;min-width:0;min-height:31px;padding:0 6px!important;white-space:nowrap;border:1px solid var(--line);border-radius:7px;background:#0b0e13;color:#aab3bf;font-size:.62rem;font-weight:850;cursor:pointer}
      #upgradeCalcV2 .uv-builder-left .uv-chaska-controls button:hover:not(:disabled){border-color:var(--line-2);color:#fff}
      #upgradeCalcV2 .uv-builder-left .uv-chaska-controls button:disabled{opacity:.35;cursor:not-allowed}
      #upgradeCalcV2 .uv-builder-left .uv-chaska-controls .fill{color:var(--blue)}
      @media(max-width:520px){.uv-chaska-status{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function init() {
    const panel = $('uvChaskaLuck')?.closest('.uv-panel');
    if (!panel) return;

    try { localStorage.removeItem('hitCalcChaskaNoCapV4'); } catch {}

    injectStyles();
    createDashboard(panel);

    for (const field of FIELDS) {
      const input = $(field.id);
      if (!input) continue;
      input.addEventListener('input', () => normalizeField(input));
      input.addEventListener('change', () => normalizeField(input));
    }

    const handleRolls = () => queueMicrotask(clampToEarnedPoints);
    $('uvRolls')?.addEventListener('input', handleRolls);
    $('uvRolls')?.addEventListener('change', handleRolls);
    $('resetBtn')?.addEventListener('click', () => setTimeout(() => {
      clampToEarnedPoints();
      refresh();
    }, 0));

    clampToEarnedPoints();
    refresh();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
