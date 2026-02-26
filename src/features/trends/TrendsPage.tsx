import { useState } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useTrendData } from './hooks/useTrendData';
import { usePredictions } from './hooks/usePredictions';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/trend-logic';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function TrendsPage() {
    const { categories } = useCategories();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

    const { trendStats, average, stdDev, trend, trendEmoji } = useTrendData(selectedCategoryId, 6);
    const { prediction, comparisonLastMonth } = usePredictions(selectedCategoryId);

    if (!trendStats || !prediction) {
        return <div className="p-8 text-center text-slate-400">Cargando tendencias...</div>;
    }

    // Preparar datos para charts
    const chartData = trendStats.monthlyData.map(m => ({
        name: m.month,
        amount: m.total
    }));

    const topCategories = Object.entries(
        trendStats.monthlyData.reduce((acc, m) => {
            Object.entries(m.categoryTotals).forEach(([catId, amount]) => {
                acc[catId] = (acc[catId] || 0) + amount;
            });
            return acc;
        }, {} as Record<string, number>)
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([catId, total]) => ({
            name: categories?.find(c => c.id === catId)?.name || 'Sin categoría',
            amount: total
        }));

    return (
        <motion.div
            className="space-y-8 pb-10"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <h2 className="text-4xl font-extrabold premium-gradient-text tracking-tight">Tendencias & Predicciones</h2>
                <p className="text-slate-400 mt-1">Entiende tus patrones de gasto y proyecciones.</p>
            </motion.div>

            {/* Selector de Categoría */}
            <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Filtrar por categoría</label>
                <select
                    value={selectedCategoryId || ''}
                    onChange={(e) => setSelectedCategoryId(e.target.value || undefined)}
                    className="px-4 py-2.5 bg-midnight-900/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-60"
                >
                    <option value="">Todas las categorías</option>
                    {categories?.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </motion.div>

            {/* 1. Gasto Promedio Mensual */}
            <motion.div
                variants={itemVariants}
                className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8"
            >
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Gasto Promedio Mensual</h3>
                    <p className="text-4xl font-extrabold text-blue-400">{formatCurrency(average)}</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Desviación estándar: ±{formatCurrency(stdDev)}
                    </p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                        <YAxis stroke="rgba(255,255,255,0.5)" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                            formatter={(value) => formatCurrency(value as number)}
                        />
                        <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>

            {/* 2. Top Categorías */}
            <motion.div
                variants={itemVariants}
                className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8"
            >
                <h3 className="text-xl font-bold text-white mb-6">Top Categorías (últimos 6 meses)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCategories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                        <YAxis stroke="rgba(255,255,255,0.5)" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                            formatter={(value) => formatCurrency(value as number)}
                        />
                        <Bar dataKey="amount" fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
            </motion.div>

            {/* 3. Predicción Este Mes */}
            <motion.div
                variants={itemVariants}
                className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-blue-500/50 rounded-2xl p-8"
            >
                <h3 className="text-xl font-bold text-white mb-4">📊 Predicción Este Mes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-300">Proyectado al cierre del mes</p>
                        <p className="text-3xl font-bold text-blue-300 mt-1">{formatCurrency(prediction.projectedTotal)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-300">Comparado al promedio</p>
                        <p className="text-3xl font-bold text-white mt-1">
                            {formatCurrency(average)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {Math.round((prediction.projectedTotal / average - 1) * 100)}% {prediction.projectedTotal > average ? 'más' : 'menos'}
                        </p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-blue-500/30 text-sm">
                    <p className="text-slate-300">
                        {prediction.daysPassed} días del mes, {prediction.daysRemaining} quedan
                    </p>
                    <p className="text-slate-400 mt-1">
                        Promedio: {formatCurrency(prediction.avgPerDay)} por día
                    </p>
                </div>
            </motion.div>

            {/* 4. Comparación Mes a Mes */}
            {trendStats.monthlyData.length >= 2 && (
                <motion.div
                    variants={itemVariants}
                    className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8"
                >
                    <h3 className="text-xl font-bold text-white mb-6">Comparación Mes a Mes</h3>
                    <div className="space-y-3">
                        {trendStats.monthlyData.slice(-3).reverse().map((month, idx) => {
                            const prev = trendStats.monthlyData[trendStats.monthlyData.length - 2 - idx];
                            if (!prev) return null;

                            const diff = ((month.total - prev.total) / prev.total) * 100;
                            const isHigher = diff > 0;

                            return (
                                <div key={month.monthYear} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-white">{month.month}</p>
                                        <p className="text-sm text-slate-400">vs {prev.month}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-white">{formatCurrency(month.total)}</p>
                                        <p className={`text-sm ${isHigher ? 'text-red-400' : 'text-green-400'}`}>
                                            {isHigher ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* 5. Tendencia General */}
            <motion.div
                variants={itemVariants}
                className={`bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center`}
            >
                <div className="text-5xl mb-4">{trendEmoji}</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    {trend === 'INCREASING' && 'Tendencia Creciente 📈'}
                    {trend === 'DECREASING' && 'Tendencia Decreciente 📉'}
                    {trend === 'STABLE' && 'Tendencia Estable →'}
                </h3>
                <p className="text-slate-300 mt-4 max-w-md mx-auto">
                    {trend === 'INCREASING' &&
                        'Tus gastos se van a la alza. Considera revisar tus categorías con mayor gasto.'}
                    {trend === 'DECREASING' &&
                        '¡Excelente! Tus gastos van a la baja. Mantén este ritmo.'}
                    {trend === 'STABLE' &&
                        'Tus gastos se mantienen estables. Buena consistencia en tu presupuesto.'}
                </p>
            </motion.div>
        </motion.div>
    );
}
