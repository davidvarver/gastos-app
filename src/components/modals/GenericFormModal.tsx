import React from 'react';
import { X } from 'lucide-react';

interface GenericFormModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: T) => Promise<void> | void;
    title: string;
    submitLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    children: (formData: T, setFormData: (data: T) => void) => React.ReactNode;
    initialData?: T;
    getDefaultState: () => T;
}

export function GenericFormModal<T extends Record<string, any>>({
    isOpen,
    onClose,
    onSubmit,
    title,
    submitLabel = 'Guardar',
    cancelLabel = 'Cancelar',
    isLoading = false,
    children,
    initialData,
    getDefaultState,
}: GenericFormModalProps<T>) {
    const [formData, setFormData] = React.useState<T>(getDefaultState());

    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData(getDefaultState());
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-[#1e293b] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    {children(formData, setFormData)}

                    {/* Footer Buttons */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 rounded-xl bg-[#4ade80] text-[#0b1121] hover:bg-[#4ade80]/90 transition-colors font-bold shadow-lg shadow-[#4ade80]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Guardando...' : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
