import React from 'react';
import type { ConnectionDTO } from '../types';
import { Bus, ChevronRight } from 'lucide-react';

interface ResultsListProps {
    connections: ConnectionDTO[];
}

const ResultsList: React.FC<ResultsListProps> = ({ connections }) => {
    const formatTime = (time: string) => time.slice(0, 5);

    return (
        <div className="w-full max-w-5xl mx-auto px-4 space-y-6">
            <div className="flex items-end justify-between px-2 mb-4 animate-in fade-in duration-700">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Wyniki wyszukiwania</h3>
                <span className="text-xs font-bold text-slate-400 mb-1">ZNALEZIONO {connections.length} TRASY</span>
            </div>

            {connections.map((conn, index) => (
                <div
                    key={index}
                    style={{ 
                        animationDelay: `${index * 75}ms`,
                        animationFillMode: 'both' 
                    }}
                    className="group bg-white rounded-[2.5rem] p-2 pr-6 shadow-sm hover:shadow-2xl hover:shadow-slate-200 border border-slate-100 transition-all duration-500 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500"
                >
                    <div className="flex flex-col md:flex-row items-center gap-8">

                        {/* Bus Badge */}
                        <div className="bg-[#020617] w-full md:w-28 py-4 md:py-8 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-lg group-hover:bg-blue-600 transition-colors duration-500">
                            <Bus size={24} md:size={32} strokeWidth={2.5} className="text-blue-400 group-hover:text-white mb-2" />
                            <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-none">{conn.lineName.replace(/\D/g, '') || conn.lineName}</span>
                            <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-200 uppercase tracking-[0.3em] mt-2">Linia</span>
                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase mt-1 px-2 text-center">{conn.direction}</span>
                        </div>

                        {/* Timing Section */}
                        <div className="flex-1 flex items-center justify-around w-full px-1 md:px-0">
                            <div className="text-center">
                                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tighter mb-0 md:mb-1">{formatTime(conn.departureTime)}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Odjazd</div>
                            </div>

                            <div className="flex flex-col items-center gap-2 md:gap-4 flex-1 max-w-[100px] sm:max-w-[150px] md:max-w-[180px] px-2 md:px-4">
                                <div className="text-[11px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 whitespace-nowrap">
                                    {conn.durationMinutes} MINUT PODRÓŻY
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                                    <div className="absolute left-0 top-0 h-full w-full bg-blue-500 rounded-full"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tighter mb-0 md:mb-1">{formatTime(conn.arrivalTime)}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Przyjazd</div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="hidden md:flex">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:rotate-90 transition-all duration-500">
                                <ChevronRight size={32} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ResultsList;
