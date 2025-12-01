import React, { useState } from 'react';
import { Plus, PiggyBank, Target, Calendar, TrendingUp, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { GoalFormModal } from './components/GoalFormModal';
import { TransactionModal } from '@/features/transactions/components/TransactionModal';
import { type Account } from '@/db/db';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function SavingsPage() {
    const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
    const { addTransactions, categories } = useTransactions();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Account | null>(null);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<Account | null>(null);

    const savingsGoals = accounts?.filter(a => a.isSavingsGoal) || [];
    const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentBalance, 0);

    const handleEdit = (goal: Account) => {
        setEditingGoal(goal);
        setIsCreateModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta meta? El dinero se perderá si no lo transfieres antes.')) {
            deleteAccount(id);
        }
    };

    const handleDeposit = (goal: Account) => {
        setSelectedGoalForDeposit(goal);
        setIsDepositModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingGoal(null);
    };

    const handleSubmit = (data: Omit<Account, 'id'>) => {
        if (editingGoal) {
            updateAccount(editingGoal.id, data);
        } else {
            addAccount(data);
        }
        handleCloseModal();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <PiggyBank className="w-8 h-8 text-emerald-400" />
                        Metas de Ahorro
                    </h2>
                    <p className="text-slate-400">Visualiza y alcanza tus objetivos financieros.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#0b1121] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Meta
                </button>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-emerald-900/50 to-[#151e32] border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between">
                <div>
                    <p className="text-emerald-400 font-medium mb-1">Ahorro Total</p>
                    <h3 className="text-4xl font-bold text-white">${totalSavings.toLocaleString()}</h3>
                </div>
                <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
            </div>

            {/* Goals Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {savingsGoals.map(goal => {
                    const progress = goal.targetAmount ? Math.min((goal.currentBalance / goal.targetAmount) * 100, 100) : 0;
                    const isCompleted = progress >= 100;

                    return (
                        <div key={goal.id} className="bg-[#151e32] border border-[#1e293b] rounded-2xl p-6 space-y-4 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                            {isCompleted && (
                                <div className="absolute top-0 right-0 bg-emerald-500 text-[#0b1121] text-xs font-bold px-3 py-1 rounded-bl-xl">
                                    ¡COMPLETADA! 🎉
                                </div>
                            )}

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{goal.name}</h3>
                                    {goal.deadline && (
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            Meta: {format(goal.deadline, "d 'de' MMMM, yyyy", { locale: es })}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(goal)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(goal.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300 font-medium">${goal.currentBalance.toLocaleString()}</span>
                                    <span className="text-slate-500">de ${goal.targetAmount?.toLocaleString()}</span>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out",
                                            isCompleted ? "bg-emerald-400" : "bg-emerald-500"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-right text-xs text-emerald-400 font-bold">{progress.toFixed(1)}%</p>
                            </div>

                            <button
                                onClick={() => handleDeposit(goal)}
                                className="w-full py-2 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 rounded-lg font-medium transition-all border border-transparent hover:border-emerald-500/30"
                            >
                                + Depositar
                            </button>
                        </div>
                    );
                })}

                {savingsGoals.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                        <PiggyBank className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No tienes metas de ahorro aún.</p>
                        <p className="text-sm">Crea una nueva para empezar a trackear tus objetivos.</p>
                    </div>
                )}
            </div>

            <GoalFormModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                initialData={editingGoal || undefined}
            />

            {/* Reuse Transaction Modal for Deposits (Transfers) */}
            {selectedGoalForDeposit && (
                <TransactionModal
                    isOpen={isDepositModalOpen}
                    onClose={() => {
                        setIsDepositModalOpen(false);
                        setSelectedGoalForDeposit(null);
                    }}
                    accounts={accounts}
                    categories={categories}
                    onSave={async (tx) => {
                        await addTransactions([{
                            ...tx,
                            id: crypto.randomUUID(),
                            date: tx.date || new Date(),
                            amount: Number(tx.amount),
                            type: 'transfer',
                            accountId: tx.accountId!,
                            toAccountId: selectedGoalForDeposit.id,
                            status: 'cleared'
                        } as any]);
                        setIsDepositModalOpen(false);
                        setSelectedGoalForDeposit(null);
                    }}
                    initialData={{
                        type: 'transfer',
                        toAccountId: selectedGoalForDeposit.id,
                        description: `Ahorro para ${selectedGoalForDeposit.name}`,
                        date: new Date(),
                        amount: 0,
                        accountId: '', // User selects source
                        categoryId: '', // Optional
                        status: 'cleared'
                    }}
                />
            )}
        </div>
    );
}
