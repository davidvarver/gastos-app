-- MIGRATION: 007_accounts_members_trigger.sql
-- Ejecutar en el SQL Editor de Supabase para arreglar el problema de crear nuevas cuentas

BEGIN;

-- 1. Crear función que auto-insertará al creador de la cuenta como 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.account_members (account_id, user_id, role, joined_at, updated_at)
  VALUES (NEW.id, NEW.user_id, 'admin', NOW(), NOW())
  ON CONFLICT (account_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Crear Trigger en la tabla accounts
DROP TRIGGER IF EXISTS on_account_created ON public.accounts;
CREATE TRIGGER on_account_created
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_account();

-- 3. Script de Retrollamada (Backfill) para sanar cuentas afectadas previas
-- Esto insertará a los creadores de las cuentas existentes que quedaron "huérfanas" en account_members
INSERT INTO public.account_members (account_id, user_id, role, joined_at, updated_at)
SELECT id, user_id, 'admin', NOW(), NOW()
FROM public.accounts
WHERE user_id IS NOT NULL
ON CONFLICT (account_id, user_id) DO NOTHING;

COMMIT;
