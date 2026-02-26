import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Upload, Tag, Calendar, Wallet, PiggyBank, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useCheckBudgetAlerts } from '@/features/budgets/hooks/useCheckBudgetAlerts';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transacciones', icon: ArrowRightLeft },
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

    return (
        <div className="flex flex-col h-screen bg-midnight-950 text-slate-100 font-sans overflow-hidden">
            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative pb-20 md:pb-0 z-10">
                {/* Alert Badge */}
                {hasAnyAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="sticky top-0 z-40 mx-4 mt-4 md:mx-8 md:mt-8 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="font-semibold text-amber-200">
                                    {alertCount} presupuesto{alertCount !== 1 ? 's' : ''} en alerta
                                </p>
                                <p className="text-sm text-amber-300">Revisa tus presupuestos para evitar excedentes</p>
                            </div>
                        </div>
                        <Link
                            to="/budgets"
                            className="px-4 py-2 bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 rounded-lg font-semibold transition-colors whitespace-nowrap ml-4"
                        >
                            Ver ahora
                        </Link>
                    </motion.div>
                )}

                <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-midnight-900/80 backdrop-blur-xl border-t border-white/10 px-2 py-3 flex justify-around items-center z-50 md:hidden">
                {navItems.filter(item => ['/', '/transactions', '/accounts', '/categories', '/import'].includes(item.href)).map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-300 min-w-[64px]",
                                isActive
                                    ? "text-blue-400 scale-105"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all",
                                isActive && "bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            )}>
                                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-center py-8 bg-midnight-900/50 backdrop-blur-md border-r border-white/5 z-20">
                <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-12 shadow-lg shadow-blue-500/20">
                    G
                </div>
                <nav className="flex flex-col gap-4 w-full px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-2xl transition-all group relative overflow-hidden",
                                    isActive
                                        ? "text-blue-400 bg-blue-500/10 shadow-[inset_0_0_12px_rgba(59,130,246,0.1)]"
                                        : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                                )}
                                title={item.label}
                            >
                                <Icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Spacer for Desktop Sidebar */}
            <div className="hidden md:block w-24 flex-shrink-0" />
        </div>
    );
}
