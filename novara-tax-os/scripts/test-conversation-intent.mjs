/**
 * Conversational intent + command routing tests (no network / no STT).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-intent-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { detectFilingIntent } from '../src/engine/conversationIntent.ts'
import { parseTaxpayerStatement } from '../src/engine/naturalLanguageFacts.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Intent routing ===')
{
  const a = detectFilingIntent("I'm filing my personal taxes.")
  assert(a.type === 'intent' && a.intent === 'personal', 'personal intent')
  const b = detectFilingIntent("I have a business and need to file both personal and business.")
  assert(b.type === 'intent' && b.intent === 'personal_and_business', 'combined intent')
  assert(b.type === 'intent' && Boolean(b.clarify), 'combined asks entity clarify')
  const c = detectFilingIntent('I need to amend my 2023 return')
  assert(c.type === 'intent' && c.intent === 'amend' && c.taxYear === 2023, 'amend 2023')
  const d = detectFilingIntent('Continue where I stopped')
  assert(d.type === 'continue', 'resume/continue')
  const e = detectFilingIntent("Show me what I haven't answered")
  assert(e.type === 'show_unanswered', 'show unanswered')
  const f = detectFilingIntent('Go back to my childcare question')
  assert(f.type === 'goto_mapsTo' && f.mapsTo === 'paid_childcare', 'goto childcare')
  const g = detectFilingIntent('Change my business expenses to $12,500')
  assert(g.type === 'set_amount' || g.type === 'edit_mapsTo' || g.type === 'free_text', 'change expenses command parsed')
  const h = detectFilingIntent('yes')
  assert(h.type === 'yes_no' && h.value === 'yes', 'yes')
  const i = detectFilingIntent("I'm self-employed and have three children")
  assert(i.type === 'intent' || i.type === 'free_text', 'SE + children statement accepted')
}

console.log('=== NL facts from speech-like text ===')
{
  const facts = parseTaxpayerStatement('I paid $4,800 for daycare while I was working')
  assert(facts.some((f) => f.mapsTo === 'childcare_amount' && f.value === 4800), 'childcare amount')
  assert(facts.some((f) => f.needsConfirm), 'amounts need confirm')
  const miles = parseTaxpayerStatement('I drove 4200 business miles')
  assert(miles.some((f) => f.mapsTo === 'business_miles' && f.value === 4200), 'business miles')
  const kids = parseTaxpayerStatement('I have three kids')
  assert(kids.some((f) => f.mapsTo === 'dependent_count' && f.value === 3), 'three kids count')
}

if (failed) {
  console.error(failed + ' failure(s)')
  process.exit(1)
}
console.log('\\nConversation intent tests passed.')
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
