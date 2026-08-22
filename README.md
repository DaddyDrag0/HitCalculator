# HitCalculator

Stat optimizer for Card RNG: Expansion.

Inputs:
- Displayed Roll Speed %
- Speed Structure level
- Time Storm state
- Platinum Luck
- Crystal Luck
- Ruby Luck
- Galaxy Luck
- One or more target borders

The Roll Speed input should be the final value shown by the in-game profile. Potion, charm, skill-tree, relic, and similar Roll Speed modifiers are already included in that displayed value and should not be entered separately.

The Speed Structure is separate from displayed Roll Speed and acts as a rolling-rate multiplier:
- Level 0: ×1.000
- Level 1: ×1.0714
- Level 2: ×1.1429
- Level 3: ×1.2143
- Level 4: ×1.2857
- Level 5: ×1.3571
- Level 6: ×1.4286
- Level 7: ×1.5000

Roll-rate model:
- `cards/sec = (RollSpeed / 100) × SpeedStructureMultiplier`
- Time Storm adds another ×2 multiplier
- `roll interval = 1 / cardsPerSecond`
- No 0.3 second minimum is applied

Example: 2190% Roll Speed with a level 7 Speed Structure gives `21.9 × 1.5 = 32.85` cards per second.

The optimizer shows the current average rolls/time for the selected stacked border target, then compares user-entered stat increases and ranks which upgrade gives the best result.

Base border denominators:
- Platinum: 100
- Crystal: 10,000
- Ruby: 100,000
- Galaxy: 1,000,000

The border luck inputs are also intended to be the final values shown on the in-game profile.