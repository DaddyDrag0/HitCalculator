(() => {
  const $ = (id) => document.getElementById(id);

  function removeChaskaNumber() {
    const title = document.querySelector('#upgradeCalcV2 .uv-tool-chaska-s-blessing .uv-panel-title');
    if (!title) return false;
    const numbered = [...title.querySelectorAll('span')].find((span) => /^\d+$/.test(span.textContent.trim()));
    numbered?.remove();
    return true;
  }

  function injectStyles() {
    if ($('optimizer-polish-v4-styles')) return;
    const style = document.createElement('style');
    style.id = 'optimizer-polish-v4-styles';
    style.textContent = `
      #optimizerCalcV1 .opt-simple-head,
      #savedBuildsV1 .opt-simple-head{
        padding:2px 1px 8px!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
      }
      #optimizerCalcV1 .opt-simple-head>strong,
      #savedBuildsV1 .opt-simple-head>strong{
        color:var(--muted)!important;
        font-size:.76rem!important;
        font-weight:900!important;
        letter-spacing:.07em!important;
        text-transform:uppercase!important;
      }
      #optimizerCalcV1 .opt-panel-title>span{display:none!important}
      #optimizerCalcV1 .opt-run-row{justify-content:flex-start}
      #optimizerCalcV1 .opt-run-row>span{display:none!important}
      #optimizerCalcV1 .opt-why{display:none!important}
      #optimizerCalcV1 .opt-relic-controls{display:grid;grid-template-columns:minmax(180px,.42fr) minmax(0,1fr);gap:10px;align-items:end}
      #optimizerCalcV1 .opt-relic-available>span{display:block;margin-bottom:6px;color:var(--muted);font-size:.61rem;font-weight:850}
      #optimizerCalcV1 .opt-relic-available>div{display:flex;flex-wrap:wrap;gap:6px}
      #optimizerCalcV1 .opt-relic-available label{display:flex;align-items:center;gap:6px;min-height:34px;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);font-size:.61rem;font-weight:800;cursor:pointer}
      #optimizerCalcV1 .opt-relic-available input{margin:0;accent-color:var(--blue)}
      #optimizerCalcV1 .opt-relic-result{padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2)}
      #optimizerCalcV1 .opt-relic-result span{display:block;color:var(--muted);font-size:.53rem;font-weight:850;text-transform:uppercase}
      #optimizerCalcV1 .opt-relic-result strong{display:block;margin-top:4px;font-size:.74rem}
      @media(max-width:620px){
        #optimizerCalcV1 .opt-relic-controls{grid-template-columns:1fr}
        #optimizerCalcV1 .opt-relic-available>div{display:grid;grid-template-columns:1fr}
      }
    `;
    document.head.append(style);
  }

  function init() {
    injectStyles();
    if (!removeChaskaNumber()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (removeChaskaNumber() || tries >= 100) clearInterval(timer);
      }, 50);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
