import React, { useState, useMemo } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    List,
    Calendar,
    Tag,
    Wallet,
    PiggyBank,
    Target,
    TrendingUp,
    Upload,
    Plus,
    User,
    Sparkles,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useCheckBudgetAlerts } from '@/features/budgets/hooks/useCheckBudgetAlerts';
import { TransactionModal } from '@/features/transactions/components/TransactionModal';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useCategories } from '@/features/categories/hooks/useCategories';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transacciones', icon: List },
    { href: '/recurring', label: 'Fijos', icon: Calendar },
    { href: '/categories', label: 'Categorías', icon: Tag },
    { href: '/accounts', label: 'Bolsas', icon: Wallet },
    { href: '/savings', label: 'Metas', icon: PiggyBank },
    { href: '/budgets', label: 'Presupuestos', icon: Target },
    { href: '/trends', label: 'Tendencias', icon: TrendingUp },
    { href: '/import', label: 'Importar', icon: Upload },
];

export function AppLayout() {
    const location = useLocation();
    const { hasAnyAlert, alertCount } = useCheckBudgetAlerts();
    const { addTransaction, deleteTransaction } = useTransactions();
    const { accounts } = useAccounts();
    const { categories } = useCategories();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-midnight-950 text-slate-100 font-sans overflow-hidden selection:bg-blue-500/30">
            {/* Header / Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-midnight-950/20 backdrop-blur-xl border-b border-white/5 z-40 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="text-white font-black text-xs">M</span>
                    </div>
                    <span className="font-black text-xl tracking-tighter text-white">mon<span className="text-blue-500">Ai</span></span>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
                        <User className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative pt-16 pb-32 z-10 scroll-smooth">
                {/* Alert Badge */}
                <AnimatePresence>
                    {hasAnyAlert && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="mx-6 mt-6 p-4 liquid-glass rounded-2xl border-amber-500/30 flex items-center justify-between shadow-2xl shadow-amber-950/20"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl">
                                    <span className="text-xl">⚠️</span>
                                </div>
                                <div>
                                    <p className="font-bold text-amber-200 leading-none">
                                        {alertCount} Alerta{alertCount !== 1 ? 's' : ''} de Presupuesto
                                    </p>
                                    <p className="text-xs text-amber-300/70 mt-1">Has excedido algunos límites.</p>
                                </div>
                            </div>
                            <Link
                                to="/budgets"
                                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl font-bold text-xs transition-all uppercase tracking-widest"
                            >
                                Revisar
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="px-6 py-8 max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Floating Island Navigation */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 w-full max-w-lg">
                <nav className="liquid-glass rounded-3xl p-2.5 flex items-center justify-between shadow-2xl shadow-black/40 ring-1 ring-white/10">
                    <div className="flex items-center gap-1 justify-around flex-[2]">
                        {[navItems[0], navItems[1]].map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 min-w-[64px] relative",
                                        isActive ? "text-blue-400 bg-blue-500/10" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} strokeWidth={isActive ? 2.5 : 2} />
                                    {isActive && (
                                        <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Central Action Button */}
                    <div className="flex-1 flex justify-center mt-[-40px]">
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsModalOpen(true)}
                            className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center border-t border-white/20 transition-all cursor-pointer relative group"
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-3xl" />
                            <Plus className="w-8 h-8 relative z-10" strokeWidth={3} />
                        </motion.button>
                    </div>

                    <div className="flex items-center gap-1 justify-around flex-[2]">
                        {[navItems[3], navItems[4]].map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 min-w-[64px] relative",
                                        isActive ? "text-blue-400 bg-blue-500/10" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} strokeWidth={isActive ? 2.5 : 2} />
                                    {isActive && (
                                        <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={addTransaction}
                onDelete={deleteTransaction}
                accounts={accounts}
                categories={categories}
            />
        </div>
    );
}

// Helper navItems indices used above:
// 0: Dashboard
// 1: Transacciones
// 4: Bolsas (Accounts) -> Correct index is 12 (based on your navItems list it's 13 but 0-indexed it's 12)
// 12 -> Categories or similar. Let's adjust based on the structure.
