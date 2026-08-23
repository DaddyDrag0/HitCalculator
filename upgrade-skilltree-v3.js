(() => {
  const STORAGE_KEY = 'hitCalcSkillTreeV3';

  const BRANCHES = [
    { key: 'Luck', label: 'Luck', select: 'uvSkillLuck', className: 'luck', values: [0, 15, 30, 45, 60, 75, 90, 150], suffix: '×' },
    { key: 'RollSpeed', label: 'Roll Speed', select: 'uvSkillSpeed', className: 'speed', values: [0, 5, 10, 15, 20, 25, 30, 45], suffix: '%' },
    { key: 'Platinum', label: 'Platinum', select: 'uvSkillPlatinum', className: 'platinum', values: [0, .5, 1, 1.5, 2, 2.5, 5], suffix: '×' },
    { key: 'AllStat', label: 'All Stat', select: 'uvSkillAll', className: 'allstat', values: [0, 3, 6, 11], suffix: '%' },
    { key: 'Crystal', label: 'Crystal', select: 'uvSkillCrystal', className: 'crystal', values: [0, 1.75, 3.5, 5.25, 7, 8.75, 14.75], suffix: '×' },
    { key: 'Ruby', label: 'Ruby', select: 'uvSkillRuby', className: 'ruby', values: [0, 1.5, 3, 4.5, 6, 7.5, 13.5], suffix: '×' },
    { key: 'Galaxy', label: 'Galaxy', select: 'uvSkillGalaxy', className: 'galaxy', values: [0, 4, 8, 12, 16, 20, 30], suffix: '×' },
  ];

  // Accessible source data exposes the node stat values, but not the special SP costs.
  // Standard nodes are 1 SP. Final nodes remain unknown until exact game costs are supplied.
  const COSTS = Object.fromEntries(BRANCHES.map((branch) => [
    branch.key,
    Array.from({ length: branch.values.length - 1 }, (_, index) => index === branch.values.length - 2 ? null : 1),
  ]));

  const $ = (id) => document.getElementById(id);
  const selectedLevel = (branch) => Math.max(0, Math.min(branch.values.length - 1, Number($(branch.select)?.value) || 0));

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: Math.max(0, Math.floor(Number($('uvIndex')?.value) || 0)) }));
    } catch {}
  }

  function earnedPoints() {
    return Math.floor(Math.max(0, Math.floor(Number($('uvIndex')?.value) || 0)) / 50);
  }

  function costFor(branch, nodeIndex) {
    return COSTS[branch.key]?.[nodeIndex] ?? null;
  }

  function spentInfo() {
    let known = 0;
    let unknown = 0;
    for (const branch of BRANCHES) {
      const level = selectedLevel(branch);
      for (let i = 0; i < level; i += 1) {
        const cost = costFor(branch, i);
        if (cost == null) unknown += 1;
        else known += cost;
      }
    }
    return { known, unknown };
  }

  function incrementFor(branch, nodeIndex) {
    const before = branch.values[nodeIndex] || 0;
    const after = branch.values[nodeIndex + 1] || before;
    return after - before;
  }

  function pretty(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }

  function setSkillLevel(branch, nextLevel) {
    const select = $(branch.select);
    if (!select) return;
    select.value = String(nextLevel);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    renderTree();
  }

  function handleNodeClick(branch, nodeIndex) {
    const level = selectedLevel(branch);
    const nodeLevel = nodeIndex + 1;

    if (nodeLevel <= level) {
      if (nodeLevel === level) setSkillLevel(branch, level - 1);
      return;
    }

    if (nodeLevel !== level + 1) return;

    const cost = costFor(branch, nodeIndex);
    if (cost == null) {
      showTreeNotice('This node has a special Skill Point cost. Send me the exact cost and I’ll unlock it.');
      return;
    }

    const spent = spentInfo();
    const available = earnedPoints() - spent.known;
    if (available < cost) {
      showTreeNotice('Not enough Skill Points for this node.');
      return;
    }

    setSkillLevel(branch, nodeLevel);
  }

  let noticeTimer = 0;
  function showTreeNotice(message) {
    const notice = $('uvTreeNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.remove('show'), 2600);
  }

  function renderBranch(branch) {
    const level = selectedLevel(branch);
    const spent = spentInfo();
    const availablePoints = earnedPoints() - spent.known;
    const branchEl = document.createElement('section');
    branchEl.className = `uv-tree-branch ${branch.className}`;
    branchEl.style.setProperty('--node-count', branch.values.length - 1);

    const title = document.createElement('div');
    title.className = 'uv-tree-branch-title';
    title.innerHTML = `<strong>${branch.label}</strong><span>Lv ${level}/${branch.values.length - 1}</span>`;
    branchEl.append(title);

    const rail = document.createElement('div');
    rail.className = 'uv-tree-rail';

    for (let i = 0; i < branch.values.length - 1; i += 1) {
      const nodeLevel = i + 1;
      const bought = nodeLevel <= level;
      const next = nodeLevel === level + 1;
      const cost = costFor(branch, i);
      const affordable = cost != null && availablePoints >= cost;
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'uv-tree-node';
      if (bought) node.classList.add('bought');
      else if (next && cost == null) node.classList.add('special');
      else if (next && affordable) node.classList.add('available');
      else node.classList.add('locked');
      if (i === branch.values.length - 2) node.classList.add('final');

      const delta = incrementFor(branch, i);
      const total = branch.values[nodeLevel];
      const costText = cost == null ? '? SP' : `${cost} SP`;
      node.innerHTML = `
        <span class="uv-tree-orb"><i></i><b>${nodeLevel}</b></span>
        <span class="uv-tree-node-copy"><strong>+${pretty(delta)}${branch.suffix}</strong><small>${costText}</small></span>
      `;
      node.title = `${branch.label} Lv ${nodeLevel} · +${pretty(delta)}${branch.suffix} · Total ${pretty(total)}${branch.suffix} · ${costText}`;
      node.addEventListener('click', () => handleNodeClick(branch, i));
      rail.append(node);
    }

    branchEl.append(rail);
    return branchEl;
  }

  function renderTree() {
    const tree = $('uvSkillTreeGrid');
    if (!tree) return;
    tree.replaceChildren();
    for (const branch of BRANCHES) tree.append(renderBranch(branch));

    const earned = earnedPoints();
    const spent = spentInfo();
    const available = Math.max(0, earned - spent.known);
    const setText = (id, text) => { if ($(id)) $(id).textContent = text; };
    setText('uvSkillEarned', earned.toLocaleString());
    setText('uvSkillSpent', spent.unknown ? `${spent.known}+?` : spent.known.toLocaleString());
    setText('uvSkillAvailable', spent.unknown ? `${available}+?` : available.toLocaleString());
    setText('uvIndexPoints', `${earned.toLocaleString()} SP`);

    const meter = $('uvSkillMeterFill');
    if (meter) meter.style.width = earned > 0 ? `${Math.min(100, (spent.known / earned) * 100)}%` : '0%';
  }

  function panelByName(name) {
    return [...document.querySelectorAll('#upgradeCalcV2 .uv-panel')].find((panel) => panel.querySelector('.uv-panel-title strong')?.textContent.trim() === name) || null;
  }

  function addIndexInput(accountPanel) {
    if (!accountPanel || $('uvIndex')) return;
    const saved = loadLocal();
    const field = document.createElement('label');
    field.className = 'uv-big-field uv-index-field';
    field.innerHTML = `<span>Index</span><div class="uv-index-input-row"><input id="uvIndex" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(saved.index) || 0))}"><b id="uvIndexPoints">0 SP</b></div>`;
    const firstField = accountPanel.querySelector('.uv-big-field');
    if (firstField) firstField.insertAdjacentElement('beforebegin', field);
    else accountPanel.append(field);
    $('uvIndex').addEventListener('input', () => { saveLocal(); renderTree(); });
    $('uvIndex').addEventListener('change', () => { saveLocal(); renderTree(); });
  }

  function buildSkillTree(skillPanel) {
    if (!skillPanel || $('uvSkillTreeGrid')) return;
    skillPanel.classList.add('uv-skill-tree-panel');
    const old = skillPanel.querySelector('.uv-level-list');
    if (old) old.classList.add('uv-hidden-skill-selects');

    const intro = document.createElement('div');
    intro.className = 'uv-tree-top';
    intro.innerHTML = `
      <div class="uv-tree-heading">
        <span>Skill Tree</span>
        <strong>Build your branches</strong>
      </div>
      <div class="uv-tree-points">
        <div><span>Earned</span><strong id="uvSkillEarned">0</strong></div>
        <div><span>Spent</span><strong id="uvSkillSpent">0</strong></div>
        <div class="available"><span>Available</span><strong id="uvSkillAvailable">0</strong></div>
      </div>
    `;

    const meter = document.createElement('div');
    meter.className = 'uv-skill-meter';
    meter.innerHTML = '<i id="uvSkillMeterFill"></i>';

    const tree = document.createElement('div');
    tree.id = 'uvSkillTreeGrid';
    tree.className = 'uv-skill-tree-grid';

    const notice = document.createElement('div');
    notice.id = 'uvTreeNotice';
    notice.className = 'uv-tree-notice';

    old?.insertAdjacentElement('beforebegin', intro);
    intro.insertAdjacentElement('afterend', meter);
    meter.insertAdjacentElement('afterend', tree);
    tree.insertAdjacentElement('afterend', notice);
  }

  function rebuildLayout() {
    const root = $('upgradeCalcV2');
    const workbench = root?.querySelector('.uv-workbench');
    if (!root || !workbench || root.dataset.v3Layout === '1') return;
    root.dataset.v3Layout = '1';

    const account = panelByName('Account');
    const skill = panelByName('Skill Tree');
    const structures = panelByName('Structures');
    const chaska = panelByName("Chaska's Blessing");
    const modifiers = panelByName('Modifiers');
    const targets = panelByName('Targets');

    const hero = document.createElement('section');
    hero.className = 'uv-builder-hero';
    hero.innerHTML = `<div><span>Upgrade Builder</span><strong>Build your in-game setup</strong></div><div class="uv-builder-rule"><b>1</b><span>Skill Point every <strong>50 Index</strong></span></div>`;
    root.querySelector('.uv-stat-ribbon')?.insertAdjacentElement('beforebegin', hero);

    addIndexInput(account);
    buildSkillTree(skill);

    const treeWrap = document.createElement('section');
    treeWrap.className = 'uv-tree-wrap';
    if (skill) treeWrap.append(skill);
    root.querySelector('.uv-stat-ribbon')?.insertAdjacentElement('afterend', treeWrap);

    const tools = document.createElement('section');
    tools.className = 'uv-tools-grid';
    [account, structures, chaska, modifiers, targets].forEach((panel) => {
      if (panel) {
        panel.classList.add(`uv-tool-${panel.querySelector('.uv-panel-title strong')?.textContent.toLowerCase().replace(/[^a-z]+/g, '-')}`);
        tools.append(panel);
      }
    });
    treeWrap.insertAdjacentElement('afterend', tools);
    workbench.remove();

    root.querySelectorAll('.uv-panel-title > span').forEach((number) => number.remove());
  }

  function injectStyles() {
    document.getElementById('upgrade-skilltree-v3-styles')?.remove();
    const style = document.createElement('style');
    style.id = 'upgrade-skilltree-v3-styles';
    style.textContent = `
      #upgradeCalcV2{gap:16px}
      .uv-builder-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 24px;border:1px solid var(--line);border-radius:18px;background:radial-gradient(circle at 15% 0%,color-mix(in srgb,var(--blue) 13%,transparent),transparent 42%),linear-gradient(135deg,var(--panel),var(--panel-2));overflow:hidden}
      .uv-builder-hero>div:first-child span{display:block;color:var(--blue);font-size:.66rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.uv-builder-hero>div:first-child strong{display:block;margin-top:4px;font-size:clamp(1.25rem,3vw,1.8rem);letter-spacing:-.035em}.uv-builder-rule{display:flex;align-items:center;gap:10px;min-width:max-content;padding:9px 12px;border:1px solid var(--line-2);border-radius:12px;background:color-mix(in srgb,var(--panel-2) 82%,transparent)}.uv-builder-rule>b{display:grid;place-items:center;width:31px;height:31px;border-radius:9px;background:var(--blue);color:#07101f;font-size:1rem}.uv-builder-rule span{color:var(--muted);font-size:.7rem}.uv-builder-rule span strong{color:var(--text)}
      .uv-stat-ribbon{border-radius:16px}
      .uv-tree-wrap{min-width:0}.uv-skill-tree-panel{position:relative;padding:20px;border-radius:18px;background:radial-gradient(circle at 50% 100%,color-mix(in srgb,var(--blue) 8%,transparent),transparent 45%),var(--panel);overflow:hidden}.uv-skill-tree-panel>.uv-panel-title{display:none}.uv-hidden-skill-selects{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important;pointer-events:none!important}
      .uv-tree-top{display:flex;align-items:end;justify-content:space-between;gap:18px}.uv-tree-heading span{display:block;color:var(--muted);font-size:.64rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.uv-tree-heading strong{display:block;margin-top:3px;font-size:1.18rem}.uv-tree-points{display:flex;gap:7px}.uv-tree-points>div{min-width:72px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.uv-tree-points span{display:block;color:var(--muted);font-size:.57rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.uv-tree-points strong{display:block;margin-top:3px;font-size:.9rem}.uv-tree-points .available{border-color:color-mix(in srgb,var(--blue) 45%,var(--line))}.uv-tree-points .available strong{color:var(--blue)}
      .uv-skill-meter{height:4px;margin:15px 0 19px;border-radius:999px;background:var(--line);overflow:hidden}.uv-skill-meter i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--blue),var(--crystal));transition:width .2s ease}
      .uv-skill-tree-grid{display:grid;grid-template-columns:repeat(7,minmax(118px,1fr));gap:10px;min-width:980px;padding:4px 0 8px;overflow:visible}.uv-tree-wrap{overflow-x:auto;padding-bottom:3px;scrollbar-width:thin}.uv-tree-wrap::-webkit-scrollbar{height:7px}.uv-tree-wrap::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:999px}
      .uv-tree-branch{--branch:var(--blue);position:relative;display:flex;flex-direction:column;min-width:0;padding:12px 9px 13px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--branch) 7%,var(--panel-2)),var(--panel-2));overflow:hidden}.uv-tree-branch::after{content:'';position:absolute;left:28px;top:58px;bottom:29px;width:2px;background:linear-gradient(var(--branch),color-mix(in srgb,var(--branch) 18%,var(--line)));opacity:.55}.uv-tree-branch.luck{--branch:var(--luck)}.uv-tree-branch.speed{--branch:var(--blue)}.uv-tree-branch.platinum{--branch:var(--platinum)}.uv-tree-branch.allstat{--branch:#f0c96b}.uv-tree-branch.crystal{--branch:var(--crystal)}.uv-tree-branch.ruby{--branch:var(--ruby)}.uv-tree-branch.galaxy{--branch:var(--galaxy)}
      .uv-tree-branch-title{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:0 2px 9px}.uv-tree-branch-title strong{color:var(--branch);font-size:.72rem}.uv-tree-branch-title span{color:var(--muted);font-size:.58rem;font-weight:800}
      .uv-tree-rail{position:relative;z-index:1;display:grid;gap:7px}.uv-tree-node{display:grid;grid-template-columns:39px minmax(0,1fr);align-items:center;gap:7px;min-height:49px;padding:5px 6px;border:1px solid var(--line);border-radius:10px;background:#0b0e13;color:var(--muted);cursor:default;text-align:left;transition:transform .12s ease,border-color .12s ease,background .12s ease}.uv-tree-orb{position:relative;display:grid;place-items:center;width:36px;height:36px;border:2px solid color-mix(in srgb,var(--branch) 25%,var(--line));border-radius:50%;background:#0a0d12;box-shadow:0 0 0 4px color-mix(in srgb,var(--panel-2) 90%,transparent)}.uv-tree-orb i{position:absolute;inset:6px;border-radius:50%;background:color-mix(in srgb,var(--branch) 12%,transparent)}.uv-tree-orb b{position:relative;z-index:1;font-size:.67rem}.uv-tree-node-copy strong{display:block;color:#c4cad3;font-size:.68rem}.uv-tree-node-copy small{display:block;margin-top:2px;color:#6f7885;font-size:.55rem;font-weight:800}.uv-tree-node.bought{border-color:color-mix(in srgb,var(--branch) 50%,var(--line));background:color-mix(in srgb,var(--branch) 8%,#0b0e13);cursor:pointer}.uv-tree-node.bought .uv-tree-orb{border-color:var(--branch);box-shadow:0 0 14px color-mix(in srgb,var(--branch) 34%,transparent)}.uv-tree-node.bought .uv-tree-orb i{background:var(--branch);opacity:.72}.uv-tree-node.bought .uv-tree-node-copy strong{color:var(--branch)}.uv-tree-node.available{border-color:color-mix(in srgb,var(--branch) 68%,var(--line));cursor:pointer}.uv-tree-node.available:hover,.uv-tree-node.bought:hover{transform:translateY(-1px);background:color-mix(in srgb,var(--branch) 12%,#0b0e13)}.uv-tree-node.available .uv-tree-orb{border-color:var(--branch);box-shadow:0 0 12px color-mix(in srgb,var(--branch) 26%,transparent)}.uv-tree-node.special{border-style:dashed;border-color:color-mix(in srgb,var(--branch) 38%,var(--line));cursor:pointer}.uv-tree-node.special .uv-tree-node-copy small{color:var(--branch)}.uv-tree-node.locked{opacity:.48}.uv-tree-node.final{margin-top:2px}.uv-tree-node.final .uv-tree-orb{border-width:3px}.uv-tree-node.final .uv-tree-node-copy strong::after{content:' FINAL';margin-left:3px;color:var(--branch);font-size:.46rem;letter-spacing:.07em}
      .uv-tree-notice{position:sticky;left:0;max-width:520px;margin:7px auto 0;padding:0 12px;max-height:0;overflow:hidden;border:1px solid transparent;border-radius:9px;color:var(--muted);font-size:.67rem;font-weight:700;text-align:center;opacity:0;transition:.18s ease}.uv-tree-notice.show{max-height:60px;padding:8px 12px;border-color:var(--line-2);background:var(--panel-2);opacity:1}
      .uv-tools-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}.uv-tools-grid>.uv-panel{margin:0}.uv-tool-account{grid-column:span 4}.uv-tool-structures{grid-column:span 8}.uv-tool-chaska-s-blessing{grid-column:span 6}.uv-tool-modifiers{grid-column:span 6}.uv-tool-targets{grid-column:1/-1}.uv-tools-grid .uv-panel-title{margin-bottom:10px}.uv-tools-grid .uv-panel-title strong{font-size:.78rem;text-transform:uppercase;letter-spacing:.075em;color:var(--muted)}
      .uv-index-input-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.uv-index-input-row input{width:100%}.uv-index-input-row b{display:grid;place-items:center;min-width:72px;padding:0 10px;border:1px solid color-mix(in srgb,var(--blue) 42%,var(--line));border-radius:9px;background:color-mix(in srgb,var(--blue) 8%,var(--panel-2));color:var(--blue);font-size:.7rem}.uv-index-field{margin-top:0}
      .uv-tool-structures .uv-structure-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.uv-tool-chaska-s-blessing .uv-chaska-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.uv-tool-modifiers .uv-toggle-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.uv-tool-targets{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:18px;align-items:end}.uv-tool-targets .uv-panel-title{grid-column:1/-1;margin-bottom:-2px}.uv-tool-targets .uv-target-label{grid-column:1}.uv-tool-targets .uv-border-buttons{grid-column:1;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:-10px}.uv-tool-targets .uv-target-rarity{grid-column:2;grid-row:2/4;margin:0}
      .uv-results-row{gap:12px}.uv-result-panel,.uv-time-panel{border-radius:16px}
      @media(max-width:950px){.uv-builder-hero{align-items:flex-start;flex-direction:column}.uv-builder-rule{min-width:0}.uv-tool-account,.uv-tool-structures,.uv-tool-chaska-s-blessing,.uv-tool-modifiers{grid-column:1/-1}.uv-tool-targets{display:block}.uv-tool-targets .uv-border-buttons{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px}.uv-tool-targets .uv-target-rarity{margin-top:12px}.uv-tool-structures .uv-structure-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-tool-chaska-s-blessing .uv-chaska-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uv-tool-modifiers .uv-toggle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.uv-builder-hero{padding:17px}.uv-tree-top{align-items:flex-start;flex-direction:column}.uv-tree-points{width:100%;display:grid;grid-template-columns:repeat(3,1fr)}.uv-skill-tree-panel{padding:14px}.uv-skill-tree-grid{min-width:900px}.uv-stat-ribbon{grid-template-columns:repeat(2,1fr)}.uv-tool-structures .uv-structure-grid,.uv-tool-chaska-s-blessing .uv-chaska-grid,.uv-tool-modifiers .uv-toggle-grid{grid-template-columns:1fr}.uv-tools-grid{display:block}.uv-tools-grid>.uv-panel+ .uv-panel{margin-top:10px}}
    `;
    document.head.append(style);
  }

  function syncAfterReset() {
    const root = $('upgradeCalcV2');
    if (!root) return;
    const activeUpgrade = root.style.display !== 'none';
    if (!activeUpgrade) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if ($('uvIndex')) $('uvIndex').value = '0';
    setTimeout(renderTree, 0);
  }

  function init() {
    if (!$('upgradeCalcV2') || $('uvSkillTreeGrid')) return;
    injectStyles();
    rebuildLayout();
    renderTree();

    for (const branch of BRANCHES) {
      $(branch.select)?.addEventListener('input', renderTree);
      $(branch.select)?.addEventListener('change', renderTree);
    }

    $('resetBtn')?.addEventListener('click', () => setTimeout(syncAfterReset, 0));

    document.querySelectorAll('.uv-mode').forEach((button) => {
      button.addEventListener('click', () => {
        const direct = $('directCalcView');
        const upgrades = $('upgradeCalcV2');
        if (button.dataset.view === 'upgrades') {
          if (direct) direct.style.setProperty('display', 'none', 'important');
          if (upgrades) upgrades.style.setProperty('display', 'grid', 'important');
        } else {
          if (direct) direct.style.setProperty('display', 'block', 'important');
          if (upgrades) upgrades.style.setProperty('display', 'none', 'important');
        }
      }, true);
    });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });
})();
