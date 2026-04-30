-- MIGRATION: 011_nuke_and_rebuild_rls.sql
-- Ejecutar en el SQL Editor de Supabase
-- Este script ELIMINA TODAS LAS POLÍTICAS EXISTENTES dinámicamente para asegurar
-- que ninguna política vieja y defectuosa siga causando recursión, y luego las reconstruye.

BEGIN;

-- ==========================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS DE FORMA DINÁMICA
-- Esto garantiza que no queden políticas "fantasma" con nombres diferentes
-- ==========================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'transactions' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.transactions', pol.policyname);
    END LOOP;

    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'accounts' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.accounts', pol.policyname);
    END LOOP;

    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'account_members' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.account_members', pol.policyname);
    END LOOP;
END
$$;

-- ==========================================
-- 2. RECREAR FUNCIONES HELPER (BLINDADAS)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_my_accounts()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT account_id FROM public.account_members WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_accounts()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND role = 'admin';
END;
$$;

-- ==========================================
-- 3. RECONSTRUIR POLÍTICAS DE ACCOUNT_MEMBERS
-- ==========================================
CREATE POLICY "account_members_select" ON public.account_members
  FOR SELECT USING (
    account_id IN (SELECT public.get_my_accounts())
  );

CREATE POLICY "account_members_all_admin" ON public.account_members
  FOR ALL USING (
    account_id IN (SELECT public.get_my_admin_accounts())
  );

CREATE POLICY "account_members_delete_self" ON public.account_members
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ==========================================
-- 4. RECONSTRUIR POLÍTICAS DE ACCOUNTS
-- ==========================================
CREATE POLICY "accounts_select" ON public.accounts
  FOR SELECT USING (
    id IN (SELECT public.get_my_accounts())
    OR user_id = auth.uid()
  );

CREATE POLICY "accounts_insert" ON public.accounts
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "accounts_update" ON public.accounts
  FOR UPDATE USING (
    user_id = auth.uid()
    OR id IN (SELECT public.get_my_admin_accounts())
  );

CREATE POLICY "accounts_delete" ON public.accounts
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ==========================================
-- 5. RECONSTRUIR POLÍTICAS DE TRANSACTIONS
-- ==========================================
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (
    account_id IN (SELECT public.get_my_accounts())
    OR user_id = auth.uid()
  );

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND account_id IN (SELECT public.get_my_accounts())
  );

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR account_id IN (SELECT public.get_my_admin_accounts())
  );

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (
    user_id = auth.uid()
    OR account_id IN (SELECT public.get_my_admin_accounts())
  );

COMMIT;
