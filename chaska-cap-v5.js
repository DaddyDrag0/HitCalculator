(() => {
  const MAX = 50;
  const IDS = ['uvChaskaLuck','uvChaskaPlatinum','uvChaskaCrystal','uvChaskaGalaxy'];
  let syncing = false;

  const $ = (id) => document.getElementById(id);

  function clampInput(input) {
    if (!input) return false;
    input.min = '0';
    input.max = String(MAX);
    const current = Math.max(0, Math.floor(Number(input.value) || 0));
    const next = Math.min(MAX, current);
    if (String(next) === input.value) return false;
    input.value = String(next);
    return true;
  }

  function refreshControls() {
    for (const id of IDS) {
      const input = $(id);
      if (!input) continue;
      clampInput(input);
      const card = input.closest('.uv-chaska-stat-card') || input.closest('label');
      const value = Math.max(0, Math.floor(Number(input.value) || 0));
      const plus = card?.querySelector('[data-chaska-action="plus"]');
      const fill = card?.querySelector('[data-chaska-action="fill"]');
      if (plus && value >= MAX) plus.disabled = true;
      if (fill && value >= MAX) fill.disabled = true;
      card?.classList.toggle('at-cap', value >= MAX);
      if (card && value >= MAX) card.dataset.cap = `Max ${MAX}`;
      else card?.removeAttribute('data-cap');
    }
  }

  function sanitizeSavedBuilds() {
    try {
      const key = 'hitCalcSavedBuildsV1';
      const builds = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(builds)) return;
      let changed = false;
      for (const build of builds) {
        for (const id of IDS) {
          const entry = build?.data?.[id];
          if (!entry || !('value' in entry)) continue;
          const value = Math.max(0, Math.floor(Number(entry.value) || 0));
          const next = Math.min(MAX, value);
          if (String(next) !== String(entry.value)) {
            entry.value = String(next);
            changed = true;
          }
        }
      }
      if (changed) localStorage.setItem(key, JSON.stringify(builds));
    } catch {}
  }

  function clampAll(notify = false) {
    if (syncing) return;
    syncing = true;
    const changed = [];
    for (const id of IDS) {
      const input = $(id);
      if (input && clampInput(input)) changed.push(input);
    }
    syncing = false;
    refreshControls();
    if (notify) {
      for (const input of changed) {
        input.dispatchEvent(new Event('input', { bubbles:true }));
        input.dispatchEvent(new Event('change', { bubbles:true }));
      }
    }
  }

  function attach() {
    const root = document.getElementById('upgradeCalcV2');
    if (!root) return false;

    sanitizeSavedBuilds();
    clampAll(true);

    root.addEventListener('input', (event) => {
      if (!IDS.includes(event.target?.id) || syncing) return;
      if (clampInput(event.target)) {
        syncing = true;
        event.target.dispatchEvent(new Event('change', { bubbles:true }));
        syncing = false;
      }
      refreshControls();
    }, true);

    root.addEventListener('change', (event) => {
      if (!IDS.includes(event.target?.id) || syncing) return;
      clampInput(event.target);
      refreshControls();
    }, true);

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-chaska-action="plus"], [data-chaska-action="fill"]');
      if (!button) return;
      const input = button.closest('.uv-chaska-stat-card')?.querySelector('input[id^="uvChaska"]');
      if (input && Number(input.value) >= MAX) {
        event.preventDefault();
        event.stopImmediatePropagation();
        refreshControls();
      } else {
        setTimeout(() => clampAll(true), 0);
      }
    }, true);

    const style = document.createElement('style');
    style.id = 'chaska-cap-v5-styles';
    style.textContent = `
      #upgradeCalcV2 .uv-chaska-stat-card.at-cap{border-color:color-mix(in srgb,var(--blue) 42%,var(--line))}
      #upgradeCalcV2 .uv-chaska-stat-card.at-cap::after{content:'MAX 50';position:absolute;right:8px;top:7px;color:var(--muted);font-size:.48rem;font-weight:900;letter-spacing:.05em}
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
