import React from 'react';
import { Wallet, MoreVertical, Edit, Trash, CreditCard, Banknote } from 'lucide-react';
import { type Account } from '@/db/db';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AccountCardProps {
    account: Account;
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
    const isWallet = account.type === 'wallet';
    const isBusiness = account.type === 'business';
    const isInvestment = account.type === 'investment';

    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card p-6 shadow-2xl relative group overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-colors" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={cn(
                    "p-3 rounded-2xl shadow-lg border border-white/10",
                    isBusiness ? "bg-amber-500/20 text-amber-400" :
                        isWallet ? "bg-emerald-500/20 text-emerald-400" :
                            isInvestment ? "bg-purple-500/20 text-purple-400" :
                                "bg-blue-500/20 text-blue-400"
                )}>
                    {isBusiness ? <Banknote className="w-6 h-6" /> :
                        isWallet ? <Wallet className="w-6 h-6" /> :
                            isInvestment ? <CreditCard className="w-6 h-6" /> :
                                <Wallet className="w-6 h-6" />}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(account);
                        }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(account.id);
                        }}
                        className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 transition-all"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="font-bold text-xl text-white mb-1 group-hover:text-blue-200 transition-colors">{account.name}</h3>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {account.type} • {account.currency}
                </span>

                <div className="mt-6">
                    <div className="text-3xl font-black text-white tracking-tighter">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: account.currency }).format(account.currentBalance ?? account.initialBalance)}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Saldo Disponible</p>
                </div>
            </div>

            {/* Decorative progress bar background */}
            <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                        "h-full rounded-full",
                        isBusiness ? "bg-amber-500" :
                            isWallet ? "bg-emerald-500" :
                                isInvestment ? "bg-purple-500" :
                                    "bg-blue-500"
                    )}
                />
            </div>
        </motion.div>
    );
}
