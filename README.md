# LiveChat SaaS 💬

**Multi-tenant live chat platform** ala LiveChat/Intercom. Master admin manages all, account owners customize, customers chat via embeddable widget.

**Stack:** Next.js 16 (App Router) + TypeScript + Supabase (PostgreSQL + Realtime + Auth) + Tailwind CSS

---

## ⚡ Quick Start (5 minutes)

### 1. Create Supabase project
- Go to [supabase.com](https://supabase.com) → New project
- Wait for it to provision (~2 min)

### 2. Run SQL files in order

Open **SQL Editor** in Supabase dashboard. Run these 5 files in this exact order:

1. **[supabase/final-schema-v5.sql](supabase/final-schema-v5.sql)** — Drop & create all tables
2. **[supabase/final-policies-v5.sql](supabase/final-policies-v5.sql)** — RLS policies (allow all)
3. **[supabase/final-triggers-v5.sql](supabase/final-triggers-v5.sql)** — Triggers (auto-profile, auto-account, auto-notify)
4. **[supabase/final-realtime-v5.sql](supabase/final-realtime-v5.sql)** — Enable realtime subscriptions
5. **[supabase/promote-master-admin.sql](supabase/promote-master-admin.sql)** — Promote your email to master_admin (edit the email first!)

### 3. Setup env

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials (from Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Test

1. **Register** at `/register` (creates user + workspace)
2. **Promote** to master admin via SQL (step 2.5)
3. **Login** → if master admin, redirects to `/master`
4. **Open widget** at `/{accountNumber}` (shown on dashboard)
5. **Send message** → bell icon shows in dashboard header

---

## 🗂️ URL Structure

### Public
| URL | Purpose |
|-----|---------|
| `/` | Landing page |
| `/login`, `/register`, `/pending-approval` | Auth |
| `/{accountNumber}` | Public chat widget (e.g. `/19854478`) |

### Master Admin (`master_admin` role)
| URL | Purpose |
|-----|---------|
| `/master` | Overview + stats + active sessions |
| `/master/accounts` | All accounts list |
| `/master/accounts/{id}` | Account detail + suspend/activate |
| `/master/chats` | All chats across all accounts |
| `/master/chats/{id}` | View/respond to any chat |
| `/master/users` | All users |

### Per-Account Dashboard (`account_owner` role + active status)
| URL | Purpose |
|-----|---------|
| `/dashboard` | Auto-redirect to first active account |
| `/dashboard/{accountNumber}/inbox` | Chat list |
| `/dashboard/{accountNumber}/inbox/{id}` | Chat detail |
| `/dashboard/{accountNumber}/traffic` | Live visitors |
| `/dashboard/{accountNumber}/automate` | Canned responses |
| `/dashboard/{accountNumber}/settings` | Settings overview |
| `/dashboard/{accountNumber}/settings/widget` | Widget customization |
| `/dashboard/{accountNumber}/settings/pre-chat` | Pre-chat form |
| `/dashboard/{accountNumber}/settings/install` | Embed code |

---

## 🎨 Features

### Core
- ✅ **Multi-tenant SaaS** — many accounts per user (agency mode)
- ✅ **Auto-approve** — new accounts immediately active
- ✅ **Master admin super panel** — manage everything
- ✅ **Account switcher** — switch between accounts (header)
- ✅ **Real-time messaging** via Supabase WebSocket

### Widget
- 🎨 **Full customization** — colors, theme, fonts, background (color/gradient/image)
- 👤 **Agent profile** — name, title, avatar
- 💬 **Pre-chat form** — optional, configurable fields
- 🌍 **Page background** — solid, gradient, or custom image
- 📱 **Responsive** — works on mobile + desktop
- ⚡ **Embed script** — `widget-embed.js` for external sites

### Admin Dashboard
- 🔔 **Notification bell** — real-time alerts for new messages
- 🟢 **Active sessions** — see who's online (master admin)
- 💬 **All Chats** — master can view/respond to any chat
- 👥 **User management** — view all users
- 📊 **Stats** — accounts, chats, messages, visitors
- 🤖 **Canned responses** — `#shortcut` autocomplete
- 🎯 **Traffic page** — live visitor tracking
- 🔧 **Widget customizer** — live preview

---

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add environment variables (same as `.env.local`)
4. Deploy

In Supabase:
- **Authentication → URL Configuration**
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `https://your-app.vercel.app/**`

---

## 🔐 Security Model

This project uses an **app-layer trust model**:
- RLS policies are set to `allow_all` (permissive)
- Validation, ownership checks, and authorization happen in the Next.js code
- Service role key is only used server-side (in API routes) to bypass RLS for admin operations

For production, you'd want stricter RLS. For MVP/demo, this is fine.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── [accountNumber]/         # Public chat widget
│   ├── api/workspace/create/     # Server-side workspace creation
│   ├── auth (login/register/pending-approval)
│   ├── dashboard/[accountNumber]/ # Per-account dashboard
│   │   ├── inbox/                # Chat list + detail
│   │   ├── traffic/              # Visitors
│   │   ├── automate/             # Canned responses
│   │   └── settings/             # Widget, pre-chat, install code
│   └── master/                   # Master admin panel
│       ├── accounts/             # All accounts
│       ├── chats/                # All chats
│       └── users/                # All users
├── components/                   # React components
│   ├── ChatWindow, MessageList, etc.
│   ├── Sidebars, Navigation
│   └── NotificationBell
├── hooks/
│   └── useActiveSession          # Heartbeat for online status
├── lib/
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (RSC)
│   │   ├── middleware.ts         # Auth proxy logic
│   │   └── account-context.ts    # Get current account/user
│   └── types.ts                  # TypeScript types
├── proxy.ts                      # Next.js proxy (middleware)
└── ...
supabase/
├── final-schema-v5.sql           # Tables
├── final-policies-v5.sql         # RLS
├── final-triggers-v5.sql         # Triggers
├── final-realtime-v5.sql         # Realtime
├── promote-master-admin.sql      # Promote user
└── migration-old/                # Archived migrations
```

---

## 🧪 Testing

### End-to-end flow
1. Visit `/register` → create account
2. Confirm email confirmation is disabled in Supabase (Auth → Providers → Email → toggle off "Confirm email")
3. Login at `/login`
4. Auto-redirect to `/dashboard`
5. Click **Inbox** → empty state
6. Open widget in new tab: `http://localhost:3000/{accountNumber}` (account number shown on dashboard)
7. Fill form → chat view
8. Send message → bell icon appears in dashboard
9. Click notification → goes to chat

### Master admin flow
1. Promote user to master_admin via SQL
2. Login as that user
3. Auto-redirect to `/master`
4. See all accounts, active sessions, recent activity
5. Click "All Chats" → see all chats across all accounts
6. Click a chat → can view + respond (master admin override)

---

## 🐛 Troubleshooting

### "Email not confirmed"
Disable email confirmation in Supabase: **Auth → Providers → Email → toggle off "Confirm email"**

### RLS errors
Make sure you ran `final-policies-v5.sql`. If policies are missing, you can also disable RLS temporarily:
```sql
ALTER TABLE public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
```

### Build error
```bash
rm -rf .next
npm run build
```

### Master admin can't access /master
Make sure `global_role` is set correctly:
```sql
SELECT email, global_role FROM profiles;
UPDATE profiles SET global_role = 'master_admin' WHERE email = 'your@email.com';
```

---

## 📜 License

MIT — use freely, sell, modify.

---

Built with ❤️ using Next.js + Supabase
