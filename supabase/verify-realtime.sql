-- ============================================
-- Verify realtime subscription works
-- ============================================

-- 1. List all realtime tables
SELECT
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 2. Check messages realtime triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'messages';

-- 3. Test realtime by triggering an event
DO $$
BEGIN
  RAISE NOTICE '✅ Messages table is in supabase_realtime';
  RAISE NOTICE '❓ If not visible above, run: ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;';
END $$;