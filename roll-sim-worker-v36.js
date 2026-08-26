importScripts('./roll-sim-worker-v35.js?rev=20260826-1715');

// Quick-mode stability patch.
// The v35 rare-tail inverse CDF could, in a floating-point edge case, walk for
// an enormous number of iterations. Keep the same quick-mode model but make
// every sampling path strictly bounded.

normalSampleV35 = function normalSampleV36(random) {
  const u = Math.max(Number.MIN_VALUE, random.unit53());
  const v = random.unit53();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function poissonBoundedV36(lambda, random) {
  lambda = Math.max(0, Number(lambda) || 0);
  if (!lambda) return 0;

  // Knuth is fast and very accurate for the only range we use here (< 35).
  // Hard cap prevents any possible numerical runaway.
  const limit = Math.exp(-lambda);
  let product = 1;
  for (let k = 0; k < 192; k += 1) {
    product *= Math.max(Number.MIN_VALUE, random.unit53());
    if (product <= limit) return k;
  }

  // Practically unreachable fallback, but still bounded.
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normalSampleV35(random)));
}

binomialSmallTailV35 = function binomialSmallTailV36(n, p, random) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  p = Math.max(0, Math.min(1, Number(p) || 0));
  if (!n || !p) return 0;
  if (p >= 1) return n;

  // For moderate n, do the exact Bernoulli experiment. This remains cheap and
  // avoids approximation error when p is not extremely small.
  if (n <= 4096) {
    let hits = 0;
    for (let i = 0; i < n; i += 1) if (random.unit53() < p) hits += 1;
    return hits;
  }

  const mean = n * p;

  // v35 only routes here when mean < 35. With large n that necessarily means
  // tiny p, where Poisson is an excellent binomial approximation and much
  // safer/faster than an unbounded inverse-CDF walk.
  if (mean < 35 && p <= 0.02) {
    return Math.min(n, poissonBoundedV36(mean, random));
  }

  // Defensive bounded normal fallback for any unexpected input shape.
  const variance = mean * (1 - p);
  const draw = mean + Math.sqrt(Math.max(0, variance)) * normalSampleV35(random);
  return Math.max(0, Math.min(n, Math.round(draw)));
};
