import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useStore from '../store'

export function useUsers() {
  const { onlineUsers, setOnlineUsers } = useStore()

  useEffect(() => {
    let cancelled = false

    // Fetch users active in last 5 minutes
    async function fetchOnline() {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('users')
        .select('id, username, avatar_color, is_admin, last_seen, is_banned')
        .gte('last_seen', cutoff)
        .eq('is_banned', false)
        .order('last_seen', { ascending: false })
        .limit(50)

      if (!cancelled && data) setOnlineUsers(data)
    }

    fetchOnline()

    // Refresh every 30s
    const interval = setInterval(fetchOnline, 30_000)

    // Subscribe to user presence changes
    const channel = supabase
      .channel('users-presence')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        () => fetchOnline()
      )
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  return { onlineUsers }
}
