import { useState, useMemo } from 'react';
import { useDashboard } from './hooks/useDashboard';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { ArrowUpCircle, ArrowDownCircle, Wallet, ChevronLeft, ChevronRight, Download, Sparkles, TrendingUp, Lightbulb, PiggyBank, Loader2 } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartsContainer } from './components/ChartsContainer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { generateMonthlyReport } from '@/lib/pdf-export';
import { toast } from 'sonner';
import { analyzeFinancialData } from '@/lib/ai-service';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

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
    const [isExporting, setIsExporting] = useState(false);
    const { accounts } = useAccounts();
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { income, expense, net, maaser, isLoading } = useDashboard(currentDate, selectedAccountId);
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(false);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN' }).format(amount);

    const handlePrevMonth = () => setCurrentDate((prev: Date) => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate((prev: Date) => addMonths(prev, 1));

    // Real AI Insights
    useEffect(() => {
        const fetchInsights = async () => {
            if (isLoading || income === 0 && expense === 0) return;

            setIsAnalyzing(true);
            try {
                // Get top categories for the analysis
                const monthTransactions = transactions?.filter((tx: any) =>
                    format(tx.date, 'yyyy-MM') === format(currentDate, 'yyyy-MM')
                ) || [];

                const categoryTotals = monthTransactions
                    .filter((tx: any) => tx.type === 'expense')
                    .reduce((acc: Record<string, number>, tx: any) => {
                        const cat = categories?.find((c: any) => c.id === tx.categoryId);
                        const catName = cat?.name || 'Sin categoría';
                        acc[catName] = (acc[catName] || 0) + tx.amount;
                        return acc;
                    }, {} as Record<string, number>);

                const topCategories = Object.entries(categoryTotals)
                    .map(([name, amount]) => ({ name, amount: amount as number }))
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 3);

                const newInsights = await analyzeFinancialData({
                    income,
                    expense,
                    net,
                    maaser,
                    topCategories,
                    month: format(currentDate, 'MMMM yyyy', { locale: es })
                });
                setAiInsights(newInsights);
                setAnalysisError(false);
            } catch (err) {
                console.error("AI Analysis failed:", err);
                setAnalysisError(true);
            } finally {
                setIsAnalyzing(false);
            }
        };

        fetchInsights();
    }, [income, expense, currentDate, selectedAccountId]);

    const handleRetryAnalysis = () => {
        setAiInsights([]);
        setAnalysisError(false);
        // This will trigger the useEffect because we cleared aiInsights or we can just rely on state change if needed
    };

    const handleExportPDF = async () => {
        if (!transactions) {
            toast.error('Esperando datos de transacciones...');
            return;
        }

        setIsExporting(true);
        try {
            const monthYear = format(currentDate, 'yyyy-MM');
            const monthDisplay = format(currentDate, 'MMMM yyyy', { locale: es });

            // Filtrar transacciones del mes
            const monthTransactions = transactions
                .filter((tx: any) => format(tx.date, 'yyyy-MM') === monthYear)
                .map((tx: any) => ({
                    ...tx,
                    categoryName: categories?.find((c: any) => c.id === tx.categoryId)?.name || 'Sin categoría'
                }))
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Top categorías
            const categoryTotals = monthTransactions
                .filter((tx: any) => tx.type === 'expense')
                .reduce((acc: Record<string, number>, tx: any) => {
                    const catName = tx.categoryName;
                    acc[catName] = (acc[catName] || 0) + tx.amount;
                    return acc;
                }, {} as Record<string, number>);

            const topCategories = Object.entries(categoryTotals)
                .map(([name, amount]) => ({ name, amount: amount as number }))
                .sort((a, b) => b.amount - a.amount);

            await generateMonthlyReport({
                month: monthDisplay,
                monthYear,
                income,
                expense,
                net,
                maaser,
                transactions: monthTransactions,
                topCategories,
                averageDaily: expense / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
            });

            toast.success('PDF descargado correctamente');
        } catch (err) {
            console.error('Error exporting PDF:', err);
            toast.error('Error al exportar PDF');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <motion.div
            className="space-y-10"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <motion.div variants={itemVariants}>
                    <h2 className="text-5xl font-black tracking-tighter premium-gradient-text">Dashboard</h2>
                    <p className="text-slate-400 mt-2 font-medium">Análisis inteligente de tu capital.</p>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 w-full md:w-auto">
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between sm:justify-start bg-midnight-900/40 backdrop-blur-2xl rounded-2xl border border-white/5 p-1.5 shadow-xl w-full sm:w-auto">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-6 font-bold text-white min-w-[140px] text-center capitalize tracking-tight">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Export PDF Button */}
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting || isLoading}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center gap-2 transition-all active:scale-95 w-full sm:w-auto justify-center"
                    >
                        <Download className="w-4 h-4" />
                        {isExporting ? 'Procesando...' : 'Exportar'}
                    </button>
                </motion.div>
            </div>

            {/* AI Insights Board */}
            <AnimatePresence>
                {aiInsights.length > 0 && (
                    <motion.div
                        variants={itemVariants}
                        className="liquid-glass rounded-3xl p-6 border-blue-500/20 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    AI Insights
                                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">Beta</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {isAnalyzing ? (
                                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Skeleton className="h-16 w-full" />
                                            <Skeleton className="h-16 w-full" />
                                        </div>
                                    ) : analysisError ? (
                                        <div className="col-span-full flex flex-col items-center gap-2 text-slate-400 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 text-center">
                                            <p className="text-sm font-medium">No se pudo completar el análisis en este momento.</p>
                                            <button
                                                onClick={() => {
                                                    setAiInsights([]);
                                                    // Trigger fetch
                                                }}
                                                className="text-xs text-blue-400 hover:text-blue-300 font-bold underline px-2 py-1"
                                            >
                                                Intentar de nuevo
                                            </button>
                                        </div>
                                    ) : (
                                        aiInsights.map((text: string, i: number) => (
                                            <div key={i} className="flex items-center gap-3 text-slate-300 text-sm font-medium bg-white/5 p-3 rounded-2xl border border-white/5">
                                                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                                                {text}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Ingresos', val: income, icon: ArrowUpCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { title: 'Gastos', val: expense, icon: ArrowDownCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { title: 'Balance Neto', val: net, icon: Wallet, color: net >= 0 ? "text-blue-400" : "text-rose-400", bg: 'bg-blue-500/10' },
                    { title: 'Maaser (10%)', val: maaser, icon: PiggyBank, color: 'text-purple-400', bg: 'bg-purple-500/10', isMaaser: true }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="glass-card p-6 relative overflow-hidden group"
                    >
                        <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl transition-all group-hover:opacity-40", stat.bg)} />

                        <div className="flex flex-row items-center justify-between pb-6 relative z-10">
                            <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase">{stat.title}</h3>
                            <stat.icon className={cn("h-6 w-6 transition-transform duration-500 group-hover:scale-110", stat.color)} />
                        </div>

                        <div className="space-y-1 relative z-10">
                            <div className={cn("text-3xl font-black tracking-tighter", stat.val < 0 ? 'text-rose-400' : 'text-white')}>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-32" />
                                ) : formatCurrency(stat.val)}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-2">
                                {stat.isMaaser ? 'Basado en ingreso neto' : 'Total este mes'}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Charts Section */}
                <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-8">
                    <ChartsContainer
                        currentDate={currentDate}
                        onMonthClick={setCurrentDate}
                        accountId={selectedAccountId}
                        cardholder={filterCardholder}
                    />
                </motion.div>

                {/* Filters & Utils Column */}
                <motion.div variants={itemVariants} className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <h4 className="font-black text-white px-1">Filtros Pro</h4>
                        <div className="space-y-4">
                            {/* Account Filter */}
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Cuenta Origen</label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="appearance-none w-full bg-midnight-950/50 border border-white/5 text-white text-sm rounded-2xl pl-10 h-12 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-white/5 transition-all"
                                >
                                    <option value="all">Todas las Cuentas</option>
                                    {accounts?.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                                <Wallet className="absolute left-3.5 top-[38px] w-4 h-4 text-blue-400 pointer-events-none" />
                            </div>

                            {/* Cardholder Filter */}
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Titular</label>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={filterCardholder}
                                    onChange={(e) => setFilterCardholder(e.target.value)}
                                    className="w-full bg-midnight-950/50 border border-white/5 text-white text-sm rounded-2xl px-4 h-12 focus:ring-2 focus:ring-blue-500 outline-none hover:bg-white/5 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-blue-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <h4 className="font-black text-white">Próximamente</h4>
                        </div>
                        <p className="text-sm text-slate-400">Predicción de gastos para el próximo mes basada en tus hábitos actuales.</p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
