import React, { useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function DashboardPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { income, expense, net, maaser, chartData, isLoading } = useDashboard(currentDate);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    if (isLoading) return <div className="flex items-center justify-center h-96 text-slate-400">Cargando...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Month Selector */}
            <div className="flex items-center justify-between bg-[#151e32] p-4 rounded-2xl border border-[#1e293b] shadow-lg">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-white capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Main Balance Card */}
            <div className="bg-[#151e32] rounded-3xl p-8 border border-[#1e293b] shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-800/50 rounded-lg">
                            <Wallet className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-slate-400 font-medium">Balance Mensual</span>
                    </div>
                    <div className={cn(
                        "text-5xl font-bold tracking-tight mt-2",
                        net >= 0 ? "text-[#4ade80]" : "text-red-500"
                    )}>
                        {formatCurrency(net)}
                    </div>
                </div>

                {/* Decorative Background Blur */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#4ade80] opacity-5 blur-[100px] rounded-full pointer-events-none" />

                {/* Income / Expense Split */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-[#0b1121]/50 p-4 rounded-2xl border border-[#1e293b]/50">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <TrendingUp className="w-4 h-4 text-[#4ade80]" />
                            Ingresos
                        </div>
                        <div className="text-xl font-semibold text-white">{formatCurrency(income)}</div>
                    </div>
                    <div className="bg-[#0b1121]/50 p-4 rounded-2xl border border-[#1e293b]/50">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            Gastos
                        </div>
                        <div className="text-xl font-semibold text-white">{formatCurrency(expense)}</div>
                    </div>
                </div>
            </div>

            {/* Maaser Card (Conditional) */}
            {net > 0 && (
                <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm text-violet-200">Maaser (10%)</div>
                            <div className="text-xs text-violet-400/60">Sugerido para donar</div>
                        </div>
                    </div>
                    <div className="text-xl font-bold text-violet-300">{formatCurrency(maaser)}</div>
                </div>
            )}

            {/* Charts Section */}
            <div className="bg-[#151e32] rounded-3xl p-6 border border-[#1e293b] shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-6">Gastos por Categoría</h3>

                <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        borderColor: '#334155',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                            <div className="p-4 bg-slate-800/50 rounded-full">
                                <PieChart className="w-8 h-8 opacity-50" />
                            </div>
                            <p>No hay gastos este mes</p>
                        </div>
                    )}
                </div>

                {/* List Details */}
                <div className="mt-6 space-y-3">
                    {chartData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-[0_0_10px]" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                                <span className="text-slate-300 font-medium">{item.name}</span>
                            </div>
                            <span className="text-white font-semibold">{formatCurrency(item.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
