/**
 * Centralizado manejo de errores y mensajes
 * Proporciona funciones consistentes para mostrar errores al usuario
 */

export interface AppError {
    message: string;
    code?: string;
    details?: unknown;
}

/**
 * Extrae mensaje de error de diferentes tipos de excepciones
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, any>;
        if (err.message) return err.message;
        if (err.error?.message) return err.error.message;
        if (typeof err.toString === 'function') return err.toString();
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Ocurrió un error desconocido';
}

/**
 * Registra un error para debugging/monitoreo
 */
export function logError(error: unknown, context?: string): void {
    const message = getErrorMessage(error);
    const timestamp = new Date().toISOString();

    console.error(`[${timestamp}]${context ? ` [${context}]` : ''} Error:`, message);

    if (error instanceof Error) {
        console.error('Stack:', error.stack);
    }

    // Aquí se podría enviar a un servicio de error tracking como Sentry
    // reportErrorToService({ message, context, timestamp, fullError: error });
}

/**
 * Maneja errores de Supabase específicamente
 */
export function handleSupabaseError(error: any, defaultMessage = 'Error al communicar con el servidor'): string {
    if (!error) return defaultMessage;

    // Supabase auth errors
    if (error.message?.includes('Invalid login credentials')) {
        return 'Email o contraseña incorrectos';
    }

    if (error.message?.includes('User already registered')) {
        return 'Este correo ya está registrado';
    }

    if (error.message?.includes('Email not confirmed')) {
        return 'Por favor confirma tu correo';
    }

    // Network errors
    if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        return 'Error de conexión. Por favor verifica tu internet';
    }

    // Default to the error message or fallback
    return error.message || defaultMessage;
}

/**
 * Maneja errores de validación de formulario
 */
export function handleValidationError(error: any): { field: string; message: string } | null {
    if (!error) return null;

    // Si es un error de validación simple
    if (error.field && error.message) {
        return { field: error.field, message: error.message };
    }

    return null;
}

/**
 * Retenta una función con backoff exponencial
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Máx. intentos alcanzados');
}
