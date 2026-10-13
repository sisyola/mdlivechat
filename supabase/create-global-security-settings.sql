-- Global security settings for login alerts
CREATE TABLE IF NOT EXISTS public.global_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_webhook_url TEXT,
  discord_alert_enabled BOOLEAN NOT NULL DEFAULT false,
  capture_webcam BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO public.global_security_settings (id, discord_alert_enabled)
SELECT gen_random_uuid(), false
WHERE NOT EXISTS (SELECT 1 FROM public.global_security_settings);

-- RLS for master admin only
ALTER TABLE public.global_security_settings ENABLE ROW LEVEL SECURITY;

-- Only master_admin role can access
CREATE POLICY "Only master admin can access global security"
ON public.global_security_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'master_admin'
  )
);
