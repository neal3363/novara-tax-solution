/**
 * Backup & database restoration simulation (staging durable store).
 * Does not claim production restore drills complete.
 */

import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { assertRemediationStagingOnly, getRemediationFlags } from '../config'

export interface BackupRestoreResult {
  ok: boolean
  backupPath?: string
  restored: boolean
  productionReady: false
  notes: string[]
}

export function simulateBackupAndRestore(durableRoot: string): BackupRestoreResult {
  assertRemediationStagingOnly()
  if (!getRemediationFlags().backupRestoreSimulationEnabled) {
    return { ok: false, restored: false, productionReady: false, notes: ['simulation_disabled'] }
  }
  if (!existsSync(durableRoot)) {
    return { ok: false, restored: false, productionReady: false, notes: ['durable_root_missing'] }
  }

  const marker = join(durableRoot, 'qa-marker.json')
  writeFileSync(marker, JSON.stringify({ v: 1, at: new Date().toISOString(), secret: 'synth-only' }))

  const backupPath = `${durableRoot}.bak-${Date.now()}`
  mkdirSync(backupPath, { recursive: true })
  cpSync(durableRoot, backupPath, { recursive: true })

  // Simulate corruption / wipe of live marker
  writeFileSync(marker, JSON.stringify({ corrupted: true }))

  // Restore
  rmSync(durableRoot, { recursive: true, force: true })
  cpSync(backupPath, durableRoot, { recursive: true })

  const restored = JSON.parse(readFileSync(join(durableRoot, 'qa-marker.json'), 'utf8'))
  const ok = restored.v === 1 && restored.secret === 'synth-only'

  return {
    ok,
    backupPath,
    restored: ok,
    productionReady: false,
    notes: [
      'Staging durable-store backup/restore simulation only.',
      'Production restore drill remains required before launch.',
    ],
  }
}
