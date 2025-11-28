import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export function ExpensesPieChart() {
    const { transactions, categories } = useTransactions();

    const data = useMemo(() => {
        if (!transactions || !categories) return [];

        const expenses = transactions.filter(t => t.type === 'expense');
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
    }, [transactions, categories]);

    if (!data.length) {
        return (
            <Card className="bg-[#151e32] border-[#1e293b]">
                <CardHeader>
                    <CardTitle className="text-white">Gastos por Categoría</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-slate-500">
                    No hay datos suficientes
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-[#151e32] border-[#1e293b]">
            <CardHeader>
                <CardTitle className="text-white">Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
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
                </div>
            </CardContent>
        </Card>
    );
}
