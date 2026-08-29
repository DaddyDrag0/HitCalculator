(() => {
  const CURRENT = String(window.__HIT_CALC_VERSION__ || '');
  if (!CURRENT) return;

  let checking = false;
  let lastCheck = 0;

  async function checkForUpdate(force = false) {
    const now = Date.now();
    if (checking || (!force && now - lastCheck < 15000)) return;
    checking = true;
    lastCheck = now;
    try {
      const response = await fetch(`./index.html?versionCheck=${now}`, { cache: 'no-store' });
      if (!response.ok) return;
      const text = await response.text();
      const match = text.match(/const version=['"]([^'"]+)['"]/);
      const latest = match?.[1];
      if (!latest || latest === CURRENT) return;

      const url = new URL(window.location.href);
      url.searchParams.set('__siteVersion', latest);
      window.location.replace(url.toString());
    } catch (error) {
      console.debug('[Hit Calc] Version check skipped:', error);
    } finally {
      checking = false;
    }
  }

  setTimeout(() => checkForUpdate(true), 5000);
  setInterval(() => checkForUpdate(true), 30000);
  window.addEventListener('focus', () => checkForUpdate(true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdate(true);
  });
})();
