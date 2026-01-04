import React from 'react';
import { Trophy, Star, Target, Flag, Rocket, Check, TrendingUp } from 'lucide-react';

interface Props {
    xp: number;
    level: number;
}

const StudentJourney: React.FC<Props> = ({ xp, level }) => {
    const milestones = [
        { label: 'البداية', minXp: 0, icon: <Flag/> },
        { label: 'المثابر', minXp: 500, icon: <Star/> },
        { label: 'الخبير', minXp: 1500, icon: <Target/> },
        { label: 'البطل', minXp: 3000, icon: <Trophy/> },
        { label: 'الأسطورة', minXp: 5000, icon: <Rocket/> },
    ];

    return (
        <div className="bg-slate-900/50 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden font-tajawal">
            <div className="flex justify-between items-center mb-12">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                    <TrendingUp className="text-indigo-400" size={24}/> مسار القمة
                </h3>
                <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/20 px-4 py-1.5 rounded-full border border-indigo-500/30">المستوى الحالي: {level}</span>
            </div>

            <div className="relative flex justify-between items-center px-4 md:px-10">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-10 right-10 h-2 bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-1000"
                        style={{ width: `${Math.min(100, (xp / 5000) * 100)}%` }}
                    ></div>
                </div>

                {milestones.map((m, i) => {
                    const isReached = xp >= m.minXp;
                    return (
                        <div key={i} className="relative z-10 flex flex-col items-center">
                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${isReached ? 'bg-indigo-600 text-white shadow-2xl scale-110' : 'bg-slate-800 text-white/20 border-2 border-white/5'}`}>
                                {/* Fix: Added generic type any to ReactElement to allow size property in cloneElement */}
                                {React.cloneElement(m.icon as React.ReactElement<any>, { size: 24 })}
                                {isReached && (
                                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-950 p-1 rounded-lg animate-bounce">
                                        <Check size={12} strokeWidth={4}/>
                                    </div>
                                )}
                            </div>
                            <p className={`mt-4 text-[10px] font-black uppercase tracking-widest hidden md:block ${isReached ? 'text-indigo-300' : 'text-white/20'}`}>{m.label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentJourney;