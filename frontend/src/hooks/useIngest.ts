import { useState } from 'react'

export interface IngestEvent {
  event: string
  message: string
  paper_id?: string
  title?: string
  chunks?: number
  skipped?: boolean
  processed?: number
  errors?: number
}

export function useIngest() {
  const [events, setEvents] = useState<IngestEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [done, setDone] = useState(false)

  const startIngest = (reprocess = false) => {
    setEvents([])
    setDone(false)
    setIsRunning(true)

    fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reprocess }),
    }).then(async (res) => {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const ev: IngestEvent = JSON.parse(part.slice(6))
            setEvents((prev) => [...prev, ev])
            if (ev.event === 'done') setDone(true)
          } catch { /* ignore */ }
        }
      }
    }).finally(() => setIsRunning(false))
  }

  return { events, isRunning, done, startIngest }
}
