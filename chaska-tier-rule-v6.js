(() => {
  const TIER = 50;
  const IDS = ['uvChaskaLuck','uvChaskaPlatinum','uvChaskaCrystal','uvChaskaGalaxy'];
  const $ = (id) => document.getElementById(id);
  let syncing = false;

  function earned() {
    return Math.floor(Math.max(0, Math.floor(Number($('uvRolls')?.value) || 0)) / 50000);
  }

  function values() {
    return Object.fromEntries(IDS.map((id) => [id, Math.max(0, Math.floor(Number($(id)?.value) || 0))]));
  }

  function total(next = values()) {
    return IDS.reduce((sum, id) => sum + (next[id] || 0), 0);
  }

  // Chaska unlocks in 50-point stages. A stat may reach 50 while the others
  // are below 50, but it may not go to 51 until every other stat has reached
  // 50. Likewise, 101 requires every other stat to have reached 100, etc.
  function tierCeiling(id, next = values()) {
    const others = IDS.filter((other) => other !== id).map((other) => Math.max(0, Math.floor(Number(next[other]) || 0)));
    const lowestOther = others.length ? Math.min(...others) : 0;
    return (Math.floor(lowestOther / TIER) + 1) * TIER;
  }

  function maxFor(id, next = values()) {
    const current = Math.max(0, Math.floor(Number(next[id]) || 0));
    const resourceMax = current + Math.max(0, earned() - total(next));
    return Math.max(0, Math.min(resourceMax, tierCeiling(id, next)));
  }

  function normalize(next) {
    const out = Object.fromEntries(IDS.map((id) => [id, Math.max(0, Math.floor(Number(next[id]) || 0))]));

    // Clamp only at the current 50-point milestone. Example: if the lowest
    // Chaska stat is 99, every stat is capped at 100; once all four reach 100,
    // each stat may progress toward 150.
    const low = Math.min(...IDS.map((id) => out[id]));
    const ceiling = (Math.floor(low / TIER) + 1) * TIER;
    for (const id of IDS) out[id] = Math.min(out[id], ceiling);

    // Keep the allocation inside earned Chaska points.
    let over = total(out) - earned();
    while (over > 0) {
      let id = IDS[0];
      for (const candidate of IDS) if (out[candidate] > out[id]) id = candidate;
      if (out[id] <= 0) break;
      const remove = Math.min(out[id], over);
      out[id] -= remove;
      over -= remove;
    }

    // A resource clamp can lower the milestone floor, so apply the stage rule
    // once more after removing excess points.
    const finalLow = Math.min(...IDS.map((id) => out[id]));
    const finalCeiling = (Math.floor(finalLow / TIER) + 1) * TIER;
    for (const id of IDS) out[id] = Math.min(out[id], finalCeiling);
    return out;
  }

  function apply(next, notify = true) {
    if (syncing) return;
    syncing = true;
    const changed = [];
    for (const id of IDS) {
      const input = $(id);
      if (!input) continue;
      const value = Math.max(0, Math.floor(Number(next[id]) || 0));
      if (input.value !== String(value)) {
        input.value = String(value);
        changed.push(input);
      }
    }
    syncing = false;

    if (notify) {
      for (const input of changed) {
        input.dispatchEvent(new Event('input', { bubbles:true }));
        input.dispatchEvent(new Event('change', { bubbles:true }));
      }
    }
    setTimeout(refreshControls, 0);
  }

  function normalizeAll(notify = true) {
    apply(normalize(values()), notify);
  }

  function refreshControls() {
    const next = values();
    const available = Math.max(0, earned() - total(next));
    for (const id of IDS) {
      const input = $(id);
      if (!input) continue;
      const value = next[id];
      const tierMax = tierCeiling(id, next);
      const allowedMax = maxFor(id, next);
      input.min = '0';
      input.max = String(allowedMax);

      const card = input.closest('.uv-chaska-stat-card') || input.closest('label');
      const plus = card?.querySelector('[data-chaska-action="plus"]');
      const fill = card?.querySelector('[data-chaska-action="fill"]');
      const blockedByTier = value >= tierMax;
      if (plus) plus.disabled = available <= 0 || value >= allowedMax;
      if (fill) fill.disabled = available <= 0 || value >= allowedMax;
      card?.classList.toggle('tier-gated', blockedByTier);
      if (card) {
        if (blockedByTier) card.dataset.tierGate = `Raise every other Chaska stat to ${tierMax} before going above ${tierMax}`;
        else card.removeAttribute('data-tier-gate');
      }
    }
  }

  function handleAction(event) {
    const button = event.target.closest('[data-chaska-action="minus"], [data-chaska-action="plus"], [data-chaska-action="fill"]');
    if (!button) return;
    const card = button.closest('.uv-chaska-stat-card') || button.closest('label');
    const input = card?.querySelector('input[id^="uvChaska"]');
    if (!input || !IDS.includes(input.id)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const next = values();
    const id = input.id;
    const current = next[id];
    const action = button.dataset.chaskaAction;

    if (action === 'minus') {
      next[id] = Math.max(0, current - 1);
    } else {
      const ceiling = maxFor(id, next);
      if (action === 'plus') next[id] = Math.min(ceiling, current + 1);
      if (action === 'fill') next[id] = Math.min(ceiling, current + 50);
    }

    apply(normalize(next), true);
  }

  function sanitizeDirectInput(event) {
    const input = event.target;
    if (syncing || !IDS.includes(input?.id)) return;
    const next = values();
    const id = input.id;
    const requested = Math.max(0, Math.floor(Number(input.value) || 0));
    const ceiling = maxFor(id, { ...next, [id]: next[id] });
    if (requested > ceiling) input.value = String(ceiling);
    setTimeout(() => normalizeAll(true), 0);
  }

  function addRuleNote() {
    const dashboard = $('uvChaskaTierDashboard');
    if (!dashboard || $('uvChaskaTierRuleNote')) return;
    const note = document.createElement('div');
    note.id = 'uvChaskaTierRuleNote';
    note.className = 'uv-chaska-tier-rule-note';
    note.textContent = 'Tier rule: each 50-point milestone must be reached by all four Chaska stats before any stat can enter the next tier. Example: 50 / 0 / 0 / 0 is allowed, but 51 requires the other three stats to be at least 50; 101 requires them to be at least 100.';
    dashboard.append(note);
  }

  function attach() {
    const root = $('upgradeCalcV2');
    if (!root || !IDS.every((id) => $(id))) return false;

    normalizeAll(true);
    addRuleNote();
    refreshControls();

    root.addEventListener('click', handleAction, true);
    root.addEventListener('input', sanitizeDirectInput, true);
    root.addEventListener('change', sanitizeDirectInput, true);
    $('uvRolls')?.addEventListener('input', () => setTimeout(() => normalizeAll(true), 0));
    $('uvRolls')?.addEventListener('change', () => setTimeout(() => normalizeAll(true), 0));
    $('resetBtn')?.addEventListener('click', () => setTimeout(() => { normalizeAll(true); refreshControls(); }, 0));

    const style = document.createElement('style');
    style.id = 'chaska-tier-rule-v6-styles';
    style.textContent = `
      #upgradeCalcV2 .uv-chaska-tier-rule-note{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:.56rem;font-weight:750;line-height:1.45}
      #upgradeCalcV2 .uv-chaska-stat-card.tier-gated{border-color:color-mix(in srgb,var(--blue) 40%,var(--line))}
      #upgradeCalcV2 .uv-chaska-stat-card.tier-gated::after{content:'TIER LIMIT';position:absolute;right:8px;top:7px;color:var(--muted);font-size:.46rem;font-weight:900;letter-spacing:.05em}
    `;
    document.head.append(style);
    return true;
  }

  if (!attach()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (attach() || tries >= 120) clearInterval(timer);
    }, 50);
  }
})();
