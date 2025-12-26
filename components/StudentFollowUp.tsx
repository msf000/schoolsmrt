
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, Assignment, BehaviorIncident } from '../types';
import { getAcademicTerms, getAssignments, getBehaviorIncidents } from '../services/storageService';
// Fix: Satisfied missing exported members for storageService and removed unused 'predictStudentFuture'
import { generateStudentAnalysis, generateStudentPersona } from '../services/geminiService';
import { predictNextScore } from '../services/analysisService';
import { 
    Search, 
    TrendingUp, Loader2, Bot, 
    ArrowRight, Star, Radar as RadarIcon, 
    BookOpen, ClipboardList, BrainCircuit, Eye, Lightbulb, BarChart,
    FileText, ChevronLeft, Zap, AlertTriangle, Trophy, Sparkles, User, Heart, ShieldCheck, Target, Crown, LineChart as LineIcon
} from 'lucide-react';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, 
    PolarAngleAxis, AreaChart, Area, LineChart, Line, ReferenceLine
} from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

type FollowUpTab = 'SUMMARY' | 'AI' | 'PERSONA' | 'PREDICTION';

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students = [], performance = [], attendance = [], currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
        const saved = localStorage.getItem('sf_selected_student');
        if (location.state && (location.state as any).studentId) return (location.state as any).studentId;
        return saved || '';
    });

    const [activeTab, setActiveTab] = useState<FollowUpTab>(() => {
        return (localStorage.getItem('sf_active_tab') as FollowUpTab) || 'SUMMARY';
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [reportContent, setReportContent] = useState<string>('');
    const [persona, setPersona] = useState<any>(null);
    const [isPersonaLoading, setIsPersonaLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('sf_selected_student', selectedStudentId);
        localStorage.setItem('sf_active_tab', activeTab);
        if (selectedStudentId && activeTab === 'PERSONA' && !persona) loadPersona();
    }, [selectedStudentId, activeTab]);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

    const stats = useMemo(() => {
        if (!student) return null;
        const sAtt = attendance.filter(a => a.studentId === student.id);
        const sPerf = performance.filter(p => p.studentId === student.id).sort((a, b) => a.date.localeCompare(b.date));

        const calcAvg = (items: PerformanceRecord[]) => {
            if (items.length === 0) return 0;
            const total = items.reduce((a, b) => a + (b.score / b.maxScore), 0);
            return Math.round((total / items.length) * 100);
        };

        const attRate = sAtt.length > 0 ? Math.round(((sAtt.length - sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length) / sAtt.length) * 100) : 100;
        const gradeAvg = calcAvg(sPerf);

        const radarData = [
            { subject: 'الانضباط', A: attRate },
            { subject: 'المشاركة', A: 85 },
            { subject: 'الواجبات', A: calcAvg(sPerf.filter(p => p.category === 'HOMEWORK')) || gradeAvg },
            { subject: 'الأنشطة', A: calcAvg(sPerf.filter(p => p.category === 'ACTIVITY')) || gradeAvg },
            { subject: 'الاختبارات', A: calcAvg(sPerf.filter(p => p.category === 'PLATFORM_EXAM')) || gradeAvg },
        ];

        const trendData = sPerf.slice(-8).map(p => ({ date: p.date.slice(5), score: Math.round((p.score / p.maxScore) * 100) }));
        
        const predicted = predictNextScore(student.id, sPerf);

        return { attRate, gradeAvg, radarData, trendData, sAtt, sPerf, predicted };
    }, [student, attendance, performance]);

    const loadPersona = async () => {
        if (!student || !stats) return;
        setIsPersonaLoading(true);
        try {
            const res = await generateStudentPersona(student, stats.sPerf, stats.sAtt);
            setPersona(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsPersonaLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!student || !stats) return;
        setIsLoading(true);
        try {
            const report = await generateStudentAnalysis(student, stats.sAtt, stats.sPerf);
            setReportContent(report);
        } catch (e) { alert('فشل توليد التقرير'); } finally { setIsLoading(false); }
    };

    const TabBtn = ({ label, icon, active, onClick }: any) => (
        <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>{icon} {label}</button>
    );

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden relative font-tajawal">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-3xl border shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/students')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowRight size={20}/></button>
                    <div><h2 className="text-xl font-bold text-gray-800">الملف التفاعلي الموحد</h2></div>
                </div>
                <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input className="w-full pr-10 pl-4 py-2 border rounded-xl outline-none text-sm font-bold bg-gray-50 focus:bg-white transition-all shadow-inner" placeholder="بحث عن طالب..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} />
                    {isDropdownOpen && searchTerm && (
                        <div className="absolute top-full right-0 w-full bg-white border rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto z-50">
                            {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setSearchTerm(''); setIsDropdownOpen(false); setPersona(null); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-3 text-sm font-bold">{s.name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-white rounded-[2.5rem] p-6 border shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl">{student.name.charAt(0)}</div>
                            <div>
                                <h1 className="text-xl font-black text-gray-800">{student.name}</h1>
                                <p className="text-xs text-gray-400 font-bold">{student.className}</p>
                            </div>
                        </div>
                        <div className="flex gap-8 relative z-10">
                            <div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المعدل</p><p className="text-xl font-black text-indigo-600">{stats.gradeAvg}%</p></div>
                            <div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">الانضباط</p><p className="text-xl font-black text-green-600">{stats.attRate}%</p></div>
                        </div>
                    </div>

                    <div className="flex bg-white rounded-2xl border p-1 mb-6 shrink-0 overflow-x-auto no-scrollbar shadow-sm">
                        <TabBtn label="نظرة عامة" icon={<RadarIcon size={16}/>} active={activeTab==='SUMMARY'} onClick={()=>setActiveTab('SUMMARY')}/>
                        <TabBtn label="التوقعات الذكية" icon={<TrendingUp size={16}/>} active={activeTab==='PREDICTION'} onClick={()=>setActiveTab('PREDICTION')}/>
                        <TabBtn label="الملف الشخصي (AI)" icon={<Crown size={16}/>} active={activeTab==='PERSONA'} onClick={()=>setActiveTab('PERSONA')}/>
                        <TabBtn label="تحليل الدرجات" icon={<BarChart size={16}/>} active={activeTab==='AI'} onClick={()=>setActiveTab('AI')}/>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                        {activeTab === 'SUMMARY' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-80">
                                        <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-sm"><RadarIcon size={18} className="text-indigo-600"/> رادار المهارات</h3>
                                        <div className="h-full pb-10">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart data={stats.radarData}>
                                                    <PolarGrid stroke="#f1f5f9" />
                                                    <PolarAngleAxis dataKey="subject" tick={{fontSize:10, fontWeight:'bold', fill:'#94a3b8'}}/>
                                                    <Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} strokeWidth={3}/>
                                                    <Tooltip />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-80">
                                        <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-sm"><TrendingUp size={18} className="text-emerald-600"/> خط التقدم التحصيلي</h3>
                                        <div className="h-full pb-10">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats.trendData}>
                                                    <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" tick={{fontSize:10, fontWeight:'bold'}} axisLine={false} tickLine={false} />
                                                    <YAxis hide domain={[0, 100]} />
                                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'PREDICTION' && (
                             <div className="space-y-6 animate-fade-in">
                                 <div className="bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                                     <div className="absolute top-0 right-0 p-10 opacity-10"><TrendingUp size={200}/></div>
                                     <div className="relative z-10">
                                         <h3 className="text-2xl font-black mb-4 flex items-center gap-3"><Sparkles className="text-yellow-400"/> توقعات الأداء المستقبلي</h3>
                                         <p className="text-indigo-100 text-lg leading-relaxed max-w-2xl font-medium mb-8">
                                             بناءً على منحنى التعلم للأسبوعين الماضيين، يتوقع النظام أن تكون درجة الطالب في الاختبار القادم:
                                         </p>
                                         <div className="flex items-center gap-6">
                                             <div className="text-6xl font-black text-yellow-400 drop-shadow-lg">{stats.predicted || '--'}%</div>
                                             <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/20 text-xs font-bold">
                                                 {stats.predicted && stats.predicted > stats.gradeAvg ? 'صعود متوقع 📈' : 'حاجة لتعزيز التركيز ⚠️'}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                                     <h4 className="font-black text-gray-800 mb-6">تحليل مسار نواتج التعلم</h4>
                                     <div className="h-64">
                                         <ResponsiveContainer width="100%" height="100%">
                                             <LineChart data={[...stats.trendData, { date: 'القادم', score: stats.predicted, isPredicted: true }]}>
                                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                 <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} />
                                                 <YAxis hide domain={[0, 100]} />
                                                 <Tooltip />
                                                 <ReferenceLine x="القادم" stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'توقع AI', fill: 'red', fontSize: 10 }} />
                                                 <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6 }} />
                                             </LineChart>
                                         </ResponsiveContainer>
                                     </div>
                                 </div>
                             </div>
                        )}

                        {activeTab === 'PERSONA' && (
                            <div className="space-y-6 animate-fade-in">
                                {isPersonaLoading ? (
                                    <div className="bg-white p-20 rounded-[3rem] border shadow-sm flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="animate-spin text-indigo-600" size={48}/>
                                        <p className="font-black text-gray-400">جاري تحليل شخصية الطالب...</p>
                                    </div>
                                ) : persona ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-1 bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={150}/></div>
                                            <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center text-5xl mb-6 backdrop-blur-md">🏆</div>
                                            <h3 className="text-3xl font-black mb-2">{persona.title}</h3>
                                            <p className="text-indigo-200 font-bold leading-relaxed">{persona.description}</p>
                                        </div>
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                                                <h4 className="font-black text-gray-800 mb-6 flex items-center gap-3"><Sparkles className="text-yellow-500"/> نصائح مخصصة للمعلم</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {persona.tips.map((tip: string, i: number) => (
                                                        <div key={i} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col gap-3 relative group hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all">
                                                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">0{i+1}</div>
                                                            <p className="text-sm text-gray-700 font-bold leading-relaxed">{tip}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-emerald-900 text-white p-8 rounded-[3rem] shadow-xl flex items-center justify-between">
                                                <div><h4 className="text-xl font-black mb-1">النمط التعليمي الغالب</h4><p className="text-emerald-100 opacity-80 uppercase tracking-widest text-xs font-black">{student.learningStyle || 'غير محدد'}</p></div>
                                                <div className="p-4 bg-white/10 rounded-2xl"><BrainCircuit size={32}/></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-20 rounded-[3rem] border shadow-sm flex flex-col items-center justify-center gap-6">
                                        <Bot size={80} className="text-gray-200"/>
                                        <button onClick={loadPersona} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">بدء تحليل الشخصية بالذكاء الاصطناعي</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'AI' && (
                            <div className="bg-white p-10 rounded-[3rem] border shadow-sm animate-fade-in min-h-[450px] relative">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-6 gap-4">
                                    <div className="flex items-center gap-4"><Sparkles className="text-purple-600" size={32}/><div><h3 className="text-xl font-black text-gray-800">تحليل الأداء والدعم</h3><p className="text-xs text-gray-400 font-bold uppercase">تقرير ذكي مخصص</p></div></div>
                                    <button onClick={handleGenerateReport} disabled={isLoading} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-purple-700 flex items-center gap-2">{isLoading ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16}/>} تحليل AI</button>
                                </div>
                                {reportContent ? (
                                    <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed bg-gray-50/50 p-8 rounded-[2rem] border border-indigo-50 animate-slide-up">
                                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-30 py-20">
                                        <BrainCircuit size={100} className="mb-6"/>
                                        <p className="text-xl font-black">اضغط على زر التحليل لتوليد التشخيص الذكي</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 font-black bg-white rounded-[3rem] border-2 border-dashed border-gray-200 gap-6">
                    <Search size={100} className="opacity-10"/>
                    <p className="text-3xl text-center">ابحث عن طالب لعرض ملف الأداء الموحد</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
