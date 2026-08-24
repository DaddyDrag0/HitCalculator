(() => {
  function applyDungeonTheme() {
    if (document.getElementById('dungeon-theme-v13-styles')) return;

    const style = document.createElement('style');
    style.id = 'dungeon-theme-v13-styles';
    style.textContent = `
      #upgradeCalcV2 #uvDungeonTokens {
        width: 110px !important;
        min-width: 0 !important;
        max-width: 48% !important;
        height: 34px !important;
        padding: 0 11px !important;
        box-sizing: border-box !important;
        border: 1px solid var(--line) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--panel) !important;
        color: #f3f6fa !important;
        font: inherit !important;
        font-size: .82rem !important;
        font-weight: 900 !important;
        line-height: 34px !important;
        text-align: right !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.02) !important;
        appearance: textfield !important;
        -moz-appearance: textfield !important;
        transition: border-color .15s ease, box-shadow .15s ease, background .15s ease !important;
      }

      #upgradeCalcV2 #uvDungeonTokens:hover {
        border-color: var(--line-2) !important;
        background: color-mix(in srgb, var(--panel) 88%, var(--blue) 12%) !important;
      }

      #upgradeCalcV2 #uvDungeonTokens:focus {
        border-color: color-mix(in srgb, var(--blue) 72%, var(--line)) !important;
        background: var(--panel) !important;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 13%, transparent), inset 0 1px 0 rgba(255,255,255,.025) !important;
      }

      #upgradeCalcV2 #uvDungeonTokens::-webkit-inner-spin-button,
      #upgradeCalcV2 #uvDungeonTokens::-webkit-outer-spin-button {
        -webkit-appearance: none !important;
        appearance: none !important;
        margin: 0 !important;
      }

      @media(max-width:760px) {
        #upgradeCalcV2 #uvDungeonTokens {
          width: 120px !important;
          max-width: 52% !important;
        }
      }
    `;
    document.head.append(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDungeonTheme, { once: true });
  } else {
    applyDungeonTheme();
  }
})();
