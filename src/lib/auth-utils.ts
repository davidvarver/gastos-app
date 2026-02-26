/**
 * Authorization Utilities
 * Handles permission checks for collaborative accounts
 */

import { supabase } from './supabase';

/**
 * Check if a user can delete a transaction
 * Only account admins can delete transactions (even if they created it)
 * @param userId - The user attempting to delete
 * @param accountId - The account containing the transaction
 * @param createdByUserId - The user who created the transaction
 * @returns True if user can delete
 */
export async function canUserDeleteTransaction(
    userId: string,
    accountId: string,
    createdByUserId: string
): Promise<boolean> {
    // User must be the creator
    if (userId !== createdByUserId) return false;

    // User must be an admin in the account
    const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return false;
    return data.role === 'admin';
}

/**
 * Check if a user can edit a transaction
 * Both admins and editors can edit their own transactions
 * Admins can edit anyone's transactions
 * @param userId - The user attempting to edit
 * @param accountId - The account containing the transaction
 * @param createdByUserId - The user who created the transaction
 * @returns True if user can edit
 */
export async function canUserEditTransaction(
    userId: string,
    accountId: string,
    createdByUserId: string
): Promise<boolean> {
    // Get user's role in account
    const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return false;

    // Admins can edit any transaction in the account
    if (data.role === 'admin') return true;

    // Editors can only edit their own transactions
    return userId === createdByUserId;
}

/**
 * Check if a user can manage account members (invite, remove, change roles)
 * Only account admins can manage members
 * @param userId - The user attempting to manage
 * @param accountId - The account
 * @returns True if user is an admin in the account
 */
export async function canUserManageMembers(
    userId: string,
    accountId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return false;
    return data.role === 'admin';
}

/**
 * Check if a user can delete an account
 * Only account admins can delete
 * @param userId - The user attempting to delete
 * @param accountId - The account
 * @returns True if user is an admin in the account
 */
export async function canUserDeleteAccount(
    userId: string,
    accountId: string
): Promise<boolean> {
    return canUserManageMembers(userId, accountId);
}

/**
 * Get user's role in an account
 * @param userId - The user
 * @param accountId - The account
 * @returns Role ('admin' | 'editor') or null if not a member
 */
export async function getUserRoleInAccount(
    userId: string,
    accountId: string
): Promise<'admin' | 'editor' | null> {
    const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return null;
    return data.role as 'admin' | 'editor';
}

/**
 * Check if a user is an admin in an account
 * @param userId - The user
 * @param accountId - The account
 * @returns True if user is an admin
 */
export async function isUserAdmin(userId: string, accountId: string): Promise<boolean> {
    const role = await getUserRoleInAccount(userId, accountId);
    return role === 'admin';
}

/**
 * Check if a user is an editor in an account
 * @param userId - The user
 * @param accountId - The account
 * @returns True if user is an editor
 */
export async function isUserEditor(userId: string, accountId: string): Promise<boolean> {
    const role = await getUserRoleInAccount(userId, accountId);
    return role === 'editor';
}

/**
 * Get all members of an account
 * @param accountId - The account
 * @returns Array of account members
 */
export async function getAccountMembers(accountId: string) {
    const { data, error } = await supabase
        .from('account_members')
        .select('*')
        .eq('account_id', accountId);

    if (error) {
        console.error('Error fetching account members:', error);
        return [];
    }

    return data || [];
}

/**
 * Check minimum requirement: at least one admin in account
 * @param accountId - The account
 * @returns True if account has at least one admin
 */
export async function hasAtLeastOneAdmin(accountId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('account_id', accountId)
        .eq('role', 'admin')
        .limit(1);

    if (error) return false;
    return ( data?.length || 0) > 0;
}

/**
 * Get count of members in account
 * @param accountId - The account
 * @returns Number of members
 */
export async function getAccountMemberCount(accountId: string): Promise<number> {
    const { count, error } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

    if (error) return 0;
    return count || 0;
}
