import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, RefreshCw, Search, ExternalLink } from 'lucide-react'
import { getDatabaseInfo, getArticles, type DatabaseInfo, type Article } from '@/lib/api'

function linksCount(links_json: string | null | undefined): number {
  try {
    if (!links_json) return 0
    const a = JSON.parse(links_json) as unknown
    return Array.isArray(a) ? a.length : 0
  } catch {
    return 0
  }
}

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  const t = s.trim()
  if (t.length <= n) return t
  return `${t.slice(0, n)}…`
}

export default function Metadata() {
  const [data, setData] = useState<DatabaseInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesLoading, setArticlesLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    getDatabaseInfo()
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => setLoading(false))
  }

  const loadArticles = () => {
    setArticlesLoading(true)
    getArticles({ sort: 'parsed_at', order: 'desc', include_xml: false, include_reviews: true })
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setArticlesLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    loadArticles()
  }, [])

  const filteredArticles = useMemo(() => {
    const q = tableFilter.trim().toLowerCase()
    if (!q) return articles
    return articles.filter((a) => {
      const blob = [
        a.title,
        a.abstract,
        a.pdf_path,
        a.venue_name,
        String(a.year ?? ''),
        a.llm_intro,
        a.llm_summary,
        a.llm_literature_review,
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [articles, tableFilter])

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-500" />
          Local metadata database
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          SQLite file where parsed articles, TEI XML, and cached reviews are stored on this machine. Article fields
          match the Library “Export Excel” columns.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 text-red-800 dark:text-red-200 text-sm flex justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={load} className="text-xs font-medium underline">
            Retry
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-card border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && !data ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
        ) : data ? (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Path (home-relative)</p>
              <code className="text-[13px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg block break-all">
                {data.displayPath}
              </code>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Resolved path</p>
              <code className="text-[12px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg block break-all text-slate-700 dark:text-slate-200">
                {data.resolvedPath}
              </code>
            </div>
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Articles</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{data.articleCount}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Cached reviews</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{data.reviewRowCount}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Exports</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  {data.exportStats?.totalCount ?? 0}
                </p>
              </div>
            </div>
            {data.exportStats && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-[12px] text-slate-600 dark:text-slate-300 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Last export</p>
                  <p>{data.exportStats.lastAt ? new Date(data.exportStats.lastAt).toLocaleString() : "Never"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Scope</p>
                  <p className="capitalize">{data.exportStats.lastScope ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Article rows</p>
                  <p className="tabular-nums">{data.exportStats.lastRows}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Link rows</p>
                  <p className="tabular-nums">{data.exportStats.lastLinkRows}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">What is stored</p>
              <ul className="text-[13px] text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-5">
                {data.storedFields.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Article metadata (export columns)</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              TEI fields plus cached LLM intro, section summary, and literature review (same as Excel). Full TEI XML is
              not loaded here.
            </p>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Filter by title, abstract, intro, summaries…"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="px-3 py-2.5 font-semibold min-w-[140px]">Title</th>
                  <th className="px-3 py-2.5 font-semibold w-14">Year</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[72px]">Venue</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[200px]">Abstract</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[160px]">Intro (LLM)</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[160px]">Summary (LLM)</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[160px]">Lit review (LLM)</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[88px]">PDF</th>
                  <th className="px-3 py-2.5 font-semibold w-14 text-center">Links</th>
                  <th className="px-3 py-2.5 font-semibold w-20">Open</th>
                </tr>
              </thead>
              <tbody>
                {articlesLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      Loading articles…
                    </td>
                  </tr>
                ) : filteredArticles.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      {articles.length === 0 ? 'No articles yet. Upload PDFs from the Upload page.' : 'No matches.'}
                    </td>
                  </tr>
                ) : (
                  filteredArticles.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-50 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-100 font-medium max-w-[220px]">
                        {a.title || 'Untitled'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 tabular-nums">
                        {a.year ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                        <span className="block">{a.venue_type ?? '—'}</span>
                        {a.venue_name && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-[120px]" title={a.venue_name}>
                            {a.venue_name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[280px]">
                        {trunc(a.abstract, 120)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px]" title={a.llm_intro ?? ''}>
                        {trunc(a.llm_intro, 100)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px]" title={a.llm_summary ?? ''}>
                        {trunc(a.llm_summary, 100)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px]" title={a.llm_literature_review ?? ''}>
                        {trunc(a.llm_literature_review, 100)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px] max-w-[100px] truncate" title={a.pdf_path ?? ''}>
                        {a.pdf_path ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 tabular-nums">
                        {linksCount(a.links_json)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/library/article/${a.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => {
                loadArticles()
              }}
              disabled={articlesLoading}
              className="text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
            >
              Refresh table
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
