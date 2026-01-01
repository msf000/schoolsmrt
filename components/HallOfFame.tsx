
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus } from '../types';
import { Trophy, Crown, Medal, Star, Zap, User, ArrowRight, Sparkles, Award } from 'lucide-react';
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
            return { ...s, totalScore: Math.round(points), masteryAvg: Math.round(avg) };
        }).sort((a,b) => b.totalScore - a.totalScore).slice(0, 12);
    }, [students, performance, attendance]);

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-12 shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4">
                        <Award className="text-yellow-600" size={40}/> لوحة الشرف الأكاديمية
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest mt-1">معرض المبدعين والمتفوقين لهذا الفصل</p>
                </div>
                <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-xl hover:bg-slate-100 transition-all border border-slate-200 text-slate-500 shadow-sm">
                    <ArrowRight size={24}/>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
                {topStars.map((s, i) => (
                    <div key={s.id} className="group relative flex flex-col items-center animate-slide-up" style={{ animationDelay: `${i*0.05}s` }}>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 w-full flex flex-col items-center relative z-10 shadow-sm hover:shadow-xl hover:border-yellow-400 transition-all duration-300">
                            
                            <div className="absolute -top-5 -right-5 z-20">
                                {i === 0 ? <Trophy size={64} className="text-yellow-500 drop-shadow-md animate-pulse"/> : 
                                 i === 1 ? <Medal size={56} className="text-slate-400"/> : 
                                 i === 2 ? <Medal size={48} className="text-amber-600"/> :
                                 <Star size={32} className="text-slate-200"/>}
                            </div>

                            <div className="relative mb-6">
                                <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black border-4 shadow-inner ${
                                    i === 0 ? 'bg-yellow-50 border-yellow-400 text-yellow-600' : 
                                    i === 1 ? 'bg-slate-50 border-slate-300 text-slate-500' : 
                                    i === 2 ? 'bg-amber-50 border-amber-500 text-amber-700' : 
                                    'bg-slate-100 border-slate-200 text-slate-400'
                                }`}>
                                    {s.name.charAt(0)}
                                </div>
                                <div className="absolute -bottom-2 -left-2 bg-slate-800 text-white w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg shadow-lg">
                                    #{i+1}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-1 text-center line-clamp-1">{s.name}</h3>
                            <p className="text-blue-600 font-bold text-[10px] uppercase mb-6 tracking-wider">{s.className}</p>

                            <div className="w-full grid grid-cols-2 gap-3 border-t pt-6">
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">النقاط (XP)</p>
                                    <p className="text-xl font-black text-slate-800 flex items-center justify-center gap-1"><Zap size={14} className="text-yellow-500" fill="currentColor"/> {s.xp || 0}</p>
                                </div>
                                <div className="text-center border-r border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">نسبة الإتقان</p>
                                    <p className="text-xl font-black text-emerald-600">{s.masteryAvg}%</p>
                                </div>
                            </div>
                            
                            <button onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="mt-6 w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-[10px] uppercase border border-slate-100 transition-all flex items-center justify-center gap-2">
                                <User size={14}/> عرض الملف الشامل
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-white border border-slate-200 px-10 py-3 rounded-full shadow-2xl z-[100]">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div> 
                    <span className="text-[10px] font-bold text-slate-500 uppercase">نخبة التميز</span>
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles size={14}/> 
                    <span className="text-[10px] font-bold uppercase tracking-wider">تحديث السجل فوري ومزامن سحابياً</span>
                </div>
            </div>
        </div>
    );
};

export default HallOfFame;
