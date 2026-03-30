import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getArticle } from '@/lib/api'
import type { ArticleWithReviews } from '@/lib/api'

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<ArticleWithReviews | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (!id) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => navigate('/library')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>
        <p className="mt-4 text-slate-500">No article ID.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => navigate('/library')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>
        <p className="mt-4 text-slate-500">Loading article…</p>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => navigate('/library')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>
        <p className="mt-4 text-red-600">{error ?? 'Article not found.'}</p>
      </div>
    )
  }

  const xml = article.xml ?? null
  const hasXml = xml != null && typeof xml === 'string' && xml.trim() !== ''

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/library')}
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </button>
      <h1 className="text-xl font-bold text-slate-800 mb-1">
        {article.title || 'Untitled'}
      </h1>
      {article.pdf_path && (
        <p className="text-sm text-slate-500 mb-4">{article.pdf_path}</p>
      )}
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">
        Extracted data (TEI XML)
      </h2>
      {!hasXml ? (
        <p className="text-slate-500 py-8">No extracted XML. Parse the PDF from Upload to see content here.</p>
      ) : (
        <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-auto max-h-[75vh] whitespace-pre-wrap break-words border border-slate-200">
          {xml}
        </pre>
      )}
    </div>
  )
}
