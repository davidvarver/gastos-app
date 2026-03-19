-- MIGRATION: 004_codex_security_patch.sql
-- Run this in Supabase SQL Editor

-- 1. Add inviter_email to account_invitations so we don't need auth.admin to fetch it
ALTER TABLE public.account_invitations ADD COLUMN IF NOT EXISTS inviter_email text;

-- 2. Secure the increment_account_balance function
CREATE OR REPLACE FUNCTION public.increment_account_balance(account_id uuid, delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify membership (User must be a member of the account to increment balance)
  IF NOT EXISTS (
    SELECT 1 FROM account_members am 
    WHERE am.account_id = $1 
    AND am.user_id = auth.uid()
  ) THEN
    -- Or user created the account (if not in members but is owner)
    IF NOT EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = $1 AND a.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to modify this account';
    END IF;
  END IF;

  -- Update the balance
  UPDATE public.accounts
  SET current_balance = current_balance + delta
  WHERE id = $1;
END;
$$;

-- Ensure only authenticated users can run it
REVOKE EXECUTE ON FUNCTION public.increment_account_balance(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_account_balance(uuid, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_account_balance(uuid, numeric) TO authenticated;

-- 3. Note on Invitations RLS:
-- The policy "Anyone can view valid invitations by knowing token" allows SELECT on all valid invites.
-- For maximum security, fetching invite details by token should be moved to a SECURITY DEFINER RPC
-- in the future to avoid full scanning. For now, we are patching the most critical flaws.
