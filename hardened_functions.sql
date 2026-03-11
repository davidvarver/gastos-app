-- ============================================================================
-- SCRIPT DE ENDURECIMIENTO DE SEGURIDAD (FUNCIONES) - monAi
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================================

-- 1. CORREGIR EL "SEARCH PATH" DE LA FUNCIÓN increment_account_balance
-- Esto evita ataques de secuestro de búsqueda de funciones.

CREATE OR REPLACE FUNCTION public.increment_account_balance(account_id uuid, delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts
  SET current_balance = current_balance + delta
  WHERE id = account_id;
END;
$$;

-- 2. VERIFICACIÓN
DO $$
BEGIN
  RAISE NOTICE 'Función increment_account_balance actualizada con search_path = public.';
END $$;
