(() => {
  const MAX_ROLLS = 10_000_000_000;
  const ROLLS_PER_CHASKA_POINT = 50_000;
  const BUILDER_STORAGE = 'hitCalcUpgradeBuilderV2';
  const CHASKA_FIELDS = ['uvChaskaLuck', 'uvChaskaPlatinum', 'uvChaskaCrystal', 'uvChaskaGalaxy'];

  function clampRolls(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return n > 0 ? MAX_ROLLS : 0;
    return Math.max(0, Math.min(MAX_ROLLS, Math.floor(n)));
  }

  function sanitizeStoredBuild() {
    try {
      const raw = localStorage.getItem(BUILDER_STORAGE);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || !saved.values || typeof saved.values !== 'object') return;

      const rolls = clampRolls(saved.values.uvRolls);
      let changed = String(saved.values.uvRolls ?? '') !== String(rolls);
      saved.values.uvRolls = String(rolls);

      let remaining = Math.floor(rolls / ROLLS_PER_CHASKA_POINT);
      for (const id of CHASKA_FIELDS) {
        const rawValue = Number(saved.values[id]);
        const requested = Number.isFinite(rawValue) ? Math.max(0, Math.floor(rawValue)) : 0;
        const next = Math.min(requested, remaining);
        if (String(saved.values[id] ?? '') !== String(next)) changed = true;
        saved.values[id] = String(next);
        remaining -= next;
      }

      if (changed) localStorage.setItem(BUILDER_STORAGE, JSON.stringify(saved));
    } catch {}
  }

  function applyInputGuard(input) {
    if (!input || input.id !== 'uvRolls') return;
    input.min = '0';
    input.max = String(MAX_ROLLS);
    input.step = '1';
    input.title = 'Maximum Total Rolls: 10,000,000,000';

    const next = clampRolls(input.value);
    if (String(input.value) !== String(next)) input.value = String(next);
  }

  function guardEvent(event) {
    const target = event.target;
    if (target?.id === 'uvRolls') applyInputGuard(target);
  }

  sanitizeStoredBuild();

  // Capture phase runs before the calculator's own input/change handlers, so
  // impossible values are corrected before any stat/Chaska calculations see them.
  document.addEventListener('input', guardEvent, true);
  document.addEventListener('change', guardEvent, true);

  let observer = null;
  function attach() {
    const input = document.getElementById('uvRolls');
    if (!input) return false;
    applyInputGuard(input);
    observer?.disconnect();
    observer = null;
    return true;
  }

  if (!attach()) {
    observer = new MutationObserver(() => attach());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
