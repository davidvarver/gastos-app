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
            // Fetch invitation
            const { data: invitationData, error: invError } = await supabase
                .from('account_invitations')
                .select('*')
                .eq('account_id', accountId)
                .eq('token', token)
                .maybeSingle();

            if (invError) throw invError;
            if (!invitationData) throw new Error('Invitation not found');

            const invitation = invitationData as AccountInvitationDB;

            // Check if expired
            if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
                throw new Error('Invitation has expired');
            }

            // Check if already used
            if (invitation.used_at) {
                throw new Error('Invitation has already been used');
            }

            // Fetch account name
            const { data: accountData, error: accError } = await supabase
                .from('accounts')
                .select('name')
                .eq('id', accountId)
                .maybeSingle();

            if (accError) throw accError;

            // Fetch inviter email
            let inviterEmail = '';
            if (invitation.invited_by_user_id) {
                const { data: userData } = await supabase.auth.admin.getUserById(
                    invitation.invited_by_user_id
                );
                inviterEmail = userData?.user?.email || '';
            }

            return {
                accountId,
                accountName: accountData?.name || 'Unknown Account',
                role: invitation.role,
                inviterEmail,
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
            // Fetch the invitation
            const { data: invitationData, error: fetchError } = await supabase
                .from('account_invitations')
                .select('*')
                .eq('account_id', accountId)
                .eq('token', token)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (!invitationData) throw new Error('Invitation not found');

            const invitation = invitationData as AccountInvitationDB;

            // Validate invitation
            if (invitation.used_at) {
                throw new Error('Invitation has already been used');
            }

            if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
                throw new Error('Invitation has expired');
            }

            // Check if user is already a member
            const { data: existingMember } = await supabase
                .from('account_members')
                .select('id')
                .eq('account_id', accountId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existingMember) {
                throw new Error('You are already a member of this account');
            }

            // Add user to account_members
            const { error: insertError } = await supabase
                .from('account_members')
                .insert([
                    {
                        account_id: accountId,
                        user_id: user.id,
                        role: invitation.role,
                        joined_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ]);

            if (insertError) throw insertError;

            // Mark invitation as used
            const { error: updateError } = await supabase
                .from('account_invitations')
                .update({ used_at: new Date().toISOString() })
                .eq('id', invitation.id);

            if (updateError) throw updateError;

            return { accountId, role: invitation.role };
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
            // Just mark as used (effectively declining it)
            const { error } = await supabase
                .from('account_invitations')
                .update({ used_at: new Date().toISOString() })
                .eq('account_id', accountId)
                .eq('token', token);

            if (error) throw error;
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
