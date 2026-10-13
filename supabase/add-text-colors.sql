-- ============================================
-- Add text color customization
-- Run di Supabase SQL Editor
-- ============================================

ALTER TABLE public.account_settings
  ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS subtitle_color TEXT DEFAULT '#6b7280',
  ADD COLUMN IF NOT EXISTS header_text_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS powered_by_color TEXT DEFAULT '#9ca3af';

DO $$
BEGIN
  RAISE NOTICE '✅ Text color customization fields added';
END $$;