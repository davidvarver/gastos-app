import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type Category } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';

export function useCategories() {
    const [categories, setCategories] = useState<Category[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchCategories = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;

            const mappedCategories: Category[] = data.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type as 'income' | 'expense',
                color: c.color,
                icon: c.icon,
                isSystem: c.is_system
            }));

            setCategories(mappedCategories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();

        const channel = supabase
            .channel('categories_crud_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const addCategory = async (category: Omit<Category, 'id' | 'isSystem'>) => {
        if (!user) return;

        const dbCategory = {
            user_id: user.id,
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon,
            is_system: false
        };

        const { data, error } = await supabase.from('categories').insert([dbCategory]).select().single();
        if (error) throw error;

        // Optimistic Update
        if (data) {
            const newCat: Category = {
                id: data.id,
                name: data.name,
                type: data.type as 'income' | 'expense',
                color: data.color,
                icon: data.icon,
                isSystem: data.is_system
            };
            setCategories(prev => [...(prev || []), newCat].sort((a, b) => a.name.localeCompare(b.name)));
        }
    };

    const updateCategory = async (id: string, updates: Partial<Category>) => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.color) dbUpdates.color = updates.color;
        if (updates.icon) dbUpdates.icon = updates.icon;

        const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
        if (error) throw error;

        // Optimistic Update
        setCategories(prev => prev?.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteCategory = async (id: string) => {
        // Check usage first
        const { count, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (countError) throw countError;
        if (count && count > 0) {
            throw new Error(`No se puede eliminar: Esta categoría se usa en ${count} transacciones.`);
        }

        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;

        // Optimistic Update
        setCategories(prev => prev?.filter(c => c.id !== id));
    };

    return {
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        isLoading: loading,
    };
}
