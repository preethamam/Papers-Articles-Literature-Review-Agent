import { useEffect, useState } from 'react'
import { getStats, type StatsResponse } from '@/lib/api'

export function useStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
