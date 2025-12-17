import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, ReportHeaderConfig, Exam, ExamResult, Question, LessonLink, MessageLog, WeeklyPlanItem, ScheduleItem } from '../types';
// Added getPerformance to imports to fix the error on line 183
import { downloadFromSupabase, getAssignments, getAcademicTerms, getReportHeaderConfig, getExams, getExamResults, saveExamResult, addPerformance, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, getSchedules, getCustomTables } from '../services/storageService';
import { User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Table, Library, LayoutGrid, CalendarDays, RefreshCw, X, Printer, FileText, PieChart as PieChartIcon, Activity, CheckCircle, Timer, AlertCircle, ChevronLeft, ChevronRight, Check, XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, Medal, ExternalLink, BookOpen, Home, Phone, Mail, Star, Zap, Target } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
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
        { path: '/evaluation', label: 'الدرجات والتقارير', icon: Activity },
        { path: '/exams', label: 'الاختبارات والواجبات', icon: FileQuestion },
        { path: '/attendance', label: 'سجل الحضور', icon: Calendar },
        { path: '/library', label: 'المكتبة والمصادر', icon: Library },
        { path: '/messages', label: 'التنبيهات', icon: Bell, badge: messages.length > 0 ? messages.length : undefined },
        { path: '/certificates', label: 'الأوسمة والتقدير', icon: Award },
        { path: '/timetable', label: 'الجدول الدراسي', icon: Clock },
    ];

    const currentPath = location.pathname;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-right font-sans" dir="rtl">
            <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm z-30 print:hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg ring-4 ring-indigo-50">
                        {currentUser.name.charAt(0)}
                    </div>
                    <h1 className="text-lg font-bold text-gray-800 text-center">{currentUser.name}</h1>
                    <p className="text-xs text-gray-500 font-medium">{currentUser.className}</p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                currentPath === item.path 
                                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-3"><item.icon size={20} /><span>{item.label}</span></div>
                            {item.badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t">
                    <button onClick={handleRefresh} disabled={isSyncing} className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all font-medium mb-2">
                        <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} /><span>تحديث</span>
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium"><LogOut size={20} /><span>خروج</span></button>
                </div>
            </aside>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center"><h1 className="text-xl font-bold">بوابة الطالب</h1><button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button></div>
                        <nav className="flex-1 p-4 space-y-2">
                            {navItems.map(item => (
                                <button key={item.path} onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }} className={`w-full flex justify-between p-4 rounded-xl ${currentPath === item.path ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-gray-600'}`}>
                                    <div className="flex items-center gap-3"><item.icon size={20} /><span>{item.label}</span></div>
                                    {item.badge && <span className="bg-red-500 text-white text-xs px-2 rounded-full">{item.badge}</span>}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="md:hidden bg-white p-4 border-b flex justify-between items-center shadow-sm shrink-0">
                    <div className="font-bold text-gray-800 flex items-center gap-2"><Award className="text-indigo-600"/> بوابة الطالب</div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600"><Menu size={24}/></button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 custom-scrollbar print:p-0 print:bg-white">
                    <Routes>
                        <Route path="/" element={<StudentDashboard student={currentUser} attendance={attendance} performance={performance} terms={terms} />} />
                        <Route path="/plan" element={<StudentWeeklyPlan student={currentUser} />} />
                        <Route path="/attendance" element={<StudentAttendanceView student={currentUser} attendance={attendance} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} terms={terms} />} />
                        <Route path="/timetable" element={<StudentTimetable student={currentUser} />} />
                        <Route path="/exams" element={<StudentExamsView student={currentUser} />} />
                        <Route path="/library" element={<StudentLibrary student={currentUser} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="/certificates" element={<StudentAchievements student={currentUser} attendance={attendance} performance={performance} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

const StudentDashboard = ({ student, attendance, performance, terms }: any) => {
    const myAtt = attendance.filter((a: any) => a.studentId === student.id);
    const absent = myAtt.filter((a: any) => a.status === 'ABSENT').length;
    const present = myAtt.filter((a: any) => a.status === 'PRESENT').length;
    const attRate = myAtt.length > 0 ? Math.round((present / myAtt.length) * 100) : 100;
    const myPerf = performance.filter((p: any) => p.studentId === student.id);
    const avgScore = myPerf.length > 0 ? Math.round((myPerf.reduce((a:any,b:any)=>a+(b.score/b.maxScore),0)/myPerf.length)*100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100}/></div>
                <h2 className="text-2xl font-bold mb-1">أهلاً بك، {student.name.split(' ')[0]} </h2>
                <p className="opacity-80 text-sm">مستواك الحالي: {avgScore >= 90 ? 'ممتاز جداً 🌟' : avgScore >= 80 ? 'جيد جداً 👍' : 'استمر في الاجتهاد 💪'}</p>
                <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm"><div className="text-xl font-black">{attRate}%</div><div className="text-[10px] opacity-75">الحضور</div></div>
                    <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm"><div className="text-xl font-black">{avgScore}%</div><div className="text-[10px] opacity-75">المعدل</div></div>
                    <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm"><div className="text-xl font-black">{myPerf.length}</div><div className="text-[10px] opacity-75">التقييمات</div></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border shadow-sm h-full">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Target size={18} className="text-indigo-600"/> التحديات والأوسمة</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2 rounded-xl text-center border ${attRate === 100 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100 opacity-40 grayscale'}`}>
                            <div className="text-2xl mb-1">🔥</div><div className="text-[10px] font-bold">مواظب</div>
                        </div>
                        <div className={`p-2 rounded-xl text-center border ${avgScore >= 90 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100 opacity-40 grayscale'}`}>
                            <div className="text-2xl mb-1">⭐</div><div className="text-[10px] font-bold">متفوق</div>
                        </div>
                        <div className={`p-2 rounded-xl text-center border ${attendance.some((a:any)=>a.studentId===student.id && a.behaviorStatus==='POSITIVE') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 opacity-40 grayscale'}`}>
                            <div className="text-2xl mb-1">🛡️</div><div className="text-[10px] font-bold">منضبط</div>
                        </div>
                    </div>
                    <button onClick={() => window.location.href='/certificates'} className="w-full mt-4 text-xs font-bold text-indigo-600 hover:underline">عرض جميع الأوسمة</button>
                </div>
                <div className="bg-white p-5 rounded-2xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Bell size={18} className="text-red-500"/> آخر التنبيهات</h3>
                    <div className="space-y-3">
                         <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-medium border border-red-100">لديك اختبار رياضيات غداً الساعة 9:00 ص</div>
                         <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium border border-blue-100">تم رصد درجة النشاط اللاصفي: 5/5</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Fix: Adding missing StudentExamsView component
const StudentExamsView = ({ student }: { student: Student }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [results, setResults] = useState<PerformanceRecord[]>([]);

    useEffect(() => {
        setExams(getExams().filter(e => e.isActive && (e.gradeLevel === student.gradeLevel || !e.gradeLevel || e.gradeLevel === 'عام')));
        // Fixed line 183: Use getPerformance() from imports to fix "Cannot find name 'getPerformance'"
        setResults(getPerformance().filter(p => p.studentId === student.id));
    }, [student]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileQuestion className="text-indigo-600"/> الاختبارات المتاحة</h3>
            <div className="grid gap-4">
                {exams.map(exam => {
                    const result = results.find(r => r.notes === exam.id || r.title.includes(exam.title));
                    return (
                        <div key={exam.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                            <div>
                                <h4 className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{exam.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">{exam.subject} • {exam.durationMinutes} دقيقة</p>
                            </div>
                            <div>
                                {result ? (
                                    <div className="text-center">
                                        <span className="text-green-600 font-bold text-lg">{result.score}</span>
                                        <span className="text-xs text-gray-400"> / {result.maxScore}</span>
                                    </div>
                                ) : (
                                    <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all">ابدأ الاختبار</button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {exams.length === 0 && <div className="p-20 text-center text-gray-400 bg-white rounded-xl border border-dashed">لا توجد اختبارات متاحة حالياً</div>}
            </div>
        </div>
    );
};

const StudentAchievements = ({ student, attendance, performance }: any) => {
    const badges = useMemo(() => {
        const list = [];
        const myAtt = attendance.filter((a: any) => a.studentId === student.id);
        const myPerf = performance.filter((p: any) => p.studentId === student.id);
        const avg = myPerf.length > 0 ? Math.round((myPerf.reduce((a:any,b:any)=>a+(b.score/b.maxScore),0)/myPerf.length)*100) : 0;
        
        if (myAtt.length > 15 && myAtt.filter((a: any) => a.status === 'ABSENT').length === 0) list.push({ id: '1', title: 'وسام الالتزام الكامل', icon: '💎', desc: 'لم تغب أي يوم خلال هذا الفصل' });
        if (avg >= 95) list.push({ id: '2', title: 'وسام العبقري', icon: '🧠', desc: 'حصلت على معدل أعلى من 95%' });
        if (attendance.filter((a:any)=>a.studentId===student.id && a.behaviorStatus==='POSITIVE').length >= 5) list.push({ id: '3', title: 'وسام الأخلاق الحسنة', icon: '🌟', desc: 'حصلت على 5 ملاحظات إيجابية من المعلم' });
        
        return list;
    }, [attendance, performance, student]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-2"><Medal className="text-orange-500" size={28}/> الأوسمة والجوائز الرقمية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {badges.map(b => (
                    <div key={b.id} className="bg-white p-8 rounded-3xl border-2 border-indigo-50 shadow-sm flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-xl group">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors">{b.icon}</div>
                        <h4 className="text-lg font-black text-gray-800 mb-2">{b.title}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                    </div>
                ))}
                {badges.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <Star size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="text-lg font-bold">بانتظار وسامك الأول!</p>
                        <p className="text-sm">اجتهد في الحضور والمشاركة للحصول على الأوسمة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ... Rest of the portal components remain the same ...
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
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-indigo-600"/> الخطة الأسبوعية</h2>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-white rounded"><ChevronRight size={16}/></button>
                    <span className="text-xs font-bold w-24 text-center">{weekStart}</span>
                    <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-white rounded"><ChevronLeft size={16}/></button>
                </div>
            </div>
            <div className="grid gap-4">
                {days.map(day => {
                    const dayPlans = plans.filter(p => p.day === day).sort((a,b) => a.period - b.period);
                    return (
                        <div key={day} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <div className="bg-indigo-50 p-3 border-b font-bold text-indigo-800 flex justify-between items-center">
                                <span>{dayNamesAr[day]}</span>
                                <span className="text-xs font-normal opacity-70">{dayPlans.length} حصص</span>
                            </div>
                            <div className="divide-y">
                                {dayPlans.length > 0 ? dayPlans.map(plan => (
                                    <div key={plan.id} className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                        <div className="flex gap-4 items-center">
                                            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">حصة {plan.period}</span>
                                            <h4 className="font-bold text-gray-800">{plan.subjectName}</h4>
                                        </div>
                                        <div className="flex-1 text-sm bg-gray-50 p-2 rounded">
                                            <b>الدرس:</b> {plan.lessonTopic}
                                        </div>
                                        <div className="flex-1 text-sm bg-orange-50 p-2 rounded text-orange-800">
                                            <b>الواجب:</b> {plan.homework || 'لا يوجد'}
                                        </div>
                                    </div>
                                )) : <div className="p-4 text-center text-gray-400 text-xs italic">لا توجد خطة مسجلة</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentAttendanceView = ({ student, attendance }: { student: Student, attendance: AttendanceRecord[] }) => {
    const myAtt = useMemo(() => attendance.filter(a => a.studentId === student.id).sort((a,b)=>new Date(b.date).getTime() - new Date(a.date).getTime()), [attendance, student]);
    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Calendar className="text-indigo-600"/> سجل الحضور والغياب</h3>
            <div className="divide-y overflow-auto max-h-[60vh] custom-scrollbar">
                {myAtt.map(a => (
                    <div key={a.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-sm">{formatDualDate(a.date).split('|')[0]}</span>
                            <span className="text-xs text-gray-400">{a.subject} • حصة {a.period}</span>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : a.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {a.status === 'PRESENT' ? 'حاضر' : a.status === 'ABSENT' ? 'غائب' : 'تأخر'}
                        </span>
                    </div>
                ))}
                {myAtt.length === 0 && <div className="p-10 text-center text-gray-400">لا يوجد سجلات حضور</div>}
            </div>
        </div>
    );
};

const StudentEvaluationView = ({ student, performance, terms }: { student: Student, performance: PerformanceRecord[], terms: AcademicTerm[] }) => {
    const myPerf = performance.filter(p => p.studentId === student.id);
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Award className="text-indigo-600"/> سجل الدرجات التفصيلي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPerf.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                        <div>
                            <h4 className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{p.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">{p.subject} • {p.date}</p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-indigo-600">{p.score}</div>
                            <div className="text-[10px] text-gray-400 font-bold">من {p.maxScore}</div>
                        </div>
                    </div>
                ))}
                {myPerf.length === 0 && <div className="col-span-full p-20 text-center text-gray-400">لم ترصد أي درجات بعد</div>}
            </div>
        </div>
    );
};

const StudentTimetable = ({ student }: { student: Student }) => {
    const schedules = getSchedules().filter(s => s.classId === student.className);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr: Record<string, string> = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden p-6 space-y-6">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Clock className="text-indigo-600"/> الجدول الدراسي</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse min-w-[600px]">
                    <thead><tr className="bg-gray-800 text-white"><th className="p-4">اليوم</th>{[1,2,3,4,5,6,7,8].map(p=><th key={p}>حصة {p}</th>)}</tr></thead>
                    <tbody>
                        {days.map(day=>(
                            <tr key={day} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-bold bg-gray-50">{dayNamesAr[day]}</td>
                                {[1,2,3,4,5,6,7,8].map(period=>{
                                    const s = schedules.find(x=>x.day===day && x.period===period);
                                    return <td key={period} className="p-2 h-16"><div className={s ? "bg-indigo-50 text-indigo-700 rounded p-1 text-xs font-bold border border-indigo-100" : "text-gray-200"}>{s?.subjectName || '-'}</div></td>
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StudentLibrary = ({ student }: { student: Student }) => {
    const links = getLessonLinks().filter(l => (!l.gradeLevel || l.gradeLevel === student.gradeLevel) && (!l.className || l.className === student.className));
    return (
        <div className="space-y-6">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Library className="text-indigo-600"/> مكتبة المصادر</h3>
            <div className="grid gap-4">
                {links.map(l=>(
                    <a key={l.id} href={l.url} target="_blank" className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{l.url.includes('youtube') ? <Video/> : <LinkIcon/>}</div>
                        <div><h4 className="font-bold text-gray-800">{l.title}</h4><p className="text-xs text-gray-400 mt-1">{l.url}</p></div>
                    </a>
                ))}
            </div>
        </div>
    );
};

const StudentMessages = ({ messages }: { messages: MessageLog[] }) => (
    <div className="space-y-6">
        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Bell className="text-red-500"/> التنبيهات والرسائل</h3>
        <div className="space-y-4">
            {messages.map(m=>(
                <div key={m.id} className="bg-white p-5 rounded-2xl border-r-4 border-indigo-500 shadow-sm">
                    <div className="flex justify-between items-start mb-2"><span className="font-bold text-gray-800 text-sm">{m.sentBy}</span><span className="text-[10px] text-gray-400">{m.date.split('T')[0]}</span></div>
                    <p className="text-sm text-gray-600 leading-relaxed">{m.content}</p>
                </div>
            ))}
        </div>
    </div>
);

export default StudentPortal;