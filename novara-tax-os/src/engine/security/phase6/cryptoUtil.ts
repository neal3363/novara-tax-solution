import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

export function hmacSha256Hex(key: string | Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex')
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** Hash fingerprint inputs without logging raw UA/IP. */
export function fingerprintHash(parts: { userAgent?: string; ipHint?: string; salt: string }): string {
  return sha256Hex(`${parts.salt}|${parts.userAgent ?? ''}|${parts.ipHint ?? ''}`)
}
