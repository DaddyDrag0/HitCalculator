(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired } = tools;

    source = replaceRequired(
      source,
      "    const slots=Math.max(1,Math.min(2,Math.floor(Number($('optRelicSlots')?.value)||1)));",
      "    const slots=Math.max(1,Math.min(3,Math.floor(Number($('optRelicSlots')?.value)||1)));",
      '3 relic slot limit'
    );

    source = replaceRequired(
      source,
      "    if (slots>=2) for (let i=0;i<available.length;i+=1) for (let j=i+1;j<available.length;j+=1) combos.push([available[i],available[j]]);\n    return combos;",
      "    if (slots>=2) for (let i=0;i<available.length;i+=1) for (let j=i+1;j<available.length;j+=1) combos.push([available[i],available[j]]);\n    if (slots>=3) for (let i=0;i<available.length;i+=1) for (let j=i+1;j<available.length;j+=1) for (let k=j+1;k<available.length;k+=1) combos.push([available[i],available[j],available[k]]);\n    return combos;",
      '3 relic combinations'
    );

    source = replaceRequired(
      source,
      '<select id="optRelicSlots"><option value="1">1 Relic</option><option value="2" selected>2 Relics</option></select>',
      '<select id="optRelicSlots"><option value="1">1 Relic</option><option value="2" selected>2 Relics</option><option value="3">3 Relics</option></select>',
      '3 relic UI option'
    );

    return source;
  });
})();
