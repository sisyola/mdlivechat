-- ============================================
-- Final RLS Policies (v5)
-- Run AFTER final-schema-v5.sql
-- ============================================

-- ============================================
-- Helper function
-- ============================================
CREATE OR REPLACE FUNCTION public.is_master_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND global_role = 'master_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_master_admin(UUID) TO anon, authenticated;

-- ============================================
-- PROFILES — allow all (we trust app layer)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.profiles;
CREATE POLICY "allow_all" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- ACCOUNTS — allow all
-- ============================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.accounts;
CREATE POLICY "allow_all" ON public.accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- ACCOUNT SETTINGS — allow all
-- ============================================
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.account_settings;
CREATE POLICY "allow_all" ON public.account_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- CHAT ROOMS — allow all
-- ============================================
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.chat_rooms;
CREATE POLICY "allow_all" ON public.chat_rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- MESSAGES — allow all
-- ============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.messages;
CREATE POLICY "allow_all" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- VISITORS — allow all
-- ============================================
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.visitors;
CREATE POLICY "allow_all" ON public.visitors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- NOTIFICATIONS — allow all
-- ============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.notifications;
CREATE POLICY "allow_all" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- ACTIVE SESSIONS — allow all
-- ============================================
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON public.active_sessions;
CREATE POLICY "allow_all" ON public.active_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '✅ All RLS policies set to allow_all (app-layer trust model)';
END $$;