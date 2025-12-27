
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, Badge, AttendanceStatus } from '../types';
import { formatDualDate } from '../services/dateService';
import { 
    Zap, Star, Trophy, Calendar, CheckCircle2, Award, 
    ArrowUpRight, Heart, Sparkles, MessageCircle 
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
                desc: `حقق الطالب درجة متميزة (${p.score}/${p.maxScore}) في التقييم.`,
                type: 'ACADEMIC',
                icon: <Trophy className="text-yellow-500"/>,
                color: 'border-yellow-400 bg-yellow-50'
            });
        });

        // 2. الحضور المثالي (التحضير السحابي)
        attendance.filter(a => a.status === AttendanceStatus.PRESENT).slice(-10).forEach(a => {
            events.push({
                date: a.date,
                title: 'حضور وإثبات وجود',
                desc: `تم التحضير بنجاح في ${a.subject || 'الحصة الدراسية'}.`,
                type: 'ATTENDANCE',
                icon: <CheckCircle2 className="text-emerald-500"/>,
                color: 'border-emerald-400 bg-emerald-50'
            });
        });

        // 3. الأوسمة الملكية
        (student.badges || []).forEach(b => {
            events.push({
                date: b.unlockedAt,
                title: `تم تقلد وسام: ${b.name}`,
                desc: b.description,
                type: 'BADGE',
                icon: <img src={b.icon} className="w-6 h-6 object-contain" alt="badge"/>,
                color: 'border-purple-400 bg-purple-50'
            });
        });

        return events.sort((a, b) => b.date.localeCompare(a.date));
    }, [student, attendance, performance]);

    return (
        <div className="p-8 h-full bg-[#020617] text-white animate-fade-in font-tajawal overflow-y-auto custom-scrollbar pb-32">
            <div className="max-w-3xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
                        <Sparkles size={40}/>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">سجل الفخر الرقمي</h2>
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm">كل لحظة نجاح مرصودة في ملفك للأبد</p>
                </div>

                <div className="relative border-r-2 border-white/10 mr-8 space-y-12 pr-12">
                    {timelineEvents.map((ev, i) => (
                        <div key={i} className="relative group animate-slide-right" style={{ animationDelay: `${i*0.1}s` }}>
                            {/* Dot indicator */}
                            <div className={`absolute -right-[61px] top-4 w-6 h-6 rounded-xl border-4 border-[#020617] z-10 transition-all group-hover:scale-125 ${ev.type === 'ACADEMIC' ? 'bg-yellow-400 shadow-[0_0_15px_#facc15]' : ev.type === 'BADGE' ? 'bg-purple-500 shadow-[0_0_15px_#a855f7]' : 'bg-emerald-500 shadow-[0_0_15px_#10b981]'}`}></div>
                            
                            <div className={`p-8 rounded-[2.5rem] border-2 shadow-2xl bg-white/5 transition-all hover:bg-white/10 ${ev.color.replace('bg-', 'border-opacity-20 border-')}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-black/40 rounded-2xl border border-white/5">{ev.icon}</div>
                                        <div>
                                            <h4 className="font-black text-xl">{ev.title}</h4>
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{formatDualDate(ev.date)}</span>
                                        </div>
                                    </div>
                                    <ArrowUpRight size={20} className="text-white/20 group-hover:text-indigo-400 transition-colors"/>
                                </div>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">{ev.desc}</p>
                            </div>
                        </div>
                    ))}

                    {timelineEvents.length === 0 && (
                        <div className="py-20 text-center opacity-30 border-2 border-dashed border-white/10 rounded-[3rem]">
                            <Calendar size={64} className="mx-auto mb-4"/>
                            <p className="font-black text-xl">بانتظار تسجيل أول إنجاز في رحلتك</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAchievementTimeline;
