(() => {
  const THEMES = new Set(['default', 'scarlet', 'slate', 'lava']);
  const STORAGE = 'crx-site-theme';
  const COLORS = {
    default: '#090b0f',
    scarlet: '#080406',
    slate: '#171b21',
    lava: '#090202'
  };
  const LAYER_ID = 'hitCalcBloodRain';
  const MAX_DROPS = 140;

  let rainRunning = false;
  let rainTimer = 0;
  const pending = new Set();

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isScarlet = () => document.documentElement.dataset.theme === 'scarlet';

  function getRainLayer() {
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      layer.className = 'blood-rain-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.prepend(layer);
    }
    return layer;
  }

  function later(fn, delay) {
    const id = window.setTimeout(() => {
      pending.delete(id);
      fn();
    }, delay);
    pending.add(id);
    return id;
  }

  function stopRain() {
    window.clearTimeout(rainTimer);
    rainTimer = 0;
    for (const id of pending) window.clearTimeout(id);
    pending.clear();
    rainRunning = false;
    document.getElementById(LAYER_ID)?.replaceChildren();
  }

  function spawnDrop() {
    if (!rainRunning || !isScarlet() || reducedMotion()) return;

    const layer = getRainLayer();
    if (layer.childElementCount >= MAX_DROPS) return;

    const drop = document.createElement('i');
    drop.className = 'blood-drop';

    const size = 4 + Math.random() * 8;
    const height = size * (1.05 + Math.random() * 0.55);
    const duration = 2 + Math.random() * 3.6;
    const drift = -38 + Math.random() * 76;
    const opacity = 0.38 + Math.random() * 0.56;

    drop.style.left = `${(Math.random() * 100).toFixed(3)}vw`;
    drop.style.width = `${size.toFixed(2)}px`;
    drop.style.height = `${height.toFixed(2)}px`;
    drop.style.opacity = opacity.toFixed(2);
    drop.style.setProperty('--blood-fall-time', `${duration.toFixed(2)}s`);
    drop.style.setProperty('--blood-drift', `${drift.toFixed(1)}px`);
    drop.style.setProperty('--blood-spin', `${(-10 + Math.random() * 20).toFixed(1)}deg`);

    if (Math.random() < 0.16) {
      drop.style.filter = `blur(${(0.45 + Math.random() * 0.75).toFixed(2)}px)`;
    }

    drop.addEventListener('animationend', () => drop.remove(), { once: true });
    layer.appendChild(drop);
  }

  function scheduleRain() {
    if (!rainRunning) return;

    spawnDrop();

    const roll = Math.random();
    const delay = roll < 0.18
      ? 28 + Math.random() * 70
      : roll < 0.72
        ? 90 + Math.random() * 175
        : 260 + Math.random() * 360;

    rainTimer = window.setTimeout(scheduleRain, delay);
  }

  function startRain() {
    if (rainRunning || !isScarlet() || reducedMotion()) return;

    rainRunning = true;
    getRainLayer();

    const initial = 8 + Math.floor(Math.random() * 9);
    for (let i = 0; i < initial; i += 1) {
      later(spawnDrop, 40 + Math.random() * 1200);
    }

    later(scheduleRain, 40 + Math.random() * 180);
  }

  function syncRain() {
    if (isScarlet()) startRain();
    else stopRain();
  }

  function applyTheme(theme, persist = true) {
    if (!THEMES.has(theme)) theme = 'default';

    document.documentElement.dataset.theme = theme;

    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme]);

    if (persist) {
      try {
        localStorage.setItem(STORAGE, theme);
      } catch {}
    }

    syncRain();
  }

  function boot() {
    let theme = 'default';
    try {
      const saved = localStorage.getItem(STORAGE);
      if (THEMES.has(saved)) theme = saved;
    } catch {}

    const switcher = document.createElement('div');
    switcher.className = 'theme-switcher';
    switcher.innerHTML = `
      <span class="theme-switcher-label">Theme</span>
      <div class="theme-options">
        <button type="button" class="theme-choice" data-theme-choice="default"><i></i>Default</button>
        <button type="button" class="theme-choice" data-theme-choice="scarlet"><i></i>Scarlet</button>
        <button type="button" class="theme-choice" data-theme-choice="slate"><i></i>Slate</button>
        <button type="button" class="theme-choice" data-theme-choice="lava"><i></i>Lava</button>
      </div>
    `;

    document.body.appendChild(switcher);

    switcher.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.addEventListener('click', () => applyTheme(button.dataset.themeChoice || 'default'));
    });

    applyTheme(theme, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
