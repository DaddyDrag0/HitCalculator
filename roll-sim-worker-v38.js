importScripts('./roll-sim-worker-v30.js?rev=20260826-1648');

// Exact-worker performance guard.
// Chaska's diminishing returns are a geometric series. The old worker walked
// one 50-point block at a time, which becomes unnecessarily expensive on large
// (but valid) Total Rolls / Chaska builds.
chaska = function chaskaV38(points, rate) {
  const p = Math.max(0, Math.floor(Number(points) || 0));
  const r = Math.max(0, Number(rate) || 0);
  if (!p || !r) return 0;

  const fullBlocks = Math.floor(p / 50);
  const remainder = p - fullBlocks * 50;
  const decay = 0.85;
  const full = fullBlocks > 0
    ? 50 * r * (1 - Math.pow(decay, fullBlocks)) / (1 - decay)
    : 0;
  return full + remainder * r * Math.pow(decay, fullBlocks);
};
