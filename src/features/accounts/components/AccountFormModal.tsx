import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Account } from '@/db/db';

interface AccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Account, 'id'>) => void;
    initialData?: Account;
}

export function AccountFormModal({ isOpen, onClose, onSubmit, initialData }: AccountFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'personal' as Account['type'],
        initialBalance: '0',
        defaultIncomeMaaserable: true,
        defaultExpenseDeductible: false
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    type: initialData.type,
                    initialBalance: initialData.initialBalance.toString(),
                    defaultIncomeMaaserable: initialData.defaultIncomeMaaserable ?? true,
                    defaultExpenseDeductible: initialData.defaultExpenseDeductible ?? false
                });
            } else {
                // Reset for new account
                setFormData({
                    name: '',
                    type: 'personal',
                    initialBalance: '0',
                    defaultIncomeMaaserable: true,
                    defaultExpenseDeductible: false
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name: formData.name,
            type: formData.type,
            currency: 'MXN', // Default for now
            initialBalance: parseFloat(formData.initialBalance) || 0,
            currentBalance: parseFloat(formData.initialBalance) || 0, // Set current same as initial for new
            color: '#3b82f6', // Default color
            defaultIncomeMaaserable: formData.defaultIncomeMaaserable,
            defaultExpenseDeductible: formData.defaultExpenseDeductible
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#1e293b] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Bolsa' : 'Nueva Bolsa'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase">Nombre de la Bolsa</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Personal, Negocio, Ahorros..."
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none transition-all placeholder:text-slate-600"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Tipo</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none transition-all appearance-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="personal">Personal</option>
                                <option value="business">Negocio</option>
                                <option value="investment">Inversión</option>
                                <option value="wallet">Efectivo</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Saldo Inicial</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none transition-all"
                                value={formData.initialBalance}
                                onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[#1e293b]">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            Configuración de Maaser
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Automático</span>
                        </h4>

                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/50 bg-[#0b1121]/50 hover:bg-[#0b1121] transition-colors cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500 transition-all"
                                    checked={formData.defaultIncomeMaaserable}
                                    onChange={e => setFormData({ ...formData, defaultIncomeMaaserable: e.target.checked })}
                                />
                                <div>
                                    <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Ingresos Maaserables</div>
                                    <div className="text-xs text-slate-500">Los ingresos en esta cuenta suman para el diezmo automáticamente.</div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/50 bg-[#0b1121]/50 hover:bg-[#0b1121] transition-colors cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500 transition-all"
                                    checked={formData.defaultExpenseDeductible}
                                    onChange={e => setFormData({ ...formData, defaultExpenseDeductible: e.target.checked })}
                                />
                                <div>
                                    <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Gastos Deducibles</div>
                                    <div className="text-xs text-slate-500">Los gastos en esta cuenta se restan del diezmo automáticamente.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 rounded-xl bg-[#4ade80] text-[#0b1121] hover:bg-[#4ade80]/90 transition-colors font-bold shadow-lg shadow-[#4ade80]/20"
                        >
                            {initialData ? 'Guardar Cambios' : 'Crear Bolsa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
