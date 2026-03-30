import { useState } from 'react'
import { X, ExternalLink, Github, FileText, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePaperAbstract } from '@/hooks/useAbstract'

interface Props {
  paper: Record<string, unknown> | null
  paperId: string | null
  onClose: () => void
}

type Tab = 'overview' | 'abstract' | 'datasets' | 'code'

export default function PaperDrawer({ paper, paperId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const { abstract, loading: abLoading, generate } = usePaperAbstract()

  if (!paper || !paperId) return null

  const summaries = paper.summaries as Record<string, unknown> | undefined
  const authors = (paper.authors as Array<Record<string, unknown>>) || []
  const datasets = (paper.datasets as Array<Record<string, unknown>>) || []
  const codeResources = (paper.code_resources as Array<Record<string, unknown>>) || []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-[15px] leading-snug line-clamp-2">
              {paper.title as string}
            </h2>
            <p className="text-[12px] text-slate-400 mt-1">
              {paper.year as number}{paper.venue ? ` · ${paper.venue}` : ''}
              {paper.venue_type ? ` (${paper.venue_type})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2">
          {(['overview', 'abstract', 'datasets', 'code'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-[12px] font-medium capitalize transition-colors',
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'overview' && (
            <>
              {/* Authors */}
              {authors.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Authors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {authors.map((a, i) => (
                      <span
                        key={i}
                        className={cn(
                          'text-[12px] px-2.5 py-1 rounded-full',
                          a.is_corresponding
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {a.name as string}
                        {a.is_corresponding ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Brief summary */}
              {summaries?.brief && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Summary</p>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{summaries.brief as string}</p>
                </div>
              )}

              {/* Methods */}
              {paper.methods && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Methods</p>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{paper.methods as string}</p>
                </div>
              )}

              {/* Key Findings */}
              {paper.key_findings && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Key Findings</p>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{paper.key_findings as string}</p>
                </div>
              )}

              {/* Contributions */}
              {(paper.contributions as string[])?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Contributions</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {(paper.contributions as string[]).map((c, i) => (
                      <li key={i} className="text-[13px] text-slate-700">{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Performance */}
              {paper.performance_metrics && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Performance</p>
                  <p className="text-[13px] text-slate-700">{paper.performance_metrics as string}</p>
                </div>
              )}
            </>
          )}

          {tab === 'abstract' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Structured Abstract
                </p>
                <button
                  onClick={() => generate(paperId, !!abstract)}
                  disabled={abLoading}
                  className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {abLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  {abstract ? 'Regenerate' : 'Generate'}
                </button>
              </div>

              {!abstract && !abLoading && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>Click Generate to create a structured abstract for this paper</p>
                </div>
              )}

              {abstract && (
                <div className="space-y-4">
                  {(['objective', 'methods', 'results', 'conclusion'] as const).map((field) => (
                    <div key={field} className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 capitalize">
                        {field}
                      </p>
                      <p className="text-[13px] text-slate-700 leading-relaxed">{abstract[field]}</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 text-right">
                    Generated by Claude · {abstract.generated_at?.slice(0, 10)}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'datasets' && (
            <div>
              {datasets.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No datasets extracted</p>
              ) : (
                <div className="space-y-3">
                  {datasets.map((ds, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[13px] text-slate-800">{String(ds.name)}</p>
                        {Boolean(ds.is_open_source) && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                            Open
                          </span>
                        )}
                      </div>
                      {ds.description != null && (
                        <p className="text-[12px] text-slate-500 mt-1">{String(ds.description)}</p>
                      )}
                      {ds.url != null && (
                        <a
                          href={ds.url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[12px] text-blue-500 mt-1.5 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div>
              {codeResources.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No code resources found</p>
              ) : (
                <div className="space-y-3">
                  {codeResources.map((cr, i) => (
                    <a
                      key={i}
                      href={String(cr.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-colors"
                    >
                      <Github className="w-5 h-5 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700 capitalize">{String(cr.platform)}</p>
                        {cr.description != null && (
                          <p className="text-[12px] text-slate-500 truncate">{String(cr.description)}</p>
                        )}
                        <p className="text-[11px] text-blue-500 truncate">{String(cr.url)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
