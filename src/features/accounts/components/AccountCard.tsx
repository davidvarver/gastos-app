import React from 'react';
import { Wallet, MoreVertical, Edit, Trash } from 'lucide-react';
import { type Account } from '@/db/db';
import { cn } from '@/lib/utils';

interface AccountCardProps {
    account: Account;
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-lg bg-primary/10 text-primary")}>
                    <Wallet className="w-6 h-6" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => onEdit(account)}
                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(account.id)}
                        className="p-2 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <h3 className="font-semibold text-lg mb-1">{account.name}</h3>
            <p className="text-sm text-muted-foreground capitalize mb-4">{account.type}</p>

            <div className="text-2xl font-bold">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: account.currency }).format(account.currentBalance ?? account.initialBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saldo Actual</p>
        </div>
    );
}
