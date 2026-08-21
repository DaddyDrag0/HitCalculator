# HitCalculator

Hit probability calculator for Card RNG: Expansion.

The site is a static client-side app using the current Expansion card data for card names, rarities, weather/pack/boss flags, and source eligibility.

Calculator inputs:
- Total Luck multiplier
- Roll Speed %
- Target card or manual rarity
- Required stacked normal-card borders: Platinum, Crystal, Ruby, Galaxy
- 50% Border Gamepass
- Required weather active/inactive when applicable
- AFK duration

Normal card border reference used by the calculator:
- Platinum: 1 / 100 base border odds, ×100 rarity multiplier
- Crystal: 1 / 10,000, ×10,000
- Ruby: 1 / 100,000, ×100,000
- Galaxy: 1 / 1,000,000, ×1,000,000

Aura Cards are a separate system. Their supported borders are Platinum, Crystal, and Galaxy; Aura Card borders do not stack.

Current temporary roll-speed model:
- 100% Roll Speed = 1.5 seconds per roll
- Roll interval = `1.5 / (Roll Speed / 100)`
- Minimum roll interval = 0.3 seconds

The normal card selector is currently modeled as `Luck / rarity`, capped at 100%, until the exact live Expansion rolling resolver is recovered. That model is isolated in `app.js` so it can be replaced without changing the probability and time calculations.