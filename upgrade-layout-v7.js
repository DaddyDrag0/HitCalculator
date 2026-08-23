(() => {
  const $ = (id) => document.getElementById(id);

  function buildLayout() {
    const root = $('upgradeCalcV2');
    if (!root || root.dataset.liveSidebar === '1') return;
    root.dataset.liveSidebar = '1';

    const tree = root.querySelector('.uv-tree-wrap');
    const tools = root.querySelector('.uv-tools-grid');
    const results = root.querySelector('.uv-results-row');
    const time = root.querySelector('.uv-time-panel');
    const targets = root.querySelector('.uv-tool-targets');
    if (!tree || !tools || !results || !time || !targets) return;

    const shell = document.createElement('section');
    shell.className = 'uv-builder-shell';

    const left = document.createElement('div');
    left.className = 'uv-builder-left';

    const right = document.createElement('aside');
    right.className = 'uv-live-sidebar';

    const liveHead = document.createElement('div');
    liveHead.className = 'uv-live-head';
    liveHead.innerHTML = '<div><span>Live Calculator</span><strong>Targets & Results</strong></div><i></i>';

    tree.before(shell);
    shell.append(left, right);
    left.append(tree, tools);
    right.append(liveHead, targets, results, time);

    targets.classList.add('uv-sidebar-targets');
    results.classList.add('uv-sidebar-results');
    time.classList.add('uv-sidebar-time');
  }

  function injectStyles() {
    document.getElementById('upgrade-layout-v7-styles')?.remove();
    const style = document.createElement('style');
    style.id = 'upgrade-layout-v7-styles';
    style.textContent = `
      .uv-builder-shell{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(390px,430px);
        gap:14px;
        align-items:start;
        min-width:0;
      }
      .uv-builder-left{display:grid;gap:14px;min-width:0}
      .uv-live-sidebar{
        position:sticky;
        top:14px;
        display:grid;
        gap:10px;
        min-width:0;
        max-height:calc(100vh - 28px);
        overflow:auto;
        padding-right:3px;
        scrollbar-width:thin;
        scrollbar-color:var(--line-2) transparent;
      }
      .uv-live-sidebar::-webkit-scrollbar{width:6px}
      .uv-live-sidebar::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:999px}
      .uv-live-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:12px 14px;
        border:1px solid color-mix(in srgb,var(--blue) 30%,var(--line));
        border-radius:13px;
        background:linear-gradient(135deg,color-mix(in srgb,var(--blue) 8%,var(--panel)),var(--panel-2));
      }
      .uv-live-head span{display:block;color:var(--blue);font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .uv-live-head strong{display:block;margin-top:2px;font-size:.88rem}
      .uv-live-head i{width:8px;height:8px;border-radius:50%;background:var(--luck);box-shadow:0 0 10px color-mix(in srgb,var(--luck) 70%,transparent)}

      /* Targets become a compact right-side control panel. */
      .uv-sidebar-targets{
        display:block!important;
        grid-column:auto!important;
        padding:14px!important;
      }
      .uv-sidebar-targets .uv-panel-title{display:flex!important;margin-bottom:10px!important}
      .uv-sidebar-targets .uv-target-label{margin-top:2px}
      .uv-sidebar-targets .uv-border-buttons{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:5px!important;
        margin:7px 0 0!important;
      }
      .uv-sidebar-targets .uv-border{min-width:0;padding:0 5px;font-size:.62rem}
      .uv-sidebar-targets .uv-target-rarity{
        display:grid!important;
        grid-column:auto!important;
        grid-row:auto!important;
        gap:6px;
        margin:11px 0 0!important;
      }

      /* Results stack vertically in the live sidebar. */
      .uv-sidebar-results{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:8px!important;
      }
      .uv-sidebar-results .uv-result-panel{padding:14px}
      .uv-sidebar-results .uv-result-values{gap:6px;margin-top:10px}
      .uv-sidebar-results .uv-result-values>div{padding:10px}
      .uv-sidebar-results .uv-result-values strong{font-size:1.14rem}
      .uv-sidebar-results .uv-speed-strip{margin-top:9px;padding-top:8px}

      /* Time span stays visible on the right without becoming too wide. */
      .uv-sidebar-time{padding:14px}
      .uv-sidebar-time .uv-time-head{display:grid;gap:10px;align-items:stretch}
      .uv-sidebar-time .uv-time-controls{grid-template-columns:minmax(0,.8fr) minmax(0,1fr) auto;gap:6px}
      .uv-sidebar-time .uv-time-switch{margin-top:7px}
      .uv-sidebar-time .uv-chance-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:11px}
      .uv-sidebar-time .uv-chance{min-height:46px;padding:8px}
      .uv-sidebar-time .uv-chance>strong{font-size:.7rem}
      .uv-sidebar-time .uv-mini-chip{font-size:.53rem;padding:2px 5px}

      /* The left side is for editing, with more breathing room. */
      .uv-builder-left .uv-tools-grid{grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
      .uv-builder-left .uv-tool-account{grid-column:span 4}
      .uv-builder-left .uv-tool-structures{grid-column:span 8}
      .uv-builder-left .uv-tool-chaska-s-blessing{grid-column:1/-1}
      .uv-builder-left .uv-tool-modifiers{grid-column:1/-1}

      /* Chaska: 2x2 instead of four cramped columns. */
      .uv-builder-left .uv-tool-chaska-s-blessing .uv-chaska-grid,
      .uv-builder-left .uv-tool-chaska-s-blessing .uv-chaska-tier-grid{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:9px!important;
      }
      .uv-builder-left .uv-chaska-stat-card{
        min-width:0;
        padding:11px!important;
      }
      .uv-builder-left .uv-chaska-stat-card>input{width:100%;min-width:0}
      .uv-builder-left .uv-chaska-controls{
        display:grid!important;
        grid-template-columns:36px 36px minmax(52px,.72fr) minmax(72px,1fr)!important;
        gap:6px!important;
        width:100%;
        min-width:0;
        margin-top:4px!important;
      }
      .uv-builder-left .uv-chaska-controls button{
        width:100%;
        min-width:0;
        min-height:31px;
        padding:0 6px!important;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .uv-builder-left .uv-chaska-controls .refund{min-width:72px}
      .uv-builder-left .uv-chaska-dashboard{margin-bottom:13px}
      .uv-builder-left .uv-chaska-status{grid-template-columns:repeat(5,minmax(0,1fr))}

      @media(max-width:1120px){
        .uv-builder-shell{grid-template-columns:minmax(0,1fr) 360px}
        .uv-sidebar-targets .uv-border-buttons{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .uv-sidebar-time .uv-chance-grid{grid-template-columns:1fr}
        .uv-builder-left .uv-tool-account,.uv-builder-left .uv-tool-structures{grid-column:1/-1}
      }
      @media(max-width:900px){
        .uv-builder-shell{grid-template-columns:1fr}
        .uv-live-sidebar{position:static;max-height:none;overflow:visible;padding-right:0}
        .uv-sidebar-targets .uv-border-buttons{grid-template-columns:repeat(4,minmax(0,1fr))!important}
        .uv-sidebar-time .uv-chance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:620px){
        .uv-builder-left .uv-tool-chaska-s-blessing .uv-chaska-grid,
        .uv-builder-left .uv-tool-chaska-s-blessing .uv-chaska-tier-grid{grid-template-columns:1fr!important}
        .uv-builder-left .uv-chaska-status{grid-template-columns:repeat(2,minmax(0,1fr))}
        .uv-sidebar-targets .uv-border-buttons{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .uv-sidebar-time .uv-chance-grid{grid-template-columns:1fr}
      }
    `;
    document.head.append(style);
  }

  function init() {
    if (!$('upgradeCalcV2')) return;
    injectStyles();
    buildLayout();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once:true });
})();
