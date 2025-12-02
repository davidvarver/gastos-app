import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subMonths, isWithinInterval, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

interface ExpensesPieChartProps {
    currentDate: Date;
    accountId?: string;
    cardholder?: string;
}

export function ExpensesPieChart({ currentDate, accountId, cardholder }: ExpensesPieChartProps) {
    const { transactions, categories } = useTransactions();
    const [timeRange, setTimeRange] = useState<1 | 3 | 6 | 12>(1);
    const [viewMode, setViewMode] = useState<'category' | 'subcategory'>('category');

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
            isWithinInterval(new Date(t.date), { start, end }) &&
            (!accountId || accountId === 'all' || t.accountId === accountId) &&
            (!cardholder || cardholder === 'all' || (t.cardholder && t.cardholder.toLowerCase().includes(cardholder.toLowerCase())))
        );

        const totals: Record<string, number> = {};

        expenses.forEach(tx => {
            let key = 'uncategorized';

            if (viewMode === 'category') {
                key = tx.categoryId || 'uncategorized';
            } else {
                // For subcategories, we need a unique key. 
                // If no subcategory, group by category (or 'uncategorized')
                if (tx.subcategoryId) {
                    key = tx.subcategoryId;
                } else {
                    key = tx.categoryId || 'uncategorized';
                }
            }

            totals[key] = (totals[key] || 0) + tx.amount;
        });

        const chartData = Object.entries(totals).map(([id, amount]) => {
            if (viewMode === 'category') {
                const category = categories.find(c => c.id === id);
                return {
                    name: category ? category.name : 'Sin Categoría',
                    value: amount,
                    color: category?.color
                };
            } else {
                // Subcategory Mode
                // Find which category this subcategory belongs to
                let name = 'Sin Categoría';
                let color = '#94a3b8';

                // First check if it's a category ID (for transactions without subcategory)
                const category = categories.find(c => c.id === id);
                if (category) {
                    name = category.name;
                    color = category.color;
                } else {
                    // Search in subcategories
                    for (const cat of categories) {
                        const sub = cat.subcategories?.find(s => s.id === id);
                        if (sub) {
                            name = sub.name;
                            color = cat.color; // Use category color for consistency, or maybe lighten it?
                            break;
                        }
                    }
                }

                return {
                    name,
                    value: amount,
                    color
                };
            }
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
    }, [transactions, categories, timeRange, currentDate, accountId, viewMode]);

    return (
        <Card className="bg-[#151e32] border-[#1e293b]">
            <CardHeader className="flex flex-col gap-4 pb-2">
                <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white text-lg">Gastos</CardTitle>
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
                </div>

                {/* View Mode Toggle */}
                <div className="flex w-full bg-[#0b1121] rounded-lg p-1 border border-[#1e293b]">
                    <button
                        onClick={() => setViewMode('category')}
                        className={cn(
                            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            viewMode === 'category'
                                ? "bg-[#1e293b] text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/50"
                        )}
                    >
                        Por Categoría
                    </button>
                    <button
                        onClick={() => setViewMode('subcategory')}
                        className={cn(
                            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            viewMode === 'subcategory'
                                ? "bg-[#1e293b] text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/50"
                        )}
                    >
                        Por Subcategoría
                    </button>
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
                                    formatter={(value: number) => [`$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value)}`, 'Monto']}
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
