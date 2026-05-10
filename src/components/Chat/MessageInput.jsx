import { useState, useRef, useCallback } from 'react'
import { useMessages } from '../../hooks/useMessages'
import useStore from '../../store'

export default function MessageInput() {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)
  const currentUser = useStore((s) => s.currentUser)
  const { sendMessage } = useMessages()

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content || sending) return

    if (currentUser?.is_muted) {
      setError('You are muted and cannot send messages.')
      return
    }

    setSending(true)
    setError('')

    try {
      await sendMessage(content)
      setText('')
      textareaRef.current?.focus()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }, [text, sending, currentUser, sendMessage])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput(e) {
    setText(e.target.value)
    // Auto-resize textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }

  return (
    <div className="input-area">
      {error && (
        <div className="input-error">
          <span>⚠</span> {error}
        </div>
      )}
      <div className="input-box">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={currentUser?.is_muted ? 'You are muted...' : 'Send a message... (Enter to send)'}
          rows={1}
          maxLength={4000}
          disabled={sending || currentUser?.is_muted}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          title="Send (Enter)"
        >
          {sending ? (
            <span className="spinner-sm" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
      <div className="input-hint">
        <span>Shift+Enter for new line</span>
        {text.length > 3500 && (
          <span className={text.length > 3900 ? 'char-warn' : ''}>{text.length}/4000</span>
        )}
      </div>
    </div>
  )
}
