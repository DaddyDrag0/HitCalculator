(() => {
  const sourceUrl = './optimizer-builds-v1.js?rev=20260829-1200';

  function fail(message) {
    console.error('[Optimizer v2 loader]', message);
    const show = () => {
      const switcher = document.querySelector('.uv-mode-switch');
      if (!switcher || switcher.querySelector('[data-view="optimizer-load-error"]')) return;
      const note = document.createElement('span');
      note.dataset.view = 'optimizer-load-error';
      note.style.cssText = 'align-self:center;color:#ff9299;font-size:.62rem;font-weight:800';
      note.textContent = 'Optimizer failed to load. Refresh the test page.';
      switcher.append(note);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once:true });
    else show();
  }

  function replaceRequired(source, search, replacement, label) {
    if (!source.includes(search)) throw new Error(`Patch target missing: ${label}`);
    return source.replace(search, replacement);
  }

  async function load() {
    try {
      const response = await fetch(sourceUrl, { cache:'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let source = await response.text();

      source = replaceRequired(
        source,
        "  const DUNGEON = {",
        "  const CHASKA_MAX = 50;\n  const DUNGEON = {",
        'Chaska max constant'
      );

      source = replaceRequired(
        source,
        "      chaska: Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.floor(valueOf(data,cfg.id,0)))])),",
        "      chaska: Object.fromEntries(Object.entries(CHASKA).map(([key,cfg])=>[key,Math.max(0,Math.min(CHASKA_MAX,Math.floor(valueOf(data,cfg.id,0))))])),",
        'starting Chaska allocation clamp'
      );

      source = replaceRequired(
        source,
        "          const current=candidate.chaska[key]||0;\n          const toBoundary=50-(current%50||0);\n          const chunk=Math.min(remaining,current%50===0?Math.min(50,remaining):Math.min(toBoundary,remaining));\n          if (chunk<=0) continue;\n          const test=deepClone(candidate); test.chaska[key]=current+chunk;",
        "          const current=Math.min(CHASKA_MAX,candidate.chaska[key]||0);\n          if (current>=CHASKA_MAX) continue;\n          const chunk=Math.min(remaining,CHASKA_MAX-current);\n          if (chunk<=0) continue;\n          const test=deepClone(candidate); test.chaska[key]=current+chunk;",
        'bounded Chaska optimizer step'
      );

      source = replaceRequired(
        source,
        "    const maxSkill=Math.floor(context.index/50), maxChaska=Math.floor(context.rolls/50000), maxDungeon=context.dungeonTokens;",
        "    const maxSkill=Math.floor(context.index/50), maxChaska=Math.min(Object.keys(CHASKA).length*CHASKA_MAX,Math.floor(context.rolls/50000)), maxDungeon=context.dungeonTokens;",
        'optimizer Chaska budget cap'
      );

      source = replaceRequired(
        source,
        "    const max={skill:Math.floor(context.index/50),chaska:Math.floor(context.rolls/50000),dungeon:context.dungeonTokens};",
        "    const max={skill:Math.floor(context.index/50),chaska:Math.min(Object.keys(CHASKA).length*CHASKA_MAX,Math.floor(context.rolls/50000)),dungeon:context.dungeonTokens};",
        'Chaska budget display cap'
      );

      source = source.replace(
        'Optimizes Skill Tree, Chaska, and Dungeon. Your structures, charm, potions, and modifiers stay fixed.',
        'Optimizes Skill Tree, Chaska, and Dungeon. Chaska is capped at 50 points per stat. Your structures, charm, potions, and modifiers stay fixed.'
      );

      source = source.replace(
        'Uses the site\'s real stat, speed, dungeon-cost, Chaska diminishing-return, and multi-border math.',
        'Uses the site\'s real stat, speed, dungeon-cost, Chaska 50-point cap, and multi-border math.'
      );

      // Execute the patched test implementation in the page context.
      (0, eval)(`${source}\n//# sourceURL=optimizer-builds-v2-runtime.js`);
    } catch (error) {
      fail(error?.message || String(error));
    }
  }

  load();
})();
