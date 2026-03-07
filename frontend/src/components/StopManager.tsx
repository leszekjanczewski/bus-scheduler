import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { fetchBusStops, invalidateBusStopsCache } from '../api/busStopsCache';
import { Search, Save, MapPin, Trash2, X, Plus, AlertCircle, Loader2, Filter, ExternalLink, ClipboardPaste, Edit3 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface BusStop {
  id: number;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  directions?: string[];
  direction?: string;
}

const API_URL = `${API_BASE_URL}/busstops`;

const StopManager: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [editingStop, setEditingStop] = useState<BusStop | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [coordsInput, setCoordsInput] = useState('');
  const [error, setError] = useState<string | null>(null);


  const fetchStops = async () => {
    setLoading(true);
    try {
      const stops = await fetchBusStops();
      setStops(stops);
    } catch (err: any) {
      if (err.response?.status !== 401) setError('Błąd podczas pobierania przystanków.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const openEdit = (stop: BusStop) => {
    setEditingStop(stop);
    setIsAdding(false);
    setCoordsInput(stop.latitude && stop.longitude ? `${stop.latitude}, ${stop.longitude}` : '');
  };

  const openAdd = () => {
    if (!isAdmin) return;
    setEditingStop({ id: 0, name: '', city: '', latitude: null, longitude: null });
    setIsAdding(true);
    setCoordsInput('');
  };

  const handleCoordsChange = (val: string) => {
    setCoordsInput(val);
    if (val.includes(',')) {
      const parts = val.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && editingStop) {
          setEditingStop({ ...editingStop, latitude: lat, longitude: lng });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop) return;

    try {
      if (isAdding) {
        await apiClient.post(API_URL, editingStop);
      } else {
        await apiClient.put(`${API_URL}/${editingStop.id}`, editingStop);
      }
      invalidateBusStopsCache();
      await fetchStops();
      setEditingStop(null);
      setError(null);
    } catch (err: any) {
      if (err.response?.status !== 401) setError('Błąd podczas zapisu danych.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
    if (!window.confirm('Czy na pewno chcesz usunąć ten przystanek?')) return;
    try {
      await apiClient.delete(`${API_URL}/${id}`);
      invalidateBusStopsCache();
      setStops(stops.filter(s => s.id !== id));
    } catch (err: any) {
      if (err.response?.status !== 401) setError('Błąd podczas usuwania. Przystanek może być częścią trasy.');
    }
  };

  const cities = Array.from(new Set(stops.map(s => s.city))).sort();

  const filteredStops = stops.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase());
    const matchesCity = selectedCity === 'ALL' || s.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="space-y-8 pb-20 text-left">
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full text-left">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Szukaj po nazwie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold transition-all"
          />
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto text-left">
          <div className="relative w-full lg:w-64 text-left">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-12 pr-10 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 outline-none font-bold appearance-none cursor-pointer text-sm"
            >
              <option value="ALL">Wszystkie miejscowości</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
            >
              <Plus size={18} /> Dodaj
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center gap-3 font-bold text-sm border border-red-100 dark:border-red-900/30">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : filteredStops.length > 0 ? (
          filteredStops.map(stop => {
            const hasCoords = stop.latitude && stop.longitude;
            const googleMapsUrl = hasCoords
              ? `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + ' ' + stop.city)}`;

            return (
              <div key={stop.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all group relative text-left">
                <div className="flex justify-between items-start mb-4 text-left">
                  <div className={`p-3 rounded-xl ${hasCoords ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600' }`}>
                    <MapPin size={20} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title={hasCoords ? "Pokaż dokładną lokalizację" : "Szukaj w Google Maps"}
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button
                      onClick={() => openEdit(stop)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edytuj"
                    >
                      <Edit3 size={18} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(stop.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Usuń"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-black dark:text-white mb-1 truncate pr-10">{stop.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stop.city}</p>

                <div className="flex flex-wrap gap-1 mb-6 text-left">
                  {stop.directions && stop.directions.map(dir => (
                    <span key={dir} className="text-[8px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50 uppercase flex items-center gap-1">
                      → {dir}
                    </span>
                  ))}
                </div>

                <div className="flex gap-4 text-left">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">LAT</p>
                    <p className="text-[10px] font-mono font-bold dark:text-white">{stop.latitude || '---'}</p>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">LNG</p>
                    <p className="text-[10px] font-mono font-bold dark:text-white">{stop.longitude || '---'}</p>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nie znaleziono przystanków spełniających kryteria</p>
          </div>
        )}
      </div>

      {editingStop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-left">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 text-left">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{isAdding ? 'Nowy Przystanek' : 'Edycja Przystanku'}</h3>
              <button onClick={() => setEditingStop(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block">Nazwa Przystanku (np. Owocowa 01)</label>
                <input
                  value={editingStop.name}
                  onChange={e => setEditingStop({ ...editingStop, name: e.target.value })}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest ml-1 block">Kierunek Jazdy (np. Gorzów, Santocko)</label>
                <input
                  value={editingStop.direction || ''}
                  onChange={e => setEditingStop({ ...editingStop, direction: e.target.value })}
                  placeholder="Zostaw puste dla automatycznego"
                  className="w-full px-5 py-3 rounded-2xl bg-blue-50/20 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block">Miasto / Gmina</label>
                <input
                  value={editingStop.city}
                  onChange={e => setEditingStop({ ...editingStop, city: e.target.value })}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {editingStop.directions && editingStop.directions.length > 0 && (
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block">Aktywne Kierunki (tylko odczyt)</label>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-left">
                    {editingStop.directions.map(dir => (
                      <span key={dir} className="text-[9px] font-black bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full uppercase">
                        → {dir}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1 block">Szybkie Wklejanie (Lat, Lng)</label>
                <div className="relative text-left">
                  <ClipboardPaste className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input
                    placeholder="Wklej: 52.79, 15.32"
                    value={coordsInput}
                    onChange={e => handleCoordsChange(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800 font-mono text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 opacity-60 text-left">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Szerokość (Lat)</label>
                  <input
                    type="number" step="0.000001"
                    value={editingStop.latitude || ''}
                    readOnly
                    className="w-full px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-transparent font-mono font-bold text-xs cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Długość (Lng)</label>
                  <input
                    type="number" step="0.000001"
                    value={editingStop.longitude || ''}
                    readOnly
                    className="w-full px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-transparent font-mono font-bold text-xs cursor-not-allowed"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-4">
                <Save size={18} /> {isAdding ? 'Stwórz Przystanek' : 'Zapisz Przystanek'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StopManager;
