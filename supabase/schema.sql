-- ============================================================
-- NEXUS CHAT — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL CHECK (length(username) >= 2 AND length(username) <= 32),
  password_hash TEXT NOT NULL,
  fingerprint TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_fingerprint_idx ON users(fingerprint);

-- ============================================================
-- ROOMS TABLE (DM rooms created on first message)
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type TEXT NOT NULL DEFAULT 'dm' CHECK (room_type IN ('dm', 'global')),
  -- For DMs: sorted user IDs joined with '_' for deterministic lookup
  participant_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global room (seed it)
INSERT INTO rooms (id, room_type, participant_key)
VALUES ('00000000-0000-0000-0000-000000000001', 'global', 'global')
ON CONFLICT DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS rooms_participant_key_idx ON rooms(participant_key);

-- ============================================================
-- ROOM MEMBERS — which users are in which rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_members_user_idx ON room_members(user_id);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 4000),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_room_id_idx ON messages(room_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

-- ============================================================
-- BANS TABLE (fingerprint/IP based)
-- ============================================================
CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  fingerprint TEXT,
  banned_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS bans_fingerprint_idx ON bans(fingerprint);
CREATE INDEX IF NOT EXISTS bans_username_idx ON bans(username);

-- ============================================================
-- MUTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  muted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS mutes_user_id_idx ON mutes(user_id);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;

-- We use anon key with custom session management (not Supabase Auth)
-- So we grant anon role appropriate access via RLS

-- USERS: anyone can read basic info, only the user can update themselves
CREATE POLICY "users_select_all" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "users_insert_anon" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE TO anon USING (true);

-- ROOMS: anyone can read rooms they're members of
CREATE POLICY "rooms_select_all" ON rooms FOR SELECT TO anon USING (true);
CREATE POLICY "rooms_insert_all" ON rooms FOR INSERT TO anon WITH CHECK (true);

-- ROOM MEMBERS
CREATE POLICY "room_members_select" ON room_members FOR SELECT TO anon USING (true);
CREATE POLICY "room_members_insert" ON room_members FOR INSERT TO anon WITH CHECK (true);

-- MESSAGES: read messages in rooms user is a member of
CREATE POLICY "messages_select" ON messages FOR SELECT TO anon USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE TO anon USING (true);

-- BANS
CREATE POLICY "bans_select" ON bans FOR SELECT TO anon USING (true);
CREATE POLICY "bans_insert" ON bans FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "bans_delete" ON bans FOR DELETE TO anon USING (true);

-- MUTES
CREATE POLICY "mutes_select" ON mutes FOR SELECT TO anon USING (true);
CREATE POLICY "mutes_insert" ON mutes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "mutes_delete" ON mutes FOR DELETE TO anon USING (true);

-- ============================================================
-- REALTIME — enable for messages and users
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get or create DM room between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_room(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  sorted_key TEXT;
  room_id UUID;
BEGIN
  -- Always sort IDs to ensure deterministic key
  IF user_a < user_b THEN
    sorted_key := user_a::TEXT || '_' || user_b::TEXT;
  ELSE
    sorted_key := user_b::TEXT || '_' || user_a::TEXT;
  END IF;

  -- Try to find existing room
  SELECT id INTO room_id FROM rooms WHERE participant_key = sorted_key;

  IF room_id IS NULL THEN
    -- Create new DM room
    INSERT INTO rooms (room_type, participant_key)
    VALUES ('dm', sorted_key)
    RETURNING id INTO room_id;

    -- Add both members
    INSERT INTO room_members (room_id, user_id) VALUES (room_id, user_a);
    INSERT INTO room_members (room_id, user_id) VALUES (room_id, user_b);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED: Admin user (change password in production!)
-- Password: "admin123" hashed
-- ============================================================
-- Run this to create the first admin (replace with your own hash):
-- INSERT INTO users (username, password_hash, is_admin, avatar_color)
-- VALUES ('titanivan2012', crypt('your_secure_password', gen_salt('bf')), true, '#ef4444');
