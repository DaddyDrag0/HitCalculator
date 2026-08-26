(() => {
  const data = globalThis.ROLL_SIM_DATA_V16;
  if (!data?.cards || !Array.isArray(data.cards)) return;

  const expired = new Set(['Fate Seamstress', 'Eonus', 'Eclipseborn Luminant']);
  for (let i = data.cards.length - 1; i >= 0; i -= 1) {
    if (expired.has(data.cards[i]?.name)) data.cards.splice(i, 1);
  }

  if (Array.isArray(data.currentEvents)) data.currentEvents.splice(0, data.currentEvents.length);
})();
