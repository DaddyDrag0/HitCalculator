const fs = require('fs')
const assert = require('assert')

const app = fs.readFileSync('app-base.js', 'utf8')
const html = fs.readFileSync('index-base.html', 'utf8')
const loader = fs.readFileSync('app.js', 'utf8')
const index = fs.readFileSync('index.html', 'utf8')

assert(app.includes('const MUTATION_BASE_DENOMINATOR = 750;'))
assert(app.includes('const MUTATION_PASS_MULTIPLIER = 1.25;'))
assert(app.includes('const MUTATION_POTION_MULTIPLIER = 1.2;'))
assert(app.includes('if (level >= 8) return 1.6;'))
assert(app.includes('rate *= mutationRate();'))
assert(app.includes('mutationTarget'))
assert(app.includes('mutationPass'))
assert(app.includes('mutationPotion'))

assert(html.includes('id="mutationTarget"'))
assert(html.includes('id="mutationPass"'))
assert(html.includes('id="mutationPotion"'))
assert(html.includes('id="mutationChanceReadout"'))
assert(html.includes('<option value="8">Level 8 · ×1.600</option>'))
assert(fs.readFileSync('upgrade-v2.js','utf8').includes("'Sacred Heart': { Luck: 58, Platinum: 5, Crystal: 5, Ruby: 5, Galaxy: 5, Cooldown: 200 }"))
assert(fs.readFileSync('upgrade-v2.js','utf8').includes("field('Luck', 'uvStructureLuck', 8)"))
assert(fs.readFileSync('upgrade-v2.js','utf8').includes("field('Speed', 'uvStructureSpeed', 8)"))
assert(fs.readFileSync('roll-sim-worker-v16.js','utf8').includes("clampLevel(build.structures?.Luck, 8)"))
assert(fs.readFileSync('roll-sim-worker-v16.js','utf8').includes("clampLevel(build.structures?.Speed, 8)"))
assert(fs.readFileSync('optimizer-builds-v1.js','utf8').includes("'Sacred Heart':{Luck:58,Platinum:5,Crystal:5,Ruby:5,Galaxy:5,Cooldown:200}"))

assert(loader.includes('app-base.js?rev=20260918-mutation-2'))
assert(index.includes("const version='20260918-mutation-2';"))

const base = 1 / 750
assert.equal(Math.round(1 / (base * 1.25)), 600)
assert.equal(Math.round(1 / (base * 1.2)), 625)
assert.equal(Math.round(1 / (base * 1.25 * 1.2)), 500)

console.log('Hit Calc mutation update self-test passed.')
