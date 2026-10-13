-- ============================================
-- Ensure realtime works for messages UPDATE & DELETE
-- Run di Supabase SQL Editor
-- ============================================

-- Verify realtime is enabled
SELECT
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Add UPDATE & DELETE events to realtime
-- (Supabase v2 default: only INSERT)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime publication includes messages table';
  RAISE NOTICE 'INSERT, UPDATE, DELETE events should all broadcast';
END $$;