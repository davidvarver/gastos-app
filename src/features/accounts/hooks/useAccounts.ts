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

        // Realtime subscription
        const channel = supabase
            .channel('accounts_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
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
            created_by_user_id: user.id, // NEW: Track creator for collaborative accounts
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
                deadline: data.deadline ? new Date(data.deadline) : undefined,
                createdByUserId: data.created_by_user_id // NEW: Include creator
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

        // 1. Delete associated transactions (Incoming, Outgoing, Transfers)
        // We need to be careful with transfers. If we delete a transfer, it disappears from both accounts?
        // Yes, a transaction row belongs to an account.
        // But what about `to_account_id`?
        // If we delete an account, any transfer TO it should probably also be deleted or have `to_account_id` set to null?
        // Usually, if you delete a bank account, you delete the history.
        // Let's delete all transactions where this account is either source or destination.

        const { error: txError } = await supabase
            .from('transactions')
            .delete()
            .or(`account_id.eq.${id},to_account_id.eq.${id}`);

        if (txError) {
            fetchAccounts(); // Rollback
            throw txError;
        }

        // 2. Delete associated recurring transactions
        const { error: recError } = await supabase
            .from('recurring_transactions')
            .delete()
            .or(`account_id.eq.${id},to_account_id.eq.${id}`);

        if (recError) {
            fetchAccounts(); // Rollback
            throw recError;
        }

        // 2. Delete the account
        const { error } = await supabase.from('accounts').delete().eq('id', id);

        if (error) {
            fetchAccounts(); // Rollback
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
