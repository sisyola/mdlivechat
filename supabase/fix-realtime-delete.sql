-- ============================================
-- Fix Supabase Realtime DELETE event
-- ============================================
-- Issue: Supabase Realtime v2 doesn't broadcast DELETE events
-- by default. We need to ensure publication is set up properly.

-- 1. Re-add messages table to publication (in case it was lost)
DO $$
BEGIN
  -- Try to add, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    -- Already in publication, that's fine
    NULL;
  END;
END $$;

-- 2. Verify publication includes messages
SELECT
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'chat_rooms', 'visitors', 'notifications')
ORDER BY tablename;

-- 3. Set REPLICA IDENTITY to FULL so DELETE events include the old row
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;

-- 4. Test: trigger a delete and see if realtime fires
-- (This is just informational)
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime publication includes messages table';
  RAISE NOTICE '✅ REPLICA IDENTITY set to FULL — DELETE events will include old row data';
END $$;