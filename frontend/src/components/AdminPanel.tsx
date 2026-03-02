import { Autocomplete, TextField } from '@mui/material';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, RefreshCw, ChevronLeft, LogIn, Database, Edit3, Plus, Save, X, Clock, MapPin, List, Settings, LogOut, Building2, Map as MapIcon, User as UserIcon, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import StopManager from './StopManager';
import StopMap from './StopMap';
import { API_BASE_URL } from '../config';

interface BusStop { id: number; name: string; city: string; direction?: string; }
interface RouteStop { id: number; busStop: BusStop; sequenceNumber: number; timeOffsetMinutes: number; }
interface Departure { id: number; departureTime: string; busStop: { name: string }; }
interface Trip { id: number; calendarType: string; departures: Departure[]; }
interface Route { id: number; variantName: string; direction: string; trips: Trip[]; routeStops: RouteStop[]; }
interface BusLine { id: number; lineNumber: string; operator: string; routes: Route[]; }
interface User { id: string; username: string; email: string; roles: string[]; }

const API_BASE_URL_ADMIN = `${API_BASE_URL}/admin`;

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [lines, setLines] = useState<BusLine[]>([]);
  const [allStops, setAllStops] = useState<BusStop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRoles, setUserRoles] = useState<string[]>(JSON.parse(localStorage.getItem('user_roles') || '[]'));
  const [error, setError] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<BusLine | null>(null);
  const [activeTab, setActiveTab] = useState<'LINES' | 'STOPS' | 'MAP' | 'USERS' | 'PROFILE'>('LINES');
  
  // States for user management
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ROLE_USER' | 'ROLE_ADMIN'>('ROLE_USER');
  
  // State for password change
  const [newPassword, setNewPassword] = useState('');

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
        axios.get(`${API_BASE_URL_ADMIN}/lines`, { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get(`${API_BASE_URL}/busstops`, { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      setLines(linesRes.data);
      setAllStops(stopsRes.data);
      
      if (isAdmin) {
        const usersRes = await axios.get(`${API_BASE_URL_ADMIN}/users`, { headers: { Authorization: `Bearer ${authToken}` } });
        setUsers(usersRes.data);
      }
      
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('Błąd pobierania danych. Sprawdź połączenie z API.');
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
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
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
      setError('Błędne dane logowania.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL_ADMIN}/users`, {
        username: newUserName,
        email: newUserEmail,
        password: newUserPass,
        roles: [newUserRole]
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
      fetchInitialData(token!);
      alert('Użytkownik dodany!');
    } catch (err) {
      alert('Błąd dodawania użytkownika.');
    }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/auth/change-password`, {
        password: newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewPassword('');
      alert('Hasło zmienione pomyślnie!');
    } catch (err) {
      alert('Błąd zmiany hasła.');
    }
  };

  const handleSave = async () => {
    if (!editingLine) return;
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL_ADMIN}/lines/${editingLine.id}`, editingLine, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLines(lines.map(l => l.id === editingLine.id ? editingLine : l));
      setEditingLine(null);
      setError(null);
      alert('Zmiany zapisane pomyślnie!');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('Błąd zapisu danych.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (id: number) => {
    if (!isAdmin) return;
    if (!window.confirm('Czy na pewno chcesz usunąć tę linię?')) return;
    try {
      await axios.delete(`${API_BASE_URL_ADMIN}/lines/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLines(lines.filter(l => l.id !== id));
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('Błąd usuwania.');
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
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Użytkownik" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <input 
            type="password" 
            placeholder="Hasło" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all">Zaloguj</button>
          <button type="button" onClick={onBack} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">Wróć</button>
        </form>
        {error && <p className="mt-4 text-red-500 text-xs font-bold">{error}</p>}
      </div>
    );
  }

  if (editingLine) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 pb-40 text-left">
        <div className="flex items-center justify-between mb-8 sticky top-24 z-50 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md py-4 rounded-2xl text-left">
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
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Operator / Przewoźnik</label>
              <div className="relative text-left">
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
        {/* ... (rest of editing logic remains same) */}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      <div className="flex items-center justify-between mb-16 text-left">
        <div className="flex items-center gap-2 text-left">
          <button onClick={onBack} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all text-left">
            <ChevronLeft size={20} className="text-slate-500" />
          </button>
          <div className="ml-4 text-left">
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tight">System Administracyjny</h1>  
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Zarządzanie infrastrukturą i danymi</p>
            <div className="flex items-center gap-2 mt-1 text-left">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase rounded-md tracking-tighter">
                {isAdmin ? 'Administrator' : 'Użytkownik'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex text-left">
            <button onClick={() => setActiveTab('LINES')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'LINES' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /> LINIE</button>
            <button onClick={() => setActiveTab('STOPS')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'STOPS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Settings size={16} /> PRZYSTANKI</button>
            <button onClick={() => setActiveTab('MAP')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'MAP' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><MapIcon size={16} /> MAPA</button>
            {isAdmin && <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'USERS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><UsersIcon size={16} /> UŻYTKOWNICY</button>}
            <button onClick={() => setActiveTab('PROFILE')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'PROFILE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ShieldCheck size={16} /> HASŁO</button>
          </div>

          <div className="flex items-center gap-2 ml-4 text-left">
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
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm text-left text-left">
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
                  <td className="px-10 py-8 text-right text-left">
                    <div className="flex justify-end gap-3 text-left">
                      <button onClick={() => setEditingLine(line)} className="p-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all text-left"><Edit3 size={20} /></button>
                      {isAdmin && <button onClick={() => handleDeleteLine(line.id)} className="p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all text-left"><Trash2 size={20} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'STOPS' ? (
        <StopManager token={token!} onUnauthorized={handleLogout} isAdmin={isAdmin} />
      ) : activeTab === 'MAP' ? (
        <StopMap token={token!} isAdmin={isAdmin} />
      ) : activeTab === 'USERS' ? (
        <div className="max-w-4xl mx-auto space-y-8 text-left text-left">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
            <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Dodaj Nowego Użytkownika</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <input placeholder="Login" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
              <input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
              <input type="password" placeholder="Hasło" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                <option value="ROLE_USER">Użytkownik</option>
                <option value="ROLE_ADMIN">Administrator</option>
              </select>
              <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black uppercase hover:bg-blue-700 transition-all">Stwórz Użytkownika</button>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden text-left">
             <table className="w-full text-left">
               <thead className="bg-slate-50 dark:bg-slate-800/30 text-left">
                 <tr>
                   <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-left">Użytkownik</th>
                   <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-left">Rola</th>
                   <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Akcje</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
                 {users.map(u => (
                   <tr key={u.id} className="text-left">
                     <td className="px-8 py-4 font-bold dark:text-white text-left">{u.username}</td>
                     <td className="px-8 py-4 text-left"><span className="text-[10px] font-black uppercase px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-md">{u.roles.join(', ')}</span></td>
                     <td className="px-8 py-4 text-right text-left">
                        <button onClick={async () => {
                          const newP = prompt('Nowe hasło dla ' + u.username);
                          if(newP) {
                            await axios.put(`${API_BASE_URL_ADMIN}/users/${u.id}/password`, { password: newP }, { headers: { Authorization: `Bearer ${token}` } });
                            alert('Zmieniono!');
                          }
                        }} className="text-blue-600 font-bold text-xs uppercase mr-4">Zmień Hasło</button>
                        <button onClick={async () => {
                          if(confirm('Usunąć?')) {
                            await axios.delete(`${API_BASE_URL_ADMIN}/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } });
                            fetchInitialData(token!);
                          }
                        }} className="text-red-600 font-bold text-xs uppercase">Usuń</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
          <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Zmień Moje Hasło</h3>
          <form onSubmit={handleChangeOwnPassword} className="space-y-4 text-left">
             <input type="password" placeholder="Nowe Hasło" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
             <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase hover:bg-blue-700 transition-all">Aktualizuj Hasło</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
