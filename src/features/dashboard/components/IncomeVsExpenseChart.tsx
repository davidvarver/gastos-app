import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface IncomeVsExpenseChartProps {
    onMonthClick?: (date: Date) => void;
    accountId?: string;
    cardholder?: string;
}

export function IncomeVsExpenseChart({ onMonthClick, accountId, cardholder }: IncomeVsExpenseChartProps) {
    const { transactions } = useTransactions();
    const [timeRange, setTimeRange] = useState<3 | 6 | 12>(6);

    const data = useMemo(() => {
        if (!transactions) return [];

        const months = Array.from({ length: timeRange }).map((_, i) => {
            const date = subMonths(new Date(), timeRange - 1 - i);
            return {
                monthObj: date,
                name: format(date, 'MMM', { locale: es }),
                fullName: format(date, 'MMMM yyyy', { locale: es }),
                income: 0,
                expense: 0
            };
        });

        transactions.forEach(tx => {
            // Account Filter
            if (accountId && accountId !== 'all' && tx.accountId !== accountId) return;

            // Cardholder Filter
            if (cardholder && cardholder !== 'all' && (!tx.cardholder || !tx.cardholder.toLowerCase().includes(cardholder.toLowerCase()))) return;

            const txDate = new Date(tx.date);
            const monthData = months.find(m =>
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

        return months;
    }, [transactions, timeRange, accountId]);

    return (
        <Card className="bg-[#151e32] border-[#1e293b]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white text-lg">Ingresos vs Gastos</CardTitle>
                <div className="flex bg-[#0b1121] rounded-lg p-1 border border-[#1e293b]">
                    {[3, 6, 12].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as 3 | 6 | 12)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                timeRange === range
                                    ? "bg-[#1e293b] text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/50"
                            )}
                        >
                            {range}M
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            onClick={(state: any) => {
                                // Recharts click handler can be tricky. 
                                // We need to find the active payload which corresponds to the clicked bar.
                                if (state && state.activePayload && state.activePayload.length > 0) {
                                    const payload = state.activePayload[0].payload;
                                    if (payload && payload.monthObj && onMonthClick) {
                                        onMonthClick(new Date(payload.monthObj)); // Ensure it's a Date object
                                    }
                                }
                            }}
                            className={cn(onMonthClick ? "cursor-pointer" : "")}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickFormatter={(value) => `$${value / 1000}k`} />
                            <Tooltip
                                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#0b1121', borderColor: '#1e293b', color: '#fff' }}
                                formatter={(value: number) => [`$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value)}`, '']}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload[0] && payload[0].payload) {
                                        return payload[0].payload.fullName;
                                    }
                                    return label;
                                }}
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
