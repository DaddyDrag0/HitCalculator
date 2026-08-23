(() => {
  function cleanUpgradeUI() {
    const root = document.getElementById('upgradeCalcV2');
    if (!root) return;

    root.querySelector('.uv-builder-hero')?.remove();
    root.querySelector('.uv-live-head')?.remove();
    root.querySelector('.uv-tree-heading')?.remove();

    const treeTop = root.querySelector('.uv-tree-top');
    if (treeTop) treeTop.classList.add('uv-tree-top-clean');
  }

  function injectStyles() {
    if (document.getElementById('upgrade-cleanup-v9-styles')) return;
    const style = document.createElement('style');
    style.id = 'upgrade-cleanup-v9-styles';
    style.textContent = `
      #upgradeCalcV2 .uv-tree-top-clean{justify-content:flex-end!important;min-height:0!important}
      #upgradeCalcV2 .uv-tree-top-clean .uv-tree-points{margin-left:auto}
      #upgradeCalcV2 .uv-live-sidebar{top:14px}
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    cleanUpgradeUI();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once:true });
})();
