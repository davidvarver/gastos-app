import React from 'react';

interface TransactionCreatorBadgeProps {
    email: string;
    size?: 'sm' | 'md';
}

export function TransactionCreatorBadge({ email, size = 'md' }: TransactionCreatorBadgeProps) {
    const sizeClasses = size === 'sm'
        ? 'text-xs px-2 py-1'
        : 'text-sm px-3 py-1.5';

    return (
        <div className={`inline-flex items-center gap-1 ${sizeClasses} bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300`}>
            <span className="font-medium">Creado por:</span>
            <span className="text-white">{email}</span>
        </div>
    );
}
