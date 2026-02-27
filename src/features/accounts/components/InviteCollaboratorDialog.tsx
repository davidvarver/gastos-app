import React, { useState } from 'react';
import { X, Copy, Check, Loader } from 'lucide-react';
import { copyToClipboard } from '@/lib/invitation-utils';

interface InviteCollaboratorDialogProps {
    accountId: string;
    accountName: string;
    onGenerateLink: (role: 'admin' | 'editor') => Promise<{ link: string; token: string }>;
    onClose: () => void;
    isOpen: boolean;
}

/**
 * Dialog for inviting collaborators to an account
 * Generates shareable invitation links that can be copied/sent via WhatsApp/email
 */
export function InviteCollaboratorDialog({
    accountId,
    accountName,
    onGenerateLink,
    onClose,
    isOpen
}: InviteCollaboratorDialogProps) {
    const [role, setRole] = useState<'admin' | 'editor'>('editor');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateLink = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const { link } = await onGenerateLink(role);
            setGeneratedLink(link);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to generate link';
            setError(errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = async () => {
        if (!generatedLink) return;

        try {
            await copyToClipboard(generatedLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            setError('Failed to copy to clipboard');
        }
    };

    const handleReset = () => {
        setGeneratedLink(null);
        setRole('editor');
        setError(null);
        setIsCopied(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Invite Collaborator</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Account Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 font-medium">Account</p>
                    <p className="text-lg font-bold text-gray-900">{accountName}</p>
                </div>

                {!generatedLink ? (
                    <>
                        {/* Role Selection */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-900">Select Role</p>

                            <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderColor: role === 'admin' ? '#9333ea' : '#d1d5db' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={role === 'admin'}
                                    onChange={(e) => setRole(e.target.value as 'admin' | 'editor')}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <p className="font-semibold text-gray-900">Admin</p>
                                    <p className="text-sm text-gray-600">Full access: invite members, delete transactions, manage account</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderColor: role === 'editor' ? '#3b82f6' : '#d1d5db' }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="editor"
                                    checked={role === 'editor'}
                                    onChange={(e) => setRole(e.target.value as 'admin' | 'editor')}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <p className="font-semibold text-gray-900">Editor</p>
                                    <p className="text-sm text-gray-600">Create & edit transactions, view all data</p>
                                </div>
                            </label>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateLink}
                            disabled={isGenerating}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isGenerating && <Loader className="w-4 h-4 animate-spin" />}
                            {isGenerating ? 'Generating...' : 'Generate Invitation Link'}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Generated Link Display */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-900">Invitation Link</p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 break-all font-mono text-sm text-gray-700">
                                {generatedLink}
                            </div>

                            <p className="text-xs text-gray-600">
                                ✓ Link is ready! Copy it and send via WhatsApp, email, or any messaging app.
                            </p>
                        </div>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopyLink}
                            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isCopied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied to Clipboard!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Link
                                </>
                            )}
                        </button>

                        {/* Reset Button */}
                        <button
                            onClick={handleReset}
                            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
                        >
                            Generate New Link
                        </button>
                    </>
                )}

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
