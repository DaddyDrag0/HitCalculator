# HitCalculator

Border hit calculator for Card RNG: Expansion.

Inputs:
- Target border: Platinum, Crystal, Ruby, or Galaxy
- Separate Luck value for each border
- Roll Speed %
- Optional 50% Border Gamepass

Base border odds:
- Platinum: 1 / 100
- Crystal: 1 / 10,000
- Ruby: 1 / 100,000
- Galaxy: 1 / 1,000,000

The calculator shows:
- Effective border odds
- Average rolls to hit the selected border
- Average time to hit it
- 50%, 75%, 90%, 95%, and 99% chance milestones in both rolls and time

Border chance is modeled as `border luck / base border denominator`, capped at 100%. The optional 50% Border Gamepass applies a 1.5x multiplier.

Current temporary Roll Speed model:
- 100% = 1.5 seconds per roll
- Interval = `1.5 / (Roll Speed / 100)`
- Minimum interval = 0.3 seconds
