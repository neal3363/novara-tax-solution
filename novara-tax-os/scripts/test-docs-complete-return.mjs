/**
 * Full document set → return done with no required interview turns.
 * Optional soft-discovery credits may remain; they must not block.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')

const result = spawnSync('npx', ['--yes', 'tsx', path.join(root, 'test-docs-complete-return.ts')], {
  cwd: appRoot,
  encoding: 'utf8',
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
