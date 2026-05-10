import { useMemo } from 'react'
import useStore from '../../store'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export function DateSeparator({ date }) {
  return (
    <div className="date-sep">
      <span>{date}</span>
    </div>
  )
}

export default function Message({ message, showAvatar, showDate, prevDate }) {
  const currentUser = useStore((s) => s.currentUser)
  const isOwn = message.sender_id === currentUser?.id
  const isTemp = message.id?.startsWith('temp-')
  const sender = message.users

  return (
    <>
      {showDate && <DateSeparator date={formatDate(message.created_at)} />}

      <div className={`msg-row ${showAvatar ? 'msg-first' : ''} ${isOwn ? 'msg-own' : ''}`}>
        {/* Avatar column */}
        <div className="msg-avatar-col">
          {showAvatar ? (
            <div
              className="msg-avatar"
              style={{ background: sender?.avatar_color || '#6366f1' }}
              title={sender?.username}
            >
              {(sender?.username || '?')[0].toUpperCase()}
              {sender?.is_admin && <span className="admin-dot" />}
            </div>
          ) : (
            <span className="msg-time-hover">{formatTime(message.created_at)}</span>
          )}
        </div>

        {/* Content */}
        <div className="msg-content">
          {showAvatar && (
            <div className="msg-header">
              <span
                className="msg-username"
                style={{ color: sender?.avatar_color || '#818cf8' }}
              >
                {sender?.username || 'Unknown'}
              </span>
              {sender?.is_admin && <span className="admin-badge">ADMIN</span>}
              <span className="msg-ts">{formatTime(message.created_at)}</span>
            </div>
          )}
          <div className={`msg-text ${isTemp ? 'msg-pending' : ''}`}>
            {message.content}
          </div>
        </div>
      </div>
    </>
  )
}
