(() => {
  const patches = window.__OPT_V4_PATCHES = window.__OPT_V4_PATCHES || [];
  patches.push((source, tools) => {
    const { replaceRequired } = tools;

    source = replaceRequired(
      source,
      `<div><b>Chaska</b><div>\${lockGrid('chaska',CHASKA)}</div></div>`,
      '',
      'remove Chaska optimizer locks'
    );

    return source;
  });
})();
