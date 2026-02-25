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
                expense: 0,
                isCurrentMonth: i === timeRange - 1
            };
        });

        transactions.forEach(tx => {
            if (accountId && accountId !== 'all' && tx.accountId !== accountId) return;
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

        // Calculate Average Expense (Benchmark) for the last 3 months (excluding current)
        const pastMonths = months.slice(-4, -1); // Previous 3 months
        const avgExpense = pastMonths.length > 0
            ? pastMonths.reduce((acc, m) => acc + m.expense, 0) / pastMonths.length
            : 0;

        // Calculate Projection for current month
        const currentMonth = months[months.length - 1];
        const daysInMonth = new Date(currentMonth.monthObj.getFullYear(), currentMonth.monthObj.getMonth() + 1, 0).getDate();
        const currentDay = Math.max(1, new Date().getDate());
        const projectedExpense = (currentMonth.expense / currentDay) * daysInMonth;

        return months.map(m => ({
            ...m,
            benchmark: avgExpense,
            projection: m.isCurrentMonth ? projectedExpense : null
        }));
    }, [transactions, timeRange, accountId, cardholder]);

    return (
        <Card className="bg-[#151e32] border-[#1e293b] overflow-hidden group/chart">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 relative z-10">
                <div>
                    <CardTitle className="text-white text-lg">Análisis de Flujo</CardTitle>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Benchmarks y proyecciones basadas en IA local</p>
                </div>
                <div className="flex bg-[#0b1121] rounded-xl p-1 border border-white/5">
                    {[3, 6, 12].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range as 3 | 6 | 12)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                timeRange === range
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            {range}M
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            onClick={(state: any) => {
                                if (state && state.activePayload && state.activePayload.length > 0) {
                                    const payload = state.activePayload[0].payload as Record<string, unknown>;
                                    if (payload && payload.monthObj && onMonthClick) {
                                        onMonthClick(new Date(payload.monthObj as string | number | Date));
                                    }
                                }
                            }}
                            className={cn(onMonthClick ? "cursor-pointer" : "")}
                        >
                            <defs>
                                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f87171" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#475569"
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#475569"
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                tickFormatter={(value) => `$${value / 1000}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                                contentStyle={{
                                    backgroundColor: '#0b1121cc',
                                    backdropFilter: 'blur(12px)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    color: '#fff',
                                    padding: '12px'
                                }}
                                formatter={(value: number, name: string) => {
                                    const formatted = `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(value)}`;
                                    if (name === "projection") return [formatted, "Estimado fin de mes"];
                                    return [formatted, name.charAt(0).toUpperCase() + name.slice(1)];
                                }}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload[0] && payload[0].payload) {
                                        return payload[0].payload.fullName;
                                    }
                                    return label;
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            />
                            <Bar dataKey="income" name="Ingresos" fill="url(#incomeGradient)" radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="expense" name="Gastos" fill="url(#expenseGradient)" radius={[6, 6, 0, 0]} barSize={20} />

                            {/* Projection Bar (Dashed or Opacity) */}
                            <Bar dataKey="projection" name="Proyección" fill="#f87171" radius={[6, 6, 0, 0]} barSize={8} opacity={0.3} />

                            {/* Benchmark Reference Line */}
                            <svg>
                                {data.length > 0 && (
                                    <line
                                        x1="0"
                                        y1={data[0].benchmark}
                                        x2="100%"
                                        y2={data[0].benchmark}
                                        stroke="#facc15"
                                        strokeDasharray="5 5"
                                        strokeWidth={1}
                                        opacity={0.5}
                                    />
                                )}
                            </svg>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
