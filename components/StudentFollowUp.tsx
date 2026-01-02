
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, SystemUser, BehaviorIncident } from '../types';
import { getBehaviorIncidents, updateStudent, saveRemedialPlan } from '../services/storageService';
import { generateStudentAnalysis, generateSmartRemedialPlan } from '../services/geminiService';
// Added Target to the imported icons from lucide-react
import { 
    Search, TrendingUp, Loader2, Bot, ArrowRight, Star, Radar as RadarIcon, 
    BookOpen, BrainCircuit, Zap, AlertTriangle, Trophy, Sparkles, User, Heart, Crown, LineChart as LineIcon, Printer, CheckCircle, FileText, LayoutGrid, Activity, ChevronLeft, ShieldCheck, Target
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, AreaChart, Area } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';
import ReportCard from './ReportCard';

const StudentFollowUp: React.FC<{ students: Student[], performance: PerformanceRecord[], attendance: AttendanceRecord[], currentUser?: SystemUser | null }> = ({ students, performance, attendance, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
        if (location.state && (location.state as any).studentId) return (location.state as any).studentId;
        return '';
    });

    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'AI' | 'ACADEMIC' | 'BEHAVIOR'>('SUMMARY');
    const [reportContent, setReportContent] = useState('');
    const [remedialPlan, setRemedialPlan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
    const incidents = useMemo(() => getBehaviorIncidents().filter(i => i.studentId === selectedStudentId), [selectedStudentId]);

    const stats = useMemo(() => {
        if (!student) return null;
        const sAtt = attendance.filter(a => a.studentId === student.id);
        const sPerf = performance.filter(p => p.studentId === student.id);

        const attRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / sAtt.length) * 100 : 100;
        const gradeAvg = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 0;

        const radarData = [
            { subject: 'الانضباط', A: attRate },
            { subject: 'الواجبات', A: 85 },
            { subject: 'الأنشطة', A: gradeAvg },
            { subject: 'السلوك', A: Math.min(100, 80 + (student.behaviorPoints || 0)) },
            { subject: 'المشاركة', A: 90 },
        ];

        const trendData = sPerf.slice(-6).map(p => ({ date: p.date, val: (p.score/p.maxScore)*100 }));

        return { attRate: Math.round(attRate), gradeAvg: Math.round(gradeAvg), radarData, trendData };
    }, [student, attendance, performance]);

    const handleAiAnalysis = async () => {
        if (!student) return;
        setIsLoading(true);
        const res = await generateStudentAnalysis(student, attendance, performance);
        setReportContent(res);
        setIsLoading(false);
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal pb-16 h-full flex flex-col">
            {isReportOpen && student && <ReportCard student={student} performance={performance} attendance={attendance} onClose={() => setIsReportOpen(false)} />}
            
            {/* Header Area */}
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-slate-900/5 -skew-x-12 translate-x-16"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <button onClick={() => navigate('/students')} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><ArrowRight/></button>
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">الملف التربوي الشامل</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Holistic Student Intelligence File</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="p-4 border-2 border-slate-100 rounded-2xl font-black text-xs bg-slate-50 outline-none focus:border-blue-500 transition-all min-w-[250px]">
                        <option value="">-- اختر الطالب للمعاينة --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={() => setIsReportOpen(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl hover:bg-black transition-all">
                        <Printer size={18}/> تقرير رسمي
                    </button>
                </div>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col gap-8 overflow-hidden animate-slide-up">
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricBox label="مستوى التمكن" value={`${stats.gradeAvg}%`} sub="المعدل التراكمي" color="blue" icon={<Target/>}/>
                        <MetricBox label="معدل الحضور" value={`${stats.attRate}%`} sub="نسبة الانضباط" color="emerald" icon={<ShieldCheck/>}/>
                        <MetricBox label="رصيد التفاعل" value={student.xp || 0} sub="XP النشط" color="amber" icon={<Zap/>}/>
                        <MetricBox label="مستوى السلوك" value={student.behaviorPoints || 0} sub="النقاط السلوكية" color="rose" icon={<Heart/>}/>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                        {/* Left Column: Visual Analytics */}
                        <div className="lg:col-span-2 space-y-8 overflow-y-auto custom-scrollbar pr-2">
                            <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm h-[400px] flex flex-col">
                                <h3 className="text-xl font-black text-slate-800 mb-10 flex items-center gap-3"><LineIcon className="text-blue-600"/> منحنى التقدم الأكاديمي</h3>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.trendData}>
                                            <defs>
                                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis hide domain={[0, 100]} />
                                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                            <Area type="monotone" dataKey="val" stroke="#2563eb" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={4} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col items-center">
                                    <h3 className="text-lg font-black text-slate-800 mb-8 w-full border-b pb-4">رادار الكفايات</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer>
                                            <RadarChart data={stats.radarData}>
                                                <PolarGrid stroke="#f1f5f9" />
                                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                                <Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={3} />
                                                <Tooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white flex flex-col justify-center relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Bot size={200}/></div>
                                    <div className="relative z-10 space-y-6">
                                        <div className="bg-white/10 w-fit p-3 rounded-2xl border border-white/10 flex items-center gap-2">
                                            <Sparkles size={18} className="text-yellow-400"/>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">AI Diagnosis</span>
                                        </div>
                                        <h4 className="text-2xl font-black">التحليل التربوي المعمق</h4>
                                        <p className="text-indigo-100 text-sm leading-relaxed font-medium">استخدم قوة Gemini لتحليل كافة بيانات الطالب واستنتاج خطة دعم شخصية.</p>
                                        <button onClick={handleAiAnalysis} disabled={isLoading} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                            {isLoading ? <Loader2 className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                                            {isLoading ? 'جاري التشخيص...' : 'توليد التحليل الآن'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Records & AI Results */}
                        <div className="space-y-8 overflow-y-auto custom-scrollbar">
                            <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-blue-600" size={18}/> آخر الملاحظات السلوكية</h3>
                                <div className="space-y-3">
                                    {incidents.slice(0, 5).map(i => (
                                        <div key={i.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 transition-all">
                                            <div>
                                                <p className="font-black text-slate-700 text-xs">{i.category}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{formatDualDate(i.date)}</p>
                                            </div>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${i.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {i.points > 0 ? `+${i.points}` : i.points}
                                            </div>
                                        </div>
                                    ))}
                                    {incidents.length === 0 && <p className="text-center py-10 text-slate-300 italic text-sm">السجل السلوكي نظيف.</p>}
                                </div>
                            </div>

                            {reportContent && (
                                <div className="bg-indigo-50 border-2 border-indigo-200 p-8 rounded-[3rem] shadow-xl animate-slide-up">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-indigo-900 flex items-center gap-2"><Sparkles size={18}/> توصيات Gemini AI</h3>
                                        <button onClick={() => window.print()} className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><Printer size={16}/></button>
                                    </div>
                                    <div className="prose prose-sm prose-indigo max-w-none text-indigo-800 font-medium leading-relaxed">
                                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20">
                    <User size={150} strokeWidth={1} />
                    <p className="text-4xl font-black mt-8">يرجى اختيار طالب لعرض ملفه التربوي</p>
                </div>
            )}
        </div>
    );
};

const MetricBox = ({ label, value, sub, color, icon }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100'
    };
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm group hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform shadow-inner`}>
                    {React.cloneElement(icon, { size: 24 })}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <h3 className="text-3xl font-black text-slate-800">{value}</h3>
                </div>
            </div>
            <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {sub}
            </div>
        </div>
    );
};

const TabBtn = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 px-6 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={16}/> {label}
    </button>
);

export default StudentFollowUp;
