import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, PiggyBank } from 'lucide-react';
import { type Account } from '@/db/db';

interface GoalFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Account, 'id'>) => void;
    initialData?: Account;
}

export function GoalFormModal({ isOpen, onClose, onSubmit, initialData }: GoalFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        deadline: '',
        initialBalance: '0'
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    targetAmount: initialData.targetAmount?.toString() || '',
                    deadline: initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
                    initialBalance: initialData.initialBalance.toString()
                });
            } else {
                setFormData({
                    name: '',
                    targetAmount: '',
                    deadline: '',
                    initialBalance: '0'
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name: formData.name,
            type: 'other', // Goals are just 'other' accounts for now
            currency: 'MXN',
            initialBalance: parseFloat(formData.initialBalance) || 0,
            currentBalance: parseFloat(formData.initialBalance) || 0,
            color: '#10b981', // Emerald green for savings
            isSavingsGoal: true,
            targetAmount: parseFloat(formData.targetAmount) || 0,
            deadline: formData.deadline ? new Date(formData.deadline) : undefined,
            defaultIncomeMaaserable: false,
            defaultExpenseDeductible: false
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[#1e293b] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <PiggyBank className="w-6 h-6 text-emerald-400" />
                        {initialData ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase">Nombre de la Meta</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Viaje a Japón, Coche Nuevo..."
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Monto Objetivo
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-lg"
                            value={formData.targetAmount}
                            onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Fecha Límite (Opcional)
                        </label>
                        <input
                            type="date"
                            className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={formData.deadline}
                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                        />
                    </div>

                    {!initialData && (
                        <div className="space-y-2 pt-4 border-t border-[#1e293b]">
                            <label className="text-xs font-medium text-slate-400 uppercase">Saldo Inicial (Opcional)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full p-3 rounded-xl border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                value={formData.initialBalance}
                                onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                            />
                            <p className="text-xs text-slate-500">Si ya tienes algo ahorrado para esto, ponlo aquí.</p>
                        </div>
                    )}

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
                            className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-[#0b1121] hover:bg-emerald-400 transition-colors font-bold shadow-lg shadow-emerald-500/20"
                        >
                            {initialData ? 'Guardar Cambios' : 'Crear Meta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
