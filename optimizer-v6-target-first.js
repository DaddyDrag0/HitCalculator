(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired } = tools;

    source = replaceRequired(
      source,
      '<select id="optGoal"><option value="borders">Border Combination</option><option value="targetRarity">Target Card Rarity</option></select>',
      '<select id="optGoal"><option value="targetRarity">Target Card Rarity</option><option value="borders">Border Combination</option></select>',
      'target rarity first'
    );

    source = replaceRequired(
      source,
      '<div id="optBorderOptions" class="opt-subgrid">',
      '<div id="optBorderOptions" class="opt-subgrid" hidden>',
      'hide border options by default'
    );

    source = replaceRequired(
      source,
      '<label class="opt-field" id="optRarityWrap" hidden>',
      '<label class="opt-field" id="optRarityWrap">',
      'show rarity target by default'
    );

    return source;
  });
})();
