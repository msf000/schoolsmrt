
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, MessageLog, AttendanceStatus, BehaviorStatus, Assignment, TermPeriod, Badge, Reward, WeeklyChallenge, PurchaseRequest, ScheduleItem, Exam } from '../types';
import { downloadFromSupabase, getAcademicTerms, getAssignments, getMessages, updateStudent, getChallenges, savePurchaseRequest, getSchedules, getRewards, getExams, getExamResults } from '../services/storageService';
import { 
    LogOut, LayoutGrid, Bell, Zap, Star, Radar as RadarIcon, TrendingUp, BookOpen, ClipboardList, CheckCircle, BrainCircuit, Medal, Globe, Info, Sparkles, Trophy, Target, ShieldCheck, Flame, ChevronRight, Crown, ShoppingBag, ShoppingCart, Heart, Share2, Download, X, ListChecks, Clock, QrCode, CreditCard, CalendarDays, FileQuestion, Activity, UserCircle, Wand2, Bot
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ResponsiveContainer, Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import { formatDualDate } from '../services/dateService';
import BottomNavigation from './BottomNavigation';
import StudentLearningTest from './StudentLearningTest';
import StudentAchievements from './StudentAchievements';
import StudentQuizPlayer from './StudentQuizPlayer';
import StudentDigitalID from './StudentDigitalID';
import StudentQuestSystem from './StudentQuestSystem';
import StudentAvatarGen from './StudentAvatarGen';
import StudentAITutor from './StudentAITutor';

interface StudentPortalProps {
    currentUser: Student;
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser: initialUser, attendance, performance, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState<Student>(initialUser);
    const [messages, setMessages] = useState<MessageLog[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (navigator.onLine) await downloadFromSupabase();
            const allMsgs = getMessages();
            setMessages(allMsgs.filter((m: MessageLog) => m.studentId === currentUser.id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setRewards(getRewards(currentUser.createdById));
            setAvailableExams(getExams(currentUser.createdById).filter(e => e.isActive));
        };
        loadData();
    }, [currentUser]);

    const stats = useMemo(() => {
        const myAtt = attendance.filter(a => a.studentId === currentUser.id);
        const myPerf = performance.filter(p => p.studentId === currentUser.id);
        let xp = currentUser.xp || 0;
        const progressToNext = ((xp % 500) / 500) * 100;
        const attRate = myAtt.length > 0 ? Math.round((myAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / myAtt.length) * 100) : 100;
        const avg = myPerf.length > 0 ? Math.round(myPerf.reduce((a,c)=>a+(c.score/c.maxScore),0)/myPerf.length*100) : 0;
        return { xp, level: Math.floor(xp / 500) + 1, progressToNext, attRate, avg };
    }, [currentUser, attendance, performance]);

    const handlePurchase = async (reward: Reward) => {
        if (stats.xp < reward.cost) return alert('نقاط XP غير كافية!');
        const request: PurchaseRequest = {
            id: `pr_${Date.now()}`,
            studentId: currentUser.id,
            studentName: currentUser.name,
            rewardId: reward.id,
            rewardTitle: reward.title,
            cost: reward.cost,
            status: 'PENDING',
            date: new Date().toISOString(),
            teacherId: currentUser.createdById || 'ALL'
        };
        await savePurchaseRequest(request);
        const updated = { ...currentUser, xp: (currentUser.xp || 0) - reward.cost, purchasedRewards: [...(currentUser.purchasedRewards || []), reward.id] };
        await updateStudent(updated);
        setCurrentUser(updated);
        alert(`تم إرسال الطلب!`);
    };

    return (
        <div className="flex h-screen bg-[#020617] overflow-hidden text-right font-tajawal" dir="rtl">
            {/* AI Tutor Floating Always Available */}
            <StudentAITutor student={currentUser} />

            <aside className="hidden lg:flex flex-col w-80 bg-slate-950 border-l border-white/5 shadow-2xl z-30">
                <div className="p-10 border-b border-white/5 flex flex-col items-center bg-gradient-to-b from-indigo-950/40 to-transparent">
                    <div className="relative mb-6 group cursor-pointer" onClick={() => navigate('/avatar')}>
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl overflow-hidden ring-4 ring-white/5">
                            {currentUser.email?.startsWith('data:image') ? <img src={currentUser.email} className="w-full h-full object-cover"/> : currentUser.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 w-10 h-10 rounded-2xl flex items-center justify-center font-black border-4 border-slate-950 shadow-xl">{stats.level}</div>
                    </div>
                    <h1 className="text-xl font-black text-white text-center">{currentUser.name}</h1>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-indigo-900/20"><Zap size={10} fill="white"/> {stats.xp} XP</span>
                        <span className="text-[10px] text-indigo-400 font-black bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-500/30">{currentUser.className}</span>
                    </div>
                </div>
                <nav className="flex-1 p-6 space-y-1">
                    <NavItem path="/" label="قاعدة العمليات" icon={LayoutGrid} isActive={location.pathname === '/'} />
                    <NavItem path="/avatar" label="مصنع الأفاتار" icon={UserCircle} isActive={location.pathname === '/avatar'} />
                    <NavItem path="/quests" label="المهام (Quests)" icon={Target} isActive={location.pathname === '/quests'} />
                    <NavItem path="/quizzes" label="الاختبارات" icon={FileQuestion} isActive={location.pathname === '/quizzes'} />
                    <NavItem path="/shop" label="متجر المكافآت" icon={ShoppingBag} isActive={location.pathname === '/shop'} />
                    <NavItem path="/evaluation" label="سجل الإنجازات" icon={TrendingUp} isActive={location.pathname === '/evaluation'} />
                    <NavItem path="/messages" label="مركز الرسائل" icon={Bell} isActive={location.pathname === '/messages'} />
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 mt-10 font-black transition-colors"><LogOut size={22}/> خروج</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[#020617] pb-24 lg:pb-10">
                    <Routes>
                        <Route path="/" element={<StudentDashboard stats={stats} student={currentUser} onStartTest={() => navigate('/lab')} />} />
                        <Route path="/quests" element={<StudentQuestSystem student={currentUser} />} />
                        <Route path="/avatar" element={<StudentAvatarGen student={currentUser} onUpdate={(s) => { updateStudent(s); setCurrentUser(s); }} />} />
                        <Route path="/achievements" element={<StudentAchievements student={currentUser} />} />
                        <Route path="/quizzes" element={selectedExam ? <StudentQuizPlayer exam={selectedExam} student={currentUser} onComplete={() => {setSelectedExam(null); navigate('/achievements');}} /> : <StudentQuizzesList exams={availableExams} onStart={setSelectedExam} />} />
                        <Route path="/shop" element={<StudentShop stats={stats} onPurchase={handlePurchase} rewards={rewards} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="/lab" element={<div className="bg-white rounded-3xl p-6 h-full"><StudentLearningTest student={currentUser} onComplete={() => navigate('/')} /></div>} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
                <BottomNavigation role="STUDENT" onMenuClick={() => {}} />
            </div>
        </div>
    );
};

const NavItem = ({ path, label, icon: Icon, isActive }: any) => {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate(path)} className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all font-black text-sm ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}>
            <Icon size={20}/> {label}
        </button>
    );
};

const StudentQuizzesList = ({ exams, onStart }: { exams: Exam[], onStart: (e: Exam) => void }) => (
    <div className="space-y-10 animate-fade-in">
        <h2 className="text-3xl font-black text-white flex items-center gap-4"><FileQuestion className="text-indigo-400" size={32}/> الاختبارات المتاحة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map(exam => (
                <div key={exam.id} className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                    <h3 className="text-xl font-black text-white mb-2">{exam.title}</h3>
                    <p className="text-slate-400 text-sm font-bold mb-8">{exam.subject} • {exam.questions.length} سؤال</p>
                    <button onClick={() => onStart(exam)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">ابدأ التحدي</button>
                </div>
            ))}
        </div>
    </div>
);

const StudentShop = ({ stats, onPurchase, rewards }: any) => (
    <div className="space-y-10 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-white flex items-center gap-3"><ShoppingBag className="text-indigo-400"/> متجر الأبطال</h2>
            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-indigo-500/30 flex items-center gap-3 backdrop-blur-xl">
                <Zap size={20} className="text-yellow-400" fill="currentColor"/>
                <span className="text-xl font-black text-white">{stats.xp} XP</span>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rewards.map((r: any) => (
                <div key={r.id} className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                    <div className="text-5xl mb-4">{r.icon}</div>
                    <h3 className="text-xl font-black text-white mb-2">{r.title}</h3>
                    <p className="text-slate-400 text-sm font-medium mb-8">{r.description}</p>
                    <button 
                        onClick={() => onPurchase(r)}
                        className={`w-full py-4 rounded-2xl font-black transition-all ${stats.xp >= r.cost ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
                    >
                        {stats.xp >= r.cost ? `استبدال بـ ${r.cost} XP` : 'نقاط غير كافية'}
                    </button>
                </div>
            ))}
        </div>
    </div>
);

const StudentDashboard = ({ stats, student, onStartTest }: any) => {
    const navigate = useNavigate();
    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-950 rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12"><Trophy size={300}/></div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-yellow-400 text-slate-900 px-4 py-1.5 rounded-2xl font-black text-sm shadow-xl">المستوى {stats.level}</div>
                            <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest">{student.className}</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">بطلنا المبدع، {student.name.split(' ')[0]}! 🚀</h2>
                        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10">
                            <div className="flex justify-between mb-3 text-xs font-black uppercase text-indigo-300">
                                <span>التقدم للمستوى التالي</span>
                                <span>{Math.round(stats.progressToNext)}%</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${stats.progressToNext}%` }}></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <StatBox label="المواظبة" value={`${stats.attRate}%`} icon={<Flame className="text-orange-500" fill="currentColor"/>}/>
                        <StatBox label="الدقة" value={`${stats.avg}%`} icon={<Target className="text-indigo-400"/>}/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 rounded-[2.5rem] p-10 border border-white/5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-[2rem] flex items-center justify-center border border-indigo-500/30"><BrainCircuit size={40}/></div>
                            <div>
                                <h3 className="text-xl font-black text-white">تحليل شخصية الطالب (VARK)</h3>
                                <p className="text-slate-400 text-sm font-bold">اكتشف أفضل طريقة تذاكر بها دروسك!</p>
                            </div>
                        </div>
                        <button onClick={onStartTest} className="px-10 py-4 bg-indigo-600 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">ابدأ الاختبار <ChevronRight/></button>
                    </div>

                    <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/5 shadow-xl">
                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3"><Sparkles className="text-yellow-500"/> نصيحة المحلل الذكي</h3>
                        <div className="bg-indigo-600/10 p-6 rounded-3xl border border-indigo-500/20 text-indigo-100 font-bold leading-relaxed">
                            يا بطل، نمط تعلمك يميل إلى "البصري". حاول استخدام الألوان والخرائط الذهنية في مذاكرتك اليوم لزيادة سرعة استيعابك للمعلومات بنسبة 40%.
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col gap-6">
                    <h3 className="text-lg font-black text-white flex items-center gap-3"><Zap className="text-indigo-400"/> أفعال سريعة</h3>
                    <QuickAction path="/avatar" label="تحديث الأفاتار" icon={<Wand2 size={24}/>}/>
                    <QuickAction path="/quizzes" label="تحديات نشطة" icon={<FileQuestion size={24}/>}/>
                    <QuickAction path="/quests" label="مهماتي" icon={<Target size={24}/>}/>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, icon }: any) => (
    <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 text-center flex flex-col items-center shadow-inner">
        <div className="mb-2">{icon}</div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
);

const QuickAction = ({ path, label, icon }: any) => {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate(path)} className="w-full flex items-center gap-4 p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-right group">
            <div className="text-indigo-400 group-hover:scale-110 transition-transform">{icon}</div>
            <span className="text-sm font-black text-slate-200">{label}</span>
        </button>
    );
};

const StudentEvaluationView = ({ student, performance }: { student: Student, performance: PerformanceRecord[] }) => {
    const myPerf = performance.filter((p: PerformanceRecord) => p.studentId === student.id);
    return (
        <div className="space-y-10 animate-fade-in">
            <h2 className="text-3xl font-black text-white flex items-center gap-4"><Activity className="text-indigo-400" size={32}/> سجل الإنجازات</h2>
            <div className="space-y-4">
                {myPerf.slice().reverse().map((p: PerformanceRecord) => (
                    <div key={p.id} className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-indigo-50 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 transition-colors"><BookOpen size={24}/></div>
                            <div>
                                <h4 className="font-black text-white text-lg">{p.title}</h4>
                                <p className="text-slate-500 text-xs font-bold mt-1">{p.subject} • {formatDualDate(p.date)}</p>
                            </div>
                        </div>
                        <div className="text-left bg-white/5 px-6 py-3 rounded-2xl">
                            <span className="text-3xl font-black text-indigo-400">{p.score}</span>
                            <span className="text-sm text-slate-500 font-bold mr-1">/ {p.maxScore}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentMessages = ({ messages }: { messages: MessageLog[] }) => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-black text-white flex items-center gap-4"><Bell className="text-indigo-400" size={32}/> مركز التنبيهات</h2>
        <div className="space-y-4">
            {messages.map(m => (
                <div key={m.id} className="bg-slate-900/50 p-6 rounded-[2rem] border-r-[6px] border-indigo-500 shadow-xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">{formatDualDate(m.date)}</p>
                    <p className="text-white leading-relaxed font-bold">"{m.content}"</p>
                    <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">المرسل: {m.sentBy}</div>
                </div>
            ))}
        </div>
    </div>
);

export default StudentPortal;
