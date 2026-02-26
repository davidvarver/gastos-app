import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Budget, BudgetDB, BudgetInput, Transaction } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { calculateBudgetStatus, BudgetStatus } from '@/lib/budget-logic';
import { toast } from 'sonner';

export function useBudgets(monthYear?: string) {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<Budget[]>();
    const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();
    const { transactions } = useTransactions();

    // Mapear BudgetDB a Budget
    const mapBudgetFromDB = (b: BudgetDB): Budget => ({
        id: b.id,
        categoryId: b.category_id,
        monthYear: b.month_year,
        limitAmount: Number(b.limit_amount),
        alertThreshold: Number(b.alert_threshold),
        createdAt: new Date(b.created_at),
        updatedAt: new Date(b.updated_at)
    });

    // Fetch budgets
    useEffect(() => {
        if (!user?.id) return;

        const fetchBudgets = async () => {
            setIsLoading(true);
            try {
                const query = supabase
                    .from('budgets')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('month_year', { ascending: false });

                if (monthYear) {
                    query.eq('month_year', monthYear);
                }

                const { data, error: err } = await query;

                if (err) throw err;

                const mapped = (data as BudgetDB[]).map(mapBudgetFromDB);
                setBudgets(mapped);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Error fetching budgets';
                setError(errorMsg);
                console.error('Error fetching budgets:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBudgets();

        // Real-time subscription
        const subscription = supabase
            .channel(`budgets:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'budgets',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newBudget = mapBudgetFromDB(payload.new as BudgetDB);
                        setBudgets(prev => {
                            if (!prev) return [newBudget];
                            const existing = prev.findIndex(b => b.id === newBudget.id);
                            if (existing >= 0) {
                                const updated = [...prev];
                                updated[existing] = newBudget;
                                return updated;
                            }
                            return [...prev, newBudget];
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setBudgets(prev => prev?.filter(b => b.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, monthYear]);

    // Calcular statuses cuando cambien budgets o transacciones
    useEffect(() => {
        if (!budgets || !transactions) return;

        const statuses = budgets.map(budget =>
            calculateBudgetStatus(budget, transactions)
        );
        setBudgetStatuses(statuses);
    }, [budgets, transactions]);

    const addBudget = async (input: BudgetInput) => {
        if (!user?.id) return;

        try {
            const { error: err } = await supabase.from('budgets').insert({
                user_id: user.id,
                category_id: input.categoryId,
                month_year: input.monthYear,
                limit_amount: input.limitAmount,
                alert_threshold: input.alertThreshold || 80
            });

            if (err) throw err;
            toast.success('Presupuesto creado');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error creating budget';
            toast.error(errorMsg);
            throw err;
        }
    };

    const updateBudget = async (id: string, updates: Partial<BudgetInput>) => {
        try {
            const { error: err } = await supabase
                .from('budgets')
                .update({
                    ...(updates.limitAmount !== undefined && { limit_amount: updates.limitAmount }),
                    ...(updates.alertThreshold !== undefined && { alert_threshold: updates.alertThreshold })
                })
                .eq('id', id);

            if (err) throw err;
            toast.success('Presupuesto actualizado');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error updating budget';
            toast.error(errorMsg);
            throw err;
        }
    };

    const deleteBudget = async (id: string) => {
        try {
            const { error: err } = await supabase
                .from('budgets')
                .delete()
                .eq('id', id);

            if (err) throw err;
            toast.success('Presupuesto eliminado');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error deleting budget';
            toast.error(errorMsg);
            throw err;
        }
    };

    return {
        budgets,
        budgetStatuses,
        isLoading,
        error,
        addBudget,
        updateBudget,
        deleteBudget
    };
}
