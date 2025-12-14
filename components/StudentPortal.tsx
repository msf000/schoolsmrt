
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, Teacher, TeacherAssignment, Subject, TrackingSheet, Exam, ExamResult, Question, WeeklyPlanItem, AcademicTerm, LessonLink } from '../types';
import { updateStudent, saveAttendance, getSubjects, getAssignments, getSchedules, getTeacherAssignments, getTeachers, downloadFromSupabase, getTrackingSheets, getExams, getExamResults, saveExamResult, getWeeklyPlans, addPerformance, getAcademicTerms, getLessonLinks } from '../services/storageService';
import { User, Calendar, Award, LogOut, Lock, Upload, FileText, CheckCircle, AlertTriangle, Smile, Frown, X, Menu, TrendingUp, Calculator, Activity as ActivityIcon, BookOpen, CheckSquare, ExternalLink, Clock, MapPin, RefreshCw, Table, Star, FileQuestion, PlayCircle, Timer, Check, AlertCircle, LayoutGrid, Trophy, Flame, ChevronRight, ChevronLeft, CalendarDays, List, Filter, Library, Globe, Youtube, Link as LinkIcon, Crown, Send } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

interface StudentPortalProps {
    currentUser: Student;
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, attendance, performance, onLogout }) => {
    // Restore last view from session storage or default
    const [view, setView] = useState<'DASHBOARD' | 'PROFILE' | 'ATTENDANCE' | 'EVALUATION' | 'TIMETABLE' | 'CUSTOM_RECORDS' | 'EXAMS' | 'WEEKLY_PLAN' | 'LIBRARY'>(() => {
        const saved = sessionStorage.getItem('student_last_view');
        return (saved && ['DASHBOARD', 'PROFILE', 'ATTENDANCE', 'EVALUATION', 'TIMETABLE', 'CUSTOM_RECORDS', 'EXAMS', 'WEEKLY_PLAN', 'LIBRARY'].includes(saved)) ? saved as any : 'DASHBOARD';
    });
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);

    useEffect(() => {
        sessionStorage.setItem('student_last_view', view);
    }, [view]);

    useEffect(() => {
        setTerms(getAcademicTerms());
    }, []);

    const handleRefresh = async () => {
        setIsSyncing(true);
        await downloadFromSupabase();
        setIsSyncing(false);
        window.location.reload();
    };

    const navItems = [
        { id: 'DASHBOARD', label: 'الرئيسية', icon: LayoutGrid },
        { id: 'WEEKLY_PLAN', label: 'الخطة الأسبوعية', icon: CalendarDays },
        { id: 'EVALUATION', label: 'تقييمي (درجاتي)', icon: Award },
        { id: 'TIMETABLE', label: 'الجدول الدراسي', icon: Clock },
        { id: 'EXAMS', label: 'الاختبارات والواجبات', icon: FileQuestion },
        { id: 'ATTENDANCE', label: 'سجل الحضور', icon: Calendar },
        { id: 'LIBRARY', label: 'المكتبة والمصادر', icon: Library },
        { id: 'CUSTOM_RECORDS', label: 'سجلات خاصة', icon: Table },
        { id: 'PROFILE', label: 'الملف الشخصي', icon: User },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-right font-sans" dir="rtl">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm z-30">
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
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                view === item.id 
                                    ? 'bg-teal-50 text-teal-700 font-bold border border-teal-100 shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
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

            {/* Mobile Menu Overlay (Fixed) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
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
                                    key={item.id}
                                    onClick={() => { setView(item.id as any); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        view === item.id ? 'bg-teal-100 text-teal-800 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
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
            <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative mb-16 md:mb-0">
                <header className="md:hidden bg-white p-4 border-b flex justify-between items-center shadow-sm z-20 shrink-0">
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        <Award className="text-teal-600"/> بوابة الطالب
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu size={24}/>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50 custom-scrollbar w-full">
                    {view === 'DASHBOARD' && <StudentDashboard student={currentUser} attendance={attendance} performance={performance} onViewChange={setView} terms={terms} />}
                    {view === 'WEEKLY_PLAN' && <StudentWeeklyPlan student={currentUser} />}
                    {view === 'PROFILE' && <StudentProfile student={currentUser} />}
                    {view === 'ATTENDANCE' && <StudentAttendanceView student={currentUser} attendance={attendance} terms={terms} />}
                    {view === 'EVALUATION' && <StudentEvaluationView student={currentUser} performance={performance} attendance={attendance} terms={terms} />}
                    {view === 'TIMETABLE' && <StudentTimetable student={currentUser} />}
                    {view === 'CUSTOM_RECORDS' && <StudentCustomRecords student={currentUser} />}
                    {view === 'EXAMS' && <StudentExamsView student={currentUser} />}
                    {view === 'LIBRARY' && <StudentLibrary student={currentUser} />}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'DASHBOARD' ? 'text-teal-600 bg-teal-50' : 'text-gray-400'}`}>
                    <LayoutGrid size={20} />
                    <span className="text-[10px] font-bold">الرئيسية</span>
                </button>
                <button onClick={() => setView('TIMETABLE')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'TIMETABLE' ? 'text-teal-600 bg-teal-50' : 'text-gray-400'}`}>
                    <Clock size={20} />
                    <span className="text-[10px] font-bold">الجدول</span>
                </button>
                <button onClick={() => setView('EXAMS')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'EXAMS' ? 'text-teal-600 bg-teal-50' : 'text-gray-400'}`}>
                    <FileQuestion size={20} />
                    <span className="text-[10px] font-bold">واجبات</span>
                </button>
                <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-gray-400 hover:text-teal-600`}>
                    <Menu size={20} />
                    <span className="text-[10px] font-bold">القائمة</span>
                </button>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const StudentDashboard = ({ student, attendance, performance, onViewChange, terms }: any) => {
    // Term Logic
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    
    useEffect(() => {
        const current = terms.find((t: AcademicTerm) => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (terms.length > 0) setSelectedTermId(terms[0].id);
    }, [terms]);

    const activeTerm = terms.find((t: AcademicTerm) => t.id === selectedTermId);

    // Filter Data by Term
    const filteredPerf = useMemo(() => {
        if (!activeTerm) return performance;
        return performance.filter((p: PerformanceRecord) => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
    }, [performance, activeTerm]);

    const filteredAtt = useMemo(() => {
        if (!activeTerm) return attendance;
        return attendance.filter((a: AttendanceRecord) => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
    }, [attendance, activeTerm]);

    // Stats
    const totalScore = filteredPerf.reduce((acc: number, curr: PerformanceRecord) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;
    
    const totalAtt = filteredAtt.length;
    const present = filteredAtt.filter((a: AttendanceRecord) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 100;

    // Gamification Points (From Attendance Behavior Notes 'نقطة تميز')
    const totalPoints = useMemo(() => {
        return filteredAtt.filter((a: AttendanceRecord) => a.behaviorStatus === 'POSITIVE').length;
    }, [filteredAtt]);

    const studentLevel = useMemo(() => {
        if (totalPoints < 10) return { name: 'مبتدئ', color: 'text-gray-600', icon: Star, next: 10 };
        if (totalPoints < 30) return { name: 'مجتهد', color: 'text-blue-600', icon: TrendingUp, next: 30 };
        if (totalPoints < 60) return { name: 'متفوق', color: 'text-purple-600', icon: Award, next: 60 };
        return { name: 'أسطورة', color: 'text-yellow-600', icon: Crown, next: 100 };
    }, [totalPoints]);

    // Next Class Logic
    const [nextClass, setNextClass] = useState<ScheduleItem | null>(null);
    useEffect(() => {
        const schedules = getSchedules();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const mySchedule = schedules.filter(s => s.classId === student.className && s.day === today);
        const currentHour = new Date().getHours();
        const currentPeriod = currentHour - 6; 
        const next = mySchedule.find(s => s.period >= currentPeriod) || mySchedule[0];
        setNextClass(next || null);
    }, [student]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex justify-between items-end">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">مرحباً، {student.name} 👋</h2>
                    <p className="text-teal-100 opacity-90">نتمنى لك يوماً دراسياً ممتعاً ومليئاً بالإنجازات.</p>
                </div>
                <div className="relative z-10 hidden md:block">
                    <select 
                        value={selectedTermId}
                        onChange={(e) => setSelectedTermId(e.target.value)}
                        className="bg-white/10 border border-white/30 text-white text-sm rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-teal-400 font-bold"
                    >
                        <option value="" className="text-black">كل الفترات</option>
                        {terms.map((t: AcademicTerm) => (
                            <option key={t.id} value={t.id} className="text-black">{t.name}</option>
                        ))}
                    </select>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                    <Award size={150} />
                </div>
            </div>

            {/* Mobile Term Selector */}
            <div className="md:hidden">
                <select 
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none font-bold shadow-sm"
                >
                    <option value="">كل الفترات</option>
                    {terms.map((t: AcademicTerm) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {/* GAMIFICATION CARD */}
            <div className="bg-white p-6 rounded-xl border border-yellow-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-yellow-400"></div>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-gray-500 font-bold text-sm mb-1 flex items-center gap-2"><Trophy size={16} className="text-yellow-500"/> مستوى التميز</h3>
                        <div className={`text-3xl font-black flex items-center gap-2 ${studentLevel.color}`}>
                            <studentLevel.icon size={32} className="fill-current"/> {studentLevel.name}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">مجموع النقاط: {totalPoints} نقطة</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-xs font-bold text-gray-500 mb-1">المستوى التالي: {studentLevel.next}</div>
                        <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 transition-all duration-1000" style={{width: `${Math.min(100, (totalPoints/studentLevel.next)*100)}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                    <div className="text-gray-500 text-xs font-bold mb-1">الحضور ({activeTerm ? activeTerm.name : 'عام'})</div>
                    <div className={`text-2xl font-black ${attRate >= 90 ? 'text-green-600' : 'text-orange-500'}`}>{attRate}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                    <div className="text-gray-500 text-xs font-bold mb-1">المعدل العام</div>
                    <div className="text-2xl font-black text-blue-600">{avgScore}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                    <div className="text-gray-500 text-xs font-bold mb-1">الواجبات</div>
                    <div className="text-2xl font-black text-purple-600">{filteredPerf.filter((p:any) => p.category === 'HOMEWORK').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                    <div className="text-gray-500 text-xs font-bold mb-1">السلوك الإيجابي</div>
                    <div className="text-2xl font-black text-yellow-500">{filteredAtt.filter((a:any) => a.behaviorStatus === 'POSITIVE').length}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Next Class */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewChange('TIMETABLE')}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock className="text-teal-600"/> الحصة القادمة</h3>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">جدول اليوم</span>
                    </div>
                    {nextClass ? (
                        <div className="text-center py-4 bg-teal-50 rounded-xl border border-teal-100">
                            <h4 className="text-xl font-black text-teal-800 mb-1">{nextClass.subjectName}</h4>
                            <p className="text-sm text-teal-600">الحصة {nextClass.period}</p>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">لا توجد حصص متبقية اليوم</div>
                    )}
                </div>

                {/* Latest Grade */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewChange('EVALUATION')}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="text-purple-600"/> آخر درجة</h3>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">سجل الدرجات</span>
                    </div>
                    {filteredPerf.length > 0 ? (
                        <div className="text-center py-4 bg-purple-50 rounded-xl border border-purple-100">
                            <h4 className="text-xl font-black text-purple-800 mb-1">
                                {filteredPerf[filteredPerf.length-1].score} / {filteredPerf[filteredPerf.length-1].maxScore}
                            </h4>
                            <p className="text-sm text-purple-600">{filteredPerf[filteredPerf.length-1].subject} - {filteredPerf[filteredPerf.length-1].title}</p>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">لا توجد درجات مسجلة في هذه الفترة</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StudentLibrary = ({ student }: { student: Student }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const allLinks = getLessonLinks();
        // Filter based on Student's Grade OR Class
        const relevant = allLinks.filter(l => {
            const gradeMatch = !l.gradeLevel || l.gradeLevel === student.gradeLevel;
            const classMatch = !l.className || l.className === student.className;
            return gradeMatch && classMatch;
        });
        setLinks(relevant);
    }, [student]);

    const filtered = links.filter(l => l.title.includes(search) || l.url.includes(search));

    const getIcon = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return <Youtube className="text-red-600" size={24}/>;
        if (url.endsWith('.pdf')) return <FileText className="text-red-500" size={24}/>;
        return <Globe className="text-blue-500" size={24}/>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Library className="text-indigo-600"/> مكتبة المصادر</h2>
                <div className="relative w-48">
                    <input className="w-full p-2 pr-8 border rounded-lg text-sm bg-gray-50" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
                    <Filter className="absolute top-2.5 right-2 text-gray-400" size={16}/>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length > 0 ? filtered.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all flex items-start gap-3 group">
                        <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                            {getIcon(link.url)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-gray-800 truncate mb-1 group-hover:text-indigo-600">{link.title}</h4>
                            <div className="text-xs text-blue-500 flex items-center gap-1">
                                <LinkIcon size={12}/> <span>فتح الرابط</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 font-mono">{new Date(link.createdAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                    </a>
                )) : (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد مصادر متاحة حالياً.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ... (Rest of Sub-Components: StudentWeeklyPlan, StudentTimetable, etc. remain mostly unchanged) ...
// Including them below to ensure full file integrity

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
                            <div className="bg-gray-50 p-3 border-b border-gray-100 font-bold text-gray-700 flex justify-between">
                                <span>{dayNamesAr[day]}</span>
                                <span className="text-xs font-normal text-gray-400">{dayPlans.length} حصص</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {dayPlans.length > 0 ? dayPlans.map(plan => (
                                    <div key={plan.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded">حصة {plan.period}</span>
                                                <h4 className="font-bold text-gray-800">{plan.subjectName}</h4>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                                            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                                <span className="text-blue-500 font-bold block text-xs mb-1">الدرس:</span>
                                                <p className="text-gray-700">{plan.lessonTopic}</p>
                                            </div>
                                            {plan.homework && (
                                                <div className="bg-orange-50 p-2 rounded border border-orange-100">
                                                    <span className="text-orange-500 font-bold block text-xs mb-1">الواجب:</span>
                                                    <p className="text-gray-700">{plan.homework}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="p-4 text-center text-gray-400 text-xs">لا توجد خطة مسجلة لهذا اليوم</div>}
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
        const all = getSchedules();
        setSchedules(all.filter(s => s.classId === student.className));
    }, [student]);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr: Record<string, string> = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><Clock className="text-teal-600"/> الجدول الدراسي</h2>
                <span className="bg-white border px-3 py-1 rounded text-xs font-bold text-gray-600">{student.className}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-teal-600 text-white">
                            <th className="p-3 border border-teal-500 w-24">اليوم</th>
                            {periods.map(p => <th key={p} className="p-3 border border-teal-500">الحصة {p}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day} className="hover:bg-gray-50">
                                <td className="p-3 font-bold border bg-gray-50 text-gray-700">{dayNamesAr[day]}</td>
                                {periods.map(period => {
                                    const item = schedules.find(s => s.day === day && s.period === period);
                                    return (
                                        <td key={period} className="border p-2 h-14">
                                            {item ? (
                                                <div className="font-bold text-teal-700 bg-teal-50 rounded py-1 px-2 text-xs shadow-sm">
                                                    {item.subjectName}
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

const StudentAttendanceView = ({ student, attendance, terms }: { student: Student, attendance: AttendanceRecord[], terms: AcademicTerm[] }) => {
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
    const [selectedAbsentRecord, setSelectedAbsentRecord] = useState<AttendanceRecord | null>(null);
    const [excuseText, setExcuseText] = useState('');

    useEffect(() => {
        const current = terms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (terms.length > 0) setSelectedTermId(terms[0].id);
    }, [terms]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    const myRecords = useMemo(() => {
        let filtered = attendance.filter(a => a.studentId === student.id);
        if (activeTerm) {
            filtered = filtered.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
        }
        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendance, student, activeTerm]);

    const handleSubmitExcuse = () => {
        if (!selectedAbsentRecord || !excuseText) return;
        
        const updatedRecord: AttendanceRecord = {
            ...selectedAbsentRecord,
            excuseNote: excuseText,
        };
        
        saveAttendance([updatedRecord]);
        setIsExcuseModalOpen(false);
        setExcuseText('');
        setSelectedAbsentRecord(null);
        alert('تم إرسال العذر للمعلم بنجاح.');
        window.location.reload(); 
    };
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Calendar className="text-teal-600"/> سجل الحضور والغياب</h2>
                    <select 
                        value={selectedTermId}
                        onChange={(e) => setSelectedTermId(e.target.value)}
                        className="bg-gray-50 border rounded px-3 py-1 text-sm font-bold text-gray-700"
                    >
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                
                {myRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-3">التاريخ</th>
                                    <th className="p-3">الحالة</th>
                                    <th className="p-3">المادة / الحصة</th>
                                    <th className="p-3">ملاحظات / عذر</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {myRecords.map(rec => (
                                    <tr key={rec.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-gray-500">{formatDualDate(rec.date)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                rec.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                                rec.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                rec.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {rec.status === 'PRESENT' ? 'حاضر' : rec.status === 'ABSENT' ? 'غائب' : rec.status === 'LATE' ? 'تأخر' : 'بعذر'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600">{rec.subject || '-'} {rec.period ? `(ح${rec.period})` : ''}</td>
                                        <td className="p-3">
                                            {(rec.behaviorStatus !== 'NEUTRAL' || rec.behaviorNote) && (
                                                <div className="flex items-center gap-2 mb-1">
                                                    {rec.behaviorStatus === 'POSITIVE' && <Smile size={16} className="text-green-500"/>}
                                                    {rec.behaviorStatus === 'NEGATIVE' && <Frown size={16} className="text-red-500"/>}
                                                    <span className="text-xs text-gray-600">{rec.behaviorNote}</span>
                                                </div>
                                            )}
                                            {/* Submit Excuse Button if Absent and No Excuse */}
                                            {(rec.status === AttendanceStatus.ABSENT || rec.status === AttendanceStatus.LATE) && !rec.excuseNote && (
                                                <button 
                                                    onClick={() => { setSelectedAbsentRecord(rec); setIsExcuseModalOpen(true); }}
                                                    className="text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                                >
                                                    تقديم عذر
                                                </button>
                                            )}
                                            {rec.excuseNote && <span className="text-[10px] text-blue-600 flex items-center gap-1"><FileText size={10}/> تم تقديم عذر</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="text-center py-10 text-gray-400">لا يوجد سجلات حضور في هذه الفترة</div>}
            </div>

            {/* EXCUSE SUBMISSION MODAL */}
            {isExcuseModalOpen && selectedAbsentRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="text-purple-600"/> تقديم عذر غياب
                            </h3>
                            <button onClick={() => setIsExcuseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
                                <span className="font-bold block mb-1">تفاصيل الغياب:</span>
                                التاريخ: {formatDualDate(selectedAbsentRecord.date)} <br/>
                                الحالة: {selectedAbsentRecord.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}
                            </div>
                            
                            <label className="block text-sm font-bold text-gray-700 mb-2">سبب الغياب / التأخر:</label>
                            <textarea 
                                className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none"
                                placeholder="اكتب مبرر الغياب هنا..."
                                value={excuseText}
                                onChange={e => setExcuseText(e.target.value)}
                            />
                            
                            <div className="mt-6 flex gap-3">
                                <button onClick={() => setIsExcuseModalOpen(false)} className="flex-1 py-2 border rounded-lg text-gray-600 font-bold hover:bg-gray-50">إلغاء</button>
                                <button 
                                    onClick={handleSubmitExcuse} 
                                    disabled={!excuseText}
                                    className="flex-2 w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Send size={16}/> إرسال العذر
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StudentEvaluationView = ({ student, performance, attendance, terms }: { student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[], terms: AcademicTerm[] }) => {
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    useEffect(() => {
        const current = terms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (terms.length > 0) setSelectedTermId(terms[0].id);
    }, [terms]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    const myPerf = useMemo(() => {
        let filtered = performance.filter(p => p.studentId === student.id);
        if (activeTerm) {
            filtered = filtered.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }
        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [performance, student, activeTerm]);
    
    // Chart Data (Last 5 grades)
    const chartData = myPerf.slice(0, 5).reverse().map(p => ({
        name: p.title,
        score: Math.round((p.score / p.maxScore) * 100),
        full: 100
    }));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Award className="text-purple-600"/> سجل الدرجات والتقييم</h2>
                        <select 
                            value={selectedTermId}
                            onChange={(e) => setSelectedTermId(e.target.value)}
                            className="bg-gray-50 border rounded px-3 py-1 text-sm font-bold text-gray-700"
                        >
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    {myPerf.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                    <tr>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">المادة</th>
                                        <th className="p-3">عنوان التقييم</th>
                                        <th className="p-3">الدرجة</th>
                                        <th className="p-3">النسبة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {myPerf.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-mono text-gray-500 text-xs">{p.date}</td>
                                            <td className="p-3 text-gray-700">{p.subject}</td>
                                            <td className="p-3 font-bold text-gray-800">{p.title}</td>
                                            <td className="p-3"><span className="font-mono bg-gray-100 px-2 py-1 rounded">{p.score} / {p.maxScore}</span></td>
                                            <td className="p-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${(p.score/p.maxScore) >= 0.9 ? 'bg-green-100 text-green-700' : (p.score/p.maxScore) >= 0.7 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                    {Math.round((p.score / p.maxScore) * 100)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <div className="text-center py-10 text-gray-400">لا يوجد درجات مرصودة</div>}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4">تطور المستوى</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip />
                                <Area type="monotone" dataKey="score" stroke="#8884d8" fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-2">رسم بياني لآخر 5 تقييمات</p>
                </div>
            </div>
        </div>
    );
};

const StudentProfile = ({ student }: { student: Student }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [msg, setMsg] = useState('');

    const handleChangePassword = () => {
        if (!newPassword) return;
        if (newPassword !== confirmPassword) {
            setMsg('كلمات المرور غير متطابقة');
            return;
        }
        
        const updatedStudent = { ...student, password: newPassword };
        updateStudent(updatedStudent);
        setMsg('تم تغيير كلمة المرور بنجاح');
        setNewPassword(''); setConfirmPassword('');
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2"><User className="text-teal-600"/> الملف الشخصي</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-sm text-gray-500 mb-1">الاسم الكامل</label>
                    <div className="font-bold text-gray-800 text-lg">{student.name}</div>
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-1">رقم الهوية / السجل</label>
                    <div className="font-mono text-gray-800 bg-gray-50 p-2 rounded inline-block">{student.nationalId}</div>
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-1">الصف / الفصل</label>
                    <div className="font-bold text-gray-800">{student.gradeLevel} - {student.className}</div>
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-1">المدرسة</label>
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        {student.schoolId ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14}/> مسجل</span> : 'غير مرتبط'}
                    </div>
                </div>
            </div>

            <div className="border-t pt-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock size={16}/> تغيير كلمة المرور</h3>
                <div className="space-y-3 max-w-sm">
                    <input 
                        type="password" 
                        className="w-full p-2 border rounded-lg text-sm" 
                        placeholder="كلمة المرور الجديدة"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                    />
                    <input 
                        type="password" 
                        className="w-full p-2 border rounded-lg text-sm" 
                        placeholder="تأكيد كلمة المرور"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button 
                        onClick={handleChangePassword} 
                        disabled={!newPassword}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm w-full hover:bg-teal-700 disabled:opacity-50"
                    >
                        حفظ التغييرات
                    </button>
                    {msg && <p className={`text-xs font-bold ${msg.includes('بنجاح') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
                </div>
            </div>
        </div>
    );
};

const StudentCustomRecords = ({ student }: { student: Student }) => {
    const [sheets, setSheets] = useState<TrackingSheet[]>([]);
    
    useEffect(() => {
        const allSheets = getTrackingSheets(); 
        const relevant = allSheets.filter(s => s.className === student.className);
        setSheets(relevant);
    }, [student]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Table className="text-teal-600"/> السجلات الخاصة (المرنة)</h2>
            {sheets.length > 0 ? (
                <div className="grid gap-6">
                    {sheets.map(sheet => {
                        const myScores = sheet.scores[student.id] || {};
                        return (
                            <div key={sheet.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">{sheet.title}</h3>
                                    <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">{sheet.subject}</span>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                    <div className="flex gap-4">
                                        {sheet.columns.map(col => (
                                            <div key={col.id} className="flex-1 min-w-[100px] border rounded-lg p-3 text-center bg-gray-50/50">
                                                <div className="text-xs text-gray-500 font-bold mb-2 h-8 flex items-center justify-center">{col.title}</div>
                                                <div className="font-bold text-teal-700 text-lg">
                                                    {myScores[col.id] !== undefined ? (
                                                        col.type === 'CHECKBOX' ? (myScores[col.id] ? <CheckCircle className="mx-auto text-green-500"/> : '-') :
                                                        col.type === 'RATING' ? <div className="flex justify-center text-yellow-400"><Star size={16} fill="currentColor"/> <span className="text-black ml-1">{myScores[col.id]}</span></div> :
                                                        myScores[col.id]
                                                    ) : '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <Table size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>لا توجد سجلات خاصة تم رصدها لفصلك.</p>
                </div>
            )}
        </div>
    );
};

const StudentExamsView = ({ student }: { student: Student }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [myResults, setMyResults] = useState<ExamResult[]>([]);
    const [activeExam, setActiveExam] = useState<Exam | null>(null);

    useEffect(() => {
        const allExams = getExams();
        const relevantExams = allExams.filter(e => e.isActive && (e.gradeLevel === student.gradeLevel || !e.gradeLevel || e.gradeLevel === 'عام'));
        
        relevantExams.sort((a,b) => {
            if(a.date && b.date) return a.date.localeCompare(b.date);
            return 0;
        });

        setExams(relevantExams);

        const allResults = getExamResults();
        setMyResults(allResults.filter(r => r.studentId === student.id));
    }, [student]);

    const handleStartExam = (exam: Exam) => {
        if (confirm('هل أنت مستعد لبدء الاختبار؟ سيتم احتساب الوقت.')) {
            setActiveExam(exam);
        }
    };

    const handleExamSubmit = (result: ExamResult) => {
        saveExamResult(result);
        setMyResults(prev => [...prev, result]);
        
        const activeExam = exams.find(e => e.id === result.examId);
        if (activeExam) {
            const performanceRecord: PerformanceRecord = {
                id: `auto_exam_${result.id}`,
                studentId: student.id,
                subject: activeExam.subject,
                title: activeExam.title,
                category: 'PLATFORM_EXAM',
                score: result.score,
                maxScore: result.totalScore,
                date: new Date().toISOString().split('T')[0],
                notes: 'تم الحل عبر البوابة الإلكترونية'
            };
            addPerformance(performanceRecord);
        }

        setActiveExam(null);
        alert(`تم إرسال الإجابات بنجاح! نتيجتك: ${result.score} / ${result.totalScore}`);
        window.location.reload(); 
    };

    if (activeExam) {
        return <ExamRunner exam={activeExam} student={student} onSubmit={handleExamSubmit} onCancel={() => setActiveExam(null)} />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileQuestion className="text-teal-600"/> الاختبارات المتاحة
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(exam => {
                    const result = myResults.find(r => r.examId === exam.id);
                    return (
                        <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all relative overflow-hidden">
                            {exam.date && (
                                <div className="absolute top-0 left-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-br-lg font-bold">
                                    {formatDualDate(exam.date).split('|')[0]}
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4 mt-2">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{exam.title}</h3>
                                    <p className="text-sm text-gray-500">{exam.subject} - {exam.durationMinutes} دقيقة</p>
                                </div>
                                <div className="bg-purple-50 text-purple-700 p-2 rounded-lg">
                                    <FileQuestion size={24}/>
                                </div>
                            </div>
                            
                            {result ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                    <p className="text-xs text-green-800 font-bold mb-1">تم تقديم الاختبار</p>
                                    <p className="text-xl font-black text-green-600">{result.score} <span className="text-sm text-gray-400">/ {result.totalScore}</span></p>
                                    <p className="text-[10px] text-gray-500 mt-1">{formatDualDate(result.date)}</p>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleStartExam(exam)}
                                    className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <PlayCircle size={18}/> ابدأ الاختبار
                                </button>
                            )}
                        </div>
                    );
                })}
                
                {exams.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <FileQuestion size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد اختبارات متاحة حالياً.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ExamRunner = ({ exam, student, onSubmit, onCancel }: { exam: Exam, student: Student, onSubmit: (res: ExamResult) => void, onCancel: () => void }) => {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
    const [currentQIndex, setCurrentQIndex] = useState(0);

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
        let totalScore = 0;
        
        exam.questions.forEach(q => {
            totalScore += q.points;
            if (answers[q.id] === q.correctAnswer) {
                score += q.points;
            }
        });

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
        onSubmit(result);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestion = exam.questions[currentQIndex];

    return (
        <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
                <div>
                    <h2 className="font-bold text-lg text-gray-800">{exam.title}</h2>
                    <p className="text-xs text-gray-500">الطالب: {student.name}</p>
                </div>
                <div className={`text-xl font-mono font-bold px-4 py-2 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
                    <Timer className="inline-block mr-2" size={20}/>
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
                <div className="w-full max-w-2xl space-y-6">
                    <div className="w-full bg-gray-200 h-2 rounded-full mb-6">
                        <div className="bg-teal-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQIndex + 1) / exam.questions.length) * 100}%` }}></div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 animate-slide-up">
                        <div className="flex justify-between items-start mb-6">
                            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">سؤال {currentQIndex + 1} من {exam.questions.length}</span>
                            <span className="text-gray-400 text-xs">{currentQuestion.points} درجات</span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-800 mb-8 leading-relaxed">
                            {currentQuestion.text}
                        </h3>

                        <div className="space-y-3">
                            {currentQuestion.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: opt }))}
                                    className={`w-full p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between group ${
                                        answers[currentQuestion.id] === opt 
                                            ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm' 
                                            : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="font-medium">{opt}</span>
                                    {answers[currentQuestion.id] === opt && <CheckCircle className="text-teal-600" size={20}/>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button 
                            onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                            disabled={currentQIndex === 0}
                            className="px-6 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-50"
                        >
                            السابق
                        </button>
                        
                        {currentQIndex === exam.questions.length - 1 ? (
                            <button 
                                onClick={handleSubmit}
                                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
                            >
                                <Check size={18}/> إنهاء الاختبار
                            </button>
                        ) : (
                            <button 
                                onClick={() => setCurrentQIndex(Math.min(exam.questions.length - 1, currentQIndex + 1))}
                                className="px-8 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md"
                            >
                                التالي
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentPortal;
