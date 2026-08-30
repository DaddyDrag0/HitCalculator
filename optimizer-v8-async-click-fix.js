(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired } = tools;
    return replaceRequired(
      source,
      "    $('optRun')?.addEventListener('click',()=>{ const b=$('optRun'); b.disabled=true; b.textContent='Optimizing…'; setTimeout(()=>{ try{runOptimizer();}finally{b.disabled=false;b.textContent='Optimize Build';}},20); });",
      "    $('optRun')?.addEventListener('click',()=>{ runOptimizer(); });",
      'async optimizer click handler'
    );
  });
})();
