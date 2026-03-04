import { useState, useEffect, useCallback, useRef } from 'react'
import { groups, allDevices, type Device } from './devices'
import { pingHost, type PingResult, type PingStatus } from './ping'
import { useLabels } from './useLabels'

const POLL_INTERVAL = 15_000

function StatusIndicator({ status }: { status: PingStatus }) {
  if (status === 'checking') {
    return <span className="text-amber-400 text-xs tracking-widest animate-pulse">WAIT</span>
  }
  if (status === 'online') {
    return <span className="text-emerald-400 text-xs tracking-widest">UP</span>
  }
  return <span className="text-red-400 text-xs tracking-widest">DOWN</span>
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
        className="bg-transparent text-white font-bold text-sm outline-none border-b border-amber-400/50 w-full"
      />
    )
  }

  return (
    <span
      className="text-white font-bold text-sm cursor-pointer hover:text-amber-300 transition-colors truncate"
      onClick={() => { setValue(label); setEditing(true) }}
    >
      {label}
    </span>
  )
}

function DeviceRow({
  device,
  result,
  label,
  onLabelChange,
  isChild,
}: {
  device: Device
  result: PingResult | undefined
  label: string
  onLabelChange: (v: string) => void
  isChild?: boolean
}) {
  const status = result?.status ?? 'checking'

  return (
    <div
      className={`grid items-center gap-x-3 px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
        isChild ? 'pl-10' : ''
      }`}
      style={{ gridTemplateColumns: '4.5rem 1fr 8rem 4rem 5.5rem' }}
    >
      {/* Status */}
      <StatusIndicator status={status} />

      {/* Name */}
      <div className="flex items-center gap-2 min-w-0">
        {isChild && <span className="text-slate-600 text-xs">&#x2514;</span>}
        <EditableLabel label={label} onSave={onLabelChange} />
      </div>

      {/* IP */}
      <span className="text-slate-400 text-xs tabular-nums">{device.ip}</span>

      {/* Latency */}
      <span className="text-xs tabular-nums text-right">
        <Latency ms={result?.latency ?? null} />
      </span>

      {/* Last check */}
      <span className="text-xs text-slate-600 text-right tabular-nums">
        {result?.lastChecked ? result.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
      </span>
    </div>
  )
}

function GroupHeader({ name }: { name: string }) {
  return (
    <div
      className="grid items-center gap-x-3 px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]"
      style={{ gridTemplateColumns: '4.5rem 1fr 8rem 4rem 5.5rem' }}
    >
      <span />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{name}</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-slate-600">Address</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-slate-600 text-right">Ping</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-slate-600 text-right">Checked</span>
    </div>
  )
}

export default function App() {
  const [results, setResults] = useState<Record<string, PingResult>>({})
  const [refreshing, setRefreshing] = useState(false)
  const { getLabel, setLabel } = useLabels()

  const pingAll = useCallback(async () => {
    setRefreshing(true)
    const all = allDevices()
    setResults((prev) => {
      const next = { ...prev }
      for (const d of all) {
        next[d.id] = { status: 'checking', latency: null, lastChecked: prev[d.id]?.lastChecked ?? new Date() }
      }
      return next
    })

    await Promise.all(
      all.map(async (d) => {
        const result = await pingHost(d.ip)
        setResults((prev) => ({ ...prev, [d.id]: result }))
      })
    )
    setRefreshing(false)
  }, [])

  useEffect(() => {
    pingAll()
    const interval = setInterval(pingAll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [pingAll])

  const all = allDevices()
  const onlineCount = all.filter((d) => results[d.id]?.status === 'online').length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-baseline gap-4">
          <h1 className="text-lg font-bold text-white tracking-tight">REGENHUB</h1>
          <span className="text-xs text-slate-500 tracking-wide">NETWORK STATUS</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-bold tabular-nums">{onlineCount}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 tabular-nums">{all.length}</span>
            <span className="text-slate-600">ONLINE</span>
          </div>
          <button
            onClick={pingAll}
            disabled={refreshing}
            className="text-xs tracking-wide px-3 py-1.5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
          >
            {refreshing ? 'SCANNING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1">
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
                />
                {device.children?.map((child) => (
                  <DeviceRow
                    key={child.id}
                    device={child}
                    result={results[child.id]}
                    label={getLabel(child.id, child.defaultLabel)}
                    onLabelChange={(v) => setLabel(child.id, v)}
                    isChild
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-600 tracking-wide">
        <span>AUTO-REFRESH {POLL_INTERVAL / 1000}s</span>
        <span>CLICK NAME TO RENAME</span>
      </div>
    </div>
  )
}
