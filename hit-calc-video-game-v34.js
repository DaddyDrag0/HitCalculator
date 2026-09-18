(() => {
  if (typeof CARD_POOL === 'undefined' || !Array.isArray(CARD_POOL)) return;

  const retiredEvents = new Set(["Fate Seamstress","Eonus","Eclipseborn Luminant","Supreme Ozzy","The Broken One","Hera"]);
  for (let index = CARD_POOL.length - 1; index >= 0; index -= 1) {
    if (retiredEvents.has(CARD_POOL[index]?.name)) CARD_POOL.splice(index, 1);
  }

  CARD_POOL.sort((a, b) => b.rarity - a.rarity || String(a.name).localeCompare(String(b.name)));
})();
