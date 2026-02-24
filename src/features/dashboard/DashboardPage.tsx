import { useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartsContainer } from './components/ChartsContainer';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function DashboardPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
    const [filterCardholder, setFilterCardholder] = useState<string>('');
    const { accounts } = useAccounts();
    const { income, expense, net, maaser, isLoading } = useDashboard(currentDate, selectedAccountId);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN' }).format(amount);

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

    return (
        <motion.div
            className="space-y-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <motion.div variants={itemVariants}>
                    <h2 className="text-4xl font-extrabold tracking-tight premium-gradient-text">Dashboard</h2>
                    <p className="text-slate-400 mt-1">Tu salud financiera de un vistazo.</p>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Account Filter */}
                    <div className="relative group flex-1 sm:flex-none">
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="appearance-none bg-midnight-900/50 backdrop-blur-md border border-white/10 text-white text-sm rounded-2xl pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-white/5 transition-all w-full md:w-auto min-w-[180px]"
                        >
                            <option value="all">Todas las Cuentas</option>
                            {accounts?.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                        <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                        <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
                    </div>

                    {/* Cardholder Filter */}
                    <div className="relative group flex-1 sm:flex-none">
                        <input
                            type="text"
                            placeholder="Titular..."
                            value={filterCardholder}
                            onChange={(e) => setFilterCardholder(e.target.value)}
                            className="bg-midnight-900/50 backdrop-blur-md border border-white/10 text-white text-sm rounded-2xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none hover:bg-white/5 transition-all w-full sm:w-[150px]"
                        />
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center justify-between sm:justify-start bg-midnight-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-1.5 shadow-lg w-full sm:w-auto">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 font-semibold text-white min-w-[120px] sm:min-w-[140px] text-center capitalize tracking-wider text-sm">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Ingresos', val: income, icon: ArrowUpCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'group-hover:shadow-emerald-500/20' },
                    { title: 'Gastos', val: expense, icon: ArrowDownCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', glow: 'group-hover:shadow-rose-500/20' },
                    { title: 'Balance Neto', val: net, icon: Wallet, color: net >= 0 ? "text-blue-400" : "text-rose-400", bg: 'bg-blue-500/10', glow: 'group-hover:shadow-blue-500/20' },
                    { title: 'Maaser (10%)', val: maaser, icon: PiggyBank, color: 'text-purple-400', bg: 'bg-purple-500/10', isMaaser: true, glow: 'group-hover:shadow-purple-500/20' }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        variants={itemVariants}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={cn(
                            "glass-card p-6 relative overflow-hidden group transition-all duration-500",
                            stat.glow
                        )}
                    >
                        <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-125", stat.bg)} />

                        {/* Interactive Sparkle Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                        <div className="flex flex-row items-center justify-between pb-4 relative z-10">
                            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">{stat.title}</h3>
                            <stat.icon className={cn("h-5 w-5 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110", stat.color)} />
                        </div>

                        <div className="space-y-1 relative z-10">
                            <motion.div
                                key={stat.val}
                                initial={{ scale: 0.95, opacity: 0.8 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                className={cn("text-3xl font-black tracking-tight flex items-center gap-2", stat.val < 0 ? 'text-rose-400' : 'text-white')}
                            >
                                {isLoading ? (
                                    <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg" />
                                ) : (
                                    <>
                                        {formatCurrency(stat.val)}
                                        {/* Animated pulse indicator when value changes */}
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                            transition={{ duration: 1 }}
                                            className={cn("absolute inset-0 rounded-lg pointer-events-none", stat.bg)}
                                        />
                                    </>
                                )}
                            </motion.div>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase opacity-80">
                                {stat.isMaaser ? 'Basado en ingreso neto' : 'Total este mes'}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <motion.div variants={itemVariants} className="glass-card p-6 md:p-8">
                <ChartsContainer
                    currentDate={currentDate}
                    onMonthClick={setCurrentDate}
                    accountId={selectedAccountId}
                    cardholder={filterCardholder}
                />
            </motion.div>
        </motion.div>
    );
}

function PiggyBank(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
            <path d="M7 11h.01" />
            <path d="M11 20v-2" />
            <path d="M7 20v-2" />
        </svg>
    );
}
