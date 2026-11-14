/**
 * Staging cloud-KMS adapter.
 * Simulates an approved cloud KMS for staging: env-separated keys persisted under
 * durable staging storage. No production secrets hardcoded. Not a production AWS/GCP account.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DataKey, KmsProvider } from '../phase6/kms'
import { setKmsEnvironment, setKmsProviderOverride, appendAudit } from '../phase6/index'
import { ensureDurableDirs, getDurableRoot } from './durableStore'
import { getPhase7Flags } from './config'

function kmsStatePath(): string {
  return join(getDurableRoot(), 'kms', 'staging-masters.json')
}

interface PersistedMasters {
  env: 'staging'
  masters: Record<string, string> // keyId -> base64
  rootFingerprint: string
}

function loadMasters(): Map<string, Buffer> {
  ensureDurableDirs()
  const map = new Map<string, Buffer>()
  if (!existsSync(kmsStatePath())) return map
  const raw = JSON.parse(readFileSync(kmsStatePath(), 'utf8')) as PersistedMasters
  for (const [k, v] of Object.entries(raw.masters ?? {})) {
    map.set(k, Buffer.from(v, 'base64'))
  }
  return map
}

function saveMasters(map: Map<string, Buffer>): void {
  ensureDurableDirs()
  const masters: Record<string, string> = {}
  for (const [k, v] of map) masters[k] = v.toString('base64')
  const payload: PersistedMasters = {
    env: 'staging',
    masters,
    rootFingerprint: createHash('sha256').update(JSON.stringify(Object.keys(masters).sort())).digest('hex'),
  }
  writeFileSync(kmsStatePath(), JSON.stringify(payload, null, 2), { mode: 0o600 })
}

function wrapDek(master: Buffer, dek: Buffer): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', master, iv)
  const enc = Buffer.concat([cipher.update(dek), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc])
}

function unwrapDek(master: Buffer, wrapped: Buffer): Buffer {
  const iv = wrapped.subarray(0, 12)
  const tag = wrapped.subarray(12, 28)
  const enc = wrapped.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', master, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()])
}

function masterFor(keyId: string): Buffer {
  const map = loadMasters()
  let master = map.get(keyId)
  if (!master) {
    // Runtime-generated — staging only; never a hardcoded production secret
    master = randomBytes(32)
    map.set(keyId, master)
    saveMasters(map)
  }
  return master
}

export const stagingCloudKmsProvider: KmsProvider = {
  name: 'staging-cloud-kms-adapter',
  generateDataKey(keyId: string): DataKey {
    const master = masterFor(keyId)
    const plaintext = randomBytes(32)
    return { keyId, plaintext, encryptedDek: wrapDek(master, plaintext) }
  },
  decryptDataKey(keyId: string, encryptedDek: Buffer): Buffer {
    return unwrapDek(masterFor(keyId), encryptedDek)
  },
  rotateKey(keyId: string): { newKeyId: string } {
    const newKeyId = `${keyId}-rot-${randomBytes(4).toString('hex')}`
    const map = loadMasters()
    map.set(newKeyId, randomBytes(32))
    saveMasters(map)
    appendAudit({
      actorId: 'kms',
      tenantId: 'system',
      action: 'key_rotate',
      resource: `kms:${keyId}`,
      outcome: 'success',
      meta: { newKeyId, env: 'staging', provider: 'staging-cloud-kms-adapter' },
    })
    return { newKeyId }
  },
}

/** Connect staging KMS for Phase 7 — does NOT enable production enforcement. */
export function connectStagingKms(): {
  connected: true
  provider: string
  environment: 'staging'
  productionEnforcement: false
} {
  setKmsEnvironment('staging')
  if (getPhase7Flags().stagingCloudKmsEnabled) {
    setKmsProviderOverride(stagingCloudKmsProvider)
  }
  return {
    connected: true,
    provider: stagingCloudKmsProvider.name,
    environment: 'staging',
    productionEnforcement: false,
  }
}

export function disconnectStagingKms(): void {
  setKmsProviderOverride(null)
  setKmsEnvironment('development')
}

export function stagingKmsRoundTripVerify(): { verified: boolean; provider: string; atRest: true; inTransitNote: string } {
  const dk = stagingCloudKmsProvider.generateDataKey('phase7-verify')
  const sample = Buffer.from('novara-phase7-staging-kms-verify')
  const aad = 'phase7-staging'
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', dk.plaintext, iv)
  cipher.setAAD(Buffer.from(aad))
  const ciphertext = Buffer.concat([cipher.update(sample), cipher.final()])
  const tag = cipher.getAuthTag()
  dk.plaintext.fill(0)

  const dek2 = stagingCloudKmsProvider.decryptDataKey(dk.keyId, dk.encryptedDek)
  const decipher = createDecipheriv('aes-256-gcm', dek2, iv)
  decipher.setAAD(Buffer.from(aad))
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  dek2.fill(0)

  return {
    verified: plain.equals(sample),
    provider: stagingCloudKmsProvider.name,
    atRest: true,
    inTransitNote: 'TLS required at API edge; ciphertext never returned unauthenticated',
  }
}
