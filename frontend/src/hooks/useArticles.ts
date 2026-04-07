import { useEffect, useState } from 'react'
import { getArticles, type Article } from '@/lib/api'

export type UseArticlesParams = {
  search?: string
  sort?: string
  order?: string
  year_min?: number
  year_max?: number
  venue_type?: string
}

export function useArticles(params?: UseArticlesParams) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { search, sort, order, year_min, year_max, venue_type } = params ?? {}

  useEffect(() => {
    setLoading(true)
    getArticles({ search, sort, order, year_min, year_max, venue_type })
      .then(setArticles)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [search, sort, order, year_min, year_max, venue_type])

  const refetch = () => {
    setError(null)
    return getArticles({ search, sort, order, year_min, year_max, venue_type })
      .then(setArticles)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
  }
  return { articles, loading, error, refetch }
}
