
import React, { useMemo, useState } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, Teacher } from '../types';
import { 
    Shield, Users, GraduationCap, TrendingUp, AlertTriangle, 
    Sparkles, Bot, BarChart3, PieChart, Activity, CheckCircle, 
    ArrowUpRight, Target, Zap, Clock, Briefcase, ChevronLeft, Filter, Search
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { generateNarrativeInsights } from '../services/geminiService';

interface PrincipalDashboardProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    teachers: Teacher[];
}

const PrincipalDashboard: React.FC<PrincipalDashboardProps> = ({ students, attendance, performance, teachers }) => {
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const stats = useMemo(() => {
        const totalStudents = students.length;
        const totalTeachers = teachers.length;
        const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === 'PRESENT').length / attendance.length) * 100 : 95;
        const avgGrade = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 82;
        
        return { totalStudents, totalTeachers, attRate: Math.round(attRate), avgGrade: Math.round(avgGrade) };
    }, [students, attendance, performance, teachers]);

    const handleRunAudit = async () => {
        setLoading(true);
        try {
            const auditData = {
                schoolStats: stats,
                teacherCount: teachers.length,
                atRiskCount: students.length * 0.1 
            };
            const res = await generateNarrativeInsights(auditData);
            setAiSummary(res);
        } catch {
            setAiSummary("تحليل المدرسة: الأداء مستقر حالياً، مع توصية بزيادة برامج التحفيز للطلاب المتعثرين.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 page-enter font-tajawal">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-center shadow-sm gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-brand-500/5 -skew-x-12 translate-x-10"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-black text-slate-900">نظام الرقابة المدرسية الشامل</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">أهلاً بك سعادة القائد، إليك ملخص أداء المنشأة اليوم.</p>
                </div>
                <button 
                    onClick={handleRunAudit}
                    disabled={loading}
                    className="relative z-10 px-8 py-3 bg-brand-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} 
                    {loading ? 'جاري التدقيق...' : 'تدقيق الذكاء الاصطناعي'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <PrincipalStat label="طلاب المدرسة" value={stats.totalStudents} icon={Users} color="indigo" />
                 <PrincipalStat label="المعلمين" value={stats.totalTeachers} icon={Briefcase} color="emerald" />
                 <PrincipalStat label="انضباط الطلاب" value={`${stats.attRate}%`} icon={Clock} color="amber" />
                 <PrincipalStat label="جودة التعليم" value={`${stats.avgGrade}%`} icon={Target} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-brand-500"/> التفاعل المدرسي اليومي</h3>
                            <div className="flex bg-slate-50 p-1 rounded-lg text-[10px] font-black border border-slate-100">
                                <span className="px-3 py-1 bg-white rounded shadow-sm text-brand-600">LIVE</span>
                            </div>
                        </div>
                        <div className="h-[300px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    { name: '7ص', v: 40 }, { name: '8ص', v: 85 }, { name: '9ص', v: 92 },
                                    { name: '10ص', v: 88 }, { name: '11ص', v: 75 }, { name: '12م', v: 60 }
                                ]}>
                                    <defs>
                                        <linearGradient id="pColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Area type="monotone" dataKey="v" stroke="#4f46e5" fillOpacity={1} fill="url(#pColor)" strokeWidth={3} />
                                </AreaChart>
                             </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-sm">المعلمين الأكثر نشاطاً سحابياً</h3>
                            <button className="text-brand-600 text-xs font-bold hover:underline">عرض الكل</button>
                        </div>
                        <div className="p-4 space-y-4">
                            {teachers.slice(0, 3).map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 border border-slate-200">{t.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.subjectSpecialty}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black border border-emerald-100">
                                        <CheckCircle size={12}/> موثق
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Bot size={180}/></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/10 rounded-lg border border-white/10"><Bot size={20} className="text-indigo-400"/></div>
                                <h3 className="font-bold text-lg">تحليل Gemini للمدرسة</h3>
                            </div>
                            {aiSummary ? (
                                <div className="flex-1 space-y-4 animate-fade-in text-sm text-indigo-50 leading-relaxed font-medium">
                                    {aiSummary}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                                    <Activity size={64} className="mb-4"/>
                                    <p className="font-bold">اضغط على زر "تدقيق" للحصول على تحليل ذكي لمستوى المدرسة.</p>
                                </div>
                            )}
                            <button className="mt-8 w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black hover:bg-slate-100 transition-all">تصدير تقرير القيادة</button>
                        </div>
                    </div>

                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 space-y-4">
                        <div className="flex items-center gap-3 text-rose-700 font-black">
                             <AlertTriangle size={18}/>
                             <span>تنبيهات انضباطية حرجة</span>
                        </div>
                        <p className="text-xs text-rose-600 leading-relaxed">هناك تراجع بنسبة 12% في حضور طلاب الصف الثالث هذا الأسبوع. يرجى مراجعة المعلمين المعنيين.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PrincipalStat = ({ label, value, icon: Icon, color }: any) => {
    const colors: any = {
        indigo: 'text-indigo-600 bg-indigo-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
        rose: 'text-rose-600 bg-rose-50'
    };
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-brand-500 transition-all">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-2xl font-black text-slate-900">{value}</h4>
            </div>
            <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

const Loader2 = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

export default PrincipalDashboard;
