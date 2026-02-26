import { Budget, Transaction } from '@/db/db';
import { format } from 'date-fns';

export interface BudgetStatus {
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
    isExceeded: boolean;
    shouldAlert: boolean;
}

/**
 * Calcula el estado de un presupuesto basado en transacciones del mes
 */
export function calculateBudgetStatus(
    budget: Budget,
    transactions: Transaction[]
): BudgetStatus {
    // Filtrar transacciones del mes/categoría
    const monthTransactions = transactions.filter(tx => {
        const txMonthYear = format(tx.date, 'yyyy-MM');
        return (
            tx.type === 'expense' &&
            tx.categoryId === budget.categoryId &&
            txMonthYear === budget.monthYear
        );
    });

    const spent = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = Math.max(0, budget.limitAmount - spent);
    const percentage = (spent / budget.limitAmount) * 100;
    const isExceeded = percentage > 100;
    const shouldAlert = percentage >= budget.alertThreshold;

    return {
        budget,
        spent,
        remaining,
        percentage,
        isExceeded,
        shouldAlert
    };
}

/**
 * Obtiene el status de color para visualizar el presupuesto
 */
export function getBudgetColor(percentage: number): string {
    if (percentage >= 100) return 'rgb(239, 68, 68)'; // Red
    if (percentage >= 80) return 'rgb(217, 119, 6)'; // Amber
    return 'rgb(34, 197, 94)'; // Green
}

/**
 * Obtiene emoji indicativo del estado
 */
export function getBudgetEmoji(percentage: number): string {
    if (percentage >= 100) return '🔴';
    if (percentage >= 80) return '🟡';
    return '🟢';
}

/**
 * Formatea mes/año para visualización
 */
export function formatMonthYear(monthYear: string): string {
    const months: Record<string, string> = {
        '01': 'Enero',
        '02': 'Febrero',
        '03': 'Marzo',
        '04': 'Abril',
        '05': 'Mayo',
        '06': 'Junio',
        '07': 'Julio',
        '08': 'Agosto',
        '09': 'Septiembre',
        '10': 'Octubre',
        '11': 'Noviembre',
        '12': 'Diciembre'
    };

    const [year, month] = monthYear.split('-');
    return `${months[month]} ${year}`;
}

/**
 * Obtiene el mes/año actual en formato "YYYY-MM"
 */
export function getCurrentMonthYear(): string {
    return format(new Date(), 'yyyy-MM');
}
