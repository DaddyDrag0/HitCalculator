importScripts('./roll-sim-worker-v16.js?rev=20260824-2004');

// Pack ownership is simulator-specific. The v16 engine already owns the exact
// card/weather/border math, so only gate cards that belong to a pack here.
const __rollSimBaseAdjustedCardRarity = adjustedCardRarity;
adjustedCardRarity = function(card, build, weather, weatherStructures) {
  if (card?.pack && Array.isArray(build?.enabledPacks) && !build.enabledPacks.includes(card.pack)) return null;
  return __rollSimBaseAdjustedCardRarity(card, build, weather, weatherStructures);
};
