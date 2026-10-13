-- ============================================
-- Add ban + edit support
-- Run di Supabase SQL Editor
-- ============================================

-- 1. Add ban status to chat_rooms
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- 2. Add edited_at to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 3. Add is_archived to chat_rooms (for "cleared" chats - hidden from main list)
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  RAISE NOTICE '✅ Ban + edit + archive columns added';
END $$;