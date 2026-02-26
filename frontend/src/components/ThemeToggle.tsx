import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeToggle = ({ theme, toggleTheme }: ThemeToggleProps) => {
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`
        relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-300
        ${isDark
                    ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700 shadow-lg shadow-slate-900/50'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm border border-slate-200'
                }
      `}
            aria-label="Toggle theme"
        >
            <div className="relative w-6 h-6">
                <Sun
                    size={24}
                    className={`
            absolute top-0 left-0 transition-all duration-500 rotate-0 scale-100
            ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}
          `}
                />
                <Moon
                    size={24}
                    className={`
            absolute top-0 left-0 transition-all duration-500 rotate-0 scale-100
            ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}
          `}
                />
            </div>
            <span className="sr-only">Przełącz motyw</span>
        </button>
    );
};

export default ThemeToggle;
