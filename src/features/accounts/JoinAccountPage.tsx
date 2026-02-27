import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAccountInvitations } from '@/features/accounts/hooks/useAccountInvitations';
import { AcceptInviteModal } from '@/features/accounts/components/AcceptInviteModal';
import { parseInvitationLink } from '@/lib/invitation-utils';

/**
 * Page for handling account invitation acceptance
 * Route: /join-account/:accountId?token={encryptedToken}
 */
export function JoinAccountPage() {
    const { accountId: paramAccountId } = useParams<{ accountId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const { isLoading, error: hookError, getInvitationInfo, acceptInvitation, declineInvitation } =
        useAccountInvitations();

    const [invitationInfo, setInvitationInfo] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const accountId = paramAccountId;
    const token = searchParams.get('token');

    // Fetch invitation info on mount
    useEffect(() => {
        const fetchInfo = async () => {
            if (!accountId || !token || !user) return;

            try {
                const info = await getInvitationInfo(accountId, token);
                setInvitationInfo(info);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Invalid or expired invitation';
                setError(errorMsg);
            }
        };

        fetchInfo();
    }, [accountId, token, user, getInvitationInfo]);

    const handleAccept = async () => {
        if (!accountId || !token || !user) {
            setError('Missing required information');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const result = await acceptInvitation(accountId, token);
            setSuccess(true);

            // Redirect to accounts page after 2 seconds
            setTimeout(() => {
                navigate('/accounts', { replace: true });
            }, 2000);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to accept invitation';
            setError(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!accountId || !token || !user) {
            setError('Missing required information');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            await declineInvitation(accountId, token);

            // Redirect to home after 2 seconds
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to decline invitation';
            setError(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    // Not authenticated
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900">Authentication Required</h2>
                    <p className="text-gray-600">
                        Please log in to accept this invitation.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // Loading invitation info
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
                    <Loader className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                    <p className="text-gray-600 font-medium">Loading invitation details...</p>
                </div>
            </div>
        );
    }

    // Invalid token or error
    if (error || !invitationInfo) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900 text-center">Invalid Invitation</h2>
                    <p className="text-gray-600 text-center">
                        {error || 'This invitation link is invalid, expired, or has already been used.'}
                    </p>
                    <button
                        onClick={() => navigate('/accounts')}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Go to Accounts
                    </button>
                </div>
            </div>
        );
    }

    // Success message
    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
                    <div className="text-5xl">✨</div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
                    <p className="text-gray-600">
                        You've successfully joined <strong>{invitationInfo.accountName}</strong>
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirecting to your accounts in a moment...
                    </p>
                    <Loader className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                </div>
            </div>
        );
    }

    // Show invitation modal
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <AcceptInviteModal
                accountName={invitationInfo.accountName}
                inviterEmail={invitationInfo.inviterEmail}
                role={invitationInfo.role}
                expiresAt={invitationInfo.expiresAt}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isLoading={isProcessing}
                error={error || undefined}
            />
        </div>
    );
}
