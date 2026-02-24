import React, { useState } from 'react';
import { Plus, Loader2, X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Calendar, Info } from 'lucide-react';
import { useAccounts } from './hooks/useAccounts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AccountCard } from './components/AccountCard';
import { AccountFormModal } from './components/AccountFormModal';
import { type Account } from '@/db/db';
import { motion, AnimatePresence } from 'framer-motion';

export function AccountsPage() {
    const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingAccount(null);
    };

    const handleSubmit = (data: Omit<Account, 'id'>) => {
        if (editingAccount) {
            updateAccount(editingAccount.id, data);
        } else {
            addAccount(data);
        }
        handleCloseModal();
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold premium-gradient-text tracking-tight">Mis Bolsas</h2>
                    <p className="text-slate-400 mt-1">Gestiona tu liquidez y objetivos financieros.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 hover:bg-blue-500 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Bolsa
                </button>
            </div>

            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {accounts?.map((account, idx) => (
                    <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedAccount(account)}
                        className="cursor-pointer"
                    >
                        <AccountCard
                            account={account}
                            onEdit={(acc) => {
                                handleEdit(acc);
                            }}
                            onDelete={(id) => {
                                if (confirm("¿Eliminar esta bolsa? Se perderá el historial local (si no está sincronizado).")) deleteAccount(id);
                            }}
                        />
                    </motion.div>
                ))}
            </motion.div>

            {/* Account Details Modal */}
            <AnimatePresence>
                {selectedAccount && (
                    <AccountDetailsModal
                        account={selectedAccount}
                        onClose={() => setSelectedAccount(null)}
                    />
                )}
            </AnimatePresence>

            {/* Create/Edit Account Modal */}
            <AccountFormModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                initialData={editingAccount || undefined}
            />
        </div>
    );
}

function AccountDetailsModal({ account, onClose }: { account: Account; onClose: () => void }) {
    const { transactions, isLoading } = useTransactions();

    // Filter transactions for this account (Source or Destination)
    const accountTransactions = transactions?.filter(tx =>
        tx.accountId === account.id || tx.toAccountId === account.id
    ).sort((a, b) => b.date.getTime() - a.date.getTime()) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-midnight-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative z-10 overflow-hidden"
            >
                {/* Header */}
                <div className="p-5 md:p-8 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl md:text-2xl font-black text-white">{account.name}</h3>
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-widest">
                                {account.type}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs md:text-sm font-medium">Historial completo de movimientos</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo Actual</p>
                        <p className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tighter shadow-emerald-500/10 drop-shadow-sm">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: account.currency }).format(account.currentBalance ?? account.initialBalance)}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando movimientos...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accountTransactions.map((tx, idx) => {
                                let isPositive = false;
                                if (tx.type === 'income') isPositive = true;
                                else if (tx.type === 'expense') isPositive = false;
                                else if (tx.type === 'transfer') isPositive = tx.toAccountId === account.id;

                                return (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="flex items-center justify-between p-3 md:p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className={cn(
                                                "p-2 md:p-3 rounded-xl shadow-lg",
                                                isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                            )}>
                                                {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" /> :
                                                    tx.type === 'expense' ? <ArrowDownLeft className="w-4 h-4 md:w-5 md:h-5" /> :
                                                        <ArrowRightLeft className="w-4 h-4 md:w-5 md:h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm md:text-base text-white group-hover:text-blue-200 transition-colors line-clamp-1">{tx.description}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Calendar className="w-3 h-3 text-slate-600" />
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                                        {format(tx.date, 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-lg font-black tracking-tighter",
                                            isPositive ? "text-emerald-400" : "text-slate-300"
                                        )}>
                                            {isPositive ? '+' : '-'}{new Intl.NumberFormat('es-MX', { style: 'currency', currency: account.currency }).format(tx.amount)}
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {accountTransactions.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                    <Info className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">Sin movimientos registrados</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all font-black uppercase tracking-[0.2em] text-[10px] border border-white/10"
                    >
                        Cerrar Registro
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
