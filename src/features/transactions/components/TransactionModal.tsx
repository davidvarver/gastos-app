import { Portal } from '@/components/ui/Portal';
import React, { useEffect, useState } from 'react';
import { X, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Transaction, Category, Account } from '@/db/db';
import { parseTransactionWithAI } from '@/lib/ai-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    initialData?: Partial<Transaction>;
    accounts: Account[] | undefined;
    categories: Category[] | undefined;
}

export function TransactionModal({ isOpen, onClose, onSave, onDelete, initialData, accounts, categories }: TransactionModalProps) {
    const [formData, setFormData] = useState<Partial<Transaction>>({
        description: '',
        amount: 0,
        type: 'expense',
        date: new Date(),
        accountId: accounts?.[0]?.id || '',
        categoryId: '',
        subcategoryId: '',
        isMaaserable: false,
        isDeductible: false,
        status: 'cleared'
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    date: initialData.date ? new Date(initialData.date) : new Date(),
                    // Ensure defaults
                    isMaaserable: initialData.isMaaserable ?? (initialData.type === 'income'),
                    isDeductible: initialData.isDeductible ?? false,
                    subcategoryId: initialData.subcategoryId || ''
                });
            } else {
                setFormData({
                    description: '',
                    amount: 0,
                    type: 'expense',
                    date: new Date(),
                    accountId: accounts?.[0]?.id || '',
                    categoryId: '',
                    subcategoryId: '',
                    isMaaserable: false,
                    isDeductible: false,
                    status: 'cleared'
                });
            }
        }
    }, [isOpen, initialData, accounts]);

    const [error, setError] = useState<string | null>(null);
    const [magicInput, setMagicInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    const handleMagicSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!magicInput.trim()) return;

        setIsParsing(true);
        setError(null);

        try {
            const parsed = await parseTransactionWithAI(
                magicInput,
                accounts || [],
                categories || []
            );

            // Validation & Intelligent Mapping
            const matchedAccount = accounts?.find(a => a.name.toLowerCase().includes(parsed.accountName?.toLowerCase() || ''));
            const matchedCategory = categories?.find(c => c.name.toLowerCase().includes(parsed.categoryName?.toLowerCase() || ''));

            if (parsed.accountName && !matchedAccount) {
                toast.warning(`No encontré la cuenta "${parsed.accountName}". Por favor, selecciónala manualmente.`);
            }
            if (parsed.categoryName && !matchedCategory) {
                toast.warning(`No encontré la categoría "${parsed.categoryName}".`);
            }

            setFormData((prev: Partial<Transaction>) => ({
                ...prev,
                description: parsed.description || prev.description,
                amount: parsed.amount || prev.amount,
                type: parsed.type || prev.type,
                date: parsed.date ? new Date(parsed.date) : prev.date,
                isMaaserable: parsed.isMaaserable !== undefined ? parsed.isMaaserable : prev.isMaaserable,
                isDeductible: parsed.isDeductible !== undefined ? parsed.isDeductible : prev.isDeductible,
                accountId: matchedAccount?.id || (parsed.accountName ? '' : prev.accountId),
                categoryId: matchedCategory?.id || (parsed.categoryName ? '' : prev.categoryId),
            }));

            setMagicInput('');
            toast.success("¡Información extraída con éxito!");
        } catch (err: any) {
            console.error("Magic Input Error:", err);
            setError(err.message || "No pude entender eso.");
            toast.error("Error al procesar con IA. Intenta ser más específico.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = async () => {
        setError(null);

        // Validation
        if (!formData.description?.trim()) {
            setError("La descripción es obligatoria.");
            return;
        }
        if (!formData.amount || formData.amount <= 0) {
            setError("El monto debe ser mayor a 0.");
            return;
        }
        if (!formData.accountId) {
            setError("Debes seleccionar una cuenta.");
            return;
        }

        try {
            await onSave(formData as Omit<Transaction, 'id'>);
            onClose();
        } catch (err) {
            console.error("Error saving transaction:", err);
            setError("Error al guardar. Inténtalo de nuevo.");
        }
    };
    const handleDelete = async () => {
        if (!initialData?.id || !onDelete) return;
        if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
            try {
                await onDelete(initialData.id);
                onClose();
            } catch (err) {
                console.error("Error deleting transaction:", err);
                setError("Error al eliminar. Inténtalo de nuevo.");
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="liquid-glass rounded-[2rem] w-full max-w-md p-8 space-y-8 relative overflow-hidden my-auto"
                        >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">
                                {initialData?.id ? 'Editar Transacción' : 'Nueva Transacción'}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium">Gestiona tu dinero con inteligencia.</p>
                        </div>
                    </div>

                    {/* Magic AI Input */}
                    {!initialData?.id && (
                        <form onSubmit={handleMagicSubmit} className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full bg-midnight-950/80 border border-white/10 p-4 pl-12 rounded-2xl text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                    placeholder="Escribe: 'Cena 50€ ayer'..."
                                    value={magicInput}
                                    onChange={e => setMagicInput(e.target.value)}
                                    disabled={isParsing}
                                />
                                <Sparkles className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 transition-all",
                                    isParsing && "animate-pulse"
                                )} />
                                {isParsing ? (
                                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                                ) : error && magicInput ? (
                                    <button
                                        type="button"
                                        onClick={() => setError(null)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 p-2 rounded-xl transition-all"
                                        title="Limpiar error"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all active:scale-90">
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {error && magicInput && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[10px] text-rose-400 font-bold mt-2 ml-1"
                                >
                                    ⚠️ {error}
                                </motion.p>
                            )}
                        </form>
                    )}

                    <div className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Fecha</label>
                            <input
                                type="date"
                                className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5"
                                value={(() => {
                                    try {
                                        return formData.date ? new Date(formData.date).toISOString().split('T')[0] : '';
                                    } catch (e) {
                                        return '';
                                    }
                                })()}
                                onChange={e => setFormData({ ...formData, date: e.target.value ? new Date(e.target.value) : new Date() })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Descripción</label>
                            <input
                                type="text"
                                className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ej: Compra de supermercado"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Monto</label>
                                <input
                                    type="number"
                                    className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5"
                                    value={formData.amount || ''}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Tipo</label>
                                <select
                                    className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5 appearance-none cursor-pointer"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' | 'transfer' })}
                                >
                                    <option value="expense">Gasto</option>
                                    <option value="income">Ingreso</option>
                                    <option value="transfer">Transferencia</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Cuenta</label>
                            <select
                                className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5 appearance-none cursor-pointer"
                                value={formData.accountId || ''}
                                onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                            >
                                {Array.isArray(accounts) && accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Categoría</label>
                                <select
                                    className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5 appearance-none cursor-pointer"
                                    value={formData.categoryId || ''}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
                                >
                                    <option value="">Sin Categoría</option>
                                    {Array.isArray(categories) && categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Subcategoría</label>
                                <select
                                    className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5 appearance-none cursor-pointer"
                                    value={formData.subcategoryId || ''}
                                    onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })}
                                    disabled={!formData.categoryId}
                                >
                                    <option value="">-</option>
                                    {Array.isArray(categories) && categories.find(c => c.id === formData.categoryId)?.subcategories?.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Maaser Toggles */}
                        <div className="pt-2 border-t border-white/5">
                            {formData.type === 'income' ? (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isMaaserable"
                                        checked={formData.isMaaserable !== false}
                                        onChange={e => setFormData({ ...formData, isMaaserable: e.target.checked })}
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
                                        checked={formData.isDeductible === true}
                                        onChange={e => setFormData({ ...formData, isDeductible: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                                    />
                                    <label htmlFor="isDeductible" className="text-sm font-medium text-slate-300">
                                        Es Deducible de Maaser
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Tarjetahabiente (Opcional)</label>
                            <input
                                type="text"
                                className="w-full p-3.5 rounded-2xl border border-white/5 bg-midnight-950/50 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/5"
                                value={formData.cardholder || ''}
                                onChange={e => setFormData({ ...formData, cardholder: e.target.value })}
                                placeholder="Ej: David, Esposa"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        {initialData?.id && onDelete && (
                            <button
                                onClick={handleDelete}
                                className="p-3.5 rounded-2xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center group"
                                title="Eliminar movimiento"
                            >
                                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 rounded-2xl border border-white/5 text-slate-400 hover:bg-white/5 transition-all font-bold tracking-tight"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-[2] px-4 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all font-black tracking-tight active:scale-95"
                        >
                            {initialData?.id ? 'Guardar Cambios' : 'Crear Movimiento'}
                        </button>
                    </div>
                        </motion.div>
                    </div>
                </Portal>
            )}
        </AnimatePresence>
    );
}
