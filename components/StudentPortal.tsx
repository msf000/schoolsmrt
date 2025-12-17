
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, Exam, ExamResult, MessageLog, WeeklyPlanItem, ScheduleItem, AttendanceStatus, BehaviorStatus } from '../types';
import { downloadFromSupabase, getAcademicTerms, getExams, getExamResults, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, getSchedules } from '../services/storageService';
import { 
    User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Library, 
    LayoutGrid, CalendarDays, RefreshCw, X, FileText, PieChart as PieChartIcon, 
    Activity, CheckCircle, Timer, AlertCircle, ChevronLeft, ChevronRight, 
    Check, XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, 
    Medal, ExternalLink, BookOpen, Zap, Target, Star, TrendingUp, Info,
    BrainCircuit, ShieldCheck, Phone, Mail, Rocket, ListChecks, Trophy
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
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
        await downloadFromSupabase();
        setIsSyncing(false);
        window.location.reload();
    };

    const navItems = [
        { path: '/', label: 'الرئيسية', icon: LayoutGrid },
        { path: '/plan', label: 'الخطة الأسبوعية', icon: CalendarDays },
        { path: '/evaluation', label: 'الدرجات والنتائج', icon: Activity },
        { path: '/exams', label: 'الاختبارات', icon: FileQuestion },
        { path: '/attendance', label: 'سجل الحضور', icon: Calendar },
        { path: '/certificates', label: 'الأوسمة والجوائز', icon: Award },
        { path: '/library', label: 'المكتبة الرقمية', icon: Library },
        { path: '/messages', label: 'التنبيهات', icon: Bell, badge: messages.length > 0 ? messages.length : undefined },
        { path: '/profile', label: 'ملفي الشخصي', icon: User },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-right font-sans" dir="rtl">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-slate-200 shadow-sm z-30">
                <div className="p-8 border-b border-slate-100 flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-4 shadow-lg shadow-indigo-200 rotate-3 transform transition-transform hover:rotate-0">
                        {currentUser.name.charAt(0)}
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 text-center line-clamp-1">{currentUser.name}</h1>
                    <p className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full mt-2">{currentUser.className}</p>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                location.pathname === item.path 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold' 
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} />
                                <span className="text-sm">{item.label}</span>
                            </div>
                            {item.badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 space-y-2">
                    <button onClick={handleRefresh} disabled={isSyncing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-sm font-bold">
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /><span>تحديث البيانات</span>
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold">
                        <LogOut size={16} /><span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm shrink-0">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black">S</div>
                        بوابة الطالب
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-lg"><Menu size={20}/></button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <Routes>
                        <Route path="/" element={<StudentDashboard student={currentUser} attendance={attendance} performance={performance} terms={terms} />} />
                        <Route path="/plan" element={<StudentWeeklyPlan student={currentUser} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} attendance={attendance} terms={terms} />} />
                        <Route path="/exams" element={<StudentExamsView student={currentUser} />} />
                        <Route path="/attendance" element={<StudentAttendanceView student={currentUser} attendance={attendance} />} />
                        <Route path="/certificates" element={<StudentAchievements student={currentUser} attendance={attendance} performance={performance} />} />
                        <Route path="/library" element={<StudentLibrary student={currentUser} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="/profile" element={<StudentProfile student={currentUser} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

// --- Enhanced Dashboard ---
const StudentDashboard = ({ student, attendance, performance, terms }: any) => {
    const navigate = useNavigate();
    const myAtt = attendance.filter((a: any) => a.studentId === student.id);
    const attRate = myAtt.length > 0 ? Math.round((myAtt.filter((a:any)=>a.status==='PRESENT').length / myAtt.length) * 100) : 100;
    const myPerf = performance.filter((p: any) => p.studentId === student.id);
    const avgScore = myPerf.length > 0 ? Math.round((myPerf.reduce((a:any,b:any)=>a+(b.score/b.maxScore),0)/myPerf.length)*100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Success Journey Header */}
            <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Rocket size={200}/></div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h2 className="text-4xl font-black mb-4 tracking-tight">مرحباً {student.name.split(' ')[0]}! 🚀</h2>
                        <p className="text-indigo-200 text-lg font-medium leading-relaxed">أنت تبلي بلاءً حسناً. واصل هذا المستوى المتميز لتحقيق أهدافك.</p>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => navigate('/plan')} className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-xl"><Calendar size={20}/> جدول اليوم</button>
                            <button onClick={() => navigate('/certificates')} className="bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold border border-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2"><Trophy size={20}/> إنجازاتي</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <StatsBox label="معدل الحضور" value={`${attRate}%`} icon={<CheckCircle className="text-emerald-400"/>} color="bg-emerald-500/20" />
                        <StatsBox label="متوسط الدرجات" value={`${avgScore}%`} icon={<TrendingUp className="text-blue-400"/>} color="bg-blue-500/20" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><ListChecks size={24} className="text-indigo-600"/> التقييمات القادمة</h3>
                        <div className="space-y-3">
                            <UpcomingTask title="اختبار الرياضيات الدوري" date="بعد 3 أيام" type="اختبار" color="bg-red-50 text-red-700 border-red-100" />
                            <UpcomingTask title="مشروع الحاسب الآلي" date="هذا الخميس" type="مهمة" color="bg-blue-50 text-blue-700 border-blue-100" />
                            <UpcomingTask title="واجب اللغة الإنجليزية" date="غداً" type="واجب" color="bg-orange-50 text-orange-700 border-orange-100" />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mx-auto mb-4 border-4 border-white shadow-md"><Star size={40} fill="currentColor"/></div>
                        <h3 className="font-black text-xl text-slate-800">نقاط التميز</h3>
                        <p className="text-4xl font-black text-indigo-600 mt-2">{myAtt.filter((a:any)=>a.behaviorStatus==='POSITIVE').length}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-2">نقطة تم منحها من المعلم</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatsBox = ({ label, value, icon, color }: any) => (
    <div className={`${color} backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center`}>
        <div className="mb-2">{icon}</div>
        <div className="text-3xl font-black">{value}</div>
        <div className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">{label}</div>
    </div>
);

const UpcomingTask = ({ title, date, type, color }: any) => (
    <div className={`p-4 rounded-2xl border flex justify-between items-center ${color}`}>
        <div className="flex items-center gap-3">
            <div className="font-bold text-sm">{title}</div>
            <span className="text-[10px] opacity-60 font-black uppercase">[{type}]</span>
        </div>
        <div className="text-xs font-bold">{date}</div>
    </div>
);

// --- Evaluation View (Grades) ---
const StudentEvaluationView = ({ student, performance, attendance, terms }: any) => {
    const [selectedTermId, setSelectedTermId] = useState(terms.find((t:any)=>t.isCurrent)?.id || '');
    const yearConfig = useMemo(() => {
        const saved = localStorage.getItem('works_year_config');
        return saved ? JSON.parse(saved) : { hw: 10, act: 10, att: 5, exam: 20 };
    }, []);

    const myPerf = useMemo(() => performance.filter((p:any) => p.studentId === student.id), [performance, student]);
    const termData = useMemo(() => {
        const term = terms.find((t:any) => t.id === selectedTermId);
        if (!term) return { total: 0, items: [] };
        const items = myPerf.filter(p => p.date >= term.startDate && p.date <= term.endDate);
        return { items };
    }, [selectedTermId, myPerf, terms]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Activity className="text-indigo-600"/> سجل الدرجات التفصيلي</h2>
                <select className="p-2 border rounded-xl bg-slate-50 text-sm font-bold outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                    {terms.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="bg-white rounded-3xl border overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                        <tr><th className="p-4">التاريخ</th><th className="p-4">المهمة / الاختبار</th><th className="p-4 text-center">الدرجة</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {termData.items.map((p:any) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-gray-500">{p.date}</td>
                                <td className="p-4 font-bold text-slate-800">{p.title} <span className="text-[10px] text-indigo-500 ml-2">[{p.subject}]</span></td>
                                <td className="p-4 text-center font-black text-indigo-600 text-lg">{p.score} <span className="text-xs font-normal text-gray-300">/ {p.maxScore}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ... Remaining Profile/WeeklyPlan/Exams sub-components (Keep same as before or refine styling)
const StudentProfile = ({ student }: { student: Student }) => (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
            <div className="h-40 bg-indigo-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={200}/></div>
                <div className="absolute -bottom-14 right-10 w-28 h-28 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-5xl font-black text-indigo-600 border-8 border-white">
                    {student.name.charAt(0)}
                </div>
            </div>
            <div className="pt-20 p-10">
                <h2 className="text-3xl font-black text-slate-900">{student.name}</h2>
                <div className="flex gap-4 mt-10">
                    <div className="bg-slate-50 p-4 rounded-2xl border flex-1"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">الصف</label><div className="font-bold">{student.gradeLevel}</div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl border flex-1"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">الفصل</label><div className="font-bold">{student.className}</div></div>
                </div>
                <div className="mt-6 bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm"><ShieldCheck/></div>
                    <div><label className="block text-[10px] font-bold text-indigo-400 uppercase">رقم الهوية / السجل</label><div className="font-mono font-black text-indigo-900 text-lg">{student.nationalId}</div></div>
                </div>
            </div>
        </div>
    </div>
);

// Placeholder for other sub-components... (Same as provided in last turn but ensure complete)
const StudentWeeklyPlan = ({ student }: { student: Student }) => {
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d.toISOString().split('T')[0];
    });
    const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
    useEffect(() => {
        setPlans(getWeeklyPlans().filter(p => p.classId === student.className && p.weekStartDate === weekStart));
    }, [weekStart, student]);
    const dayNamesAr: Record<string, string> = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><CalendarDays className="text-indigo-600"/> الخطة الأسبوعية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => {
                    const dayPlans = plans.filter(p => p.day === day).sort((a,b) => a.period - b.period);
                    return (
                        <div key={day} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="bg-indigo-600 p-4 text-white font-black text-center">{dayNamesAr[day]}</div>
                            <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[400px]">
                                {dayPlans.map(plan => (
                                    <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2"><span className="bg-white text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded border">حصة {plan.period}</span><h4 className="font-bold text-sm text-slate-800">{plan.subjectName}</h4></div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{plan.lessonTopic}</p>
                                        {plan.homework && <div className="mt-3 text-[10px] text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100 font-bold">🏠 واجب: {plan.homework}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentExamsView = ({ student }: any) => (
    <div className="p-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-gray-200">
        <FileQuestion size={64} className="mx-auto mb-4 opacity-10"/>
        <p className="text-xl font-bold">لا توجد اختبارات مجدولة حالياً</p>
    </div>
);

const StudentAttendanceView = ({ student, attendance }: any) => (
    <div className="bg-white rounded-3xl border overflow-hidden">
        <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                <tr><th className="p-4">التاريخ</th><th className="p-4">الحالة</th><th className="p-4">الملاحظات</th></tr>
            </thead>
            <tbody className="divide-y">
                {attendance.filter((a:any)=>a.studentId === student.id).sort((a:any,b:any)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map((a:any)=>(
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500">{a.date}</td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'PRESENT' ? 'حاضر' : 'غائب'}</span></td>
                        <td className="p-4 text-xs text-gray-500 italic">{a.behaviorNote || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const StudentAchievements = ({ student, attendance, performance }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-10 rounded-3xl border flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner">⭐</div>
            <h4 className="font-bold text-lg">وسام المواظبة</h4>
            <p className="text-xs text-slate-400 mt-1">يمنح للطلاب ذوي الحضور بنسبة 100%</p>
        </div>
    </div>
);

const StudentLibrary = () => <div className="p-20 text-center text-slate-400">لا توجد مصادر تعليمية مضافة</div>;
const StudentMessages = ({ messages }: any) => <div className="space-y-4">{messages.map((m:any)=>(<div key={m.id} className="bg-white p-6 rounded-3xl border shadow-sm border-r-8 border-r-indigo-500"><div className="font-bold text-indigo-700 mb-1">{m.sentBy}</div><p className="text-sm text-slate-600">{m.content}</p></div>))}</div>;

export default StudentPortal;
