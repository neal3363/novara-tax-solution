import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'

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

export default defineConfig({
  plugins: [react(), sessionApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
