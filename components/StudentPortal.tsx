import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, MessageLog, AttendanceStatus, BehaviorStatus, Assignment, TermPeriod } from '../types';
import { downloadFromSupabase, getAcademicTerms, getAssignments, getMessages } from '../services/storageService';
import { 
    LogOut, LayoutGrid, Bell, Zap, Star, Radar as RadarIcon, TrendingUp, BookOpen, ClipboardList, CheckCircle, BrainCircuit, Medal, Globe, Info, Sparkles
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ResponsiveContainer, Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
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
    const [messages, setMessages] = useState<MessageLog[]>([]);
    const [view, setView] = useState<'DASHBOARD' | 'TEST'>('DASHBOARD');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (navigator.onLine) await downloadFromSupabase();
            const allMsgs = getMessages();
            setMessages(allMsgs.filter((m: MessageLog) => m.studentId === currentUser.id).sort((a: MessageLog, b: MessageLog) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setAssignments(getAssignments('ALL'));
            setTerms(getAcademicTerms());
        };
        loadData();
    }, [currentUser]);

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
        <div className="flex h-screen bg-slate-50 overflow-hidden text-right font-tajawal" dir="rtl">
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
                    <button onClick={() => { navigate('/'); setView('DASHBOARD'); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black ${location.pathname === '/' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={22}/> الرئيسية</button>
                    <button onClick={() => navigate('/evaluation')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black ${location.pathname === '/evaluation' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}><TrendingUp size={22}/> درجاتي</button>
                    <button onClick={() => navigate('/messages')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black ${location.pathname === '/messages' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}><Bell size={22}/> التنبيهات</button>
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 mt-10 font-black transition-colors"><LogOut size={22}/> خروج</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-gray-50/30 pb-24 lg:pb-10">
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
                <BottomNavigation role="STUDENT" onMenuClick={() => {}} />
            </div>
        </div>
    );
};

const StudentDashboard = ({ stats, student, onStartTest }: any) => (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div className="bg-indigo-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl border border-indigo-800">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-500/30 to-transparent opacity-50 pointer-events-none"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="text-center md:text-right">
                    <h2 className="text-3xl md:text-5xl font-black mb-4 md:mb-6 tracking-tight leading-tight">أهلاً، {student.name.split(' ')[0]}! 🚀</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-2xl border border-white/10 text-[10px] md:text-sm font-bold inline-flex items-center gap-2">
                            <Zap className="text-yellow-400" size={16} fill="currentColor"/> رصيد نقاطك: {stats.xp}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <MedalCard icon={<Medal className="text-yellow-400" size={24}/>} label="ذهبي" count={stats.medals.gold} />
                    <MedalCard icon={<Medal className="text-slate-300" size={24}/>} label="فضي" count={stats.medals.silver} />
                    <MedalCard icon={<Medal className="text-orange-400" size={24}/>} label="برونزي" count={stats.medals.bronze} />
                </div>
            </div>
        </div>

        {!student.learningStyle && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 md:p-8 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 md:gap-6 text-center md:text-right">
                    <div className="p-3 md:p-4 bg-white/20 rounded-2xl md:rounded-3xl shrink-0"><BrainCircuit size={32}/></div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black mb-1">كيف تحب أن تتعلم؟</h3>
                        <p className="text-[10px] md:text-sm opacity-80 font-bold">ساعد معلمك على شرح الدروس بالطريقة التي تفضلها.</p>
                    </div>
                </div>
                <button onClick={onStartTest} className="w-full md:w-auto bg-white text-indigo-600 px-8 py-3 rounded-xl font-black shadow-lg active:scale-95 transition-transform whitespace-nowrap">ابدأ الاختبار الآن</button>
            </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-10">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-slate-800"><RadarIcon size={18} className="text-indigo-600"/> راداري التعليمي</h3>
                <div className="h-64 md:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={stats.radarData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} />
                            <RechartsRadar name="أدائي" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.4} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-black mb-8 w-full text-right flex items-center gap-3 text-slate-800"><Star size={18} className="text-yellow-500"/> مستوى التقدم</h3>
                <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[10px] md:border-[12px] border-indigo-50"></div>
                    <div className="absolute inset-0 rounded-full border-[10px] md:border-[12px] border-indigo-600 border-l-transparent border-b-transparent rotate-45" style={{ transform: `rotate(${stats.avg * 3.6}deg)` }}></div>
                    <span className="text-3xl md:text-4xl font-black text-indigo-900">{stats.avg}%</span>
                </div>
                <p className="mt-6 font-bold text-slate-500 text-xs md:text-sm">معدلك التراكمي للفصل الحالي</p>
            </div>
        </div>
    </div>
);

const MedalCard = ({ icon, label, count }: any) => (
    <div className="bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/10 flex flex-col items-center">
        {icon}
        <span className="text-lg md:text-xl font-black mt-1">{count}</span>
        <span className="text-[8px] md:text-[10px] uppercase font-bold opacity-60">{label}</span>
    </div>
);

const StudentEvaluationView = ({ student, performance, assignments, terms }: any) => {
    const currentTerm = useMemo(() => terms.find((t: AcademicTerm) => t.isCurrent) || terms[0], [terms]);
    const periods = useMemo(() => currentTerm?.periods || [], [currentTerm]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods[0]?.id || '');

    useEffect(() => {
        if (periods.length > 0 && !selectedPeriodId) setSelectedPeriodId(periods[0].id);
    }, [periods]);

    const groupedWorks = useMemo(() => {
        const activeAssignments = assignments.filter((a: any) => 
            (!selectedPeriodId || a.periodId === selectedPeriodId) &&
            (!currentTerm || a.termId === currentTerm.id)
        );
        const studentPerf = performance.filter((p: PerformanceRecord) => p.studentId === student.id);

        const worksWithScores = activeAssignments.map((assign: any) => {
            const scoreRecord = studentPerf.find((p: PerformanceRecord) => p.notes === assign.id || p.title === assign.title);
            return {
                id: assign.id,
                title: assign.title,
                category: assign.category,
                maxScore: assign.maxScore,
                url: assign.url,
                score: scoreRecord ? scoreRecord.score : null,
                date: scoreRecord ? scoreRecord.date : 'بانتظار الرصد'
            };
        });

        return {
            homeworks: worksWithScores.filter((w: any) => w.category === 'HOMEWORK'),
            activities: worksWithScores.filter((w: any) => w.category === 'ACTIVITY'),
            exams: worksWithScores.filter((w: any) => w.category === 'PLATFORM_EXAM' || w.category === 'OTHER')
        };
    }, [assignments, performance, student.id, selectedPeriodId, currentTerm]);

    const WorkCard = ({ work }: any) => (
        <div className={`p-4 md:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between h-full bg-white ${
            work.score !== null ? 'border-emerald-100 shadow-sm bg-emerald-50/10' : 'border-slate-100 shadow-sm opacity-90'
        }`}>
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${work.score !== null ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {work.category === 'PLATFORM_EXAM' ? <ClipboardList size={20}/> : <BookOpen size={20}/>}
                </div>
                <div className="text-left flex flex-col items-end">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase font-mono">{work.date}</span>
                </div>
            </div>
            
            <h4 className={`font-black text-xs md:text-sm mb-4 line-clamp-2 ${work.score !== null ? 'text-slate-800' : 'text-slate-500'}`}>{work.title}</h4>
            
            <div className="flex items-center justify-between mt-auto pt-3 md:pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase">الدرجة</span>
                    {work.score !== null ? (
                        <span className="font-black text-indigo-600 text-base md:text-lg">{work.score} <span className="text-[10px] text-slate-300">/ {work.maxScore}</span></span>
                    ) : (
                        <span className="font-bold text-slate-300 text-[10px] italic">لم ترصد</span>
                    )}
                </div>
                {work.url && (
                    <a href={work.url} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg hover:bg-indigo-700 active:scale-95 flex items-center gap-1">
                        <Globe size={12}/><span className="text-[9px] font-black">فتح</span>
                    </a>
                )}
            </div>
        </div>
    );

    const CategorySection = ({ title, icon, works, colorClass }: any) => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
                <div className={`p-1.5 md:p-2 rounded-lg ${colorClass} text-white shadow-md`}>{React.cloneElement(icon, {size: 16})}</div>
                <h3 className="text-base md:text-lg font-black text-slate-800">{title}</h3>
                <span className="bg-slate-100 text-slate-500 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full">{works.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {works.map((w: any) => <WorkCard key={w.id} work={w} />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-10 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-indigo-600"/> سجل التقييمات
                    </h2>
                </div>

                {periods.length > 0 && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm self-stretch md:self-auto overflow-x-auto no-scrollbar">
                        {periods.map((p: TermPeriod) => (
                            <button 
                                key={p.id} 
                                onClick={() => setSelectedPeriodId(p.id)}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 whitespace-nowrap ${selectedPeriodId === p.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-8 md:space-y-12">
                <CategorySection title="الواجبات" icon={<BookOpen/>} works={groupedWorks.homeworks} colorClass="bg-blue-600" />
                <CategorySection title="الأنشطة" icon={<Sparkles/>} works={groupedWorks.activities} colorClass="bg-teal-600" />
                <CategorySection title="الاختبارات" icon={<ClipboardList/>} works={groupedWorks.exams} colorClass="bg-purple-600" />
            </div>
        </div>
    );
};

const StudentMessages = ({ messages }: any) => (
    <div className="space-y-6 animate-fade-in pb-10">
        <h2 className="text-xl md:text-2xl font-black text-slate-800">التنبيهات والرسائل</h2>
        <div className="space-y-4">
            {messages.map((m: MessageLog) => (
                <div key={m.id} className="bg-white p-5 md:p-6 rounded-[1.5rem] border-r-4 border-indigo-500 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-400">{formatDualDate(m.date)}</span>
                        <Bell size={16} className="text-indigo-500"/>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-bold text-sm md:text-base">"{m.content}"</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] text-gray-400">المرسل: {m.sentBy}</div>
                </div>
            ))}
        </div>
    </div>
);

export default StudentPortal;