
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, ReportHeaderConfig } from '../types';
import { downloadFromSupabase, getAssignments, getAcademicTerms, getReportHeaderConfig } from '../services/storageService';
import { User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Table, Library, LayoutGrid, CalendarDays, RefreshCw, X, Printer, FileText, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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
        { path: '/', label: 'الرئيسية', icon: LayoutGrid },
        { path: '/plan', label: 'الخطة الأسبوعية', icon: CalendarDays },
        { path: '/evaluation', label: 'تقييمي (درجاتي)', icon: Award },
        { path: '/timetable', label: 'الجدول الدراسي', icon: Clock },
        { path: '/exams', label: 'الاختبارات والواجبات', icon: FileQuestion },
        { path: '/attendance', label: 'سجل الحضور', icon: Calendar },
        { path: '/library', label: 'المكتبة والمصادر', icon: Library },
        { path: '/custom-records', label: 'سجلات خاصة', icon: Table },
        { path: '/profile', label: 'الملف الشخصي', icon: User },
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
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                currentPath === item.path 
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
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        currentPath === item.path ? 'bg-teal-100 text-teal-800 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50'
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
            <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative mb-16 md:mb-0 print:mb-0 print:overflow-visible">
                <header className="md:hidden bg-white p-4 border-b flex justify-between items-center shadow-sm z-20 shrink-0 print:hidden">
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        <Award className="text-teal-600"/> بوابة الطالب
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu size={24}/>
                    </button>
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
    return <div className="p-10 text-center text-gray-400 bg-white rounded-xl border border-dashed"><CalendarDays size={48} className="mx-auto mb-2 opacity-20"/><p>لا توجد خطة أسبوعية منشورة حالياً</p></div>; 
};
const StudentTimetable = ({ student }: { student: Student }) => { 
    return <div className="p-10 text-center text-gray-400 bg-white rounded-xl border border-dashed"><Clock size={48} className="mx-auto mb-2 opacity-20"/><p>الجدول الدراسي غير متوفر</p></div>; 
};
const StudentProfile = ({ student }: { student: Student }) => { 
    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User className="text-teal-600"/> الملف الشخصي</h3>
            <div className="space-y-4">
                <div><label className="text-xs text-gray-500">الاسم</label><div className="font-bold">{student.name}</div></div>
                <div><label className="text-xs text-gray-500">الهوية</label><div className="font-bold font-mono">{student.nationalId}</div></div>
                <div><label className="text-xs text-gray-500">الصف</label><div className="font-bold">{student.gradeLevel} - {student.className}</div></div>
            </div>
        </div>
    ); 
};
const StudentCustomRecords = ({ student }: { student: Student }) => { return <div className="text-center p-8 text-gray-400">لا توجد سجلات خاصة</div>; };
const StudentExamsView = ({ student }: { student: Student }) => { return <div className="text-center p-8 text-gray-400">لا توجد اختبارات متاحة</div>; };
const StudentLibrary = ({ student }: { student: Student }) => { return <div className="text-center p-8 text-gray-400">المكتبة فارغة</div>; };
const StudentAttendanceView = ({ student, attendance, terms }: { student: Student, attendance: AttendanceRecord[], terms: AcademicTerm[] }) => { 
    const myAtt = attendance.filter(a => a.studentId === student.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-bold">سجل الحضور والغياب</div>
            <div className="divide-y">
                {myAtt.map(a => (
                    <div key={a.id} className="p-4 flex justify-between items-center">
                        <span className="font-mono text-gray-600">{a.date}</span>
                        <span className={`px-3 py-1 rounded text-xs font-bold ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : a.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {a.status === 'PRESENT' ? 'حاضر' : a.status === 'ABSENT' ? 'غائب' : 'تأخر'}
                        </span>
                    </div>
                ))}
                {myAtt.length === 0 && <div className="p-8 text-center text-gray-400">لا يوجد سجلات حضور</div>}
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

                         return (
                             <div key={subject} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                 <div className="bg-white p-4 border-b flex justify-between items-center">
                                     <h3 className="font-bold text-gray-800">{subject}</h3>
                                     <span className={`text-xs font-bold px-2 py-1 rounded ${percentage >= 90 ? 'bg-green-100 text-green-700' : percentage >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                         {percentage}%
                                     </span>
                                 </div>
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

                 {/* PRINT VIEW */}
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

export default StudentPortal;
