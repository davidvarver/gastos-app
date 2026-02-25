import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SupabaseError } from '@/db/db';

export function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Te hemos enviado un correo con las instrucciones. Revisa tu bandeja de entrada (y spam).'
            });
        } catch (error) {
            const err = error as Error | SupabaseError;
            console.error("Reset Password Error:", error);
            const message = 'message' in err ? err.message : 'Error al enviar el correo.';
            setMessage({ type: 'error', text: message || 'Error al enviar el correo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b1121] p-4">
            <div className="w-full max-w-md space-y-8 bg-[#151e32] p-8 rounded-2xl border border-[#1e293b] shadow-2xl">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Recuperar Contraseña</h2>
                    <p className="mt-2 text-slate-400">
                        Ingresa tu correo y te enviaremos un enlace para restablecerla.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleReset}>
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none relative block w-full px-3 py-3 border border-slate-700 placeholder-slate-500 text-white rounded-xl bg-[#0b1121] focus:outline-none focus:ring-[#4ade80] focus:border-[#4ade80] focus:z-10 sm:text-sm"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !!(message?.type === 'success')}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-[#0b1121] bg-[#4ade80] hover:bg-[#4ade80]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4ade80] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar instrucciones'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
