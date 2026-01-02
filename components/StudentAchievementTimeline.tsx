
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, Badge, AttendanceStatus } from '../types';
import { formatDualDate } from '../services/dateService';
import { 
    Zap, Star, Trophy, Calendar, CheckCircle2, Award, 
    ArrowUpRight, Heart, Sparkles, MessageCircle, Crown, ShieldCheck, Rocket
} from 'lucide-react';

interface Props {
    student: Student;
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
}

const StudentAchievementTimeline: React.FC<Props> = ({ student, attendance, performance }) => {
    
    const timelineEvents = useMemo(() => {
        const events: any[] = [];

        // 1. التميز الدراسي
        performance.filter(p => (p.score / p.maxScore) >= 0.9).forEach(p => {
            events.push({
                date: p.date,
                title: `إبداع أكاديمي في ${p.title}`,
                desc: `حقق البطل درجة متميزة (${p.score}/${p.maxScore}) في التقييم.`,
                type: 'ACADEMIC',
                icon: <Trophy className="text-yellow-500" size={24}/>,
                color: 'border-yellow-400 bg-yellow-50/10'
            });
        });

        // 2. الحضور المثالي (التحضير السحابي)
        attendance.filter(a => a.status === AttendanceStatus.PRESENT).slice(-15).forEach(a => {
            events.push({
                date: a.date,
                title: 'حضور وإثبات وجود',
                desc: `تم رصد حضورك بنجاح في ${a.subject || 'الحصة الدراسية'}. استمر في الانضباط!`,
                type: 'ATTENDANCE',
                icon: <CheckCircle2 className="text-emerald-500" size={24}/>,
                color: 'border-emerald-400 bg-emerald-50/10'
            });
        });

        // 3. الأوسمة الملكية
        (student.badges || []).forEach(b => {
            events.push({
                date: b.unlockedAt,
                title: `تم تقلد وسام: ${b.name}`,
                desc: b.description,
                type: 'BADGE',
                icon: <img src={b.icon} className="w-8 h-8 object-contain" alt="badge"/>,
                color: 'border-purple-400 bg-purple-50/10'
            });
        });

        return events.sort((a, b) => b.date.localeCompare(a.date));
    }, [student, attendance, performance]);

    return (
        <div className="h-full flex flex-col bg-[#020617] text-white animate-fade-in font-tajawal overflow-hidden pb-24 lg:pb-10" dir="rtl">
            <div className="p-8 md:p-12 border-b border-white/5 bg-black/20 shrink-0">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter">سجل الفخر الرقمي</h2>
                        <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-2">My Eternal Achievement Journal</p>
                    </div>
                    <div className="p-5 bg-indigo-600 rounded-[2rem] shadow-[0_0_50px_rgba(79,70,229,0.3)]"><Rocket size={32}/></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-12">
                    <div className="relative border-r-4 border-white/5 mr-6 md:mr-10 space-y-12 pr-12">
                        {timelineEvents.map((ev, i) => (
                            <div key={i} className="relative group animate-slide-right" style={{ animationDelay: `${i*0.05}s` }}>
                                {/* Timeline Dot */}
                                <div className={`absolute -right-[62px] top-4 w-8 h-8 rounded-2xl border-[6px] border-[#020617] z-10 transition-all duration-500 group-hover:scale-125 ${
                                    ev.type === 'ACADEMIC' ? 'bg-yellow-400 shadow-[0_0_15px_#facc15]' : 
                                    ev.type === 'BADGE' ? 'bg-purple-500 shadow-[0_0_15px_#a855f7]' : 
                                    'bg-emerald-500 shadow-[0_0_15px_#10b981]'
                                }`}></div>
                                
                                <div className={`p-8 rounded-[3rem] border-2 shadow-2xl bg-white/5 backdrop-blur-md transition-all group-hover:bg-white/10 ${ev.color.replace('bg-', 'border-')}`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 shrink-0 transition-transform group-hover:scale-110 duration-500">
                                                {ev.icon}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-2xl group-hover:text-indigo-300 transition-colors">{ev.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Calendar size={14} className="text-white/20"/>
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{formatDualDate(ev.date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <ArrowUpRight size={24} className="text-white/10 group-hover:text-indigo-400 transition-all group-hover:translate-x-1 group-hover:translate-y-[-4px]"/>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-lg font-medium leading-relaxed pr-2">{ev.desc}</p>
                                </div>
                            </div>
                        ))}

                        {timelineEvents.length === 0 && (
                            <div className="py-40 text-center opacity-10 flex flex-col items-center gap-8">
                                <ShieldCheck size={180} strokeWidth={1}/>
                                <p className="text-4xl font-black italic tracking-tighter">بانتظار تسجيل أول إنجاز في رحلتك الأسطورية</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAchievementTimeline;
