import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type Transaction, type Category, SupabaseError, TransactionForInsert, TransactionDB, AccountDB } from '@/db/db';
import { mapTransactionsFromDB, mapCategoriesFromDB, mapSubcategoriesFromDB } from '@/lib/db-mapper';
import { useAuth } from '@/features/auth/AuthProvider';
import { calculateTransactionEffects } from '../utils/transactionLogic';

export function useTransactions() {
    const [transactions, setTransactions] = useState<Transaction[] | undefined>(undefined);
    const [categories, setCategories] = useState<Category[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState<Error | SupabaseError | null>(null);
    const { user } = useAuth();

    const fetchData = async () => {
        if (!user) return;

        try {
            // Optimized: Fetch in parallel instead of serial to reduce latency
            // Categories should include subcategories in a single query
            const [txResult, catResult] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .order('date', { ascending: false }),
                supabase
                    .from('categories')
                    .select('*, subcategories(*)'),
            ]);

            const { data: txData, error: txError } = txResult;
            const { data: catData, error: catError } = catResult;

            if (txError) throw txError;
            if (catError) throw catError;

            const mappedTransactions: Transaction[] = mapTransactionsFromDB(txData || []);
            setTransactions(mappedTransactions);

            // Map categories with already-joined subcategories
            const mappedCategories: Category[] = (catData || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type as 'income' | 'expense' | undefined,
                color: c.color,
                icon: c.icon,
                isSystem: c.is_system,
                subcategories: (c.subcategories || []).map((s: any) => ({
                    id: s.id,
                    categoryId: s.category_id,
                    name: s.name,
                    type: s.type as 'income' | 'expense' | undefined,
                })),
            }));
            setCategories(mappedCategories);

        } catch (error) {
            console.error('Error fetching data:', error);
            setErrorState(error as Error | SupabaseError);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const txChannel = supabase
            .channel('transactions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
            .subscribe();

        const catChannel = supabase
            .channel('categories_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(txChannel);
            supabase.removeChannel(catChannel);
        };
    }, [user]);

    // Helper to update account balance (Atomic)
    const updateAccountBalance = async (accountId: string, delta: number) => {
        const { error } = await supabase.rpc('increment_account_balance', {
            account_id: accountId,
            delta: delta
        });
        if (error) console.error('Error updating balance:', error);
    };

    const addTransactions = async (newTransactions: Omit<Transaction, 'id'>[]) => {
        if (!user) return;

        // 1. Get Maaser Account
        let { data: maaserAccount } = await supabase
            .from('accounts')
            .select('*')
            .ilike('name', 'maaser')
            .maybeSingle();

        // Check if we need Maaser account
        const needsMaaser = newTransactions.some(t =>
            (t.type === 'income' && t.isMaaserable !== false) ||
            (t.type === 'expense' && t.isDeductible === true)
        );

        if (!maaserAccount && needsMaaser) {
            // Auto-create Maaser account
            const { data: newAccount, error: createError } = await supabase
                .from('accounts')
                .insert([{
                    user_id: user.id,
                    name: 'Maaser',
                    type: 'savings', // Default to savings or similar
                    currency: 'MXN', // Default currency, maybe infer from others?
                    initial_balance: 0,
                    current_balance: 0,
                    color: '#a855f7' // Purple
                }])
                .select()
                .single();

            if (createError) {
                console.error("Error auto-creating Maaser account:", createError);
                // Fallback: Proceed without Maaser logic or throw? 
                // Better to log and proceed, or throw to alert user.
                // Throwing might block the main transaction. 
                // Let's throw so user knows something went wrong.
                throw createError;
            }
            maaserAccount = newAccount;
        }

        // 2. Get involved accounts to check defaults
        const accountIds = [...new Set(newTransactions.map(t => t.accountId))];
        const { data: accountsList } = await supabase.from('accounts').select('*').in('id', accountIds);
        const accountsMap = new Map(accountsList?.map((a: AccountDB) => [a.id, a]));

        const txsToInsert: TransactionForInsert[] = [];
        const accountDeltas: Record<string, number> = {};

        for (const txData of newTransactions) {
            const account: AccountDB | undefined = accountsMap.get(txData.accountId);

            // Prepare context
            const accountContext = account ? {
                id: account.id,
                default_income_maaserable: account.default_income_maaserable,
                default_expense_deductible: account.default_expense_deductible
            } : undefined;

            const { txsToInsert: newTxs, accountDeltas: newDeltas } = calculateTransactionEffects(
                txData,
                user.id,
                maaserAccount,
                accountContext
            );

            // Ensure subcategory_id is passed if present in txData (calculateTransactionEffects might not handle it yet, but we can add it here)
            // Actually calculateTransactionEffects returns objects ready for insert. We need to make sure it includes subcategory_id.
            // Let's check calculateTransactionEffects. It likely maps input to output.
            // If it doesn't, we might need to patch it. 
            // But wait, calculateTransactionEffects takes TransactionInput.
            // I should check TransactionInput definition.

            // For now, let's assume I need to manually add it if it's missing, or update the utility.
            // Updating the utility is cleaner.
            // But I can also patch it here for the main transaction.
            // Ensure subcategory_id is passed if present in txData (calculateTransactionEffects handles it now)
            // if (txData.subcategoryId && newTxs.length > 0) {
            //     newTxs[0].subcategory_id = txData.subcategoryId;
            // }

            txsToInsert.push(...newTxs);

            // Merge Deltas
            for (const [accId, delta] of Object.entries(newDeltas)) {
                accountDeltas[accId] = (accountDeltas[accId] || 0) + delta;
            }
        }

        // Execute Inserts
        const { error } = await supabase.from('transactions').insert(txsToInsert);
        if (error) throw error;

        // Update Balances
        for (const [accountId, delta] of Object.entries(accountDeltas)) {
            await updateAccountBalance(accountId, delta);
        }

        // Optimistic Update
        const newMappedTxs: Transaction[] = mapTransactionsFromDB(txsToInsert as TransactionDB[]);

        setTransactions(prev => [...newMappedTxs, ...(prev || [])].sort((a, b) => b.date.getTime() - a.date.getTime()));
    };

    const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        return addTransactions([transaction]);
    };

    const deleteTransaction = async (id: string) => {
        // 1. Get transaction and related
        const { data: txs } = await supabase.from('transactions').select('*').or(`id.eq.${id},related_transaction_id.eq.${id}`);
        if (!txs || txs.length === 0) return;

        const accountDeltas: Record<string, number> = {};

        // Calculate Revert Deltas
        for (const tx of txs) {
            const amount = Number(tx.amount);
            if (tx.type === 'income') {
                accountDeltas[tx.account_id] = (accountDeltas[tx.account_id] || 0) - amount;
            } else if (tx.type === 'expense') {
                accountDeltas[tx.account_id] = (accountDeltas[tx.account_id] || 0) + amount;
            } else if (tx.type === 'transfer' && tx.to_account_id) {
                accountDeltas[tx.account_id] = (accountDeltas[tx.account_id] || 0) + amount;
                accountDeltas[tx.to_account_id] = (accountDeltas[tx.to_account_id] || 0) - amount;
            }
        }

        // Delete
        const idsToDelete = txs.map(t => t.id);
        const { error } = await supabase.from('transactions').delete().in('id', idsToDelete);
        if (error) throw error;

        // Update Balances
        for (const [accountId, delta] of Object.entries(accountDeltas)) {
            await updateAccountBalance(accountId, delta);
        }

        // Optimistic Update
        setTransactions(prev => prev?.filter(t => !idsToDelete.includes(t.id)));
    };

    const deleteTransactions = async (ids: string[]) => {
        // Similar logic but for multiple IDs
        // For simplicity, loop (not efficient but works)
        for (const id of ids) {
            await deleteTransaction(id);
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        // Revert old, apply new. 
        // Simplest way: Get old, delete it (reverting balances), then add new (applying balances).
        // But we want to keep ID? 
        // If we delete, we lose ID unless we force it back.
        // Better: 
        // 1. Revert old balances.
        // 2. Delete related system txs.
        // 3. Update main tx.
        // 4. Apply new balances.
        // 5. Regenerate system txs.

        // This is getting complex for a single function. 
        // Let's try the "Delete then Add" approach but preserving ID if possible? 
        // No, "Delete" removes it.

        // 1. Get transaction and its related system transactions
        const { data: oldTxs } = await supabase.from('transactions').select('*').or(`id.eq.${id},related_transaction_id.eq.${id}`);
        if (!oldTxs || oldTxs.length === 0) return;

        const mainOldTx = oldTxs.find(t => t.id === id);
        if (!mainOldTx) return;

        // 2. Revert ALL old balances (including Maaser/Refunds)
        for (const tx of oldTxs) {
            const amount = Number(tx.amount);
            if (tx.type === 'income') {
                await updateAccountBalance(tx.account_id, -amount);
            } else if (tx.type === 'expense') {
                await updateAccountBalance(tx.account_id, amount);
            } else if (tx.type === 'transfer' && tx.to_account_id) {
                await updateAccountBalance(tx.account_id, amount);
                await updateAccountBalance(tx.to_account_id, -amount);
            }
        }

        // 3. Delete related system transactions (they will be regenerated)
        const relatedIds = oldTxs.filter(t => t.id !== id).map(t => t.id);
        if (relatedIds.length > 0) {
            await supabase.from('transactions').delete().in('id', relatedIds);
        }

        // 4. Update the main transaction
        const dbUpdates: Record<string, any> = {};
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString();
        if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId ?? null;
        if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId ?? null;
        if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
        if (updates.toAccountId !== undefined) dbUpdates.to_account_id = updates.toAccountId;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.isMaaserable !== undefined) dbUpdates.is_maaserable = updates.isMaaserable;
        if (updates.isDeductible !== undefined) dbUpdates.is_deductible = updates.isDeductible;
        if (updates.cardholder !== undefined) dbUpdates.cardholder = updates.cardholder;

        const { data: updatedMain, error: updateError } = await supabase
            .from('transactions')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // 5. Calculate New Effects (Maaser, etc.)
        const { data: mAccount } = await supabase
            .from('accounts')
            .select('*')
            .ilike('name', 'maaser')
            .maybeSingle();

        const accountIds = [updatedMain.account_id];
        if (updatedMain.to_account_id) accountIds.push(updatedMain.to_account_id);
        const { data: accList } = await supabase.from('accounts').select('*').in('id', accountIds);
        const accMap = new Map(accList?.map(a => [a.id, a]));
        const account = accMap.get(updatedMain.account_id);

        const accountContext = account ? {
            id: account.id,
            default_income_maaserable: account.default_income_maaserable,
            default_expense_deductible: account.default_expense_deductible
        } : undefined;

        // Map updatedMain back to TransactionInput
        const txInput: any = {
            ...updatedMain,
            date: new Date(updatedMain.date),
            amount: Number(updatedMain.amount),
            categoryId: updatedMain.category_id,
            subcategoryId: updatedMain.subcategory_id,
            accountId: updatedMain.account_id,
            toAccountId: updatedMain.to_account_id,
            isMaaserable: updatedMain.is_maaserable,
            isDeductible: updatedMain.is_deductible,
            isSystemGenerated: updatedMain.is_system_generated
        };

        const { txsToInsert, accountDeltas } = calculateTransactionEffects(
            txInput,
            user!.id,
            mAccount,
            accountContext
        );

        // 6. Insert ANY NEW system transactions (calculateTransactionEffects returns the main one too, we filter it out)
        const systemTxs = txsToInsert.filter(t => t.id !== id);
        if (systemTxs.length > 0) {
            const { error: insError } = await supabase.from('transactions').insert(systemTxs);
            if (insError) throw insError;
        }

        // 7. Apply New Balances
        for (const [accId, delta] of Object.entries(accountDeltas)) {
            await updateAccountBalance(accId, delta);
        }

        fetchData(); // Simplest way to ensure UI is in sync after complex update
    };

    return {
        transactions,
        categories,
        addTransaction,
        addTransactions,
        deleteTransaction,
        deleteTransactions,
        updateTransaction,
        isLoading: loading,
        error: errorState
    };
}
