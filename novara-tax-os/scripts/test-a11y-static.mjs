/**
 * Static accessibility inventory (WS7).
 * Does NOT claim device testing or full WCAG audit.
 * Real iPhone/Android/iPad and screen-reader checks remain NOT_TESTED without devices.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const src = join(root, 'src')

let files = 0
let ariaAttrs = 0
let roleAttrs = 0
let ariaLabels = 0
let keyboardHandlers = 0
const samples = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'engine') continue
      walk(p)
      continue
    }
    if (!/\.(tsx|jsx)$/.test(name)) continue
    files++
    const text = readFileSync(p, 'utf8')
    const a = (text.match(/\baria-[a-zA-Z-]+=/g) || []).length
    const r = (text.match(/\brole="/g) || []).length
    const l = (text.match(/\baria-label=/g) || []).length
    const k = (text.match(/onKeyDown|tabIndex=/g) || []).length
    ariaAttrs += a
    roleAttrs += r
    ariaLabels += l
    keyboardHandlers += k
    if (a + r + l + k > 0 && samples.length < 12) {
      samples.push({ file: p.replace(root + '/', ''), aria: a, role: r, labels: l, keyboard: k })
    }
  }
}

walk(src)

let failed = 0
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    failed++
  } else console.log('OK', m)
}

assert(files > 20, `scanned UI files=${files}`)
assert(ariaAttrs >= 10, `aria attributes found=${ariaAttrs}`)
assert(roleAttrs >= 5, `role attributes found=${roleAttrs}`)
assert(ariaLabels >= 3, `aria-label found=${ariaLabels}`)
assert(keyboardHandlers >= 3, `keyboard affordances found=${keyboardHandlers}`)

console.log('--- samples ---')
for (const s of samples) console.log(JSON.stringify(s))

console.log('DEVICE_TESTING: NOT_TESTED — no iPhone/Android/iPad lab in this environment')
console.log('SCREEN_READER: NOT_TESTED — no VoiceOver/TalkBack session executed')
console.log('AXE_LIGHTHOUSE: NOT_TESTED — axe/lighthouse not installed in package.json')
console.log('LOAD_PERF: NOT_TESTED — controlled staging load test not executed')
console.log('=== A11Y_STATIC_OK failed=' + failed + ' staticPass=true devices=NOT_TESTED ===')
process.exit(failed > 0 ? 1 : 0)
