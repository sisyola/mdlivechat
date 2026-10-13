-- Add Discord login alert columns to account_settings
ALTER TABLE public.account_settings
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS discord_alert_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add RLS policy for account_settings if not exists
DROP POLICY IF EXISTS "Users can update own account settings" ON public.account_settings;
CREATE POLICY "Users can update own account settings"
ON public.account_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = account_settings.account_id
    AND accounts.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can read own account settings" ON public.account_settings;
CREATE POLICY "Users can read own account settings"
ON public.account_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = account_settings.account_id
    AND accounts.owner_id = auth.uid()
  )
);
