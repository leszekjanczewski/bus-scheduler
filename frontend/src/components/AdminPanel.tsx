import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import {
  Trash2, ChevronLeft, ChevronRight, Plus, Clock, MapPin, LogOut, Building2
} from 'lucide-react';
import StopManager from './StopManager';
import StopMap from './StopMap';
import { API_BASE_URL } from '../config';

interface BusStop { id: number; name: string; city: string; direction?: string; }
interface RouteStop { id: number; busStop: BusStop; sequenceNumber: number; timeOffsetMinutes: number; }
interface Departure { id: number | null; departureTime: string; busStop: BusStop; }
interface Trip { id: number | null; calendarType: string; departures: Departure[]; }
interface Route { id: number; variantName: string; direction: string; trips?: Trip[]; routeStops: RouteStop[]; }
interface BusLine { id: number; lineNumber: string; operator: string; routes: Route[]; }
interface User { id: string; username: string; email: string; roles: string[]; }

const ADMIN_API = `${API_BASE_URL}/admin`;
const AUTH_API  = `${API_BASE_URL}/auth`;
const CALENDAR_TYPES = ['Dni robocze', 'Soboty', 'Niedziele i święta'] as const;

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  // ── Global ────────────────────────────────────────────────────────────────
  const [lines, setLines]       = useState<BusLine[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'LINES' | 'STOPS' | 'MAP' | 'USERS' | 'PROFILE'>('LINES');
  const [userRoles]             = useState<string[]>(JSON.parse(localStorage.getItem('user_roles') || '[]'));
  const isAdmin                 = userRoles.includes('ROLE_ADMIN');

  // ── Navigation (replaces editingLine) ────────────────────────────────────
  const [selectedLine,  setSelectedLine]  = useState<BusLine | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeTrips,    setRouteTrips]    = useState<Trip[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<string>('Dni robocze');
  const [loadingTrips,  setLoadingTrips]  = useState(false);

  // ── In-place save indicators ──────────────────────────────────────────────
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [savedIds,  setSavedIds]  = useState<Set<number>>(new Set());

  // ── Add trip form ─────────────────────────────────────────────────────────
  const [newTripCalendar, setNewTripCalendar] = useState<string>('Dni robocze');
  const [newTripTime,     setNewTripTime]     = useState<string>('');
  const [addingTrip,      setAddingTrip]      = useState(false);

  // ── User management ───────────────────────────────────────────────────────
  const [newUserName,  setNewUserName]  = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass,  setNewUserPass]  = useState('');
  const [newUserRole,  setNewUserRole]  = useState<'ROLE_USER' | 'ROLE_ADMIN'>('ROLE_USER');
  const [newPassword,  setNewPassword]  = useState('');

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const linesRes = await apiClient.get(`${ADMIN_API}/lines`);
      setLines(linesRes.data);
      if (isAdmin) {
        const usersRes = await apiClient.get(`${ADMIN_API}/users`);
        setUsers(usersRes.data);
      }
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) setError('Brak uprawnień.');
      else if (err.response?.status !== 401) setError('Błąd pobierania danych.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchInitialData(); }, []);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const handleSelectRoute = async (route: Route) => {
    setSelectedRoute(route);
    setRouteTrips([]);
    setCalendarFilter('Dni robocze');
    setLoadingTrips(true);
    try {
      const res = await apiClient.get(`${ADMIN_API}/routes/${route.id}/trips`);
      setRouteTrips(res.data);
    } catch { setError('Błąd pobierania kursów.'); }
    finally { setLoadingTrips(false); }
  };

  const backToLines  = () => { setSelectedLine(null); setSelectedRoute(null); setRouteTrips([]); };
  const backToRoutes = () => { setSelectedRoute(null); setRouteTrips([]); };

  // ── Atomic departure PATCH ────────────────────────────────────────────────
  const handleDepartureBlur = async (dep: Departure, newTime: string) => {
    if (!dep.id) return;
    if (dep.departureTime.substring(0, 5) === newTime) return;
    setSavingIds(prev => new Set(prev).add(dep.id!));
    try {
      await apiClient.patch(`${ADMIN_API}/departures/${dep.id}`, { departureTime: newTime });
      setRouteTrips(prev => prev.map(t => ({
        ...t,
        departures: t.departures.map(d => d.id === dep.id ? { ...d, departureTime: newTime + ':00' } : d)
      })));
      setSavedIds(prev => new Set(prev).add(dep.id!));
      setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(dep.id!); return s; }), 1500);
    } catch { setError('Błąd zapisu godziny.'); }
    finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(dep.id!); return s; });
    }
  };

  // ── Add trip (POST) ───────────────────────────────────────────────────────
  const handleAddTrip = async () => {
    if (!selectedRoute || !newTripTime) { alert('Podaj godzinę startu kursu'); return; }
    setAddingTrip(true);
    try {
      const res = await apiClient.post(`${ADMIN_API}/routes/${selectedRoute.id}/trips`, {
        calendarType: newTripCalendar,
        startTime: newTripTime
      });
      setRouteTrips(prev => [...prev, res.data]);
      setNewTripTime('');
    } catch { setError('Błąd dodawania kursu.'); }
    finally { setAddingTrip(false); }
  };

  // ── Delete trip (DELETE) ──────────────────────────────────────────────────
  const handleDeleteTrip = async (tripId: number) => {
    if (!window.confirm('Usunąć kurs?')) return;
    try {
      await apiClient.delete(`${ADMIN_API}/trips/${tripId}`);
      setRouteTrips(prev => prev.filter(t => t.id !== tripId));
    } catch { setError('Błąd usuwania kursu.'); }
  };

  // ── Delete line ───────────────────────────────────────────────────────────
  const handleDeleteLine = async (id: number) => {
    if (!isAdmin || !window.confirm('Usunąć linię?')) return;
    try {
      await apiClient.delete(`${ADMIN_API}/lines/${id}`);
      setLines(lines.filter(l => l.id !== id));
    } catch { setError('Błąd usuwania.'); }
  };

  // ── User handlers ─────────────────────────────────────────────────────────
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`${ADMIN_API}/users`, {
        username: newUserName, email: newUserEmail, password: newUserPass, roles: [newUserRole]
      });
      setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
      fetchInitialData();
      alert('Użytkownik dodany!');
    } catch { alert('Błąd dodawania.'); }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`${AUTH_API}/change-password`, { password: newPassword });
      setNewPassword('');
      alert('Hasło zmienione!');
    } catch { alert('Błąd zmiany hasła.'); }
  };

  const filteredTrips = routeTrips
    .filter(t => t.calendarType === calendarFilter)
    .slice()
    .sort((a, b) => {
      const aTime = a.departures?.[0]?.departureTime ?? '';
      const bTime = b.departures?.[0]?.departureTime ?? '';
      return aTime.localeCompare(bTime);
    });

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: Trip management (route selected)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedLine && selectedRoute) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-left">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm font-bold text-slate-400">
          <button onClick={backToRoutes} className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <ChevronLeft size={16} /> Linia {selectedLine.lineNumber}
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-700 dark:text-white">{selectedRoute.direction || selectedRoute.variantName}</span>
        </div>

        {/* Calendar filter */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 mb-8 w-fit">
          {CALENDAR_TYPES.map(cal => (
            <button
              key={cal}
              onClick={() => setCalendarFilter(cal)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                calendarFilter === cal
                  ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {cal === 'Dni robocze' ? 'Pn – Pt' : cal === 'Soboty' ? 'Soboty' : 'Niedziele'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-5 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm">{error}</div>
        )}

        {/* Trips */}
        {loadingTrips ? (
          <div className="flex justify-center py-20">
            <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {filteredTrips.length === 0 && (
              <div className="text-center py-16 text-slate-400 font-bold">
                Brak kursów dla wybranego typu dnia
              </div>
            )}
            {filteredTrips.map(trip => (
              <div key={trip.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-black uppercase">
                      {trip.calendarType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {trip.departures?.length || 0} przyst.
                    </span>
                  </div>
                  {isAdmin && trip.id && (
                    <button
                      onClick={() => handleDeleteTrip(trip.id!)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {trip.departures && trip.departures.length > 0 && (
                  <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...trip.departures]
                      .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
                      .map(dep => (
                        <div key={dep.id ?? dep.departureTime} className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 truncate">{dep.busStop.name}</span>
                          <input
                            type="time"
                            defaultValue={dep.departureTime.substring(0, 5)}
                            onBlur={e => handleDepartureBlur(dep, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border font-mono font-bold text-sm text-blue-600 dark:text-blue-400 focus:outline-none transition-all ring-2 ${
                              savingIds.has(dep.id!)  ? 'ring-yellow-400 border-yellow-300' :
                              savedIds.has(dep.id!)   ? 'ring-green-500  border-green-400'  :
                              'ring-transparent border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add trip */}
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-4 p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Typ dnia</label>
              <select
                value={newTripCalendar}
                onChange={e => setNewTripCalendar(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                {CALENDAR_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Godzina startu</label>
              <input
                type="time"
                value={newTripTime}
                onChange={e => setNewTripTime(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleAddTrip}
              disabled={addingTrip}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              <Plus size={14} /> {addingTrip ? 'Dodawanie...' : 'Dodaj Kurs'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: Route list (line selected)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedLine) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-left">

        <button onClick={backToLines} className="flex items-center gap-2 mb-8 text-slate-500 font-bold uppercase text-xs tracking-tighter hover:text-blue-600 transition-colors">
          <ChevronLeft size={16} /> Wszystkie linie
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-blue-600 text-white font-black text-xl rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {selectedLine.lineNumber}
          </div>
          <div>
            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">{selectedLine.operator}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              {selectedLine.routes?.length || 0} {selectedLine.routes?.length === 1 ? 'trasa' : 'trasy'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {selectedLine.routes && Array.from(selectedLine.routes).map(route => (
            <div
              key={route.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
            >
              <div>
                <p className="font-black dark:text-white text-lg">{route.direction || route.variantName || '—'}</p>
                {route.variantName && route.direction && (
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{route.variantName}</p>
                )}
                <div className="flex items-center gap-1 mt-2 text-slate-400">
                  <MapPin size={12} />
                  <span className="text-xs font-bold">{route.routeStops?.length || 0} przystanków</span>
                </div>
              </div>
              <button
                onClick={() => handleSelectRoute(route)}
                className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20"
              >
                <Clock size={14} /> Kursy <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: Main panel (tabs)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 text-left">

      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all">
            <ChevronLeft size={20} className="text-slate-500" />
          </button>
          <div className="ml-4">
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tight">System Administracyjny</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Rola: {isAdmin ? 'Administrator' : 'Użytkownik'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex">
            {(['LINES', 'STOPS', 'MAP'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                {tab === 'LINES' ? 'LINIE' : tab === 'STOPS' ? 'PRZYSTANKI' : 'MAPA'}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => setActiveTab('USERS')}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'USERS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                UŻYTKOWNICY
              </button>
            )}
            <button onClick={() => setActiveTab('PROFILE')}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'PROFILE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
              HASŁO
            </button>
          </div>
          <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user_roles'); navigate('/login'); }}
            className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl border border-red-100 hover:bg-red-100 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'LINES' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Linia</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map(line => (
                <tr key={line.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8">
                    <div className="w-14 h-14 bg-blue-600 text-white font-black text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      {line.lineNumber}
                    </div>
                  </td>
                  <td className="px-10 py-8 font-black text-slate-700 dark:text-slate-200">{line.operator}</td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedLine(line)}
                        title="Zarządzaj kursami"
                        className="p-4 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl transition-all"
                      >
                        <Clock size={20} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          className="p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : activeTab === 'STOPS' ? (
        <StopManager isAdmin={isAdmin} />

      ) : activeTab === 'MAP' ? (
        <StopMap />

      ) : activeTab === 'USERS' ? (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight">Dodaj Użytkownika</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Login" value={newUserName} onChange={e => setNewUserName(e.target.value)}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <input type="password" placeholder="Hasło" value={newUserPass} onChange={e => setNewUserPass(e.target.value)}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold">
                <option value="ROLE_USER">Użytkownik</option>
                <option value="ROLE_ADMIN">Administrator</option>
              </select>
              <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black uppercase hover:bg-blue-700 transition-all shadow-lg">Stwórz</button>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-8 py-4 font-bold dark:text-white">
                      {u.username} <span className="ml-2 text-[10px] text-slate-400 font-black uppercase">({u.roles.join(', ')})</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button onClick={async () => {
                        const p = prompt('Nowe hasło:');
                        if (p) { await apiClient.put(`${ADMIN_API}/users/${u.id}/password`, { password: p }); alert('Zmieniono'); }
                      }} className="text-blue-600 font-bold text-xs uppercase mr-4">Hasło</button>
                      <button onClick={async () => {
                        if (confirm('Usunąć?')) { await apiClient.delete(`${ADMIN_API}/users/${u.id}`); fetchInitialData(); }
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
            <input type="password" placeholder="Nowe Hasło" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              Aktualizuj
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
