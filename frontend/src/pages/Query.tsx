import { useRef, useState, useEffect } from 'react'
import { Send, StopCircle, Trash2, MessageSquare, Sparkles } from 'lucide-react'
import { useAppStore, type ChatMessage } from '@/store'
import { useStreamQuery } from '@/hooks/useStreamQuery'
import { cn } from '@/lib/utils'
import MarkdownContent from '@/components/MarkdownContent'

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  )
}

function MessageBubble({ role, content, sources }: {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatMessage['sources']
}) {
  return (
    <div className={cn('flex animate-fade-in-up', role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
          role === 'user'
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm whitespace-pre-wrap'
            : 'bg-white border border-slate-200/60 text-slate-700 shadow-card',
        )}
      >
        {content ? (
          role === 'assistant' ? (
            <MarkdownContent content={content} />
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )
        ) : (
          <TypingIndicator />
        )}
        {sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sources</p>
            {sources.map((s: { title: string; year?: number; chunk: string; relevance?: number }, i: number) => (
              <div key={i} className="text-[12px] text-slate-500 bg-slate-50 rounded-lg p-2.5">
                <p className="font-medium text-slate-700 truncate">{s.title} {s.year ? `(${s.year})` : ''}</p>
                <p className="line-clamp-2 mt-0.5">{s.chunk}</p>
                {s.relevance != null && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.relevance * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums">{(s.relevance * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Query() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { chatHistory, clearChat } = useAppStore()
  const { sendMessage, isStreaming, stop } = useStreamQuery()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Query
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-slate-100/50">
        {chatHistory.length === 0 && (
          <div className="text-center mt-24 animate-fade-in-up">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-glow">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
            <p className="text-xl font-bold text-slate-800 tracking-tight">Ask anything about the corpus</p>
            <p className="text-[14px] mt-2 text-slate-400 max-w-md mx-auto">
              e.g. "Which papers use LiDAR for 3D pavement crack detection?"
            </p>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} sources={msg.sources} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200/60 bg-white/80 backdrop-blur-sm p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Ask a research question… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all placeholder:text-slate-400"
          />
          <button
            onClick={isStreaming ? stop : handleSend}
            disabled={!isStreaming && !input.trim()}
            className={cn(
              'px-4 py-2 rounded-xl text-white font-medium text-sm transition-all duration-200 self-end shadow-sm',
              isStreaming
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-glow disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none',
            )}
          >
            {isStreaming ? <StopCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
