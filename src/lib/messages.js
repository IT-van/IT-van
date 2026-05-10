import { supabase } from './supabase'

// Fetch last N messages for a room (with sender info)
export async function fetchMessages(roomId, limit = 80) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      is_deleted,
      sender_id,
      users!messages_sender_id_fkey (
        id,
        username,
        avatar_color,
        is_admin
      )
    `)
    .eq('room_id', roomId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

// Send a message
export async function sendMessage(roomId, senderId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, sender_id: senderId, content })
    .select(`
      id,
      content,
      created_at,
      is_deleted,
      sender_id,
      users!messages_sender_id_fkey (
        id,
        username,
        avatar_color,
        is_admin
      )
    `)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// Soft-delete a message
export async function deleteMessage(messageId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId)

  if (error) throw new Error(error.message)
}

// Get or create a DM room between two users
export async function getOrCreateDMRoom(userAId, userBId) {
  const { data, error } = await supabase
    .rpc('get_or_create_dm_room', { user_a: userAId, user_b: userBId })

  if (error) throw new Error(error.message)
  return data // returns room UUID
}

// Get all DM rooms for a user (with partner info and last message)
export async function getUserRooms(userId) {
  const { data, error } = await supabase
    .from('room_members')
    .select(`
      room_id,
      rooms!inner (
        id,
        room_type,
        participant_key,
        created_at
      )
    `)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return data || []
}

// Subscribe to a specific room's messages
export function subscribeToRoom(roomId, onInsert) {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        // Fetch the full message with sender info
        const { data } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            is_deleted,
            sender_id,
            users!messages_sender_id_fkey (
              id,
              username,
              avatar_color,
              is_admin
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (data && !data.is_deleted) {
          onInsert(data)
        }
      }
    )
    .subscribe()

  return channel
}

export function unsubscribeFromRoom(channel) {
  if (channel) {
    supabase.removeChannel(channel)
  }
}

// Global room ID constant
export const GLOBAL_ROOM_ID = '00000000-0000-0000-0000-000000000001'
