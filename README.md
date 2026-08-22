# HitCalculator

Stat optimizer for Card RNG: Expansion.

Inputs:
- Roll Speed %
- Speed Structure level
- Time Storm state
- Platinum Luck
- Crystal Luck
- Ruby Luck
- Galaxy Luck
- One or more target borders

The optimizer shows the current average rolls/time for the selected stacked border target, then compares user-entered stat increases and ranks which upgrade gives the best result.

Expansion roll-speed formula used by the site:
- Base cooldown = 1 second
- `Cooldown = 1 / (RollSpeed / 100)`
- Speed Structure reduces cooldown separately by its structure boost
- Time Storm halves cooldown again
- No 0.3 second minimum is applied

Base border denominators:
- Platinum: 100
- Crystal: 10,000
- Ruby: 100,000
- Galaxy: 1,000,000

The border luck inputs are intended to be the final values shown on the in-game profile.