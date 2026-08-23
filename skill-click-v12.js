(() => {
  const $ = id => document.getElementById(id);
  const BRANCHES = [
    { className:'luck', select:'uvSkillLuck', costs:[1,1,1,1,1,1,3] },
    { className:'speed', select:'uvSkillSpeed', costs:[1,1,1,1,1,1,3] },
    { className:'platinum', select:'uvSkillPlatinum', costs:[1,1,1,1,1,3] },
    { className:'allstat', select:'uvSkillAll', costs:[5,5,5] },
    { className:'crystal', select:'uvSkillCrystal', costs:[1,1,1,1,1,3] },
    { className:'ruby', select:'uvSkillRuby', costs:[1,1,1,1,1,3] },
    { className:'galaxy', select:'uvSkillGalaxy', costs:[1,1,1,1,1,3] },
  ];

  const level = b => Math.max(0, Math.min(b.costs.length, Math.floor(Number($(b.select)?.value) || 0)));
  const earned = () => Math.floor(Math.max(0, Math.floor(Number($('uvIndex')?.value) || 0)) / 50);
  const branchSpent = (b, l = level(b)) => b.costs.slice(0, l).reduce((a, c) => a + c, 0);
  const spent = () => BRANCHES.reduce((a, b) => a + branchSpent(b), 0);
  const available = () => Math.max(0, earned() - spent());
  const pathCost = (b, from, to) => b.costs.slice(from, to).reduce((a, c) => a + c, 0);

  function branchFrom(button) {
    const el = button.closest('.uv-tree-branch');
    return BRANCHES.find(b => el?.classList.contains(b.className)) || null;
  }
  function nodeIndex(button) {
    const rail = button.closest('.uv-tree-rail');
    return rail ? [...rail.querySelectorAll(':scope > .uv-tree-node')].indexOf(button) : -1;
  }
  function setLevel(branch, next) {
    const select = $(branch.select);
    if (!select) return;
    select.value = String(Math.max(0, Math.min(branch.costs.length, next)));
    select.dispatchEvent(new Event('input', { bubbles:true }));
    select.dispatchEvent(new Event('change', { bubbles:true }));
  }
  function notice(text) {
    const el = $('uvTreeNotice');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function handle(event) {
    const button = event.target.closest('.uv-tree-node');
    const grid = $('uvSkillTreeGrid');
    if (!button || !grid?.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const branch = branchFrom(button);
    const index = nodeIndex(button);
    if (!branch || index < 0) return;

    const current = level(branch);
    const target = index + 1;

    // Earlier purchased node: jump directly back to it.
    if (target < current) {
      setLevel(branch, target);
      return;
    }

    // Current highest node: refund that node. Lv 1 -> Lv 0 works here.
    if (target === current) {
      setLevel(branch, current - 1);
      return;
    }

    // Future node: buy the entire path only if the full cost is affordable.
    const cost = pathCost(branch, current, target);
    const points = available();
    if (points < cost) {
      notice(`You need ${cost} SP to reach this node. You have ${points} SP available.`);
      return;
    }
    setLevel(branch, target);
  }

  function init() {
    const grid = $('uvSkillTreeGrid');
    if (!grid || grid.dataset.fastClickV12 === '1') return;
    grid.dataset.fastClickV12 = '1';
    grid.addEventListener('click', handle, true);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once:true });
})();
