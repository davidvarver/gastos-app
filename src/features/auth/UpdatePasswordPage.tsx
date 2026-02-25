import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SupabaseError } from '@/db/db';

export function UpdatePasswordPage() {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const navigate = useNavigate();

    // Verify session exists (Supabase should handle the magic link session establishment before this component mounts if using standard flow)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, the link might be invalid or expired
                setMessage({ type: 'error', text: 'El enlace es inválido o ha expirado. Intenta solicitar uno nuevo.' });
            }
        });
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setMessage({ type: 'success', text: '¡Contraseña actualizada! Redirigiendo...' });

            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (error) {
            const err = error as Error | SupabaseError;
            console.error("Update Password Error:", error);
            const message = 'message' in err ? err.message : 'Error al actualizar la contraseña.';
            setMessage({ type: 'error', text: message || 'Error al actualizar la contraseña.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b1121] p-4">
            <div className="w-full max-w-md space-y-8 bg-[#151e32] p-8 rounded-2xl border border-[#1e293b] shadow-2xl">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Nueva Contraseña</h2>
                    <p className="mt-2 text-slate-400">
                        Ingresa tu nueva contraseña segura.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleUpdate}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="sr-only">Nueva Contraseña</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-slate-700 placeholder-slate-500 text-white rounded-xl bg-[#0b1121] focus:outline-none focus:ring-[#4ade80] focus:border-[#4ade80] focus:z-10 sm:text-sm"
                                placeholder="Nueva contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="sr-only">Confirmar Contraseña</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-slate-700 placeholder-slate-500 text-white rounded-xl bg-[#0b1121] focus:outline-none focus:ring-[#4ade80] focus:border-[#4ade80] focus:z-10 sm:text-sm"
                                placeholder="Confirma nueva contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
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
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
