import { useEffect, useCallback, useRef } from 'react'
import useStore from '../store'
import {
  fetchMessages,
  sendMessage as sendMsg,
  subscribeToRoom,
  unsubscribeFromRoom,
} from '../lib/messages'

export function useMessages() {
  const {
    currentRoomId,
    currentUser,
    messages,
    setMessages,
    addMessage,
    isLoadingMessages,
    setLoadingMessages,
  } = useStore()

  const channelRef = useRef(null)
  const roomIdRef = useRef(null)

  // Load messages when room changes
  useEffect(() => {
    if (!currentRoomId) return

    let cancelled = false

    async function load() {
      setLoadingMessages(true)
      try {
        const data = await fetchMessages(currentRoomId)
        if (!cancelled) setMessages(data)
      } catch (err) {
        console.error('Failed to fetch messages:', err)
        if (!cancelled) setMessages([])
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [currentRoomId])

  // Realtime subscription — one channel per room
  useEffect(() => {
    if (!currentRoomId) return

    // Cleanup previous channel if room changed
    if (channelRef.current && roomIdRef.current !== currentRoomId) {
      unsubscribeFromRoom(channelRef.current)
      channelRef.current = null
    }

    roomIdRef.current = currentRoomId

    const channel = subscribeToRoom(currentRoomId, (newMessage) => {
      addMessage(newMessage)
    })

    channelRef.current = channel

    return () => {
      unsubscribeFromRoom(channelRef.current)
      channelRef.current = null
    }
  }, [currentRoomId])

  const sendMessage = useCallback(
    async (content) => {
      if (!currentUser || !currentRoomId || !content.trim()) return

      // Optimistic update
      const tempId = `temp-${Date.now()}`
      const optimistic = {
        id: tempId,
        content: content.trim(),
        created_at: new Date().toISOString(),
        is_deleted: false,
        sender_id: currentUser.id,
        users: {
          id: currentUser.id,
          username: currentUser.username,
          avatar_color: currentUser.avatar_color,
          is_admin: currentUser.is_admin,
        },
      }

      addMessage(optimistic)

      try {
        const saved = await sendMsg(currentRoomId, currentUser.id, content.trim())
        // Replace optimistic message with real one
        setMessages(
          useStore.getState().messages.map((m) => (m.id === tempId ? saved : m))
        )
      } catch (err) {
        // Remove optimistic on failure
        setMessages(useStore.getState().messages.filter((m) => m.id !== tempId))
        throw err
      }
    },
    [currentUser, currentRoomId]
  )

  return { messages, isLoadingMessages, sendMessage }
}
