import React from 'react';

interface TransactionCreatorBadgeProps {
    createdByUserEmail?: string;
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Badge component showing who created a transaction
 * Used in transaction lists and modals for multi-user accounts
 */
export function TransactionCreatorBadge({
    createdByUserEmail,
    size = 'md',
    className = ''
}: TransactionCreatorBadgeProps) {
    if (!createdByUserEmail) return null;

    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-2.5 py-1.5';

    return (
        <div className={`inline-flex items-center gap-1 ${sizeClasses} bg-gray-100 text-gray-700 rounded-lg ${className}`}>
            <span className="font-medium">Created by:</span>
            <span className="text-gray-600">{createdByUserEmail}</span>
        </div>
    );
}
