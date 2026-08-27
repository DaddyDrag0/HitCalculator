(() => {
  const $ = (id) => document.getElementById(id);

  function runCount(panel) {
    const badges = [...panel.querySelectorAll('.rs-fast-test-summary b')];
    for (const badge of badges) {
      const match = badge.textContent.trim().match(/^(\d[\d,]*)\s+runs?$/i);
      if (match) return Number(match[1].replace(/,/g, '')) || 1;
    }
    return 1;
  }

  function timeLabel(panel) {
    const badges = [...panel.querySelectorAll('.rs-fast-test-summary b')];
    return badges[0]?.textContent.trim() || 'Run';
  }

  function removeColumn(table, index) {
    if (!table || index < 0) return;
    table.querySelectorAll('tr').forEach((row) => row.children[index]?.remove());
  }

  function patchRarities(panel, time, runs) {
    const section = panel.querySelector('[data-fast-panel="rarities"]');
    const table = section?.querySelector('table');
    if (!table) return;

    const headers = [...table.querySelectorAll('thead th')];
    const expectedRunsIndex = headers.findIndex((th) => /expected runs hit/i.test(th.textContent));
    if (expectedRunsIndex >= 0) removeColumn(table, expectedRunsIndex);

    const next = [...table.querySelectorAll('thead th')];
    if (next[0]) next[0].textContent = 'Minimum Rarity';
    if (next[1]) next[1].textContent = `Average Hits in ${time}`;
    if (next[2]) next[2].textContent = `Chance to Get 1+ in ${time}`;
    if (next[3]) next[3].textContent = `Total Hits in ${runs} Run${runs === 1 ? '' : 's'}`;
  }

  function patchBorders(panel, time, runs) {
    const section = panel.querySelector('[data-fast-panel="borders"]');
    const table = section?.querySelector('table');
    if (!table) return;
    const headers = [...table.querySelectorAll('thead th')];
    if (headers[0]) headers[0].textContent = 'Combination';
    if (headers[1]) headers[1].textContent = `Average Hits in ${time}`;
    if (headers[2]) headers[2].textContent = 'Share of Rolls';
    if (headers[3]) headers[3].textContent = `Total Hits in ${runs} Run${runs === 1 ? '' : 's'}`;
  }

  function patchHighest(panel, time, runs) {
    const section = panel.querySelector('[data-fast-panel="highest"]');
    const table = section?.querySelector('table');
    if (!table) return;

    const headers = [...table.querySelectorAll('thead th')];
    const expectedRunsIndex = headers.findIndex((th) => /expected runs hit/i.test(th.textContent));
    if (expectedRunsIndex >= 0) removeColumn(table, expectedRunsIndex);

    const next = [...table.querySelectorAll('thead th')];
    if (next[0]) next[0].textContent = 'Pull';
    if (next[1]) next[1].textContent = 'Border';
    if (next[2]) next[2].textContent = 'Effective Rarity';
    if (next[3]) next[3].textContent = `Chance to Get 1+ in ${time}`;
    if (next[4]) next[4].textContent = `Chance to Get 1+ Across ${runs} Run${runs === 1 ? '' : 's'}`;
  }

  function patch() {
    const panel = $('rsFastEstimateTestResults');
    if (!panel || !panel.isConnected) return;
    const time = timeLabel(panel);
    const runs = runCount(panel);

    panel.querySelector('[data-fast-tab="borders"]')?.replaceChildren(document.createTextNode('Borders Pulled'));
    panel.querySelector('[data-fast-tab="highest"]')?.replaceChildren(document.createTextNode('Best Pulls'));

    patchRarities(panel, time, runs);
    patchBorders(panel, time, runs);
    patchHighest(panel, time, runs);
  }

  function attach() {
    const root = $('rollSimulatorV15');
    if (!root) return false;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        patch();
      });
    }).observe(root, { childList: true, subtree: true });
    patch();
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
