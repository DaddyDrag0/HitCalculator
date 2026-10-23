(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!DATA?.cards || !Array.isArray(DATA.cards)) return;

  const retiredEvents = new Set(["Fate Seamstress","Eonus","Eclipseborn Luminant","Supreme Ozzy","The Broken One","Hera"]);
  for (let index = DATA.cards.length - 1; index >= 0; index -= 1) {
    if (retiredEvents.has(DATA.cards[index]?.name)) DATA.cards.splice(index, 1);
  }
  if (Array.isArray(DATA.currentEvents)) DATA.currentEvents.splice(0, DATA.currentEvents.length);

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
  for (const source of videoGame) {
    const current = byName.get(source.name);
    if (current) Object.assign(current, source);
    else {
      const card = { ...source };
      DATA.cards.push(card);
      byName.set(card.name, card);
    }
  }


  // Halloween 2026, read from the uploaded game's Cards module.
  // Four Horsemen end Nov 1, while the Halloween3 limited cards end Nov 2.
  // The five Pumpkin Moon cards are weather-only and do not have an expiry.
  const halloween = [
    { name:'Trick or Treater', rarity:16000, collection:'Halloween3', expiresAt:1793660400 },
    { name:'Neighbor', rarity:50000, collection:'Halloween3', expiresAt:1793660400 },
    { name:'Tarantula', rarity:200000, collection:'Halloween3', expiresAt:1793660400 },
    { name:'Ghost', rarity:1000000, collection:'Halloween3', expiresAt:1793660400 },
    { name:'Crow', rarity:10000000, collection:'Halloween3', expiresAt:1793660400 },
    { name:'Grey Pumpkin', rarity:25000000, weather:'Shroud', collection:'Halloween3', expiresAt:1793660400 },
    { name:'The Faceless', rarity:2000000000, collection:'Halloween3', expiresAt:1793660400 },
    { name:'Pumpkin King', rarity:15000000, weather:'Pumpkin Moon', collection:'Halloween3' },
    { name:'Freddy Krueger', rarity:5000000, weather:'Pumpkin Moon', collection:'Halloween3' },
    { name:'Living Gargoyle', rarity:750000, weather:'Pumpkin Moon', collection:'Halloween3' },
    { name:'Eerie Tree', rarity:125000, weather:'Pumpkin Moon', collection:'Halloween3' },
    { name:'Living Armor', rarity:400000, weather:'Pumpkin Moon', collection:'Halloween3' },
    { name:'Pestilence', rarity:1000000000, expiresAt:1793494800 },
    { name:'Famine', rarity:2000000000, expiresAt:1793494800 },
    { name:'War', rarity:3000000000, expiresAt:1793494800 },
    { name:'Death', rarity:4000000000, expiresAt:1793494800 },
  ];
  const nowSeconds = Date.now() / 1000;
  for (const source of halloween) {
    const card = DATA.cards.find((item) => item.name === source.name);
    const update = { ...source };
    if (source.expiresAt) {
      update.currentEvent = nowSeconds < source.expiresAt && source.collection !== 'Halloween3';
      if (update.currentEvent) update.eventFactor = 0.5;
      update.expiredEvent = nowSeconds >= source.expiresAt;
    }
    if (card) Object.assign(card, update);
    else DATA.cards.push(update);
  }
  if (!DATA.weathers.includes('Pumpkin Moon')) DATA.weathers.push('Pumpkin Moon');
  DATA.weatherMults['Pumpkin Moon'] = 2;

  for (const card of DATA.cards) if (card.pack === 'Video Game') card.rollRequirement = 25000000;
  DATA.cards.sort((a, b) => (Number(b.rarity) || 0) - (Number(a.rarity) || 0) || String(a.name).localeCompare(String(b.name)));
})();
