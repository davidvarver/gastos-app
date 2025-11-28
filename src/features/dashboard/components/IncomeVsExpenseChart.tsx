import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export function IncomeVsExpenseChart() {
    const { transactions } = useTransactions();

    const data = useMemo(() => {
        if (!transactions) return [];

        const last6Months = Array.from({ length: 6 }).map((_, i) => {
            const date = subMonths(new Date(), 5 - i);
            return {
                monthObj: date,
                name: format(date, 'MMM', { locale: es }),
                income: 0,
                expense: 0
            };
        });

        transactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const monthData = last6Months.find(m =>
                isWithinInterval(txDate, {
                    start: startOfMonth(m.monthObj),
                    end: endOfMonth(m.monthObj)
                })
            );

            if (monthData) {
                if (tx.type === 'income') monthData.income += tx.amount;
                if (tx.type === 'expense') monthData.expense += tx.amount;
            }
        });

        return last6Months;
    }, [transactions]);

    return (
        <Card className="bg-[#151e32] border-[#1e293b]">
            <CardHeader>
                <CardTitle className="text-white">Ingresos vs Gastos (6 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickFormatter={(value) => `$${value / 1000}k`} />
                            <Tooltip
                                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#0b1121', borderColor: '#1e293b', color: '#fff' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                            />
                            <Legend />
                            <Bar dataKey="income" name="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
