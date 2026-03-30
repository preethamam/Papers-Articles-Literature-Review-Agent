import { useEffect, useState } from 'react'
import { getPapers, type PaperSummary } from '@/lib/api'

export function usePapers(params?: Record<string, unknown>) {
  const [papers, setPapers] = useState<PaperSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getPapers(params)
      .then(setPapers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)])

  return { papers, loading, error, refetch: () => getPapers(params).then(setPapers) }
}
