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

        const { error } = await supabase.from('categories').insert([dbCategory]);
        if (error) throw error;
    };

    const updateCategory = async (id: string, updates: Partial<Category>) => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.color) dbUpdates.color = updates.color;
        if (updates.icon) dbUpdates.icon = updates.icon;

        const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
        if (error) throw error;
    };

    const deleteCategory = async (id: string) => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
    };

    return {
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        isLoading: loading,
    };
}
