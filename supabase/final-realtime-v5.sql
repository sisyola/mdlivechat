-- ============================================
-- Final Realtime (v5)
-- Run AFTER final-schema-v5.sql
-- ============================================

-- Enable realtime for chat-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;

DO $$
BEGIN
  RAISE NOTICE '✅ Realtime enabled for all chat tables';
END $$;