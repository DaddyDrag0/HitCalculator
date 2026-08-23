(() => {
  const $ = (id) => document.getElementById(id);

  const BRANCHES = [
    { className: 'luck', select: 'uvSkillLuck', costs: [1, 1, 1, 1, 1, 1, 3] },
    { className: 'speed', select: 'uvSkillSpeed', costs: [1, 1, 1, 1, 1, 1, 3] },
    { className: 'platinum', select: 'uvSkillPlatinum', costs: [1, 1, 1, 1, 1, 3] },
    { className: 'allstat', select: 'uvSkillAll', costs: [5, 5, 5] },
    { className: 'crystal', select: 'uvSkillCrystal', costs: [1, 1, 1, 1, 1, 3] },
    { className: 'ruby', select: 'uvSkillRuby', costs: [1, 1, 1, 1, 1, 3] },
    { className: 'galaxy', select: 'uvSkillGalaxy', costs: [1, 1, 1, 1, 1, 3] },
  ];

  const branchByClass = new Map(BRANCHES.map((branch) => [branch.className, branch]));

  function level(branch) {
    return Math.max(0, Math.min(branch.costs.length, Math.floor(Number($(branch.select)?.value) || 0)));
  }

  function earned() {
    return Math.floor(Math.max(0, Math.floor(Number($('uvIndex')?.value) || 0)) / 50);
  }

  function branchSpent(branch, selectedLevel = level(branch)) {
    return branch.costs.slice(0, selectedLevel).reduce((sum, cost) => sum + cost, 0);
  }

  function spent() {
    return BRANCHES.reduce((sum, branch) => sum + branchSpent(branch), 0);
  }

  function available() {
    return Math.max(0, earned() - spent());
  }

  function branchFromElement(element) {
    const branchEl = element?.closest('.uv-tree-branch');
    if (!branchEl) return null;
    return BRANCHES.find((branch) => branchEl.classList.contains(branch.className)) || null;
  }

  function nodeIndex(button) {
    const rail = button?.closest('.uv-tree-rail');
    if (!rail) return -1;
    return [...rail.querySelectorAll(':scope > .uv-tree-node')].indexOf(button);
  }

  function setLevel(branch, next) {
    const select = $(branch.select);
    if (!select) return;
    select.value = String(Math.max(0, Math.min(branch.costs.length, next)));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    queueMicrotask(patchTree);
  }

  function showNotice(message) {
    const notice = $('uvTreeNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add('show');
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => notice.classList.remove('show'), 2400);
  }

  function handleTreeClick(event) {
    const button = event.target.closest('.uv-tree-node');
    if (!button || !$('uvSkillTreeGrid')?.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const branch = branchFromElement(button);
    const index = nodeIndex(button);
    if (!branch || index < 0) return;

    const current = level(branch);
    const nodeLevel = index + 1;

    if (nodeLevel <= current) {
      if (nodeLevel === current) setLevel(branch, current - 1);
      return;
    }

    if (nodeLevel !== current + 1) return;

    const cost = branch.costs[index];
    if (available() < cost) {
      showNotice(`You need ${cost} SP for this node.`);
      return;
    }

    setLevel(branch, nodeLevel);
  }

  function patchBranch(branch) {
    const branchEl = document.querySelector(`.uv-tree-branch.${branch.className}`);
    if (!branchEl) return;
    const current = level(branch);
    const points = available();
    const nodes = [...branchEl.querySelectorAll('.uv-tree-node')];

    nodes.forEach((node, index) => {
      const nodeLevel = index + 1;
      const cost = branch.costs[index];
      const bought = nodeLevel <= current;
      const next = nodeLevel === current + 1;
      const canBuy = next && points >= cost;

      node.classList.remove('bought', 'available', 'locked', 'special');
      if (bought) node.classList.add('bought');
      else if (canBuy) node.classList.add('available');
      else node.classList.add('locked');

      const small = node.querySelector('.uv-tree-node-copy small');
      if (small) small.textContent = `${cost} SP`;

      const originalTitle = node.title || '';
      node.title = originalTitle.replace(/(?:\?|\d+) SP$/, `${cost} SP`);
    });
  }

  function patchCounters() {
    const earnedPoints = earned();
    const spentPoints = spent();
    const availablePoints = Math.max(0, earnedPoints - spentPoints);

    if ($('uvSkillEarned')) $('uvSkillEarned').textContent = earnedPoints.toLocaleString();
    if ($('uvSkillSpent')) $('uvSkillSpent').textContent = spentPoints.toLocaleString();
    if ($('uvSkillAvailable')) $('uvSkillAvailable').textContent = availablePoints.toLocaleString();
    if ($('uvIndexPoints')) $('uvIndexPoints').textContent = `${earnedPoints.toLocaleString()} SP`;

    const meter = $('uvSkillMeterFill');
    if (meter) meter.style.width = earnedPoints > 0 ? `${Math.min(100, (spentPoints / earnedPoints) * 100)}%` : '0%';
  }

  function patchTree() {
    if (!$('uvSkillTreeGrid')) return;
    patchCounters();
    for (const branch of BRANCHES) patchBranch(branch);
  }

  function clampInvalidBuild() {
    let total = spent();
    const max = earned();
    if (total <= max) return;

    // Refund the most recently reachable/highest nodes until the build fits the Index budget.
    while (total > max) {
      let candidate = null;
      for (const branch of BRANCHES) {
        const current = level(branch);
        if (!current) continue;
        const cost = branch.costs[current - 1];
        if (!candidate || cost > candidate.cost || (cost === candidate.cost && current > candidate.current)) {
          candidate = { branch, current, cost };
        }
      }
      if (!candidate) break;
      const select = $(candidate.branch.select);
      if (!select) break;
      select.value = String(candidate.current - 1);
      total -= candidate.cost;
    }

    for (const branch of BRANCHES) {
      const select = $(branch.select);
      select?.dispatchEvent(new Event('input', { bubbles: true }));
      select?.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function init() {
    if (!$('uvSkillTreeGrid')) return;

    $('uvSkillTreeGrid').addEventListener('click', handleTreeClick, true);

    for (const branch of BRANCHES) {
      $(branch.select)?.addEventListener('input', () => queueMicrotask(patchTree));
      $(branch.select)?.addEventListener('change', () => queueMicrotask(patchTree));
    }

    $('uvIndex')?.addEventListener('input', () => queueMicrotask(() => {
      clampInvalidBuild();
      patchTree();
    }));
    $('uvIndex')?.addEventListener('change', () => queueMicrotask(() => {
      clampInvalidBuild();
      patchTree();
    }));

    $('resetBtn')?.addEventListener('click', () => setTimeout(patchTree, 0));
    patchTree();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
