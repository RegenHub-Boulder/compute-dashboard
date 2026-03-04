export type PingStatus = 'online' | 'offline' | 'checking'

export interface PingResult {
  status: PingStatus
  latency: number | null
  lastChecked: Date
}

export async function pingHost(ip: string, timeoutMs = 3000): Promise<PingResult> {
  const start = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await fetch(`http://${ip}`, {
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store',
    })
    const latency = Math.round(performance.now() - start)
    return { status: 'online', latency, lastChecked: new Date() }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { status: 'offline', latency: null, lastChecked: new Date() }
    }
    // Network errors (CORS, refused, etc.) still mean the host responded
    const latency = Math.round(performance.now() - start)
    if (latency < timeoutMs - 100) {
      return { status: 'online', latency, lastChecked: new Date() }
    }
    return { status: 'offline', latency: null, lastChecked: new Date() }
  } finally {
    clearTimeout(timeout)
  }
}
