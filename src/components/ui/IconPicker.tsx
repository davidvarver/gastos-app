import { CATEGORY_ICONS } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface IconPickerProps {
    value: string;
    onChange: (value: string) => void;
    color: string;
}

export function IconPicker({ value, onChange, color }: IconPickerProps) {
    const [search, setSearch] = useState('');

    const filteredIcons = Object.entries(CATEGORY_ICONS).filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar icono..."
                    className="w-full bg-[#0b1121] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {filteredIcons.map(([name, Icon]) => (
                    <button
                        key={name}
                        onClick={() => onChange(name)}
                        type="button"
                        className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                            value === name ? "ring-2 ring-white scale-110" : "hover:bg-slate-700 text-slate-400"
                        )}
                        style={{
                            backgroundColor: value === name ? color : 'transparent',
                            color: value === name ? '#fff' : undefined
                        }}
                        title={name}
                    >
                        <Icon className="w-5 h-5" />
                    </button>
                ))}
            </div>
            {filteredIcons.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">No se encontraron iconos.</p>
            )}
        </div>
    );
}
