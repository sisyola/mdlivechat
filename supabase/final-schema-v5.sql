-- ============================================
-- LiveChat SaaS - FINAL Schema (v5)
-- Single file setup, run from clean state
-- ============================================
-- Order: This file
-- Then: policies-final.sql
-- Then: triggers-final.sql
-- Then: realtime-final.sql
-- ============================================

-- Drop everything to start clean
DROP TABLE IF EXISTS public.active_sessions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.visitors CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.account_settings CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.notify_new_customer_message() CASCADE;
DROP FUNCTION IF EXISTS public.auto_approve_account() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_room_last_message() CASCADE;
DROP FUNCTION IF EXISTS public.generate_account_number() CASCADE;
DROP FUNCTION IF EXISTS public.auto_set_account_number() CASCADE;
DROP FUNCTION IF EXISTS public.is_master_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;

DROP SEQUENCE IF EXISTS public.account_number_seq;

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  global_role TEXT NOT NULL DEFAULT 'account_owner' CHECK (global_role IN ('master_admin', 'account_owner', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_global_role ON public.profiles(global_role);

-- ============================================
-- ACCOUNTS
-- ============================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_number TEXT UNIQUE NOT NULL,
  account_slug TEXT UNIQUE,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_owner_id ON public.accounts(owner_id);
CREATE INDEX idx_accounts_status ON public.accounts(status);
CREATE INDEX idx_accounts_account_number ON public.accounts(account_number);

-- Account number sequence
CREATE SEQUENCE public.account_number_seq START 19854478;

-- ============================================
-- ACCOUNT SETTINGS
-- ============================================
CREATE TABLE public.account_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  -- Widget basics
  widget_color TEXT NOT NULL DEFAULT '#3b82f6',
  widget_position TEXT NOT NULL DEFAULT 'bottom-right' CHECK (widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  widget_theme TEXT NOT NULL DEFAULT 'light' CHECK (widget_theme IN ('light', 'dark')),
  widget_language TEXT NOT NULL DEFAULT 'id',
  widget_title TEXT NOT NULL DEFAULT 'Chat dengan kami',
  welcome_message TEXT NOT NULL DEFAULT 'Halo! Ada yang bisa saya bantu?',
  -- Pre-chat
  pre_chat_enabled BOOLEAN NOT NULL DEFAULT false,
  pre_chat_message TEXT NOT NULL DEFAULT 'Selamat datang! Isi form di bawah untuk memulai obrolan.',
  pre_chat_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Auto-responder
  offline_message TEXT NOT NULL DEFAULT 'Mohon maaf, saat ini kami sedang offline.',
  auto_responder_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_responder_message TEXT NOT NULL DEFAULT 'Terima kasih atas pesan Anda.',
  -- Canned responses
  canned_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Enhanced (v4)
  page_title TEXT DEFAULT 'Chat dengan tim kami',
  page_subtitle TEXT DEFAULT 'Halo! Kami siap membantu. Isi form di bawah untuk memulai chat dengan tim kami.',
  header_bg_color TEXT DEFAULT '#3b82f6',
  customer_bubble_color TEXT DEFAULT '#3b82f6',
  agent_bubble_color TEXT DEFAULT '#f3f4f6',
  page_bg_color TEXT DEFAULT '#ffffff',
  page_bg_type TEXT DEFAULT 'color' CHECK (page_bg_type IN ('color', 'gradient', 'image')),
  page_bg_gradient TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  page_bg_image TEXT,
  agent_name TEXT DEFAULT 'Customer Support',
  agent_avatar TEXT,
  agent_title TEXT DEFAULT 'Product Expert',
  show_powered_by BOOLEAN NOT NULL DEFAULT true,
  custom_css TEXT,
  font_family TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CHAT ROOMS
-- ============================================
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  visitor_id TEXT,
  visitor_ip TEXT,
  visitor_country TEXT,
  visitor_city TEXT,
  visitor_page TEXT,
  visitor_referrer TEXT,
  visitor_user_agent TEXT,
  pre_chat_data JSONB,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_account_id ON public.chat_rooms(account_id, last_message_at DESC);
CREATE INDEX idx_chat_rooms_status ON public.chat_rooms(status);
CREATE INDEX idx_chat_rooms_customer_email ON public.chat_rooms(customer_email);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room_id ON public.messages(room_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages(sender_type, sender_id);

-- ============================================
-- VISITORS
-- ============================================
CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  current_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'browsing' CHECK (status IN ('browsing', 'chatting', 'idle', 'offline')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_visits INT NOT NULL DEFAULT 1,
  pages_visited JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(account_id, visitor_id)
);

CREATE INDEX idx_visitors_account_id ON public.visitors(account_id, last_seen_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ============================================
-- ACTIVE SESSIONS
-- ============================================
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_account_id ON public.active_sessions(account_id);
CREATE INDEX idx_active_sessions_heartbeat ON public.active_sessions(last_heartbeat DESC);

DO $$
BEGIN
  RAISE NOTICE '✅ Final schema created';
  RAISE NOTICE 'Now run: policies-final.sql, triggers-final.sql, realtime-final.sql';
END $$;