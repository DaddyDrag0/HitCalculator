importScripts('./roll-sim-worker-v30.js?rev=20260918-mutation-3');

// Exact-worker performance guard.
// Chaska's diminishing returns are a geometric series. The old worker walked
// one 50-point block at a time, which becomes unnecessarily expensive on large
// (but valid) Total Rolls / Chaska builds.
chaska = function chaskaV38(points, rate) {
  const p = Math.max(0, Math.floor(Number(points) || 0));
  const r = Math.max(0, Number(rate) || 0);
  if (!p || !r) return 0;

  // Expansion GetChaskaBonus: 50-point blocks through 500, 100 to 1000,
  // 250 to 2000, 500 to 3000, 1000 to 4000, then an undiminished tail
  // at the final diminished rate. Only 22 finite blocks are needed.
  const steps = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500,
    600, 700, 800, 900, 1000, 1250, 1500, 1750, 2000,
    2500, 3000, 4000];
  let used = 0, total = 0, multiplier = 1;
  for (const boundary of steps) {
    if (used >= p) break;
    const amount = Math.min(p, boundary) - used;
    total += amount * r * multiplier;
    used += amount;
    if (used >= p) return total;
    multiplier *= 0.85;
  }
  return total + (p - used) * r * multiplier;
};
