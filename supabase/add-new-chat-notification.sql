-- ============================================
-- Auto-notification: notif ke owner kalo ada member/chat room baru
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_new_chat_room()
RETURNS TRIGGER AS $$
DECLARE
  owner_user_id UUID;
  customer_name TEXT;
BEGIN
  -- Get owner dari account
  SELECT owner_id
  INTO owner_user_id
  FROM public.accounts
  WHERE id = NEW.account_id;

  IF owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  customer_name := COALESCE(NEW.customer_name, 'Customer');

  -- Insert notification untuk owner
  INSERT INTO public.notifications (account_id, user_id, type, title, message, data)
  VALUES (
    NEW.account_id,
    owner_user_id,
    'new_chat',
    'Member baru: ' || customer_name,
    'Mulai chat di room ' || COALESCE(NEW.title, 'baru'),
    jsonb_build_object('room_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_chat_room ON public.chat_rooms;

CREATE TRIGGER on_new_chat_room
  AFTER INSERT ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_room();

DO $$
BEGIN
  RAISE NOTICE '✅ New chat room notification trigger created';
END $$;
