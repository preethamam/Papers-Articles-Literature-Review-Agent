import { useState } from 'react'
import { getPaperAbstract, type StructuredAbstract } from '@/lib/api'

export function usePaperAbstract() {
  const [abstract, setAbstract] = useState<StructuredAbstract | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async (paperId: string, forceRegenerate = false) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getPaperAbstract(paperId, forceRegenerate)
      setAbstract(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate abstract')
    } finally {
      setLoading(false)
    }
  }

  return { abstract, loading, error, generate, clear: () => setAbstract(null) }
}

export interface SynthesisOptions {
  n_results?: number
  style?: 'background' | 'survey' | 'introduction'
}

export interface CitedPaper {
  paper_id: string
  title: string
  year?: number
  category: string
  relevance?: number
}

export function useSynthesis() {
  const [text, setText] = useState('')
  const [citedPapers, setCitedPapers] = useState<CitedPaper[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const synthesize = (query: string, opts: SynthesisOptions = {}) => {
    setText('')
    setCitedPapers([])
    setError(null)
    setIsStreaming(true)

    fetch('/api/abstract/synthesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        n_results: opts.n_results ?? 10,
        style: opts.style ?? 'background',
      }),
    })
      .then(async (res) => {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue
            const raw = part.slice(6).trim()
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw)
              if (parsed.token) setText((prev) => prev + parsed.token)
              if (parsed.cited_papers) setCitedPapers(parsed.cited_papers)
            } catch { /* ignore */ }
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsStreaming(false))
  }

  return { text, citedPapers, isStreaming, error, synthesize, clear: () => { setText(''); setCitedPapers([]) } }
}
