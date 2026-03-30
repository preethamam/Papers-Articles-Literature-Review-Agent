import { useState } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { parseArticleBatch } from '@/lib/api'
import { useArticles } from '@/hooks/useArticles'

type FileStatus = 'pending' | 'parsing' | 'done' | 'error'

interface FileItem {
  file: File
  status: FileStatus
  error?: string
}

export default function Upload() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const { refetch } = useArticles()

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const pdfs = [...list].filter((f) => f.type === 'application/pdf')
    setFiles((prev) => [
      ...prev,
      ...pdfs.map((file) => ({ file, status: 'pending' as FileStatus })),
    ])
  }

  const setFileStatusByName = (filename: string, status: FileStatus, error?: string) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.file.name === filename ? { ...item, status, error } : item
      )
    )
  }

  const parseAll = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (pending.length === 0) return
    setParsing(true)
    try {
      await parseArticleBatch(
        pending.map((f) => f.file),
        (ev) => {
          if (ev.event === 'progress' && ev.filename != null) {
            setFileStatusByName(
              ev.filename,
              ev.status === 'done' ? 'done' : ev.status === 'error' ? 'error' : 'parsing',
              ev.error
            )
          }
        }
      )
      refetch()
    } finally {
      setParsing(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const hasPending = files.some((f) => f.status === 'pending')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <UploadIcon className="w-6 h-6 text-violet-500" />
          Upload PDFs
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Drop research paper PDFs here. They will be parsed with GROBID and added to your library.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center transition-colors
          ${dragging ? 'border-violet-500 bg-violet-50/50' : 'border-slate-200 bg-slate-50/50'}
        `}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          id="pdf-input"
          onChange={(e) => addFiles(e.target.files)}
        />
        <label htmlFor="pdf-input" className="cursor-pointer block">
          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium">Drop PDFs here or click to browse</p>
          <p className="text-slate-400 text-sm mt-1">GROBID must be running (see Settings)</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[13px] font-medium text-slate-700">{files.length} file(s)</span>
            <button
              onClick={parseAll}
              disabled={!hasPending || parsing}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-[13px] font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Parse all
            </button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {files.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{item.file.name}</p>
                  {item.error && (
                    <p className="text-[12px] text-red-600 mt-0.5">{item.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'pending' && (
                    <span className="text-[11px] text-slate-400">Pending</span>
                  )}
                  {item.status === 'parsing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="text-slate-400 hover:text-slate-600 text-[12px]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.some((f) => f.status === 'done') && (
        <p className="mt-4 text-[13px] text-emerald-600">
          Parsed articles are in the Library. Open any to run metadata extraction or summaries.
        </p>
      )}
    </div>
  )
}
