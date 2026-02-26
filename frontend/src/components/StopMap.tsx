import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Map as MapIcon, Loader2, AlertCircle } from 'lucide-react';

// Fix for default marker icons in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { API_BASE_URL } from '../config';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface BusStop {
  id: number;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

const API_URL = `${API_BASE_URL}/busstops`;

const StopMap: React.FC<{ token: string }> = ({ token }) => {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStops = async () => {
      try {
        const response = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter only stops with coords
        setStops(response.data.filter((s: BusStop) => s.latitude && s.longitude));
      } catch (err) {
        setError('Błąd ładowania mapy.');
      } finally {
        setLoading(false);
      }
    };
    fetchStops();
  }, [token]);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><MapIcon size={24} /></div>
          <div>
            <h2 className="text-xl font-black dark:text-white uppercase tracking-tight">Mapa Przystanków</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Wizualizacja geograficzna Gminy Kłodawa</p>
          </div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-[10px] font-black uppercase text-slate-500">
          Aktywne punkty: {stops.length}
        </div>
      </div>

      <div className="h-[600px] w-full rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl z-0">
        <MapContainer
          center={[52.788, 15.215]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stops.map(stop => (
            <Marker key={stop.id} position={[stop.latitude!, stop.longitude!]}>
              <Popup>
                <div className="p-2">
                  <p className="font-black text-blue-600 mb-0 leading-none">{stop.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{stop.city}</p>
                  <hr className="my-2" />
                  <p className="text-[9px] font-mono text-slate-500 mb-0">{stop.latitude}, {stop.longitude}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
        <AlertCircle className="text-blue-500 shrink-0" size={20} />
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
          Mapa wyświetla tylko te przystanki, które mają uzupełnione współrzędne w zakładce <b>PRZYSTANKI</b>.
          Kliknij na marker, aby zobaczyć szczegóły lokalizacji.
        </p>
      </div>
    </div>
  );
};

export default StopMap;
