-- MIGRATION: 006_transactions_rls_fix.sql
-- Ejecutar en el SQL Editor de Supabase para corregir los permisos de Edición y Borrado

BEGIN;

-- 1. Eliminar las políticas restrictivas viejas
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;

-- 2. Nueva política de UPDATE: Puedes editar si tú creaste la transacción O si eres admin de la cuenta
CREATE POLICY "Users can update their own or admin can update any" ON transactions
  FOR UPDATE USING (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM account_members am 
      WHERE am.account_id = transactions.account_id 
        AND am.user_id = auth.uid() 
        AND am.role = 'admin'
    )
  );

-- 3. Nueva política de DELETE: Puedes borrar si tú creaste la transacción O si eres admin de la cuenta
CREATE POLICY "Users can delete their own or admin can delete any" ON transactions
  FOR DELETE USING (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM account_members am 
      WHERE am.account_id = transactions.account_id 
        AND am.user_id = auth.uid() 
        AND am.role = 'admin'
    )
  );

COMMIT;
