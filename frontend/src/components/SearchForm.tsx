import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Search, Navigation, Loader2, Info, X, Home, RotateCcw, ArrowRightLeft, Check } from 'lucide-react';
import axios from 'axios';

interface BusStop {
    id: number;
    name: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    directions?: string[];
    direction?: string;
    distance?: number;
}

interface SearchFormProps {
    onSearch: (fromId: number, toId: number | null, time: string) => void;
    availableStops: BusStop[];
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, availableStops }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [fromId, setFromId] = useState<number | null>(null);
    const [toId, setToId] = useState<number | null>(null);
    const [time, setTime] = useState(() => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    });

    const [isLocating, setIsLocating] = useState(false);
    const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
    const [showAddressPrompt, setShowAddressPrompt] = useState(false);
    const [manualAddress, setManualAddress] = useState('');
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [nearbyAlternatives, setNearbyAlternatives] = useState<BusStop[]>([]);
    const [altIndex, setAltIndex] = useState(0);

    // Dropdown states
    const [showFromSuggestions, setShowFromSuggestions] = useState(false);
    const [showToSuggestions, setShowToSuggestions] = useState(false);

    const fromRef = useRef<HTMLDivElement>(null);
    const toRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fromRef.current && !fromRef.current.contains(event.target as Node)) setShowFromSuggestions(false);
            if (toRef.current && !toRef.current.contains(event.target as Node)) setShowToSuggestions(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {    
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const formatAddress = (data: any) => {
        if (!data || !data.address) return data.display_name || "Nieznana lokalizacja";        
        const a = data.address;
        const road = a.road || a.pedestrian || a.suburb || "";
        const house = a.house_number ? ` ${a.house_number}` : "";
        const city = a.city || a.town || a.village || "";
        return `${city}, ${road}${house}`.trim().replace(/^,|,$/g, "");
    };

    const findAndSetNearestStop = (lat: number, lng: number) => {
        if (!availableStops || availableStops.length === 0) return false;
        const nearby = availableStops
            .filter(stop => stop.latitude && stop.longitude)
            .map(stop => ({
                stop,
                dist: calculateDistance(lat, lng, stop.latitude!, stop.longitude!)
            }))
            .filter(item => item.dist < 0.5)
            .sort((a, b) => a.dist - b.dist)
            .map(item => item.stop);

        if (nearby.length > 0) {
            setNearbyAlternatives(nearby);
            setAltIndex(0);
            setFrom(nearby[0].name);
            setFromId(nearby[0].id);
            return true;
        } else {
            let minDistance = Infinity;
            let nearest = availableStops[0];
            availableStops.forEach(stop => {
                if(stop.latitude && stop.longitude) {
                    const d = calculateDistance(lat, lng, stop.latitude, stop.longitude);      
                    if(d < minDistance) { minDistance = d; nearest = stop; }
                }
            });
            if (minDistance < 15) {
                setFrom(nearest.name);
                setFromId(nearest.id);
                setNearbyAlternatives([nearest]);
                return true;
            }
        }
        return false;
    };

    const handleNextAlternative = () => {
        if (nearbyAlternatives.length > 1) {
            const nextIdx = (altIndex + 1) % nearbyAlternatives.length;
            setAltIndex(nextIdx);
            setFrom(nearbyAlternatives[nextIdx].name);
            setFromId(nearbyAlternatives[nextIdx].id);
        }
    };

    const handleAddressGeocode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualAddress) return;
        setIsGeocoding(true);
        try {
            let query = encodeURIComponent(`${manualAddress}, Kłodawa, Lubuskie`);
            let res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`);
            if (!res.data || res.data.length === 0) {
                query = encodeURIComponent(manualAddress);
                res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`);
            }
            if (res.data && res.data.length > 0) {
                const item = res.data[0];
                const found = findAndSetNearestStop(parseFloat(item.lat), parseFloat(item.lon));
                if (found) {
                    setDetectedAddress(formatAddress(item));
                    setShowAddressPrompt(false);
                    setManualAddress('');
                } else {
                    alert('Adres znaleziony, ale brak przystanków w pobliżu.');
                }
            } else {
                alert('Nie znaleźliśmy adresu.');
            }
        } catch (err) {
            alert('Błąd serwera map.');
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleAutoLocation = () => {
        setIsLocating(true);
        setShowAddressPrompt(false);
        setDetectedAddress(null);
        if (!navigator.geolocation) {
            setShowAddressPrompt(true);
            setIsLocating(false);
            return;
        }
        const timeout = setTimeout(() => {
            if (isLocating) { setShowAddressPrompt(true); setIsLocating(false); }
        }, 4000);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                clearTimeout(timeout);
                const { latitude, longitude } = pos.coords;
                try {
                    const rev = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
                    if (rev.data) setDetectedAddress(formatAddress(rev.data));

                    const apiBase = import.meta.env.VITE_API_URL || '';
                    const res = await axios.get(`${apiBase}/api/v1/busstops/nearby?lat=${latitude}&lon=${longitude}`);

                    if (res.data && res.data.length > 0) {
                        setNearbyAlternatives(res.data);
                        setAltIndex(0);
                        setFrom(res.data[0].name);
                        setFromId(res.data[0].id);
                        setShowFromSuggestions(true);
                    } else {
                        const foundLocally = findAndSetNearestStop(latitude, longitude);       
                        if (!foundLocally) setShowAddressPrompt(true);
                    }
                } catch(e) {
                    const foundLocally = findAndSetNearestStop(latitude, longitude);
                    if (!foundLocally) setShowAddressPrompt(true);
                }
                setIsLocating(false);
            },
            () => { clearTimeout(timeout); setShowAddressPrompt(true); setIsLocating(false); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const filteredFromStops = availableStops
        .filter(s => s.name.toLowerCase().includes(from.toLowerCase()))
        .slice(0, 6);

    const filteredToStops = availableStops
        .filter(s => s.name.toLowerCase().includes(to.toLowerCase()))
        .slice(0, 6);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromId) {
            alert("Proszę wybrać przynajmniej przystanek początkowy z listy podpowiedzi.");
            return;
        }
        onSearch(fromId, toId, time);
    };

    const getSelectedDirection = (id: number | null) => {
        if (!id) return null;
        const stop = availableStops.find(s => s.id === id);
        return stop?.direction || stop?.directions?.[0];
    };

    const stopsToDisplay = nearbyAlternatives.length > 0 ? nearbyAlternatives : filteredFromStops;

    return (
        <div className="w-full px-4 text-left">
            <div className="max-w-4xl mx-auto mb-4 min-h-[40px] flex flex-col items-center">   
                {isLocating ? (
                    <div className="flex items-center gap-2 text-blue-500 animate-pulse bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Szukam Cię...</span>
                    </div>
                ) : detectedAddress ? (
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-6 py-2.5 rounded-full animate-in fade-in shadow-sm">
                        <MapPin size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">Twoja lokalizacja: <b>{detectedAddress}</b></span>
                        <button type="button" onClick={() => {setDetectedAddress(null); setShowAddressPrompt(true);}} className="ml-2 p-1.5 hover:bg-emerald-500/20 rounded-full transition-colors text-emerald-600 shrink-0"><RotateCcw size={14} /></button>
                    </div>
                ) : showAddressPrompt ? (
                    <div className="w-full max-w-md bg-blue-600 text-white p-5 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 border-4 border-blue-500 text-left">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-left"><Home size={14}/> Gdzie teraz jesteś?</div>
                            <button type="button" onClick={() => setShowAddressPrompt(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={18}/></button>        
                        </div>
                        <form onSubmit={handleAddressGeocode} className="flex gap-2 text-left">
                            <input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="Wpisz np. Kłodawa, Owocowa" className="flex-1 bg-white/20 border border-white/30 rounded-2xl px-5 py-3 text-sm outline-none font-bold placeholder:text-white/50" autoFocus />
                            <button type="submit" disabled={isGeocoding} className="bg-white text-blue-600 px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-blue-50 shadow-lg transition-all">
                                {isGeocoding ? <Loader2 size={16} className="animate-spin"/> : 'Ustaw'}
                            </button>
                        </form>
                    </div>
                ) : null}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-2 sm:p-3 border border-slate-100 dark:border-slate-800 transition-all duration-500">
                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row items-stretch gap-2 text-left">

                    {/* FROM */}
                    <div className="flex-[1.2] relative group text-left" ref={fromRef}>        
                        <button type="button" onClick={handleAutoLocation} className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 z-20 hover:scale-110 transition-transform active:scale-95 shadow-xl bg-white dark:bg-slate-900 rounded-full p-1 border border-blue-100 dark:border-blue-900">
                            <MapPin size={24} strokeWidth={2.5} />
                        </button>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] pl-16 pr-24 py-5 group-focus-within:ring-2 ring-blue-500/20 transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Skąd</label>
                                {fromId && <span className="text-[9px] font-black text-blue-500 uppercase animate-in fade-in slide-in-from-right-2">→ {getSelectedDirection(fromId)}</span>}
                            </div>
                            <input
                                type="text"
                                value={from}
                                onFocus={() => setShowFromSuggestions(true)}
                                onChange={(e) => { 
                                    setFrom(e.target.value); 
                                    setFromId(null);
                                    setShowFromSuggestions(true); 
                                    if (nearbyAlternatives.length > 0) setNearbyAlternatives([]);
                                }}
                                className="block w-full bg-transparent border-none p-0 text-slate-900 dark:text-white font-black focus:ring-0 text-lg sm:text-xl placeholder-slate-300"
                                placeholder="Przystanek"
                                required
                            />
                        </div>

                        {showFromSuggestions && from.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                {stopsToDisplay.length > 0 ? stopsToDisplay.map(stop => (     
                                    <button key={stop.id} type="button" onClick={() => { setFrom(stop.name); setFromId(stop.id); setShowFromSuggestions(false); }} className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left border-b border-slate-50 last:border-0 dark:border-slate-700">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-900 dark:text-white text-sm uppercase">{stop.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{stop.city}</p>
                                                {stop.distance !== undefined && (
                                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                                        {(stop.distance * 111000).toFixed(0)}m STĄD
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">    
                                                {stop.directions && stop.directions.map(dir => (
                                                    <span key={dir} className="text-[8px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50 uppercase flex items-center gap-1 shadow-sm">   
                                                        <span className="text-[10px]">→</span> {dir}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {fromId === stop.id && <Check size={16} className="text-blue-500" />}
                                    </button>
                                )) : <div className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nie znaleziono</div>}
                            </div>
                        )}

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1"> 
                            {nearbyAlternatives.length > 1 && (
                                <button type="button" onClick={handleNextAlternative} className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl transition-all" title="Zmień stronę ulicy">
                                    <ArrowRightLeft size={20} />
                                </button>
                            )}
                            <button type="button" onClick={handleAutoLocation} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors">        
                                <Navigation size={20} className={isLocating ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* TO */}
                    <div className="flex-[1.2] relative group text-left" ref={toRef}>
                        <button type="button" onClick={() => setShowToSuggestions(true)} className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-500 z-20 hover:scale-110 transition-transform active:scale-95 shadow-xl bg-white dark:bg-slate-900 rounded-full p-1 border border-rose-100 dark:border-rose-900">
                            <MapPin size={24} strokeWidth={2.5} />
                        </button>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] pl-16 pr-6 py-5 group-focus-within:ring-2 ring-rose-500/20 transition-all">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Dokąd</label>
                                {toId && <span className="text-[9px] font-black text-rose-500 uppercase animate-in fade-in slide-in-from-right-2">→ {getSelectedDirection(toId)}</span>}
                            </div>
                            <input
                                type="text"
                                value={to}
                                onFocus={() => setShowToSuggestions(true)}
                                onChange={(e) => {setTo(e.target.value); setToId(null); setShowToSuggestions(true);}}
                                className="block w-full bg-transparent border-none p-0 text-slate-900 dark:text-white font-black focus:ring-0 text-lg sm:text-xl placeholder-slate-300"
                                placeholder="Cel podróży (opcjonalnie)"
                            />
                            {to && (
                                <button
                                    type="button"
                                    onClick={() => { setTo(''); setToId(null); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {showToSuggestions && to.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                {filteredToStops.length > 0 ? filteredToStops.map(stop => (    
                                    <button key={stop.id} type="button" onClick={() => { setTo(stop.name); setToId(stop.id); setShowToSuggestions(false); }} className="w-full px-6 py-4 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors text-left border-b border-slate-50 last:border-0 dark:border-slate-700">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-900 dark:text-white text-sm uppercase">{stop.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{stop.city}</p>
                                                {stop.distance !== undefined && (
                                                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50">
                                                        {(stop.distance * 111000).toFixed(0)}m STĄD
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">      
                                                {stop.directions && stop.directions.map(dir => (
                                                    <span key={dir} className="text-[8px] font-black bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/50 uppercase flex items-center gap-1 shadow-sm">   
                                                        <span className="text-[10px]">→</span> {dir}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {toId === stop.id && <Check size={16} className="text-rose-500" />}
                                    </button>
                                )) : <div className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nie znaleziono</div>}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 lg:max-w-[180px] relative group text-left">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 z-10"><Clock size={24} strokeWidth={2.5} /></div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-[1.8rem] pl-16 pr-6 py-5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Godzina</label>
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="block w-full bg-transparent border-none p-0 text-slate-900 dark:text-white font-black focus:ring-0 text-lg sm:text-xl cursor-pointer" required />
                        </div>
                    </div>

                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-[1.8rem] px-10 py-5 font-black text-xl shadow-xl active:scale-95 uppercase transition-all">
                        <Search size={28} strokeWidth={3} />
                        <span className="lg:hidden">Szukaj</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SearchForm;
