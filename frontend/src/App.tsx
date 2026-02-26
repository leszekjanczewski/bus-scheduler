import { useState, useEffect } from 'react';
import axios from 'axios';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import Loader from './components/Loader';
import EmptyState from './components/EmptyState';
import AdminPanel from './components/AdminPanel';
import type { ConnectionDTO, BusStopDTO, StopDepartureDTO } from './types';
import { useDarkMode } from './hooks/useDarkMode';
import ThemeToggle from './components/ThemeToggle';
import { AlertCircle, MapPin, WifiOff, Github, Settings } from 'lucide-react';

const API_BASE_URL = 'http://192.168.68.114:8080/api/v1';

function App() {
  const { theme, toggleTheme } = useDarkMode();
  const [connections, setConnections] = useState<ConnectionDTO[]>([])
  const [departures, setDepartures] = useState<StopDepartureDTO[]>([])        
  const [availableStops, setAvailableStops] = useState<BusStopDTO[]>([])      
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendError, setBackendError] = useState<boolean>(false)
  const [isAdminMode, setIsAdminMode] = useState(false)

  useEffect(() => {
    const fetchStops = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/busstops`);
        setAvailableStops(response.data);
        setBackendError(false);
      } catch (err) {
        console.error('Failed to fetch bus stops:', err);
        setBackendError(true);
      }
    };
    fetchStops();
  }, []);

  const handleSearch = async (fromId: number, toId: number | null, time: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setConnections([]);
    setDepartures([]);

    try {
      if (toId) {
        const response = await axios.get(`${API_BASE_URL}/search`, {
          params: { fromId, toId, time }
        });
        setConnections(response.data);
      } else {
        const response = await axios.get(`${API_BASE_URL}/departures/stop/${fromId}`, {
          params: { time }
        });
        setDepartures(response.data);
      }
      setBackendError(false);
    } catch (err: any) {
      console.error('Błąd podczas wyszukiwania:', err);
      let errorMessage = 'Nie udało się połączyć z serwerem.';
      if (err.response) {
        errorMessage = err.response.data.message || `Błąd serwera (${err.response.status})`;   
      } else if (err.request) {
        setBackendError(true);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (isAdminMode) {
    return <AdminPanel onBack={() => setIsAdminMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-['Inter'] pb-24 text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors duration-300">

      {/* Sticky Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <MapPin className="text-white" size={20} strokeWidth={3} />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors">Bus<span className="text-blue-600">Scheduler</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-4">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <a href="https://github.com/leszekjanczewski" target="_blank" className="text-slate-400 hover:text-slate-900 dark:hover:white transition-colors">
              <Github size={20} />
            </a>
            <button
              onClick={() => setIsAdminMode(true)}
              className="group flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-sm"
            >
              <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="hidden sm:inline">Panel Admina</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-30 pt-24">
        <SearchForm onSearch={handleSearch} availableStops={availableStops} />

        <div className="mt-16 min-h-[400px]">
          {backendError && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 shadow-sm animate-in slide-in-from-top-4 duration-500">
              <WifiOff size={20} />
              <span className="text-sm font-bold text-center w-full">Serwer jest chwilowo niedostępny. Spróbuj odświeżyć stronę.</span>
            </div>
          )}

          {isLoading && <Loader />}

          {error && (
            <div className="max-w-2xl mx-auto p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-start gap-4 text-rose-600 shadow-sm animate-in zoom-in-95 duration-300">        
              <AlertCircle className="shrink-0 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-lg mb-1">Wystąpił problem</h4>
                <p className="text-sm font-medium opacity-90 leading-relaxed">{error}</p>      
              </div>
            </div>
          )}

          {!isLoading && !error && hasSearched && connections.length > 0 && (
            <ResultsList connections={connections} />
          )}

          {!isLoading && !error && hasSearched && departures.length > 0 && (
            <div className="w-full max-w-5xl mx-auto px-4 space-y-6">
              <div className="flex items-end justify-between px-2 mb-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Odjazdy z przystanku</h3>
                <span className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">NAJBLIŻSZE KURSY</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departures.map((dep, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-1 sm:gap-4">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20">{dep.lineName}</div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kierunek</p>
                        <p className="font-black text-slate-900 dark:text-white uppercase text-sm">{dep.direction}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Odjazd</p>
                      <p className="text-3xl font-black text-blue-600 tracking-tighter">{dep.departureTime ? dep.departureTime.slice(0,5) : '--:--'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !error && hasSearched && (connections.length === 0 && departures.length === 0) && (
            <EmptyState />
          )}

          {!hasSearched && !isLoading && !error && (
            <div className="max-w-5xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: '🚀', title: 'Błyskawiczne wyniki', color: 'blue', desc: 'Nasze serwery przetwarzają tysiące połączeń w ułamku sekundy.' },
                  { icon: '🧠', title: 'AI Optymalizacja', color: 'emerald', desc: 'System uczy się Twoich nawyków i proponuje najwygodniejsze trasy.' },
                  { icon: '📱', title: 'Zawsze pod ręką', color: 'purple', desc: 'Aplikacja zaprojektowana w standardzie Mobile-First dla Twojej wygody.' }
                ].map((item, i) => (
                  <div key={i} className="group bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                    <div className={`w-16 h-16 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:bg-${item.color}-100 dark:group-hover:bg-${item.color}-900/40`}>
                      {item.icon}
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white text-xl mb-3 tracking-tight">{item.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-40 border-t border-slate-100 pt-12 text-center px-4">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">Bus Scheduler AI • Klodawa Gorzowska Edition • 2026</div>
      </footer>
    </div>
  )
}

export default App
