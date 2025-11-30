import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type Category, type Subcategory } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';

export function useCategories() {
    const [categories, setCategories] = useState<Category[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchCategories = async () => {
        if (!user) return;

        try {
            // Fetch Categories
            const { data: catsData, error: catsError } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (catsError) throw catsError;

            // Fetch Subcategories
            const { data: subData, error: subError } = await supabase
                .from('subcategories')
                .select('*')
                .order('name');

            if (subError) throw subError;

            const mappedCategories: Category[] = catsData.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type as 'income' | 'expense' | undefined,
                color: c.color,
                icon: c.icon,
                isSystem: c.is_system,
                subcategories: subData
                    .filter(s => s.category_id === c.id)
                    .map(s => ({
                        id: s.id,
                        categoryId: s.category_id,
                        name: s.name,
                        type: s.type as 'income' | 'expense' | undefined
                    }))
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, fetchCategories)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const addCategory = async (category: Omit<Category, 'id' | 'isSystem' | 'subcategories'>) => {
        if (!user) return;

        const dbCategory = {
            user_id: user.id,
            name: category.name,
            type: category.type || null, // Handle optional type
            color: category.color,
            icon: category.icon,
            is_system: false
        };

        const { error } = await supabase.from('categories').insert([dbCategory]);
        if (error) throw error;
    };

    const updateCategory = async (id: string, updates: Partial<Category>) => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.type !== undefined) dbUpdates.type = updates.type || null; // Allow clearing type
        if (updates.color) dbUpdates.color = updates.color;
        if (updates.icon) dbUpdates.icon = updates.icon;

        const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
        if (error) throw error;
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
    };

    const addSubcategory = async (categoryId: string, name: string) => {
        if (!user) return;
        const { error } = await supabase.from('subcategories').insert([{
            user_id: user.id,
            category_id: categoryId,
            name: name
        }]);
        if (error) throw error;
    };

    const deleteSubcategory = async (id: string) => {
        const { error } = await supabase.from('subcategories').delete().eq('id', id);
        if (error) throw error;
    };

    return {
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        deleteSubcategory,
        isLoading: loading,
    };
}
