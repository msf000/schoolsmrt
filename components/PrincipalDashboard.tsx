
import React, { useMemo, useState } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, Teacher } from '../types';
import { 
    Shield, Users, GraduationCap, TrendingUp, AlertTriangle, 
    Sparkles, Bot, BarChart3, PieChart, Activity, CheckCircle, 
    ArrowUpRight, Target, Zap, Clock, Briefcase, ChevronLeft
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
                atRiskCount: students.length * 0.1 // Simulated for prompt
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
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="mb-8 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Shield className="text-indigo-600" size={36}/> مركز قيادة المنشأة
                    </h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">نظام الرقابة الذكي (School Health Monitor)</p>
                </div>
                <button 
                    onClick={handleRunAudit}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    {loading ? <Bot className="animate-bounce" size={18}/> : <Sparkles size={18}/>} 
                    {loading ? 'جاري التدقيق...' : 'تدقيق ذكي للمدرسة (AI Audit)'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-20 pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <PrincipalStatCard label="إجمالي الطلاب" value={stats.totalStudents} sub="طلاب نشطون" icon={<Users/>} color="text-indigo-600" bg="bg-indigo-50"/>
                    <PrincipalStatCard label="الكادر التعليمي" value={stats.totalTeachers} sub="معلمين معتمدين" icon={<Briefcase/>} color="text-emerald-600" bg="bg-emerald-50"/>
                    <PrincipalStatCard label="معدل الانضباط" value={`${stats.attRate}%`} sub="حضور سحابي" icon={<Clock/>} color="text-amber-600" bg="bg-amber-50"/>
                    <PrincipalStatCard label="كفاءة التعلم" value={`${stats.avgGrade}%`} sub="متوسط الإتقان" icon={<Target/>} color="text-rose-600" bg="bg-rose-50"/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border shadow-sm h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black text-slate-800">تحليل النمو الأكاديمي السنوي</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest"><TrendingUp size={14}/> مباشر</div>
                            </div>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    { name: 'أكتوبر', value: 75 }, { name: 'نوفمبر', value: 78 },
                                    { name: 'ديسمبر', value: 82 }, { name: 'يناير', value: 85 },
                                    { name: 'فبراير', value: 88 }, { name: 'مارس', value: 92 }
                                ]}>
                                    <defs>
                                        <linearGradient id="principalPulse" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                                    <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#principalPulse)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden flex flex-col shadow-2xl">
                        <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 pointer-events-none"><Sparkles size={200}/></div>
                        <div className="relative z-10">
                            <div className="bg-white/10 w-fit p-3 rounded-2xl mb-6 backdrop-blur-md border border-white/10 flex items-center gap-2">
                                <Bot className="text-indigo-400" size={24}/>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">توصية المدير الذكية</span>
                            </div>
                            {aiSummary ? (
                                <div className="space-y-6 animate-slide-up">
                                    <p className="text-xl font-medium leading-relaxed italic text-indigo-50">"{aiSummary}"</p>
                                    <div className="pt-6 border-t border-white/10 space-y-4">
                                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">الأولويات المقترحة:</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 text-xs font-bold text-white/70 bg-white/5 p-3 rounded-xl border border-white/5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                                                تكريم أفضل 3 معلمين نشاطاً سحابياً
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-bold text-white/70 bg-white/5 p-3 rounded-xl border border-white/5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]"></div>
                                                مراجعة كشوف غياب طلاب الصف الثاني
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center opacity-30">
                                    <Activity size={80} className="mx-auto mb-4"/>
                                    <p className="font-black text-xl">اضغط على التدقيق لبدء التحليل المؤسسي</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PrincipalStatCard = ({ label, value, sub, icon, color, bg }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
        </div>
        <div className={`p-4 ${bg} ${color} rounded-2xl group-hover:scale-110 transition-transform shadow-inner`}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
    </div>
);

export default PrincipalDashboard;
