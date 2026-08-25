(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!DATA?.cards || window.__rollSimEra2FixV22) return;
  window.__rollSimEra2FixV22 = true;

  const ERA2 = [
    { name:'Assassin King', rarity:15000000, pack:'Era2' },
    { name:'Bacon Hair', rarity:6000, pack:'Era2', boss:true },
    { name:'Cherub', rarity:20000, pack:'Era2' },
    { name:'Count Muscula', rarity:2000000, pack:'Era2' },
    { name:'Engineer', rarity:35000, pack:'Era2' },
    { name:'Hard Claws', rarity:1000000000, pack:'Era2' },
    { name:'Hunter', rarity:2000, pack:'Era2' },
    { name:'Infected Maw', rarity:666000, pack:'Era2' },
    { name:'Juggernoid', rarity:10000000, pack:'Era2' },
    { name:'Julius Leader', rarity:100000, pack:'Era2' },
    { name:'Malakim', rarity:666666000, pack:'Era2' },
    { name:'Noveau Riche', rarity:200000, pack:'Era2' },
    { name:'Poison Witch', rarity:2500000, pack:'Era2' },
    { name:'Resolute Blade', rarity:4000, pack:'Era2' },
    { name:'Robin Hood', rarity:500000, pack:'Era2' },
    { name:'Seraphim', rarity:1000000, pack:'Era2' },
    { name:'Skeleton King', rarity:3333000, pack:'Era2' },
    { name:'Slum Dweller', rarity:500000000, pack:'Era2' },
    { name:'Soft Paw', rarity:8000, pack:'Era2' },
    { name:"Terra's Aria", rarity:1000000, pack:'Era2', weather:'Rapture' },
    { name:'True Prophet', rarity:12000, pack:'Era2' },
    { name:'Volcano Spirit', rarity:75000, pack:'Era2' },
    { name:'Zombie Dragon', rarity:11000000, pack:'Era2' },
  ];

  const byName = new Map(DATA.cards.map((card) => [card.name, card]));
  for (const source of ERA2) {
    const current = byName.get(source.name);
    if (current) {
      current.rarity = source.rarity;
      current.pack = 'Era2';
      if ('weather' in source) current.weather = source.weather;
      else if (current.weather == null) current.weather = null;
      if ('boss' in source) current.boss = source.boss;
    } else {
      const card = { ...source };
      DATA.cards.push(card);
      byName.set(card.name, card);
    }
  }

  DATA.cards.sort((a, b) => (Number(b.rarity) || 0) - (Number(a.rarity) || 0) || String(a.name).localeCompare(String(b.name)));
  window.__rollSimEra2CountV22 = DATA.cards.filter((card) => card.pack === 'Era2').length;
})();
