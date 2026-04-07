import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, Sparkles, BookOpen, Library } from 'lucide-react'
import { getArticle } from '@/lib/api'
import type { ArticleWithReviews } from '@/lib/api'
import MarkdownContent from '@/components/MarkdownContent'
import { pickReviewText } from '@/lib/reviewPick'

function parseAuthorsJson(s: string | null): string[] {
  try {
    if (!s) return []
    const a = JSON.parse(s) as unknown
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function parseLinksJson(s: string | null): Array<{ url: string; kind?: string; name?: string }> {
  try {
    if (!s) return []
    const a = JSON.parse(s) as unknown
    if (!Array.isArray(a)) return []
    return a.filter(
      (x): x is { url: string; kind?: string; name?: string } =>
        x && typeof x === 'object' && typeof (x as { url?: string }).url === 'string',
    )
  } catch {
    return []
  }
}

function LlmBlock({
  title,
  subtitle,
  picked,
  emptyHint,
}: {
  title: string
  subtitle: string
  picked: { text: string; depth?: string } | null
  emptyHint: string
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-900/80 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            {title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {picked?.depth && (
          <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">{picked.depth}</span>
        )}
      </div>
      <div className="px-4 py-3 text-[13px] min-h-[3rem]">
        {picked?.text?.trim() ? (
          <MarkdownContent content={picked.text} />
        ) : (
          <p className="text-slate-400 dark:text-slate-500 text-[13px] leading-relaxed italic">{emptyHint}</p>
        )}
      </div>
    </div>
  )
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<ArticleWithReviews | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [xmlOpen, setXmlOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('No article ID')
      return
    }
    setLoading(true)
    setError(null)
    getArticle(id)
      .then(setArticle)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  const reviews = article?.reviews ?? []

  const task1 = useMemo(() => pickReviewText(reviews, 1), [reviews])
  const task2 = useMemo(() => pickReviewText(reviews, 2), [reviews])
  const task3 = useMemo(() => pickReviewText(reviews, 3), [reviews])

  const authorsList = article ? parseAuthorsJson(article.authors ?? null) : []
  const links = article ? parseLinksJson(article.links_json ?? null) : []

  const emptyLlm =
    'Not generated yet. Open this paper in the Library and run the matching action in the article drawer (models + Generate).'

  if (!id) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>
        <p className="mt-4 text-slate-500 dark:text-slate-400">No article ID.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>
        <p className="mt-4 text-slate-500 dark:text-slate-400">Loading article…</p>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>
        <p className="mt-4 text-red-600 dark:text-red-400">{error ?? 'Article not found.'}</p>
      </div>
    )
  }

  const xml = article.xml ?? null
  const hasXml = xml != null && typeof xml === 'string' && xml.trim() !== ''

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-16">
      <button
        type="button"
        onClick={() => navigate('/library')}
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 mb-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </button>

      <header className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {article.title || 'Untitled'}
        </h1>
        {authorsList.length > 0 && (
          <p className="text-[15px] text-slate-600 dark:text-slate-300">{authorsList.join(' · ')}</p>
        )}
        <div className="flex flex-wrap gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          {article.year != null && (
            <span className="font-medium text-slate-600 dark:text-slate-300">Year {article.year}</span>
          )}
          {article.venue_type && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              {article.venue_type}
            </span>
          )}
          {article.venue_name && <span className="text-slate-600 dark:text-slate-300">{article.venue_name}</span>}
          {article.pdf_path && <span className="font-mono text-[11px] opacity-90">{article.pdf_path}</span>}
        </div>
        {article.parsed_at && (
          <p className="text-[11px] text-slate-400">Parsed {new Date(article.parsed_at).toLocaleString()}</p>
        )}
      </header>

      {/* Article preview — above TEI */}
      <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-slate-50/90 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-1 shadow-lg shadow-slate-200/40 dark:shadow-none">
        <div className="rounded-[1.35rem] bg-white/90 dark:bg-slate-950/60 backdrop-blur-sm px-5 py-6 space-y-6">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold tracking-tight">Article preview</h2>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 -mt-2">
            TEI abstract and links; then intro, section summary, and literature review from cached LLM runs (same labels
            as Excel export).
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Abstract</p>
              {article.abstract?.trim() ? (
                <p className="text-[13px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {article.abstract}
                </p>
              ) : (
                <p className="text-slate-400 italic text-[13px]">No abstract extracted from TEI.</p>
              )}
            </div>

            {links.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Extracted links</p>
                <ul className="space-y-2">
                  {links.map((L, i) => (
                    <li key={`${L.url}-${i}`} className="flex flex-wrap items-baseline gap-2 text-[13px]">
                      {L.kind && (
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">{L.kind}</span>
                      )}
                      <a
                        href={L.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all inline-flex items-center gap-1"
                      >
                        {L.name || L.url}
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-1">
              <LlmBlock
                title="Intro & metadata"
                subtitle="Task 1 — overview, links, and structured metadata from the model"
                picked={task1}
                emptyHint={emptyLlm}
              />
              <LlmBlock
                title="Section summary"
                subtitle="Task 2 — paper walkthrough (depth preference: detailed → five-line → one-line)"
                picked={task2}
                emptyHint={emptyLlm}
              />
              <LlmBlock
                title="Literature review"
                subtitle="Task 3 — related work and positioning"
                picked={task3}
                emptyHint={emptyLlm}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-1">
        <Link
          to="/library"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-[13px] font-medium hover:opacity-95 transition-opacity"
        >
          <Library className="w-4 h-4" />
          Open in Library
        </Link>
        <Link
          to="/metadata"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        >
          Metadata & export
        </Link>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-100/50 dark:bg-slate-900/50">
        <button
          type="button"
          onClick={() => setXmlOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
        >
          <span className="flex items-center gap-2">
            {xmlOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Extracted TEI XML (GROBID)
          </span>
          {!hasXml && <span className="text-[11px] font-normal text-slate-400">None</span>}
        </button>
        {xmlOpen && hasXml && (
          <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 overflow-auto max-h-[70vh] whitespace-pre-wrap break-words border-t border-slate-700">
            {xml}
          </pre>
        )}
        {xmlOpen && !hasXml && (
          <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">No extracted XML. Parse the PDF from Upload.</p>
        )}
      </div>
    </div>
  )
}
