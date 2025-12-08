import React, { useState, useEffect } from 'react';
import { Save, Key, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsPage() {
    // No configuration needed for client side anymore




    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Configuración</h2>
                <p className="text-slate-400">Ajustes generales y conexiones.</p>
            </div>

            <div className="bg-[#151e32] border border-[#1e293b] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                        <Key className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">IA Conectada</h3>
                        <p className="text-sm text-slate-400">
                            El servicio de escaneo inteligente está activado y configurado en el servidor.
                            No requieres configuración manual.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
