import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { AccountInvitation, AccountInvitationDB } from '@/db/db';
import { generateInviteToken, buildInviteLink, generateDefaultExpiry } from '@/lib/invitation-utils';

/**
 * Hook for managing account invitations
 * Handles creation, acceptance, and tracking of invitation links
 */
export function useAccountInvitations() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate a new invitation link
    const generateInviteLink = async (
        accountId: string,
        role: 'admin' | 'editor' = 'editor',
        expiryDays?: number
    ): Promise<{ link: string; token: string; expiresAt: Date }> => {
        if (!user) throw new Error('User not authenticated');

        setIsLoading(true);
        setError(null);

        try {
            const token = generateInviteToken();
            const expiresAt = generateDefaultExpiry(expiryDays);

            // Create invitation record
            const { error: insertError } = await supabase
                .from('account_invitations')
                .insert([
                    {
                        account_id: accountId,
                        invited_by_user_id: user.id,
                        inviter_email: user.email || '',
                        token,
                        role,
                        created_at: new Date().toISOString(),
                        expires_at: expiresAt.toISOString()
                    }
                ]);

            if (insertError) throw insertError;

            const link = buildInviteLink(accountId, token);

            return { link, token, expiresAt };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to generate invite link';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Get invitation info before accepting
    const getInvitationInfo = async (accountId: string, token: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch invitation using the secure RPC
            const { data: result, error: rpcError } = await supabase.rpc('get_invitation_info', {
                p_account_id: accountId,
                p_token: token
            });

            if (rpcError) throw rpcError;
            if (!result || result.length === 0) throw new Error('Invitation not found, used, or expired');

            const invitation = result[0];

            return {
                accountId: invitation.account_id,
                accountName: invitation.account_name,
                role: invitation.role,
                inviterEmail: invitation.inviter_email,
                expiresAt: invitation.expires_at ? new Date(invitation.expires_at) : null
            };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to get invitation info';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Accept/use an invitation
    const acceptInvitation = async (accountId: string, token: string) => {
        if (!user) throw new Error('User not authenticated');

        setIsLoading(true);
        setError(null);

        try {
            // Pre-fetch invitation to get the role
            const info = await getInvitationInfo(accountId, token);

            // Execute the secure RPC to accept and bypassing isolated RLS safely
            const { error: rpcError } = await supabase.rpc('accept_account_invitation', {
                p_account_id: accountId,
                p_token: token
            });

            if (rpcError) throw rpcError;

            return { accountId, role: info.role };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to accept invitation';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // List all invitations for an account (admin only)
    const listInvitations = async (accountId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('account_invitations')
                .select('*')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            return (data || []) as AccountInvitation[];
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to list invitations';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Revoke/delete an invitation (admin only)
    const revokeInvitation = async (invitationId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('account_invitations')
                .delete()
                .eq('id', invitationId);

            if (error) throw error;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to revoke invitation';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Decline an invitation (mark as used with a special status)
    const declineInvitation = async (accountId: string, token: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Use the secure RPC to mark it as used
            const { error: rpcError } = await supabase.rpc('decline_account_invitation', {
                p_account_id: accountId,
                p_token: token
            });

            if (rpcError) throw rpcError;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to decline invitation';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        generateInviteLink,
        getInvitationInfo,
        acceptInvitation,
        listInvitations,
        revokeInvitation,
        declineInvitation
    };
}
