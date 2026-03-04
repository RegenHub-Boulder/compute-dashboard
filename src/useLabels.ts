import { useState, useCallback } from 'react'

const STORAGE_KEY = 'regenhub-device-labels'

function loadLabels(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function useLabels() {
  const [labels, setLabels] = useState<Record<string, string>>(loadLabels)

  const setLabel = useCallback((deviceId: string, label: string) => {
    setLabels((prev) => {
      const next = { ...prev, [deviceId]: label }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const getLabel = useCallback(
    (deviceId: string, fallback: string) => labels[deviceId] || fallback,
    [labels]
  )

  return { getLabel, setLabel }
}
