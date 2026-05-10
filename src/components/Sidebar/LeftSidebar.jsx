import { useState } from 'react'
import useStore from '../../store'
import { logout } from '../../lib/auth'
import { getOrCreateDMRoom, GLOBAL_ROOM_ID } from '../../lib/messages'
import AdminTerminal from '../Terminal/AdminTerminal'

export default function LeftSidebar({ onLogout }) {
  const { currentUser, currentRoomId, setCurrentRoom, dmRooms, isSidebarOpen } = useStore((s) => ({
    currentUser: s.currentUser,
    currentRoomId: s.currentRoomId,
    setCurrentRoom: s.setCurrentRoom,
    dmRooms: s.dmRooms,
    isSidebarOpen: s.isSidebarOpen,
  }))

  const [showTerminal, setShowTerminal] = useState(false)

  function handleLogout() {
    logout()
    onLogout()
  }

  function goGlobal() {
    setCurrentRoom({
      roomId: GLOBAL_ROOM_ID,
      roomName: '# global',
      roomType: 'global',
    })
  }

  return (
    <aside className={`left-sidebar ${isSidebarOpen ? '' : 'sidebar-hidden'}`}>
      {/* Branding */}
      <div className="sidebar-brand">
        <div className="brand-icon">N</div>
        <span className="brand-name">Nexus</span>
      </div>

      {/* User profile */}
      <div className="profile-card">
        <div
          className="profile-avatar"
          style={{ background: currentUser?.avatar_color }}
        >
          {currentUser?.username?.[0]?.toUpperCase()}
          {currentUser?.is_admin && <span className="admin-crown">♛</span>}
        </div>
        <div className="profile-info">
          <span className="profile-name">{currentUser?.username}</span>
          <span className="profile-role">
            {currentUser?.is_admin ? '👑 Admin' : '◉ Online'}
          </span>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>

      {/* Channels */}
      <nav className="channel-nav">
        <div className="nav-section-label">Channels</div>
        <button
          className={`channel-item ${currentRoomId === GLOBAL_ROOM_ID ? 'active' : ''}`}
          onClick={goGlobal}
        >
          <span className="ch-hash">#</span>
          <span>global</span>
        </button>
      </nav>

      {/* DM list */}
      {dmRooms.length > 0 && (
        <nav className="channel-nav">
          <div className="nav-section-label">Direct Messages</div>
          {dmRooms.map((dm) => (
            <button
              key={dm.room_id}
              className={`channel-item dm-item ${currentRoomId === dm.room_id ? 'active' : ''}`}
              onClick={() =>
                setCurrentRoom({
                  roomId: dm.room_id,
                  roomName: `DM with ${dm.partnerName}`,
                  roomType: 'dm',
                  dmPartnerId: dm.partnerId,
                  dmPartnerName: dm.partnerName,
                })
              }
            >
              <div
                className="dm-dot"
                style={{ background: dm.partnerColor || '#6366f1' }}
              />
              <span>{dm.partnerName}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Admin terminal toggle */}
      {currentUser?.is_admin && (
        <button
          className={`terminal-toggle ${showTerminal ? 'active' : ''}`}
          onClick={() => setShowTerminal(!showTerminal)}
        >
          <span className="terminal-icon">⌨</span>
          Admin Terminal
          <span className={`chevron ${showTerminal ? 'open' : ''}`}>›</span>
        </button>
      )}

      {/* Admin Terminal */}
      {showTerminal && currentUser?.is_admin && (
        <AdminTerminal />
      )}
    </aside>
  )
}
