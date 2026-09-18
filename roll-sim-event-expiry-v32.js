(() => {
  const data = globalThis.ROLL_SIM_DATA_V16;
  if (!data?.cards || !Array.isArray(data.cards)) return;

  const retiredEvents = new Set(["Fate Seamstress","Eonus","Eclipseborn Luminant","Supreme Ozzy","The Broken One","Hera"]);
  for (let index = data.cards.length - 1; index >= 0; index -= 1) {
    if (retiredEvents.has(data.cards[index]?.name)) data.cards.splice(index, 1);
  }

  if (Array.isArray(data.currentEvents)) data.currentEvents.splice(0, data.currentEvents.length);
})();
