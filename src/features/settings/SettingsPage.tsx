import React, { useState, useEffect } from 'react';
import { Save, Key, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsPage() {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKey(storedKey);
    }, []);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } else {
            localStorage.removeItem('gemini_api_key');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Configuración</h2>
                <p className="text-slate-400">Ajustes generales y conexiones.</p>
            </div>

            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                        <Key className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">Google Gemini API Key</h3>
                        <p className="text-sm text-slate-400">
                            Necesaria para activar el escaneo inteligente de tickets con IA.
                            Es gratis y segura (se guarda solo en tu navegador).
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-200 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>
                            Puedes obtener tu clave gratis en{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-bold hover:text-white"
                            >
                                Google AI Studio
                            </a>.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">API Key</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                className="flex-1 bg-[#0b1121] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
                                placeholder="Pegar tu clave aquí (AIzasy...)"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button
                                onClick={handleSave}
                                className={cn(
                                    "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
                                    saved
                                        ? "bg-green-500 text-[#0b1121]"
                                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
                                )}
                            >
                                {saved ? (
                                    "¡Guardado!"
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
