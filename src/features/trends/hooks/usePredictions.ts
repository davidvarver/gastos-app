import { useMemo } from 'react';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useTrendData } from './useTrendData';
import { predictMonthEnd, PredictionData } from '@/lib/trend-logic';

export function usePredictions(categoryId?: string) {
    const { transactions } = useTransactions();
    const { trendStats } = useTrendData(categoryId, 6);

    const prediction = useMemo<PredictionData | undefined>(() => {
        if (!transactions || !trendStats) return undefined;

        return predictMonthEnd(trendStats.monthlyData, trendStats.average);
    }, [transactions, trendStats]);

    return {
        prediction,
        projectedTotal: prediction?.projectedTotal || 0,
        avgPerDay: prediction?.avgPerDay || 0,
        daysPassed: prediction?.daysPassed || 0,
        daysRemaining: prediction?.daysRemaining || 0,
        comparisonLastMonth: prediction?.comparisonLastMonth || {
            percentage: 0,
            direction: 'same' as const
        },
        isLoading: !transactions || !trendStats
    };
}
