-- ============================================================================
-- SCRIPT DE CORRECIÓN DE SEGURIDAD (RLS) - monAi
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================================

-- 1. ACTIVAR RLS EN TODAS LAS TABLAS CRÍTICAS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA DE POLÍTICAS EXISTENTES (Para evitar duplicados)
DROP POLICY IF EXISTS "Users can view accounts they are members of" ON accounts;
DROP POLICY IF EXISTS "Users can view accounts they belong to" ON accounts;
DROP POLICY IF EXISTS "Users create accounts" ON accounts; -- fixing typos if any
DROP POLICY IF EXISTS "Users can create accounts" ON accounts;
DROP POLICY IF EXISTS "Account members can update accounts" ON accounts;
DROP POLICY IF EXISTS "Account admins can delete accounts" ON accounts;

DROP POLICY IF EXISTS "Users can view transactions in accounts they are members of" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their accounts" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their categories" ON categories;

DROP POLICY IF EXISTS "Users can view their own subcategories" ON subcategories;
DROP POLICY IF EXISTS "Users can insert their own subcategories" ON subcategories;
DROP POLICY IF EXISTS "Users can update their own subcategories" ON subcategories;
DROP POLICY IF EXISTS "Users can delete their own subcategories" ON subcategories;
DROP POLICY IF EXISTS "Users can manage their subcategories" ON subcategories;

DROP POLICY IF EXISTS "Users can view their own recurring_transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can insert their own recurring_transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can update their own recurring_transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can delete their own recurring_transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Users can manage their recurring transactions" ON recurring_transactions;

DROP POLICY IF EXISTS "Users can view members of accounts they belong to" ON account_members;
DROP POLICY IF EXISTS "Account admins can invite members" ON account_members;
DROP POLICY IF EXISTS "Account admins can update member roles" ON account_members;
DROP POLICY IF EXISTS "Account admins can delete members" ON account_members;
DROP POLICY IF EXISTS "Account admins can manage members" ON account_members;

DROP POLICY IF EXISTS "Anyone can view valid invitations by token" ON account_invitations;
DROP POLICY IF EXISTS "Anyone can view valid invitations by knowing token" ON account_invitations;
DROP POLICY IF EXISTS "Account admins can create invitations" ON account_invitations;
DROP POLICY IF EXISTS "Users can mark invitations as used" ON account_invitations;
DROP POLICY IF EXISTS "Account admins can revoke invitations" ON account_invitations;
DROP POLICY IF EXISTS "Account admins can manage invitations" ON account_invitations;

-- 3. RE-CREACIÓN DE POLÍTICAS ROBUSTAS

-- ACCOUNTS
CREATE POLICY "Users can view accounts they are members of" ON accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = accounts.id AND account_members.user_id = auth.uid())
    OR created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Account members can update accounts" ON accounts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = accounts.id AND account_members.user_id = auth.uid())
  );

CREATE POLICY "Account admins can delete accounts" ON accounts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = accounts.id AND account_members.user_id = auth.uid() AND account_members.role = 'admin')
  );

-- TRANSACTIONS
CREATE POLICY "Users can view transactions in accounts they are members of" ON transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = transactions.account_id AND account_members.user_id = auth.uid())
    OR created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create transactions in their accounts" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = created_by_user_id
    AND EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = transactions.account_id AND account_members.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (
    created_by_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = transactions.account_id AND account_members.user_id = auth.uid())
  );

CREATE POLICY "Only admins can delete transactions" ON transactions
  FOR DELETE USING (
    created_by_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = transactions.account_id AND account_members.user_id = auth.uid() AND account_members.role = 'admin')
  );

-- CATEGORIES
CREATE POLICY "Users can manage their categories" ON categories
  FOR ALL USING (user_id = auth.uid());

-- SUBCATEGORIES
CREATE POLICY "Users can manage their subcategories" ON subcategories
  FOR ALL USING (user_id = auth.uid());

-- RECURRING TRANSACTIONS
CREATE POLICY "Users can manage their recurring transactions" ON recurring_transactions
  FOR ALL USING (user_id = auth.uid());

-- ACCOUNT MEMBERS
CREATE POLICY "Users can view members of accounts they belong to" ON account_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_members am2 WHERE am2.account_id = account_members.account_id AND am2.user_id = auth.uid())
  );

CREATE POLICY "Account admins can manage members" ON account_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = account_members.account_id AND am.user_id = auth.uid() AND am.role = 'admin')
  );

-- ACCOUNT INVITATIONS (PROTECCIÓN DE COLUMNAS SENSIBLES)
CREATE POLICY "Anyone can view valid invitations by knowing token" ON account_invitations
  FOR SELECT USING (
    used_at IS NULL 
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "Account admins can manage invitations" ON account_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = account_invitations.account_id AND account_members.user_id = auth.uid() AND account_members.role = 'admin')
  );

-- 4. LOG FINAL
DO $$
BEGIN
  RAISE NOTICE 'Seguridad RLS aplicada correctamente en todas las tablas.';
END $$;
