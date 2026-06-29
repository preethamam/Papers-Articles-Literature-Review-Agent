import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store'

export type UsePromptHistoryOptions = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showDropdown?: boolean
}

export function usePromptHistory({
  value,
  onChange,
  disabled = false,
  showDropdown = false,
}: UsePromptHistoryOptions) {
  const promptHistory = useAppStore((s) => s.promptHistory)
  const [historyIndex, setHistoryIndex] = useState(-1)
  const draftRef = useRef('')
  const programmaticRef = useRef(false)
  const [liveMessage, setLiveMessage] = useState('')

  const resetHistoryBrowse = useCallback(() => {
    setHistoryIndex(-1)
    draftRef.current = ''
  }, [])

  useEffect(() => {
    if (value === '') {
      resetHistoryBrowse()
    }
  }, [value, resetHistoryBrowse])

  const setFromHistory = useCallback(
    (text: string, index: number) => {
      programmaticRef.current = true
      onChange(text)
      setHistoryIndex(index)
      setLiveMessage(`Recalled prompt ${index + 1} of ${promptHistory.length}`)
    },
    [onChange, promptHistory.length],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (disabled || showDropdown || promptHistory.length === 0) return false

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (historyIndex === -1) {
          draftRef.current = value
          setFromHistory(promptHistory[0], 0)
        } else if (historyIndex < promptHistory.length - 1) {
          setFromHistory(promptHistory[historyIndex + 1], historyIndex + 1)
        }
        return true
      }

      if (e.key === 'ArrowDown') {
        if (historyIndex === -1) return false
        e.preventDefault()
        if (historyIndex > 0) {
          setFromHistory(promptHistory[historyIndex - 1], historyIndex - 1)
        } else {
          programmaticRef.current = true
          onChange(draftRef.current)
          resetHistoryBrowse()
          setLiveMessage('Restored draft')
        }
        return true
      }

      return false
    },
    [
      disabled,
      showDropdown,
      promptHistory,
      historyIndex,
      value,
      onChange,
      setFromHistory,
      resetHistoryBrowse,
    ],
  )

  const noteUserEdit = useCallback(() => {
    if (programmaticRef.current) {
      programmaticRef.current = false
      return
    }
    resetHistoryBrowse()
  }, [resetHistoryBrowse])

  return {
    promptHistory,
    historyIndex,
    handleKeyDown,
    noteUserEdit,
    resetHistoryBrowse,
    liveMessage,
  }
}
