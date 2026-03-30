import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { useArticles } from '@/hooks/useArticles'

export default function Library() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { articles, loading, error, refetch } = useArticles({
    search: search || undefined,
    sort: 'parsed_at',
    order: 'desc',
  })

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            />
          </div>
          <span className="text-[12px] text-slate-400 ml-auto">{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-medium text-xs">
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !error && articles.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-lg font-semibold">No articles found</p>
            <p className="text-sm mt-1">Upload PDFs from the Upload page to get started.</p>
          </div>
        ) : !error ? (
          <table className="w-full">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Parsed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {articles.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/library/article/${a.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-3.5 max-w-md">
                    <p className="text-[13px] font-medium text-slate-800 line-clamp-1">{a.title || a.pdf_path || a.id}</p>
                    {a.abstract && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{a.abstract}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-500 whitespace-nowrap">
                    {a.parsed_at ? new Date(a.parsed_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
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
