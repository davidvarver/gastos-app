-- MIGRATION: 008_fix_hallucinated_column_rls.sql
-- Ejecutar en el SQL Editor de Supabase para arreglar el Error 500 provocado por columnas inexistentes en RLS

BEGIN;

-- ==========================================
-- CORREGIR POLÍTICAS DE ACCOUNTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view accounts they are members of" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts" ON accounts;

CREATE POLICY "Users can view accounts they are members of" ON accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = accounts.id AND account_members.user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- CORREGIR POLÍTICAS DE TRANSACTIONS
-- ==========================================
DROP POLICY IF EXISTS "Users can view transactions in accounts they are members of" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their accounts" ON transactions;
DROP POLICY IF EXISTS "Users can update their own or admin can update any" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own or admin can delete any" ON transactions;

CREATE POLICY "Users can view transactions in accounts they are members of" ON transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = transactions.account_id AND account_members.user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create transactions in their accounts" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM account_members WHERE account_members.account_id = transactions.account_id AND account_members.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own or admin can update any" ON transactions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM account_members am 
      WHERE am.account_id = transactions.account_id 
        AND am.user_id = auth.uid() 
        AND am.role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own or admin can delete any" ON transactions
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM account_members am 
      WHERE am.account_id = transactions.account_id 
        AND am.user_id = auth.uid() 
        AND am.role = 'admin'
    )
  );

COMMIT;
