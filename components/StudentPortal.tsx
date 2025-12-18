
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, Exam, ExamResult, MessageLog, WeeklyPlanItem, AttendanceStatus, BehaviorStatus, LessonLink, Question } from '../types';
import { downloadFromSupabase, getAcademicTerms, getExams, getExamResults, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, saveExamResult } from '../services/storageService';
import { User, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Library, LayoutGrid, CalendarDays, RefreshCw, X, Activity, CheckCircle, ChevronLeft, ChevronRight, Check, XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, Medal, ExternalLink, BookOpen, Zap, Star, TrendingUp, BrainCircuit, Rocket, Trophy, PlayCircle } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import { formatDualDate } from '../services/dateService';
import BottomNavigation from './BottomNavigation';

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

    useEffect(() => {
        const allMsgs = getMessages();
        setMessages(allMsgs.filter(m => m.studentId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [currentUser]);

    const navItems = [
        { path: '/', label: 'الرئيسية', icon: LayoutGrid },
        { path: '/plan', label: 'الجدول الأسبوعي', icon: CalendarDays },
        { path: '/evaluation', label: 'درجاتي', icon: Activity },
        { path: '/exams', label: 'الاختبارات', icon: FileQuestion },
        { path: '/attendance', label: 'سجل الحضور', icon: Calendar },
        { path: '/messages', label: 'التنبيهات', icon: Bell, badge: messages.length },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-right font-sans" dir="rtl">
            <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-slate-200 shadow-sm z-30">
                <div className="p-8 border-b border-slate-100 flex flex-col items-center bg-gradient-to-b from-indigo-50/50 to-transparent">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100 mb-4">{currentUser.name.charAt(0)}</div>
                    <h1 className="text-lg font-bold text-slate-800 text-center">{currentUser.name}</h1>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full mt-2 border border-indigo-100">{currentUser.className}</span>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(item => (
                        <button key={item.path} onClick={() => navigate(item.path)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium ${location.pathname === item.path ? 'bg-indigo-600 text-white shadow-lg font-bold' : 'text-slate-600 hover:bg-indigo-50'}`}>
                            <div className="flex items-center gap-3"><item.icon size={20}/> <span className="text-sm">{item.label}</span></div>
                            {item.badge ? <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span> : null}
                        </button>
                    ))}
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 mt-4 font-bold"><LogOut size={20}/> خروج</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <Routes>
                        <Route path="/" element={<StudentDashboard student={currentUser} attendance={attendance} performance={performance} />} />
                        <Route path="/plan" element={<StudentWeeklyPlan student={currentUser} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} />} />
                        <Route path="/exams" element={<StudentExamsView student={currentUser} />} />
                        <Route path="/attendance" element={<StudentAttendanceView student={currentUser} attendance={attendance} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
                <BottomNavigation role="STUDENT" onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>
        </div>
    );
};

const StudentDashboard = ({ student, attendance, performance }: any) => {
    const myAtt = attendance.filter((a: any) => a.studentId === student.id);
    const myPerf = performance.filter((p: any) => p.studentId === student.id);
    const stats = useMemo(() => {
        const attRate = myAtt.length > 0 ? Math.round((myAtt.filter((a: any) => a.status === 'PRESENT').length / myAtt.length) * 100) : 100;
        const avg = myPerf.length > 0 ? Math.round((myPerf.reduce((a: any, c: any) => a + (c.score / c.maxScore), 0) / myPerf.length) * 100) : 0;
        return { attRate, avg, radarData: [
            { subject: 'الانضباط', A: attRate },
            { subject: 'المشاركة', A: Math.min(100, myAtt.filter((a:any)=>a.behaviorStatus==='POSITIVE').length * 20) },
            { subject: 'الواجبات', A: avg },
            { subject: 'الاختبارات', A: avg },
        ]};
    }, [myAtt, myPerf]);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4">واصل التألق، {student.name.split(' ')[0]}! 🌟</h2>
                        <div className="flex gap-4 mt-8"><button className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl"><Clock/> الجدول الدراسي</button></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <StatsCard label="الحضور" value={`${stats.attRate}%`} color="bg-emerald-500/20" />
                        <StatsCard label="المعدل" value={`${stats.avg}%`} color="bg-blue-500/20" />
                    </div>
                </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2"><BrainCircuit size={24} className="text-indigo-600"/> رادار المهارات</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={stats.radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 12, fontWeight: 'bold'}} />
                            <Radar name="أدائي" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const StatsCard = ({ label, value, color }: any) => (
    <div className={`${color} backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col items-center text-center`}>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">{label}</div>
    </div>
);

const StudentWeeklyPlan = ({ student }: any) => {
    const plans = getWeeklyPlans().filter((p:any)=>p.classId === student.className);
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800">الخطة الأسبوعية</h2>
            {['Sunday','Monday','Tuesday','Wednesday','Thursday'].map(d => (
                <div key={d} className="bg-white p-4 rounded-2xl border shadow-sm">
                    <h4 className="font-bold border-b pb-2 mb-2 text-indigo-600">{d}</h4>
                    {plans.filter((p:any)=>p.day===d).length > 0 ? plans.filter((p:any)=>p.day===d).map((p:any)=> (
                        <div key={p.id} className="py-2 flex justify-between"><span>ح{p.period}: {p.subjectName}</span><span className="text-slate-400">{p.lessonTopic}</span></div>
                    )) : <p className="text-xs text-slate-300">لا يوجد حصص مسجلة</p>}
                </div>
            ))}
        </div>
    );
}

const StudentEvaluationView = ({ student, performance }: any) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-800">سجل الدرجات</h2>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b"><tr><th className="p-4">التاريخ</th><th className="p-4">التقييم</th><th className="p-4">المادة</th><th className="p-4 text-center">الدرجة</th></tr></thead>
                <tbody className="divide-y">
                    {performance.filter((p:any)=>p.studentId === student.id).map((p:any)=>(
                        <tr key={p.id} className="hover:bg-slate-50"><td className="p-4 text-xs font-mono">{p.date}</td><td className="p-4 font-bold">{p.title}</td><td className="p-4">{p.subject}</td><td className="p-4 text-center font-black text-indigo-600">{p.score} / {p.maxScore}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const StudentExamsView = ({ student }: any) => {
    const [exams, setExams] = useState<Exam[]>([]);
    useEffect(() => { setExams(getExams().filter(e => e.isActive && (e.gradeLevel === student.gradeLevel || e.gradeLevel === 'عام'))); }, [student]);
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800">الاختبارات الإلكترونية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams.map(e => (
                    <div key={e.id} className="bg-white p-8 rounded-3xl border shadow-sm hover:shadow-xl transition-all">
                        <h3 className="text-xl font-bold mb-2">{e.title}</h3>
                        <p className="text-sm text-slate-400 mb-6">{e.subject} • {e.durationMinutes} دقيقة</p>
                        <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2"><PlayCircle/> ابدأ الآن</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentAttendanceView = ({ student, attendance }: any) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-black text-slate-800">سجل حضوري</h2>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 font-bold border-b"><tr><th className="p-4">التاريخ</th><th className="p-4">الحالة</th></tr></thead>
                <tbody className="divide-y">
                    {attendance.filter((a:any)=>a.studentId===student.id).map((a:any)=>(
                        <tr key={a.id}><td className="p-4 font-mono text-xs">{a.date}</td><td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${a.status==='PRESENT'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{a.status==='PRESENT'?'حاضر':'غائب'}</span></td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const StudentMessages = ({ messages }: any) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-black text-slate-800">تنبيهات المعلم</h2>
        {messages.map((m: any) => (
            <div key={m.id} className="bg-white p-6 rounded-2xl border shadow-sm border-r-4 border-r-indigo-600">
                <div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-slate-400">{formatDualDate(m.date)}</span></div>
                <p className="text-sm font-medium text-slate-700">{m.content}</p>
            </div>
        ))}
    </div>
);

export default StudentPortal;
