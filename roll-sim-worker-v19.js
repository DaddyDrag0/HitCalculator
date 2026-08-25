importScripts('./roll-sim-worker-v16.js?rev=20260824-2004');

// Rapture cards are not affected by the Chaos weather structure.
(() => {
  const chaosWeathers = globalThis.ROLL_SIM_DATA_V16?.chaosWeathers;
  if (!Array.isArray(chaosWeathers)) return;
  const index = chaosWeathers.indexOf('Rapture');
  if (index >= 0) chaosWeathers.splice(index, 1);
})();

// Keep the worker's Era 2 pool identical to the corrected main-thread pool.
(() => {
  const cards = globalThis.ROLL_SIM_DATA_V16?.cards;
  if (!Array.isArray(cards)) return;
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
  const byName = new Map(cards.map((card) => [card.name, card]));
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
      cards.push(card);
      byName.set(card.name, card);
    }
  }
  cards.sort((a, b) => (Number(b.rarity) || 0) - (Number(a.rarity) || 0) || String(a.name).localeCompare(String(b.name)));
})();

// Pack ownership and weather availability are separate requirements.
// A weather-gated pack card needs BOTH its pack and the matching weather.
// Rapture 24/7 is the only exception: it satisfies the Rapture-weather requirement.
const __rollSimBaseAdjustedCardRarity = adjustedCardRarity;
adjustedCardRarity = function(card, build, weather, weatherStructures) {
  if (card?.pack && Array.isArray(build?.enabledPacks) && !build.enabledPacks.includes(card.pack)) return null;

  const raptureUnlocked = card?.weather === 'Rapture' && !!build?.rapture24;
  if (card?.weather && !raptureUnlocked && card.weather !== weather) return null;

  if (raptureUnlocked) return __rollSimBaseAdjustedCardRarity(card, build, 'Rapture', weatherStructures);
  return __rollSimBaseAdjustedCardRarity(card, build, weather, weatherStructures);
};
