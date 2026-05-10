import MessageList from './MessageList'
import MessageInput from './MessageInput'
import useStore from '../../store'

export default function ChatArea() {
  const { currentRoomName, currentRoomType, dmPartnerName, toggleSidebar } = useStore((s) => ({
    currentRoomName: s.currentRoomName,
    currentRoomType: s.currentRoomType,
    dmPartnerName: s.dmPartnerName,
    toggleSidebar: s.toggleSidebar,
  }))

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="sidebar-toggle" onClick={toggleSidebar} title="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="room-info">
            {currentRoomType === 'global' ? (
              <span className="room-icon">🌐</span>
            ) : (
              <span className="room-icon dm-icon">@</span>
            )}
            <div>
              <h2 className="room-name">
                {currentRoomType === 'global' ? 'Global Chat' : dmPartnerName}
              </h2>
              <p className="room-sub">
                {currentRoomType === 'global'
                  ? 'Everyone can see messages here'
                  : 'Private conversation'}
              </p>
            </div>
          </div>
        </div>

        <div className="chat-header-right">
          <div className="realtime-indicator">
            <span className="rt-dot" />
            Live
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList />

      {/* Input */}
      <MessageInput />
    </div>
  )
}
