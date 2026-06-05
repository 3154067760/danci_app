import { useEffect, useState, type ReactNode } from 'react'
import { hydrateAllLocalData } from '../utils/localData'

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void hydrateAllLocalData().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-secondary, #888)',
          fontSize: '0.95rem',
        }}
      >
        正在加载本地数据…
      </div>
    )
  }

  return children
}
