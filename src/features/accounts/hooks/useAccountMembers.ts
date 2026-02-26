import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { AccountMember, AccountMemberDB } from '@/db/db';

/**
 * Hook for managing account members
 * Handles fetching, adding, removing, and updating member roles
 */
export function useAccountMembers(accountId: string) {
    const { user } = useAuth();
    const [members, setMembers] = useState<AccountMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch account members
    const fetchMembers = async () => {
        if (!accountId || !user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('account_members')
                .select('*')
                .eq('account_id', accountId);

            if (fetchError) throw fetchError;

            // Map database format to app format
            const mappedMembers = (data || []).map((m: AccountMemberDB) => ({
                id: m.id,
                accountId: m.account_id,
                userId: m.user_id,
                role: m.role,
                joinedAt: new Date(m.joined_at),
                updatedAt: new Date(m.updated_at)
            }));

            setMembers(mappedMembers);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch members';
            setError(errorMsg);
            console.error('Error fetching account members:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Subscribe to real-time member changes
    useEffect(() => {
        if (!accountId || !user) return;

        fetchMembers();

        // Real-time subscription
        const subscription = supabase
            .channel(`account_members:${accountId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'account_members',
                    filter: `account_id=eq.${accountId}`
                },
                () => {
                    fetchMembers();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [accountId, user]);

    // Add a member invitation (creates account_members record)
    const addMember = async (userId: string, role: 'admin' | 'editor' = 'editor') => {
        if (!user) throw new Error('User not authenticated');

        try {
            const { error } = await supabase
                .from('account_members')
                .insert([
                    {
                        account_id: accountId,
                        user_id: userId,
                        role,
                        joined_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            await fetchMembers();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to add member';
            setError(errorMsg);
            throw err;
        }
    };

    // Remove a member
    const removeMember = async (userId: string) => {
        if (!user) throw new Error('User not authenticated');

        // Prevent removing the last admin
        const adminCount = members.filter(m => m.role === 'admin').length;
        const isRemovingAdmin = members.find(m => m.userId === userId)?.role === 'admin';

        if (isRemovingAdmin && adminCount === 1) {
            throw new Error('Cannot remove the last admin from the account');
        }

        try {
            const { error } = await supabase
                .from('account_members')
                .delete()
                .eq('account_id', accountId)
                .eq('user_id', userId);

            if (error) throw error;
            await fetchMembers();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to remove member';
            setError(errorMsg);
            throw err;
        }
    };

    // Update member role
    const updateMemberRole = async (userId: string, newRole: 'admin' | 'editor') => {
        if (!user) throw new Error('User not authenticated');

        try {
            const { error } = await supabase
                .from('account_members')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('account_id', accountId)
                .eq('user_id', userId);

            if (error) throw error;
            await fetchMembers();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update role';
            setError(errorMsg);
            throw err;
        }
    };

    // Get current user's role
    const getCurrentUserRole = () => {
        if (!user) return null;
        const member = members.find(m => m.userId === user.id);
        return member?.role || null;
    };

    // Check if current user is admin
    const isCurrentUserAdmin = () => {
        return getCurrentUserRole() === 'admin';
    };

    // Get member details (can be extended to load from auth.users)
    const getMemberDetails = (userId: string) => {
        return members.find(m => m.userId === userId) || null;
    };

    return {
        members,
        isLoading,
        error,
        fetchMembers,
        addMember,
        removeMember,
        updateMemberRole,
        getCurrentUserRole,
        isCurrentUserAdmin,
        getMemberDetails
    };
}
