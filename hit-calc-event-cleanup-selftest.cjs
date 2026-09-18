const fs = require('fs')
const vm = require('vm')
const assert = require('assert')

const retired = new Set([
  'Fate Seamstress',
  'Eonus',
  'Eclipseborn Luminant',
  'Supreme Ozzy',
  'The Broken One',
  'Hera',
])

const app = fs.readFileSync('app-base.js', 'utf8')
const match = app.match(/const CARD_POOL = (\[[^\n]+\]);/)
assert(match, 'CARD_POOL missing')
const basePool = JSON.parse(match[1])
for (const card of basePool) assert(!retired.has(card.name), `retired event still in CARD_POOL: ${card.name}`)

const rollContext = vm.createContext({})
vm.runInContext(fs.readFileSync('roll-sim-data-v16.js', 'utf8'), rollContext)
vm.runInContext(fs.readFileSync('roll-sim-event-expiry-v32.js', 'utf8'), rollContext)
vm.runInContext(fs.readFileSync('roll-sim-video-game-v34.js', 'utf8'), rollContext)
const rollData = rollContext.ROLL_SIM_DATA_V16
assert(rollData)
assert.deepEqual(Array.from(rollData.currentEvents || []), [])
for (const card of rollData.cards) assert(!retired.has(card.name), `retired event still in roll simulator: ${card.name}`)
for (const name of ['Durante','Heavenly Father','Ice King','NO.2','Necro-orc','Melanin','God-Slayer','Creed','The Sack','Hell killer','Hollow','Steven']) {
  assert(rollData.cards.some((card) => card.name === name), `Video Game card disappeared: ${name}`)
}

const directContext = vm.createContext({
  CARD_POOL: [
    { name: 'Archer', rarity: 2 },
    ...Array.from(retired, (name, i) => ({ name, rarity: 1000 + i })),
  ],
})
vm.runInContext(fs.readFileSync('hit-calc-video-game-v34.js', 'utf8'), directContext)
assert.deepEqual(Array.from(directContext.CARD_POOL, (card) => card.name), ['Archer'])

const loader = fs.readFileSync('app.js', 'utf8')
const index = fs.readFileSync('index.html', 'utf8')
assert(loader.includes('app-base.js?rev=20260918-no-events-1'))
assert(loader.includes('hit-calc-video-game-v34.js?rev=20260918-no-events-1'))
assert(loader.includes('roll-sim-data-v16.js?rev=20260918-no-events-1'))
assert(loader.includes('roll-sim-event-expiry-v32.js?rev=20260918-no-events-1'))
assert(loader.includes('roll-sim-video-game-v34.js?rev=20260918-no-events-1'))
assert(index.includes("const version='20260918-no-events-1';"))

console.log('Hit Calc expired-event cleanup self-test passed.')
