import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Upload, Tag, Calendar, Settings, Wallet, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transacciones', icon: ArrowRightLeft },
    { href: '/recurring', label: 'Fijos', icon: Calendar },
    { href: '/categories', label: 'Categorías', icon: Tag },
    { href: '/accounts', label: 'Bolsas', icon: Wallet },
    { href: '/savings', label: 'Metas', icon: PiggyBank },
    { href: '/import', label: 'Importar', icon: Upload },
    // { href: '/settings', label: 'Ajustes', icon: Settings }, // Settings not implemented yet
];

export function AppLayout() {
    const location = useLocation();

    return (
        <div className="flex flex-col h-screen bg-[#0b1121] text-white font-sans overflow-hidden">

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative pb-20 md:pb-0">
                <div className="p-4 md:p-8 max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Navigation (Mobile Style - Always Visible per user request style) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#151e32] border-t border-[#1e293b] px-6 py-3 flex justify-between items-center z-50 md:relative md:hidden">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-colors",
                                isActive
                                    ? "text-[#4ade80]"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", isActive && "fill-current opacity-20")} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop Sidebar (Optional, if user opens on large screen) */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 bg-[#151e32] border-r border-[#1e293b]">
                <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center text-[#0b1121] font-bold text-xl mb-8">
                    G
                </div>
                <nav className="flex flex-col gap-6 w-full px-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl transition-all group relative",
                                    isActive
                                        ? "text-[#4ade80] bg-[#4ade80]/10"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                )}
                                title={item.label}
                            >
                                <Icon className="w-6 h-6" />
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#4ade80] rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Spacer for Desktop Sidebar */}
            <div className="hidden md:block w-20 flex-shrink-0" />
        </div>
    );
}
