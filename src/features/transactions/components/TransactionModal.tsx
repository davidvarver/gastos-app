import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Transaction, Category, Account } from '@/db/db';
import { TransactionCreatorBadge } from '@/features/accounts/components/TransactionCreatorBadge';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Partial<Transaction>) => Promise<void>;
    initialData?: Partial<Transaction>;
    accounts: Account[] | undefined;
    categories: Category[] | undefined;
}

export function TransactionModal({ isOpen, onClose, onSave, initialData, accounts, categories }: TransactionModalProps) {
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
                // Reset for new transaction
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

    if (!isOpen) return null;

    const [error, setError] = useState<string | null>(null);

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
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error("Error saving transaction:", err);
            setError("Error al guardar. Inténtalo de nuevo.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white">
                    {initialData?.id ? 'Editar Transacción' : 'Nueva Transacción'}
                </h3>

                {/* Creator Info Badge - Only shown when editing */}
                {initialData?.id && initialData?.createdByUserEmail && (
                    <TransactionCreatorBadge email={initialData.createdByUserEmail} size="sm" />
                )}

                <div className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase">Fecha</label>
                        <input
                            type="date"
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
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
                        <label className="text-xs font-medium text-slate-400 uppercase">Descripción</label>
                        <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ej: Compra de supermercado"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Monto</label>
                            <input
                                type="number"
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                value={formData.amount || ''}
                                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Tipo</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
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
                        <label className="text-xs font-medium text-slate-400 uppercase">Cuenta</label>
                        <select
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
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
                            <label className="text-xs font-medium text-slate-400 uppercase">Categoría</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
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
                            <label className="text-xs font-medium text-slate-400 uppercase">Subcategoría</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
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
                    <div className="pt-2 border-t border-slate-700/50">
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
                        <label className="text-xs font-medium text-slate-400 uppercase">Tarjetahabiente (Opcional)</label>
                        <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                            value={formData.cardholder || ''}
                            onChange={e => setFormData({ ...formData, cardholder: e.target.value })}
                            placeholder="Ej: David, Esposa"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#4ade80] text-[#0b1121] hover:bg-[#4ade80]/90 transition-colors font-bold"
                    >
                        {initialData?.id ? 'Guardar Cambios' : 'Crear Movimiento'}
                    </button>
                </div>
            </div>
        </div>
    );
}
