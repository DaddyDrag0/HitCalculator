(() => {
  const HIDE_CLASS = "calc-mode-hidden";

  function directSections() {
    const page = document.querySelector("main.page");
    if (!page) return { directMain: null, directTime: null, upgrade: null };

    const children = [...page.children];
    return {
      directMain: children.find((el) => el.classList?.contains("main-grid")) || null,
      directTime: children.find((el) => el.classList?.contains("time-card") && !el.classList?.contains("ub-time-card")) || null,
      upgrade: document.getElementById("upgradeCalc"),
    };
  }

  function applyMode(mode) {
    const showUpgrade = mode === "upgrades";
    const { directMain, directTime, upgrade } = directSections();

    for (const section of [directMain, directTime]) {
      if (!section) continue;
      section.classList.toggle(HIDE_CLASS, showUpgrade);
      section.hidden = showUpgrade;
    }

    if (upgrade) {
      upgrade.classList.toggle(HIDE_CLASS, !showUpgrade);
      upgrade.hidden = !showUpgrade;
    }

    document.querySelectorAll(".calc-mode-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.calcMode === mode);
    });
  }

  function init() {
    if (!document.getElementById("calc-mode-hide-style")) {
      const style = document.createElement("style");
      style.id = "calc-mode-hide-style";
      style.textContent = `.${HIDE_CLASS}{display:none!important}`;
      document.head.append(style);
    }

    document.querySelectorAll(".calc-mode-tab").forEach((button) => {
      if (button.dataset.switchFixBound === "1") return;
      button.dataset.switchFixBound = "1";
      button.addEventListener("click", () => {
        const next = button.dataset.calcMode;
        queueMicrotask(() => applyMode(next));
      });
    });

    const active = document.querySelector(".calc-mode-tab.active")?.dataset.calcMode || "stats";
    applyMode(active);
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
})();
