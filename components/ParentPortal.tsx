
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, MessageLog, SystemUser, Exam, WeeklyPlanItem, AcademicTerm } from '../types';
import { getMessages, getExams, getWeeklyPlans, getAcademicTerms, saveAttendance } from '../services/storageService';
import { User, Calendar, Award, LogOut, Phone, Mail, ChevronDown, CheckCircle, AlertTriangle, Clock, X, MessageSquare, TrendingUp, ShieldCheck, ChevronLeft, ChevronRight, Bell, FileQuestion, CalendarDays, BookOpen, Home, Filter, FileText, Send } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, performance, onLogout }) => {
    // Find all children linked to this parent phone
    const myChildren = useMemo(() => {
        return allStudents.filter(s => s.parentPhone === parentPhone || s.parentPhone?.replace(/\s/g, '') === parentPhone);
    }, [allStudents, parentPhone]);

    const [activeChildId, setActiveChildId] = useState<string>(myChildren.length > 0 ? myChildren[0].id : '');
    const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0];
    const [messages, setMessages] = useState<MessageLog[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'WEEKLY_PLAN' | 'MESSAGES' | 'CALENDAR'>('OVERVIEW');
    
    // Terms Logic
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>('');

    // Excuse Modal State
    const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
    const [selectedAbsentRecord, setSelectedAbsentRecord] = useState<AttendanceRecord | null>(null);
    const [excuseText, setExcuseText] = useState('');

    useEffect(() => {
        const loadedTerms = getAcademicTerms();
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
    }, []);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    useEffect(() => {
        if (activeChild) {
            // Load messages for this student
            const allMessages = getMessages();
            setMessages(allMessages.filter(m => m.studentId === activeChild.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            // Load exams
            const allExams = getExams();
            setExams(allExams.filter(e => e.isActive && (e.gradeLevel === activeChild.gradeLevel || e.gradeLevel === 'عام')));
        }
    }, [activeChild]);

    const stats = useMemo(() => {
        if (!activeChild) return null;
        
        let childAtt = attendance.filter(a => a.studentId === activeChild.id);
        let childPerf = performance.filter(p => p.studentId === activeChild.id);

        // Filter by Term
        if (activeTerm) {
            childAtt = childAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            childPerf = childPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        // Attendance Stats
        const absent = childAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const late = childAtt.filter(a => a.status === AttendanceStatus.LATE).length;
        const totalDays = childAtt.length;
        const attendanceRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;

        // Behavior Stats
        const positive = childAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
        const negative = childAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;

        // Academic Stats
        const totalScore = childPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
        const avgScore = childPerf.length > 0 ? Math.round((totalScore / childPerf.length) * 100) : 0;

        // Recent Activity (Visual display can show up to 5, regardless of term, or strictly term based. Let's stick to term based)
        const recentAtt = [...childAtt].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
        const recentPerf = [...childPerf].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        // Absent Days without excuse
        const unexcusedAbsences = childAtt.filter(a => (a.status === AttendanceStatus.ABSENT || a.status === AttendanceStatus.LATE) && !a.excuseNote);

        return { absent, late, attendanceRate, positive, negative, avgScore, recentAtt, recentPerf, unexcusedAbsences };
    }, [activeChild, attendance, performance, activeTerm]);

    const handleSubmitExcuse = () => {
        if (!selectedAbsentRecord || !excuseText) return;
        
        const updatedRecord: AttendanceRecord = {
            ...selectedAbsentRecord,
            excuseNote: excuseText,
            // status: AttendanceStatus.EXCUSED // Don't change status immediately, wait for teacher approval? Or set it? Usually teacher approval.
            // Let's keep status as is, just attach note. Teacher sees it in "Pending Excuses".
        };
        
        saveAttendance([updatedRecord]);
        setIsExcuseModalOpen(false);
        setExcuseText('');
        setSelectedAbsentRecord(null);
        alert('تم إرسال العذر للمعلم بنجاح.');
        // Trigger reload? The parent component passes data, it might need refresh. 
        // Ideally App.tsx handles re-render on storage change. 
        window.location.reload(); 
    };

    if (!activeChild) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <User size={48} className="mx-auto text-gray-300 mb-4"/>
                    <h2 className="text-xl font-bold text-gray-800">عفواً</h2>
                    <p className="text-gray-500 mt-2">لم يتم العثور على طلاب مسجلين برقم الجوال هذا.</p>
                    <button onClick={onLogout} className="mt-6 text-red-500 font-bold hover:underline">تسجيل الخروج</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-right" dir="rtl">
            {/* Header */}
            <header className="bg-indigo-900 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <ShieldCheck size={24} className="text-yellow-400"/>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">بوابة ولي الأمر</h1>
                            <p className="text-xs text-indigo-200">متابعة الأبناء</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="text-xs bg-red-600/80 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <LogOut size={14}/> خروج
                    </button>
                </div>
                
                {/* Children Switcher */}
                <div className="bg-indigo-800 overflow-x-auto">
                    <div className="max-w-6xl mx-auto px-4 flex gap-2 py-2">
                        {myChildren.map(child => (
                            <button
                                key={child.id}
                                onClick={() => setActiveChildId(child.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all border-b-4 ${
                                    activeChildId === child.id 
                                    ? 'bg-gray-100 text-indigo-900 border-yellow-400 font-bold' 
                                    : 'bg-indigo-900/50 text-indigo-200 border-transparent hover:bg-indigo-700'
                                }`}
                            >
                                <User size={16}/>
                                <span>{child.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Navigation Tabs (Mobile optimized) */}
            <div className="bg-white border-b sticky top-[110px] z-40 shadow-sm">
                <div className="max-w-6xl mx-auto flex overflow-x-auto">
                    <button onClick={() => setActiveTab('OVERVIEW')} className={`flex-1 py-3 px-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'OVERVIEW' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>نظرة عامة</button>
                    <button onClick={() => setActiveTab('WEEKLY_PLAN')} className={`flex-1 py-3 px-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'WEEKLY_PLAN' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>الخطة الأسبوعية</button>
                    <button onClick={() => setActiveTab('MESSAGES')} className={`flex-1 py-3 px-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'MESSAGES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                        الرسائل {messages.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full ml-1">{messages.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('CALENDAR')} className={`flex-1 py-3 px-2 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === 'CALENDAR' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>التقويم</button>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in pb-20">
                
                {/* Student Info Card & Filter */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white">
                        {activeChild.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-right flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">{activeChild.name}</h2>
                        <p className="text-gray-500 font-medium mb-3">{activeChild.gradeLevel} - {activeChild.className}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1"><User size={12}/> ID: {activeChild.nationalId}</span>
                            {activeChild.schoolId && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1">مدرسة مسجلة</span>}
                        </div>
                    </div>
                    
                    {/* Term Selector for Parents */}
                    <div className="w-full md:w-auto">
                        <label className="block text-xs font-bold text-gray-500 mb-1">الفترة الزمنية</label>
                        <select 
                            value={selectedTermId} 
                            onChange={(e) => setSelectedTermId(e.target.value)}
                            className="w-full md:w-40 p-2 border rounded-lg bg-gray-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {stats && (
                        <div className="flex gap-4">
                            <div className="text-center">
                                <div className={`text-2xl font-black ${stats.attendanceRate >= 90 ? 'text-green-600' : 'text-red-600'}`}>{stats.attendanceRate}%</div>
                                <div className="text-xs text-gray-400 font-bold uppercase">حضور</div>
                            </div>
                            <div className="w-[1px] bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-blue-600">{stats.avgScore}%</div>
                                <div className="text-xs text-gray-400 font-bold uppercase">مستوى</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- TAB CONTENT --- */}

                {activeTab === 'OVERVIEW' && stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        
                        {/* Attendance Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
                                <h3 className="font-bold text-teal-800 flex items-center gap-2"><Calendar size={18}/> سجل الحضور ({activeTerm ? activeTerm.name : 'عام'})</h3>
                                <div className="flex gap-2">
                                    <span className="text-xs bg-white px-2 py-1 rounded text-teal-600 font-bold">{stats.absent} غياب</span>
                                </div>
                            </div>
                            
                            {/* Unexcused Absences Alert */}
                            {stats.unexcusedAbsences.length > 0 && (
                                <div className="bg-red-50 p-3 border-b border-red-100">
                                    <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1"><AlertTriangle size={14}/> يوجد غياب غير مبرر، يرجى تقديم عذر:</p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {stats.unexcusedAbsences.map(rec => (
                                            <button 
                                                key={rec.id} 
                                                onClick={() => { setSelectedAbsentRecord(rec); setIsExcuseModalOpen(true); }}
                                                className="flex-shrink-0 bg-white border border-red-200 text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
                                            >
                                                {formatDualDate(rec.date)} (قدم عذر)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-4">
                                {stats.recentAtt.length > 0 ? (
                                    <div className="space-y-3">
                                        {stats.recentAtt.map(rec => (
                                            <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-10 rounded-full ${
                                                        rec.status === AttendanceStatus.PRESENT ? 'bg-green-500' :
                                                        rec.status === AttendanceStatus.ABSENT ? 'bg-red-500' : 
                                                        rec.status === AttendanceStatus.LATE ? 'bg-yellow-500' : 'bg-blue-500'
                                                    }`}></div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{formatDualDate(rec.date)}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {rec.status === AttendanceStatus.PRESENT ? 'حاضر' :
                                                             rec.status === AttendanceStatus.ABSENT ? 'غائب' :
                                                             rec.status === AttendanceStatus.LATE ? 'متأخر' : 'بعذر'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {(rec.behaviorStatus !== BehaviorStatus.NEUTRAL) && (
                                                        <span className={`text-xs px-2 py-1 rounded font-bold ${rec.behaviorStatus === BehaviorStatus.POSITIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {rec.behaviorStatus === BehaviorStatus.POSITIVE ? 'سلوك إيجابي' : 'ملاحظة سلبية'}
                                                        </span>
                                                    )}
                                                    {rec.excuseNote && <span className="text-[10px] text-blue-600 flex items-center gap-1"><FileText size={10}/> تم تقديم عذر</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-400 text-sm py-4">لا توجد سجلات حديثة في هذه الفترة</p>
                                )}
                            </div>
                        </div>

                        {/* Performance Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                                <h3 className="font-bold text-purple-800 flex items-center gap-2"><Award size={18}/> آخر الدرجات ({activeTerm ? activeTerm.name : 'عام'})</h3>
                                <span className="text-xs bg-white px-2 py-1 rounded text-purple-600 font-bold">المتوسط: {stats.avgScore}%</span>
                            </div>
                            <div className="p-4">
                                {stats.recentPerf.length > 0 ? (
                                    <div className="space-y-3">
                                        {stats.recentPerf.map(perf => (
                                            <div key={perf.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div>
                                                    <div className="font-bold text-gray-800 text-sm">{perf.title}</div>
                                                    <div className="text-xs text-gray-500">{perf.subject} • {formatDualDate(perf.date)}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg text-purple-700">{perf.score}</span>
                                                    <span className="text-xs text-gray-400">/ {perf.maxScore}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-400 text-sm py-4">لا توجد درجات حديثة في هذه الفترة</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center col-span-1 lg:col-span-2">
                            <h3 className="font-bold text-yellow-800 mb-2 flex items-center justify-center gap-2"><MessageSquare size={20}/> تواصل مع المدرسة</h3>
                            <p className="text-sm text-yellow-700 mb-4">هل لديك استفسار حول أداء ابنك؟ يمكنك التواصل مباشرة مع المرشد الطلابي.</p>
                            <button className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-700 shadow-sm transition-colors">
                                إرسال رسالة
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'WEEKLY_PLAN' && (
                    <ParentWeeklyPlan student={activeChild} />
                )}

                {activeTab === 'MESSAGES' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Bell size={18} className="text-indigo-600"/> التنبيهات والرسائل الواردة</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {messages.length > 0 ? messages.map(msg => (
                                <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`p-1.5 rounded-full ${msg.type === 'WHATSAPP' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {msg.type === 'WHATSAPP' ? <Phone size={14}/> : <Mail size={14}/>}
                                            </span>
                                            <span className="font-bold text-gray-800 text-sm">{msg.sentBy || 'الإدارة المدرسية'}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{formatDualDate(msg.date)}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {msg.content}
                                    </p>
                                </div>
                            )) : (
                                <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                    <Mail size={48} className="mb-4 opacity-20"/>
                                    <p>لا توجد رسائل جديدة</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'CALENDAR' && (
                    <ParentCalendar attendance={attendance} exams={exams} studentId={activeChild.id} />
                )}

            </main>

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

// ... (Rest of sub-components ParentWeeklyPlan and ParentCalendar remain identical as they don't depend on term filter heavily or handle it internally if needed) ...
const ParentWeeklyPlan = ({ student }: { student: Student }) => {
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d.toISOString().split('T')[0];
    });
    const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);

    useEffect(() => {
        // Fetch ALL plans then filter by class & week (No teacher ID filter for parents)
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
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-indigo-600"/> الخطة الأسبوعية: {student.className}</h2>
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
                            <div className="bg-indigo-50/50 p-3 border-b border-indigo-100 font-bold text-indigo-800 flex justify-between items-center">
                                <span className="flex items-center gap-2"><Calendar size={16}/> {dayNamesAr[day]}</span>
                                <span className="text-xs font-normal bg-white px-2 py-0.5 rounded text-indigo-600 border border-indigo-100">{dayPlans.length} حصص</span>
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

const ParentCalendar: React.FC<{ attendance: AttendanceRecord[], exams: Exam[], studentId: string }> = ({ attendance, exams, studentId }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday

    const changeMonth = (dir: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + dir);
        setCurrentMonth(newDate);
    };

    const getDayStatus = (day: number) => {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 1. Check for Exams on this day
        const exam = exams.find(e => e.date === dateStr);
        if (exam) return { type: 'EXAM', label: 'اختبار', detail: exam.title };

        // 2. Check Attendance
        const att = attendance.find(a => a.studentId === studentId && a.date === dateStr);
        if (att) {
            if (att.status === AttendanceStatus.ABSENT) return { type: 'ABSENT', label: 'غائب' };
            if (att.status === AttendanceStatus.LATE) return { type: 'LATE', label: 'تأخر' };
            if (att.status === AttendanceStatus.PRESENT) return { type: 'PRESENT', label: 'حاضر' };
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar size={18}/> التقويم الأكاديمي</h3>
                <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={16}/></button>
                    <span className="text-sm font-bold w-32 text-center">
                        {currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={16}/></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 text-center border-b bg-gray-50 text-xs font-bold text-gray-500">
                <div className="p-3">الأحد</div>
                <div className="p-3">الاثنين</div>
                <div className="p-3">الثلاثاء</div>
                <div className="p-3">الأربعاء</div>
                <div className="p-3">الخميس</div>
                <div className="p-3">الجمعة</div>
                <div className="p-3">السبت</div>
            </div>

            <div className="grid grid-cols-7 text-center">
                {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 border-b border-l bg-gray-50/30"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const status = getDayStatus(day);
                    return (
                        <div key={day} className="h-24 border-b border-l p-1 relative hover:bg-gray-50 transition-colors flex flex-col items-center justify-start pt-2 group">
                            <span className="text-xs font-bold text-gray-700">{day}</span>
                            {status && (
                                <div className="mt-1 w-full px-1">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded block w-full truncate ${
                                        status.type === 'EXAM' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                        status.type === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                        status.type === 'LATE' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                    }`} title={status.detail || status.label}>
                                        {status.type === 'EXAM' && <FileQuestion size={10} className="inline ml-1"/>}
                                        {status.label}
                                    </span>
                                    {status.detail && (
                                        <div className="absolute z-10 bottom-full mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                            {status.detail}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="p-4 flex gap-4 text-xs font-bold text-gray-500 bg-gray-50 border-t flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-full"></div> اختبار</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> حاضر</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> غائب</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> متأخر</div>
            </div>
        </div>
    );
}

export default ParentPortal;
