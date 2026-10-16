-- Auto-close chat rooms yang idle lebih dari 15 menit
-- Pakai last_message_at sebagai patokan activity terakhir
-- Run setiap 5 menit, close semua room yang status='open' tapi last_message_at > 15 menit lalu

-- Pastikan extension pg_cron enabled (skip kalau udah)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Hapus cron job lama kalo ada (idempotent)
SELECT cron.unschedule('auto-close-idle-chats')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-close-idle-chats'
);

-- Schedule job: setiap 5 menit
SELECT cron.schedule(
  'auto-close-idle-chats',
  '*/5 * * * *',
  $$
  UPDATE public.chat_rooms
  SET status = 'closed'
  WHERE status = 'open'
    AND last_message_at < NOW() - INTERVAL '15 minutes';
  $$
);

-- Verify
SELECT * FROM cron.job WHERE jobname = 'auto-close-idle-chats';
