/** Copy Vite dist into Capacitor www/ after build. */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const mobileRoot = new URL('..', import.meta.url).pathname
const dist = join(mobileRoot, '../dist')
const www = join(mobileRoot, 'www')

if (!existsSync(dist)) {
  console.error('FAIL missing ../dist — run npm run build in novara-tax-os first')
  process.exit(1)
}

rmSync(www, { recursive: true, force: true })
mkdirSync(www, { recursive: true })
cpSync(dist, www, { recursive: true })
writeFileSync(
  join(www, 'novara-mobile-shell.json'),
  JSON.stringify(
    {
      shell: 'capacitor',
      appId: 'com.novara.taxos',
      syncedAt: new Date().toISOString(),
      livePayments: false,
      liveIrsTransmit: false,
    },
    null,
    2,
  ),
)
console.log('OK copied dist → mobile/www')
