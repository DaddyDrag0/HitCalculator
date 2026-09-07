(() => {
  if (typeof CARD_POOL === 'undefined' || !Array.isArray(CARD_POOL)) return;
  const EVENT_END = 1789174800; // 2026-09-12 01:00 UTC
  const currentEvents = [
    { name: 'Fate Seamstress', rarity: 2000000000, expires: EVENT_END, rollFactor: 0.2 },
    { name: 'Supreme Ozzy', rarity: 411000000, expires: EVENT_END, rollFactor: 0.2 },
    { name: 'The Broken One', rarity: 400000000, expires: EVENT_END, rollFactor: 0.2 },
    { name: 'Hera', rarity: 38450000, expires: EVENT_END, rollFactor: 0.2 },
  ];
  const byName = new Map(CARD_POOL.map((card) => [card.name, card]));
  for (const source of currentEvents) {
    const current = byName.get(source.name);
    if (current) Object.assign(current, source);
    else { const card = { ...source }; CARD_POOL.push(card); byName.set(card.name, card); }
  }
  CARD_POOL.sort((a, b) => b.rarity - a.rarity || String(a.name).localeCompare(String(b.name)));
})();
