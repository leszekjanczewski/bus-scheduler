import { Autocomplete, TextField } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { fetchBusStops } from '../api/busStopsCache';
import { Trash2, ChevronLeft, Database, Edit3, Plus, Save, X, Clock, MapPin, List, Settings, LogOut, Building2, Map as MapIcon, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import StopManager from './StopManager';
import StopMap from './StopMap';
import { API_BASE_URL } from '../config';

interface BusStop { id: number; name: string; city: string; direction?: string; }
interface RouteStop { id: number; busStop: BusStop; sequenceNumber: number; timeOffsetMinutes: number; }
interface Departure { id: number | null; departureTime: string; busStop: BusStop; }
interface Trip { id: number | null; calendarType: string; departures: Departure[]; }
interface Route { id: number; variantName: string; direction: string; trips: Trip[]; routeStops: RouteStop[]; }
interface BusLine { id: number; lineNumber: string; operator: string; routes: Route[]; }
interface User { id: string; username: string; email: string; roles: string[]; }

const ADMIN_API = `${API_BASE_URL}/admin`;
const AUTH_API = `${API_BASE_URL}/auth`;

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [lines, setLines] = useState<BusLine[]>([]);
  const [allStops, setAllStops] = useState<BusStop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>(JSON.parse(localStorage.getItem('user_roles') || '[]'));
  const [error, setError] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<BusLine | null>(null);
  const [activeTab, setActiveTab] = useState<'LINES' | 'STOPS' | 'MAP' | 'USERS' | 'PROFILE'>('LINES');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ROLE_USER' | 'ROLE_ADMIN'>('ROLE_USER');
  const [newPassword, setNewPassword] = useState('');
  const [newTripCalendar, setNewTripCalendar] = useState<{ [rIdx: number]: string }>({});
  const [newTripTime, setNewTripTime] = useState<{ [rIdx: number]: string }>({});
  const [editLoading, setEditLoading] = useState(false);

  const isAdmin = userRoles.includes('ROLE_ADMIN');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_roles');
    navigate('/login');
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [linesRes, stops] = await Promise.all([
        apiClient.get(`${ADMIN_API}/lines`),
        fetchBusStops()
      ]);
      setLines(linesRes.data);
      setAllStops(stops);
      if (isAdmin) {
        const usersRes = await apiClient.get(`${ADMIN_API}/users`);
        setUsers(usersRes.data);
      }
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) setError('Brak uprawnień.');
      else if (err.response?.status !== 401) setError('Błąd pobierania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`${ADMIN_API}/users`, { username: newUserName, email: newUserEmail, password: newUserPass, roles: [newUserRole] });
      setNewUserName(''); setNewUserEmail(''); setNewUserPass('');
      fetchInitialData();
      alert('Użytkownik dodany!');
    } catch (err) { alert('Błąd dodawania.'); }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`${AUTH_API}/change-password`, { password: newPassword });
      setNewPassword('');
      alert('Hasło zmienione!');
    } catch (err) { alert('Błąd zmiany hasła.'); }
  };

  const handleSave = async () => {
    if (!editingLine) return;
    setLoading(true);
    try {
      await apiClient.put(`${ADMIN_API}/lines/${editingLine.id}`, editingLine);
      setLines(lines.map(l => l.id === editingLine.id ? editingLine : l));
      setEditingLine(null);
      alert('Zapisano pomyślnie!');
    } catch (err: any) {
      if (err.response?.status === 403) setError('Brak uprawnień.');
      else if (err.response?.status !== 401) setError('Błąd zapisu danych.');
    } finally { setLoading(false); }
  };

  const handleDeleteLine = async (id: number) => {
    if (!isAdmin || !window.confirm('Usunąć linię?')) return;
    try {
      await apiClient.delete(`${ADMIN_API}/lines/${id}`);
      setLines(lines.filter(l => l.id !== id));
    } catch (err: any) { setError('Błąd usuwania.'); }
  };

  const getGroupedDepartures = (trips: Trip[], stopName: string) => {
    const groups: { [key: string]: string[] } = {};
    if (!trips) return groups;
    trips.forEach(trip => {
      const times = trip.departures
        ? trip.departures
            .filter(d => d.busStop?.name === stopName)
            .map(d => d.departureTime.substring(0, 5))
            .sort()
        : [];
      if (times.length > 0) {
        if (!groups[trip.calendarType]) groups[trip.calendarType] = [];
        groups[trip.calendarType] = Array.from(new Set([...groups[trip.calendarType], ...times])).sort();
      }
    });
    return groups;
  };

  const calculateDepartureTime = (startTime: string, offsetMinutes: number): string => {
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + offsetMinutes;
    const rh = Math.floor(total / 60) % 24;
    const rm = total % 60;
    return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}:00`;
  };

  const getTripStartTime = (trip: Trip): string => {
    if (!trip.departures || trip.departures.length === 0) return '--:--';
    const sorted = [...trip.departures].sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    return sorted[0].departureTime.substring(0, 5);
  };

  const handleAddTrip = (rIdx: number, route: Route) => {
    const startTime = newTripTime[rIdx];
    const calType = newTripCalendar[rIdx] || 'Dni robocze';
    if (!startTime) { alert('Podaj godzinę startu kursu'); return; }
    const sortedStops = [...Array.from(route.routeStops)].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const newTrip: Trip = {
      id: null,
      calendarType: calType,
      departures: sortedStops.map(rs => ({
        id: null,
        departureTime: calculateDepartureTime(startTime, rs.timeOffsetMinutes),
        busStop: { id: rs.busStop.id, name: rs.busStop.name, city: rs.busStop.city }
      }))
    };
    const newRoutes = [...Array.from(editingLine!.routes)];
    newRoutes[rIdx] = { ...route, trips: [...Array.from(route.trips || []), newTrip] };
    setEditingLine({ ...editingLine!, routes: newRoutes });
  };

  const handleDeleteTrip = (rIdx: number, route: Route, tripIdx: number) => {
    const newRoutes = [...Array.from(editingLine!.routes)];
    const trips = [...Array.from(route.trips || [])];
    trips.splice(tripIdx, 1);
    newRoutes[rIdx] = { ...route, trips };
    setEditingLine({ ...editingLine!, routes: newRoutes });
  };

  if (editLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <span className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">Pobieranie danych...</p>
        </div>
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
              <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Numer Linii</label>
              <input value={editingLine.lineNumber} onChange={e => setEditingLine({ ...editingLine, lineNumber: e.target.value })} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-3xl font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 space-y-2 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Operator / Przewoźnik</label>
              <div className="relative text-left">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input value={editingLine.operator} onChange={e => setEditingLine({ ...editingLine, operator: e.target.value })} className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-16 text-left">
          {editingLine.routes && Array.from(editingLine.routes).map((route, rIdx) => (
            <div key={route.id || rIdx} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm text-left">
              <div className="p-10 border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row gap-8 bg-slate-50/50 dark:bg-slate-800/20 text-left">
                <div className="flex-1 space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-left">Wariant</label>
                  <input value={route.variantName || ""} onChange={e => {
                    const rs = [...Array.from(editingLine.routes)]; rs[rIdx] = { ...route, variantName: e.target.value }; setEditingLine({ ...editingLine, routes: rs });
                  }} className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold" />
                </div>
                <div className="flex-1 space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-left">Kierunek</label>
                  <input value={route.direction || ""} onChange={e => {
                    const rs = [...Array.from(editingLine.routes)]; rs[rIdx] = { ...route, direction: e.target.value }; setEditingLine({ ...editingLine, routes: rs });
                  }} className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold" />
                </div>
              </div>

              <div className="p-10 text-left">
                <div className="flex items-center gap-3 mb-10 text-left">
                  <MapPin size={20} className="text-blue-500" />
                  <h4 className="text-lg font-black dark:text-white uppercase tracking-tight">Przystanki i Offsety</h4>
                </div>

                <div className="space-y-0 relative text-left">
                  <div className="absolute left-4 top-4 bottom-4 w-1 bg-slate-100 dark:bg-slate-800 rounded-full text-left"></div>
                  {route.routeStops && Array.from(route.routeStops).sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((rs, rsIdx) => (
                    <div key={rs.id || rsIdx} className="relative pl-16 pb-12 last:pb-0 text-left">
                      <div className="absolute left-0 w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-4 border-blue-500 flex items-center justify-center font-black text-[10px] z-10 shadow-sm">{rs.sequenceNumber}</div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
                        <div className="flex-1 space-y-2 text-left">
                          <select
                            value={rs.busStop?.id}
                            onChange={e => {
                              const newStopId = parseInt(e.target.value);
                              const selectedStop = allStops.find(s => s.id === newStopId);
                              if (selectedStop) {
                                const newRoutes = [...Array.from(editingLine.routes)];
                                const newStops = [...Array.from(newRoutes[rIdx].routeStops)];
                                newStops[rsIdx] = { ...rs, busStop: selectedStop };
                                newRoutes[rIdx].routeStops = newStops;
                                setEditingLine({ ...editingLine, routes: newRoutes });
                              }
                            }}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {allStops.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-4 text-left">
                          <div className="flex flex-col items-end text-left">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Offset (min)</label>
                            <div className="flex items-center gap-2 text-left">
                              <span className="text-slate-300 text-sm font-bold">+</span>
                              <input
                                type="number"
                                value={rs.timeOffsetMinutes}
                                onChange={e => {
                                  const newRoutes = [...Array.from(editingLine.routes)];
                                  const newStops = [...Array.from(newRoutes[rIdx].routeStops)];
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
                          {Object.entries(getGroupedDepartures(Array.from(route.trips || []), rs.busStop?.name)).map(([cal, times]) => (
                            <div key={cal} className="mb-2 last:mb-0 text-left">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{cal}</p>
                              <div className="flex flex-wrap gap-1 text-left">
                                {times.map((t, i) => <span key={i} className="px-2 py-1 bg-white dark:bg-slate-900 rounded-md text-[9px] font-bold text-slate-600 border border-slate-100">{t}</span>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 dark:border-slate-700/50 text-left">
                <div className="flex items-center gap-3 mb-6 text-left">
                  <Clock size={20} className="text-purple-500" />
                  <h4 className="text-lg font-black dark:text-white uppercase tracking-tight">Zarządzanie Kursami</h4>
                </div>

                <div className="space-y-3 mb-6 text-left">
                  {Array.from(route.trips || []).map((trip, tripIdx) => (
                    <div key={trip.id ?? `new-${tripIdx}`} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 text-left">
                      <div className="flex items-center gap-4 text-left">
                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-black uppercase">{trip.calendarType}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm">{getTripStartTime(trip)}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{trip.departures?.length || 0} odjazdów</span>
                      </div>
                      <button onClick={() => handleDeleteTrip(rIdx, route, tripIdx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-end gap-4 p-6 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30 text-left">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Typ dnia</label>
                    <select
                      value={newTripCalendar[rIdx] || 'Dni robocze'}
                      onChange={e => setNewTripCalendar({ ...newTripCalendar, [rIdx]: e.target.value })}
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Dni robocze">Dni robocze</option>
                      <option value="Soboty">Soboty</option>
                      <option value="Niedziele i święta">Niedziele i święta</option>
                    </select>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Godzina startu</label>
                    <input
                      type="time"
                      value={newTripTime[rIdx] || ''}
                      onChange={e => setNewTripTime({ ...newTripTime, [rIdx]: e.target.value })}
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={() => handleAddTrip(rIdx, route)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Plus size={14} /> Dodaj Kurs
                  </button>
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
      <div className="flex items-center justify-between mb-16 text-left">
        <div className="flex items-center gap-2 text-left">
          <button onClick={() => navigate('/')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all text-left">
            <ChevronLeft size={20} className="text-slate-500" />
          </button>
          <div className="ml-4 text-left">
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tight">System Administracyjny</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Rola: {isAdmin ? 'Administrator' : 'Użytkownik'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-left">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex text-left">
            <button onClick={() => setActiveTab('LINES')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'LINES' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>LINIE</button>
            <button onClick={() => setActiveTab('STOPS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'STOPS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>PRZYSTANKI</button>
            <button onClick={() => setActiveTab('MAP')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'MAP' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>MAPA</button>
            {isAdmin && <button onClick={() => setActiveTab('USERS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'USERS' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>UŻYTKOWNICY</button>}
            <button onClick={() => setActiveTab('PROFILE')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'PROFILE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>HASŁO</button>
          </div>
          <button onClick={handleLogout} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl border border-red-100 hover:bg-red-100 transition-all text-left">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {activeTab === 'LINES' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm text-left">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Linia</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Operator</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
              {lines.map((line) => (
                <tr key={line.id} className="group hover:bg-slate-50/50 transition-colors text-left">
                  <td className="px-10 py-8 text-left"><div className="w-14 h-14 bg-blue-600 text-white font-black text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">{line.lineNumber}</div></td>
                  <td className="px-10 py-8 font-black text-slate-700 dark:text-slate-200 text-left">{line.operator}</td>
                  <td className="px-10 py-8 text-right text-left">
                    <div className="flex justify-end gap-3 text-left">
                      <button onClick={async () => {
                        setEditLoading(true);
                        try {
                          const res = await apiClient.get(`${ADMIN_API}/lines/${line.id}/full`);
                          setEditingLine(res.data);
                        } catch { setError('Błąd pobierania danych linii.'); }
                        finally { setEditLoading(false); }
                      }} className="p-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all text-left">
                        {editLoading ? <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" /> : <Edit3 size={20} />}
                      </button>
                      {isAdmin && <button onClick={() => handleDeleteLine(line.id)} className="p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all text-left"><Trash2 size={20} /></button>}
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
        <div className="max-w-4xl mx-auto space-y-8 text-left">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
            <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight text-left">Dodaj Użytkownika</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <input placeholder="Login" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <input type="password" placeholder="Hasło" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold">
                <option value="ROLE_USER">Użytkownik</option>
                <option value="ROLE_ADMIN">Administrator</option>
              </select>
              <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black uppercase hover:bg-blue-700 transition-all shadow-lg">Stwórz</button>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden text-left">
             <table className="w-full text-left">
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-left">
                 {users.map(u => (
                   <tr key={u.id} className="text-left">
                     <td className="px-8 py-4 font-bold dark:text-white text-left">{u.username} <span className="ml-2 text-[10px] text-slate-400 font-black uppercase">({u.roles.join(', ')})</span></td>
                     <td className="px-8 py-4 text-right text-left">
                        <button onClick={async () => {
                          const p = prompt('Nowe hasło:');
                          if(p) { await apiClient.put(`${ADMIN_API}/users/${u.id}/password`, { password: p }); alert('Zmieniono'); }
                        }} className="text-blue-600 font-bold text-xs uppercase mr-4 text-left">Hasło</button>
                        <button onClick={async () => {
                          if(confirm('Usunąć?')) { await apiClient.delete(`${ADMIN_API}/users/${u.id}`); fetchInitialData(); }
                        }} className="text-red-600 font-bold text-xs uppercase text-left">Usuń</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
          <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight text-left">Zmień Hasło</h3>
          <form onSubmit={handleChangeOwnPassword} className="space-y-4 text-left">
             <input type="password" placeholder="Nowe Hasło" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-bold" />
             <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Aktualizuj</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
