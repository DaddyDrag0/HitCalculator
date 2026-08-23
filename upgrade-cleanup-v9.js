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

  function reorderUpgradeUI() {
    const root = document.getElementById('upgradeCalcV2');
    const left = root?.querySelector('.uv-builder-left');
    const tree = left?.querySelector('.uv-tree-wrap');
    const account = root?.querySelector('.uv-tool-account');
    const modifiers = root?.querySelector('.uv-tool-modifiers');
    if (!left || !tree || !account || !modifiers) return;

    let row = left.querySelector('.uv-pre-tree-row');
    if (!row) {
      row = document.createElement('section');
      row.className = 'uv-pre-tree-row';
      tree.insertAdjacentElement('beforebegin', row);
    }

    row.append(account, modifiers);
  }

  function injectStyles() {
    if (document.getElementById('upgrade-cleanup-v9-styles')) return;
    const style = document.createElement('style');
    style.id = 'upgrade-cleanup-v9-styles';
    style.textContent = `
      #upgradeCalcV2 .uv-tree-top-clean{justify-content:flex-end!important;min-height:0!important}
      #upgradeCalcV2 .uv-tree-top-clean .uv-tree-points{margin-left:auto}
      #upgradeCalcV2 .uv-live-sidebar{top:14px}

      #upgradeCalcV2 .uv-pre-tree-row{
        display:grid;
        grid-template-columns:minmax(245px,320px) minmax(0,1fr);
        gap:12px;
        align-items:stretch;
        min-width:0;
      }
      #upgradeCalcV2 .uv-pre-tree-row>.uv-panel{
        margin:0!important;
        grid-column:auto!important;
        min-width:0;
      }
      #upgradeCalcV2 .uv-pre-tree-row .uv-tool-account{
        width:100%;
        max-width:none;
      }
      #upgradeCalcV2 .uv-pre-tree-row .uv-tool-account input,
      #upgradeCalcV2 .uv-pre-tree-row .uv-tool-account select,
      #upgradeCalcV2 .uv-pre-tree-row .uv-index-input-row{
        width:100%;
        min-width:0;
        max-width:100%;
        box-sizing:border-box;
      }
      #upgradeCalcV2 .uv-pre-tree-row .uv-tool-modifiers .uv-toggle-grid{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:7px;
      }
      @media(max-width:1120px){
        #upgradeCalcV2 .uv-pre-tree-row{grid-template-columns:minmax(230px,285px) minmax(0,1fr)}
        #upgradeCalcV2 .uv-pre-tree-row .uv-tool-modifiers .uv-toggle-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:760px){
        #upgradeCalcV2 .uv-pre-tree-row{grid-template-columns:1fr}
        #upgradeCalcV2 .uv-pre-tree-row .uv-tool-modifiers .uv-toggle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    cleanUpgradeUI();
    reorderUpgradeUI();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once:true });
})();
