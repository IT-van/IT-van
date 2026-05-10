import { create } from 'zustand'
import { GLOBAL_ROOM_ID } from '../lib/messages'

const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  updateCurrentUser: (updates) =>
    set((state) => ({ currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null })),

  // ── Rooms ─────────────────────────────────────────────────
  currentRoomId: GLOBAL_ROOM_ID,
  currentRoomName: '# global',
  currentRoomType: 'global',
  dmPartnerId: null,
  dmPartnerName: null,

  setCurrentRoom: ({ roomId, roomName, roomType, dmPartnerId = null, dmPartnerName = null }) =>
    set({ currentRoomId: roomId, currentRoomName: roomName, currentRoomType: roomType, dmPartnerId, dmPartnerName }),

  // ── Messages ──────────────────────────────────────────────
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      // Deduplicate by ID (optimistic updates may already include it)
      const exists = state.messages.find((m) => m.id === message.id)
      if (exists) return state
      return { messages: [...state.messages, message] }
    }),
  removeOptimisticMessage: (tempId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== tempId),
    })),

  // ── Users (online list) ───────────────────────────────────
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // ── UI State ──────────────────────────────────────────────
  isLoadingMessages: false,
  setLoadingMessages: (val) => set({ isLoadingMessages: val }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // DM conversations list (rooms the user has)
  dmRooms: [],
  setDmRooms: (rooms) => set({ dmRooms: rooms }),
  addDmRoom: (room) =>
    set((state) => ({
      dmRooms: state.dmRooms.find((r) => r.room_id === room.room_id)
        ? state.dmRooms
        : [...state.dmRooms, room],
    })),
}))

export default useStore
