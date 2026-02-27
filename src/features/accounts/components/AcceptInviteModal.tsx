import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface AcceptInviteModalProps {
    accountName: string;
    inviterEmail: string;
    role: 'admin' | 'editor';
    expiresAt?: Date;
    onAccept: () => Promise<void>;
    onDecline: () => Promise<void>;
    isLoading?: boolean;
    error?: string;
}

/**
 * Modal shown when user clicks an invitation link
 * Displays account details and asks for confirmation to join
 */
export function AcceptInviteModal({
    accountName,
    inviterEmail,
    role,
    expiresAt,
    onAccept,
    onDecline,
    isLoading = false,
    error
}: AcceptInviteModalProps) {
    const [isAccepting, setIsAccepting] = useState(false);

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            await onAccept();
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDecline = async () => {
        setIsAccepting(true);
        try {
            await onDecline();
        } finally {
            setIsAccepting(false);
        }
    };

    const roleLabel = role === 'admin' ? 'Admin' : 'Editor';
    const roleColor = role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900">You're Invited!</h2>
                </div>

                {/* Account Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                        <p className="text-sm text-gray-600 font-medium">Account</p>
                        <p className="text-lg font-bold text-gray-900">{accountName}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-medium">Invited by</p>
                        <p className="text-lg text-gray-900">{inviterEmail}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-medium">Role</p>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleColor}`}>
                            {roleLabel}
                            {role === 'admin' && ' - Full account access'}
                            {role === 'editor' && ' - Create & edit transactions'}
                        </div>
                    </div>

                    {expiresAt && (
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Expires</p>
                            <p className="text-sm text-gray-700">
                                {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Permissions for Editor */}
                {role === 'editor' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-900">
                            <strong>As an Editor, you can:</strong>
                            <ul className="mt-2 ml-2 space-y-1 text-blue-800">
                                <li>✓ View all transactions in this account</li>
                                <li>✓ Create new transactions</li>
                                <li>✓ Edit your own transactions</li>
                                <li>✗ Cannot delete transactions</li>
                                <li>✗ Cannot invite other members</li>
                            </ul>
                        </p>
                    </div>
                )}

                {/* Permissions for Admin */}
                {role === 'admin' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm text-purple-900">
                            <strong>As an Admin, you can:</strong>
                            <ul className="mt-2 ml-2 space-y-1 text-purple-800">
                                <li>✓ Full account access</li>
                                <li>✓ Invite new members</li>
                                <li>✓ Change member roles</li>
                                <li>✓ Remove members</li>
                            </ul>
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleDecline}
                        disabled={isLoading || isAccepting}
                        className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={isLoading || isAccepting}
                        className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isAccepting && <Loader className="w-4 h-4 animate-spin" />}
                        {isAccepting ? 'Accepting...' : 'Accept'}
                    </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                    You can change your preferences or leave the account anytime
                </p>
            </div>
        </div>
    );
}
