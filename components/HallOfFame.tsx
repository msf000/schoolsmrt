
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus } from '../types';
import { Trophy, Crown, Medal, Star, Zap, User, ArrowLeft, Sparkles, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
}

const HallOfFame: React.FC<Props> = ({ students, performance, attendance }) => {
    const navigate = useNavigate();

    const topStars = useMemo(() => {
        return students.map(s => {
            const myPerf = performance.filter(p => p.studentId === s.id);
            const myAtt = attendance.filter(a => a.studentId === s.id);
            const avg = myPerf.length > 0 ? myPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/myPerf.length*100 : 0;
            const attRate = myAtt.length > 0 ? (myAtt.filter(a=>a.status===AttendanceStatus.PRESENT).length/myAtt.length)*100 : 100;
            const points = (avg * 0.7) + (attRate * 0.3);
            return { ...s, score: Math.round(points), avg: Math.round(avg) };
        }).sort((a,b) => b.score - a.score).slice(0, 6);
    }, [students, performance, attendance]);

    return (
        <div className="p-8 h-full flex flex-col bg-slate-950 text-white animate-fade-in font-tajawal overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-16 shrink-0">
                <div>
                    <h2 className="text-4xl font-black flex items-center gap-4">
                        <Crown className="text-yellow-400" size={48}/> معرض الأبطال
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest mt-2 ml-1">تتويج قادة التعلم لهذا الفصل</p>
                </div>
                <button onClick={() => navigate(-1)} className="p-4 bg-white/5 rounded-3xl hover:bg-white/10 transition-all border border-white/10">
                    <ArrowLeft size={24}/>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20">
                {topStars.map((s, i) => (
                    <div key={s.id} className="group relative flex flex-col items-center animate-slide-up" style={{ animationDelay: `${i*0.1}s` }}>
                        {/* Halo effect */}
                        <div className={`absolute -inset-4 rounded-[4rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : 'bg-orange-400'}`}></div>
                        
                        <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/10 w-full flex flex-col items-center relative z-10 shadow-2xl transition-transform duration-500 group-hover:-translate-y-4">
                            <div className="absolute -top-6 -right-6">
                                {i === 0 ? <Trophy size={64} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]"/> : 
                                 i === 1 ? <Medal size={56} className="text-slate-300"/> : <Medal size={48} className="text-orange-400"/>}
                            </div>

                            <div className="relative mb-8">
                                <div className="w-32 h-32 bg-gradient-to-tr from-white/10 to-white/5 rounded-[2.5rem] flex items-center justify-center text-5xl font-black border-4 border-white/10 shadow-2xl group-hover:scale-110 transition-transform">
                                    {s.name.charAt(0)}
                                </div>
                                <div className="absolute -bottom-3 -left-3 bg-white text-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl">
                                    #{i+1}
                                </div>
                            </div>

                            <h3 className="text-2xl font-black mb-1">{s.name}</h3>
                            <p className="text-indigo-400 font-bold text-xs uppercase mb-8">{s.className}</p>

                            <div className="w-full grid grid-cols-2 gap-4">
                                <div className="bg-black/40 p-4 rounded-3xl border border-white/5 text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">الرصيد</p>
                                    <p className="text-xl font-black text-yellow-400 flex items-center justify-center gap-1"><Zap size={14} fill="currentColor"/> {s.score}</p>
                                </div>
                                <div className="bg-black/40 p-4 rounded-3xl border border-white/5 text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">الإتقان</p>
                                    <p className="text-xl font-black text-emerald-400">{s.avg}%</p>
                                </div>
                            </div>
                            
                            <button onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">
                                <User size={14}/> عرض السجل الذهبي
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/5 backdrop-blur-xl px-10 py-4 rounded-full border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15]"></div> <span className="text-[10px] font-black uppercase">المركز الأول</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div> <span className="text-[10px] font-black uppercase">تجاوز 90%</span></div>
                <div className="flex items-center gap-2"><Sparkles className="text-indigo-400" size={14}/> <span className="text-[10px] font-black uppercase">التحديث القادم: بعد 24 ساعة</span></div>
            </div>
        </div>
    );
};

export default HallOfFame;
