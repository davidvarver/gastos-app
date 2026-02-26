/**
 * Invitation Token Utilities
 * Handles generation, encryption, and validation of account invitation tokens
 */

/**
 * Generate a secure invitation token
 * Uses a simple UUID-based approach with timestamp encoding
 * @returns Encrypted token string
 */
export function generateInviteToken(): string {
    // Generate a secure random token using crypto API
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);

    // Convert to hex string
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Build the full invitation link
 * @param accountId - The account being shared
 * @param token - The invitation token
 * @param baseUrl - Optional base URL (defaults to window.location.origin)
 * @returns Full invitation URL
 */
export function buildInviteLink(
    accountId: string,
    token: string,
    baseUrl?: string
): string {
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${origin}/join-account/${accountId}?token=${encodeURIComponent(token)}`;
}

/**
 * Copy text to clipboard with visual feedback
 * @param text - Text to copy
 * @returns Promise that resolves when copy is successful
 */
export async function copyToClipboard(text: string): Promise<void> {
    try {
        // Use modern Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        throw new Error('Could not copy to clipboard');
    }
}

/**
 * Format a long token for display (show first and last 8 chars)
 * @param token - The full token
 * @returns Formatted token for display
 */
export function formatTokenForDisplay(token: string): string {
    if (token.length <= 16) return token;
    return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
}

/**
 * Check if an invitation token is valid (basic format check)
 * @param token - Token to validate
 * @returns True if token appears valid
 */
export function isValidTokenFormat(token: string): boolean {
    // Token should be a hex string of reasonable length
    return /^[a-f0-9]{32}$/.test(token.toLowerCase());
}

/**
 * Calculate time remaining until expiry
 * @param expiresAt - Expiry timestamp
 * @returns Human-readable time string or null if expired
 */
export function getTimeUntilExpiry(expiresAt: Date | string | null): string | null {
    if (!expiresAt) return null;

    const expiry = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const remaining = expiry - now;

    if (remaining <= 0) return null; // Expired

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;

    return 'less than 1h';
}

/**
 * Generate default expiry (7 days from now)
 * @param daysValid - Number of days the token is valid (default 7)
 * @returns Expiry date
 */
export function generateDefaultExpiry(daysValid: number = 7): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + daysValid);
    return expiry;
}

/**
 * Parse invitation link to extract accountId and token
 * @param url - The invitation URL
 * @returns Object with accountId and token, or null if invalid
 */
export function parseInvitationLink(url: string): { accountId: string; token: string } | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const token = urlObj.searchParams.get('token');

        // Extract account ID from path: /join-account/{accountId}
        const match = pathname.match(/\/join-account\/([a-f0-9-]+)$/i);
        if (!match || !token) return null;

        return {
            accountId: match[1],
            token: decodeURIComponent(token)
        };
    } catch {
        return null;
    }
}
