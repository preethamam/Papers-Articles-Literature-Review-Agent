import { useRef, useState } from 'react'
import { useAppStore } from '@/store'
import { sendChat } from '@/lib/api'

export function useStreamQuery() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<boolean>(false)
  const { addMessage, updateLastAssistant } = useAppStore()

  const sendMessage = (question: string, opts?: { model?: string }) => {
    if (isStreaming) return
    setIsStreaming(true)
    abortRef.current = false

    addMessage({ role: 'user', content: question })
    addMessage({ role: 'assistant', content: '' })

    sendChat(
      question,
      { model: opts?.model },
      (chunk) => { if (!abortRef.current) updateLastAssistant(chunk) },
      undefined,
      (err) => updateLastAssistant(`\n[Error: ${err}]`)
    ).finally(() => setIsStreaming(false))
  }

  const stop = () => {
    abortRef.current = true
    setIsStreaming(false)
  }

  return { sendMessage, isStreaming, stop }
}
