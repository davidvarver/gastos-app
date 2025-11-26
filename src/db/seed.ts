import { db } from './db';

export async function seedDatabase() {
    const categoryCount = await db.categories.count();
    if (categoryCount > 0) return;

    const defaultCategories = [
        { id: crypto.randomUUID(), name: 'Alimentación', type: 'expense', color: '#ef4444', icon: 'Utensils' },
        { id: crypto.randomUUID(), name: 'Transporte', type: 'expense', color: '#f97316', icon: 'Car' },
        { id: crypto.randomUUID(), name: 'Hogar', type: 'expense', color: '#8b5cf6', icon: 'Home' },
        { id: crypto.randomUUID(), name: 'Salud', type: 'expense', color: '#10b981', icon: 'Heart' },
        { id: crypto.randomUUID(), name: 'Entretenimiento', type: 'expense', color: '#ec4899', icon: 'Film' },
        { id: crypto.randomUUID(), name: 'Educación', type: 'expense', color: '#3b82f6', icon: 'Book' },
        { id: crypto.randomUUID(), name: 'Compras', type: 'expense', color: '#6366f1', icon: 'ShoppingBag' },
        { id: crypto.randomUUID(), name: 'Servicios', type: 'expense', color: '#64748b', icon: 'Zap' },
        { id: crypto.randomUUID(), name: 'Maaser', type: 'expense', color: '#d946ef', icon: 'HandHeart', isSystem: true },
        { id: crypto.randomUUID(), name: 'Jomesh', type: 'expense', color: '#a855f7', icon: 'Gift', isSystem: true },
        { id: crypto.randomUUID(), name: 'Salario', type: 'income', color: '#22c55e', icon: 'Briefcase' },
        { id: crypto.randomUUID(), name: 'Negocio', type: 'income', color: '#14b8a6', icon: 'TrendingUp' },
        { id: crypto.randomUUID(), name: 'Inversiones', type: 'income', color: '#06b6d4', icon: 'LineChart' },
    ];

    await db.categories.bulkAdd(defaultCategories as any);
    console.log('Database seeded with default categories');
}
