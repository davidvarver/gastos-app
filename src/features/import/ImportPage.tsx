import React, { useState } from 'react';
import { Upload, CheckSquare, Square, Sparkles } from 'lucide-react';
import { parseCSV, type RawTransaction } from './utils/parsers';
import { parsePDF } from './utils/pdfParser';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { cn } from '@/lib/utils';

export function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<(RawTransaction & { accountId?: string; categoryId?: string })[]>([]);
    const [isAmex, setIsAmex] = useState(false);
    const [globalAccountId, setGlobalAccountId] = useState<string>('');
    const [globalCategoryId, setGlobalCategoryId] = useState<string>('');
    const [globalCardholder, setGlobalCardholder] = useState<string>('');
    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

    // Bulk Selection State
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [bulkAccountId, setBulkAccountId] = useState<string>('');
    const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
    const [bulkCardholder, setBulkCardholder] = useState<string>('');

    const { accounts } = useAccounts();
    const { addTransactions, categories, transactions } = useTransactions();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);

            try {
                let parsedTransactions: RawTransaction[] = [];

                if (f.name.toLowerCase().endsWith('.csv')) {
                    const result = await parseCSV(f);
                    parsedTransactions = result.transactions;
                    setDetectedHeaders(result.headers || []);
                } else if (f.name.toLowerCase().endsWith('.pdf')) {
                    const result = await parsePDF(f);
                    parsedTransactions = result.transactions;
                    setDetectedHeaders(['PDF Import - Headers not available']);
                }

                if (parsedTransactions.length === 0) {
                    alert("No se encontraron transacciones en el archivo.");
                    setFile(null);
                    return;
                }

                setPreviewData(parsedTransactions.map(t => ({
                    ...t,
                    accountId: globalAccountId,
                    categoryId: globalCategoryId,
                    cardholder: t.cardholder || globalCardholder
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
                    categoryId: bulkCategoryId || row.categoryId,
                    cardholder: bulkCardholder || row.cardholder
                };
            }
            return row;
        }));

        // Reset bulk selectors but keep selection for further edits? Or clear?
        // Let's clear selection to indicate "done"
        setSelectedIndices(new Set());
        setBulkAccountId('');
        setBulkCategoryId('');
        setBulkCardholder('');
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

    const handleGlobalCardholderChange = (newCardholder: string) => {
        setGlobalCardholder(newCardholder);
        setPreviewData(prev => prev.map(row => ({ ...row, cardholder: newCardholder })));
    };

    // Row Updates
    const handleRowUpdate = (index: number, field: 'accountId' | 'categoryId' | 'cardholder', value: string) => {
        setPreviewData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], [field]: value };
            return newData;
        });
    };

    const handleAutoCategorize = () => {
        if (!transactions || transactions.length === 0) {
            alert("No hay historial suficiente para aprender.");
            return;
        }

        let matchCount = 0;
        setPreviewData(prev => prev.map(row => {
            // Skip if already fully categorized (optional, but maybe user wants to overwrite?)
            // Let's overwrite only if empty or if user explicitly clicked "Auto-Complete" implying they want help.
            // Actually, let's prioritize filling empty spots, but maybe overwrite is better if they clicked the magic button.
            // Let's fill ONLY if empty for now to be safe, or maybe overwrite everything?
            // "Auto-Completar" implies filling gaps.
            // But if I imported and everything is empty, it fills all.
            // If I set a global default, they are not empty.
            // So if I set global default "Personal", then clicked auto, I might want "Netflix" to become "Entertainment".
            // So overwrite is probably expected for "Smart" features.

            // Find most recent match
            const match = transactions.find(t =>
                t.description.toLowerCase().trim() === row.description.toLowerCase().trim()
            );

            if (match) {
                matchCount++;
                return {
                    ...row,
                    categoryId: match.categoryId || row.categoryId,
                    accountId: match.accountId || row.accountId,
                    cardholder: match.cardholder || row.cardholder
                };
            }
            return row;
        }));

        if (matchCount > 0) {
            alert(`¡Magia! ✨ Se han categorizado ${matchCount} transacciones basadas en tu historial.`);
        } else {
            alert("No se encontraron coincidencias en tu historial.");
        }
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
                cardholder: tx.cardholder,
                status: 'cleared' as const,
                isMaaserable: false, // Default to false for imports to avoid unwanted auto-deductions
                isDeductible: false
            };
        }).filter(t => t !== null) as any[];

        try {
            await addTransactions(transactionsToImport);
            alert(`Importadas ${transactionsToImport.length} transacciones correctamente.`);
            setPreviewData([]);
            setFile(null);
            setGlobalAccountId('');
            setGlobalCategoryId('');
            setGlobalCardholder('');
            setSelectedIndices(new Set());
        } catch (error: any) {
            console.error("Import failed:", error);
            alert(`Error al importar: ${error.message || error}`);
        }
    };

    // Helper to calculate display values based on Amex mode
    const getDisplayValues = (rawAmount: number) => {
        let effectiveAmount = rawAmount;
        let isExpense = false;

        if (isAmex) {
            // Amex Mode: Positive = Expense, Negative = Income (Payment)
            if (rawAmount >= 0) {
                isExpense = true;
                effectiveAmount = -Math.abs(rawAmount); // Show as negative for visual consistency with expenses
            } else {
                isExpense = false;
                effectiveAmount = Math.abs(rawAmount);
            }
        } else {
            // Normal Mode: Negative = Expense, Positive = Income
            if (rawAmount < 0) {
                isExpense = true;
                effectiveAmount = rawAmount; // Already negative
            } else {
                isExpense = false;
                effectiveAmount = rawAmount;
            }
        }

        return { effectiveAmount, isExpense };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Importar Transacciones</h2>
                    <p className="text-slate-400 mt-1">Sube tus estados de cuenta (CSV) y clasifica tus movimientos.</p>
                </div>
                {previewData.length > 0 && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleAutoCategorize}
                            disabled={!transactions}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 text-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                            Auto-Completar con IA
                        </button>
                    </div>
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Left Panel: Upload & Global Settings */}
                <div className="space-y-6 lg:col-span-4 xl:col-span-3">
                    {/* Upload Box */}
                    <div className={cn(
                        "border-2 border-dashed rounded-2xl p-8 text-center transition-all group cursor-pointer relative overflow-hidden",
                        file ? "border-[#4ade80]/50 bg-[#4ade80]/5" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
                    )}>
                        <input
                            type="file"
                            accept=".csv,.pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="file-upload"
                        />
                        <div className="flex flex-col items-center gap-4 relative z-0">
                            <div className={cn(
                                "p-4 rounded-full transition-colors",
                                file ? "bg-[#4ade80]/20 text-[#4ade80]" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                            )}>
                                <Upload className="w-8 h-8" />
                            </div>
                            <div>
                                <span className="font-bold text-slate-200 block text-lg">
                                    {file ? "Archivo Seleccionado" : "Subir CSV o PDF"}
                                </span>
                                <span className="text-sm text-slate-500 mt-1 block max-w-[200px] truncate mx-auto">
                                    {file ? file.name : "Arrastra o haz click aquí"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Settings Box */}
                    <div className="bg-[#151e32] p-6 rounded-2xl border border-[#1e293b] space-y-6 shadow-xl">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            Configuración
                            <div className="h-px flex-1 bg-slate-800"></div>
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuenta por Defecto</label>
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] focus:border-transparent outline-none transition-all"
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
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría por Defecto</label>
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] focus:border-transparent outline-none transition-all"
                                    value={globalCategoryId}
                                    onChange={(e) => handleGlobalCategoryChange(e.target.value)}
                                >
                                    <option value="">Sin Categoría...</option>
                                    {categories?.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <label className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                                isAmex ? "bg-[#4ade80]/10 border-[#4ade80]/50" : "bg-slate-800/30 border-slate-700 hover:bg-slate-800/50"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={isAmex}
                                    onChange={(e) => setIsAmex(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-[#4ade80] focus:ring-[#4ade80]"
                                />
                                <div>
                                    <span className={cn("font-bold block text-sm", isAmex ? "text-[#4ade80]" : "text-slate-300")}>Modo Amex</span>
                                    <span className="text-xs text-slate-500 block">Invierte signos (+ es Gasto)</span>
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={!previewData.length}
                            className="w-full bg-[#4ade80] hover:bg-[#4ade80]/90 text-[#0b1121] font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#4ade80]/20 mt-2"
                        >
                            Confirmar Importación
                        </button>

                        {detectedHeaders.length > 0 && (
                            <div className="mt-4 p-4 bg-slate-800/50 rounded-xl text-xs font-mono text-slate-400 break-all">
                                <p className="font-bold text-slate-300 mb-2">Debug: Encabezados Detectados</p>
                                {detectedHeaders.join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Preview Table */}
                <div className="lg:col-span-8 xl:col-span-9 bg-[#151e32] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
                    {/* Bulk Action Bar */}
                    {selectedIndices.size > 0 ? (
                        <div className="p-4 border-b border-[#1e293b] bg-[#4ade80]/10 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2">
                            <span className="font-bold text-[#4ade80] whitespace-nowrap px-2">{selectedIndices.size} seleccionados</span>

                            <div className="h-6 w-px bg-[#4ade80]/30 hidden md:block"></div>

                            <select
                                className="flex-1 min-w-[150px] p-2 rounded-lg border border-[#4ade80]/30 bg-[#0b1121] text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={bulkAccountId}
                                onChange={(e) => setBulkAccountId(e.target.value)}
                            >
                                <option value="">Cambiar Cuenta...</option>
                                {accounts?.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>

                            <select
                                className="flex-1 min-w-[150px] p-2 rounded-lg border border-[#4ade80]/30 bg-[#0b1121] text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={bulkCategoryId}
                                onChange={(e) => setBulkCategoryId(e.target.value)}
                            >
                                <option value="">Cambiar Categoría...</option>
                                {categories?.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>

                            <input
                                type="text"
                                className="flex-1 min-w-[150px] p-2 rounded-lg border border-[#4ade80]/30 bg-[#0b1121] text-white text-sm focus:ring-1 focus:ring-[#4ade80] outline-none"
                                value={bulkCardholder}
                                onChange={(e) => setBulkCardholder(e.target.value)}
                                placeholder="Cambiar Tarjetahabiente..."
                            />

                            <button
                                onClick={applyBulkUpdate}
                                className="bg-[#4ade80] text-[#0b1121] font-bold px-6 py-2 rounded-lg hover:bg-[#4ade80]/90 transition-colors text-sm shadow-lg shadow-[#4ade80]/10"
                            >
                                Aplicar Cambios
                            </button>
                        </div>
                    ) : (
                        <div className="p-5 border-b border-[#1e293b] bg-[#1e293b]/30 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-white text-lg">Previsualización</span>
                                {previewData.length > 0 && (
                                    <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                                        {previewData.length} movimientos
                                    </span>
                                )}
                            </div>
                            {isAmex && (
                                <span className="text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 px-3 py-1 rounded-full border border-[#4ade80]/20 animate-pulse">
                                    Modo Amex Activo
                                </span>
                            )}
                        </div>
                    )}

                    <div className="overflow-auto flex-1 custom-scrollbar bg-[#0b1121]/50">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs font-bold text-slate-400 uppercase bg-[#0f172a] sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 w-14">
                                        <button onClick={toggleAll} className="text-slate-400 hover:text-white transition-colors">
                                            {previewData.length > 0 && selectedIndices.size === previewData.length ? (
                                                <CheckSquare className="w-5 h-5 text-[#4ade80]" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Descripción</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                    <th className="px-6 py-4 w-[200px]">Cuenta</th>
                                    <th className="px-6 py-4 w-[200px]">Categoría</th>
                                    <th className="px-6 py-4 w-[150px]">Tarjetahabiente</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e293b]">
                                {previewData.map((row, i) => {
                                    const isSelected = selectedIndices.has(i);
                                    const { effectiveAmount, isExpense } = getDisplayValues(row.amount);

                                    return (
                                        <tr key={i} className={cn(
                                            "transition-colors group",
                                            isSelected ? "bg-[#4ade80]/5" : "hover:bg-slate-800/30"
                                        )}>
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleSelection(i)} className="text-slate-400 hover:text-white transition-colors">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-[#4ade80]" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 whitespace-nowrap font-medium">{row.date}</td>
                                            <td className="px-6 py-4 text-slate-300 max-w-[250px] truncate" title={row.description}>
                                                {row.description}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-right font-mono font-bold",
                                                isExpense ? "text-red-400" : "text-[#4ade80]"
                                            )}>
                                                {effectiveAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                            </td>
                                            <td className="px-6 py-3">
                                                <select
                                                    className={cn(
                                                        "w-full p-2 rounded-lg border text-xs focus:ring-1 focus:ring-[#4ade80] outline-none transition-all cursor-pointer",
                                                        row.accountId
                                                            ? "bg-[#0b1121] border-slate-700 text-slate-200 hover:border-slate-500"
                                                            : "bg-red-500/10 border-red-500/50 text-red-200 animate-pulse"
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
                                            <td className="px-6 py-3">
                                                <select
                                                    className="w-full p-2 rounded-lg border border-slate-700 bg-[#0b1121] text-slate-200 text-xs focus:ring-1 focus:ring-[#4ade80] outline-none transition-all cursor-pointer hover:border-slate-500"
                                                    value={row.categoryId || ''}
                                                    onChange={(e) => handleRowUpdate(i, 'categoryId', e.target.value)}
                                                >
                                                    <option value="">Sin Categoría</option>
                                                    {categories?.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    className="w-full p-2 rounded-lg border border-slate-700 bg-[#0b1121] text-slate-200 text-xs focus:ring-1 focus:ring-[#4ade80] outline-none transition-all hover:border-slate-500"
                                                    value={row.cardholder || ''}
                                                    onChange={(e) => handleRowUpdate(i, 'cardholder', e.target.value)}
                                                    placeholder="Opcional"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {previewData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 bg-slate-800/50 rounded-full">
                                                    <Upload className="w-8 h-8 opacity-50" />
                                                </div>
                                                <p className="text-lg font-medium">No hay datos para mostrar</p>
                                                <p className="text-sm max-w-xs mx-auto">Sube un archivo CSV en el panel de la izquierda para comenzar a clasificar.</p>
                                            </div>
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
