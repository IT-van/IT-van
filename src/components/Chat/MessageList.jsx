import { useEffect, useRef } from 'react'
import Message from './Message'
import useStore from '../../store'

function isSameDay(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return da.toDateString() === db.toDateString()
}

function shouldGroupWithPrev(msg, prev) {
  if (!prev) return false
  if (msg.sender_id !== prev.sender_id) return false
  // Group if within 5 minutes
  const diff = new Date(msg.created_at) - new Date(prev.created_at)
  return diff < 5 * 60 * 1000
}

export default function MessageList() {
  const { messages, isLoadingMessages } = useStore((s) => ({
    messages: s.messages,
    isLoadingMessages: s.isLoadingMessages,
  }))

  const bottomRef = useRef(null)
  const listRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Scroll to bottom on room change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [useStore.getState().currentRoomId])

  if (isLoadingMessages) {
    return (
      <div className="msg-list msg-list-loading">
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="msg-list msg-list-empty">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>No messages yet. Say hello!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="msg-list" ref={listRef}>
      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : null
        const grouped = shouldGroupWithPrev(msg, prev)
        const showDate = !prev || !isSameDay(msg.created_at, prev.created_at)

        return (
          <Message
            key={msg.id}
            message={msg}
            showAvatar={!grouped}
            showDate={showDate}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
