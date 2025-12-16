
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, ReportHeaderConfig, Exam, ExamResult, Question, LessonLink, MessageLog, WeeklyPlanItem, ScheduleItem } from '../types';
import { downloadFromSupabase, getAssignments, getAcademicTerms, getReportHeaderConfig, getExams, getExamResults, saveExamResult, addPerformance, getLessonLinks, getMessages, getWeeklyPlans, getSchedules, getCustomTables } from '../services/storageService';
import { User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Table, Library, LayoutGrid, CalendarDays, RefreshCw, X, Printer, FileText, PieChart as PieChartIcon, Activity, CheckCircle, Timer, AlertCircle, ChevronLeft, ChevronRight, Check, XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, Medal, ExternalLink, BookOpen, Home, Phone, Mail } from 'lucide-react';
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
        // Load messages for this student
        const allMsgs = getMessages();
        const myMsgs = allMsgs.filter(m => m.studentId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
        { path: '/custom-records', label: 'السجلات الخاصة', icon: Table },
        { path: '/library', label: 'المكتبة والمصادر', icon: Library },
        { path: '/messages', label: 'الرسائل والتنبيهات', icon: Bell, badge: messages.length > 0 ? messages.length : undefined },
        { path: '/certificates', label: 'الشهادات والتقدير', icon: Award },
        { path: '/timetable', label: 'الجدول الدراسي', icon: Clock },
    ];

    const currentPath = location.pathname;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-right font-sans" dir="rtl">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm z-30 print:hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg ring-4 ring-teal-50">
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
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${
                                currentPath === item.path 
                                    ? 'bg-teal-50 text-teal-700 font-bold border border-teal-100 shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t space-y-2">
                    <button 
                        onClick={handleRefresh} 
                        disabled={isSyncing}
                        className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all font-medium"
                    >
                        <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} /> 
                        <span>{isSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium">
                        <LogOut size={20} /> <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 md:hidden backdrop-blur-sm print:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="p-6 flex justify-between items-center border-b bg-teal-600 text-white">
                            <h1 className="text-xl font-bold">بوابة الطالب</h1>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={24} /></button>
                        </div>
                        <div className="p-4 border-b bg-teal-50 flex items-center gap-3">
                             <div className="w-10 h-10 bg-teal-200 rounded-full flex items-center justify-center text-teal-800 font-bold">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">{currentUser.className}</p>
                            </div>
                        </div>
                        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                            {navItems.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                        currentPath === item.path ? 'bg-teal-100 text-teal-800 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} />
                                        <span>{item.label}</span>
                                    </div>
                                    {item.badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                                </button>
                            ))}
                            <button onClick={handleRefresh} className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 mt-4 rounded-xl font-bold">
                                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} /> 
                                <span>تحديث البيانات</span>
                            </button>
                            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 border-t mt-2 hover:bg-red-50 rounded-xl transition-colors">
                                <LogOut size={20} /> <span>تسجيل الخروج</span>
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative mb-16 md:mb-0 print:mb-0 print:overflow-visible">
                <header className="md:hidden bg-white p-4 border-b flex justify-between items-center shadow-sm z-20 shrink-0 print:hidden">
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        <Award className="text-teal-600"/> بوابة الطالب
                    </div>
                    <div className="flex items-center gap-2">
                        {messages.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Bell size={12}/> {messages.length}</span>}
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Menu size={24}/>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50 custom-scrollbar w-full print:p-0 print:bg-white print:overflow-visible">
                    <Routes>
                        <Route path="/" element={<StudentDashboard student={currentUser} attendance={attendance} performance={performance} onViewChange={(v: string) => navigate(v === 'TIMETABLE' ? '/timetable' : v === 'EVALUATION' ? '/evaluation' : '/')} terms={terms} />} />
                        <Route path="/plan" element={<StudentWeeklyPlan student={currentUser} />} />
                        <Route path="/profile" element={<StudentProfile student={currentUser} />} />
                        <Route path="/attendance" element={<StudentAttendanceView student={currentUser} attendance={attendance} terms={terms} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} attendance={attendance} terms={terms} />} />
                        <Route path="/timetable" element={<StudentTimetable student={currentUser} />} />
                        <Route path="/custom-records" element={<StudentCustomRecords student={currentUser} />} />
                        <Route path="/exams" element={<StudentExamsView student={currentUser} />} />
                        <Route path="/library" element={<StudentLibrary student={currentUser} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="/certificates" element={<StudentCertificates student={currentUser} attendance={attendance} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] print:hidden">
                <button onClick={() => navigate('/')} className={`flex-col flex items-center gap-1 p-2 rounded-lg transition-colors ${currentPath === '/' ? 'text-teal-600 bg-teal-50' : 'text-gray-400'}`}>
                    <LayoutGrid size={20} />
                    <span className="text-[10px] font-bold">الرئيسية</span>
                </button>
                <button onClick={() => navigate('/timetable')} className={`flex-col flex items-center gap-1 p-2 rounded-lg transition-colors ${currentPath === '/timetable' ? 'text-teal-600 bg-teal-50' : 'text-gray-400'}`}>
                    <Clock size={20} />
                    <span className="text-[10px] font-bold">الجدول</span>
                </button>
                <button onClick={() => navigate('/exams')} className={`flex-col flex items-center gap-1 p-2 rounded-lg transition-colors ${currentPath === '/exams' ? 'text-teal-600 bg-teal-50' : 'text-gray-400'}`}>
                    <FileQuestion size={20} />
                    <span className="text-[10px] font-bold">واجبات</span>
                </button>
                <button onClick={() => setIsMobileMenuOpen(true)} className={`flex-col flex items-center gap-1 p-2 rounded-lg transition-colors text-gray-400 hover:text-teal-600`}>
                    <Menu size={20} />
                    <span className="text-[10px] font-bold">القائمة</span>
                </button>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const StudentDashboard = ({ student, attendance, performance, onViewChange, terms }: any) => {
    // Basic stats calculation
    const myAtt = attendance.filter((a: any) => a.studentId === student.id);
    const absent = myAtt.filter((a: any) => a.status === 'ABSENT').length;
    const present = myAtt.filter((a: any) => a.status === 'PRESENT').length;
    const attRate = myAtt.length > 0 ? Math.round((present / myAtt.length) * 100) : 100;

    const myPerf = performance.filter((p: any) => p.studentId === student.id);
    const totalScore = myPerf.reduce((a: any, b: any) => a + (b.score/b.maxScore), 0);
    const avgScore = myPerf.length > 0 ? Math.round((totalScore / myPerf.length) * 100) : 0;

    const pieData = [
        { name: 'حضور', value: present > 0 ? present : 1, color: '#10b981' },
        { name: 'غياب', value: absent, color: '#ef4444' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">مرحباً، {student.name} 👋</h2>
                <p className="opacity-90">نتمنى لك يوماً دراسياً مليئاً بالإنجاز!</p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-2xl font-black">{attRate}%</div>
                        <div className="text-xs opacity-75">نسبة الحضور</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-2xl font-black">{avgScore}%</div>
                        <div className="text-xs opacity-75">المعدل العام</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-2xl font-black">{myPerf.length}</div>
                        <div className="text-xs opacity-75">عدد التقييمات</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PieChartIcon size={18} className="text-teal-600"/> ملخص الحضور</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-4">
                    <div onClick={() => onViewChange('TIMETABLE')} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                        <div>
                            <h3 className="font-bold text-gray-800">الجدول الدراسي</h3>
                            <p className="text-xs text-gray-500 mt-1">عرض جدول الحصص اليومي</p>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-full group-hover:scale-110 transition-transform"><Clock size={24}/></div>
                    </div>
                    <div onClick={() => onViewChange('EVALUATION')} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                        <div>
                            <h3 className="font-bold text-gray-800">كشف الدرجات</h3>
                            <p className="text-xs text-gray-500 mt-1">تفاصيل الدرجات والتقييمات</p>
                        </div>
                        <div className="bg-purple-50 text-purple-600 p-3 rounded-full group-hover:scale-110 transition-transform"><Award size={24}/></div>
                    </div>
                </div>
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
        // Fetch ALL plans then filter by class & week
        // Note: Ideally API filters this, but for local storage we filter client side
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
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-teal-600"/> الخطة الأسبوعية</h2>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-white rounded shadow-sm"><ChevronRight size={16}/></button>
                    <span className="text-xs font-bold w-24 text-center">{formatDualDate(weekStart).split('|')[0]}</span>
                    <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-white rounded shadow-sm"><ChevronLeft size={16}/></button>
                </div>
            </div>

            <div className="grid gap-4">
                {days.map(day => {
                    const dayPlans = plans.filter(p => p.day === day).sort((a,b) => a.period - b.period);
                    return (
                        <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-teal-50/50 p-3 border-b border-teal-100 font-bold text-teal-800 flex justify-between items-center">
                                <span className="flex items-center gap-2"><Calendar size={16}/> {dayNamesAr[day]}</span>
                                <span className="text-xs font-normal bg-white px-2 py-0.5 rounded text-teal-600 border border-teal-100">{dayPlans.length} حصص</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {dayPlans.length > 0 ? dayPlans.map(plan => (
                                    <div key={plan.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">حصة {plan.period}</span>
                                                <h4 className="font-bold text-gray-800 text-lg">{plan.subjectName}</h4>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                <span className="text-blue-600 font-bold block text-xs mb-1 flex items-center gap-1"><BookOpen size={12}/> موضوع الدرس:</span>
                                                <p className="text-gray-800 font-medium">{plan.lessonTopic}</p>
                                            </div>
                                            {plan.homework && (
                                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                                    <span className="text-orange-600 font-bold block text-xs mb-1 flex items-center gap-1"><Home size={12}/> الواجب المنزلي:</span>
                                                    <p className="text-gray-800 font-medium">{plan.homework}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="p-6 text-center text-gray-400 text-xs italic">لا توجد خطة مسجلة لهذا اليوم</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StudentTimetable = ({ student }: { student: Student }) => { 
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    
    useEffect(() => {
        const allSchedules = getSchedules();
        const filtered = allSchedules.filter(s => s.classId === student.className);
        setSchedules(filtered);
    }, [student]);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr: Record<string, string> = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock className="text-teal-600"/> الجدول الدراسي: {student.className}</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-center border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-800 text-white text-sm">
                            <th className="p-4 border-l border-gray-700 w-24">اليوم</th>
                            {periods.map(p => (
                                <th key={p} className="p-3 border-l border-gray-700">حصة {p}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day} className="border-b hover:bg-gray-50">
                                <td className="p-3 border-l font-bold text-gray-700 bg-gray-50">{dayNamesAr[day]}</td>
                                {periods.map(period => {
                                    const session = schedules.find(s => s.day === day && s.period === period);
                                    return (
                                        <td key={period} className="p-2 border-l border-gray-100 text-sm h-16">
                                            {session ? (
                                                <div className="bg-teal-50 text-teal-800 rounded p-1 font-bold shadow-sm border border-teal-100">
                                                    {session.subjectName}
                                                </div>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StudentProfile = ({ student }: { student: Student }) => { 
    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User className="text-teal-600"/> الملف الشخصي</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-500">الاسم</label><div className="font-bold">{student.name}</div></div>
                    <div><label className="text-xs text-gray-500">الهوية</label><div className="font-bold font-mono">{student.nationalId}</div></div>
                    <div><label className="text-xs text-gray-500">الصف</label><div className="font-bold">{student.gradeLevel} - {student.className}</div></div>
                    <div><label className="text-xs text-gray-500">ولي الأمر</label><div className="font-bold">{student.parentName || 'غير مسجل'}</div></div>
                    <div><label className="text-xs text-gray-500">جوال ولي الأمر</label><div className="font-bold font-mono flex items-center gap-2"><Phone size={14}/> {student.parentPhone || 'غير مسجل'}</div></div>
                    <div><label className="text-xs text-gray-500">بريد الطالب</label><div className="font-bold font-mono flex items-center gap-2"><Mail size={14}/> {student.email || 'غير مسجل'}</div></div>
                </div>
            </div>
        </div>
    ); 
};

const StudentCustomRecords = ({ student }: { student: Student }) => {
    const [records, setRecords] = useState<{tableName: string, data: any}[]>([]);

    useEffect(() => {
        const allTables = getCustomTables(); 
        const myRecords: {tableName: string, data: any}[] = [];

        allTables.forEach(table => {
            // Find row for student (Match ID or Name)
            const row = table.rows.find(r => {
                const values = Object.values(r).map(v => String(v).trim());
                if (student.nationalId && values.includes(student.nationalId)) return true;
                if (values.includes(student.name.trim())) return true;
                return false;
            });

            if (row) {
                myRecords.push({ tableName: table.name, data: row });
            }
        });

        setRecords(myRecords);
    }, [student]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Table className="text-teal-600"/> السجلات الخاصة
            </h3>
            {records.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {records.map((rec, i) => (
                        <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="font-bold text-indigo-700 mb-4 border-b pb-2">{rec.tableName}</h4>
                            <div className="space-y-2 text-sm">
                                {Object.entries(rec.data).map(([key, val]) => {
                                    if (key === 'id' || key.includes('HYPERLINK')) return null;
                                    return (
                                        <div key={key} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                            <span className="text-gray-500 font-medium">{key}</span>
                                            <span className="font-bold text-gray-800">{String(val)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                    <Table size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>لا توجد سجلات خاصة مرتبطة بك حالياً</p>
                </div>
            )}
        </div>
    );
};

const StudentAttendanceView = ({ student, attendance, terms }: { student: Student, attendance: AttendanceRecord[], terms: AcademicTerm[] }) => { 
    const [view, setView] = useState<'LIST' | 'CALENDAR'>('CALENDAR');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const myAtt = useMemo(() => attendance.filter(a => a.studentId === student.id), [attendance, student]);

    const getDayStatus = (day: number) => {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = myAtt.find(a => a.date === dateStr);
        return record ? record.status : null;
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 Sunday

    const changeMonth = (dir: number) => {
        const d = new Date(currentMonth);
        d.setMonth(d.getMonth() + dir);
        setCurrentMonth(d);
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden space-y-4 p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="text-teal-600"/> سجل الحضور</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setView('CALENDAR')} className={`px-3 py-1 text-xs font-bold rounded ${view === 'CALENDAR' ? 'bg-white shadow' : 'text-gray-500'}`}>تقويم</button>
                    <button onClick={() => setView('LIST')} className={`px-3 py-1 text-xs font-bold rounded ${view === 'LIST' ? 'bg-white shadow' : 'text-gray-500'}`}>قائمة</button>
                </div>
            </div>

            {view === 'CALENDAR' ? (
                <div className="border rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
                        <button onClick={() => changeMonth(-1)}><ChevronRight size={20} className="text-gray-500"/></button>
                        <span className="font-bold text-gray-700">{currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => changeMonth(1)}><ChevronLeft size={20} className="text-gray-500"/></button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 bg-gray-50 border-b">
                        <div className="p-2">الأحد</div><div className="p-2">الاثنين</div><div className="p-2">الثلاثاء</div><div className="p-2">الأربعاء</div><div className="p-2">الخميس</div><div className="p-2">الجمعة</div><div className="p-2">السبت</div>
                    </div>
                    <div className="grid grid-cols-7 text-center">
                        {Array.from({length: startDay}).map((_, i) => <div key={`empty-${i}`} className="h-16 bg-gray-50/30 border-b border-l"></div>)}
                        {Array.from({length: daysInMonth}).map((_, i) => {
                            const day = i + 1;
                            const status = getDayStatus(day);
                            return (
                                <div key={day} className="h-16 border-b border-l relative p-1 flex flex-col items-center justify-start">
                                    <span className="text-xs text-gray-400 mb-1">{day}</span>
                                    {status && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded w-full ${status === 'PRESENT' ? 'bg-green-100 text-green-700' : status === 'ABSENT' ? 'bg-red-100 text-red-700' : status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {status === 'PRESENT' ? 'حاضر' : status === 'ABSENT' ? 'غائب' : status === 'LATE' ? 'تأخر' : 'عذر'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="divide-y max-h-96 overflow-y-auto custom-scrollbar">
                    {myAtt.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                        <div key={a.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                            <span className="font-mono text-gray-600 text-sm">{a.date}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : a.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {a.status === 'PRESENT' ? 'حاضر' : a.status === 'ABSENT' ? 'غائب' : 'تأخر'}
                            </span>
                        </div>
                    ))}
                    {myAtt.length === 0 && <div className="p-8 text-center text-gray-400">لا يوجد سجلات حضور</div>}
                </div>
            )}
        </div>
    ); 
};

// --- Library Component ---
const StudentLibrary = ({ student }: { student: Student }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    
    useEffect(() => {
        const allLinks = getLessonLinks();
        // Filter links relevant to the student (by Grade or Class, or General)
        const relevant = allLinks.filter(l => 
            (!l.gradeLevel || l.gradeLevel === student.gradeLevel) &&
            (!l.className || l.className === student.className)
        ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLinks(relevant);
    }, [student]);

    const getIcon = (url: string) => {
        if (url.includes('youtube') || url.includes('youtu.be')) return <Video className="text-red-500"/>;
        if (url.endsWith('.pdf')) return <FileText className="text-orange-500"/>;
        return <LinkIcon className="text-blue-500"/>;
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Library className="text-teal-600"/> المكتبة الرقمية</h3>
            <div className="grid gap-4">
                {links.map(link => (
                    <a href={link.url} target="_blank" rel="noreferrer" key={link.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
                        <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                            {getIcon(link.url)}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{link.title}</h4>
                            <p className="text-xs text-gray-400 mt-1 font-mono">{new Date(link.createdAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <ExternalLink size={16} className="text-gray-300 group-hover:text-blue-500"/>
                    </a>
                ))}
                {links.length === 0 && (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                        <Library size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد مصادر تعليمية مضافة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Messages Component ---
const StudentMessages = ({ messages }: { messages: MessageLog[] }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Bell className="text-teal-600"/> الرسائل والتنبيهات</h3>
            <div className="space-y-3">
                {messages.length > 0 ? messages.map(msg => (
                    <div key={msg.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-gray-800 text-sm">{msg.sentBy || 'الإدارة'}</span>
                            <span className="text-xs text-gray-400">{formatDualDate(msg.date)}</span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{msg.content}</p>
                    </div>
                )) : (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                        <Bell size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد رسائل جديدة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Certificates Component ---
const StudentCertificates = ({ student, attendance }: { student: Student, attendance: AttendanceRecord[] }) => {
    const certificates = useMemo(() => {
        // Find attendance records that are actually certificates (behaviorNote starts with 'منح شهادة:')
        return attendance.filter(a => a.studentId === student.id && a.behaviorNote && a.behaviorNote.startsWith('منح شهادة:'));
    }, [attendance, student]);

    return (
        <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Award className="text-teal-600"/> شهادات التقدير</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map(cert => (
                    <div key={cert.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-6 rounded-xl relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div className="absolute top-0 right-0 w-2 h-full bg-yellow-400"></div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/50 rounded-full text-yellow-600"><Medal size={32}/></div>
                            <div>
                                <h4 className="font-black text-lg text-gray-800">{cert.behaviorNote?.replace('منح شهادة: ', '')}</h4>
                                <p className="text-sm text-gray-600 mt-1">تمنح للطالب: <b>{student.name}</b></p>
                                <p className="text-xs text-gray-400 mt-2">{formatDualDate(cert.date)}</p>
                            </div>
                        </div>
                        <button onClick={() => window.print()} className="absolute bottom-4 left-4 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Printer size={18}/>
                        </button>
                    </div>
                ))}
                {certificates.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                        <Award size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>شد حيلك! بانتظار شهادتك الأولى.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Exam Taking Component ---
const ExamTaker = ({ exam, student, onComplete }: { exam: Exam, student: Student, onComplete: () => void }) => {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAnswer = (val: string) => {
        setAnswers({ ...answers, [exam.questions[currentQuestionIdx].id]: val });
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        // Calculate Score
        let score = 0;
        let totalScore = 0;
        exam.questions.forEach(q => {
            const studentAns = answers[q.id];
            if (studentAns === q.correctAnswer) score += (q.points || 1);
            totalScore += (q.points || 1);
        });

        // 1. Save Exam Result
        const result: ExamResult = {
            id: Date.now().toString(),
            examId: exam.id,
            studentId: student.id,
            studentName: student.name,
            score,
            totalScore,
            date: new Date().toISOString(),
            answers
        };
        saveExamResult(result);

        // 2. Save Performance Record (Sync to Gradebook if assignment exists)
        // Check if an assignment with same ID exists (created via Publish button)
        const assignments = getAssignments('ALL', undefined, true);
        const linkedAssignment = assignments.find(a => a.id === exam.id);
        
        if (linkedAssignment) {
            const record: PerformanceRecord = {
                id: `${student.id}_${exam.id}`,
                studentId: student.id,
                subject: exam.subject,
                title: exam.title,
                category: 'PLATFORM_EXAM',
                score: score,
                maxScore: totalScore,
                date: new Date().toISOString().split('T')[0],
                notes: exam.id, // Link to Assignment ID
                createdById: exam.teacherId
            };
            addPerformance(record);
        }

        setTimeout(() => {
            setIsSubmitting(false);
            onComplete();
        }, 1000);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const currentQ = exam.questions[currentQuestionIdx];

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md">
                <div>
                    <h2 className="font-bold text-lg">{exam.title}</h2>
                    <p className="text-xs text-indigo-200">{exam.subject}</p>
                </div>
                <div className={`text-xl font-mono font-bold ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-2">
                <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${((currentQuestionIdx + 1) / exam.questions.length) * 100}%` }}></div>
            </div>

            {/* Question Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-2xl">
                    <span className="text-xs font-bold text-gray-400 mb-2 block">السؤال {currentQuestionIdx + 1} من {exam.questions.length}</span>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 leading-relaxed">{currentQ.text}</h3>
                    
                    {currentQ.imageUrl && (
                        <div className="mb-6 flex justify-center bg-gray-50 p-2 rounded border">
                            <img src={currentQ.imageUrl} alt="Question" className="max-h-60 object-contain rounded"/>
                        </div>
                    )}

                    <div className="space-y-3">
                        {currentQ.type === 'MCQ' ? currentQ.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                className={`w-full p-4 rounded-xl border-2 text-right transition-all font-medium ${
                                    answers[currentQ.id] === opt 
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                        : 'border-gray-100 hover:border-gray-300 text-gray-700'
                                }`}
                            >
                                {opt}
                            </button>
                        )) : (
                            <div className="flex gap-4">
                                {['صح', 'خطأ'].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => handleAnswer(val)}
                                        className={`flex-1 p-4 rounded-xl border-2 text-center font-bold transition-all ${
                                            answers[currentQ.id] === val 
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                                : 'border-gray-100 hover:border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-4 border-t bg-white flex justify-between items-center">
                <button 
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(curr => curr - 1)}
                    className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                    السابق
                </button>
                
                {currentQuestionIdx === exam.questions.length - 1 ? (
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="px-8 py-3 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-md flex items-center gap-2"
                    >
                        {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
                        تسليم الاختبار
                    </button>
                ) : (
                    <button 
                        onClick={() => setCurrentQuestionIdx(curr => curr + 1)}
                        className="px-6 py-3 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center gap-2"
                    >
                        التالي <ChevronLeft size={18}/>
                    </button>
                )}
            </div>
        </div>
    );
};

const StudentExamsView = ({ student }: { student: Student }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [results, setResults] = useState<ExamResult[]>([]);
    const [activeExam, setActiveExam] = useState<Exam | null>(null);
    const [reviewExam, setReviewExam] = useState<{ exam: Exam, result: ExamResult } | null>(null);

    const loadData = () => {
        // Fetch all exams (that are active)
        const allExams = getExams().filter(e => e.isActive && (e.gradeLevel === student.gradeLevel || !e.gradeLevel));
        setExams(allExams);

        // Fetch results for this student
        const allResults = getExamResults(); 
        const myResults = allResults.filter(r => r.studentId === student.id);
        setResults(myResults);
    };

    useEffect(() => {
        loadData();
    }, [student]);

    if (activeExam) {
        return <ExamTaker exam={activeExam} student={student} onComplete={() => { setActiveExam(null); loadData(); }} />;
    }

    if (reviewExam) {
        return <ExamReview exam={reviewExam.exam} result={reviewExam.result} onBack={() => setReviewExam(null)} />;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <FileQuestion className="text-teal-600"/> الاختبارات والواجبات
            </h3>

            <div className="grid gap-4">
                {exams.map(exam => {
                    const result = results.find(r => r.examId === exam.id);
                    return (
                        <div key={exam.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">{exam.title}</h4>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                    <span>{exam.subject}</span>
                                    <span>• {exam.questions.length} أسئلة</span>
                                    <span>• {exam.durationMinutes} دقيقة</span>
                                </div>
                            </div>

                            {result ? (
                                <div className="text-center bg-green-50 px-6 py-2 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => setReviewExam({ exam, result })}>
                                    <span className="block text-xs text-green-600 font-bold mb-1">الدرجة المستحقة (اضغط للمراجعة)</span>
                                    <span className="text-2xl font-black text-green-700">{result.score} <span className="text-sm text-gray-400">/ {result.totalScore}</span></span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-bold">لم يتم التسليم</span>
                                    <button 
                                        onClick={() => setActiveExam(exam)}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-transform hover:scale-105"
                                    >
                                        ابدأ الاختبار الآن
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {exams.length === 0 && (
                    <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <FileQuestion size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد اختبارات متاحة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Evaluation View with Print ---
const StudentEvaluationView = ({ student, performance, attendance, terms }: { student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[], terms: AcademicTerm[] }) => {
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [assignments, setAssignments] = useState<any[]>([]);
    const [reportConfig, setReportConfig] = useState<ReportHeaderConfig | null>(null);

    useEffect(() => {
        const current = terms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (terms.length > 0) setSelectedTermId(terms[0].id);
        
        const allAssigns = getAssignments('ALL', undefined, true);
        setAssignments(allAssigns);

        if(student.createdById) {
            setReportConfig(getReportHeaderConfig(student.createdById));
        }
    }, [terms, student]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    const subjectGrades = useMemo(() => {
        let myPerf = performance.filter(p => p.studentId === student.id);
        if (activeTerm) {
            myPerf = myPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        const visiblePerf = myPerf.filter(p => {
            if (p.notes) { 
                const linkedAssign = assignments.find(a => a.id === p.notes);
                if (linkedAssign && !linkedAssign.isVisible) return false;
            }
            return true;
        });

        const grouped: Record<string, PerformanceRecord[]> = {};
        visiblePerf.forEach(p => {
            if (!grouped[p.subject]) grouped[p.subject] = [];
            grouped[p.subject].push(p);
        });

        return grouped;
    }, [performance, student, activeTerm, assignments]);

    return (
        <div className="space-y-6 animate-fade-in pb-20 print:p-0 print:pb-0">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
                 <div className="flex justify-between items-center mb-6 print:hidden">
                     <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Award className="text-purple-600"/> كشف الدرجات التفصيلي</h2>
                     <div className="flex items-center gap-2">
                        <select 
                            value={selectedTermId}
                            onChange={(e) => setSelectedTermId(e.target.value)}
                            className="bg-gray-50 border rounded px-3 py-2 text-sm font-bold text-gray-700 outline-none"
                        >
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-black transition-colors">
                            <Printer size={16}/> طباعة
                        </button>
                     </div>
                 </div>

                 {/* WEB VIEW GRID */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                     {Object.entries(subjectGrades).map(([subject, rawRecords]) => {
                         const records = rawRecords as PerformanceRecord[];
                         const totalScore = records.reduce((sum, r) => sum + r.score, 0);
                         const maxPossible = records.reduce((sum, r) => sum + r.maxScore, 0);
                         const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

                         // Chart Data
                         const chartData = records.map(r => ({ name: r.title, score: r.score, max: r.maxScore }));

                         return (
                             <div key={subject} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                 <div className="bg-white p-4 border-b flex justify-between items-center">
                                     <h3 className="font-bold text-gray-800">{subject}</h3>
                                     <span className={`text-xs font-bold px-2 py-1 rounded ${percentage >= 90 ? 'bg-green-100 text-green-700' : percentage >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                         {percentage}%
                                     </span>
                                 </div>
                                 
                                 {/* Micro Chart */}
                                 {records.length > 1 && (
                                     <div className="h-32 w-full bg-white p-2">
                                         <ResponsiveContainer width="100%" height="100%">
                                             <LineChart data={chartData}>
                                                 <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={false} />
                                             </LineChart>
                                         </ResponsiveContainer>
                                     </div>
                                 )}

                                 <div className="p-4 space-y-3">
                                     {records.map(rec => (
                                         <div key={rec.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                             <span className="text-gray-600">{rec.title}</span>
                                             <div className="flex items-center gap-1 font-bold">
                                                 <span className="text-gray-800">{rec.score}</span>
                                                 <span className="text-gray-400 text-xs">/ {rec.maxScore}</span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                                 <div className="bg-gray-100 p-3 flex justify-between items-center text-sm font-bold border-t">
                                     <span>المجموع</span>
                                     <span className="text-indigo-700">{totalScore} / {maxPossible}</span>
                                 </div>
                             </div>
                         );
                     })}
                     {Object.keys(subjectGrades).length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <FileText size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>لا توجد درجات مسجلة أو منشورة لهذه الفترة.</p>
                        </div>
                     )}
                 </div>

                 {/* PRINT VIEW (UNCHANGED) */}
                 <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black text-right h-full overflow-hidden" style={{direction: 'rtl'}}>
                     {/* Header */}
                     <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                         <div className="text-right text-sm font-bold leading-loose">
                             <p>المملكة العربية السعودية</p>
                             <p>وزارة التعليم</p>
                             <p>{reportConfig?.schoolName || 'اسم المدرسة'}</p>
                         </div>
                         <div className="text-center pt-2">
                             {reportConfig?.logoBase64 ? (
                                 <img src={reportConfig.logoBase64} alt="Logo" className="h-24 w-24 object-contain mx-auto mb-2"/>
                             ) : <div className="h-24 w-24 border-2 border-black mx-auto mb-2 flex items-center justify-center">الشعار</div>}
                             <h1 className="text-xl font-black underline">إشعار درجات طالب</h1>
                             <p className="text-sm font-bold mt-2">{activeTerm ? activeTerm.name : 'تقرير شامل'}</p>
                         </div>
                         <div className="text-left text-sm font-bold leading-loose">
                             <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                         </div>
                     </div>

                     {/* Student Info */}
                     <div className="border border-black p-4 mb-6 rounded flex justify-between bg-gray-50 text-sm">
                         <div><span className="font-bold ml-2">الطالب:</span> {student.name}</div>
                         <div><span className="font-bold ml-2">رقم الهوية:</span> {student.nationalId}</div>
                         <div><span className="font-bold ml-2">الصف:</span> {student.gradeLevel} / {student.className}</div>
                     </div>

                     {/* Grades Table */}
                     <table className="w-full text-center border-collapse border border-black text-sm mb-8">
                         <thead>
                             <tr className="bg-gray-100">
                                 <th className="border border-black p-2 w-1/4">المادة</th>
                                 <th className="border border-black p-2">تفاصيل التقييمات</th>
                                 <th className="border border-black p-2 w-24">المجموع</th>
                                 <th className="border border-black p-2 w-24">النسبة</th>
                             </tr>
                         </thead>
                         <tbody>
                             {Object.entries(subjectGrades).map(([subject, rawRecords]) => {
                                 const records = rawRecords as PerformanceRecord[];
                                 const totalScore = records.reduce((sum, r) => sum + r.score, 0);
                                 const maxPossible = records.reduce((sum, r) => sum + r.maxScore, 0);
                                 const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
                                 
                                 return (
                                     <tr key={subject}>
                                         <td className="border border-black p-2 font-bold bg-gray-50">{subject}</td>
                                         <td className="border border-black p-2 text-right">
                                             <div className="flex flex-wrap gap-2">
                                                 {records.map(r => (
                                                     <span key={r.id} className="inline-block border border-gray-400 rounded px-1.5 py-0.5 text-xs">
                                                         {r.title}: {r.score}/{r.maxScore}
                                                     </span>
                                                 ))}
                                             </div>
                                         </td>
                                         <td className="border border-black p-2 font-bold">{totalScore} <span className="text-[10px] font-normal">/ {maxPossible}</span></td>
                                         <td className="border border-black p-2 font-bold">{percentage}%</td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>

                     {/* Signatures */}
                     <div className="flex justify-between items-end mt-16 px-12 text-sm font-bold break-inside-avoid">
                         <div className="text-center">
                             <p className="mb-8">المرشد الطلابي</p>
                             <p>.........................</p>
                         </div>
                         <div className="text-center">
                             <p className="mb-8">مدير المدرسة</p>
                             <p>{reportConfig?.schoolManager || '.........................'}</p>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

// Exam Review Component (Updated with Back button)
const ExamReview = ({ exam, result, onBack }: { exam: Exam, result: ExamResult, onBack: () => void }) => {
    return (
        <div className="space-y-6 animate-slide-up pb-20">
            <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm rounded-xl">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowRight size={20}/></button>
                <div className="text-center">
                    <h3 className="font-bold text-gray-800">{exam.title}</h3>
                    <p className="text-xs text-gray-500">مراجعة الإجابات</p>
                </div>
                <div className="bg-indigo-50 px-3 py-1 rounded text-indigo-700 font-bold text-sm">
                    {result.score} / {result.totalScore}
                </div>
            </div>

            <div className="space-y-4">
                {exam.questions.map((q, idx) => {
                    const studentAns = result.answers?.[q.id];
                    const isCorrect = studentAns === q.correctAnswer;
                    
                    return (
                        <div key={q.id} className={`bg-white p-6 rounded-xl border-2 ${isCorrect ? 'border-green-200' : 'border-red-200'} shadow-sm`}>
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-bold text-gray-800 text-sm bg-gray-100 px-2 py-1 rounded">س{idx+1}</span>
                                {isCorrect ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                            </div>
                            
                            <h4 className="font-bold text-gray-800 text-lg mb-4">{q.text}</h4>
                            {q.imageUrl && <img src={q.imageUrl} alt="Question" className="max-h-40 mb-4 rounded border object-contain"/>}

                            <div className="space-y-2">
                                {q.type === 'MCQ' ? q.options.map((opt, i) => (
                                    <div key={i} className={`p-3 rounded-lg border flex justify-between items-center ${
                                        opt === q.correctAnswer ? 'bg-green-50 border-green-300' :
                                        opt === studentAns && !isCorrect ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-transparent'
                                    }`}>
                                        <span className={`font-medium ${opt === q.correctAnswer ? 'text-green-800' : opt === studentAns ? 'text-red-800' : 'text-gray-600'}`}>{opt}</span>
                                        {opt === q.correctAnswer && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded font-bold">إجابة صحيحة</span>}
                                        {opt === studentAns && !isCorrect && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">إجابتك</span>}
                                    </div>
                                )) : (
                                    <div className="flex gap-4">
                                        {['صح', 'خطأ'].map(val => (
                                            <div key={val} className={`flex-1 p-3 rounded-lg border text-center font-bold ${
                                                val === q.correctAnswer ? 'bg-green-50 border-green-300 text-green-800' :
                                                val === studentAns && !isCorrect ? 'bg-red-50 border-red-300 text-red-800' : 'bg-gray-50 text-gray-600'
                                            }`}>
                                                {val}
                                                {val === q.correctAnswer && <div className="text-[10px] font-normal mt-1">الإجابة الصحيحة</div>}
                                                {val === studentAns && !isCorrect && <div className="text-[10px] font-normal mt-1">إجابتك</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentPortal;
