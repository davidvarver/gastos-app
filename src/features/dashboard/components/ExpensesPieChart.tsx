import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subMonths, isWithinInterval, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

interface ExpensesPieChartProps {
    currentDate: Date;
}

export function ExpensesPieChart({ currentDate }: ExpensesPieChartProps) {
    const { transactions, categories } = useTransactions();
    const [timeRange, setTimeRange] = useState<1 | 3 | 6 | 12>(1);

    const data = useMemo(() => {
        if (!transactions || !categories) return [];

        let start: Date;
        let end: Date;

        if (timeRange === 1) {
            // Current selected month
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else {
            // Last X months ending in current selected month
            start = startOfDay(subMonths(currentDate, timeRange - 1)); // -1 to include current month
            end = endOfMonth(currentDate);
        }

        const expenses = transactions.filter(t =>
            t.type === 'expense' &&
            isWithinInterval(new Date(t.date), { start, end })
        );

        const categoryTotals: Record<string, number> = {};

        expenses.forEach(tx => {
            const catId = tx.categoryId || 'uncategorized';
            categoryTotals[catId] = (categoryTotals[catId] || 0) + tx.amount;
        });

        const chartData = Object.entries(categoryTotals).map(([catId, amount]) => {
            const category = categories.find(c => c.id === catId);
            return {
                name: category ? category.name : 'Sin Categoría',
                value: amount,
                color: category?.color
            };
        });

        // Sort by value and take top 5, group others
        chartData.sort((a, b) => b.value - a.value);

        if (chartData.length > 6) {
            const top5 = chartData.slice(0, 5);
            const others = chartData.slice(5);
            const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
            return [...top5, { name: 'Otros', value: othersTotal, color: '#94a3b8' }];
        }

        return chartData;
    }, [transactions, categories, timeRange, currentDate]);

    return (
        <Card className="bg-[#151e32] border-[#1e293b]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white text-lg">Gastos por Categoría</CardTitle>
                <div className="flex bg-[#0b1121] rounded-lg p-1 border border-[#1e293b]">
                    {[1, 3, 6, 12].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as 1 | 3 | 6 | 12)}
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
                    {!data.length ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            No hay datos en este periodo
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0b1121', borderColor: '#1e293b', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
