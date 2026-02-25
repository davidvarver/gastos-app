import React from 'react';
import { type Account, AccountInput } from '@/db/db';
import { GenericFormModal } from '@/components/modals/GenericFormModal';

interface AccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Account, 'id'>) => Promise<void> | void;
    initialData?: Account;
}

interface AccountFormData {
    name: string;
    type: Account['type'];
    initialBalance: string;
    defaultIncomeMaaserable: boolean;
    defaultExpenseDeductible: boolean;
}

export function AccountFormModal({ isOpen, onClose, onSubmit, initialData }: AccountFormModalProps) {
    const getDefaultState = (): AccountFormData => ({
        name: '',
        type: 'personal',
        initialBalance: '0',
        defaultIncomeMaaserable: true,
        defaultExpenseDeductible: false,
    });

    const handleFormSubmit = async (formData: AccountFormData) => {
        await onSubmit({
            name: formData.name,
            type: formData.type,
            currency: 'MXN',
            initialBalance: parseFloat(formData.initialBalance) || 0,
            currentBalance: parseFloat(formData.initialBalance) || 0,
            color: '#3b82f6',
            defaultIncomeMaaserable: formData.defaultIncomeMaaserable,
            defaultExpenseDeductible: formData.defaultExpenseDeductible,
        });
    };

    const initialFormData = initialData
        ? {
              name: initialData.name,
              type: initialData.type,
              initialBalance: initialData.initialBalance.toString(),
              defaultIncomeMaaserable: initialData.defaultIncomeMaaserable ?? true,
              defaultExpenseDeductible: initialData.defaultExpenseDeductible ?? false,
          }
        : undefined;

    return (
        <GenericFormModal<AccountFormData>
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleFormSubmit}
            title={initialData ? 'Editar Bolsa' : 'Nueva Bolsa'}
            submitLabel={initialData ? 'Guardar Cambios' : 'Crear Bolsa'}
            initialData={initialFormData}
            getDefaultState={getDefaultState}
        >
            {(formData, setFormData) => (
                <>
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
                                onChange={e => setFormData({ ...formData, type: e.target.value as Account['type'] })}
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
                </>
            )}
        </GenericFormModal>
    );
}
