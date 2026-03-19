-- MIGRATION: 005_invitations_rpc.sql
-- Run this in Supabase SQL Editor

-- 1. DROP the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view valid invitations by knowing token" ON public.account_invitations;

-- 2. Create RPC for viewing invitation info securely via explicitly passing token parameter
CREATE OR REPLACE FUNCTION public.get_invitation_info(p_account_id uuid, p_token text)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  role text,
  inviter_email text,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.account_id,
    a.name AS account_name,
    ai.role,
    COALESCE(ai.inviter_email, 'Usuario') AS inviter_email,
    ai.expires_at
  FROM account_invitations ai
  JOIN accounts a ON a.id = ai.account_id
  WHERE ai.account_id = p_account_id
    AND ai.token = p_token
    AND ai.used_at IS NULL
    AND (ai.expires_at IS NULL OR ai.expires_at > NOW());
END;
$$;

-- 3. Create RPC to accept an invitation and join an account securely
CREATE OR REPLACE FUNCTION public.accept_account_invitation(p_account_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id uuid;
  v_role text;
  v_expires_at timestamp with time zone;
  v_used_at timestamp with time zone;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, role, expires_at, used_at
  INTO v_invitation_id, v_role, v_expires_at, v_used_at
  FROM account_invitations
  WHERE account_id = p_account_id AND token = p_token;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF v_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has already been used';
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF EXISTS (
    SELECT 1 FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member of this account';
  END IF;

  -- Insert member
  INSERT INTO account_members (account_id, user_id, role, joined_at, updated_at)
  VALUES (p_account_id, auth.uid(), v_role, NOW(), NOW());

  -- Consume invite
  UPDATE account_invitations SET used_at = NOW() WHERE id = v_invitation_id;
END;
$$;

-- 4. Create RPC to reject/decline an invitation (just marking it used as the inviter intended without joining)
CREATE OR REPLACE FUNCTION public.decline_account_invitation(p_account_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We just mark it used so it can't be used again
  UPDATE account_invitations 
  SET used_at = NOW() 
  WHERE account_id = p_account_id AND token = p_token;
END;
$$;

-- 5. Revoke generic access and strictly grant to explicit roles
REVOKE EXECUTE ON FUNCTION public.get_invitation_info(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_account_invitation(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decline_account_invitation(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_invitation_info(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_account_invitation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_account_invitation(uuid, text) TO authenticated;
