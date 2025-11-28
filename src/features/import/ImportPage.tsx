import React, { useState } from 'react';
import { Upload, CheckSquare, Square } from 'lucide-react';
import { parseCSV, type RawTransaction } from './utils/parsers';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { cn } from '@/lib/utils';

export function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<(RawTransaction & { accountId?: string; categoryId?: string })[]>([]);
    const [isAmex, setIsAmex] = useState(false);
    const [globalAccountId, setGlobalAccountId] = useState<string>('');
    const [globalCategoryId, setGlobalCategoryId] = useState<string>('');

    // Bulk Selection State
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [bulkAccountId, setBulkAccountId] = useState<string>('');
    const [bulkCategoryId, setBulkCategoryId] = useState<string>('');

    const { accounts } = useAccounts();
    const { addTransactions, categories } = useTransactions();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);

            try {
                let parsedTransactions: RawTransaction[] = [];

                if (f.name.toLowerCase().endsWith('.csv')) {
                    const result = await parseCSV(f);
                    parsedTransactions = result.transactions;
                }

                if (parsedTransactions.length === 0) {
                    alert("No se encontraron transacciones en el archivo.");
                    setFile(null);
                    return;
                }

                setPreviewData(parsedTransactions.map(t => ({
                    ...t,
                    accountId: globalAccountId,
                    categoryId: globalCategoryId
                })));
                setSelectedIndices(new Set());
            } catch (error: any) {
                console.error("Import Error:", error);
                alert(error.message || "Error al procesar el archivo.");
                setFile(null);
                setPreviewData([]);
            }
        }
    };

    // Selection Logic
    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedIndices(newSet);
    };

    const toggleAll = () => {
        if (selectedIndices.size === previewData.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(previewData.map((_, i) => i)));
        }
    };

    // Bulk Updates
    const applyBulkUpdate = () => {
        if (!bulkAccountId && !bulkCategoryId) return;

        setPreviewData(prev => prev.map((row, i) => {
            if (selectedIndices.has(i)) {
                return {
                    ...row,
                    accountId: bulkAccountId || row.accountId,
                    categoryId: bulkCategoryId || row.categoryId
                };
            }
            return row;
        }));

        // Reset bulk selectors but keep selection for further edits? Or clear?
        // Let's clear selection to indicate "done"
        setSelectedIndices(new Set());
        setBulkAccountId('');
        setBulkCategoryId('');
    };

    // Global Updates (still useful for initial setup)
    const handleGlobalAccountChange = (newAccountId: string) => {
        setGlobalAccountId(newAccountId);
        setPreviewData(prev => prev.map(row => ({ ...row, accountId: newAccountId })));
    };

    const handleGlobalCategoryChange = (newCategoryId: string) => {
        setGlobalCategoryId(newCategoryId);
        setPreviewData(prev => prev.map(row => ({ ...row, categoryId: newCategoryId })));
    };

    // Row Updates
    const handleRowUpdate = (index: number, field: 'accountId' | 'categoryId', value: string) => {
        setPreviewData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], [field]: value };
            return newData;
        });
    };

    const handleImport = async () => {
        const missingAccounts = previewData.filter(row => !row.accountId);
        if (missingAccounts.length > 0) {
            alert(`Por favor asigna una cuenta a las ${missingAccounts.length} transacciones pendientes.`);
            return;
        }

        const transactionsToImport = previewData.map(tx => {
            if (!tx.accountId) return null;

            let amount = tx.amount;
            let type: 'income' | 'expense' = 'expense';

            if (isAmex) {
                if (amount < 0) {
                    type = 'income';
                    amount = Math.abs(amount);
                } else {
                    type = 'expense';
                    amount = Math.abs(amount);
                }
            } else {
                if (amount < 0) {
                    type = 'expense';
                    amount = Math.abs(amount);
                } else {
                    type = 'income';
                    amount = Math.abs(amount);
                }
            }

            const dateObj = new Date(tx.date);
            const finalDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

            return {
                date: finalDate,
                amount,
                description: tx.description,
                type,
                accountId: tx.accountId,
                categoryId: tx.categoryId,
                status: 'cleared' as const
            };
        }).filter(t => t !== null) as any[];

        await addTransactions(transactionsToImport);

        alert(`Importadas ${transactionsToImport.length} transacciones correctamente.`);
        setPreviewData([]);
        setFile(null);
        setGlobalAccountId('');
        setGlobalCategoryId('');
        setSelectedIndices(new Set());
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Importar Transacciones</h2>
                <p className="text-slate-400">Sube tus estados de cuenta (CSV) y clasifica tus movimientos.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Panel: Upload & Global Settings */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:bg-slate-800/50 transition-colors group">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                            <div className="p-4 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors">
                                <Upload className="w-8 h-8 text-slate-400" />
                            </div>
                            <span className="font-medium text-slate-200">Click para subir CSV</span>
                            <span className="text-xs text-slate-500">{file ? file.name : "O arrastra aquí"}</span>
                        </label>
                    </div>

                    <div className="bg-[#151e32] p-6 rounded-xl border border-[#1e293b] space-y-4">
                        <h3 className="font-semibold text-white">Configuración General</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Cuenta por Defecto</label>
                            <select
                                className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] focus:border-transparent outline-none"
                                value={globalAccountId}
                                onChange={(e) => handleGlobalAccountChange(e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                {accounts?.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Categoría por Defecto</label>
                            <select
                                className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] focus:border-transparent outline-none"
                                value={globalCategoryId}
                                onChange={(e) => handleGlobalCategoryChange(e.target.value)}
                            >
                                <option value="">Sin Categoría...</option>
                                {categories?.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <input
                                type="checkbox"
                                id="amex-mode"
                                checked={isAmex}
                                onChange={(e) => setIsAmex(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-[#4ade80] focus:ring-[#4ade80]"
                            />
                            <label htmlFor="amex-mode" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                                Modo Amex (Invertir signos)
                            </label>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={!previewData.length}
                            className="w-full bg-[#4ade80] hover:bg-[#4ade80]/90 text-[#0b1121] font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#4ade80]/20"
                        >
                            Confirmar Importación
                        </button>
                    </div>
                </div>

                {/* Right Panel: Preview Table */}
                <div className="lg:col-span-2 bg-[#151e32] border border-[#1e293b] rounded-xl overflow-hidden shadow-xl flex flex-col h-[600px]">
                    {/* Bulk Action Bar - Only visible when items selected */}
                    {selectedIndices.size > 0 ? (
                        <div className="p-4 border-b border-[#1e293b] bg-[#4ade80]/10 flex items-center gap-4 animate-in slide-in-from-top-2">
                            <span className="font-medium text-[#4ade80] whitespace-nowrap">{selectedIndices.size} seleccionados</span>

                            <select
                                className="flex-1 p-2 rounded-lg border border-[#4ade80]/30 bg-[#0b1121] text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={bulkAccountId}
                                onChange={(e) => setBulkAccountId(e.target.value)}
                            >
                                <option value="">Cambiar Cuenta...</option>
                                {accounts?.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>

                            <select
                                className="flex-1 p-2 rounded-lg border border-[#4ade80]/30 bg-[#0b1121] text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={bulkCategoryId}
                                onChange={(e) => setBulkCategoryId(e.target.value)}
                            >
                                <option value="">Cambiar Categoría...</option>
                                {categories?.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>

                            <button
                                onClick={applyBulkUpdate}
                                className="bg-[#4ade80] text-[#0b1121] font-bold px-4 py-2 rounded-lg hover:bg-[#4ade80]/90 transition-colors text-sm"
                            >
                                Aplicar
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 border-b border-[#1e293b] bg-[#1e293b]/30 flex justify-between items-center">
                            <span className="font-medium text-white">Previsualización</span>
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full">{previewData.length} filas</span>
                        </div>
                    )}

                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-[#0f172a] sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-white">
                                            {previewData.length > 0 && selectedIndices.size === previewData.length ? (
                                                <CheckSquare className="w-5 h-5 text-[#4ade80]" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Descripción</th>
                                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                                    <th className="px-4 py-3 font-medium w-[180px]">Cuenta</th>
                                    <th className="px-4 py-3 font-medium w-[180px]">Categoría</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e293b]">
                                {previewData.map((row, i) => {
                                    const isSelected = selectedIndices.has(i);
                                    return (
                                        <tr key={i} className={cn(
                                            "transition-colors group",
                                            isSelected ? "bg-[#4ade80]/5" : "hover:bg-slate-800/30"
                                        )}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleSelection(i)} className="text-slate-400 hover:text-white">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-[#4ade80]" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{row.date}</td>
                                            <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={row.description}>
                                                {row.description}
                                            </td>
                                            <td className={cn(
                                                "px-4 py-3 text-right font-mono",
                                                row.amount < 0 ? "text-red-400" : "text-[#4ade80]"
                                            )}>
                                                {row.amount}
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    className={cn(
                                                        "w-full p-1.5 rounded border text-xs focus:ring-1 focus:ring-[#4ade80] outline-none transition-colors",
                                                        row.accountId
                                                            ? "bg-[#0b1121] border-slate-700 text-white"
                                                            : "bg-red-500/10 border-red-500/50 text-red-200"
                                                    )}
                                                    value={row.accountId || ''}
                                                    onChange={(e) => handleRowUpdate(i, 'accountId', e.target.value)}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {accounts?.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    className="w-full p-1.5 rounded border border-slate-700 bg-[#0b1121] text-white text-xs focus:ring-1 focus:ring-[#4ade80] outline-none"
                                                    value={row.categoryId || ''}
                                                    onChange={(e) => handleRowUpdate(i, 'categoryId', e.target.value)}
                                                >
                                                    <option value="">Sin Categoría</option>
                                                    {categories?.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {previewData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                            Sube un archivo CSV para ver los datos aquí.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
