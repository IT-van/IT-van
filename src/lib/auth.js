import { supabase } from './supabase'
import { getFingerprint } from './fingerprint'

const SESSION_KEY = 'nx_session'

// Generate random avatar color from a curated palette
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
]

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

// Simple client-side password hashing (bcrypt is server-side only)
// We use SHA-256 with a salt prefix stored alongside
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const msgBuffer = new TextEncoder().encode(saltHex + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password, stored) {
  const [saltHex, storedHash] = stored.split(':')
  const msgBuffer = new TextEncoder().encode(saltHex + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === storedHash
}

export async function register(username, password) {
  if (!username || username.length < 2) throw new Error('Username must be at least 2 characters')
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters')

  const fingerprint = await getFingerprint()

  // Check fingerprint ban
  const { data: ban } = await supabase
    .from('bans')
    .select('id')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (ban) throw new Error('Your device has been banned from Nexus Chat.')

  // Check username taken
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing) throw new Error('Username already taken.')

  const password_hash = await hashPassword(password)

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash,
      fingerprint,
      avatar_color: randomColor(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const session = { userId: user.id, username: user.username }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))

  return user
}

export async function login(username, password) {
  const fingerprint = await getFingerprint()

  // Check fingerprint ban
  const { data: ban } = await supabase
    .from('bans')
    .select('id')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (ban) throw new Error('Your device has been banned from Nexus Chat.')

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error || !user) throw new Error('User not found.')
  if (user.is_banned) throw new Error('This account has been banned.')

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) throw new Error('Incorrect password.')

  // Update fingerprint and last_seen
  await supabase
    .from('users')
    .update({ fingerprint, last_seen: new Date().toISOString() })
    .eq('id', user.id)

  const session = { userId: user.id, username: user.username }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))

  return user
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function fetchCurrentUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

// Update last seen periodically
export async function pingLastSeen(userId) {
  await supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId)
}
