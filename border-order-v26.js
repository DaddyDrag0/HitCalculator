(() => {
  const ORDER = ['Platinum', 'Crystal', 'Ruby', 'Galaxy'];
  const rank = Object.fromEntries(ORDER.map((name, index) => [name, index]));
  const comboPattern = /(?:Platinum|Crystal|Ruby|Galaxy)(?:\s*\+\s*(?:Platinum|Crystal|Ruby|Galaxy))+/g;
  const attached = new Set();

  function normalize(text) {
    return String(text).replace(comboPattern, (match) => match.split(/\s*\+\s*/).filter((name) => name in rank).sort((a, b) => rank[a] - rank[b]).join(' + '));
  }
  function patchNode(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
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
  function attach(id) {
    if (attached.has(id)) return true;
    const root = document.getElementById(id);
    if (!root) return false;
    new MutationObserver(schedule).observe(root, { childList:true, subtree:true, characterData:true });
    attached.add(id);
    schedule();
    return true;
  }
  function start() {
    attach('upgradeCalcV2');
    attach('rollSimulatorV15');
    if (attached.size >= 2) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      attach('upgradeCalcV2');
      attach('rollSimulatorV15');
      if (attached.size >= 2 || attempts >= 120) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once:true });
})();
