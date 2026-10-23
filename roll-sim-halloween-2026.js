// Sourced from the supplied Halloween 2026 game place (Cards + RNG + Util).
// Halloween3 is a Collection, not a gated Pack. Seven event cards expire
// on 2026-11-02 23:00 UTC; the five Pumpkin Moon cards have no expiry.
(() => {
  const DATA = globalThis.ROLL_SIM_DATA_V16;
  if (!DATA?.cards || !Array.isArray(DATA.cards)) return;
  const end = Date.UTC(2026, 10, 2, 23, 0, 0);
  const halloween = [
  {
    "name": "Trick or Treater",
    "rarity": 16000,
    "collection": "Halloween3",
    "imageAssetId": 117535728905446
  },
  {
    "name": "Neighbor",
    "rarity": 50000,
    "collection": "Halloween3",
    "imageAssetId": 76352914886988
  },
  {
    "name": "Tarantula",
    "rarity": 200000,
    "collection": "Halloween3",
    "imageAssetId": 109572791958285
  },
  {
    "name": "Ghost",
    "rarity": 1000000,
    "collection": "Halloween3",
    "imageAssetId": 106914836212870
  },
  {
    "name": "Crow",
    "rarity": 10000000,
    "collection": "Halloween3",
    "imageAssetId": 89152352554935
  },
  {
    "name": "Grey Pumpkin",
    "rarity": 25000000,
    "weather": "Shroud",
    "collection": "Halloween3",
    "imageAssetId": 116656731674403
  },
  {
    "name": "The Faceless",
    "rarity": 2000000000,
    "collection": "Halloween3",
    "imageAssetId": 114859917647091
  },
  {
    "name": "Pumpkin King",
    "rarity": 15000000,
    "weather": "Pumpkin Moon",
    "collection": "Halloween3",
    "imageAssetId": 95549525483018
  },
  {
    "name": "Freddy Krueger",
    "rarity": 5000000,
    "weather": "Pumpkin Moon",
    "collection": "Halloween3",
    "imageAssetId": 87513371068709
  },
  {
    "name": "Living Gargoyle",
    "rarity": 750000,
    "weather": "Pumpkin Moon",
    "collection": "Halloween3",
    "imageAssetId": 79454382824980
  },
  {
    "name": "Eerie Tree",
    "rarity": 125000,
    "weather": "Pumpkin Moon",
    "collection": "Halloween3",
    "imageAssetId": 91211486817949
  },
  {
    "name": "Living Armor",
    "rarity": 400000,
    "weather": "Pumpkin Moon",
    "collection": "Halloween3",
    "imageAssetId": 121631105765545
  }
];
  const byName = new Set(DATA.cards.map(c => c.name));
  for (let i = 0; i < halloween.length; i++) {
    const card = halloween[i];
    if (i < 7 && Date.now() >= end) continue;
    if (byName.has(card.name)) continue;
    DATA.cards.push({ ...card });
    byName.add(card.name);
  }
  if (!DATA.weathers.includes('Pumpkin Moon')) DATA.weathers.push('Pumpkin Moon');
  DATA.weatherMults['Pumpkin Moon'] = 5.5;
  DATA.cards.sort((a,b) => (Number(b.rarity)||0) - (Number(a.rarity)||0) || String(a.name).localeCompare(String(b.name)));
})();
