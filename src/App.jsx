import { useState, useEffect, useRef } from 'react'
import AuthScreen from './components/Auth/AuthScreen'
import ChatArea from './components/Chat/ChatArea'
import LeftSidebar from './components/Sidebar/LeftSidebar'
import RightSidebar from './components/Sidebar/RightSidebar'
import useStore from './store'
import { getStoredSession, fetchCurrentUser, pingLastSeen } from './lib/auth'

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false)
  const { currentUser, setCurrentUser } = useStore((s) => ({
    currentUser: s.currentUser,
    setCurrentUser: s.setCurrentUser,
  }))
  const pingRef = useRef(null)

  // Restore session on load
  useEffect(() => {
    async function restore() {
      const session = getStoredSession()
      if (session?.userId) {
        const user = await fetchCurrentUser(session.userId)
        if (user && !user.is_banned) {
          setCurrentUser(user)
        }
      }
      setBootstrapped(true)
    }
    restore()
  }, [])

  // Ping last_seen every 2 minutes while active
  useEffect(() => {
    if (!currentUser) return
    pingRef.current = setInterval(() => {
      pingLastSeen(currentUser.id)
    }, 2 * 60 * 1000)
    return () => clearInterval(pingRef.current)
  }, [currentUser?.id])

  if (!bootstrapped) {
    return (
      <div className="app-loading">
        <div className="loading-logo">N</div>
      </div>
    )
  }

  if (!currentUser) {
    return <AuthScreen onAuthenticated={setCurrentUser} />
  }

  return (
    <div className="app-layout">
      <LeftSidebar onLogout={() => setCurrentUser(null)} />
      <ChatArea />
      <RightSidebar />
    </div>
  )
}
