// Interfaces
export interface Account {
    id: string;
    name: string;
    type: 'personal' | 'business' | 'investment' | 'wallet' | 'other';
    currency: string;
    initialBalance: number;
    currentBalance: number; // Calculated field, but good to cache if needed, or just compute
    color?: string;
    defaultIncomeMaaserable?: boolean; // If true, income in this account defaults to Maaserable
    defaultExpenseDeductible?: boolean; // If true, expenses in this account default to Deductible

    // Savings Goals Fields
    isSavingsGoal?: boolean;
    targetAmount?: number;
    deadline?: Date;
}

export interface Category {
    id: string;
    name: string;
    type?: 'income' | 'expense'; // Now optional
    color: string;
    icon?: string;
    isSystem?: boolean; // e.g. Maaser, Jomesh
    subcategories?: Subcategory[]; // For UI convenience
}

export interface Subcategory {
    id: string;
    categoryId: string;
    name: string;
    type?: 'income' | 'expense';
}

export interface Transaction {
    id: string;
    date: Date;
    amount: number; // Always positive
    description: string;
    type: 'income' | 'expense' | 'transfer';
    categoryId?: string;
    subcategoryId?: string;
    accountId: string;
    toAccountId?: string; // For transfers
    status: 'pending' | 'cleared';
    notes?: string;
    relatedTransactionId?: string; // For refunds
    isSystemGenerated?: boolean; // For Maaser/Jomesh/Fixed
    isMaaserable?: boolean; // For Income: Does it count for Maaser?
    isDeductible?: boolean; // For Expense: Is it deductible from Maaserable income?
    cardholder?: string; // Name of the cardholder (e.g. 'David', 'Wife')
}

export interface ImportPattern {
    id: string;
    pattern: string; // Regex or string to match
    categoryId: string;
    matchType: 'contains' | 'exact' | 'regex';
    confidence: number;
    usageCount: number;
}

export interface MonthlySnapshot {
    id: string;
    month: string; // YYYY-MM
    data: string; // JSON string of the state
    createdAt: Date;
}

export interface RecurringTransaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    categoryId?: string;
    accountId: string;
    toAccountId?: string;
    dayOfMonth: number; // 1-31
    active: boolean;
}
