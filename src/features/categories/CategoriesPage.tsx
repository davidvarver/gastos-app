import { useState } from 'react';
import { useCategories } from './hooks/useCategories';
import { Plus, Trash2, Edit2, Tag, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CategoriesPage() {
    const { categories, addCategory, updateCategory, deleteCategory, addSubcategory, deleteSubcategory, isLoading } = useCategories();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense' | undefined>(undefined);
    const [color, setColor] = useState('#3b82f6');

    // Subcategory State
    const [newSubcatName, setNewSubcatName] = useState('');
    const [addingSubcatTo, setAddingSubcatTo] = useState<string | null>(null);

    const handleOpenModal = (category?: any) => {
        if (category) {
            setEditingCategory(category);
            setName(category.name);
            setType(category.type);
            setColor(category.color);
        } else {
            setEditingCategory(null);
            setName('');
            setType(undefined); // Default to no type
            setColor('#3b82f6');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name, type, color });
            } else {
                await addCategory({ name, type, color, icon: 'tag' });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert('Error al guardar la categoría');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta categoría?')) {
            await deleteCategory(id);
        }
    };

    const handleAddSubcategory = async (categoryId: string) => {
        if (!newSubcatName.trim()) return;
        try {
            await addSubcategory(categoryId, newSubcatName);
            setNewSubcatName('');
            setAddingSubcatTo(null);
        } catch (error) {
            console.error(error);
            alert('Error al agregar subcategoría');
        }
    };

    if (isLoading) return <div className="p-8 text-white">Cargando categorías...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Categorías</h2>
                    <p className="text-slate-400">Gestiona las categorías de tus ingresos y gastos.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#4ade80] hover:bg-[#4ade80]/90 text-[#0b1121] font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Categoría
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories?.map((cat) => (
                    <div key={cat.id} className="bg-[#151e32] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-4 group hover:border-slate-600 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: cat.color }}
                                >
                                    <Tag className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{cat.name}</h3>
                                    {cat.type && (
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            cat.type === 'income' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                        )}>
                                            {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!cat.isSystem && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(cat)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Subcategories Section */}
                        <div className="pl-12 space-y-2">
                            {cat.subcategories?.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between text-sm text-slate-400 hover:text-white group/sub">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        {sub.name}
                                    </div>
                                    <button
                                        onClick={() => deleteSubcategory(sub.id)}
                                        className="opacity-0 group-hover/sub:opacity-100 text-red-400 hover:bg-red-500/10 p-1 rounded"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {addingSubcatTo === cat.id ? (
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        autoFocus
                                        className="bg-[#0b1121] border border-slate-700 rounded px-2 py-1 text-sm text-white w-full outline-none focus:border-[#4ade80]"
                                        placeholder="Nombre subcategoría..."
                                        value={newSubcatName}
                                        onChange={e => setNewSubcatName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddSubcategory(cat.id);
                                            if (e.key === 'Escape') setAddingSubcatTo(null);
                                        }}
                                    />
                                    <button onClick={() => handleAddSubcategory(cat.id)} className="text-[#4ade80] hover:bg-[#4ade80]/10 p-1 rounded">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setAddingSubcatTo(cat.id); setNewSubcatName(''); }}
                                    className="text-xs text-slate-500 hover:text-[#4ade80] flex items-center gap-1 mt-1 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Agregar subcategoría
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
                                    onClick={() => setIsModalOpen(false)}
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
            )}
        </div>
    );
}
