import { describe, it, expect } from 'vitest';
import { calculateTransactionEffects, TransactionInput } from './transactionLogic';

describe('Transaction Logic (TestSprite Audit)', () => {
    const mockUser = 'user-123';
    const mockMaaserAccount = { id: 'maaser-acc-id' };
    const mockAccount = { id: 'acc-1', default_income_maaserable: true };

    it('should calculate Maaser (10%) correctly for income', () => {
        const input: TransactionInput = {
            date: new Date(),
            amount: 1000,
            description: 'Salary',
            type: 'income',
            accountId: 'acc-1',
            status: 'cleared'
        };

        const result = calculateTransactionEffects(input, mockUser, mockMaaserAccount, mockAccount);

        // Should have 2 transactions: Main + Maaser Transfer
        expect(result.txsToInsert).toHaveLength(2);

        const maaserTx = result.txsToInsert.find(t => t.is_system_generated);
        expect(maaserTx).toBeDefined();
        expect(maaserTx!.amount).toBe(100); // 10% of 1000
        expect(maaserTx!.to_account_id).toBe(mockMaaserAccount.id);
    });

    it('should handle floating point precision in Maaser calculation', () => {
        // 10.20 * 0.10 = 1.02. 
        // Without rounding, it might be 1.0200000000000002
        const input: TransactionInput = {
            date: new Date(),
            amount: 10.20,
            description: 'Small Income',
            type: 'income',
            accountId: 'acc-1',
            status: 'cleared'
        };

        const result = calculateTransactionEffects(input, mockUser, mockMaaserAccount, mockAccount);
        const maaserTx = result.txsToInsert.find(t => t.is_system_generated);

        expect(maaserTx!.amount).toBe(1.02);
    });

    it('should NOT generate Maaser if isMaaserable is false', () => {
        const input: TransactionInput = {
            date: new Date(),
            amount: 1000,
            description: 'Gift',
            type: 'income',
            accountId: 'acc-1',
            status: 'cleared',
            isMaaserable: false
        };

        const result = calculateTransactionEffects(input, mockUser, mockMaaserAccount, mockAccount);
        expect(result.txsToInsert).toHaveLength(1); // Only main tx
    });

    it('should generate Refund for deductible expense', () => {
        const input: TransactionInput = {
            date: new Date(),
            amount: 500,
            description: 'Business Lunch',
            type: 'expense',
            accountId: 'acc-1',
            status: 'cleared',
            isDeductible: true
        };

        const result = calculateTransactionEffects(input, mockUser, mockMaaserAccount, mockAccount);

        // Should have 2 transactions: Main Expense + Refund Transfer from Maaser
        expect(result.txsToInsert).toHaveLength(2);

        const refundTx = result.txsToInsert.find(t => t.is_system_generated);
        expect(refundTx).toBeDefined();
        expect(refundTx!.amount).toBe(500);
        expect(refundTx!.account_id).toBe(mockMaaserAccount.id); // From Maaser
        expect(refundTx!.to_account_id).toBe('acc-1'); // To User Account
    });

    it('should calculate Balance Deltas correctly for Income + Maaser', () => {
        const input: TransactionInput = {
            date: new Date(),
            amount: 100,
            description: 'Income',
            type: 'income',
            accountId: 'acc-1',
            status: 'cleared'
        };

        const result = calculateTransactionEffects(input, mockUser, mockMaaserAccount, mockAccount);

        // Account 1: +100 (Income) - 10 (Maaser) = +90
        expect(result.accountDeltas['acc-1']).toBe(90);

        // Maaser Account: +10
        expect(result.accountDeltas[mockMaaserAccount.id]).toBe(10);
    });
});
