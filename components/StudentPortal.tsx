
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, Exam, ExamResult, MessageLog, WeeklyPlanItem, AttendanceStatus, BehaviorStatus, LessonLink, Question } from '../types';
import { downloadFromSupabase, getAcademicTerms, getExams, getExamResults, getPerformance, getLessonLinks, getMessages, getWeeklyPlans, saveExamResult } from '../services/storageService';
import { User, Users, Calendar, Award, LogOut, Menu, Clock, FileQuestion, Library, LayoutGrid, CalendarDays, RefreshCw, X, Activity, CheckCircle, ChevronLeft, ChevronRight, Check, XCircle, ArrowRight, Video, Link as LinkIcon, Bell, Download, Medal, ExternalLink, BookOpen, Zap, Star, TrendingUp, BrainCircuit, Rocket, Trophy, PlayCircle, Crown, Briefcase, Compass, ShieldCheck, Wind } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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
                        <button key={item.path} onClick={() => navigate(item.path)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black ${location.pathname === item.path ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                            <div className="flex items-center gap-4"><item.icon size={22}/> <span className="text-sm">{item.label}</span></div>
                            {item.badge ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{item.badge}</span> : null}
                        </button>
                    ))}
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 mt-10 font-black transition-colors"><LogOut size={22}/> خروج</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-gray-50/30 pb-24">
                    <Routes>
                        <Route path="/" element={<StudentDashboard stats={stats} student={currentUser} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
                <BottomNavigation role="STUDENT" onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>
        </div>
    );
};

const StudentDashboard = ({ stats, student }: any) => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-indigo-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl border border-indigo-800">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-500/30 to-transparent opacity-50"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">أهلاً بطلنا، {student.name.split(' ')[0]}! 🚀</h2>
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-sm font-bold inline-flex items-center gap-2">
                        <Zap className="text-yellow-400" size={18} fill="currentColor"/> رصيد نقاطك: {stats.xp}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <MedalCard icon={<Medal className="text-yellow-400"/>} label="ذهبي" count={stats.medals.gold} />
                    <MedalCard icon={<Medal className="text-slate-300"/>} label="فضي" count={stats.medals.silver} />
                    <MedalCard icon={<Medal className="text-orange-400"/>} label="برونزي" count={stats.medals.bronze} />
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-800"><Radar size={20} className="text-indigo-600"/> راداري التعليمي</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={stats.radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} />
                            <Radar name="أدائي" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.4} />
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

const StudentEvaluationView = ({ student, performance }: any) => {
    const myPerf = performance.filter((p: any) => p.studentId === student.id).sort((a:any, b:any) => b.date.localeCompare(a.date));
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800">سجل الدرجات والتقييمات</h2>
            <div className="grid grid-cols-1 gap-4">
                {myPerf.map((p: any) => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white ${p.score/p.maxScore >= 0.9 ? 'bg-green-500' : p.score/p.maxScore >= 0.7 ? 'bg-blue-500' : 'bg-red-500'}`}>
                                {p.score}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{p.title}</h4>
                                <p className="text-xs text-slate-400">{p.subject} • {p.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-black text-slate-500">/ {p.maxScore}</span>
                        </div>
                    </div>
                ))}
                {myPerf.length === 0 && <div className="p-20 text-center text-slate-300 font-bold">لا توجد درجات مرصودة حالياً.</div>}
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
                    <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-400">مرسلة بواسطة: {m.sentBy}</div>
                </div>
            ))}
            {messages.length === 0 && <div className="p-20 text-center text-slate-300 font-bold">لا توجد رسائل جديدة.</div>}
        </div>
    </div>
);

export default StudentPortal;
