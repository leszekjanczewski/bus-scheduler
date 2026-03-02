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

// Note: Backend has /api/admin and /api/auth. Frontend API_BASE_URL usually has /api/v1.
// We clean the URL to match the current backend paths.
const BASE_URL = API_BASE_URL.replace('/api/v1', '/api');
const ADMIN_API = `${BASE_URL}/admin`;
const AUTH_API = `${BASE_URL}/auth`;

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
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ROLE_USER' | 'ROLE_ADMIN'>('ROLE_USER');
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
        axios.get(`${ADMIN_API}/lines`, { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get(`${BASE_URL}/busstops`, { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      setLines(linesRes.data);
      setAllStops(stopsRes.data);
      if (isAdmin) {
        const usersRes = await axios.get(`${ADMIN_API}/users`, { headers: { Authorization: `Bearer ${authToken}` } });
        setUsers(usersRes.data);
      }
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('Błąd pobierania danych.');
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
      const response = await axios.post(`${AUTH_API}/login`, { username, password });
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
      await axios.post(`${ADMIN_API}/users`, { username: newUserName, email: newUserEmail, password: newUserPass, roles: [newUserRole] }, { headers: { Authorization: `Bearer ${token}` } });
      setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
      fetchInitialData(token!);
      alert('Użytkownik dodany!');
    } catch (err) { alert('Błąd dodawania.'); }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${AUTH_API}/change-password`, { password: newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      setNewPassword('');
      alert('Hasło zmienione!');
    } catch (err) { alert('Błąd zmiany hasła.'); }
  };

  const handleSave = async () => {
    if (!editingLine) return;
    setLoading(true);
    try {
      await axios.put(`${ADMIN_API}/lines/${editingLine.id}`, editingLine, { headers: { Authorization: `Bearer ${token}` } });
      setLines(lines.map(l => l.id === editingLine.id ? editingLine : l));
      setEditingLine(null);
      alert('Zapisano!');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
      else setError('Błąd zapisu.');
    } finally { setLoading(false); }
  };

  const handleDeleteLine = async (id: number) => {
    if (!isAdmin || !window.confirm('Usunąć linię?')) return;
    try {
      await axios.delete(`${ADMIN_API}/lines/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setLines(lines.filter(l => l.id !== id));
    } catch (err: any) { setError('Błąd usuwania.'); }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><LogIn className="text-white" size={24} /></div>
        <h2 className="text-2xl font-black mb-6 dark:text-white">Panel Logowania</h2>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Użytkownik" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all">Zaloguj</button>
          <button type="button" onClick={onBack} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">Wróć</button>
        </form>
        {error && <p className="mt-4 text-red-500 text-xs font-bold">{error}</p>}
      </div>
    );
  }

  if (editingLine) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-left">
        <div className="flex items-center justify-between mb-8 sticky top-24 z-50 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md py-4 rounded-2xl">
          <button onClick={() => setEditingLine(null)} className="flex items-center gap-2 text-slate-500 font-bold uppercase text-xs"> <ChevronLeft size={16} /> Anuluj</button>
          <button onClick={handleSave} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">ZAPISZ ZMIANY</button>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block">Numer Linii</label>
              <input value={editingLine.lineNumber} onChange={e => setEditingLine({...editingLine, lineNumber: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-2xl font-black" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Operator</label>
              <input value={editingLine.operator} onChange={e => setEditingLine({...editingLine, operator: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"><ChevronLeft size={20} /></button>
          <div className="ml-4">
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tight">System Administracyjny</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Rola: {isAdmin ? 'Administrator' : 'Użytkownik'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex">
            <button onClick={() => setActiveTab('LINES')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'LINES' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>LINIE</button>
            <button onClick={() => setActiveTab('STOPS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'STOPS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>PRZYSTANKI</button>
            <button onClick={() => setActiveTab('MAP')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'MAP' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>MAPA</button>
            {isAdmin && <button onClick={() => setActiveTab('USERS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'USERS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>UŻYTKOWNICY</button>}
            <button onClick={() => setActiveTab('PROFILE')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'PROFILE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>HASŁO</button>
          </div>
          <button onClick={handleLogout} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl border border-red-100 dark:border-red-900/30"><LogOut size={20} /></button>
        </div>
      </div>

      {activeTab === 'LINES' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase">Linia</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase">Operator</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8"><div className="w-14 h-14 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center shadow-lg">{line.lineNumber}</div></td>
                  <td className="px-10 py-8 font-black text-slate-700 dark:text-slate-200">{line.operator}</td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => setEditingLine(line)} className="p-4 text-slate-400 hover:text-blue-600"><Edit3 size={20} /></button>
                    {isAdmin && <button onClick={() => handleDeleteLine(line.id)} className="p-4 text-slate-400 hover:text-red-600"><Trash2 size={20} /></button>}
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
        <div className="max-w-4xl mx-auto space-y-8 text-left">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Dodaj Użytkownika</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Login" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <input type="password" placeholder="Hasło" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold">
                <option value="ROLE_USER">Użytkownik</option>
                <option value="ROLE_ADMIN">Administrator</option>
              </select>
              <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black uppercase">Stwórz</button>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden">
             <table className="w-full text-left">
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {users.map(u => (
                   <tr key={u.id} className="p-4">
                     <td className="px-8 py-4 font-bold dark:text-white">{u.username} <span className="ml-2 text-[10px] text-slate-400 font-black uppercase">({u.roles.join(', ')})</span></td>
                     <td className="px-8 py-4 text-right">
                        <button onClick={async () => {
                          const p = prompt('Nowe hasło:');
                          if(p) { await axios.put(`${ADMIN_API}/users/${u.id}/password`, { password: p }, { headers: { Authorization: `Bearer ${token}` } }); alert('Zmieniono'); }
                        }} className="text-blue-600 font-bold text-xs uppercase mr-4">Hasło</button>
                        <button onClick={async () => {
                          if(confirm('Usunąć?')) { await axios.delete(`${ADMIN_API}/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchInitialData(token!); }
                        }} className="text-red-600 font-bold text-xs uppercase">Usuń</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Zmień Hasło</h3>
          <form onSubmit={handleChangeOwnPassword} className="space-y-4">
             <input type="password" placeholder="Nowe Hasło" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
             <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase">Aktualizuj</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
