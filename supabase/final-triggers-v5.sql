-- ============================================
-- Final Triggers (v5)
-- Run AFTER final-schema-v5.sql & final-policies-v5.sql
-- ============================================

-- 1. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, global_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'account_owner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-create account_settings when account is created
CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.account_settings (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_account_created ON public.accounts;
CREATE TRIGGER on_account_created
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account();

-- 3. Auto-set account_number if NULL on insert
CREATE OR REPLACE FUNCTION public.auto_set_account_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_number IS NULL OR NEW.account_number = '' THEN
    NEW.account_number := nextval('public.account_number_seq')::TEXT;
  END IF;
  IF NEW.status = 'active' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_account_insert_number ON public.accounts;
CREATE TRIGGER on_account_insert_number
  BEFORE INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_account_number();

-- 4. Update last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms
  SET last_message_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_last_message();

-- 5. Notify owner on new customer message
CREATE OR REPLACE FUNCTION public.notify_new_customer_message()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_owner_id UUID;
  v_customer_name TEXT;
BEGIN
  IF NEW.sender_type != 'customer' THEN
    RETURN NEW;
  END IF;

  SELECT account_id, customer_name
  INTO v_account_id, v_customer_name
  FROM public.chat_rooms
  WHERE id = NEW.room_id;

  IF v_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO v_owner_id
  FROM public.accounts
  WHERE id = v_account_id;

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (account_id, user_id, type, title, message, data)
  VALUES (
    v_account_id,
    v_owner_id,
    'new_message',
    'Pesan baru dari ' || v_customer_name,
    LEFT(NEW.content, 100),
    jsonb_build_object('room_id', NEW.room_id, 'message_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_customer_message ON public.messages;
CREATE TRIGGER on_customer_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_customer_message();

DO $$
BEGIN
  RAISE NOTICE '✅ All triggers created';
  RAISE NOTICE '- handle_new_user (auth.users → profiles)';
  RAISE NOTICE '- handle_new_account (accounts → account_settings)';
  RAISE NOTICE '- auto_set_account_number (generate sequential number)';
  RAISE NOTICE '- update_room_last_message';
  RAISE NOTICE '- notify_new_customer_message (→ notifications)';
END $$;