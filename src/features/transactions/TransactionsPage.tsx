import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, CheckSquare, Square, Save, X, Camera, Loader2, ChevronDown, Columns } from 'lucide-react';
import { analyzeReceipt } from '@/lib/gemini';
import { toast } from 'sonner';
import { useTransactions } from './hooks/useTransactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TransactionModal } from './components/TransactionModal';
import { AccountFormModal } from '@/features/accounts/components/AccountFormModal';
import { CategoryFormModal } from '@/features/categories/components/CategoryFormModal';
import { Transaction } from '@/db/db';
import { motion, AnimatePresence } from 'framer-motion';

export function TransactionsPage() {
    const {
        transactions,
        isLoading,
        error,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransactions
    } = useTransactions();
    const { accounts, addAccount, isLoading: accountsLoading } = useAccounts();
    const { categories, addCategory } = useCategories();
    const [filter, setFilter] = useState('');
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (error) {
        return (
            <div className="p-8 text-center text-red-400">
                <h2 className="text-xl font-bold mb-2">Error cargando transacciones</h2>
                <pre className="bg-slate-900 p-4 rounded text-left overflow-auto text-xs">
                    {JSON.stringify(error, null, 2)}
                </pre>
            </div>
        );
    }

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [editingTx, setEditingTx] = useState<Partial<Transaction> | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: 'all',
        accountId: 'all',
        categoryId: 'all',
        maaser: 'all',
        cardholder: ''
    });

    const [visibleColumns, setVisibleColumns] = useState({
        date: true,
        description: true,
        category: true,
        account: true,
        amount: true,
        maaser: true,
        cardholder: true,
        actions: true
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    const filteredTransactions = transactions?.filter(tx => {
        let matches = true;

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const category = categories?.find(c => c.id === tx.categoryId)?.name.toLowerCase() || '';
            const account = accounts?.find(a => a.id === tx.accountId)?.name.toLowerCase() || '';
            matches = (
                tx.description.toLowerCase().includes(searchLower) ||
                tx.amount.toString().includes(searchLower) ||
                category.includes(searchLower) ||
                account.includes(searchLower)
            );
        }

        if (!matches) return false;
        if (filters.type !== 'all' && tx.type !== filters.type) return false;
        if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;
        if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false;
        if (filters.maaser !== 'all') {
            if (filters.maaser === 'maaserable') {
                if (tx.type !== 'income' || tx.isMaaserable === false) return false;
            } else if (filters.maaser === 'deductible') {
                if (tx.type !== 'expense' || tx.isDeductible !== true) return false;
            }
        }
        if (filters.cardholder) {
            if (!tx.cardholder?.toLowerCase().includes(filters.cardholder.toLowerCase())) return false;
        }
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            if (new Date(tx.date) < start) return false;
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (new Date(tx.date) > end) return false;
        }
        return true;
    });

    const handleAdd = () => {
        setEditingTx(undefined);
        setIsModalOpen(true);
    };

    const openEditModal = (tx: Transaction) => {
        setEditingTx(tx);
        setIsModalOpen(true);
    };

    const handleSave = async (txData: Partial<Transaction>) => {
        if (editingTx?.id) {
            await updateTransaction(editingTx.id, txData);
        } else {
            if (!txData.amount || !txData.description || !txData.accountId) return;
            await addTransaction({
                date: txData.date || new Date(),
                amount: txData.amount,
                description: txData.description,
                type: txData.type || 'expense',
                accountId: txData.accountId,
                categoryId: txData.categoryId,
                subcategoryId: txData.subcategoryId,
                status: 'cleared',
                isMaaserable: txData.isMaaserable,
                isDeductible: txData.isDeductible,
                cardholder: txData.cardholder
            });
        }
        setIsModalOpen(false);
        setEditingTx(undefined);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredTransactions?.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredTransactions?.map(t => t.id)));
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`¿Eliminar ${selectedIds.size} transacciones?`)) return;
        await deleteTransactions(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const handleQuickCategoryChange = async (txId: string, categoryId: string) => {
        if (categoryId === '__new__') {
            setIsCategoryModalOpen(true);
            return;
        }
        await updateTransaction(txId, { categoryId });
    };

    const handleQuickAccountChange = async (txId: string, accountId: string) => {
        if (accountId === '__new__') {
            setIsAccountModalOpen(true);
            return;
        }
        await updateTransaction(txId, { accountId });
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold premium-gradient-text tracking-tight">Transacciones</h2>
                    <p className="text-slate-400 mt-1">Administra tus movimientos con claridad.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleDeleteSelected}
                                className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-rose-500/20 transition-all shadow-lg shadow-rose-500/10"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar ({selectedIds.size})
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={cn(
                            "px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all border shadow-lg",
                            isEditMode
                                ? "bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30 shadow-amber-500/10"
                                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        )}
                    >
                        {isEditMode ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        {isEditMode ? 'Cerrar Edición' : 'Edición Rápida'}
                    </button>

                    <button
                        onClick={handleAdd}
                        disabled={accountsLoading}
                        className={cn(
                            "bg-blue-600 text-white font-bold px-6 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 hover:bg-blue-500 active:scale-95",
                            accountsLoading ? "opacity-50 cursor-not-allowed" : ""
                        )}
                    >
                        <Plus className="w-5 h-5" />
                        {accountsLoading ? '...' : 'Nuevo Movimiento'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Descripción, monto, categoría..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-midnight-900/50 backdrop-blur-md text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all hover:bg-white/5"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "px-5 py-3 border rounded-2xl flex items-center gap-2 transition-all",
                                showFilters
                                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30"
                                    : "border-white/10 bg-midnight-900/50 text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-semibold tracking-wide">Filtros</span>
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                className={cn(
                                    "px-5 py-3 border rounded-2xl flex items-center gap-2 transition-all",
                                    showColumnMenu
                                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30"
                                        : "border-white/10 bg-midnight-900/50 text-slate-300 hover:bg-white/5"
                                )}
                            >
                                <Columns className="w-4 h-4" />
                                <span className="text-sm font-semibold tracking-wide">Vista</span>
                            </button>

                            <AnimatePresence>
                                {showColumnMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-3 w-56 bg-midnight-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl"
                                    >
                                        {Object.entries({
                                            date: 'Fecha',
                                            description: 'Descripción',
                                            category: 'Categoría',
                                            account: 'Cuenta',
                                            amount: 'Monto',
                                            maaser: 'Maaser',
                                            cardholder: 'Tarjetahabiente'
                                        }).map(([key, label]) => (
                                            <label key={key} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer text-slate-300 text-sm transition-colors group">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-white/20 bg-midnight-950 text-blue-600 focus:ring-blue-500"
                                                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                                                    onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }))}
                                                />
                                                <span className="group-hover:text-white transition-colors">{label}</span>
                                            </label>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-6 bg-midnight-900/50 backdrop-blur-md border border-white/10 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 shadow-xl shadow-black/20">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Desde</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 rounded-xl bg-midnight-950 border border-white/10 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        value={filters.startDate}
                                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hasta</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 rounded-xl bg-midnight-950 border border-white/10 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        value={filters.endDate}
                                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl bg-midnight-950 border border-white/10 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        value={filters.type}
                                        onChange={e => setFilters({ ...filters, type: e.target.value })}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="income">Ingresos</option>
                                        <option value="expense">Gastos</option>
                                        <option value="transfer">Transferencias</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cuenta</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl bg-midnight-950 border border-white/10 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        value={filters.accountId}
                                        onChange={e => setFilters({ ...filters, accountId: e.target.value })}
                                    >
                                        <option value="all">Todas</option>
                                        {accounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Maaser</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl bg-midnight-950 border border-white/10 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                        value={filters.maaser}
                                        onChange={e => setFilters({ ...filters, maaser: e.target.value })}
                                    >
                                        <option value="all">Todos</option>
                                        <option value="maaserable">Maaserable</option>
                                        <option value="deductible">Deducible</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col justify-end">
                                    <button
                                        onClick={() => setFilters({ startDate: '', endDate: '', type: 'all', accountId: 'all', categoryId: 'all', maaser: 'all', cardholder: '' })}
                                        className="text-xs text-blue-400 hover:text-blue-300 font-bold underline transition-colors"
                                    >
                                        Limpiar Todo
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="glass-card overflow-hidden shadow-2xl">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-midnight-900 border-b border-white/10 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <th className="px-6 py-5 w-10">
                                    <button onClick={toggleAll} className="text-slate-500 hover:text-white transition-colors">
                                        {filteredTransactions?.length && selectedIds.size === filteredTransactions.length ? (
                                            <CheckSquare className="w-5 h-5 text-blue-400" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                {visibleColumns.date && <th className="px-6 py-5">Fecha</th>}
                                {visibleColumns.description && <th className="px-6 py-5">Descripción</th>}
                                {visibleColumns.category && <th className="px-6 py-5">Categoría</th>}
                                {visibleColumns.account && <th className="px-6 py-5">Cuenta</th>}
                                {visibleColumns.cardholder && <th className="px-6 py-5">Titular</th>}
                                {visibleColumns.amount && <th className="px-6 py-5 text-right">Monto</th>}
                                {visibleColumns.maaser && <th className="px-6 py-5 text-center w-20">M</th>}
                                {visibleColumns.actions && <th className="px-6 py-5 text-center"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTransactions?.map((tx, idx) => {
                                const category = categories?.find(c => c.id === tx.categoryId);
                                const account = accounts?.find(a => a.id === tx.accountId);
                                const isSelected = selectedIds.has(tx.id);
                                const isMaaserRelevant = tx.type === 'income' ? (tx.isMaaserable !== false) : (tx.isDeductible === true);

                                return (
                                    <motion.tr
                                        key={tx.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: Math.min(idx * 0.03, 1) }}
                                        className={cn(
                                            "transition-all duration-300 group",
                                            isSelected ? "bg-blue-500/10" : "hover:bg-white/5"
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleSelection(tx.id)} className="text-slate-500 group-hover:text-slate-300 transition-colors">
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-400" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                        {visibleColumns.date && (
                                            <td className="px-6 py-4 text-slate-400 font-mono whitespace-nowrap">
                                                {format(tx.date, 'dd/MM/yy', { locale: es })}
                                            </td>
                                        )}
                                        {visibleColumns.description && (
                                            <td className="px-6 py-4 font-semibold text-slate-100 max-w-[250px] truncate group-hover:text-blue-200 transition-colors" title={tx.description}>
                                                {isEditMode ? (
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 rounded-lg bg-midnight-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={tx.description}
                                                        onChange={async (e) => await updateTransaction(tx.id, { description: e.target.value })}
                                                    />
                                                ) : (
                                                    tx.description
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.category && (
                                            <td className="px-6 py-4">
                                                {isEditMode ? (
                                                    <select
                                                        className="w-full p-2 rounded-lg bg-midnight-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={tx.categoryId || ''}
                                                        onChange={(e) => handleQuickCategoryChange(tx.id, e.target.value)}
                                                    >
                                                        <option value="">Sin Categoría</option>
                                                        {categories?.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                        <option value="__new__" className="font-bold text-blue-400">+ Nueva Categoría</option>
                                                    </select>
                                                ) : (
                                                    category ? (
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                                                                style={{ color: category.color, backgroundColor: category.color }}
                                                            />
                                                            <span className="text-slate-300 font-medium">{category.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 italic">Sin categoría</span>
                                                    )
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.account && (
                                            <td className="px-6 py-4">
                                                {isEditMode ? (
                                                    <select
                                                        className="w-full p-2 rounded-lg bg-midnight-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={tx.accountId || ''}
                                                        onChange={(e) => handleQuickAccountChange(tx.id, e.target.value)}
                                                    >
                                                        {accounts?.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                        <option value="__new__" className="font-bold text-blue-400">+ Nueva Cuenta</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-wider">
                                                        {account?.name || '---'}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.cardholder && (
                                            <td className="px-6 py-4 text-slate-400 text-[10px] italic">
                                                {isEditMode ? (
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 rounded-lg bg-midnight-950 border border-white/10 text-white text-[10px] focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={tx.cardholder || ''}
                                                        onChange={async (e) => await updateTransaction(tx.id, { cardholder: e.target.value })}
                                                        placeholder="Opcional"
                                                    />
                                                ) : (
                                                    tx.cardholder || '-'
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.amount && (
                                            <td className={cn(
                                                "px-6 py-4 text-right font-black text-base tracking-tighter",
                                                tx.type === 'income' ? "text-emerald-400" : "text-slate-200"
                                            )}>
                                                {tx.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN' }).format(tx.amount)}
                                            </td>
                                        )}
                                        {visibleColumns.maaser && (
                                            <td className="px-6 py-4 text-center">
                                                {isEditMode ? (
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-white/20 bg-midnight-950 text-purple-500 focus:ring-purple-500 transition-all cursor-pointer"
                                                        checked={!!isMaaserRelevant}
                                                        onChange={async (e) => {
                                                            const newVal = e.target.checked;
                                                            if (tx.type === 'income') {
                                                                await updateTransaction(tx.id, { isMaaserable: newVal });
                                                            } else {
                                                                await updateTransaction(tx.id, { isDeductible: newVal });
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    isMaaserRelevant && (
                                                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-black border border-purple-500/20 shadow-lg shadow-purple-500/10" title="M">
                                                            M
                                                        </div>
                                                    )
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.actions && (
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => openEditModal(tx)}
                                                    className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-white/5">
                    {filteredTransactions?.map((tx, idx) => {
                        const category = categories?.find(c => c.id === tx.categoryId);
                        const account = accounts?.find(a => a.id === tx.accountId);
                        const isSelected = selectedIds.has(tx.id);

                        return (
                            <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                                onClick={() => openEditModal(tx)}
                                className={cn(
                                    "p-4 active:bg-white/10 transition-colors relative",
                                    isSelected ? "bg-blue-500/5" : ""
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                                            {format(tx.date, 'dd MMM yyyy', { locale: es })}
                                        </span>
                                        <span className="font-bold text-slate-100 line-clamp-1">{tx.description}</span>
                                    </div>
                                    <div className={cn(
                                        "text-lg font-black tracking-tighter",
                                        tx.type === 'income' ? "text-emerald-400" : "text-slate-100"
                                    )}>
                                        {tx.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN' }).format(tx.amount)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {category && (
                                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{category.name}</span>
                                        </div>
                                    )}
                                    <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-wider bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">
                                        {account?.name}
                                    </span>
                                    {tx.cardholder && (
                                        <span className="text-[10px] text-slate-500 font-medium italic">
                                            • {tx.cardholder}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {(filteredTransactions?.length === 0) && (
                    <div className="px-6 py-20 text-center text-slate-600 font-medium italic">
                        {searchTerm ? "No se encontraron resultados para tu búsqueda." : "No hay transacciones registradas."}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingTx(undefined);
                    }}
                    onSave={handleSave}
                    initialData={editingTx}
                    accounts={accounts}
                    categories={categories}
                />
            )}

            <AccountFormModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSubmit={async (acc) => {
                    await addAccount(acc as any);
                    setIsAccountModalOpen(false);
                }}
            />

            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSave={async (cat) => {
                    await addCategory({ ...cat, icon: 'tag' } as any);
                    setIsCategoryModalOpen(false);
                }}
            />
        </div>
    );
}
