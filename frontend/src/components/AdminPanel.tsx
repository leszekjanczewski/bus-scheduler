import { Autocomplete, TextField } from '@mui/material';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, RefreshCw, ChevronLeft, LogIn, Database, Edit3, Plus, Save, X, Clock, MapPin, List, Settings, LogOut, Building2, Map as MapIcon, User as UserIcon } from 'lucide-react';
import StopManager from './StopManager';
import StopMap from './StopMap';
import { API_BASE_URL } from '../config';

interface BusStop { id: number; name: string; city: string; direction?: string; }
interface RouteStop { id: number; busStop: BusStop; sequenceNumber: number; timeOffsetMinutes: number; }
interface Departure { id: number; departureTime: string; busStop: { name: string }; }
interface Trip { id: number; calendarType: string; departures: Departure[]; }
interface Route { id: number; variantName: string; direction: string; trips: Trip[]; routeStops: RouteStop[]; }
interface BusLine { id: number; lineNumber: string; operator: string; routes: Route[]; }


const API_BASE_URL_ADMIN = ${API_BASE_URL}/api/admin;

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [lines, setLines] = useState<BusLine[]>([]);
  const [allStops, setAllStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRoles, setUserRoles] = useState<string[]>(JSON.parse(localStorage.getItem('user_roles') || '[]'));
  const [error, setError] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<BusLine | null>(null);
  const [activeTab, setActiveTab] = useState<'LINES' | 'STOPS' | 'MAP'>('LINES');

  const isAdmin = userRoles.includes('ROLE_ADMIN');

  const handleLogout = () => {
    setToken(null);
    setUserRoles([]);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user_roles');
    setEditingLine(null);
  };

  const fetchInitialData = async (authToken: string) => {
    setLoading(true);
    try {
      const [linesRes, stopsRes] = await Promise.all([
        axios.get(${API_BASE_URL_ADMIN}/lines, { headers: { Authorization: Bearer  } }),
        axios.get(${API_BASE_URL}/busstops, { headers: { Authorization: Bearer  } })
      ]);
      setLines(linesRes.data);
      setAllStops(stopsRes.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('BÅ‚Ä…d pobierania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInitialData(token);
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Logowanie uÅ¼ywa /api/auth/login (bez v1 w ścieżce, bo tak jest w backendzie)
      // Ale config.ts dodaje /api/v1 do API_BASE_URL. 
      // Musimy uÅ¼yÄ‡ czystego URL dla Auth.
      const authUrl = API_BASE_URL.replace('/api/v1', '/api/auth/login');
      
      const response = await axios.post(authUrl, {
        username: username, password: password
      });
      
      const newToken = response.data.token;
      const roles = response.data.roles;
      
      setToken(newToken);
      setUserRoles(roles);
      localStorage.setItem('admin_token', newToken);
      localStorage.setItem('user_roles', JSON.stringify(roles));
      
      fetchInitialData(newToken);
      setError(null);
    } catch (err) {
      setError('BÅ‚Ä™dne dane logowania.');
    }
  };

  const handleSave = async () => {
    if (!editingLine) return;
    setLoading(true);
    try {
      await axios.put(${API_BASE_URL_ADMIN}/lines/, editingLine, {
        headers: { Authorization: Bearer  }
      });
      setLines(lines.map(l => l.id === editingLine.id ? editingLine : l));
      setEditingLine(null);
      setError(null);
      alert('Zmiany zapisane pomyÅ›lnie!');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('BÅ‚Ä…d zapisu danych.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (id: number) => {
    if (!isAdmin) return;
    if (!window.confirm('Czy na pewno chcesz usunÄ…Ä‡ tÄ™ liniÄ™?')) return;
    try {
      await axios.delete(${API_BASE_URL_ADMIN}/lines/, {
        headers: { Authorization: Bearer  }
      });
      setLines(lines.filter(l => l.id !== id));
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('BÅ‚Ä…d usuwania.');
    }
  };

  const getGroupedDepartures = (trips: Trip[], stopName: string) => {
    const groups: { [key: string]: string[] } = {};
    trips.forEach(trip => {
      const times = trip.departures
        .filter(d => d.busStop?.name === stopName)
        .map(d => d.departureTime.substring(0, 5))
        .sort();
      if (times.length > 0) {
        if (!groups[trip.calendarType]) groups[trip.calendarType] = [];
        groups[trip.calendarType] = Array.from(new Set([...groups[trip.calendarType], ...times])).sort();
      }
    });
    return groups;
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><LogIn className="text-white" size={24} /></div>
        <h2 className="text-2xl font-black mb-6 dark:text-white">Panel Logowania</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="UÅ¼ytkownik" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <input 
            type="password" 
            placeholder="HasÅ‚o" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all">Zaloguj</button>
          <button type="button" onClick={onBack} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">WrÃ³Ä‡</button>
        </form>
        {error && <p className="mt-4 text-red-500 text-xs font-bold">{error}</p>}
      </div>
    );
  }

  if (editingLine) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 pb-40 text-left">
        <div className="flex items-center justify-between mb-8 sticky top-24 z-50 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md py-4 rounded-2xl">
          <button onClick={() => setEditingLine(null)} className="flex items-center gap-2 text-slate-500 font-bold uppercase text-xs tracking-tighter hover:text-blue-600 transition-colors">
            <ChevronLeft size={16} /> Anuluj
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
            <Save size={16} /> ZAPISZ WSZYSTKIE ZMIANY
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 shadow-sm mb-12 text-left">
          <div className="flex flex-col md:flex-row gap-8 text-left">
            <div className="w-full md:w-48 space-y-2 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-blue-600">Numer Linii</label>
              <input
                value={editingLine.lineNumber}
                onChange={e => setEditingLine({ ...editingLine, lineNumber: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-3xl font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 space-y-2 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Operator / PrzewoÅºnik</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  value={editingLine.operator}
                  onChange={e => setEditingLine({ ...editingLine, operator: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-16">
          {editingLine.routes && editingLine.routes.map((route, rIdx) => (
            <div key={route.id || rIdx} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-10 border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row gap-8 bg-slate-50/50 dark:bg-slate-800/20 text-left">
                <div className="flex-1 space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nazwa Wariantu (np. 241A)</label>
                  <input value={route.variantName || ""} onChange={e => {
                    const rs = [...editingLine.routes]; rs[rIdx] = { ...route, variantName: e.target.value }; setEditingLine({ ...editingLine, routes: rs });
                  }} className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold" />
                </div>
                <div className="flex-1 space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kierunek Docelowy</label>
                  <input value={route.direction || ""} onChange={e => {
                    const rs = [...editingLine.routes]; rs[rIdx] = { ...route, direction: e.target.value }; setEditingLine({ ...editingLine, routes: rs });
                  }} className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold" />
                </div>
              </div>

              <div className="p-10 text-left">
                <div className="flex items-center justify-between mb-10 text-left">
                  <div className="flex items-center gap-3">
                    <MapPin size={20} className="text-blue-500" />
                    <h4 className="text-lg font-black dark:text-white">Przebieg Trasy</h4>
                  </div>
                </div>

                <div className="space-y-0 relative">
                  <div className="absolute left-4 top-4 bottom-4 w-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>

                  {route.routeStops && route.routeStops.sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((rs, rsIdx) => {
                    const stopDepartures = getGroupedDepartures(route.trips, rs.busStop?.name);

                    return (
                      <div key={rs.id || rsIdx} className="relative pl-16 pb-12 last:pb-0 text-left">
                        <div className="absolute left-0 w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-4 border-blue-500 flex items-center justify-center font-black text-[10px] z-10 shadow-sm">{rs.sequenceNumber}</div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">   
                          <div className="flex-1 space-y-2 text-left">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Przystanek</label>
                            <select
                              value={rs.busStop?.id}
                              onChange={e => {
                                const newStopId = parseInt(e.target.value);
                                const selectedStop = allStops.find(s => s.id === newStopId);
                                if (selectedStop) {
                                  const newRoutes = [...editingLine.routes];
                                  const newStops = [...newRoutes[rIdx].routeStops];
                                  newStops[rsIdx] = { ...rs, busStop: selectedStop };
                                  newRoutes[rIdx].routeStops = newStops;
                                  setEditingLine({ ...editingLine, routes: newRoutes });
                                }
                              }}
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {allStops.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.city}){s.direction ?  â†’  : ""}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-4 text-left">
                            <div className="flex flex-col items-end text-left">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Offset (min)</label>
                              <div className="flex items-center gap-2 text-left">
                                <span className="text-slate-300 text-sm font-bold">+</span>
                                <input
                                  type="number"
                                  value={rs.timeOffsetMinutes}
                                  onChange={e => {
                                    const newRoutes = [...editingLine.routes];
                                    const newStops = [...newRoutes[rIdx].routeStops];
                                    newStops[rsIdx] = { ...rs, timeOffsetMinutes: parseInt(e.target.value) || 0 };    
                                    newRoutes[rIdx].routeStops = newStops;
                                    setEditingLine({ ...editingLine, routes: newRoutes });
                                  }}
                                  className="w-16 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-center text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left">
                            {Object.keys(stopDepartures).length > 0 ? (
                              Object.entries(stopDepartures).map(([calendarType, times]) => (
                                <div key={calendarType} className="mb-2 last:mb-0 text-left">
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 text-left">
                                    <Clock size={10} /> {calendarType}
                                  </div>
                                  <div className="flex flex-wrap gap-1 text-left">
                                    {times.map((t, i) => (
                                      <div key={i} className="px-2 py-1 bg-white dark:bg-slate-900 rounded-md text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">{t}</div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-[8px] italic uppercase tracking-widest text-left">Brak odjazdÃ³w</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all text-left">
            <ChevronLeft size={20} className="text-slate-500" />
          </button>
          <div className="ml-4 text-left">
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tight">System Administracyjny</h1>  
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">ZarzÄ…dzanie infrastrukturÄ… i danymi</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase rounded-md tracking-tighter">
                {isAdmin ? 'Administrator' : 'UÅ¼ytkownik'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex text-left">
            <button
              onClick={() => setActiveTab('LINES')}
              className={lex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all }
            >
              <List size={16} /> LINIE
            </button>
            <button
              onClick={() => setActiveTab('STOPS')}
              className={lex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all }
            >
              <Settings size={16} /> PRZYSTANKI
            </button>
            <button
              onClick={() => setActiveTab('MAP')}
              className={lex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all }
            >
              <MapIcon size={16} /> MAPA
            </button>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button onClick={() => fetchInitialData(token!)} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all text-left">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleLogout} title="Wyloguj" className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm hover:bg-red-100 transition-all text-left">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'LINES' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm text-left">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Linia</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Operator</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Warianty</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
              {lines.map((line) => (
                <tr key={line.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors text-left">
                  <td className="px-10 py-8 text-left"><div className="w-14 h-14 bg-blue-600 text-white font-black text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">{line.lineNumber}</div></td>
                  <td className="px-10 py-8 font-black text-slate-700 dark:text-slate-200 text-left">{line.operator}</td>
                  <td className="px-10 py-8 text-left"><span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{line.routes.length} Warianty</span></td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-3 text-left">
                      <button onClick={() => setEditingLine(line)} className="p-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all text-left"><Edit3 size={20} /></button>
                      {isAdmin && (
                        <button onClick={() => handleDeleteLine(line.id)} className="p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all text-left"><Trash2 size={20} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'STOPS' ? (
        <StopManager token={token!} onUnauthorized={handleLogout} isAdmin={isAdmin} />
      ) : (
        <StopMap token={token!} isAdmin={isAdmin} />
      )}
    </div>
  );
};

export default AdminPanel;
