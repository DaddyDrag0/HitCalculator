(() => {
  const ORDER = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const rank = Object.fromEntries(ORDER.map((name, index) => [name, index]));
  const comboPattern = /(?:Platinum|Crystal|Ruby|Galaxy)(?:\s*\+\s*(?:Platinum|Crystal|Ruby|Galaxy))+/g;

  function normalize(text) {
    return String(text).replace(comboPattern, (match) => {
      const names = match.split(/\s*\+\s*/).filter((name) => name in rank);
      return names.sort((a, b) => rank[a] - rank[b]).join(' + ');
    });
  }

  function patchNode(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const next = normalize(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  let scheduled = false;
  function patch() {
    scheduled = false;
    patchNode(document.getElementById('upgradeCalcV2'));
    patchNode(document.getElementById('rollSimulatorV15'));
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(patch);
  }

  function init() {
    patch();
    for (const id of ['upgradeCalcV2', 'rollSimulatorV15']) {
      const root = document.getElementById(id);
      if (root) new MutationObserver(schedule).observe(root, { childList:true, subtree:true, characterData:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
