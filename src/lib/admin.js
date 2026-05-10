import { supabase } from './supabase'

// Parse admin command: @admin <adminUsername> <action> <targetUsername>
export function parseAdminCommand(input) {
  const pattern = /^@admin\s+(\S+)\s+(ban|unban|delete|mute|unmute)\s+(\S+)$/i
  const match = input.match(pattern)
  if (!match) return null
  return {
    adminUsername: match[1],
    action: match[2].toLowerCase(),
    targetUsername: match[3],
  }
}

// Execute parsed admin command
export async function executeAdminCommand(parsed, currentUser) {
  if (!currentUser?.is_admin) {
    return { success: false, message: '⛔ Access denied. Admin privileges required.' }
  }

  if (parsed.adminUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
    return { success: false, message: '⛔ Username mismatch.' }
  }

  const { action, targetUsername } = parsed

  // Get target user
  const { data: target, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', targetUsername)
    .maybeSingle()

  if (error) return { success: false, message: `Error: ${error.message}` }

  switch (action) {
    case 'ban':
      return await banUser(target, targetUsername, currentUser.id)
    case 'unban':
      return await unbanUser(target, targetUsername)
    case 'delete':
      return await deleteUser(target, targetUsername)
    case 'mute':
      return await muteUser(target, targetUsername, currentUser.id)
    case 'unmute':
      return await unmuteUser(target, targetUsername)
    default:
      return { success: false, message: `Unknown action: ${action}` }
  }
}

async function banUser(target, username, adminId) {
  if (!target) {
    // Ban by username even if user doesn't exist (block future signups)
    await supabase.from('bans').insert({
      username,
      banned_by: adminId,
      reason: 'Admin ban',
    })
    return { success: true, message: `✅ ${username} banned (user not found, username blocked).` }
  }

  // Ban user + record fingerprint ban
  const { error: userError } = await supabase
    .from('users')
    .update({ is_banned: true })
    .eq('id', target.id)

  if (userError) return { success: false, message: userError.message }

  await supabase.from('bans').insert({
    user_id: target.id,
    username: target.username,
    fingerprint: target.fingerprint,
    banned_by: adminId,
    reason: 'Admin ban',
  })

  return { success: true, message: `✅ ${username} has been banned. Device fingerprint blocked.` }
}

async function unbanUser(target, username) {
  await supabase.from('bans').delete().eq('username', username)

  if (target) {
    await supabase.from('users').update({ is_banned: false }).eq('id', target.id)
    if (target.fingerprint) {
      await supabase.from('bans').delete().eq('fingerprint', target.fingerprint)
    }
  }

  return { success: true, message: `✅ ${username} has been unbanned.` }
}

async function deleteUser(target, username) {
  if (!target) return { success: false, message: `User "${username}" not found.` }

  const { error } = await supabase.from('users').delete().eq('id', target.id)
  if (error) return { success: false, message: error.message }

  return { success: true, message: `✅ Account "${username}" permanently deleted.` }
}

async function muteUser(target, username, adminId) {
  if (!target) return { success: false, message: `User "${username}" not found.` }

  await supabase.from('users').update({ is_muted: true }).eq('id', target.id)
  await supabase.from('mutes').insert({
    user_id: target.id,
    username: target.username,
    muted_by: adminId,
  })

  return { success: true, message: `✅ ${username} has been muted.` }
}

async function unmuteUser(target, username) {
  if (!target) return { success: false, message: `User "${username}" not found.` }

  await supabase.from('users').update({ is_muted: false }).eq('id', target.id)
  await supabase.from('mutes').delete().eq('user_id', target.id)

  return { success: true, message: `✅ ${username} has been unmuted.` }
}
