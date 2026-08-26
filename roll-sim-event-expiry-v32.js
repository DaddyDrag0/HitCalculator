(() => {
  const data = globalThis.ROLL_SIM_DATA_V16;
  if (!data?.cards || !Array.isArray(data.cards)) return;

  const expired = new Set(['Fate Seamstress', 'Eonus', 'Eclipseborn Luminant']);
  for (const card of data.cards) {
    if (!expired.has(card?.name)) continue;
    if (!Number.isFinite(card.expiredBaseRarity)) card.expiredBaseRarity = Number(card.rarity) || 0;
    card.currentEvent = false;
    card.rollable = false;
    card.expiredEvent = true;
    card.rarity = Number.POSITIVE_INFINITY;
  }

  if (Array.isArray(data.currentEvents)) data.currentEvents.splice(0, data.currentEvents.length);
})();
