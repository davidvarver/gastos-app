import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, Edit2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useRecurringTransactions } from './hooks/useRecurringTransactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useTransactions } from './hooks/useTransactions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function RecurringPage() {
    const { recurring, addRecurring, updateRecurring, deleteRecurring, generateForMonth, seedDefaults } = useRecurringTransactions();
    const { accounts } = useAccounts();
    const { categories } = useTransactions();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'expense' as 'income' | 'expense' | 'transfer',
        categoryId: '',
        accountId: '',
        toAccountId: '',
        dayOfMonth: '1',
        active: true
    });

    const [generating, setGenerating] = useState(false);

    // Auto-seed defaults if empty and not yet seeded
    useEffect(() => {
        const checkAndSeed = async () => {
            if (!recurring || !accounts) return;

            // Only seed if we have accounts, no recurring items, and haven't seeded before (on this device)
            const hasSeeded = localStorage.getItem('gastos_defaults_seeded');

            if (recurring.length === 0 && accounts.length > 0 && !hasSeeded) {
                try {
                    await seedDefaults(accounts[0].id);
                    localStorage.setItem('gastos_defaults_seeded', 'true');
                } catch (error) {
                    console.error("Auto-seeding failed:", error);
                }
            }
        };

        checkAndSeed();
    }, [recurring, accounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                description: formData.description,
                amount: Number(formData.amount),
                type: formData.type,
                categoryId: formData.categoryId || undefined,
                accountId: formData.accountId,
                toAccountId: formData.type === 'transfer' ? formData.toAccountId : undefined,
                dayOfMonth: Number(formData.dayOfMonth),
                active: formData.active
            };

            if (editingId) {
                await updateRecurring(editingId, payload);
            } else {
                await addRecurring(payload);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    const resetForm = () => {
        setFormData({
            description: '',
            amount: '',
            type: 'expense',
            categoryId: '',
            accountId: '',
            toAccountId: '',
            dayOfMonth: '1',
            active: true
        });
        setEditingId(null);
    };

    const handleEdit = (item: typeof recurring[0]) => {
        setFormData({
            description: item.description,
            amount: String(item.amount),
            type: item.type,
            categoryId: item.categoryId || '',
            accountId: item.accountId,
            toAccountId: item.toAccountId || '',
            dayOfMonth: String(item.dayOfMonth),
            active: item.active
        });
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    const handleGenerate = async () => {
        if (!confirm('¿Generar transacciones para el mes actual? Esto creará registros reales basados en estas plantillas.')) return;

        setGenerating(true);
        try {
            await generateForMonth(new Date());
            alert('¡Transacciones generadas con éxito!');
        } catch (error) {
            console.error(error);
            alert('Error al generar transacciones');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Transacciones Fijas</h2>
                    <p className="text-slate-400">Gestiona tus gastos e ingresos recurrentes (Renta, Sueldos, etc.)</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" />
                        {generating ? 'Generando...' : 'Aplicar al Mes'}
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-[#4ade80] hover:bg-[#4ade80]/90 text-[#0b1121] px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Fija
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recurring?.map((item) => (
                    <div key={item.id} className={cn(
                        "bg-[#151e32] border rounded-xl p-5 transition-all hover:shadow-lg group relative",
                        item.active ? "border-[#1e293b]" : "border-slate-800 opacity-60"
                    )}>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteRecurring(item.id)} className="p-1.5 text-red-400 hover:text-red-300 bg-slate-800 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-3 rounded-full",
                                    item.type === 'income' ? "bg-emerald-500/10 text-emerald-400" :
                                        item.type === 'expense' ? "bg-red-500/10 text-red-400" :
                                            "bg-blue-500/10 text-blue-400"
                                )}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{item.description}</h3>
                                    <p className="text-xs text-slate-400">Día {item.dayOfMonth} de cada mes</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <div className="text-xs text-slate-500">Cuenta</div>
                                <div className="text-sm text-slate-300">
                                    {accounts?.find(a => a.id === item.accountId)?.name || 'Cuenta eliminada'}
                                </div>
                            </div>
                            <div className={cn(
                                "text-xl font-mono font-bold",
                                item.type === 'income' ? "text-[#4ade80]" : "text-white"
                            )}>
                                {item.type === 'expense' && '-'}
                                ${item.amount.toLocaleString()}
                            </div>
                        </div>

                        {!item.active && (
                            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                                <XCircle className="w-3 h-3" />
                                Desactivada
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#151e32] border border-[#1e293b] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-6">
                        <h3 className="text-xl font-bold text-white">
                            {editingId ? 'Editar Transacción Fija' : 'Nueva Transacción Fija'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Descripción</label>
                                <input
                                    required
                                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ej. Renta Departamento"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Monto</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Día del Mes</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max="31"
                                        className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={formData.dayOfMonth}
                                        onChange={e => setFormData({ ...formData, dayOfMonth: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Tipo</label>
                                    <select
                                        className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' | 'transfer' })}
                                    >
                                        <option value="expense">Gasto</option>
                                        <option value="income">Ingreso</option>
                                        <option value="transfer">Transferencia</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Cuenta</label>
                                    <select
                                        required
                                        className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                        value={formData.accountId}
                                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {accounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Categoría</label>
                                <select
                                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0b1121] text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    <option value="">Sin Categoría</option>
                                    {categories?.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="active-check"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-[#4ade80] focus:ring-[#4ade80]"
                                />
                                <label htmlFor="active-check" className="text-sm text-slate-300">Activa (Generar automáticamente)</label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-lg bg-[#4ade80] text-[#0b1121] font-bold hover:bg-[#4ade80]/90 transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
