import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import {
  Trash2, ChevronLeft, ChevronRight, Plus, Clock, MapPin, LogOut, Building2
} from 'lucide-react';
import StopManager from './StopManager';
import StopMap from './StopMap';
import { API_BASE_URL } from '../config';
import { useDarkMode } from '../hooks/useDarkMode';
import ThemeToggle from './ThemeToggle';

interface BusStop { id: number; name: string; city: string; direction?: string; }
interface RouteStop { id: number; busStop: BusStop; sequenceNumber: number; timeOffsetMinutes: number; }
interface Departure { id: number | null; departureTime: string; busStop: BusStop; }
interface Trip { id: number | null; calendarType: string; departures: Departure[]; }
interface Route { id: number; variantName: string; direction: string; trips?: Trip[]; routeStops: RouteStop[]; }
interface BusLine { id: number; lineNumber: string; operator: string; routes: Route[]; }
interface User { id: string; username: string; email: string; roles: string[]; }

const ADMIN_API = `${API_BASE_URL}/admin`;
const AUTH_API  = `${API_BASE_URL}/auth`;
const CALENDAR_TYPES = [
  { value: 'WORKDAYS',          label: 'Dni robocze' },
  { value: 'SATURDAYS',         label: 'Soboty' },
  { value: 'SUNDAYS_HOLIDAYS',  label: 'Niedziele i święta' },
] as const;

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useDarkMode();

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
  const [calendarFilter, setCalendarFilter] = useState<string>('WORKDAYS');
  const [loadingTrips,  setLoadingTrips]  = useState(false);

  // ── In-place save indicators ──────────────────────────────────────────────
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [savedIds,  setSavedIds]  = useState<Set<number>>(new Set());

  // ── Add trip form ─────────────────────────────────────────────────────────
  const [newTripCalendar, setNewTripCalendar] = useState<string>('WORKDAYS');
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
    setCalendarFilter('WORKDAYS');
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

  // ── Create missing departure (POST) ──────────────────────────────────────
  const handleCreateDeparture = async (tripId: number, busStopId: number, newTime: string) => {
    if (!newTime) return;
    try {
      const res = await apiClient.post(`${ADMIN_API}/departures`, {
        tripId: String(tripId),
        busStopId: String(busStopId),
        departureTime: newTime,
      });
      const created: Departure = res.data;
      setRouteTrips(prev => prev.map(t =>
        t.id === tripId ? { ...t, departures: [...t.departures, created] } : t
      ));
    } catch { setError('Błąd dodawania odjazdu.'); }
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
  // VIEW: Trip management — TIMETABLE GRID (stops = rows, trips = columns)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedLine && selectedRoute) {
    // Primary: use routeStops from the line response (has correct sequence order).
    // Fallback: if routeStops unavailable, derive unique stops from trip departures
    // sorted by departure time of the first available trip.
    const routeStopsAvailable = selectedRoute.routeStops && selectedRoute.routeStops.length > 0;
    const sortedStops: RouteStop[] = routeStopsAvailable
      ? [...selectedRoute.routeStops].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      : (() => {
          const stopMap = new Map<number, RouteStop>();
          routeTrips.forEach(trip => {
            (trip.departures ?? []).forEach(dep => {
              if (!stopMap.has(dep.busStop.id)) {
                stopMap.set(dep.busStop.id, {
                  id: dep.busStop.id,
                  busStop: dep.busStop,
                  sequenceNumber: 0,
                  timeOffsetMinutes: 0,
                });
              }
            });
          });
          const firstTrip = routeTrips[0];
          const timeMap = new Map<number, string>();
          (firstTrip?.departures ?? []).forEach(d => timeMap.set(d.busStop.id, d.departureTime));
          return [...stopMap.values()].sort((a, b) =>
            (timeMap.get(a.busStop.id) ?? '').localeCompare(timeMap.get(b.busStop.id) ?? '')
          );
        })();

    return (
      <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>

        {/* Breadcrumb + calendar tabs */}
        <div className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={backToRoutes}
            className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={14} />
            Linia {selectedLine.lineNumber}
          </button>
          <ChevronRight size={13} className="text-slate-300 dark:text-slate-700" />
          <span className="text-sm font-black text-slate-800 dark:text-white">
            {selectedRoute.direction || selectedRoute.variantName}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {filteredTrips.length} kursów
            </span>
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-0.5">
              {CALENDAR_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCalendarFilter(value)}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                    calendarFilter === value
                      ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {value === 'WORKDAYS' ? 'Pn – Pt' : label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="px-8 py-3 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800/30 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {loadingTrips ? (
            <div className="flex justify-center py-32">
              <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">

              {/* Timetable grid */}
              {filteredTrips.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/70 border-b-2 border-slate-200 dark:border-slate-700">
                          {/* Stop column header */}
                          <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/90 border-r-2 border-slate-200 dark:border-slate-700 px-5 py-4 min-w-[15rem] text-left">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <MapPin size={11} />
                              Przystanek ({sortedStops.length})
                            </div>
                          </th>
                          {/* Trip column headers */}
                          {filteredTrips.map((trip, i) => (
                            <th
                              key={trip.id}
                              className="min-w-[5rem] w-20 px-2 py-3 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 tabular-nums">
                                  #{i + 1}
                                </span>
                                {isAdmin && trip.id && (
                                  <button
                                    onClick={() => handleDeleteTrip(trip.id!)}
                                    title="Usuń kurs"
                                    className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900">
                        {sortedStops.map((rs, rowIdx) => {
                          const isFirst = rowIdx === 0;
                          const isLast  = rowIdx === sortedStops.length - 1;
                          const accentRow = isFirst || isLast;
                          return (
                            <tr
                              key={rs.id}
                              className={`border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${accentRow ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                            >
                              {/* Stop name */}
                              <td className={`sticky left-0 z-10 border-r-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 ${accentRow ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-900'}`}>
                                <div className="flex items-center gap-3">
                                  {isFirst ? (
                                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                      <span className="w-2 h-2 bg-white rounded-full" />
                                    </span>
                                  ) : isLast ? (
                                    <span className="w-5 h-5 bg-rose-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                      <span className="w-2 h-2 bg-white rounded-full" />
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-[8px] font-black text-slate-400 flex-shrink-0">
                                      {rs.sequenceNumber}
                                    </span>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap leading-snug">
                                      {rs.busStop.name}
                                    </p>
                                    {rs.busStop.city && (
                                      <p className="text-[10px] text-slate-400 whitespace-nowrap">{rs.busStop.city}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* Time input cells */}
                              {filteredTrips.map(trip => {
                                const dep = trip.departures?.find(d => d.busStop.id === rs.busStop.id);
                                return (
                                  <td
                                    key={trip.id}
                                    className="px-1.5 py-1.5 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0"
                                  >
                                    {dep ? (
                                      <input
                                        type="time"
                                        defaultValue={dep.departureTime.substring(0, 5)}
                                        onBlur={e => handleDepartureBlur(dep, e.target.value)}
                                        className={`w-[4.2rem] text-center font-mono font-bold text-[13px] rounded-lg border transition-all focus:outline-none px-1 py-1 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden ${
                                          savingIds.has(dep.id!)
                                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400 text-amber-700'
                                            : savedIds.has(dep.id!)
                                            ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-500 text-emerald-700'
                                            : 'bg-transparent border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:border-blue-400 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                      />
                                    ) : (
                                      <input
                                        type="time"
                                        defaultValue=""
                                        onBlur={e => {
                                          if (e.target.value && trip.id) {
                                            handleCreateDeparture(trip.id, rs.busStop.id, e.target.value);
                                          }
                                        }}
                                        placeholder="--:--"
                                        className="w-[4.2rem] text-center font-mono font-bold text-[13px] rounded-lg border transition-all focus:outline-none px-1 py-1 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 placeholder:text-slate-300 dark:placeholder:text-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:border-blue-400 focus:ring-1 focus:ring-blue-500 focus:text-slate-700 dark:focus:text-slate-200"
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                  <Clock size={36} className="mb-4 opacity-25" />
                  <p className="font-black text-lg text-slate-500 dark:text-slate-400">Brak kursów</p>
                  <p className="text-sm mt-1">Dodaj pierwszy kurs dla wybranego rozkładu</p>
                </div>
              )}

              {/* Add trip form */}
              {isAdmin && (
                <div className="flex items-end gap-5 px-6 py-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Typ dnia</label>
                    <select
                      value={newTripCalendar}
                      onChange={e => setNewTripCalendar(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500 min-w-[11rem]"
                    >
                      {CALENDAR_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Godzina startu (1. przystanek)</label>
                    <input
                      type="time"
                      value={newTripTime}
                      onChange={e => setNewTripTime(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={handleAddTrip}
                    disabled={addingTrip}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 active:bg-purple-800 transition-all shadow-md shadow-purple-500/20 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    {addingTrip ? 'Dodawanie...' : 'Dodaj Kurs'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: Route list (line selected)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedLine) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={backToLines}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={14} /> Wszystkie linie
          </button>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        {/* Line header */}
        <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-blue-600 text-white font-black text-2xl rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/25 flex-shrink-0">
            {selectedLine.lineNumber}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedLine.operator}</span>
            </div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">Linia {selectedLine.lineNumber}</h2>
            <p className="text-slate-400 text-sm font-bold mt-1">
              {selectedLine.routes?.length || 0} {selectedLine.routes?.length === 1 ? 'trasa' : 'trasy / tras'}
            </p>
          </div>
        </div>

        {/* Route cards */}
        <div className="space-y-3">
          {selectedLine.routes && Array.from(selectedLine.routes).map((route, i) => {
            const stops = [...(route.routeStops || [])].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
            const firstStop = stops[0]?.busStop.name;
            const lastStop  = stops[stops.length - 1]?.busStop.name;
            return (
              <div
                key={route.id}
                className="group flex items-center gap-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all px-6 py-5 cursor-pointer"
                onClick={() => handleSelectRoute(route)}
              >
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 rounded-xl flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-purple-600 flex-shrink-0 transition-all">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 dark:text-white text-base leading-tight">
                    {route.direction || route.variantName || '—'}
                  </p>
                  {firstStop && lastStop && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
                      <span className="text-xs text-slate-400 truncate max-w-[200px]">{firstStop}</span>
                      <ChevronRight size={11} className="text-slate-300 flex-shrink-0" />
                      <span className="w-2 h-2 bg-rose-400 rounded-full flex-shrink-0" />
                      <span className="text-xs text-slate-400 truncate max-w-[200px]">{lastStop}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="text-xs font-black text-slate-500">{route.routeStops?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 group-hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-purple-500/15">
                    <Clock size={13} />
                    Kursy
                    <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: Main panel (tabs)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto px-8 py-10 text-left">

      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all"
          >
            <ChevronLeft size={18} className="text-slate-500" />
          </button>
          <div className="ml-2">
            <h1 className="text-xl font-black dark:text-white uppercase tracking-tight">Panel Administracyjny</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {isAdmin ? 'Administrator' : 'Użytkownik'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-0.5">
            {(['LINES', 'STOPS', 'MAP'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'LINES' ? 'Linie' : tab === 'STOPS' ? 'Przystanki' : 'Mapa'}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('USERS')}
                className={`px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === 'USERS'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Użytkownicy
              </button>
            )}
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'PROFILE'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              Hasło
            </button>
          </div>

          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user_roles'); navigate('/login'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-800/30 hover:bg-red-100 font-bold text-xs transition-all"
          >
            <LogOut size={15} /> Wyloguj
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-5 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold text-sm border border-red-100 dark:border-red-800/30">
          {error}
        </div>
      )}

      {/* ── Tab: LINES ── */}
      {activeTab === 'LINES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-24">
              <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lines.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold">Brak linii</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Linia</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Trasy</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-48">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map(line => (
                  <tr
                    key={line.id}
                    className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedLine(line)}
                  >
                    <td className="px-8 py-4">
                      <div className="w-12 h-12 bg-blue-600 text-white font-black text-base rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20 leading-none">
                        {line.lineNumber}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <p className="font-black text-slate-700 dark:text-slate-200">{line.operator}</p>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <MapPin size={11} />
                        {line.routes?.length || 0} {(line.routes?.length === 1) ? 'trasa' : 'tras'}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedLine(line); }}
                          className="flex items-center gap-1.5 px-4 py-2 text-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl font-black text-xs uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Clock size={12} /> Zarządzaj
                        </button>
                        {isAdmin && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteLine(line.id); }}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: STOPS ── */}
      {activeTab === 'STOPS' && <StopManager isAdmin={isAdmin} />}

      {/* ── Tab: MAP ── */}
      {activeTab === 'MAP' && <StopMap />}

      {/* ── Tab: USERS ── */}
      {activeTab === 'USERS' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black mb-6 dark:text-white uppercase tracking-tight">Dodaj Użytkownika</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-4">
              <input placeholder="Login" value={newUserName} onChange={e => setNewUserName(e.target.value)}
                className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="password" placeholder="Hasło" value={newUserPass} onChange={e => setNewUserPass(e.target.value)}
                className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)}
                className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ROLE_USER">Użytkownik</option>
                <option value="ROLE_ADMIN">Administrator</option>
              </select>
              <button type="submit" className="col-span-2 bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                Stwórz konto
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Użytkownik</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm dark:text-white">{u.username}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{u.roles.join(', ')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          const p = prompt('Nowe hasło:');
                          if (p) { await apiClient.put(`${ADMIN_API}/users/${u.id}/password`, { password: p }); alert('Zmieniono'); }
                        }}
                        className="px-3 py-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-lg font-black text-xs uppercase mr-2 transition-all"
                      >
                        Hasło
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Usunąć?')) { await apiClient.delete(`${ADMIN_API}/users/${u.id}`); fetchInitialData(); }
                        }}
                        className="px-3 py-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg font-black text-xs uppercase transition-all"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: PROFILE ── */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-sm bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-black mb-6 dark:text-white uppercase tracking-tight">Zmień Hasło</h3>
          <form onSubmit={handleChangeOwnPassword} className="space-y-4">
            <input
              type="password"
              placeholder="Nowe hasło"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              Aktualizuj
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
