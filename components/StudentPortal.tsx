import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, Exam, ExamResult, MessageLog, WeeklyPlanItem, AttendanceStatus, BehaviorStatus, LessonLink, Question, Assignment, TermPeriod } from '../types';
import { downloadFromSupabase, getAcademicTerms, getAssignments, getExams, getExamResults, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, saveExamResult } from '../services/storageService';
import { 
    User, Users, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Library, LayoutGrid, 
    CalendarDays, RefreshCw, X, Activity, CheckCircle, ChevronLeft, ChevronRight, Check, 
    XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, Medal, ExternalLink, 
    BookOpen, Zap, Star, TrendingUp, BrainCircuit, Rocket, Trophy, PlayCircle, Crown, 
    Briefcase, Compass, ShieldCheck, Wind, Radar as RadarIcon, ClipboardList, Globe, ChevronDown, ListFilter, Sparkles
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatDualDate } from '../services/dateService';
import BottomNavigation from './BottomNavigation';
import StudentLearningTest from './StudentLearningTest';

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
    const [messages, setMessages] = useState<MessageLog[]>([]);
    const [view, setView] = useState<'DASHBOARD' | 'TEST'>('DASHBOARD');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);

    useEffect(() => {
        const loadData = async () => {
            // جلب البيانات من السحابة لضمان التحديث
            if (navigator.onLine) await downloadFromSupabase();
            const allMsgs = getMessages();
            setMessages(allMsgs.filter(m => m.studentId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setAssignments(getAssignments('ALL'));
            setTerms(getAcademicTerms());
        };
        loadData();
    }, [currentUser]);

    const navItems = [
        { path: '/', label: 'الرئيسية', icon: LayoutGrid },
        { path: '/evaluation', label: 'درجاتي', icon: Activity },
        { path: '/messages', label: 'التنبيهات', icon: Bell, badge: messages.length },
    ];

    const stats = useMemo(() => {
        const myAtt = attendance.filter(a => a.studentId === currentUser.id);
        const myPerf = performance.filter(p => p.studentId === currentUser.id);
        
        let xp = 0;
        myAtt.forEach(a => {
            if (a.status === AttendanceStatus.PRESENT) xp += 10;
            if (a.status === AttendanceStatus.LATE) xp += 5;
            if (a.behaviorStatus === BehaviorStatus.POSITIVE) xp += 50;
        });
        myPerf.forEach(p => {
            const pct = p.score / p.maxScore;
            if (pct === 1) xp += 100;
            else if (pct >= 0.9) xp += 50;
        });

        const presentCount = myAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const attRate = myAtt.length > 0 ? Math.round((presentCount / myAtt.length) * 100) : 100;
        const avg = myPerf.length > 0 ? Math.round(myPerf.reduce((a,c)=>a+(c.score/c.maxScore),0)/myPerf.length*100) : 0;
        
        const positiveBehaviors = myAtt.filter(a=>a.behaviorStatus==='POSITIVE').length;
        const medals = { gold: Math.floor(positiveBehaviors/5), silver: Math.floor((positiveBehaviors%5)/3), bronze: positiveBehaviors%3 };

        return { xp, attRate, avg, medals, radarData: [
            { subject: 'الانضباط', A: attRate },
            { subject: 'المشاركة', A: Math.min(100, positiveBehaviors * 20) },
            { subject: 'الواجبات', A: avg },
            { subject: 'الاختبارات', A: Math.max(0, avg - 10) },
            { subject: 'السلوك', A: 90 },
        ]};
    }, [currentUser, attendance, performance]);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-right font-sans" dir="rtl">
            <aside className="hidden lg:flex flex-col w-80 bg-white border-l border-slate-200 shadow-sm z-30">
                <div className="p-10 border-b border-slate-100 flex flex-col items-center bg-gradient-to-b from-indigo-50/50 to-transparent">
                    <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-100 mb-6">{currentUser.name.charAt(0)}</div>
                    <h1 className="text-xl font-black text-slate-800 text-center">{currentUser.name}</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-md shadow-indigo-100"><Zap size={10} fill="white"/> {stats.xp} XP</span>
                        <span className="text-[10px] text-indigo-600 font-black bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{currentUser.className}</span>
                    </div>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    {navItems.map(item => (
                        <button key={item.path} onClick={() => { navigate(item.path); setView('DASHBOARD'); }} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black ${location.pathname === item.path && view === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                            <div className="flex items-center gap-4"><item.icon size={22}/> <span className="text-sm">{item.label}</span></div>
                            {item.badge ? <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">{item.badge}</span> : null}
                        </button>
                    ))}
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 mt-10 font-black transition-colors"><LogOut size={22}/> خروج</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-gray-50/30 pb-24">
                    {view === 'TEST' ? (
                        <StudentLearningTest student={currentUser} onComplete={() => setView('DASHBOARD')} />
                    ) : (
                        <Routes>
                            <Route path="/" element={<StudentDashboard stats={stats} student={currentUser} onStartTest={() => setView('TEST')} />} />
                            <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} assignments={assignments} terms={terms} />} />
                            <Route path="/messages" element={<StudentMessages messages={messages} />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    )}
                </main>
                <BottomNavigation role="STUDENT" onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>
        </div>
    );
};

const StudentDashboard = ({ stats, student, onStartTest }: any) => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-indigo-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl border border-indigo-800">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-500/30 to-transparent opacity-50"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">أهلاً بطلنا، {student.name.split(' ')[0]}! 🚀</h2>
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-sm font-bold inline-flex items-center gap-2">
                            <Zap className="text-yellow-400" size={18} fill="currentColor"/> رصيد نقاطك: {stats.xp}
                        </div>
                        {student.learningStyle && (
                            <div className="bg-purple-500/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-purple-400/30 text-sm font-black inline-flex items-center gap-2">
                                <BrainCircuit className="text-purple-300" size={18}/> نمطك: {student.learningStyle}
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <MedalCard icon={<Medal className="text-yellow-400"/>} label="ذهبي" count={stats.medals.gold} />
                    <MedalCard icon={<Medal className="text-slate-300"/>} label="فضي" count={stats.medals.silver} />
                    <MedalCard icon={<Medal className="text-orange-400"/>} label="برونزي" count={stats.medals.bronze} />
                </div>
            </div>
        </div>

        {!student.learningStyle && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-3xl"><BrainCircuit size={40}/></div>
                    <div>
                        <h3 className="text-xl font-black mb-1">كيف تحب أن تتعلم؟</h3>
                        <p className="text-sm opacity-80 font-bold">قم بأداء اختبار VARK لمساعدة معلمك على شرح الدروس بالطريقة التي تفضلها.</p>
                    </div>
                </div>
                <button onClick={onStartTest} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-transform whitespace-nowrap">ابدأ الاختبار الآن</button>
            </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-800"><RadarIcon size={20} className="text-indigo-600"/> راداري التعليمي</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={stats.radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                            <RechartsRadar name="أدائي" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.4} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-800"><Star size={20} className="text-yellow-500"/> مستوى التقدم</h3>
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[12px] border-indigo-50"></div>
                        <div className="absolute inset-0 rounded-full border-[12px] border-indigo-600 border-l-transparent border-b-transparent rotate-45" style={{ transform: `rotate(${stats.avg * 3.6}deg)` }}></div>
                        <span className="text-4xl font-black text-indigo-900">{stats.avg}%</span>
                    </div>
                    <p className="mt-6 font-bold text-slate-500 text-sm">معدلك التراكمي للفصل الحالي</p>
                </div>
            </div>
        </div>
    </div>
);

const MedalCard = ({ icon, label, count }: any) => (
    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col items-center">
        {icon}
        <span className="text-xl font-black mt-2">{count}</span>
        <span className="text-[10px] uppercase font-bold opacity-60">{label}</span>
    </div>
);

const StudentEvaluationView = ({ student, performance, assignments, terms }: { student: Student, performance: PerformanceRecord[], assignments: Assignment[], terms: AcademicTerm[] }) => {
    const currentTerm = useMemo(() => terms.find(t => t.isCurrent) || terms[0], [terms]);
    const periods = useMemo(() => currentTerm?.periods || [], [currentTerm]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods[0]?.id || '');

    useEffect(() => {
        if (periods.length > 0 && !selectedPeriodId) setSelectedPeriodId(periods[0].id);
    }, [periods]);

    const groupedWorks = useMemo(() => {
        // 1. جلب كافة الأعمال (الأعمدة) المسجلة من قبل المعلم لهذه الفترة
        const activeAssignments = assignments.filter(a => 
            (!selectedPeriodId || a.periodId === selectedPeriodId) &&
            (!currentTerm || a.termId === currentTerm.id)
        );

        // 2. تصفية درجات الطالب الخاصة
        const studentPerf = performance.filter(p => p.studentId === student.id);

        // 3. دمج البيانات: لكل تكليف، نبحث عن درجة الطالب
        const worksWithScores = activeAssignments.map(assign => {
            const scoreRecord = studentPerf.find(p => p.notes === assign.id || p.title === assign.title);
            return {
                id: assign.id,
                title: assign.title,
                category: assign.category,
                maxScore: assign.maxScore,
                url: assign.url,
                score: scoreRecord ? scoreRecord.score : null, // null تعني لم يتم الرصد بعد
                date: scoreRecord ? scoreRecord.date : 'بانتظار الرصد'
            };
        });

        return {
            homeworks: worksWithScores.filter(w => w.category === 'HOMEWORK'),
            activities: worksWithScores.filter(w => w.category === 'ACTIVITY'),
            exams: worksWithScores.filter(w => w.category === 'PLATFORM_EXAM')
        };
    }, [assignments, performance, student.id, selectedPeriodId, currentTerm]);

    // Fix: Using any for props to allow React internal 'key' prop when mapped
    const WorkCard = ({ work }: any) => (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${work.score !== null && work.score / work.maxScore >= 0.9 ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {work.category === 'PLATFORM_EXAM' ? <ClipboardList size={20}/> : <BookOpen size={20}/>}
                </div>
                <div className="text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{work.date}</span>
                </div>
            </div>
            
            <h4 className="font-black text-slate-800 text-sm mb-4 line-clamp-2">{work.title}</h4>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الدرجة المحصلة</span>
                    {work.score !== null ? (
                        <span className="font-black text-indigo-600 text-lg">{work.score} <span className="text-xs text-slate-300">/ {work.maxScore}</span></span>
                    ) : (
                        <span className="font-bold text-slate-300 text-sm italic">لم ترصد</span>
                    )}
                </div>
                {work.url ? (
                    <a href={work.url} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <Globe size={14}/>
                        <span className="text-[10px] font-black">عرض العمل</span>
                    </a>
                ) : (
                    work.score !== null && (
                        <div className={`text-[10px] font-black px-3 py-1 rounded-full ${work.score/work.maxScore >= 0.9 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {Math.round((work.score/work.maxScore)*100)}% إتقان
                        </div>
                    )
                )}
            </div>
        </div>
    );

    const CategorySection = ({ title, icon, works, colorClass }: any) => (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${colorClass} text-white shadow-lg`}>{icon}</div>
                <h3 className="text-lg font-black text-slate-800">{title}</h3>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{works.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {works.map((w: any) => <WorkCard key={w.id} work={w} />)}
                {works.length === 0 && (
                    <div className="col-span-full py-10 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                        <XCircle size={32} className="mb-2 opacity-20"/>
                        <p className="text-sm font-bold">لا توجد أعمال مضافة لهذا القسم</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <TrendingUp className="text-indigo-600"/> سجل الدرجات والتقييمات السحابي
                    </h2>
                    <p className="text-sm text-slate-500 font-bold mt-1">عرض كافة الأعمال المرتبطة بجدول الرصد للفترة الحالية</p>
                </div>

                {periods.length > 0 && (
                    <div className="flex bg-white p-1 rounded-2xl border shadow-sm self-stretch md:self-auto">
                        {periods.map(p => (
                            <button 
                                key={p.id} 
                                onClick={() => setSelectedPeriodId(p.id)}
                                className={`flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${selectedPeriodId === p.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <ListFilter size={14}/> {p.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-12">
                <CategorySection 
                    title="الواجبات والمهام" 
                    icon={<BookOpen size={20}/>} 
                    works={groupedWorks.homeworks} 
                    colorClass="bg-blue-600"
                />
                
                <CategorySection 
                    title="الأنشطة الصفية" 
                    icon={<Sparkles size={20}/>} 
                    works={groupedWorks.activities} 
                    colorClass="bg-teal-600"
                />

                <CategorySection 
                    title="الاختبارات الدورية" 
                    icon={<ClipboardList size={20}/>} 
                    works={groupedWorks.exams} 
                    colorClass="bg-purple-600"
                />
            </div>
        </div>
    );
};

const StudentMessages = ({ messages }: any) => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-black text-slate-800">التنبيهات والرسائل</h2>
        <div className="space-y-4">
            {messages.map((m: any) => (
                <div key={m.id} className="bg-white p-6 rounded-2xl border-r-4 border-indigo-500 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400">{formatDualDate(m.date)}</span>
                        <Bell size={16} className="text-indigo-500"/>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{m.content}</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-gray-400">مرسلة بواسطة: {m.sentBy}</div>
                </div>
            ))}
            {messages.length === 0 && <div className="p-20 text-center text-slate-300 font-bold">لا توجد رسائل جديدة.</div>}
        </div>
    </div>
);

export default StudentPortal;