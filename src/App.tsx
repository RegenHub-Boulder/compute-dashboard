import { useState, useEffect, useCallback, useRef } from 'react'
import { groups, allDevices, type Device } from './devices'
import { pingAll as doPingAll, type PingResult, type PingStatus } from './ping'
import { useLabels } from './useLabels'

const POLL_INTERVAL = 15_000
const STAGGER_MS = 120

function StatusIndicator({ status }: { status: PingStatus }) {
  if (status === 'checking') {
    return <span className="text-amber-400 tracking-widest animate-pulse">WAIT</span>
  }
  if (status === 'online') {
    return <span className="text-emerald-400 tracking-widest">UP</span>
  }
  return <span className="text-red-400 tracking-widest">DOWN</span>
}

function Latency({ ms }: { ms: number | null }) {
  if (ms == null) return <span className="text-slate-600">---</span>
  return (
    <span className={ms < 50 ? 'text-emerald-400' : ms < 150 ? 'text-amber-400' : 'text-red-400'}>
      {String(ms).padStart(3, '\u2007')}ms
    </span>
  )
}

function EditableLabel({
  label,
  onSave,
}: {
  label: string
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const save = () => {
    onSave(value.trim() || label)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setValue(label); setEditing(false) }
        }}
        className="bg-transparent text-white font-bold outline-none border-b border-amber-400/50 w-full"
      />
    )
  }

  return (
    <span
      className="text-white font-bold cursor-pointer hover:text-amber-300 transition-colors truncate"
      onClick={() => { setValue(label); setEditing(true) }}
    >
      {label}
    </span>
  )
}

const GRID_COLS = '3.5rem 1fr 9rem 4.5rem 5.5rem'

function DeviceRow({
  device,
  result,
  label,
  onLabelChange,
  isChild,
  flipping,
}: {
  device: Device
  result: PingResult | undefined
  label: string
  onLabelChange: (v: string) => void
  isChild?: boolean
  flipping?: boolean
}) {
  const status = result?.status ?? 'checking'

  return (
    <div className={`relative overflow-hidden ${isChild ? 'pl-8' : ''}`}>
      <div
        className={`grid items-center gap-x-4 px-4 py-[10px] border-b border-white/[0.04] hover:bg-white/[0.02] transition-all duration-300 ${
          flipping ? 'split-flap-flip' : ''
        }`}
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <StatusIndicator status={status} />

        <div className="flex items-center gap-2 min-w-0">
          {isChild && <span className="text-slate-600">&#x2514;</span>}
          <EditableLabel label={label} onSave={onLabelChange} />
        </div>

        <span className="text-slate-400 tabular-nums">{device.ip}</span>

        <span className="tabular-nums text-right">
          <Latency ms={result?.latency ?? null} />
        </span>

        <span className="text-slate-600 text-right tabular-nums whitespace-nowrap">
          {result?.lastChecked ? result.lastChecked.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
        </span>
      </div>
    </div>
  )
}

function GroupHeader({ name }: { name: string }) {
  return (
    <div
      className="grid items-center gap-x-4 px-4 py-1.5 bg-white/[0.03] border-b border-white/[0.06] text-[11px]"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <span />
      <span className="font-bold uppercase tracking-[0.2em] text-slate-500">{name}</span>
      <span className="uppercase tracking-[0.15em] text-slate-600">Address</span>
      <span className="uppercase tracking-[0.15em] text-slate-600 text-right">Ping</span>
      <span className="uppercase tracking-[0.15em] text-slate-600 text-right">Checked</span>
    </div>
  )
}

function flatDeviceOrder(): string[] {
  const ids: string[] = []
  for (const g of groups) {
    for (const d of g.devices) {
      ids.push(d.id)
      if (d.children) {
        for (const c of d.children) ids.push(c.id)
      }
    }
  }
  return ids
}

export default function App() {
  const [results, setResults] = useState<Record<string, PingResult>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [flipping, setFlipping] = useState<Set<string>>(new Set())
  const { getLabel, setLabel } = useLabels()
  const [source, setSource] = useState<'server' | 'direct' | null>(null)
  const staggerTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const pingAllDevices = useCallback(async () => {
    setRefreshing(true)
    const all = allDevices()
    const order = flatDeviceOrder()

    const ips = all.map((d) => d.ip)
    const byIp = await doPingAll(ips)

    const byId: Record<string, PingResult> = {}
    for (const d of all) {
      byId[d.id] = byIp[d.ip] ?? { status: 'offline', latency: null, lastChecked: new Date(), source: 'direct' }
    }

    setSource(Object.values(byIp)[0]?.source ?? null)

    for (const t of staggerTimers.current) clearTimeout(t)
    staggerTimers.current = []

    order.forEach((id, i) => {
      const timer = setTimeout(() => {
        setFlipping((prev) => new Set(prev).add(id))
        setResults((prev) => ({ ...prev, [id]: byId[id] }))

        const clearTimer = setTimeout(() => {
          setFlipping((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 350)
        staggerTimers.current.push(clearTimer)

        if (i === order.length - 1) {
          setRefreshing(false)
        }
      }, i * STAGGER_MS)
      staggerTimers.current.push(timer)
    })
  }, [])

  useEffect(() => {
    pingAllDevices()
    const interval = setInterval(pingAllDevices, POLL_INTERVAL)
    return () => {
      clearInterval(interval)
      for (const t of staggerTimers.current) clearTimeout(t)
    }
  }, [pingAllDevices])

  const all = allDevices()
  const onlineCount = all.filter((d) => results[d.id]?.status === 'online').length

  return (
    <div className="h-screen flex flex-col text-[15px]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight">REGENHUB</h1>
          <span className="text-sm text-slate-500 tracking-wide">NETWORK STATUS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-emerald-400 font-bold tabular-nums">{onlineCount}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 tabular-nums">{all.length}</span>
            <span className="text-slate-600">ONLINE</span>
          </div>
          <button
            onClick={pingAllDevices}
            disabled={refreshing}
            className="text-sm tracking-wide px-3 py-1.5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
          >
            {refreshing ? 'SCANNING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        {groups.map((group) => (
          <div key={group.name}>
            <GroupHeader name={group.name} />
            {group.devices.map((device) => (
              <div key={device.id}>
                <DeviceRow
                  device={device}
                  result={results[device.id]}
                  label={getLabel(device.id, device.defaultLabel)}
                  onLabelChange={(v) => setLabel(device.id, v)}
                  flipping={flipping.has(device.id)}
                />
                {device.children?.map((child) => (
                  <DeviceRow
                    key={child.id}
                    device={child}
                    result={results[child.id]}
                    label={getLabel(child.id, child.defaultLabel)}
                    onLabelChange={(v) => setLabel(child.id, v)}
                    isChild
                    flipping={flipping.has(child.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-600 tracking-wide">
        <span>AUTO-REFRESH {POLL_INTERVAL / 1000}s {source && `· VIA ${source.toUpperCase()}`}</span>
        <span>CLICK NAME TO RENAME</span>
      </div>
    </div>
  )
}
