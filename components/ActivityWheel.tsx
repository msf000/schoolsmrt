
import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { Trophy, X, Sparkles, Zap, Play, RefreshCw, ChevronLeft } from 'lucide-react';

interface ActivityWheelProps {
    students: Student[];
    onClose: () => void;
}

const ActivityWheel: React.FC<ActivityWheelProps> = ({ students, onClose }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [winner, setWinner] = useState<Student | null>(null);
    const [participants] = useState<Student[]>([...students].slice(0, 12)); // Limit for visual clarity
    
    const spin = () => {
        if (isSpinning || participants.length === 0) return;
        setIsSpinning(true); setWinner(null);
        
        const extraSpins = 5 + Math.random() * 5;
        const newRotation = rotation + (extraSpins * 360) + Math.random() * 360;
        setRotation(newRotation);

        setTimeout(() => {
            setIsSpinning(false);
            const actualRotation = newRotation % 360;
            const segmentSize = 360 / participants.length;
            const winnerIndex = Math.floor(((360 - (actualRotation % 360)) % 360) / segmentSize);
            setWinner(participants[winnerIndex]);
        }, 4000);
    };

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    return (
        <div className="fixed inset-0 z-[210] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in font-tajawal overflow-hidden">
            <button onClick={onClose} className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors p-3 bg-white/5 rounded-full"><X size={32}/></button>
            
            <div className="absolute top-12 text-center space-y-2">
                <h2 className="text-4xl font-black text-white flex items-center justify-center gap-4">
                    <Sparkles className="text-yellow-400 animate-pulse" size={40}/>
                    عجلة الحظ الدراسية
                    <Sparkles className="text-yellow-400 animate-pulse" size={40}/>
                </h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">اختر طالباً للمشاركة اليوم</p>
            </div>

            <div className="relative w-full max-w-4xl flex flex-col lg:flex-row items-center justify-center gap-20 mt-12">
                <div className="relative">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-50 text-yellow-400">
                        <ChevronLeft size={64} className="rotate-[270deg] drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"/>
                    </div>

                    <div 
                        className="w-80 h-80 md:w-[500px] md:h-[500px] rounded-full border-[12px] border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.3)] relative overflow-hidden transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0,0.15,1)]"
                        style={{ transform: `rotate(${rotation}deg)` }}
                    >
                        <div className="absolute inset-0 rounded-full bg-slate-900 border-4 border-white/5 shadow-inner"></div>
                        {participants.map((s, i) => {
                            const angle = 360 / participants.length;
                            return (
                                <div key={s.id} className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1/2 origin-bottom flex items-start justify-center pt-8" style={{ transform: `rotate(${i * angle}deg)` }}>
                                    <div className="absolute top-0 w-64 h-[150%] origin-bottom transform -translate-x-1/2 opacity-20" style={{ backgroundColor: COLORS[i % COLORS.length], clipPath: `polygon(50% 100%, ${50 - Math.tan((angle/2) * Math.PI / 180) * 100}% 0%, ${50 + Math.tan((angle/2) * Math.PI / 180) * 100}% 0%)` }}></div>
                                    <span className="relative z-10 text-white font-black text-xs md:text-sm whitespace-nowrap rotate-[-90deg] origin-center translate-y-12">{s.name.split(' ')[0]}</span>
                                </div>
                            );
                        })}
                        <div className="absolute inset-0 m-auto w-16 h-16 md:w-24 md:h-24 bg-white rounded-full shadow-2xl z-40 border-[8px] border-slate-900 flex items-center justify-center text-indigo-600"><Zap size={32} fill="currentColor"/></div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-8 md:w-96 text-center">
                    {winner ? (
                        <div className="animate-zoom-in space-y-6">
                            <div className="bg-yellow-400 text-black px-8 py-4 rounded-[2rem] shadow-xl relative">
                                <Trophy className="absolute -top-6 -right-6 text-white bg-indigo-600 p-2 rounded-2xl shadow-lg" size={48}/>
                                <p className="text-[10px] font-black uppercase opacity-60">المشارك المحظوظ:</p>
                                <h3 className="text-3xl md:text-4xl font-black mt-2">{winner.name}</h3>
                            </div>
                            <button onClick={spin} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-2"><Play size={20}/> تدوير مرة أخرى</button>
                        </div>
                    ) : (
                        <button onClick={spin} disabled={isSpinning || participants.length === 0} className="group relative w-64 h-64 bg-indigo-600 rounded-full flex flex-col items-center justify-center gap-4 border-[12px] border-indigo-500 shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                            <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30"></div>
                            <RefreshCw size={64} className={`text-white transition-transform duration-500 ${isSpinning ? 'animate-spin' : 'group-hover:rotate-180'}`}/>
                            <span className="text-white font-black text-2xl uppercase">ابدأ السحب</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityWheel;
