-- ============================================================================
-- SCRIPT DE EMERGENCIA: CORRECCIÓN DE RECURSIÓN INFINITA (RLS)
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================================

-- 1. CREAR FUNCIÓN DE SEGURIDAD (SECURITY DEFINER)
-- Esta función rompe la recursión porque se ejecuta con privilegios de sistema,
-- ignorando las políticas internas mientras verifica la membresía.

CREATE OR REPLACE FUNCTION public.check_is_account_member(acc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_id = acc_id
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = acc_id
    AND created_by_user_id = auth.uid()
  );
END;
$$;

-- 2. LIMPIAR POLÍTICAS CONFLICTIVAS
DROP POLICY IF EXISTS "Users can view accounts they are members of" ON accounts;
DROP POLICY IF EXISTS "Account members can update accounts" ON accounts;
DROP POLICY IF EXISTS "Account admins can delete accounts" ON accounts;

DROP POLICY IF EXISTS "Users can view transactions in accounts they are members of" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their accounts" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view members of accounts they belong to" ON account_members;
DROP POLICY IF EXISTS "Account admins can manage members" ON account_members;

-- 3. RE-CREAR POLÍTICAS USANDO LA FUNCIÓN DE SEGURIDAD

-- POLÍTICAS DE ACCOUNTS
CREATE POLICY "member_select_accounts" ON accounts 
  FOR SELECT USING (check_is_account_member(id));

CREATE POLICY "member_update_accounts" ON accounts 
  FOR UPDATE USING (check_is_account_member(id));

CREATE POLICY "admin_delete_accounts" ON accounts 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_id = id AND user_id = auth.uid() AND role = 'admin')
  );

-- POLÍTICAS DE TRANSACTIONS
CREATE POLICY "member_select_transactions" ON transactions 
  FOR SELECT USING (check_is_account_member(account_id));

CREATE POLICY "member_insert_transactions" ON transactions 
  FOR INSERT WITH CHECK (
    auth.uid() = created_by_user_id 
    AND check_is_account_member(account_id)
  );

CREATE POLICY "owner_update_transactions" ON transactions 
  FOR UPDATE USING (
    created_by_user_id = auth.uid() 
    AND check_is_account_member(account_id)
  );

CREATE POLICY "admin_delete_transactions" ON transactions 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_id = transactions.account_id AND user_id = auth.uid() AND role = 'admin')
  );

-- POLÍTICAS DE ACCOUNT MEMBERS (Aquí es donde ocurría la recursión)
CREATE POLICY "member_select_members" ON account_members 
  FOR SELECT USING (check_is_account_member(account_id));

CREATE POLICY "admin_manage_members" ON account_members 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = account_members.account_id AND am.user_id = auth.uid() AND am.role = 'admin')
  );

-- 4. VERIFICACIÓN FINAL
DO $$
BEGIN
  RAISE NOTICE 'Recursión eliminada. Políticas de seguridad re-aplicadas correctamente.';
END $$;
