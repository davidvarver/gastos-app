import React, { useState } from 'react';
import { X, Shield, Edit2, Trash2, Plus, Loader } from 'lucide-react';
import { AccountMember } from '@/db/db';
import { useAuth } from '@/features/auth/AuthProvider';
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog';

interface AccountMembersModalProps {
    accountId: string;
    accountName: string;
    members: AccountMember[];
    isCurrentUserAdmin: boolean;
    onGenerateLink: (role: 'admin' | 'editor') => Promise<{ link: string; token: string }>;
    onUpdateRole: (userId: string, newRole: 'admin' | 'editor') => Promise<void>;
    onRemoveMember: (userId: string) => Promise<void>;
    onClose: () => void;
    isOpen: boolean;
    isLoading?: boolean;
}

/**
 * Modal for managing account members
 * Shows list of members and allows admins to invite, remove, and change roles
 */
export function AccountMembersModal({
    accountId,
    accountName,
    members,
    isCurrentUserAdmin,
    onGenerateLink,
    onUpdateRole,
    onRemoveMember,
    onClose,
    isOpen,
    isLoading = false
}: AccountMembersModalProps) {
    const { user } = useAuth();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleUpdateRole = async (memberId: string, userId: string, newRole: 'admin' | 'editor') => {
        setError(null);
        try {
            await onUpdateRole(userId, newRole);
            setEditingMemberId(null);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update role';
            setError(errorMsg);
        }
    };

    const handleRemoveMember = async (memberId: string, userId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        setIsRemoving(memberId);
        setError(null);
        try {
            await onRemoveMember(userId);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to remove member';
            setError(errorMsg);
        } finally {
            setIsRemoving(null);
        }
    };

    if (!isOpen) return null;

    const adminCount = members.filter(m => m.role === 'admin').length;
    const editorCount = members.filter(m => m.role === 'editor').length;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between sticky top-0 bg-white">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Members</h2>
                            <p className="text-sm text-gray-600 mt-1">{accountName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <p className="text-sm text-purple-600 font-medium">Admins</p>
                            <p className="text-2xl font-bold text-purple-900">{adminCount}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <p className="text-sm text-blue-600 font-medium">Editors</p>
                            <p className="text-2xl font-bold text-blue-900">{editorCount}</p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-2">
                        {members.length === 0 ? (
                            <p className="text-center py-8 text-gray-500">No members yet</p>
                        ) : (
                            members.map((member) => {
                                const isCurrentUser = member.userId === user?.id;
                                const isAdmin = member.role === 'admin';

                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                {(member.userEmail?.[0] || '?').toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {member.userEmail || 'Unknown User'}
                                                    {isCurrentUser && <span className="text-xs text-gray-600 ml-2">(You)</span>}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-2">
                                            {/* Role Display/Selection */}
                                            {editingMemberId === member.id && isCurrentUserAdmin && !isCurrentUser ? (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        handleUpdateRole(
                                                            member.id,
                                                            member.userId,
                                                            e.target.value as 'admin' | 'editor'
                                                        )
                                                    }
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                            ) : (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                                        isAdmin
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}
                                                >
                                                    {isAdmin && <Shield className="w-4 h-4" />}
                                                    {isAdmin ? 'Admin' : 'Editor'}
                                                </span>
                                            )}

                                            {/* Actions */}
                                            {isCurrentUserAdmin && !isCurrentUser && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() =>
                                                            setEditingMemberId(
                                                                editingMemberId === member.id ? null : member.id
                                                            )
                                                        }
                                                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                                        title="Change role"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-yellow-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.userId)}
                                                        disabled={isRemoving === member.id || (isAdmin && adminCount === 1)}
                                                        className="p-1.5 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={adminCount === 1 && isAdmin ? 'Cannot remove last admin' : 'Remove member'}
                                                    >
                                                        {isRemoving === member.id ? (
                                                            <Loader className="w-4 h-4 text-red-600 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Invite Button */}
                    {isCurrentUserAdmin && (
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Invite Collaborator
                        </button>
                    )}

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Invite Dialog */}
            <InviteCollaboratorDialog
                accountId={accountId}
                accountName={accountName}
                onGenerateLink={onGenerateLink}
                onClose={() => setIsInviteOpen(false)}
                isOpen={isInviteOpen}
            />
        </>
    );
}
