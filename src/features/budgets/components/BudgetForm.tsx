import { useState } from 'react';
import { Budget, BudgetInput, Category } from '@/db/db';
import { setMonth, setYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface BudgetFormProps {
    categories: Category[] | undefined;
    onSubmit: (data: BudgetInput) => Promise<void>;
    initialBudget?: Budget;
    onCancel?: () => void;
}

export function BudgetForm({
    categories,
    onSubmit,
    initialBudget,
    onCancel
}: BudgetFormProps) {
    const [formData, setFormData] = useState<BudgetInput>(
        initialBudget
            ? {
                  categoryId: initialBudget.categoryId,
                  monthYear: initialBudget.monthYear,
                  limitAmount: initialBudget.limitAmount,
                  alertThreshold: initialBudget.alertThreshold
              }
            : {
                  categoryId: '',
                  monthYear: new Date().toISOString().slice(0, 7),
                  limitAmount: 0,
                  alertThreshold: 80
              }
    );

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.categoryId || formData.limitAmount <= 0) {
            alert('Completa todos los campos');
            return;
        }

        setIsLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categoría */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Categoría</label>
                <select
                    value={formData.categoryId}
                    onChange={(e) =>
                        setFormData(prev => ({
                            ...prev,
                            categoryId: e.target.value
                        }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                    <option value="">Selecciona una categoría</option>
                    {categories?.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Mes/Año */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Mes</label>
                <input
                    type="month"
                    value={formData.monthYear}
                    onChange={(e) =>
                        setFormData(prev => ({
                            ...prev,
                            monthYear: e.target.value
                        }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            {/* Límite */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Límite ($)</label>
                <input
                    type="number"
                    value={formData.limitAmount || ''}
                    onChange={(e) =>
                        setFormData(prev => ({
                            ...prev,
                            limitAmount: parseFloat(e.target.value) || 0
                        }))
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2.5 bg-midnight-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            {/* Threshold de Alerta */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">
                    Alerta a: {formData.alertThreshold}%
                </label>
                <input
                    type="range"
                    value={formData.alertThreshold}
                    onChange={(e) =>
                        setFormData(prev => ({
                            ...prev,
                            alertThreshold: parseFloat(e.target.value)
                        }))
                    }
                    min="10"
                    max="100"
                    step="5"
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-400">
                    <span>10%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Guardando...' : 'Guardar Presupuesto'}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}
