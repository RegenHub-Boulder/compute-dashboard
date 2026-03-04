export type PingStatus = 'online' | 'offline' | 'checking'

export interface PingResult {
  status: PingStatus
  latency: number | null
  lastChecked: Date
  source: 'server' | 'direct'
}

async function serverPingAll(ips: string[]): Promise<Record<string, { status: 'online' | 'offline'; latency: number | null }> | null> {
  try {
    const res = await fetch(`/api/ping-all?ips=${ips.join(',')}`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function directPing(ip: string, timeoutMs = 3000): Promise<PingResult> {
  const start = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await fetch(`http://${ip}`, { mode: 'no-cors', signal: controller.signal, cache: 'no-store' })
    return { status: 'online', latency: Math.round(performance.now() - start), lastChecked: new Date(), source: 'direct' }
  } catch (e) {
    const elapsed = Math.round(performance.now() - start)
    if (!(e instanceof DOMException && e.name === 'AbortError') && elapsed < timeoutMs - 100) {
      return { status: 'online', latency: elapsed, lastChecked: new Date(), source: 'direct' }
    }
    return { status: 'offline', latency: null, lastChecked: new Date(), source: 'direct' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function pingAll(ips: string[]): Promise<Record<string, PingResult>> {
  // Try server-side batch ping first
  const serverResults = await serverPingAll(ips)

  if (serverResults) {
    const now = new Date()
    return Object.fromEntries(
      ips.map((ip) => {
        const r = serverResults[ip]
        return [ip, r
          ? { status: r.status, latency: r.latency, lastChecked: now, source: 'server' as const }
          : { status: 'offline' as PingStatus, latency: null, lastChecked: now, source: 'server' as const },
        ]
      })
    )
  }

  // Fallback: direct pings from browser
  const entries = await Promise.all(
    ips.map(async (ip) => [ip, await directPing(ip)] as const)
  )
  return Object.fromEntries(entries)
}
