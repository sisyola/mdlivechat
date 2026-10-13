-- ============================================
-- Force set widget theme to dark for testing
-- ============================================
-- Replace 19854480 with your account number

UPDATE public.account_settings
SET widget_theme = 'dark'
WHERE account_id = (
  SELECT id FROM public.accounts WHERE account_number = '19854480'
);

-- Verify
SELECT
  a.account_number,
  a.company_name,
  s.widget_theme,
  s.page_bg_color,
  s.agent_bubble_color
FROM public.account_settings s
JOIN public.accounts a ON a.id = s.account_id
WHERE a.account_number = '19854480';