import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/db/db';

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Partial<Category>) => Promise<void>;
    initialData?: Category | null;
}

export function CategoryFormModal({ isOpen, onClose, onSave, initialData }: CategoryFormModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense' | undefined>(undefined);
    const [color, setColor] = useState('#3b82f6');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setType(initialData.type);
                setColor(initialData.color);
            } else {
                setName('');
                setType(undefined);
                setColor('#3b82f6');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({ name, type, color });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-4">
                    {initialData ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-[#0b1121] border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[#4ade80] outline-none"
                            placeholder="Ej: Comida, Transporte..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Tipo <span className="text-slate-600 font-normal">(Opcional)</span>
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setType(type === 'expense' ? undefined : 'expense')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                                    type === 'expense'
                                        ? "bg-red-500/20 border-red-500 text-red-400"
                                        : "bg-[#0b1121] border-slate-700 text-slate-400 hover:bg-slate-800"
                                )}
                            >
                                Gasto
                            </button>
                            <button
                                type="button"
                                onClick={() => setType(type === 'income' ? undefined : 'income')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                                    type === 'income'
                                        ? "bg-green-500/20 border-green-500 text-green-400"
                                        : "bg-[#0b1121] border-slate-700 text-slate-400 hover:bg-slate-800"
                                )}
                            >
                                Ingreso
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Si no seleccionas tipo, esta categoría aparecerá en ambos selectores.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Color</label>
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            className="w-full h-10 bg-[#0b1121] border border-slate-700 rounded-lg cursor-pointer"
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#4ade80] hover:bg-[#4ade80]/90 text-[#0b1121] font-bold py-2.5 rounded-xl transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
