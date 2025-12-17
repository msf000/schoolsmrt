
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, Exam, ExamResult, MessageLog, WeeklyPlanItem, AttendanceStatus, BehaviorStatus, LessonLink } from '../types';
import { downloadFromSupabase, getAcademicTerms, getExams, getExamResults, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, saveExamResult } from '../services/storageService';
import { 
    User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Library, 
    LayoutGrid, CalendarDays, RefreshCw, X, Activity, CheckCircle, 
    ChevronLeft, ChevronRight, Check, XCircle, ArrowRight, Video, Link as LinkIcon, 
    Bell, Download, Medal, ExternalLink, BookOpen, Zap, Star, TrendingUp, Info,
    BrainCircuit, Phone, Mail, Rocket, Trophy, PlayCircle,
    GraduationCap, Map as MapIcon, DownloadCloud, Eye,
    Image as ImageIcon, FolderHeart, LayoutPanelLeft
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import { formatDualDate } from '../services/dateService';

interface StudentPortalProps {
    currentUser: Student;
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, attendance, performance, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [messages, setMessages] = useState<MessageLog[]>([]);

    useEffect(() => {
        setTerms(getAcademicTerms());
        const myMsgs = getMessages().filter(m => m.studentId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMessages(myMsgs);
    }, [currentUser]);

    const handleRefresh = async () => {
        setIsSyncing(true);
        try {
            await downloadFromSupabase();
            window.location.reload();
        } catch (e) {
            console.error("Sync error", e);
        } finally {
            setIsSyncing(false);
        }
    };

    const navItems = [
        { path: '/', label: 'لوحة الصدارة', icon: LayoutGrid },
        { path: '/plan', label: 'الجدول الأسبوعي', icon: CalendarDays },
        { path: '/evaluation', label: 'كشف الدرجات', icon: Activity },
        { path: '/exams', label: 'الاختبارات', icon: FileQuestion },
        { path: '/attendance', label: 'سجل حضوري', icon: Calendar },
        { path: '/portfolio', label: 'معرض إنجازاتي', icon: FolderHeart },
        { path: '/achievements', label: 'أوسمة وجوائز', icon: Award },
        { path: '/library', label: 'المكتبة الرقمية', icon: Library },
        { path: '/messages', label: 'البريد الوارد', icon: Bell, badge: messages.length > 0 ? messages.length : undefined },
        { path: '/profile', label: 'ملفي الشخصي', icon: User },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-right font-sans select-none" dir="rtl">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-slate-200 shadow-sm z-30">
                <div className="p-8 border-b border-slate-100 flex flex-col items-center bg-gradient-to-b from-indigo-50/50 to-transparent">
                    <div className="relative mb-4 group">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100 transform rotate-3 transition-transform group-hover:rotate-0">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-xl shadow-lg border-2 border-white">
                            <Trophy size={16} fill="currentColor"/>
                        </div>
                    </div>
                    <h1 className="text-lg font-bold text-slate-800 text-center line-clamp-1">{currentUser.name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{currentUser.className}</span>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">طالب متميز</span>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium group ${
                                location.pathname === item.path 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold' 
                                    : 'text-slate-600 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} className={location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} />
                                <span className="text-sm">{item.label}</span>
                            </div>
                            {item.badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ring-2 ring-white animate-pulse">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
                    <button onClick={handleRefresh} disabled={isSyncing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-blue-600 bg-white border border-blue-100 hover:bg-blue-50 rounded-xl transition-all text-sm font-bold shadow-sm">
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /><span>مزامنة البيانات</span>
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold">
                        <LogOut size={16} /><span>خروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="lg:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm shrink-0">
                    <div className="font-black text-indigo-600 flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">S</div>
                        بوابة الطالب
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-xl"><Menu size={20}/></button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
                    <Routes>
                        <Route path="/" element={<StudentDashboard student={currentUser} attendance={attendance} performance={performance} terms={terms} />} />
                        <Route path="/plan" element={<StudentWeeklyPlan student={currentUser} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} attendance={attendance} terms={terms} />} />
                        <Route path="/exams" element={<StudentExamsView student={currentUser} />} />
                        <Route path="/attendance" element={<StudentAttendanceView student={currentUser} attendance={attendance} />} />
                        <Route path="/achievements" element={<StudentAchievements student={currentUser} attendance={attendance} performance={performance} />} />
                        <Route path="/portfolio" element={<StudentPortfolio student={currentUser} performance={performance} />} />
                        <Route path="/library" element={<StudentLibrary student={currentUser} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="/profile" element={<StudentProfile student={currentUser} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="font-black text-indigo-600">القائمة</h2>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {navItems.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${location.pathname === item.path ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:bg-indigo-50'}`}
                                >
                                    <item.icon size={20} />
                                    <span className="text-sm font-bold">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Components ---

const StudentDashboard = ({ student, attendance, performance }: { student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[], terms: AcademicTerm[] }) => {
    const navigate = useNavigate();
    const myAtt = attendance.filter((a: AttendanceRecord) => a.studentId === student.id);
    const myPerf = performance.filter((p: PerformanceRecord) => p.studentId === student.id);
    
    const stats = useMemo(() => {
        const attRate = myAtt.length > 0 ? Math.round((myAtt.filter((a: AttendanceRecord) => a.status === AttendanceStatus.PRESENT).length / myAtt.length) * 100) : 100;
        
        // Safe averaging calculation
        const avgScore = myPerf.length > 0 
            ? Math.round((myPerf.reduce((acc: number, curr: PerformanceRecord) => acc + (curr.score / (curr.maxScore || 1)), 0) / myPerf.length) * 100) 
            : 0;

        const totalPoints = (myAtt.filter((a: AttendanceRecord) => a.behaviorStatus === BehaviorStatus.POSITIVE).length * 50) + (avgScore * 10);
        
        const radarData = [
            { subject: 'الانضباط', A: attRate, fullMark: 100 },
            { subject: 'المشاركة', A: Math.min(100, myAtt.filter((a: AttendanceRecord) => a.behaviorStatus === BehaviorStatus.POSITIVE).length * 20), fullMark: 100 },
            { subject: 'الواجبات', A: avgScore, fullMark: 100 },
            { subject: 'الاختبارات', A: avgScore, fullMark: 100 },
        ];

        return { attRate, avgScore, totalPoints, radarData };
    }, [myAtt, myPerf]);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Rocket size={240}/></div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-white/10 backdrop-blur-md">
                            <Zap size={14} className="text-yellow-400 fill-yellow-400"/> طالب نشط
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">واصل التألق، {student.name.split(' ')[0]}! 🌟</h2>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => navigate('/plan')} className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl flex items-center gap-2"><MapIcon size={20}/> رحلتي التعليمية</button>
                            <button onClick={() => navigate('/exams')} className="bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold border border-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2"><PlayCircle size={20}/> الاختبارات</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <StatsCard label="الحضور" value={`${stats.attRate}%`} icon={<CheckCircle className="text-emerald-400"/>} color="bg-emerald-500/20" />
                        <StatsCard label="المعدل" value={`${stats.avgScore}%`} icon={<TrendingUp className="text-blue-400"/>} color="bg-blue-500/20" />
                        <StatsCard label="النقاط" value={stats.totalPoints} icon={<Star className="text-purple-400"/>} color="bg-purple-500/20" />
                        <StatsCard label="أوسمة" value={myAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length} icon={<Medal className="text-orange-400"/>} color="bg-orange-500/20" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2"><BrainCircuit size={24} className="text-indigo-600"/> رادار المهارات الشخصي</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={stats.radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} />
                                    <Radar name="أدائي" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Activity size={20} className="text-rose-500"/> آخر النشاطات</h3>
                        <div className="space-y-4">
                            {myPerf.slice(-5).map((p: PerformanceRecord) => (
                                <div key={p.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">{p.score}</div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-800 truncate">{p.title}</p>
                                        <p className="text-[10px] text-slate-400">{formatDualDate(p.date)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatsCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className={`${color} backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col items-center text-center group hover:scale-105 transition-transform`}>
        <div className="mb-2 transform group-hover:scale-110 transition-transform">{icon}</div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">{label}</div>
    </div>
);

const StudentAchievements = ({ student, attendance }: { student: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[] }) => {
    const medals = useMemo(() => {
        return attendance.filter((a: AttendanceRecord) => a.studentId === student.id && a.behaviorStatus === BehaviorStatus.POSITIVE);
    }, [attendance, student]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Award className="text-yellow-600" size={28}/> سجل الأوسمة والجوائز</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {medals.map((medal: AttendanceRecord) => (
                    <div key={medal.id} className="bg-white p-6 rounded-[2rem] border-4 border-yellow-100 shadow-sm text-center relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 transition-opacity"><Medal size={80}/></div>
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mx-auto mb-4 border-4 border-white shadow-md">
                            <Star fill="currentColor" size={40}/>
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-1">{medal.behaviorNote || 'وسام التميز'}</h4>
                        <p className="text-xs text-slate-400 font-bold">{formatDualDate(medal.date)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentWeeklyPlan = ({ student }: { student: Student }) => {
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d.toISOString().split('T')[0];
    });
    const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);

    useEffect(() => {
        const allPlans = getWeeklyPlans();
        const filtered = allPlans.filter(p => p.classId === student.className && p.weekStartDate === weekStart);
        setPlans(filtered);
    }, [weekStart, student]);

    const changeWeek = (dir: number) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + (dir * 7));
        setWeekStart(d.toISOString().split('T')[0]);
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr: Record<string, string> = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="text-indigo-600"/> الخطة الأسبوعية</h2>
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                    <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-white rounded shadow-sm"><ChevronRight size={16}/></button>
                    <span className="text-xs font-bold w-24 text-center">{formatDualDate(weekStart).split('|')[0]}</span>
                    <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-white rounded shadow-sm"><ChevronLeft size={16}/></button>
                </div>
            </div>

            <div className="grid gap-4">
                {days.map(day => {
                    const dayPlans = plans.filter(p => p.day === day).sort((a,b) => a.period - b.period);
                    return (
                        <div key={day} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-3 border-b border-slate-100 font-bold text-slate-700 flex justify-between items-center">
                                <span className="flex items-center gap-2"><Calendar size={16}/> {dayNamesAr[day]}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {dayPlans.length > 0 ? dayPlans.map(plan => (
                                    <div key={plan.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg">حصة {plan.period}</span>
                                            <h4 className="font-bold text-slate-800 text-base">{plan.subjectName}</h4>
                                        </div>
                                        <div className="mt-3 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                                            <p className="text-slate-700 text-sm font-medium">{plan.lessonTopic}</p>
                                        </div>
                                    </div>
                                )) : <div className="p-6 text-center text-slate-400 text-xs italic">لا توجد خطة مسجلة</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentEvaluationView = ({ student, performance, terms }: { student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[], terms: AcademicTerm[] }) => {
    const [selectedTermId, setSelectedTermId] = useState('');
    
    useEffect(() => {
        const current = terms.find((t:any) => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (terms.length > 0) setSelectedTermId(terms[0].id);
    }, [terms]);

    const activeTerm = terms.find((t:any) => t.id === selectedTermId);
    
    const filteredPerf = useMemo(() => {
        if (!activeTerm) return performance.filter((p: PerformanceRecord) => p.studentId === student.id);
        return performance.filter((p: PerformanceRecord) => p.studentId === student.id && p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
    }, [student, performance, activeTerm]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Activity className="text-indigo-600" size={28}/> كشف الدرجات</h2>
                <select 
                    value={selectedTermId} 
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                    <option value="">كل الفترات</option>
                    {terms.map((t: AcademicTerm) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">التقييم / المهمة</th>
                            <th className="p-4">المادة</th>
                            <th className="p-4 text-center">الدرجة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPerf.map((p: PerformanceRecord) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-400 font-mono text-xs">{p.date}</td>
                                <td className="p-4 font-bold text-slate-800">{p.title}</td>
                                <td className="p-4 text-slate-500">{p.subject}</td>
                                <td className="p-4 text-center">
                                    <span className="text-lg font-black text-indigo-600">{p.score}</span>
                                    <span className="text-xs text-slate-400 font-normal"> / {p.maxScore}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StudentExamsView = ({ student }: { student: Student }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [results, setResults] = useState<ExamResult[]>([]);
    const [activeExam, setActiveExam] = useState<Exam | null>(null);

    useEffect(() => {
        setExams(getExams().filter(e => e.isActive && (e.gradeLevel === student.gradeLevel || e.gradeLevel === 'عام')));
        setResults(getExamResults().filter(r => r.studentId === student.id));
    }, [student]);

    if (activeExam) return <ExamPlayer exam={activeExam} student={student} onComplete={() => setActiveExam(null)} />;

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><FileQuestion className="text-indigo-600" size={28}/> الاختبارات المتاحة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(exam => {
                    const res = results.find(r => r.examId === exam.id);
                    return (
                        <div key={exam.id} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><BookOpen size={32}/></div>
                                {res ? <div className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-xs font-bold">تم الحل</div> : <div className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-xs font-bold">متاح</div>}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{exam.title}</h3>
                            <p className="text-sm text-slate-400 mb-6">{exam.subject} • {exam.durationMinutes} دقيقة</p>
                            {res ? (
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-2xl font-black text-indigo-600">{res.score} / {res.totalScore}</div>
                                    <span className="text-xs font-bold text-slate-400">الدرجة النهائية</span>
                                </div>
                            ) : (
                                <button onClick={() => setActiveExam(exam)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-3"><PlayCircle/> ابدأ الاختبار</button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentAttendanceView = ({ student, attendance }: { student: Student, attendance: AttendanceRecord[] }) => {
    const myAtt = attendance.filter(a => a.studentId === student.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Calendar className="text-indigo-600" size={28}/> سجل الحضور</h2>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myAtt.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-400 font-mono text-xs">{a.date}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {a.status === 'PRESENT' ? 'حاضر' : 'غائب'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-500 text-xs italic">{a.behaviorNote || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StudentLibrary = ({ student }: { student: Student }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    useEffect(() => {
        setLinks(getLessonLinks().filter(l => !l.gradeLevel || l.gradeLevel === student.gradeLevel));
    }, [student]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Library className="text-indigo-600" size={28}/> المكتبة الرقمية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {links.map(link => (
                    <a href={link.url} target="_blank" rel="noreferrer" key={link.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 hover:shadow-xl transition-all group">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {link.url.includes('youtube') ? <Video size={24}/> : <LinkIcon size={24}/>}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{link.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-1">{formatDualDate(link.createdAt)}</p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

const StudentPortfolio = ({ student, performance }: { student: Student, performance: PerformanceRecord[] }) => {
    const galleryItems = useMemo(() => {
        return performance.filter(p => p.studentId === student.id && (p.url || p.notes?.includes('http')));
    }, [student, performance]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><FolderHeart className="text-rose-500" size={28}/> معرض إنجازاتي</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryItems.map(item => (
                    <div key={item.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                        <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            {item.url ? (
                                <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <ImageIcon size={48} className="text-slate-300"/>
                            )}
                        </div>
                        <div className="p-5">
                            <h4 className="font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                            <p className="text-xs text-slate-400 font-medium">{formatDualDate(item.date)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentMessages = ({ messages }: { messages: MessageLog[] }) => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Bell className="text-indigo-600" size={28}/> البريد الوارد</h2>
        <div className="space-y-4">
            {messages.map(msg => (
                <div key={msg.id} className="bg-white p-6 rounded-3xl border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Mail size={18}/></div>
                            <div>
                                <div className="font-bold text-slate-800">رسالة من: {msg.sentBy}</div>
                                <div className="text-[10px] text-slate-400">{formatDualDate(msg.date)}</div>
                            </div>
                        </div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
            ))}
            {messages.length === 0 && <div className="text-center py-20 text-slate-400">لا توجد رسائل حالياً</div>}
        </div>
    </div>
);

const StudentProfile = ({ student }: { student: Student }) => (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><User className="text-indigo-600" size={28}/> ملفي الشخصي</h2>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 text-center">
            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl mb-4 mx-auto">
                {student.name.charAt(0)}
            </div>
            <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
            <p className="text-slate-400 text-sm">{student.gradeLevel} - {student.className}</p>
            <div className="grid grid-cols-2 gap-4 mt-6 text-right">
                <div className="p-4 bg-slate-50 rounded-2xl">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">رقم الهوية</label>
                    <div className="font-mono font-bold text-slate-700">{student.nationalId}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">رقم الجوال</label>
                    <div className="font-mono font-bold text-slate-700">{student.phone || '-'}</div>
                </div>
            </div>
        </div>
    </div>
);

const ExamPlayer = ({ exam, student, onComplete }: { exam: Exam, student: Student, onComplete: () => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
    
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = () => {
        let score = 0;
        let total = 0;
        exam.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) score += q.points;
            total += q.points;
        });

        saveExamResult({
            id: Date.now().toString(),
            examId: exam.id,
            studentId: student.id,
            studentName: student.name,
            score,
            totalScore: total,
            date: new Date().toISOString(),
            answers
        });
        onComplete();
        alert(`انتهى الاختبار! درجتك: ${score} / ${total}`);
    };

    const q = exam.questions[currentIndex];
    const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex flex-col p-4 md:p-10 text-white" dir="rtl">
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-2xl font-bold">{exam.title}</h2>
                        <p className="text-slate-400 text-sm">سؤال {currentIndex + 1} من {exam.questions.length}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl border border-white/10">
                        <Clock size={20} className="text-indigo-400"/>
                        <span className="text-2xl font-black font-mono">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="flex-1 bg-white/5 rounded-[2.5rem] border border-white/10 p-8 md:p-12 animate-fade-in">
                    <h3 className="text-xl md:text-3xl font-bold mb-10 leading-relaxed text-right">{q.text}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setAnswers({...answers, [q.id]: opt})}
                                className={`p-6 rounded-3xl text-right font-bold text-lg transition-all border-2 ${answers[q.id] === opt ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-10">
                    <button 
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="px-8 py-4 bg-white/10 rounded-2xl font-bold disabled:opacity-30"
                    >
                        السابق
                    </button>
                    {currentIndex === exam.questions.length - 1 ? (
                        <button onClick={handleSubmit} className="px-12 py-4 bg-emerald-600 rounded-2xl font-black text-xl hover:bg-emerald-700 shadow-xl">إنهاء وتسليم</button>
                    ) : (
                        <button 
                            onClick={() => setCurrentIndex(prev => prev + 1)}
                            className="px-8 py-4 bg-indigo-600 rounded-2xl font-bold hover:bg-indigo-700"
                        >
                            التالي
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentPortal;
