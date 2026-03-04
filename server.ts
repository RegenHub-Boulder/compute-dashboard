import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/api/*', cors())

app.get('/api/ping', async (c) => {
  const ip = c.req.query('ip')
  if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return c.json({ error: 'invalid ip' }, 400)
  }

  const start = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    await fetch(`http://${ip}`, { signal: controller.signal, redirect: 'manual' })
    const latency = Math.round(performance.now() - start)
    return c.json({ status: 'online', latency })
  } catch (e) {
    const elapsed = Math.round(performance.now() - start)
    if (e instanceof DOMException && e.name === 'AbortError') {
      return c.json({ status: 'offline', latency: null })
    }
    // Connection refused / reset still means host is up
    if (elapsed < 2500) {
      return c.json({ status: 'online', latency: elapsed })
    }
    return c.json({ status: 'offline', latency: null })
  } finally {
    clearTimeout(timeout)
  }
})

app.get('/api/ping-all', async (c) => {
  const ips = c.req.query('ips')?.split(',') ?? []
  const valid = ips.filter((ip) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip))

  const results = await Promise.all(
    valid.map(async (ip) => {
      const start = performance.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      try {
        await fetch(`http://${ip}`, { signal: controller.signal, redirect: 'manual' })
        return { ip, status: 'online' as const, latency: Math.round(performance.now() - start) }
      } catch (e) {
        const elapsed = Math.round(performance.now() - start)
        if (!(e instanceof DOMException && e.name === 'AbortError') && elapsed < 2500) {
          return { ip, status: 'online' as const, latency: elapsed }
        }
        return { ip, status: 'offline' as const, latency: null }
      } finally {
        clearTimeout(timeout)
      }
    })
  )

  return c.json(Object.fromEntries(results.map((r) => [r.ip, { status: r.status, latency: r.latency }])))
})

// Serve static files in production
app.use('/*', serveStatic({ root: './dist' }))
app.use('/*', serveStatic({ root: './dist', path: '/index.html' }))

export default {
  port: Number(process.env.PORT) || 3001,
  fetch: app.fetch,
}
