import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, CheckSquare, Square } from 'lucide-react';
import { useTransactions } from './hooks/useTransactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function TransactionsPage() {
    const { transactions, categories, addTransaction, deleteTransactions, updateTransaction } = useTransactions();
    const { accounts } = useAccounts();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal State
    const [editingTx, setEditingTx] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: 'all',
        accountId: 'all',
        categoryId: 'all',
        maaser: 'all' // 'all', 'maaserable', 'deductible'
    });

    // Filter Logic
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
    const handleAdd = async () => {
        if (!accounts?.length) {
            alert("Primero crea una cuenta/bolsa");
            return;
        }

        const amount = parseFloat(prompt("Monto:") || "0");
        if (!amount) return;

        const description = prompt("Descripción:");
        if (!description) return;

        const type = confirm("¿Es un INGRESO? (Aceptar = Ingreso, Cancelar = Gasto)") ? 'income' : 'expense';
        const categoryName = prompt("Categoría (ej: Alimentación):");
        const category = categories?.find(c => c.name.toLowerCase() === categoryName?.toLowerCase());

        addTransaction({
            date: new Date(),
            amount,
            description,
            type,
            accountId: accounts[0].id,
            categoryId: category?.id,
            status: 'cleared',
            isMaaserable: type === 'income', // Default true for income
            isDeductible: false // Default false for expense
        });
    };

    const openEditModal = (tx: any) => {
        setEditingTx({
            ...tx,
            // Ensure defaults exist for editing
            isMaaserable: tx.isMaaserable ?? (tx.type === 'income'),
            isDeductible: tx.isDeductible ?? false
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTx) return;

        await updateTransaction(editingTx.id, {
            description: editingTx.description,
            amount: parseFloat(editingTx.amount),
            date: new Date(editingTx.date),
            accountId: editingTx.accountId,
            categoryId: editingTx.categoryId,
            subcategoryId: editingTx.subcategoryId,
            type: editingTx.type,
            isMaaserable: editingTx.isMaaserable,
            isDeductible: editingTx.isDeductible
        });

        setIsEditModalOpen(false);
        setEditingTx(null);
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
                        onClick={handleAdd}
                        className="bg-[#4ade80] text-[#0b1121] font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#4ade80]/90 transition-colors shadow-lg shadow-[#4ade80]/20"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Movimiento
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
                        Filtros
                    </button>
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
                        <div className="space-y-1 md:col-span-5 flex justify-end">
                            <button
                                onClick={() => setFilters({ startDate: '', endDate: '', type: 'all', accountId: 'all', categoryId: 'all', maaser: 'all' })}
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
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4">Cuenta</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-center">Maaser</th>
                            <th className="px-6 py-4 text-center">Acciones</th>
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
                                    <td className="px-6 py-4 text-slate-300">
                                        {format(tx.date, 'dd MMM yyyy', { locale: es })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">{tx.description}</td>
                                    <td className="px-6 py-4">
                                        {category ? (
                                            <div className="flex flex-col items-start">
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                                                    style={{ backgroundColor: category.color, boxShadow: `0 0 10px ${category.color}40` }}
                                                >
                                                    {category.name}
                                                </span>
                                                {tx.subcategoryId && (
                                                    <span className="text-[10px] text-slate-400 mt-1 ml-1">
                                                        {category.subcategories?.find(s => s.id === tx.subcategoryId)?.name}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-500 italic text-xs">Sin categoría</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{account?.name || 'Unknown'}</td>
                                    <td className={cn(
                                        "px-6 py-4 text-right font-bold font-mono",
                                        tx.type === 'income' ? "text-[#4ade80]" : "text-red-400"
                                    )}>
                                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {isMaaserRelevant && (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold" title={tx.type === 'income' ? "Aplica Maaser" : "Deducible de Maaser"}>
                                                M
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(tx)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
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

            {/* Edit Modal */}
            {isEditModalOpen && editingTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white">Editar Transacción</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                    value={editingTx.description}
                                    onChange={e => setEditingTx({ ...editingTx, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase">Monto</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={editingTx.amount}
                                        onChange={e => setEditingTx({ ...editingTx, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase">Tipo</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={editingTx.type}
                                        onChange={e => setEditingTx({ ...editingTx, type: e.target.value })}
                                    >
                                        <option value="expense">Gasto</option>
                                        <option value="income">Ingreso</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Cuenta</label>
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                    value={editingTx.accountId}
                                    onChange={e => setEditingTx({ ...editingTx, accountId: e.target.value })}
                                >
                                    {accounts?.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase">Categoría</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={editingTx.categoryId || ''}
                                        onChange={e => setEditingTx({ ...editingTx, categoryId: e.target.value, subcategoryId: '' })}
                                    >
                                        <option value="">Sin Categoría</option>
                                        {categories?.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase">Subcategoría</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={editingTx.subcategoryId || ''}
                                        onChange={e => setEditingTx({ ...editingTx, subcategoryId: e.target.value })}
                                        disabled={!editingTx.categoryId}
                                    >
                                        <option value="">-</option>
                                        {categories?.find(c => c.id === editingTx.categoryId)?.subcategories?.map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Maaser Toggles */}
                            <div className="pt-2 border-t border-slate-700/50">
                                {editingTx.type === 'income' ? (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isMaaserable"
                                            checked={editingTx.isMaaserable !== false}
                                            onChange={e => setEditingTx({ ...editingTx, isMaaserable: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                                        />
                                        <label htmlFor="isMaaserable" className="text-sm font-medium text-slate-300">
                                            Aplica para Maaser (10%)
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isDeductible"
                                            checked={editingTx.isDeductible === true}
                                            onChange={e => setEditingTx({ ...editingTx, isDeductible: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                                        />
                                        <label htmlFor="isDeductible" className="text-sm font-medium text-slate-300">
                                            Es Deducible de Maaser
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 px-4 py-3 rounded-xl bg-[#4ade80] text-[#0b1121] hover:bg-[#4ade80]/90 transition-colors font-bold"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
