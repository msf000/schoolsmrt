
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, MessageLog, AttendanceStatus, Exam, Reward, PurchaseRequest } from '../types';
import { downloadFromSupabase, getMessages, updateStudent, getRewards, getExams, savePurchaseRequest } from '../services/storageService';
// Added QrCode to the imports list from lucide-react
import { 
    LogOut, LayoutGrid, Bell, Zap, TrendingUp, Target, UserCircle, ShoppingBag, Crown, ChevronRight, Trophy, BrainCircuit, FileQuestion, Flame, Camera, Star, QrCode
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import StudentJourney from './StudentJourney';
import StudentQuestSystem from './StudentQuestSystem';
import StudentAvatarGen from './StudentAvatarGen';
import StudentAchievements from './StudentAchievements';
import StudentShop from './StudentShop';
import StudentEvaluationView from './StudentEvaluationView';
import StudentMessages from './StudentMessages';
import StudentAITutor from './StudentAITutor';
import StudentQRScanner from './StudentQRScanner';
import StudentLearningTest from './StudentLearningTest';
import StudentQuizPlayer from './StudentQuizPlayer';
import StudentDigitalID from './StudentDigitalID';

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
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (navigator.onLine) await downloadFromSupabase();
            setMessages(getMessages().filter(m => m.studentId === currentUser.id).sort((a,b) => b.date.localeCompare(a.date)));
            setRewards(getRewards(currentUser.createdById));
            setAvailableExams(getExams(currentUser.createdById).filter(e => e.isActive));
        };
        loadData();
    }, [currentUser]);

    const stats = useMemo(() => {
        const myAtt = attendance.filter(a => a.studentId === currentUser.id);
        const myPerf = performance.filter(p => p.studentId === currentUser.id);
        let xp = currentUser.xp || 0;
        const level = Math.floor(xp / 500) + 1;
        const progressToNext = ((xp % 500) / 500) * 100;
        const attRate = myAtt.length > 0 ? Math.round((myAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / myAtt.length) * 100) : 100;
        const avg = myPerf.length > 0 ? Math.round(myPerf.reduce((a,c)=>a+(c.score/c.maxScore),0)/myPerf.length*100) : 0;
        return { xp, level, progressToNext, attRate, avg };
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
            <StudentAITutor student={currentUser} />
            {isQRScannerOpen && <StudentQRScanner student={currentUser} onClose={() => setIsQRScannerOpen(false)} />}

            <aside className="hidden lg:flex flex-col w-80 bg-slate-950 border-l border-white/5 shadow-2xl z-30">
                <div className="p-10 border-b border-white/5 flex flex-col items-center bg-gradient-to-b from-indigo-950/40 to-transparent">
                    <div className="relative mb-6 group cursor-pointer" onClick={() => navigate('/avatar')}>
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl overflow-hidden ring-4 ring-white/5">
                            {currentUser.email?.startsWith('data:image') ? <img src={currentUser.email} className="w-full h-full object-cover" alt="Avatar"/> : currentUser.name.charAt(0)}
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
                    {/* Fixed missing QrCode reference by adding it to imports */}
                    <NavItem path="/id" label="الهوية الرقمية" icon={QrCode} isActive={location.pathname === '/id'} />
                    <NavItem path="/avatar" label="مصنع الأفاتار" icon={UserCircle} isActive={location.pathname === '/avatar'} />
                    <NavItem path="/quests" label="المهام (Quests)" icon={Target} isActive={location.pathname === '/quests'} />
                    <NavItem path="/shop" label="متجر المكافآت" icon={ShoppingBag} isActive={location.pathname === '/shop'} />
                    <NavItem path="/evaluation" label="سجل الإنجازات" icon={TrendingUp} isActive={location.pathname === '/evaluation'} />
                    <NavItem path="/messages" label="مركز الرسائل" icon={Bell} isActive={location.pathname === '/messages'} />
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 mt-10 font-black transition-colors"><LogOut size={22}/> خروج</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[#020617] pb-24 lg:pb-10">
                    <Routes>
                        <Route path="/" element={
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-gradient-to-br from-indigo-900 via-slate-950 to-indigo-950 rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl border border-white/5">
                                    <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12"><Trophy size={300}/></div>
                                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                                        <div className="text-center lg:text-right">
                                            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                                                <div className="bg-yellow-400 text-slate-900 px-4 py-1.5 rounded-2xl font-black text-sm shadow-xl">المستوى {stats.level}</div>
                                                <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest">{currentUser.className}</span>
                                            </div>
                                            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">بطلنا المبدع، {currentUser.name.split(' ')[0]}! 🚀</h2>
                                            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 mx-auto lg:mx-0">
                                                <div className="flex justify-between mb-3 text-xs font-black uppercase text-indigo-300">
                                                    <span>التقدم للمستوى التالي</span>
                                                    <span>{Math.round(stats.progressToNext)}%</span>
                                                </div>
                                                <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1">
                                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${stats.progressToNext}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                                            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center gap-2">
                                                <Flame className="text-orange-500" fill="currentColor" size={32}/>
                                                <p className="text-2xl font-black">{stats.attRate}%</p>
                                                <p className="text-[10px] font-black text-indigo-300 uppercase">المواظبة</p>
                                            </div>
                                            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center gap-2">
                                                <Target className="text-indigo-400" size={32}/>
                                                <p className="text-2xl font-black">{stats.avg}%</p>
                                                <p className="text-[10px] font-black text-indigo-300 uppercase">الدقة</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <StudentJourney xp={stats.xp} level={stats.level} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button onClick={() => setIsQRScannerOpen(true)} className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 text-white">
                                                <Camera size={32}/>
                                            </div>
                                            <div className="text-right text-white">
                                                <h3 className="text-xl font-black">تحضير QR</h3>
                                                <p className="text-indigo-100 text-xs font-bold opacity-60">امسح الكود لتسجيل حضورك</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white opacity-40"/>
                                    </button>
                                    <button onClick={() => navigate('/quests')} className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-purple-50/20 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400">
                                                <Star size={32}/>
                                            </div>
                                            <div className="text-right text-white">
                                                <h3 className="text-xl font-black">تحديات نشطة</h3>
                                                <p className="text-slate-400 text-xs font-bold">مهام أسبوعية بانتظارك</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white opacity-40"/>
                                    </button>
                                </div>
                            </div>
                        } />
                        <Route path="/id" element={<StudentDigitalID student={currentUser} stats={stats} />} />
                        <Route path="/quests" element={<StudentQuestSystem student={currentUser} />} />
                        <Route path="/avatar" element={<StudentAvatarGen student={currentUser} onUpdate={(s) => { updateStudent(s); setCurrentUser(s); }} />} />
                        <Route path="/achievements" element={<StudentAchievements student={currentUser} />} />
                        <Route path="/quizzes" element={selectedExam ? <StudentQuizPlayer exam={selectedExam} student={currentUser} onComplete={() => {setSelectedExam(null); navigate('/achievements');}} /> : <StudentQuizzesList exams={availableExams} onStart={setSelectedExam} />} />
                        <Route path="/shop" element={<StudentShop xp={stats.xp} onPurchase={handlePurchase} rewards={rewards} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} />} />
                        <Route path="/messages" element={<StudentMessages messages={messages} />} />
                        <Route path="/lab" element={<StudentLearningTest student={currentUser} onComplete={() => navigate('/')} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
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
    <div className="space-y-10 animate-fade-in font-tajawal">
        <h2 className="text-3xl font-black text-white flex items-center gap-4"><FileQuestion className="text-indigo-400" size={32}/> الاختبارات المتاحة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map(exam => (
                <div key={exam.id} className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                    <h3 className="text-xl font-black text-white mb-2">{exam.title}</h3>
                    <p className="text-slate-400 text-sm font-bold mb-8">{exam.subject} • {exam.questions.length} سؤال</p>
                    <button onClick={() => onStart(exam)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">ابدأ التحدي</button>
                </div>
            ))}
            {exams.length === 0 && <p className="text-slate-500 text-center col-span-full">لا توجد اختبارات نشطة حالياً.</p>}
        </div>
    </div>
);

export default StudentPortal;
