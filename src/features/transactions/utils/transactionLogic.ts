import { type Transaction, TransactionForInsert } from '@/db/db';

export interface TransactionEffect {
    txsToInsert: TransactionForInsert[];
    accountDeltas: Record<string, number>;
}

export interface TransactionInput {
    id?: string; // Optional, can be generated
    date: Date;
    amount: number;
    description: string;
    type: 'income' | 'expense' | 'transfer';
    categoryId?: string;
    subcategoryId?: string;
    accountId: string;
    toAccountId?: string;
    status: string;
    notes?: string;
    isSystemGenerated?: boolean;
    isMaaserable?: boolean;
    isDeductible?: boolean;
    cardholder?: string;
}

export interface AccountContext {
    id: string;
    default_income_maaserable?: boolean;
    default_expense_deductible?: boolean;
}

export function calculateTransactionEffects(
    txData: TransactionInput,
    user_id: string,
    maaserAccount: { id: string } | null,
    accountContext?: AccountContext
): TransactionEffect {
    const txsToInsert: TransactionForInsert[] = [];
    const accountDeltas: Record<string, number> = {};

    // Apply Defaults
    let isMaaserable = txData.isMaaserable;
    let isDeductible = txData.isDeductible;

    if (isMaaserable === undefined && txData.type === 'income' && accountContext) {
        isMaaserable = accountContext.default_income_maaserable ?? true;
    }
    if (isDeductible === undefined && txData.type === 'expense' && accountContext) {
        isDeductible = accountContext.default_expense_deductible ?? false;
    }

    const txId = txData.id || crypto.randomUUID();

    const dbTx: TransactionForInsert = {
        id: txId,
        user_id: user_id,
        created_by_user_id: user_id, // NEW: Track creator for collaborative accounts
        date: txData.date.toISOString(),
        amount: txData.amount,
        description: txData.description,
        type: txData.type,
        category_id: txData.categoryId || null,
        subcategory_id: txData.subcategoryId || null,
        account_id: txData.accountId,
        to_account_id: txData.toAccountId,
        status: txData.status as 'pending' | 'cleared',
        notes: txData.notes,
        is_system_generated: txData.isSystemGenerated ?? false,
        is_maaserable: isMaaserable,
        is_deductible: isDeductible,
        cardholder: txData.cardholder
    };
    txsToInsert.push(dbTx);

    // Calculate Balance Delta for Main Tx
    if (txData.type === 'income') {
        accountDeltas[txData.accountId] = (accountDeltas[txData.accountId] || 0) + txData.amount;
    } else if (txData.type === 'expense') {
        accountDeltas[txData.accountId] = (accountDeltas[txData.accountId] || 0) - txData.amount;
    } else if (txData.type === 'transfer' && txData.toAccountId) {
        accountDeltas[txData.accountId] = (accountDeltas[txData.accountId] || 0) - txData.amount;
        accountDeltas[txData.toAccountId] = (accountDeltas[txData.toAccountId] || 0) + txData.amount;
    }

    // Automatic Maaser Logic
    if (maaserAccount && !txData.isSystemGenerated) {
        // Income -> 10% to Maaser
        if (txData.type === 'income' && isMaaserable !== false && txData.accountId !== maaserAccount.id) {
            const rawMaaser = txData.amount * 0.10;
            const maaserAmount = Math.round(rawMaaser * 100) / 100; // Round to 2 decimals

            if (maaserAmount > 0) {
                const autoTxId = crypto.randomUUID();
                txsToInsert.push({
                    id: autoTxId,
                    user_id: user_id,
                    date: txData.date.toISOString(),
                    amount: maaserAmount,
                    description: `Maaser (10%): ${txData.description}`,
                    type: 'transfer',
                    account_id: txData.accountId,
                    to_account_id: maaserAccount.id,
                    status: 'cleared',
                    is_system_generated: true,
                    related_transaction_id: txId
                });
                // Update Deltas for Auto Tx
                accountDeltas[txData.accountId] = (accountDeltas[txData.accountId] || 0) - maaserAmount;
                accountDeltas[maaserAccount.id] = (accountDeltas[maaserAccount.id] || 0) + maaserAmount;
            }
        }

        // Deductible Expense -> Refund from Maaser
        if (txData.type === 'expense' && isDeductible === true && txData.accountId !== maaserAccount.id) {
            const autoTxId = crypto.randomUUID();
            txsToInsert.push({
                id: autoTxId,
                user_id: user_id,
                date: txData.date.toISOString(),
                amount: txData.amount,
                description: `Reembolso Maaser: ${txData.description}`,
                type: 'transfer',
                account_id: maaserAccount.id,
                to_account_id: txData.accountId,
                status: 'cleared',
                is_system_generated: true,
                related_transaction_id: txId
            });
            // Update Deltas for Auto Tx
            accountDeltas[maaserAccount.id] = (accountDeltas[maaserAccount.id] || 0) - txData.amount;
            accountDeltas[txData.accountId] = (accountDeltas[txData.accountId] || 0) + txData.amount;
        }
    }

    return { txsToInsert, accountDeltas };
}
