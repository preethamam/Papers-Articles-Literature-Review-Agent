import { useState } from 'react'
import { FlaskConical, CheckCircle2, AlertCircle, SkipForward, Loader2, RefreshCw } from 'lucide-react'
import { useIngest, type IngestEvent } from '@/hooks/useIngest'
import { cn } from '@/lib/utils'

function EventRow({ ev }: { ev: IngestEvent }) {
  const isError = ev.event === 'error'
  const isDone = ev.event === 'done'
  const isSkipped = ev.skipped

  return (
    <div className={cn(
      'flex items-start gap-2.5 py-2 px-3 rounded-lg text-[12px]',
      isDone ? 'bg-emerald-50 text-emerald-800' :
      isError ? 'bg-red-50 text-red-700' :
      isSkipped ? 'bg-slate-50 text-slate-500' :
      'text-slate-600',
    )}>
      {isDone ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> :
       isError ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" /> :
       isSkipped ? <SkipForward className="w-3.5 h-3.5 mt-0.5 shrink-0" /> :
       <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-400 shrink-0" />}
      <span className="leading-relaxed">{ev.message}</span>
    </div>
  )
}

export default function Ingest() {
  const [reprocess, setReprocess] = useState(false)
  const { events, isRunning, done, startIngest } = useIngest()

  const processed = events.filter((e) => e.event === 'progress' && !e.skipped && e.title).length
  const errors = events.filter((e) => e.event === 'error').length

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-violet-500" />
          Ingest Papers
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Process PDFs from the Articles folder using SPECTER embeddings + Claude extraction.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={reprocess}
              onChange={(e) => setReprocess(e.target.checked)}
              className="rounded"
            />
            Reprocess already-indexed papers
          </label>

          <button
            onClick={() => startIngest(reprocess)}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[13px] font-medium rounded-xl hover:shadow-glow disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none transition-all"
          >
            {isRunning
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            {isRunning ? 'Processing…' : 'Start Ingest'}
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-4 flex gap-4 text-[12px] text-slate-500">
            <span>Processed: <strong className="text-emerald-600">{processed}</strong></span>
            <span>Errors: <strong className={errors > 0 ? 'text-red-500' : 'text-slate-400'}>{errors}</strong></span>
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100 max-h-[60vh] overflow-y-auto space-y-0.5">
          {events.map((ev, i) => (
            <EventRow key={i} ev={ev} />
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 py-2 px-3 text-[12px] text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing…
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[13px] text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Ingest complete! Head to the Library to browse your papers.
        </div>
      )}
    </div>
  )
}
