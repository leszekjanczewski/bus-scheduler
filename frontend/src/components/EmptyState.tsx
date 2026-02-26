import React from 'react';
import { SearchX } from 'lucide-react';

const EmptyState: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-2 shadow-inner">
                <SearchX size={40} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Brak połączeń</h3>
            <p className="text-slate-500 max-w-xs text-sm leading-relaxed">
                Niestety nie znaleźliśmy bezpośredniego połączenia dla wybranych kryteriów. Spróbuj zmienić godzinę.
            </p>
        </div>
    );
};

export default EmptyState;
