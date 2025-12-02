import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/features/auth/AuthProvider';

export function useDashboard(date: Date = new Date(), accountId?: string) {
    const [data, setData] = useState({
        income: 0,
        expense: 0,
        net: 0,
        maaser: 0,
        jomesh: 0,
        chartData: [] as any[],
        isLoading: true
    });
    const { user } = useAuth();

    const fetchData = async () => {
        if (!user) return;

        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        try {
            // Fetch Transactions for the month
            let query = supabase
                .from('transactions')
                .select('*, categories(*)')
                .gte('date', start)
                .lte('date', end);

            if (accountId && accountId !== 'all') {
                query = query.eq('account_id', accountId);
            }

            const { data: transactions, error } = await query;

            if (error) throw error;

            // Calculate Totals
            const income = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0) || 0;
            const expense = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0) || 0;
            const net = income - expense;

            // Maaser Calculation
            const maaserableIncome = transactions
                ?.filter(t => t.type === 'income' && (t.is_maaserable !== false))
                .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

            const deductibleExpenses = transactions
                ?.filter(t => t.type === 'expense' && (t.is_deductible === true))
                .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

            const netMaaserBase = maaserableIncome - deductibleExpenses;
            const maaser = netMaaserBase > 0 ? netMaaserBase * 0.10 : 0;
            const jomesh = netMaaserBase > 0 ? (netMaaserBase - maaser) * 0.10 : 0;

            // Chart Data
            const expensesByCategory = transactions
                ?.filter(t => t.type === 'expense')
                .reduce((acc: Record<string, { value: number, color: string }>, t) => {
                    const catName = t.categories?.name || 'Sin Categoría';
                    const catColor = t.categories?.color || '#cbd5e1';

                    if (!acc[catName]) {
                        acc[catName] = { value: 0, color: catColor };
                    }
                    acc[catName].value += Number(t.amount);
                    return acc;
                }, {});

            const chartData = Object.entries(expensesByCategory || {}).map(([name, data]) => ({
                name,
                value: data.value,
                color: data.color
            })).sort((a, b) => b.value - a.value);

            setData({
                income,
                expense,
                net,
                maaser,
                jomesh,
                chartData,
                isLoading: false
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setData(prev => ({ ...prev, isLoading: false }));
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('dashboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [date, user, accountId]);

    return data;
}
