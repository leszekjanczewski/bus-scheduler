import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 size={48} className="text-blue-600 animate-spin relative z-10" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-slate-400 tracking-widest uppercase animate-pulse">Szukam połączeń...</span>
        </div>
    );
};

export default Loader;
