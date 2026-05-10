import { useState } from 'react'
import { useUsers } from '../../hooks/useUsers'
import useStore from '../../store'
import { getOrCreateDMRoom } from '../../lib/messages'

function getInitial(username) {
  return (username || '?')[0].toUpperCase()
}

function timeSince(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function RightSidebar() {
  const { onlineUsers } = useUsers()
  const { currentUser, setCurrentRoom, addDmRoom } = useStore((s) => ({
    currentUser: s.currentUser,
    setCurrentRoom: s.setCurrentRoom,
    addDmRoom: s.addDmRoom,
  }))

  const [loadingDm, setLoadingDm] = useState(null)

  async function openDM(user) {
    if (user.id === currentUser?.id) return
    setLoadingDm(user.id)

    try {
      const roomId = await getOrCreateDMRoom(currentUser.id, user.id)

      const dmRoom = {
        room_id: roomId,
        partnerId: user.id,
        partnerName: user.username,
        partnerColor: user.avatar_color,
      }

      addDmRoom(dmRoom)
      setCurrentRoom({
        roomId,
        roomName: `DM with ${user.username}`,
        roomType: 'dm',
        dmPartnerId: user.id,
        dmPartnerName: user.username,
      })
    } catch (err) {
      console.error('Failed to open DM:', err)
    } finally {
      setLoadingDm(null)
    }
  }

  return (
    <aside className="right-sidebar">
      <div className="sidebar-section-header">
        <span className="online-dot" />
        Online — {onlineUsers.length}
      </div>

      <div className="user-list">
        {onlineUsers.length === 0 && (
          <p className="no-users">No one online right now</p>
        )}
        {onlineUsers.map((user) => {
          const isSelf = user.id === currentUser?.id
          const isLoading = loadingDm === user.id

          return (
            <button
              key={user.id}
              className={`user-item ${isSelf ? 'user-self' : ''}`}
              onClick={() => !isSelf && openDM(user)}
              disabled={isSelf || isLoading}
              title={isSelf ? 'You' : `DM ${user.username}`}
            >
              <div className="user-avatar-wrap">
                <div
                  className="user-avatar"
                  style={{ background: user.avatar_color }}
                >
                  {getInitial(user.username)}
                </div>
                <span className="user-online-dot" />
              </div>
              <div className="user-info">
                <span className="user-name">
                  {user.username}
                  {isSelf && <span className="you-tag"> (you)</span>}
                </span>
                {user.is_admin && <span className="user-admin-tag">admin</span>}
                <span className="user-last">{timeSince(user.last_seen)}</span>
              </div>
              {!isSelf && (
                <div className="dm-hint">
                  {isLoading ? <span className="spinner-sm" /> : '→'}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
