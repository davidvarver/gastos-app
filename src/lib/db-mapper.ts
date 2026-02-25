/**
 * Centralizado mapeo de snake_case (DB) ↔ camelCase (App)
 * Elimina duplicación de código en todos los hooks
 */

import {
    Account,
    Category,
    Transaction,
    RecurringTransaction,
    Subcategory,
    AccountDB,
    CategoryDB,
    TransactionDB,
    RecurringTransactionDB,
} from '@/db/db';

// ============= ACCOUNT MAPPERS =============

export function mapAccountFromDB(a: AccountDB): Account {
    return {
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        initialBalance: Number(a.initial_balance),
        currentBalance: Number(a.current_balance),
        color: a.color,
        defaultIncomeMaaserable: a.default_income_maaserable,
        defaultExpenseDeductible: a.default_expense_deductible,
        isSavingsGoal: a.is_savings_goal,
        targetAmount: a.target_amount ? Number(a.target_amount) : undefined,
        deadline: a.deadline ? new Date(a.deadline) : undefined,
    };
}

export function mapAccountsFromDB(data: AccountDB[]): Account[] {
    return data.map(mapAccountFromDB);
}

// ============= TRANSACTION MAPPERS =============

export function mapTransactionFromDB(t: TransactionDB): Transaction {
    return {
        id: t.id,
        date: new Date(t.date),
        amount: Number(t.amount),
        description: t.description,
        type: t.type as 'income' | 'expense' | 'transfer',
        categoryId: t.category_id || undefined,
        subcategoryId: t.subcategory_id || undefined,
        accountId: t.account_id,
        toAccountId: t.to_account_id || undefined,
        status: t.status as 'pending' | 'cleared',
        notes: t.notes,
        relatedTransactionId: t.related_transaction_id || undefined,
        isSystemGenerated: t.is_system_generated || false,
        isMaaserable: t.is_maaserable,
        isDeductible: t.is_deductible,
        cardholder: t.cardholder,
    };
}

export function mapTransactionsFromDB(data: TransactionDB[]): Transaction[] {
    return data.map(mapTransactionFromDB);
}

// ============= CATEGORY MAPPERS =============

export function mapCategoryFromDB(c: CategoryDB, subcategories?: Subcategory[]): Category {
    return {
        id: c.id,
        name: c.name,
        type: c.type as 'income' | 'expense' | undefined,
        color: c.color,
        icon: c.icon,
        isSystem: c.is_system,
        subcategories: subcategories,
    };
}

export function mapCategoriesFromDB(data: CategoryDB[], buildSubcategoryMap?: (catId: string) => Subcategory[]): Category[] {
    return data.map(c => mapCategoryFromDB(c, buildSubcategoryMap?.(c.id)));
}

// ============= SUBCATEGORY MAPPERS =============

export function mapSubcategoryFromDB(s: any): Subcategory {
    return {
        id: s.id,
        categoryId: s.category_id,
        name: s.name,
        type: s.type as 'income' | 'expense' | undefined,
    };
}

export function mapSubcategoriesFromDB(data: any[]): Subcategory[] {
    return data.map(mapSubcategoryFromDB);
}

// ============= RECURRING TRANSACTION MAPPERS =============

export function mapRecurringTransactionFromDB(r: RecurringTransactionDB): RecurringTransaction {
    return {
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        type: r.type as 'income' | 'expense' | 'transfer',
        categoryId: r.category_id || undefined,
        accountId: r.account_id,
        toAccountId: r.to_account_id || undefined,
        dayOfMonth: r.day_of_month,
        active: r.active,
    };
}

export function mapRecurringTransactionsFromDB(data: RecurringTransactionDB[]): RecurringTransaction[] {
    return data.map(mapRecurringTransactionFromDB);
}
