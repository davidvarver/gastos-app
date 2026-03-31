-- MIGRATION: 009_fix_rls_recursion.sql
-- Ejecutar en el SQL Editor de Supabase para arreglar el error: "infinite recursion detected in policy for relation account_members"

BEGIN;

-- ==========================================
-- 1. CREAR FUNCIONES HELPER (SECURITY DEFINER)
-- Bypassan las políticas RLS para evitar bucles infinitos
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_account_member(check_account_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = auth.uid() AND account_id = check_account_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_account_admin(check_account_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = auth.uid() AND account_id = check_account_id AND role = 'admin'
  );
$$;

-- ==========================================
-- 2. REESCRIBIR POLÍTICAS DE ACCOUNT_MEMBERS
-- ==========================================
DROP POLICY IF EXISTS "Users can view members of accounts they belong to" ON account_members;
DROP POLICY IF EXISTS "Account admins can manage members" ON account_members;

CREATE POLICY "Users can view members of accounts they belong to" ON account_members
  FOR SELECT USING (
    -- IMPORTANTE: Aquí se debe anclar evitando mirar a la propia tabla directamente si no es por la función.
    public.is_account_member(account_id)
  );

CREATE POLICY "Account admins can manage members" ON account_members
  FOR ALL USING (
    public.is_account_admin(account_id)
  );

-- ==========================================
-- 3. REESCRIBIR POLÍTICAS DE ACCOUNTS PARA USAR LAS FUNCIONES (MÁS RÁPIDO Y SEGURO)
-- ==========================================
DROP POLICY IF EXISTS "Users can view accounts they are members of" ON accounts;
CREATE POLICY "Users can view accounts they are members of" ON accounts
  FOR SELECT USING (
    public.is_account_member(id)
    OR user_id = auth.uid()
  );

-- ==========================================
-- 4. REESCRIBIR POLÍTICAS DE TRANSACTIONS PARA USAR LAS FUNCIONES
-- ==========================================
DROP POLICY IF EXISTS "Users can view transactions in accounts they are members of" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their accounts" ON transactions;
DROP POLICY IF EXISTS "Users can update their own or admin can update any" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own or admin can delete any" ON transactions;

CREATE POLICY "Users can view transactions in accounts they are members of" ON transactions
  FOR SELECT USING (
    public.is_account_member(account_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create transactions in their accounts" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_account_member(account_id)
  );

CREATE POLICY "Users can update their own or admin can update any" ON transactions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.is_account_admin(account_id)
  );

CREATE POLICY "Users can delete their own or admin can delete any" ON transactions
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_account_admin(account_id)
  );

COMMIT;
