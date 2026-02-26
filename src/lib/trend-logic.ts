import { Transaction } from '@/db/db';
import { format, subMonths } from 'date-fns';

export interface MonthlyData {
    month: string; // "Sep 2024"
    monthYear: string; // "2024-09"
    total: number;
    categoryTotals: Record<string, number>;
}

export interface TrendStats {
    monthlyData: MonthlyData[];
    average: number;
    stdDev: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    trendEmoji: string;
}

export interface PredictionData {
    projectedTotal: number;
    predictedDate: Date;
    avgPerDay: number;
    daysPassed: number;
    daysRemaining: number;
    comparisonLastMonth: {
        percentage: number;
        direction: 'up' | 'down' | 'same';
    };
}

/**
 * Obtiene últimos N meses de datos de transacciones
 */
export function getMonthlyData(
    transactions: Transaction[],
    months: number = 6,
    categoryId?: string
): MonthlyData[] {
    const data: MonthlyData[] = [];

    for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthYear = format(date, 'yyyy-MM');
        const monthDisplay = format(date, 'MMM yyyy');

        const monthTxs = transactions.filter(tx => {
            const txMonthYear = format(tx.date, 'yyyy-MM');
            return (
                tx.type === 'expense' &&
                txMonthYear === monthYear &&
                (!categoryId || tx.categoryId === categoryId)
            );
        });

        // Calcular totales por categoría
        const categoryTotals: Record<string, number> = {};
        monthTxs.forEach(tx => {
            const catId = tx.categoryId || 'untagged';
            categoryTotals[catId] = (categoryTotals[catId] || 0) + tx.amount;
        });

        const total = monthTxs.reduce((sum, tx) => sum + tx.amount, 0);

        data.push({
            month: monthDisplay,
            monthYear,
            total,
            categoryTotals
        });
    }

    return data;
}

/**
 * Calcula promedio de últimos N meses
 */
export function calculateAverage(monthlyData: MonthlyData[]): number {
    if (monthlyData.length === 0) return 0;
    const sum = monthlyData.reduce((acc, m) => acc + m.total, 0);
    return sum / monthlyData.length;
}

/**
 * Calcula desviación estándar
 */
export function calculateStdDev(monthlyData: MonthlyData[]): number {
    if (monthlyData.length <= 1) return 0;
    const avg = calculateAverage(monthlyData);
    const variance =
        monthlyData.reduce((acc, m) => acc + Math.pow(m.total - avg, 2), 0) /
        monthlyData.length;
    return Math.sqrt(variance);
}

/**
 * Detecta la tendencia (creciente, estable, decreciente)
 */
export function detectTrend(
    monthlyData: MonthlyData[]
): 'INCREASING' | 'STABLE' | 'DECREASING' {
    if (monthlyData.length < 2) return 'STABLE';

    const diffs = monthlyData
        .slice(1)
        .map((m, i) => m.total - monthlyData[i].total);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    // Threshold: 3% del promedio
    const threshold = calculateAverage(monthlyData) * 0.03;

    if (avgDiff > threshold) return 'INCREASING';
    if (avgDiff < -threshold) return 'DECREASING';
    return 'STABLE';
}

/**
 * Predice el total del mes actual
 */
export function predictMonthEnd(
    monthData: MonthlyData[],
    historicalAverage: number
): PredictionData {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysPassed = Math.floor(
        (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - daysPassed;

    // Gasto actual este mes
    const currentMonthData = monthData[monthData.length - 1];
    const currentSpent = currentMonthData?.total || 0;

    // Predicción simple: promedio del día * días restantes
    const avgPerDay = currentSpent / daysPassed;
    const projectedTotal = currentSpent + avgPerDay * daysRemaining;

    // Comparación con mes anterior (si existe)
    const lastMonth = monthData[monthData.length - 2];
    const lastMonthTotal = lastMonth?.total || historicalAverage;
    const percentageDiff = ((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100;

    return {
        projectedTotal,
        predictedDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        avgPerDay,
        daysPassed,
        daysRemaining,
        comparisonLastMonth: {
            percentage: Math.abs(percentageDiff),
            direction: percentageDiff > 0 ? 'up' : percentageDiff < 0 ? 'down' : 'same'
        }
    };
}

/**
 * Obtiene emoji de tendencia
 */
export function getTrendEmoji(trend: string): string {
    const emojis: Record<string, string> = {
        INCREASING: '📈',
        STABLE: '→',
        DECREASING: '📉'
    };
    return emojis[trend] || '→';
}

/**
 * Formatea número como moneda
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}
