import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
/** Multi-tenant DEV fixtures live outside the published app tree. */
const devFixtures = path.resolve(rootDir, '../dev-fixtures')

function headersFromNode(req: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else headers.set(key, value)
  }
  return headers
}

/** Local /api/session so production Login path can be exercised under vite. */
function sessionApiPlugin(): Plugin {
  return {
    name: 'novara-session-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/session' || req.method !== 'GET') return next()
        try {
          const { GET } = await server.ssrLoadModule('/api/session.ts')
          const request = new Request(new URL(path, 'http://localhost'), {
            method: 'GET',
            headers: headersFromNode(req),
          })
          const response = (await GET(request)) as Response
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(await response.text())
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ verified: false, error: 'local_session_failed', detail: String(err) }))
        }
      })
    },
  }
}

/**
 * Staging-only Phase 6/7 security APIs under /api/security/*.
 * Does not alter taxpayer UI login or production enforcement.
 */
function securityApiPlugin(): Plugin {
  const routes: Record<string, string> = {
    '/api/security/session': '/api/security/session.ts',
    '/api/security/mfa': '/api/security/mfa.ts',
    '/api/security/authorize': '/api/security/authorize.ts',
    '/api/security/vault': '/api/security/vault.ts',
    '/api/security/audit': '/api/security/audit.ts',
    '/api/security/status': '/api/security/status.ts',
  }
  return {
    name: 'novara-security-api-staging',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] ?? ''
        const modPath = routes[urlPath]
        if (!modPath) return next()
        const method = (req.method ?? 'GET').toUpperCase()
        try {
          const mod = await server.ssrLoadModule(modPath)
          const handler = mod[method] as ((r: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'method_not_allowed' }))
            return
          }
          const chunks: Buffer[] = []
          await new Promise<void>((resolve, reject) => {
            req.on('data', (c) => chunks.push(Buffer.from(c)))
            req.on('end', () => resolve())
            req.on('error', reject)
          })
          const bodyBuf = Buffer.concat(chunks)
          const request = new Request(new URL(req.url ?? urlPath, 'http://localhost'), {
            method,
            headers: headersFromNode(req),
            body: method === 'GET' || method === 'HEAD' ? undefined : bodyBuf,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'security_api_failed', detail: String(err) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), sessionApiPlugin(), securityApiPlugin()],
  resolve: {
    alias: {
      '@dev-fixtures': devFixtures,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: [rootDir, devFixtures],
    },
  },
})
