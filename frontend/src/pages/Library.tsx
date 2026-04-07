import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Download, MessageSquare, Sparkles, FileText, BookMarked } from 'lucide-react'
import { useArticles } from '@/hooks/useArticles'
import { downloadArticlesExport } from '@/lib/api'

const VENUE_TYPES = ['all', 'journal', 'conference', 'book', 'report', 'preprint', 'unknown'] as const

function queryWithGen(ids: string[], gen: string) {
  const q = new URLSearchParams()
  q.set('articles', ids.join(','))
  q.set('gen', gen)
  return `/query?${q.toString()}`
}

export default function Library() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [venueType, setVenueType] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  const [chatPick, setChatPick] = useState<Set<string>>(() => new Set())

  const yearMinNum = yearMin.trim() === '' ? undefined : Number(yearMin)
  const yearMaxNum = yearMax.trim() === '' ? undefined : Number(yearMax)

  const { articles, loading, error, refetch } = useArticles({
    search: search || undefined,
    sort: 'parsed_at',
    order: 'desc',
    year_min: Number.isFinite(yearMinNum) ? yearMinNum : undefined,
    year_max: Number.isFinite(yearMaxNum) ? yearMaxNum : undefined,
    venue_type: venueType === 'all' ? undefined : venueType,
  })

  const selectedIds = [...chatPick]

  const handleExport = (ids?: string[]) => {
    setExporting(true)
    downloadArticlesExport(ids && ids.length > 0 ? ids : undefined)
      .catch(() => {})
      .finally(() => setExporting(false))
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm px-6 py-3 sticky top-0 z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
              />
            </div>
            <input
              type="number"
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
              placeholder="Year min"
              className="w-24 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-100"
            />
            <input
              type="number"
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
              placeholder="Year max"
              className="w-24 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-slate-100"
            />
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-[13px] min-w-[130px] text-slate-800 dark:text-slate-100"
            >
              {VENUE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v === 'all' ? 'All venues' : v}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleExport()}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Export…' : 'Export Excel'}
            </button>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleExport(selectedIds)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium bg-emerald-700/90 text-white hover:bg-emerald-800"
              >
                <Download className="w-3.5 h-3.5" />
                Export selected ({selectedIds.length})
              </button>
            )}
            <span className="text-[12px] text-slate-400 dark:text-slate-500 ml-auto">
              {articles.length} article{articles.length !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/query?articles=${encodeURIComponent(selectedIds.join(','))}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => navigate(queryWithGen(selectedIds, 'summarize'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-500"
              >
                <FileText className="w-3.5 h-3.5" />
                Summarize
              </button>
              <button
                type="button"
                onClick={() => navigate(queryWithGen(selectedIds, 'litreview'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <BookMarked className="w-3.5 h-3.5" />
                Literature review
              </button>
              <button
                type="button"
                onClick={() => navigate(queryWithGen(selectedIds, 'introabs'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-violet-600 text-white hover:bg-violet-700"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Intro + abstract
              </button>
              <button
                type="button"
                onClick={() => setChatPick(new Set())}
                className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-800 dark:text-red-200 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-700 dark:text-red-200 font-medium text-xs">
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !error && articles.length === 0 ? (
          <div className="text-center py-24 text-slate-400 dark:text-slate-500">
            <p className="text-lg font-semibold">No articles found</p>
            <p className="text-sm mt-1">Upload PDFs from the Upload page to get started.</p>
          </div>
        ) : !error ? (
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="pl-4 pr-1 py-3 w-10 text-left font-semibold" title="Select for batch actions">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-6 py-3 text-left font-semibold">Title</th>
                <th className="px-3 py-3 text-left font-semibold w-20">Year</th>
                <th className="px-3 py-3 text-left font-semibold w-28">Venue</th>
                <th className="px-4 py-3 text-left font-semibold">Parsed</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {articles.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/library/article/${a.id}`)}
                  className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                >
                  <td
                    className="pl-4 pr-1 py-3.5 w-10 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={chatPick.has(a.id)}
                      onChange={() => {
                        setChatPick((prev) => {
                          const next = new Set(prev)
                          if (next.has(a.id)) next.delete(a.id)
                          else next.add(a.id)
                          return next
                        })
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 mt-1"
                      aria-label={`Select ${a.title || a.pdf_path || a.id}`}
                    />
                  </td>
                  <td className="px-6 py-3.5 max-w-md">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 line-clamp-1">{a.title || a.pdf_path || a.id}</p>
                    {a.abstract && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">{a.abstract}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/query?articles=${encodeURIComponent(a.id)}`)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(queryWithGen([a.id], 'summarize'))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <FileText className="w-3 h-3" />
                        Summarize
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(queryWithGen([a.id], 'litreview'))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <BookMarked className="w-3 h-3" />
                        Lit review
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(queryWithGen([a.id], 'introabs'))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/40"
                      >
                        <Sparkles className="w-3 h-3" />
                        Intro + abstract
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-slate-600 dark:text-slate-300 tabular-nums">{a.year ?? '—'}</td>
                  <td className="px-3 py-3.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="block font-medium capitalize">{a.venue_type || '—'}</span>
                    {a.venue_name && <span className="line-clamp-2 text-slate-400 dark:text-slate-500">{a.venue_name}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {a.parsed_at ? new Date(a.parsed_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
