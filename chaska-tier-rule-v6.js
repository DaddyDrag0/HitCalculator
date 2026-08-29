(() => {
  const GAP = 50;
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

  function tierCeiling(id, next = values()) {
    const others = IDS.filter((other) => other !== id).map((other) => Math.max(0, Math.floor(Number(next[other]) || 0)));
    return (others.length ? Math.min(...others) : 0) + GAP;
  }

  function maxFor(id, next = values()) {
    const current = Math.max(0, Math.floor(Number(next[id]) || 0));
    const resourceMax = current + Math.max(0, earned() - total(next));
    return Math.max(0, Math.min(resourceMax, tierCeiling(id, next)));
  }

  function normalize(next) {
    const out = Object.fromEntries(IDS.map((id) => [id, Math.max(0, Math.floor(Number(next[id]) || 0))]));

    // Chaska tier rule: the highest stat may only be 50 above the lowest stat.
    const low = Math.min(...IDS.map((id) => out[id]));
    const ceiling = low + GAP;
    for (const id of IDS) out[id] = Math.min(out[id], ceiling);

    // Keep the allocation inside earned Chaska points. Reducing a highest value
    // cannot make a valid 50-point spread invalid.
    let over = total(out) - earned();
    while (over > 0) {
      let id = IDS[0];
      for (const candidate of IDS) if (out[candidate] > out[id]) id = candidate;
      if (out[id] <= 0) break;
      const remove = Math.min(out[id], over);
      out[id] -= remove;
      over -= remove;
    }

    // A large resource clamp can create a new low value. Re-apply the tier rule.
    const finalLow = Math.min(...IDS.map((id) => out[id]));
    const finalCeiling = finalLow + GAP;
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
        if (blockedByTier) card.dataset.tierGate = `Raise the other Chaska stats before going above ${tierMax}`;
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
    note.textContent = 'Tier rule: a Chaska stat can be at most 50 points ahead of the lowest Chaska stat. Example: 50 / 0 / 0 / 0 is allowed; to go above 50, all four must first reach 50.';
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
