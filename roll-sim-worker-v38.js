importScripts('./roll-sim-worker-v30.js?rev=20260918-mutation-3');

// Exact-worker performance guard.
// Match the game's tiered Chaska diminishing returns using a bounded set of breakpoints.
chaska = function chaskaV38(points, rate) {
  const p = Math.max(0, Math.floor(Number(points) || 0));
  const r = Math.max(0, Number(rate) || 0);
  if (!p || !r) return 0;

  // Extracted game RNG.GetChaskaBonus: 50-point blocks up to 500,
  // 100 to 1,000, 250 to 2,000, 500 to 3,000, then 1,000 to 4,000.
  // Beyond 4,000 the last diminished rate remains constant.
  const endpoints = [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500,
    600, 700, 800, 900, 1000,
    1250, 1500, 1750, 2000,
    2500, 3000, 4000,
  ];
  let total = 0;
  let start = 0;
  let multiplier = 1;
  for (const end of endpoints) {
    if (p <= start) break;
    total += (Math.min(p, end) - start) * r * multiplier;
    if (p <= end) return total;
    start = end;
    multiplier *= 0.85;
  }
  return total + Math.max(0, p - start) * r * multiplier;
};
