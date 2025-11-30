import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type RecurringTransaction } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTransactions } from './useTransactions';

export function useRecurringTransactions() {
    const [recurring, setRecurring] = useState<RecurringTransaction[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { addTransactions } = useTransactions();

    const fetchRecurring = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('recurring_transactions')
                .select('*')
                .order('day_of_month');

            if (error) throw error;

            const mapped: RecurringTransaction[] = data.map(r => ({
                id: r.id,
                description: r.description,
                amount: Number(r.amount),
                type: r.type,
                categoryId: r.category_id,
                accountId: r.account_id,
                toAccountId: r.to_account_id,
                dayOfMonth: r.day_of_month,
                active: r.active
            }));

            setRecurring(mapped);
        } catch (error) {
            console.error('Error fetching recurring transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecurring();

        const channel = supabase
            .channel('recurring_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_transactions' }, fetchRecurring)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const addRecurring = async (item: Omit<RecurringTransaction, 'id'>) => {
        if (!user) return;

        const tempId = crypto.randomUUID();
        const newItem: RecurringTransaction = {
            id: tempId,
            ...item
        };

        // Optimistic Update
        setRecurring(prev => [...(prev || []), newItem].sort((a, b) => a.dayOfMonth - b.dayOfMonth));

        const dbItem = {
            user_id: user.id,
            description: item.description,
            amount: item.amount,
            type: item.type,
            category_id: item.categoryId,
            account_id: item.accountId,
            to_account_id: item.toAccountId,
            day_of_month: item.dayOfMonth,
            active: item.active
        };

        const { data, error } = await supabase.from('recurring_transactions').insert([dbItem]).select().single();

        if (error) {
            // Rollback
            setRecurring(prev => prev?.filter(r => r.id !== tempId));
            throw error;
        }

        // Replace Temp ID
        setRecurring(prev => prev?.map(r => r.id === tempId ? { ...r, id: data.id } : r));
    };

    const updateRecurring = async (id: string, updates: Partial<RecurringTransaction>) => {
        // Optimistic Update
        setRecurring(prev => prev?.map(r => r.id === id ? { ...r, ...updates } : r));

        const dbUpdates: any = {};
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.amount) dbUpdates.amount = updates.amount;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId || null;
        if (updates.accountId) dbUpdates.account_id = updates.accountId;
        if (updates.toAccountId !== undefined) dbUpdates.to_account_id = updates.toAccountId || null;
        if (updates.dayOfMonth) dbUpdates.day_of_month = updates.dayOfMonth;
        if (updates.active !== undefined) dbUpdates.active = updates.active;

        const { error } = await supabase.from('recurring_transactions').update(dbUpdates).eq('id', id);

        if (error) {
            // Rollback
            fetchRecurring();
            throw error;
        }
    };

    const deleteRecurring = async (id: string) => {
        // Optimistic Delete
        setRecurring(prev => prev?.filter(r => r.id !== id));

        const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);

        if (error) {
            // Rollback
            fetchRecurring();
            throw error;
        }
    };

    const generateForMonth = async (month: Date) => {
        if (!recurring) return;

        const activeItems = recurring.filter(r => r.active);
        if (activeItems.length === 0) return;

        const transactionsToCreate = activeItems.map(item => {
            // Create date for this month
            const date = new Date(month.getFullYear(), month.getMonth(), item.dayOfMonth);

            // Handle invalid dates (e.g. Feb 30) -> Move to last day of month
            if (date.getMonth() !== month.getMonth()) {
                date.setDate(0); // Last day of previous month (which is actually the intended month in this overflow case? No.)
                // Actually, new Date(2023, 1, 30) -> March 2. 
                // We want Feb 28.
                // Better logic:
                const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                const day = Math.min(item.dayOfMonth, lastDay);
                return {
                    ...item,
                    date: new Date(month.getFullYear(), month.getMonth(), day)
                };
            }

            return {
                ...item,
                date
            };
        }).map(item => ({
            date: item.date,
            amount: item.amount,
            description: item.description,
            type: item.type,
            categoryId: item.categoryId,
            accountId: item.accountId,
            toAccountId: item.toAccountId,
            status: 'cleared' as const,
            isSystemGenerated: false
        }));

        await addTransactions(transactionsToCreate);
    };

    return {
        recurring,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        generateForMonth,
        isLoading: loading
    };
}
