# Nexus Chat 🔮

> Anonymous · Realtime · Free · No email or phone required

A production-ready realtime chat app built with React, Supabase, and Zustand. Discord/Telegram-inspired UI with dark glassmorphism aesthetics.

## Features

- 🔐 **Anonymous auth** — username + password only, no email, no phone
- 💬 **Realtime messaging** — Supabase realtime subscriptions per room
- 🌐 **Global chat** — public channel everyone joins automatically
- 📩 **Private DMs** — created on first message, isolated per pair
- 👑 **Admin terminal** — embedded in sidebar, not a separate page
- 🚫 **Ban/mute system** — blocks by username + device fingerprint
- 🎨 **Dark glassmorphism UI** — neon accents, smooth animations
- 📱 **Responsive** — works on mobile and desktop

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Realtime) |
| Auth | Custom (no Supabase Auth) |
| Hosting | Vercel (free tier) |
| DB | Supabase free tier |

---

## Project Structure

```
nexus-chat/
├── src/
│   ├── components/
│   │   ├── Auth/AuthScreen.jsx        # Login/register UI
│   │   ├── Chat/
│   │   │   ├── ChatArea.jsx           # Main chat container
│   │   │   ├── Message.jsx            # Individual message + date sep
│   │   │   ├── MessageInput.jsx       # Text input with send button
│   │   │   └── MessageList.jsx        # Virtualized message list
│   │   ├── Sidebar/
│   │   │   ├── LeftSidebar.jsx        # Profile + channels + terminal
│   │   │   └── RightSidebar.jsx       # Online users + DM button
│   │   └── Terminal/AdminTerminal.jsx # Embedded admin terminal
│   ├── hooks/
│   │   ├── useMessages.js             # Fetch + realtime + send
│   │   └── useUsers.js                # Online users with realtime
│   ├── lib/
│   │   ├── admin.js                   # Admin command parser/executor
│   │   ├── auth.js                    # Login/register/session
│   │   ├── fingerprint.js             # Browser fingerprinting
│   │   ├── messages.js                # DB queries + subscriptions
│   │   └── supabase.js                # Supabase client
│   ├── store/index.js                 # Zustand global store
│   ├── App.jsx                        # Root component
│   ├── main.jsx                       # Entry point
│   └── index.css                      # All styles (dark theme)
├── supabase/schema.sql                # Full DB schema + RLS
├── vercel.json                        # Vercel deploy config
└── .env.example                       # Environment variables template
```

---

## Deploy Guide

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **"New Project"**, name it `nexus-chat`
3. Wait for the project to initialize (~2 min)
4. Go to **SQL Editor** → **New Query**
5. Copy the entire contents of `supabase/schema.sql` and paste it, then **Run**

**Get your credentials:**
- Go to **Settings** → **API**
- Copy `Project URL` → this is your `VITE_SUPABASE_URL`
- Copy `anon public` key → this is your `VITE_SUPABASE_ANON_KEY`

**Create your admin account:**
Run this in the SQL editor (change the username and password!):
```sql
INSERT INTO users (username, password_hash, is_admin, avatar_color)
SELECT 
  'titanivan2012',
  -- You'll need to run the app first and register with this username,
  -- then manually set is_admin = true:
  password_hash,
  true,
  '#ef4444'
FROM users WHERE username = 'titanivan2012';
-- OR just register normally then:
UPDATE users SET is_admin = true WHERE username = 'titanivan2012';
```

**Easiest admin setup:**
1. Deploy the app
2. Register with your chosen admin username (e.g. `titanivan2012`)
3. Go to Supabase → **Table Editor** → `users`
4. Find your user → set `is_admin = true`

**Enable Realtime:**
- Go to **Database** → **Replication**
- Make sure `messages`, `users`, `room_members` are in the publication
  (The schema.sql does this automatically, but verify)

---

### Step 2: Local Development

```bash
# Clone / download the project
cd nexus-chat

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
nano .env.local

# Start dev server
npm run dev
# → Open http://localhost:3000
```

---

### Step 3: Deploy to Vercel

#### Option A: Vercel CLI (Fastest)

```bash
# Install Vercel CLI
npm i -g vercel

# Inside the project folder:
vercel

# Follow prompts:
# - Link to existing project? N
# - Project name: nexus-chat
# - Root: ./
# - Build command: npm run build
# - Output dir: dist

# Set environment variables:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production:
vercel --prod
```

#### Option B: Vercel Dashboard (No CLI)

1. Push your code to GitHub (make sure `.env.local` is in `.gitignore` ✅)
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Framework: **Vite** (auto-detected)
5. Add environment variables:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
6. Click **Deploy**

Vercel will auto-deploy on every `git push` to main.

---

## Admin Terminal Usage

The admin terminal is embedded in the left sidebar (only visible to admins).

**Available commands:**

```bash
# Ban a user (blocks their account + device fingerprint)
@admin titanivan2012 ban baduser

# Unban a user
@admin titanivan2012 unban baduser

# Mute a user (can't send messages)
@admin titanivan2012 mute spammer

# Unmute a user
@admin titanivan2012 unmute spammer

# Delete an account permanently
@admin titanivan2012 delete baduser

# Show help
help

# Clear terminal
clear
```

> Replace `titanivan2012` with your admin username.

---

## Realtime Architecture

Nexus Chat uses **room-scoped subscriptions** to avoid global message flooding:

```js
// Subscribes only to the current room's messages
supabase
  .channel(`room-${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.${roomId}`,  // ← critical filter
  }, handler)
  .subscribe()

// Cleanup on room change or unmount
supabase.removeChannel(channel)
```

**Optimistic updates** are applied immediately and replaced with server data on confirmation.

---

## Security Notes

- **RLS** is enabled on all tables — even if someone gets your anon key, they can only perform allowed operations
- **Password hashing** uses SHA-256 with random salt (client-side, as Supabase auth is not used)
- **Device fingerprinting** combines canvas, WebGL, screen, timezone, and browser signals for ban evasion resistance
- **Admin commands** verify the calling user's `is_admin` flag server-side before executing

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---------|-----------|-------|
| Supabase DB | 500MB | Plenty for chat |
| Supabase Realtime | 200 concurrent | ~200 online users |
| Supabase Bandwidth | 5GB/month | Very generous |
| Vercel Hosting | Unlimited | Free forever |
| Vercel Bandwidth | 100GB/month | Very generous |

---

## License

MIT — free to use, modify, deploy.
