/**
 * AI Refund Maximizer — dual refunds, recalc, missed opportunities, video assets.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-refund-max-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Cinematic video assets ===')
{
  const media = join(process.cwd(), 'public/media')
  for (const f of [
    'novara-cinematic-hero.mp4',
    'novara-cinematic-hero.webm',
    'novara-cinematic-hero-mobile.mp4',
    'novara-cinematic-hero-mobile.webm',
    'novara-cinematic-poster.jpg',
  ]) {
    const p = join(media, f)
    assert(existsSync(p), f + ' exists')
    assert(statSync(p).size > 50_000, f + ' non-trivial')
  }
}

console.log('=== Dual refund amounts ===')
{
  let p = defaultProfile()
  let r = runBenefitOptimization(p)
  assert(typeof r.projectedRefund === 'number', 'current estimated refund numeric')
  assert(typeof r.potentialSavings === 'number', 'potential savings numeric')
  const potential = r.projectedRefund + r.potentialSavings
  assert(potential >= r.projectedRefund, 'potential scenario >= current')
  assert(r.potentialSavings > 500, 'default profile surfaces meaningful unexplored potential')
  console.log('  current', r.projectedRefund, 'potential', potential)

  const open = r.findings.filter((f) => f.status === 'needs_info' || f.status === 'flagged_review')
  assert(open.length > 0, 'missed / open opportunities listed')
  for (const f of open) {
    assert(f.affectingRefund === 0, 'open opportunity not in current refund: ' + f.ruleId)
  }

  const before = r.projectedRefund
  p = applyAnswer(p, 'self_employed', 'yes')
  p = { ...p, selfEmploymentIncome: Math.max(p.selfEmploymentIncome, 12000) }
  r = runBenefitOptimization(p)
  assert(typeof r.projectedRefund === 'number', 'recalc after SE answer')
  assert(p.answers.self_employed === 'yes', 'answer remembered')

  const stillOpen = r.findings.filter((f) => f.status === 'needs_info' && (f.missingAnswers?.length || 0) > 0)
  assert(stillOpen.length > 0, 'skipped opportunities remain available')

  p = applyAnswer(p, 'business_vehicle', 'no')
  r = runBenefitOptimization(p)
  const mileage = r.findings.find((f) => f.ruleId === 'mileage')
  assert(!!mileage && mileage.status === 'ineligible', 'mileage ineligible after No')
  assert(r.taxYear === p.taxYear, 'tax year ruleset matches profile')

  // Separated totals
  const applied = r.findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const verified = applied.reduce((s, f) => s + f.affectingRefund, 0)
  assert(Math.abs(verified - r.verifiedSavings) < 1, 'verified $ matches applied credits')
  assert(r.projectedRefund === r.baseRefund + r.verifiedSavings, 'current = base + verified')
}

if (failed) {
  console.error('\\n' + failed + ' failure(s)')
  process.exit(1)
}
console.log('\\nAll refund maximizer tests passed.')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, npm_config_yes: 'true' },
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status ?? 1)
