
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, StoredLessonPlan } from '../types';
import { Trophy, TrendingUp, Users, BookOpen, Share2, Award, Heart, ShieldCheck, Target, Zap, Clock, ClipboardCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface Props {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    plans: StoredLessonPlan[];
}

const TeacherStats: React.FC<Props> = ({ students, performance, attendance, plans }) => {
    
    const impactStats = useMemo(() => {
        const studentGrowth = students.filter(s => {
            const p = performance.filter(x => x.studentId === s.id).sort((a,b) => a.date.localeCompare(b.date));
            if (p.length < 2) return false;
            return (p[p.length-1].score / p[p.length-1].maxScore) > (p[0].score / p[0].maxScore);
        }).length;

        const sharedCount = plans.filter(p => p.isShared).length;
        const totalSessions = new Set(attendance.map(a => `${a.date}_${a.period}`)).size;

        return {
            growthPct: Math.round((studentGrowth / (students.length || 1)) * 100),
            sharedCount,
            totalSessions,
            avgMastery: Math.round((performance.reduce((a,b)=>a+(b.score/b.maxScore),0) / (performance.length || 1)) * 100)
        };
    }, [students, performance, attendance, plans]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-y-auto custom-scrollbar pb-10">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <Award className="text-blue-600" size={28}/> سجل الإنجاز المهني السحابي
                </h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Professional Impact Analysis</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MiniStat label="معدل التحسن" value={`${impactStats.growthPct}%`} icon={<TrendingUp size={18}/>} color="text-blue-600" bg="bg-blue-50" />
                <MiniStat label="الموارد المشتركة" value={impactStats.sharedCount} icon={<Share2 size={18}/>} color="text-emerald-600" bg="bg-emerald-50" />
                <MiniStat label="الحصص الموثقة" value={impactStats.totalSessions} icon={<ShieldCheck size={18}/>} color="text-indigo-600" bg="bg-indigo-50" />
                <MiniStat label="كفاءة التعليم" value={`${impactStats.avgMastery}%`} icon={<Target size={18}/>} color="text-amber-600" bg="bg-amber-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <h3 className="text-base font-bold text-slate-800 mb-8 border-b pb-4">مؤشرات التأثير التربوي التراكمي</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'تحضير ذكي', val: plans.length },
                                { name: 'تعزيز إيجابي', val: 12 },
                                { name: 'رصد تقييمات', val: performance.length / 10 },
                                { name: 'تواصل أسر', val: 8 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#64748b'}} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'}} />
                                <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={40}>
                                    <Cell fill="#2563eb" />
                                    <Cell fill="#10b981" />
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#f59e0b" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-800 text-white rounded-xl p-8 flex flex-col justify-between shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ClipboardCheck size={180}/></div>
                    <div className="relative z-10">
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="text-amber-400" size={20}/> تحليل الكفاءة الرقمية</h4>
                        <p className="text-xs text-slate-300 leading-relaxed mb-8 font-medium">
                            لقد وفرت ميزة الأتمتة والذكاء الاصطناعي ما يقارب 30% من الوقت الإداري هذا الشهر، مما سمح بتركيز أكبر على الدعم الفردي للطلاب المتعثرين.
                        </p>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                                <span>المرتبة الحالية</span>
                                <span className="text-amber-400">مستوى متقدم</span>
                             </div>
                             <p className="font-bold text-sm">المعلم المبتكر المعتمد (Cloud Expert)</p>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-blue-700 transition-all">تصدير تقرير الإنجاز</button>
                </div>
            </div>
        </div>
    );
};

const MiniStat = ({ label, value, icon, color, bg }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
        <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className={`text-xl font-bold ${color}`}>{value}</h3>
        </div>
        <div className={`p-2.5 ${bg} ${color} rounded-lg group-hover:scale-105 transition-transform`}>{icon}</div>
    </div>
);

export default TeacherStats;
