import { useEffect, useState } from 'react'
import { getArticles, type Article } from '@/lib/api'

export function useArticles(params?: { search?: string; sort?: string; order?: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getArticles(params)
      .then(setArticles)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [params?.search, params?.sort, params?.order])

  const refetch = () => {
    setError(null)
    return getArticles(params).then(setArticles).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load')
    })
  }
  return { articles, loading, error, refetch }
}
