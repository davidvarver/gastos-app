import { useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Wallet, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartsContainer } from './components/ChartsContainer';
import { cn } from '@/lib/utils';

export function DashboardPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
    const { accounts } = useAccounts();
    const { income, expense, net, maaser, isLoading } = useDashboard(currentDate, selectedAccountId);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN' }).format(amount);

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
                    <p className="text-slate-400">Resumen financiero mensual.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Account Filter */}
                    <div className="relative">
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="appearance-none bg-[#151e32] border border-[#1e293b] text-white text-sm rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-[#4ade80] outline-none cursor-pointer hover:bg-[#1e293b] transition-colors"
                        >
                            <option value="all">Todas las Cuentas</option>
                            {accounts?.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center bg-[#151e32] rounded-xl border border-[#1e293b] p-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-[#1e293b] rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 font-medium text-white min-w-[140px] text-center capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-[#1e293b] rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#151e32] border-[#1e293b]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Ingresos</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-[#4ade80]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{isLoading ? '...' : formatCurrency(income)}</div>
                        <p className="text-xs text-slate-500 mt-1">Este mes</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#151e32] border-[#1e293b]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Gastos</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{isLoading ? '...' : formatCurrency(expense)}</div>
                        <p className="text-xs text-slate-500 mt-1">Este mes</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#151e32] border-[#1e293b]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Balance Neto</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", net >= 0 ? "text-[#4ade80]" : "text-red-400")}>
                            {isLoading ? '...' : formatCurrency(net)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Este mes</p>
                    </CardContent>
                </Card>

                {/* Maaser Card - Only show if relevant (positive income) or always show? User hasn't specified, keeping as is but maybe hidden if 0? */}
                {/* Let's keep it visible for now as it's a key feature */}
                <Card className="bg-[#151e32] border-[#1e293b] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full -mr-8 -mt-8" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-purple-400">Maaser (10%)</CardTitle>
                        <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">M</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{isLoading ? '...' : formatCurrency(maaser)}</div>
                        <p className="text-xs text-slate-500 mt-1">Calculado sobre neto</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <ChartsContainer
                currentDate={currentDate}
                onMonthClick={setCurrentDate}
                accountId={selectedAccountId}
                cardholder={cardholderFilter}
            />

            {/* Recent Transactions Placeholder or other content could go here */}
        </div>
    );
}
