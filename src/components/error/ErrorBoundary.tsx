import React, { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        // Could send to error tracking service here (e.g., Sentry)
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.reset);
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0b1121] p-4">
                    <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl max-w-md p-8 space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <h1 className="text-2xl font-bold text-white">Oops! Algo salió mal</h1>
                        </div>
                        <p className="text-slate-400">
                            Ocurrió un error inesperado. Por favor, intenta recargar la página.
                        </p>
                        <details className="bg-[#0b1121] p-3 rounded-lg text-xs text-slate-500 overflow-auto max-h-[200px]">
                            <summary className="cursor-pointer font-medium text-slate-400 mb-2">
                                Detalles del error
                            </summary>
                            <pre className="whitespace-pre-wrap break-words">
                                {this.state.error.toString()}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        </details>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 px-4 py-2 rounded-xl bg-[#4ade80] text-[#0b1121] hover:bg-[#4ade80]/90 transition-colors font-medium"
                            >
                                Ir a Inicio
                            </button>
                            <button
                                onClick={this.reset}
                                className="flex-1 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                            >
                                Intentar de Nuevo
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
