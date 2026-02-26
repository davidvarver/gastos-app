import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useBudgets } from './hooks/useBudgets';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { BudgetCard } from './components/BudgetCard';
import { BudgetForm } from './components/BudgetForm';
import { formatMonthYear, getCurrentMonthYear } from '@/lib/budget-logic';
import { motion, AnimatePresence } from 'framer-motion';

export function BudgetsPage() {
    const { budgets, budgetStatuses, isLoading, error, addBudget, updateBudget, deleteBudget } = useBudgets();
    const { categories } = useCategories();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (error) {
        return (
            <div className="p-8 text-center text-red-400">
                <h2 className="text-xl font-bold mb-2">Error cargando presupuestos</h2>
                <p>{error}</p>
            </div>
        );
    }

    // Filtrar por mes y búsqueda
    const filteredBudgets = (budgetStatuses || []).filter(status => {
        const budget = status.budget;
        const categoryName = categories?.find(c => c.id === budget.categoryId)?.name || '';

        return (
            budget.monthYear === selectedMonth &&
            (categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                budget.limitAmount.toString().includes(searchTerm))
        );
    });

    const monthBudgets = (budgetStatuses || []).filter(s => s.budget.monthYear === selectedMonth);
    const totalBudgeted = monthBudgets.reduce((sum, s) => sum + s.budget.limitAmount, 0);
    const totalSpent = monthBudgets.reduce((sum, s) => sum + s.spent, 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold premium-gradient-text tracking-tight">Presupuestos</h2>
                    <p className="text-slate-400 mt-1">Controla tus gastos por categoría.</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Presupuesto
                </button>
            </div>

            {/* Selector de Mes */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Mes</label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2.5 bg-midnight-900/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            {/* Resumen */}
            {monthBudgets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Total Presupuestado</p>
                        <p className="text-2xl font-bold text-white mt-1">${totalBudgeted.toFixed(2)}</p>
                    </div>
                    <div className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Total Gastado</p>
                        <p className="text-2xl font-bold text-white mt-1">${totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Disponible</p>
                        <p className={`text-2xl font-bold mt-1 ${
                            totalSpent > totalBudgeted ? 'text-red-400' : 'text-green-400'
                        }`}>
                            ${Math.max(0, totalBudgeted - totalSpent).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            {/* Búsqueda */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar presupuesto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-midnight-900/50 backdrop-blur-md text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all hover:bg-white/5"
                />
            </div>

            {/* Lista de Presupuestos */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-400">Cargando presupuestos...</div>
            ) : filteredBudgets.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <p>No hay presupuestos para {formatMonthYear(selectedMonth)}</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 text-blue-400 hover:text-blue-300 font-semibold"
                    >
                        Crear uno ahora
                    </button>
                </div>
            ) : (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.05 }
                        }
                    }}
                >
                    <AnimatePresence>
                        {filteredBudgets.map((status) => (
                            <motion.div
                                key={status.budget.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <BudgetCard
                                    status={status}
                                    categoryName={
                                        categories?.find(c => c.id === status.budget.categoryId)?.name || 'Sin categoría'
                                    }
                                    onDelete={async () => {
                                        if (confirm('¿Eliminar este presupuesto?')) {
                                            await deleteBudget(status.budget.id);
                                        }
                                    }}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-midnight-900 border border-white/10 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-white mb-6">Nuevo Presupuesto</h2>
                        <BudgetForm
                            categories={categories}
                            onSubmit={async (data) => {
                                await addBudget(data);
                                setIsModalOpen(false);
                            }}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
