/**
 * In-tab handoff for files chosen on the public landing page.
 * Files never cross a network boundary here — they are applied to the
 * guest workspace immediately after login / prepare mount.
 */

let pending: File[] = []

export function stashLandingUploads(files: FileList | File[] | null | undefined): number {
  const list = files ? Array.from(files) : []
  pending = list.filter((f) => f && typeof f.size === 'number' && f.size > 0)
  return pending.length
}

export function takeLandingUploads(): File[] {
  const out = pending
  pending = []
  return out
}

export function peekLandingUploadCount(): number {
  return pending.length
}

export function clearLandingUploads(): void {
  pending = []
}
