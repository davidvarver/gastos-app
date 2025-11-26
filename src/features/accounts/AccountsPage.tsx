import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAccounts } from './hooks/useAccounts';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AccountCard } from './components/AccountCard';
import { AccountFormModal } from './components/AccountFormModal';
import { type Account } from '@/db/db';

export function AccountsPage() {
    const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Mis Bolsas</h2>
                    <p className="text-slate-400">Gestiona tus cuentas y apartados.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#4ade80] text-[#0b1121] font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#4ade80]/90 transition-colors shadow-lg shadow-[#4ade80]/20"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Bolsa
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts?.map((account) => (
                    <div key={account.id} onClick={() => setSelectedAccount(account)} className="cursor-pointer">
                        <AccountCard
                            account={account}
                            onEdit={(acc) => {
                                const newName = prompt("Nuevo nombre:", acc.name);
                                if (newName) updateAccount(acc.id, { name: newName });
                            }}
                            onDelete={(id) => {
                                if (confirm("¿Eliminar cuenta?")) deleteAccount(id);
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Account Details Modal */}
            {selectedAccount && (
                <AccountDetailsModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                />
            )}

            {/* Create Account Modal */}
            <AccountFormModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={(data) => {
                    addAccount(data);
                }}
            />
        </div>
    );
}

function AccountDetailsModal({ account, onClose }: { account: Account; onClose: () => void }) {
    const { transactions } = useTransactions();

    // Filter transactions for this account (Source or Destination)
    const accountTransactions = transactions?.filter(tx =>
        tx.accountId === account.id || tx.toAccountId === account.id
    ) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b border-[#1e293b] flex justify-between items-center bg-[#0f172a] rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-white">{account.name}</h3>
                        <p className="text-slate-400 text-sm">Historial de movimientos</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Saldo Actual</p>
                        <p className="text-2xl font-bold text-[#4ade80]">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: account.currency }).format(account.currentBalance ?? account.initialBalance)}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#1e293b] text-slate-400 font-medium sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Descripción</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]">
                            {accountTransactions.map(tx => {
                                // Determine if it's income or expense relative to THIS account
                                let isPositive = false;

                                if (tx.type === 'income') {
                                    isPositive = true;
                                } else if (tx.type === 'expense') {
                                    isPositive = false;
                                } else if (tx.type === 'transfer') {
                                    if (tx.toAccountId === account.id) {
                                        isPositive = true; // Incoming transfer
                                    } else {
                                        isPositive = false; // Outgoing transfer
                                    }
                                }

                                const colorClass = isPositive ? "text-[#4ade80]" : "text-red-400";
                                const sign = isPositive ? "+" : "-";

                                return (
                                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-300">
                                            {format(tx.date, 'dd MMM', { locale: es })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{tx.description}</div>
                                            <div className="text-xs text-slate-500 capitalize">{tx.type === 'transfer' ? 'Transferencia' : tx.type === 'income' ? 'Ingreso' : 'Gasto'}</div>
                                        </td>
                                        <td className={cn("px-6 py-4 text-right font-bold font-mono", colorClass)}>
                                            {sign}${tx.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {accountTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                        No hay movimientos en esta cuenta.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-[#1e293b] bg-[#0f172a] rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
