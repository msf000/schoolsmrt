
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, StoredLessonPlan } from '../types';
import { Trophy, TrendingUp, Users, BookOpen, Share2, Award, Heart, ShieldCheck, Target, Zap, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface Props {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    plans: StoredLessonPlan[];
}

const TeacherStats: React.FC<Props> = ({ students, performance, attendance, plans }) => {
    
    const impactStats = useMemo(() => {
        // حساب نسبة تحسن الطلاب
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
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-y-auto custom-scrollbar pb-32">
            <div className="mb-12">
                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <Award className="text-indigo-600" size={36}/> سجل الإنجاز المهني
                </h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Professional Impact Dashboard</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard label="معدل التحسن" value={`${impactStats.growthPct}%`} sub="في مستوى الطلاب" icon={<TrendingUp/>} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="الموارد المشتركة" value={impactStats.sharedCount} sub="في المكتبة التشاركية" icon={<Share2/>} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="الحصص الموثقة" value={impactStats.totalSessions} sub="سجل حضور سحابي" icon={<ShieldCheck/>} color="text-amber-600" bg="bg-amber-50" />
                <StatCard label="كفاءة التعليم" value={`${impactStats.avgMastery}%`} sub="متوسط الإتقان العام" icon={<Target/>} color="text-rose-600" bg="bg-rose-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-8">تحليل التأثير التربوي الأسبوعي</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'تحضير ذكي', val: plans.length },
                                { name: 'تعزيز إيجابي', val: 45 },
                                { name: 'اختبارات مصححة', val: performance.length / 10 },
                                { name: 'تواصل مع الأهالي', val: 28 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                <YAxis hide />
                                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="val" radius={[10, 10, 0, 0]} barSize={50}>
                                    <Cell fill="#4f46e5" />
                                    <Cell fill="#10b981" />
                                    <Cell fill="#f59e0b" />
                                    <Cell fill="#ef4444" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-indigo-900 rounded-[3.5rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={200}/></div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black mb-4">شهادة الكفاءة الرقمية</h4>
                        <p className="text-indigo-200 text-sm leading-relaxed mb-10 font-medium">
                            لقد أتممت استخدام أدوات الذكاء الاصطناعي بنسبة 100% هذا الشهر، مما ساهم في تقليص وقت الرصد بنسبة 40% وتحسين تفاعل الطلاب بنسبة 15%.
                        </p>
                        <div className="flex items-center gap-4 bg-white/10 p-6 rounded-3xl border border-white/10">
                             <div className="p-3 bg-yellow-400 text-slate-900 rounded-2xl shadow-lg"><Trophy/></div>
                             <div>
                                 <p className="text-[10px] font-black text-indigo-300 uppercase">اللقب الحالي</p>
                                 <p className="font-black text-lg">المعلم المبتكر المعتمد</p>
                             </div>
                        </div>
                    </div>
                    <button className="mt-10 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all">تصدير تقرير الإنجاز المهني</button>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, sub, icon, color, bg }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{sub}</p>
        </div>
        <div className={`p-4 ${bg} ${color} rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
);

export default TeacherStats;
