import { BudgetStatus, getBudgetColor, getBudgetEmoji } from '@/lib/budget-logic';
import { Trash2, Edit2 } from 'lucide-react';

interface BudgetCardProps {
    status: BudgetStatus;
    categoryName: string;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function BudgetCard({
    status,
    categoryName,
    onEdit,
    onDelete
}: BudgetCardProps) {
    const color = getBudgetColor(status.percentage);
    const emoji = getBudgetEmoji(status.percentage);
    const percentage = Math.min(100, status.percentage);

    return (
        <div className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/5 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{emoji}</span>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">{categoryName}</h3>
                        <p className="text-xs text-slate-400">
                            ${status.spent.toFixed(2)} de ${status.budget.limitAmount.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">
                        {status.percentage.toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-400">
                        {status.isExceeded
                            ? `${(status.percentage - 100).toFixed(0)}% sobre`
                            : `Quedan $${status.remaining.toFixed(2)}`}
                    </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: color
                        }}
                    />
                </div>
            </div>

            {/* Badge de alerta */}
            {status.shouldAlert && (
                <div className="mt-3 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg text-xs text-amber-200 text-center">
                    {status.percentage >= 100
                        ? '⚠️ Presupuesto excedido'
                        : '⚠️ Acercándose al límite'}
                </div>
            )}
        </div>
    );
}
