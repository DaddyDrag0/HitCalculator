(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!DATA?.cards || !Array.isArray(DATA.cards)) return;
  const currentEvents = [
    { name: 'Fate Seamstress', rarity: 2000000000, currentEvent: true, eventFactor: 0.2 },
    { name: 'Supreme Ozzy', rarity: 411000000, currentEvent: true, eventFactor: 0.2 },
    { name: 'The Broken One', rarity: 400000000, currentEvent: true, eventFactor: 0.2 },
    { name: 'Hera', rarity: 38450000, currentEvent: true, eventFactor: 0.2 },
  ];
  const videoGame = [
    { name: 'Durante', rarity: 777777777, pack: 'Video Game' },
    { name: 'Heavenly Father', rarity: 100000000, pack: 'Video Game', weather: 'Rapture' },
    { name: 'Ice King', rarity: 55000000, pack: 'Video Game', weather: 'Snow' },
    { name: 'NO.2', rarity: 10000000, pack: 'Video Game' },
    { name: 'Necro-orc', rarity: 9000000, pack: 'Video Game', weather: 'Virus' },
    { name: 'Melanin', rarity: 6000000, pack: 'Video Game', weather: 'Armageddon' },
    { name: 'God-Slayer', rarity: 5000000, pack: 'Video Game', weather: 'Armageddon' },
    { name: 'Creed', rarity: 4500000, pack: 'Video Game' },
    { name: 'The Sack', rarity: 2500000, pack: 'Video Game' },
    { name: 'Hell killer', rarity: 1500000, pack: 'Video Game', weather: 'Blood Rain' },
    { name: 'Hollow', rarity: 500000, pack: 'Video Game', weather: 'Shroud' },
    { name: 'Steven', rarity: 80000, pack: 'Video Game' },
  ];
  const byName = new Map(DATA.cards.map((card) => [card.name, card]));
  for (const source of [...currentEvents, ...videoGame]) {
    const current = byName.get(source.name);
    if (current) Object.assign(current, source);
    else { const card = { ...source }; DATA.cards.push(card); byName.set(card.name, card); }
    const card = byName.get(source.name);
    if (source.currentEvent) {
      card.rollable = true;
      card.expiredEvent = false;
      if ('expiredBaseRarity' in card) delete card.expiredBaseRarity;
    }
  }
  for (const card of DATA.cards) if (card.pack === 'Video Game') card.rollRequirement = 25000000;
  if (Array.isArray(DATA.currentEvents)) DATA.currentEvents.splice(0, DATA.currentEvents.length, ...currentEvents.map((card) => card.name));
  DATA.cards.sort((a, b) => (Number(b.rarity) || 0) - (Number(a.rarity) || 0) || String(a.name).localeCompare(String(b.name)));
})();
