import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type Account } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';
import { mapAccountsFromDB } from '@/lib/db-mapper';

export function useAccounts() {
    const [accounts, setAccounts] = useState<Account[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchAccounts = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .order('name');

            if (error) throw error;

            // Map snake_case to camelCase using utility
            const mappedAccounts = mapAccountsFromDB(data);
            setAccounts(mappedAccounts);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();

        // Realtime subscription - only listen to INSERT and UPDATE, not DELETE
        // (DELETE is already handled optimistically in deleteAccount)
        const channel = supabase
            .channel('accounts_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'accounts'
            }, () => {
                fetchAccounts();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'accounts'
            }, () => {
                fetchAccounts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const addAccount = async (account: Omit<Account, 'id'>) => {
        if (!user) return;

        const dbAccount = {
            user_id: user.id,
            name: account.name,
            type: account.type,
            currency: account.currency,
            initial_balance: account.initialBalance,
            current_balance: account.initialBalance,
            color: account.color,
            default_income_maaserable: account.defaultIncomeMaaserable,
            default_expense_deductible: account.defaultExpenseDeductible,
            is_savings_goal: account.isSavingsGoal,
            target_amount: account.targetAmount,
            deadline: account.deadline
        };

        const { data, error } = await supabase.from('accounts').insert([dbAccount]).select().single();
        if (error) throw error;

        // Optimistic Update
        if (data) {
            const newAccount: Account = {
                id: data.id,
                name: data.name,
                type: data.type,
                currency: data.currency,
                initialBalance: Number(data.initial_balance),
                currentBalance: Number(data.current_balance),
                color: data.color,
                defaultIncomeMaaserable: data.default_income_maaserable,
                defaultExpenseDeductible: data.default_expense_deductible,
                isSavingsGoal: data.is_savings_goal,
                targetAmount: data.target_amount ? Number(data.target_amount) : undefined,
                deadline: data.deadline ? new Date(data.deadline) : undefined
            };
            setAccounts(prev => [...(prev || []), newAccount].sort((a, b) => a.name.localeCompare(b.name)));
        }
    };

    const updateAccount = async (id: string, updates: Partial<Account>) => {
        const dbUpdates: Partial<Record<string, unknown>> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.currency) dbUpdates.currency = updates.currency;
        if (updates.initialBalance !== undefined) dbUpdates.initial_balance = updates.initialBalance;
        if (updates.currentBalance !== undefined) dbUpdates.current_balance = updates.currentBalance;
        if (updates.color) dbUpdates.color = updates.color;
        if (updates.defaultIncomeMaaserable !== undefined) dbUpdates.default_income_maaserable = updates.defaultIncomeMaaserable;
        if (updates.defaultExpenseDeductible !== undefined) dbUpdates.default_expense_deductible = updates.defaultExpenseDeductible;
        if (updates.isSavingsGoal !== undefined) dbUpdates.is_savings_goal = updates.isSavingsGoal;
        if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
        if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;

        const { error } = await supabase.from('accounts').update(dbUpdates).eq('id', id);
        if (error) throw error;

        // Optimistic Update
        setAccounts(prev => prev?.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const deleteAccount = async (id: string) => {
        // Optimistic Update
        setAccounts(prev => prev?.filter(a => a.id !== id));

        try {
            // 1. Delete associated account members (for collaborative accounts) - must be first
            const { error: membersError } = await supabase
                .from('account_members')
                .delete()
                .eq('account_id', id);

            if (membersError) throw membersError;

            // 2. Delete associated account invitations
            const { error: invError } = await supabase
                .from('account_invitations')
                .delete()
                .eq('account_id', id);

            if (invError) throw invError;

            // 3. Delete associated recurring transactions
            // Delete both where account is source and where it's destination (as to_account)
            const { error: rec1Error } = await supabase
                .from('recurring_transactions')
                .delete()
                .eq('account_id', id);

            if (rec1Error) throw rec1Error;

            const { error: rec2Error } = await supabase
                .from('recurring_transactions')
                .delete()
                .eq('to_account_id', id);

            if (rec2Error) throw rec2Error;

            // 4. Delete associated transactions (Incoming, Outgoing, Transfers)
            // Delete both where account is source and where it's destination (as to_account)
            const { error: tx1Error } = await supabase
                .from('transactions')
                .delete()
                .eq('account_id', id);

            if (tx1Error) throw tx1Error;

            const { error: tx2Error } = await supabase
                .from('transactions')
                .delete()
                .eq('to_account_id', id);

            if (tx2Error) throw tx2Error;

            // 5. Delete the account itself
            const { error: accountError } = await supabase
                .from('accounts')
                .delete()
                .eq('id', id);

            if (accountError) throw accountError;

            // Success - optimistic update is complete
        } catch (error) {
            // Rollback on any error
            fetchAccounts();
            throw error;
        }
    };

    return {
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        isLoading: loading,
    };
}
