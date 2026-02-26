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
    createdByUserId: string; // NEW: Track original creator for collaborative accounts

    // Savings Goals Fields
    isSavingsGoal?: boolean;
    targetAmount?: number;
    deadline?: Date;

    // Multi-user support
    members?: AccountMember[]; // Loaded on-demand
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
    createdByUserId: string; // NEW: Track who created this transaction
    createdByUserEmail?: string; // NEW: For display in UI (loaded separately)
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

export interface Budget {
    id: string;
    categoryId: string;
    monthYear: string; // "2025-02"
    limitAmount: number;
    alertThreshold: number; // Default 80
    createdAt: Date;
    updatedAt: Date;
}

// ============= COLLABORATIVE ACCOUNTS TYPES =============
export interface AccountMember {
    id: string;
    accountId: string;
    userId: string;
    role: 'admin' | 'editor';
    joinedAt: Date;
    updatedAt: Date;
    userEmail?: string; // Display info (loaded separately)
    userName?: string;  // Display info (loaded separately)
}

export interface AccountInvitation {
    id: string;
    accountId: string;
    invitedByUserId: string;
    token: string;
    role: 'admin' | 'editor';
    createdAt: Date;
    expiresAt?: Date;
    usedAt?: Date;
}

// ============= FORM INPUT TYPES (without ID fields) =============
export type AccountInput = Omit<Account, 'id' | 'currentBalance'>;
export type CategoryInput = Omit<Category, 'id' | 'isSystem' | 'subcategories'>;
export type TransactionInput = Omit<Transaction, 'id'>;
export type RecurringTransactionInput = Omit<RecurringTransaction, 'id'>;
export type SubcategoryInput = Omit<Subcategory, 'id'>;
export type BudgetInput = Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>;

// ============= DATABASE TYPES (what Supabase returns) =============
export interface AccountDB {
    id: string;
    user_id: string;
    created_by_user_id: string; // NEW: For multi-user support
    name: string;
    type: 'personal' | 'business' | 'investment' | 'wallet' | 'other';
    currency: string;
    initial_balance: number;
    current_balance: number;
    color?: string;
    default_income_maaserable?: boolean;
    default_expense_deductible?: boolean;
    is_savings_goal?: boolean;
    target_amount?: number;
    deadline?: string;
}

export interface TransactionDB {
    id: string;
    user_id: string;
    created_by_user_id: string; // NEW: For multi-user support
    date: string;
    amount: number;
    description: string;
    type: 'income' | 'expense' | 'transfer';
    category_id?: string;
    subcategory_id?: string;
    account_id: string;
    to_account_id?: string;
    status: 'pending' | 'cleared';
    notes?: string;
    related_transaction_id?: string;
    is_system_generated?: boolean;
    is_maaserable?: boolean;
    is_deductible?: boolean;
    cardholder?: string;
}

export interface CategoryDB {
    id: string;
    user_id: string;
    name: string;
    type?: 'income' | 'expense';
    color: string;
    icon?: string;
    is_system?: boolean;
}

export interface RecurringTransactionDB {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    category_id?: string;
    account_id: string;
    to_account_id?: string;
    day_of_month: number;
    active: boolean;
}

export interface BudgetDB {
    id: string;
    user_id: string;
    category_id: string;
    month_year: string;
    limit_amount: number;
    alert_threshold: number;
    created_at: string;
    updated_at: string;
}

// ============= COLLABORATIVE ACCOUNTS DATABASE TYPES =============
export interface AccountMemberDB {
    id: string;
    account_id: string;
    user_id: string;
    role: 'admin' | 'editor';
    joined_at: string;
    updated_at: string;
}

export interface AccountInvitationDB {
    id: string;
    account_id: string;
    invited_by_user_id: string;
    token: string;
    role: 'admin' | 'editor';
    created_at: string;
    expires_at?: string;
    used_at?: string;
}

// ============= ERROR TYPES =============
export interface SupabaseError {
    message: string;
    status?: number;
    code?: string;
}

export interface ApiError extends Error {
    status?: number;
    data?: Record<string, any>;
}

// ============= CHART & DEBUG TYPES =============
export interface ChartDataPoint {
    name: string;
    value: number;
    color?: string;
}

export interface DebugLog {
    model: string;
    error: string;
}

// ============= TYPES FOR DATABASE INSERTS =============
export interface TransactionForInsert {
    id?: string;
    user_id?: string;
    date: string;
    amount: number;
    description: string;
    type: 'income' | 'expense' | 'transfer';
    category_id?: string | null;
    subcategory_id?: string | null;
    account_id: string;
    to_account_id?: string;
    status: 'pending' | 'cleared';
    notes?: string;
    is_system_generated?: boolean;
    is_maaserable?: boolean;
    is_deductible?: boolean;
    cardholder?: string;
    related_transaction_id?: string;
}
