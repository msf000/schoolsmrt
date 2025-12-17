
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, Exam, ExamResult, MessageLog, WeeklyPlanItem, ScheduleItem, AttendanceStatus, BehaviorStatus, Question } from '../types';
import { downloadFromSupabase, getAcademicTerms, getExams, getExamResults, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, getSchedules, saveExamResult } from '../services/storageService';
import { 
    User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Library, 
    LayoutGrid, CalendarDays, RefreshCw, X, FileText, PieChart as PieChartIcon, 
    Activity, CheckCircle, Timer, AlertCircle, ChevronLeft, ChevronRight, 
    Check, XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, 
    Medal, ExternalLink, BookOpen, Zap, Target, Star, TrendingUp, Info,
    BrainCircuit, ShieldCheck, Phone, Mail, Rocket, ListChecks, Trophy, PlayCircle
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
        { path: '/exams', label: 'الاختبارات الرقمية', icon: FileQuestion },
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

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] lg:hidden animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}>
                    <aside className="w-64 h-full bg-white flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center">
                            <span className="font-bold">القائمة</span>
                            <button onClick={() => setIsMobileMenuOpen(false)}><X/></button>
                        </div>
                        <nav className="flex-1 p-4 space-y-1">
                            {navItems.map(item => (
                                <button key={item.path} onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${location.pathname === item.path ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                                    <item.icon size={18} />
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}

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

// --- Dashboard ---
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
                            <button onClick={() => navigate('/exams')} className="bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold border border-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2"><FileQuestion size={20}/> الاختبارات</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                             <div className="text-3xl font-black">{attRate}%</div>
                             <div className="text-[10px] opacity-70 font-bold uppercase mt-1">نسبة الحضور</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                             <div className="text-3xl font-black">{avgScore}%</div>
                             <div className="text-[10px] opacity-70 font-bold uppercase mt-1">متوسط الدرجات</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><TrendingUp size={24} className="text-indigo-600"/> تقدم المستوى</h3>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={myPerf.slice(-7).map((p:any)=>({name: p.title, score: Math.round((p.score/p.maxScore)*100)}))}>
                                    <defs><linearGradient id="colS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fill="url(#colS)" />
                                </AreaChart>
                             </ResponsiveContainer>
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

// --- Exams View (Functional) ---
const StudentExamsView = ({ student }: { student: Student }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [results, setResults] = useState<ExamResult[]>([]);
    const [activeExam, setActiveExam] = useState<Exam | null>(null);

    useEffect(() => {
        const allExams = getExams().filter(e => e.isActive && (e.gradeLevel === student.gradeLevel || e.gradeLevel === 'عام'));
        setExams(allExams);
        setResults(getExamResults().filter(r => r.studentId === student.id));
    }, [student]);

    if (activeExam) {
        return <ExamPlayer exam={activeExam} student={student} onComplete={() => setActiveExam(null)} />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><FileQuestion className="text-indigo-600"/> الاختبارات الإلكترونية</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(exam => {
                    const myResult = results.find(r => r.examId === exam.id);
                    return (
                        <div key={exam.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-300 transition-all">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BookOpen size={24}/></div>
                                    {myResult ? (
                                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">تم الإكمال</div>
                                    ) : (
                                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">متاح للحل</div>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">{exam.title}</h3>
                                <p className="text-sm text-slate-500 mb-4">{exam.subject} • {exam.questions.length} أسئلة • {exam.durationMinutes} دقيقة</p>
                            </div>
                            
                            {myResult ? (
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">درجتك</p>
                                        <p className="text-2xl font-black text-indigo-600">{myResult.score} / {myResult.totalScore}</p>
                                    </div>
                                    <button onClick={() => alert('ميزة مراجعة الإجابات ستتوفر قريباً')} className="text-sm font-bold text-slate-400 hover:text-indigo-600 underline">عرض التفاصيل</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setActiveExam(exam)}
                                    className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={20}/> ابدأ الاختبار الآن
                                </button>
                            )}
                        </div>
                    );
                })}
                {exams.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[3rem]">لا توجد اختبارات متاحة حالياً</div>}
            </div>
        </div>
    );
};

// --- Exam Player Component ---
const ExamPlayer = ({ exam, student, onComplete }: { exam: Exam, student: Student, onComplete: () => void }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        let score = 0;
        let total = 0;
        exam.questions.forEach(q => {
            total += q.points;
            if (answers[q.id] === q.correctAnswer) score += q.points;
        });

        const result: ExamResult = {
            id: `res-${Date.now()}`,
            examId: exam.id,
            studentId: student.id,
            studentName: student.name,
            score,
            totalScore: total,
            date: new Date().toISOString(),
            answers
        };

        saveExamResult(result);
        setTimeout(() => {
            alert(`تم تسليم الاختبار بنجاح! درجتك: ${score} من ${total}`);
            onComplete();
        }, 1000);
    };

    const q = exam.questions[currentIdx];
    const progress = ((currentIdx + 1) / exam.questions.length) * 100;

    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex flex-col text-white animate-fade-in" dir="rtl">
            {/* Exam Header */}
            <div className="p-6 bg-slate-800 border-b border-white/10 flex justify-between items-center shadow-xl">
                <div>
                    <h2 className="text-xl font-black">{exam.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{exam.subject}</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">الوقت المتبقي</span>
                    </div>
                    <button onClick={() => { if(confirm('هل تريد حقاً الخروج؟ لن يتم حفظ إجاباتك.')) onComplete(); }} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
                <div className="w-full max-w-3xl">
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-indigo-400">سؤال {currentIdx + 1} من {exam.questions.length}</span>
                            <span className="text-sm font-bold text-slate-500">درجة السؤال: {q.points}</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl backdrop-blur-xl animate-slide-up">
                        <h3 className="text-2xl md:text-3xl font-bold mb-10 leading-relaxed text-right">{q.text}</h3>
                        {q.imageUrl && <img src={q.imageUrl} className="max-h-60 mx-auto rounded-2xl mb-8 border border-white/10" />}

                        <div className="grid grid-cols-1 gap-4">
                            {q.options.map((opt, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setAnswers({...answers, [q.id]: opt})}
                                    className={`p-6 rounded-3xl text-right text-lg font-bold transition-all border-2 flex justify-between items-center group ${
                                        answers[q.id] === opt 
                                        ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    <span>{opt}</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[q.id] === opt ? 'bg-white border-white text-indigo-600' : 'border-white/20'}`}>
                                        {answers[q.id] === opt && <Check size={14}/>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Footer */}
            <div className="p-6 bg-slate-800 border-t border-white/10 flex justify-between items-center">
                <button 
                    disabled={currentIdx === 0} 
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    className="px-8 py-3 rounded-2xl font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all flex items-center gap-2"
                >
                    <ChevronRight size={20}/> السابق
                </button>

                {currentIdx < exam.questions.length - 1 ? (
                    <button 
                        onClick={() => setCurrentIdx(prev => prev + 1)}
                        className="px-8 py-3 bg-indigo-600 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                        التالي <ChevronLeft size={20}/>
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-12 py-3 bg-green-600 rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
                    >
                        {isSubmitting ? 'جاري الإرسال...' : 'إنهاء وتسليم الإجابات'} <CheckCircle size={20}/>
                    </button>
                )}
            </div>
        </div>
    );
};

const StudentEvaluationView = ({ student, performance, attendance, terms }: any) => {
    const [selectedTermId, setSelectedTermId] = useState(terms.find((t:any)=>t.isCurrent)?.id || '');
    const yearConfig = useMemo(() => {
        const saved = localStorage.getItem('works_year_config');
        return saved ? JSON.parse(saved) : { hw: 10, act: 10, att: 5, exam: 20 };
    }, []);

    const myPerf = useMemo(() => performance.filter((p:any) => p.studentId === student.id), [performance, student]);
    const termData = useMemo(() => {
        const term = terms.find((t:any) => t.id === selectedTermId);
        if (!term) return { items: [] };
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
                        {termData.items.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-slate-400">لا توجد درجات مرصودة لهذه الفترة</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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
                                {dayPlans.length > 0 ? dayPlans.map(plan => (
                                    <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2"><span className="bg-white text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded border">حصة {plan.period}</span><h4 className="font-bold text-sm text-slate-800">{plan.subjectName}</h4></div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{plan.lessonTopic}</p>
                                        {plan.homework && <div className="mt-3 text-[10px] text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100 font-bold">🏠 واجب: {plan.homework}</div>}
                                    </div>
                                )) : <div className="text-center py-10 text-slate-300 text-xs italic">لا توجد حصص مسجلة</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentAttendanceView = ({ student, attendance }: any) => (
    <div className="bg-white rounded-3xl border overflow-hidden">
        <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                <tr><th className="p-4">التاريخ</th><th className="p-4">الحالة</th><th className="p-4">الملاحظات</th></tr>
            </thead>
            <tbody className="divide-y">
                {attendance.filter((a:any)=>a.studentId === student.id).sort((a:any,b:any)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map((a:any)=>(
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500">{formatDualDate(a.date)}</td>
                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'PRESENT' ? 'حاضر' : a.status === 'ABSENT' ? 'غائب' : 'متأخر'}</span></td>
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
