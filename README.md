# HitCalculator

Hit probability calculator for Card RNG: Expansion.

The site is a static client-side app. It uses the current Expansion card data for card names, rarities, weather/pack/boss flags, and availability warnings.

Current calculator inputs:
- Luck multiplier
- Roll Speed %
- Double Roll %
- Target card or manual rarity
- AFK duration

Current roll-speed model:
- 100% Roll Speed = 1.5 seconds per roll cycle
- Roll interval scales as `1.5 / (Roll Speed / 100)`
- Minimum roll interval = 0.3 seconds

The roll/chance model is isolated in `app.js` so the exact game formula can be swapped in later without changing the rest of the probability/time calculations.
