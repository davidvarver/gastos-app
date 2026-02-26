import { useState, useEffect } from 'react';
import { useBudgets } from './useBudgets';
import { BudgetStatus } from '@/lib/budget-logic';

export interface ActiveAlert {
    budgetId: string;
    categoryName: string;
    percentage: number;
    spent: number;
    limit: number;
    remainingDays: number;
}

/**
 * Hook que verifica alertas de presupuesto
 * Notifica cuando se excede el threshold
 */
export function useCheckBudgetAlerts() {
    const { budgetStatuses } = useBudgets();
    const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
    const [hasAnyAlert, setHasAnyAlert] = useState(false);

    useEffect(() => {
        if (!budgetStatuses) return;

        const alerts: ActiveAlert[] = [];

        budgetStatuses.forEach(status => {
            if (status.shouldAlert) {
                const daysInMonth = new Date(
                    new Date().getFullYear(),
                    parseInt(status.budget.monthYear.split('-')[1]),
                    0
                ).getDate();

                const daysRemaining = daysInMonth - new Date().getDate();

                alerts.push({
                    budgetId: status.budget.id,
                    categoryName: status.budget.categoryId, // Will be replaced with category name in UI
                    percentage: status.percentage,
                    spent: status.spent,
                    limit: status.budget.limitAmount,
                    remainingDays: Math.max(0, daysRemaining)
                });
            }
        });

        setActiveAlerts(alerts);
        setHasAnyAlert(alerts.length > 0);
    }, [budgetStatuses]);

    return {
        activeAlerts,
        hasAnyAlert,
        alertCount: activeAlerts.length
    };
}
