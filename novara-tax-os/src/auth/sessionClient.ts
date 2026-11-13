export type ViewerSession = {
  verified: true
  sub: string
  name: string
  email: string
  appVisibility?: string
}

export async function fetchViewerSession(): Promise<
  | ViewerSession
  | { verified: false; error: string }
> {
  try {
    const res = await fetch('/api/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok || !data.verified) {
      return { verified: false, error: String(data.error ?? `http_${res.status}`) }
    }
    return {
      verified: true,
      sub: String(data.sub ?? ''),
      name: String(data.name ?? 'Taxpayer'),
      email: String(data.email ?? ''),
      appVisibility: data.appVisibility ? String(data.appVisibility) : undefined,
    }
  } catch {
    return { verified: false, error: 'network' }
  }
}
