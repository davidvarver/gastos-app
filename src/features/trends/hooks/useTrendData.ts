import { useMemo } from 'react';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import {
    getMonthlyData,
    MonthlyData,
    calculateAverage,
    calculateStdDev,
    detectTrend,
    TrendStats
} from '@/lib/trend-logic';

export function useTrendData(categoryId?: string, months: number = 6) {
    const { transactions } = useTransactions();

    const trendStats = useMemo<TrendStats | undefined>(() => {
        if (!transactions) return undefined;

        const monthlyData = getMonthlyData(transactions, months, categoryId);
        const average = calculateAverage(monthlyData);
        const stdDev = calculateStdDev(monthlyData);
        const trend = detectTrend(monthlyData);

        return {
            monthlyData,
            average,
            stdDev,
            trend,
            trendEmoji: trend === 'INCREASING' ? '📈' : trend === 'DECREASING' ? '📉' : '→'
        };
    }, [transactions, categoryId, months]);

    return {
        trendStats,
        isLoading: !transactions,
        monthlyData: trendStats?.monthlyData,
        average: trendStats?.average || 0,
        stdDev: trendStats?.stdDev || 0,
        trend: trendStats?.trend || 'STABLE',
        trendEmoji: trendStats?.trendEmoji || '→'
    };
}
