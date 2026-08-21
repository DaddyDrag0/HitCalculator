# HitCalculator

Border roll/time calculator for Card RNG: Expansion.

Inputs:
- Platinum Luck
- Crystal Luck
- Ruby Luck
- Galaxy Luck
- Roll Speed %
- One or more target borders

Target borders can be selected together. When multiple borders are selected, the calculator estimates the average rolls and average time needed to hit that exact stacked border combination.

Base border denominators used internally:
- Platinum: 100
- Crystal: 10,000
- Ruby: 100,000
- Galaxy: 1,000,000

Current temporary Roll Speed model:
- 100% Roll Speed = 1.5 seconds per roll
- Roll interval = `1.5 / (Roll Speed / 100)`
- Minimum roll interval = 0.3 seconds

The page intentionally displays rolls and time only.