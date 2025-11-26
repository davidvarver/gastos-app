import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type Account } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';

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

            // Map snake_case to camelCase
            const mappedAccounts: Account[] = data.map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                currency: a.currency,
                initialBalance: Number(a.initial_balance),
                currentBalance: Number(a.current_balance),
                color: a.color,
                defaultIncomeMaaserable: a.default_income_maaserable,
                defaultExpenseDeductible: a.default_expense_deductible
            }));

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
            name: account.name,
            type: account.type,
            currency: account.currency,
            initial_balance: account.initialBalance,
            current_balance: account.initialBalance, // Start with initial
            color: account.color,
            default_income_maaserable: account.defaultIncomeMaaserable,
            default_expense_deductible: account.defaultExpenseDeductible
        };

        const { error } = await supabase.from('accounts').insert([dbAccount]);
        if (error) throw error;
    };

    const updateAccount = async (id: string, updates: Partial<Account>) => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.currency) dbUpdates.currency = updates.currency;
        if (updates.initialBalance !== undefined) dbUpdates.initial_balance = updates.initialBalance;
        if (updates.currentBalance !== undefined) dbUpdates.current_balance = updates.currentBalance;
        if (updates.color) dbUpdates.color = updates.color;
        if (updates.defaultIncomeMaaserable !== undefined) dbUpdates.default_income_maaserable = updates.defaultIncomeMaaserable;
        if (updates.defaultExpenseDeductible !== undefined) dbUpdates.default_expense_deductible = updates.defaultExpenseDeductible;

        const { error } = await supabase.from('accounts').update(dbUpdates).eq('id', id);
        if (error) throw error;
    };

    const deleteAccount = async (id: string) => {
        const { error } = await supabase.from('accounts').delete().eq('id', id);
        if (error) throw error;
    };

    return {
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        isLoading: loading,
    };
}
