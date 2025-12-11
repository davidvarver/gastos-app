import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, CheckSquare, Square, Save, X, Camera, Loader2 } from 'lucide-react';
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
                <p className="mt-4 text-sm text-slate-500">
                    Intenta recargar la página. Si el error persiste, verifica la consola.
                </p>
            </div>
        );
    }

    const handleScanClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const toastId = toast.loading("Analizando ticket con IA...");

        try {
            // apiKey is optional now, it will look for SHARED_KEY if not provided
            const data = await analyzeReceipt(file);

            // Find category ID based on suggestion
            let categoryId = '';
            if (data.category_suggestion) {
                const match = categories?.find(c =>
                    c.name.toLowerCase().includes(data.category_suggestion.toLowerCase()) ||
                    data.category_suggestion.toLowerCase().includes(c.name.toLowerCase())
                );
                if (match) categoryId = match.id;
            }

            setEditingTx({
                date: new Date(data.date),
                amount: data.amount,
                description: data.description,
                type: 'expense', // Assume expense for tickets
                categoryId: categoryId,
                accountId: accounts?.[0]?.id // Default account
            });
            setIsModalOpen(true);
            toast.success("¡Ticket analizado!", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(`Error: ${error.message || "Error desconocido"}`, {
                id: toastId,
                duration: 5000
            });
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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
        maaser: 'all', // 'all', 'maaserable', 'deductible'
        cardholder: ''
    });

    // Filter Logic
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

        // Search Term
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

        // Type Filter
        if (filters.type !== 'all' && tx.type !== filters.type) return false;

        // Account Filter
        if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) return false;

        // Category Filter
        if (filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false;

        // Maaser Filter
        if (filters.maaser !== 'all') {
            if (filters.maaser === 'maaserable') {
                // Show only Income that IS Maaserable
                if (tx.type !== 'income' || tx.isMaaserable === false) return false;
            } else if (filters.maaser === 'deductible') {
                // Show only Expense that IS Deductible
                if (tx.type !== 'expense' || tx.isDeductible !== true) return false;
            }
        }

        // Cardholder Filter
        if (filters.cardholder) {
            if (!tx.cardholder?.toLowerCase().includes(filters.cardholder.toLowerCase())) return false;
        }


        // Date Filter
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

    // Handlers
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
            // Update
            await updateTransaction(editingTx.id, txData);
        } else {
            // Create
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
                isDeductible: txData.isDeductible
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

    // Quick Edit Handlers
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Transacciones</h2>
                    <p className="text-slate-400">Historial de movimientos.</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="bg-red-500/10 text-red-500 border border-red-500/50 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar ({selectedIds.size})
                        </button>
                    )}

                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={cn(
                            "px-4 py-2 rounded-xl flex items-center gap-2 transition-colors border",
                            isEditMode
                                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30"
                                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                        )}
                    >
                        {isEditMode ? <CheckSquare className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        {isEditMode ? 'Terminar Edición' : 'Editar'}
                    </button>

                    {/* Feature Disabled due to API Key Issues (Leaked Key 403)
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={handleScanClick}
                        disabled={isScanning}
                        className={cn(
                            "px-4 py-2 rounded-xl flex items-center gap-2 transition-colors border bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-600/20",
                            isScanning && "opacity-50 cursor-wait"
                        )}
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        {isScanning ? 'Analizando...' : 'Escanear'}
                    </button>
                    */}

                    <button
                        onClick={handleAdd}
                        disabled={accountsLoading}
                        className={cn(
                            "bg-[#4ade80] text-[#0b1121] font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-[#4ade80]/20",
                            accountsLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4ade80]/90"
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        {accountsLoading ? 'Cargando...' : 'Nuevo Movimiento'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por descripción, monto, categoría..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-[#151e32] text-white focus:ring-2 focus:ring-[#4ade80] focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "px-4 py-2 border rounded-xl flex items-center gap-2 transition-colors",
                            showFilters
                                ? "bg-[#4ade80] text-[#0b1121] border-[#4ade80] font-bold"
                                : "border-slate-700 bg-[#151e32] text-slate-300 hover:bg-slate-800"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filtros</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className={cn(
                                "px-4 py-2 border rounded-xl flex items-center gap-2 transition-colors",
                                showColumnMenu
                                    ? "bg-[#4ade80] text-[#0b1121] border-[#4ade80] font-bold"
                                    : "border-slate-700 bg-[#151e32] text-slate-300 hover:bg-slate-800"
                            )}
                        >
                            <span className="text-sm font-medium">Columnas</span>
                        </button>

                        {showColumnMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#151e32] border border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                                {Object.entries({
                                    date: 'Fecha',
                                    description: 'Descripción',
                                    category: 'Categoría',
                                    account: 'Cuenta',
                                    amount: 'Monto',
                                    maaser: 'Maaser',
                                    cardholder: 'Tarjetahabiente'
                                }).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300 text-sm">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-600 bg-slate-700 text-[#4ade80] focus:ring-[#4ade80]"
                                            checked={visibleColumns[key as keyof typeof visibleColumns]}
                                            onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }))}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="p-4 bg-[#151e32] border border-[#1e293b] rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-4 animate-in slide-in-from-top-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Desde</label>
                            <input
                                type="date"
                                className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={filters.startDate}
                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Hasta</label>
                            <input
                                type="date"
                                className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={filters.endDate}
                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Tipo</label>
                            <select
                                className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={filters.type}
                                onChange={e => setFilters({ ...filters, type: e.target.value })}
                            >
                                <option value="all">Todos</option>
                                <option value="income">Ingresos</option>
                                <option value="expense">Gastos</option>
                                <option value="transfer">Transferencias</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Cuenta</label>
                            <select
                                className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={filters.accountId}
                                onChange={e => setFilters({ ...filters, accountId: e.target.value })}
                            >
                                <option value="all">Todas</option>
                                {accounts?.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Maaser</label>
                            <select
                                className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={filters.maaser}
                                onChange={e => setFilters({ ...filters, maaser: e.target.value })}
                            >
                                <option value="all">Todos</option>
                                <option value="maaserable">Ingresos Maaserables</option>
                                <option value="deductible">Gastos Deducibles</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Tarjetahabiente</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={filters.cardholder}
                                onChange={e => setFilters({ ...filters, cardholder: e.target.value })}
                                placeholder="Ej: David"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-5 flex justify-end">
                            <button
                                onClick={() => setFilters({ startDate: '', endDate: '', type: 'all', accountId: 'all', categoryId: 'all', maaser: 'all', cardholder: '' })}
                                className="text-xs text-slate-400 hover:text-white underline"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#0f172a] text-slate-400 font-medium border-b border-[#1e293b]">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                <button onClick={toggleAll} className="text-slate-400 hover:text-white">
                                    {filteredTransactions?.length && selectedIds.size === filteredTransactions.length ? (
                                        <CheckSquare className="w-5 h-5 text-[#4ade80]" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
                            {visibleColumns.date && <th className="px-6 py-4 whitespace-nowrap">Fecha</th>}
                            {visibleColumns.description && <th className="px-6 py-4">Descripción</th>}
                            {visibleColumns.category && <th className="px-6 py-4">Categoría</th>}
                            {visibleColumns.account && <th className="px-6 py-4">Cuenta</th>}
                            {visibleColumns.cardholder && <th className="px-6 py-4">Tarjetahabiente</th>}
                            {visibleColumns.amount && <th className="px-6 py-4 text-right">Monto</th>}
                            {visibleColumns.maaser && <th className="px-6 py-4 text-center w-20">Maaser</th>}
                            {visibleColumns.actions && <th className="px-6 py-4 text-center">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                        {filteredTransactions?.map((tx) => {
                            const category = categories?.find(c => c.id === tx.categoryId);
                            const account = accounts?.find(a => a.id === tx.accountId);
                            const isSelected = selectedIds.has(tx.id);

                            // Determine Maaser status to show icon
                            const isMaaserRelevant = tx.type === 'income' ? (tx.isMaaserable !== false) : (tx.isDeductible === true);

                            return (
                                <tr key={tx.id} className={cn(
                                    "transition-colors group",
                                    isSelected ? "bg-[#4ade80]/5" : "hover:bg-slate-800/30"
                                )}>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleSelection(tx.id)} className="text-slate-400 hover:text-white">
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5 text-[#4ade80]" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </td>
                                    {visibleColumns.date && (
                                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                                            {isEditMode ? (
                                                <input
                                                    type="date"
                                                    className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-xs focus:ring-1 focus:ring-[#4ade80] outline-none"
                                                    value={tx.date.toISOString().split('T')[0]}
                                                    onChange={async (e) => {
                                                        if (e.target.value) {
                                                            await updateTransaction(tx.id, { date: new Date(e.target.value) });
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                format(tx.date, 'dd MMM yyyy', { locale: es })
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.description && (
                                        <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate" title={tx.description}>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-xs focus:ring-1 focus:ring-[#4ade80] outline-none"
                                                    value={tx.description}
                                                    onChange={async (e) => await updateTransaction(tx.id, { description: e.target.value })}
                                                />
                                            ) : (
                                                tx.description
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.category && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditMode ? (
                                                <select
                                                    className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-xs focus:ring-1 focus:ring-[#4ade80] outline-none"
                                                    value={tx.categoryId || ''}
                                                    onChange={(e) => handleQuickCategoryChange(tx.id, e.target.value)}
                                                >
                                                    <option value="">Sin Categoría</option>
                                                    {categories?.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                    <option value="__new__" className="font-bold text-[#4ade80]">+ Nueva Categoría</option>
                                                </select>
                                            ) : (
                                                category ? (
                                                    <div className="flex flex-col items-start">
                                                        <span
                                                            className="px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm whitespace-nowrap"
                                                            style={{ backgroundColor: category.color, boxShadow: `0 0 10px ${category.color}40` }}
                                                        >
                                                            {category.name}
                                                        </span>
                                                        {tx.subcategoryId && (
                                                            <span className="text-[10px] text-slate-400 mt-1 ml-1 whitespace-nowrap">
                                                                {category.subcategories?.find(s => s.id === tx.subcategoryId)?.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic text-xs">Sin categoría</span>
                                                )
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.account && (
                                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                            {isEditMode ? (
                                                <select
                                                    className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-xs focus:ring-1 focus:ring-[#4ade80] outline-none"
                                                    value={tx.accountId || ''}
                                                    onChange={(e) => handleQuickAccountChange(tx.id, e.target.value)}
                                                >
                                                    {accounts?.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                    ))}
                                                    <option value="__new__" className="font-bold text-[#4ade80]">+ Nueva Cuenta</option>
                                                </select>
                                            ) : (
                                                account?.name || 'Unknown'
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.cardholder && (
                                        <td className="px-6 py-4 text-slate-400 text-xs max-w-[150px] truncate" title={tx.cardholder}>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    className="w-full p-2 rounded-lg bg-[#0b1121] border border-slate-700 text-white text-xs focus:ring-1 focus:ring-[#4ade80] outline-none"
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
                                            "px-6 py-4 text-right font-bold font-mono",
                                            tx.type === 'income' ? "text-[#4ade80]" : "text-red-400"
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN' }).format(tx.amount)}
                                        </td>
                                    )}
                                    {visibleColumns.maaser && (
                                        <td className="px-6 py-4 text-center">
                                            {isEditMode ? (
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500 transition-all cursor-pointer"
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
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold" title={tx.type === 'income' ? "Aplica Maaser" : "Deducible de Maaser"}>
                                                        M
                                                    </span>
                                                )
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.actions && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(tx)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Editar Detalles Completos"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {filteredTransactions?.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm ? "No se encontraron resultados." : "No hay transacciones registradas."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    initialData={editingTx}
                    accounts={accounts}
                    categories={categories}
                />
            )}

            {/* Quick Create Modals */}
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
