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
 * Public demo-safety + optional local-only staging security APIs.
 * Staging handlers live outside novara-tax-os/api (not publishable as host routes).
 * Mount /api/security/* only when NOVARA_STAGING_SECURITY_API=1.
 */
function securityApiPlugin(): Plugin {
  const stagingDir = path.resolve(rootDir, '../staging-security-api/security')
  const publicRoutes: Record<string, string> = {
    '/api/demo-safety': '/api/demo-safety.ts',
  }
  const stagingRoutes: Record<string, string> = {
    '/api/security/session': path.join(stagingDir, 'session.ts'),
    '/api/security/mfa': path.join(stagingDir, 'mfa.ts'),
    '/api/security/authorize': path.join(stagingDir, 'authorize.ts'),
    '/api/security/vault': path.join(stagingDir, 'vault.ts'),
    '/api/security/audit': path.join(stagingDir, 'audit.ts'),
    '/api/security/status': path.join(stagingDir, 'status.ts'),
    '/api/security/mef': path.join(stagingDir, 'mef.ts'),
    '/api/security/irs-staging': path.join(stagingDir, 'irs-staging.ts'),
    '/api/security/payments': path.join(stagingDir, 'payments.ts'),
    '/api/security/returns-phase11': path.join(stagingDir, 'returns-phase11.ts'),
    '/api/security/launch-phase12': path.join(stagingDir, 'launch-phase12.ts'),
    '/api/security/password-reset': path.join(stagingDir, 'password-reset.ts'),
  }
  return {
    name: 'novara-security-api-staging',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] ?? ''
        const stagingOn = process.env.NOVARA_STAGING_SECURITY_API === '1'
        const routes = stagingOn ? { ...publicRoutes, ...stagingRoutes } : publicRoutes
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
