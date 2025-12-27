
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, MessageLog, AttendanceStatus, Exam, Reward, PurchaseRequest } from '../types';
import { downloadFromSupabase, getMessages, updateStudent, getRewards, getExams, savePurchaseRequest } from '../services/storageService';
import { 
    LogOut, LayoutGrid, Bell, Zap, TrendingUp, Target, UserCircle, ShoppingBag, Crown, ChevronRight, Trophy, BrainCircuit, FileQuestion, Flame, Camera, Star, QrCode, Swords, Activity
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

const StudentPortal: React.FC<{ currentUser: Student, attendance: AttendanceRecord[], performance: PerformanceRecord[], onLogout: () => void }> = ({ currentUser: initialUser, attendance, performance, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState<Student>(initialUser);
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

    const stats = useMemo(() => {
        const myPerf = performance.filter(p => p.studentId === currentUser.id);
        const xp = currentUser.xp || 0;
        const avg = myPerf.length > 0 ? Math.round(myPerf.reduce((a,c)=>a+(c.score/c.maxScore),0)/myPerf.length*100) : 0;
        return { xp, level: Math.floor(xp / 500) + 1, progress: ((xp % 500) / 500) * 100, avg };
    }, [currentUser, performance]);

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
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-950 w-10 h-10 rounded-2xl flex items-center justify-center font-black border-4 border-slate-950 shadow-xl">{stats.level}</div>
                    </div>
                    <h1 className="text-xl font-black text-white text-center">{currentUser.name}</h1>
                </div>
                <nav className="flex-1 p-6 space-y-1">
                    <NavItem path="/" label="الرئيسية" icon={LayoutGrid} isActive={location.pathname === '/'} />
                    <NavItem path="/id" label="هويتي الرقمية" icon={QrCode} isActive={location.pathname === '/id'} />
                    <NavItem path="/avatar" label="مصنع الأفاتار" icon={UserCircle} isActive={location.pathname === '/avatar'} />
                    <NavItem path="/shop" label="متجر المكافآت" icon={ShoppingBag} isActive={location.pathname === '/shop'} />
                    <NavItem path="/evaluation" label="سجل الدرجات" icon={TrendingUp} isActive={location.pathname === '/evaluation'} />
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 mt-10 font-black transition-colors"><LogOut size={22}/> خروج آمن</button>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[#020617] pb-24 lg:pb-10">
                    <Routes>
                        <Route path="/" element={
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-gradient-to-br from-indigo-900 via-slate-950 to-indigo-950 rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl border border-white/5">
                                    <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12"><Trophy size={300}/></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="bg-yellow-400 text-slate-900 px-4 py-1 rounded-2xl font-black text-xs shadow-xl">المستوى {stats.level}</div>
                                        </div>
                                        <h2 className="text-4xl md:text-6xl font-black mb-8">بطلنا المبدع، {currentUser.name.split(' ')[0]}! 🚀</h2>
                                        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10">
                                            <div className="flex justify-between mb-3 text-xs font-black uppercase text-indigo-300"><span>التقدم للمستوى {stats.level + 1}</span><span>{Math.round(stats.progress)}%</span></div>
                                            <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{width:`${stats.progress}%`}}></div></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FeatureCard icon={<QrCode/>} title="تحضير QR" sub="سجل حضورك للحصة" onClick={() => setIsQRScannerOpen(true)} color="bg-indigo-600" />
                                    <FeatureCard icon={<Swords/>} title="معارك العلم" sub="تحديات الفصل المباشرة" onClick={() => navigate('/quizzes')} color="bg-rose-600" />
                                </div>
                                
                                <StudentJourney xp={stats.xp} level={stats.level} />
                                <StudentQuestSystem student={currentUser} />
                            </div>
                        } />
                        <Route path="/id" element={<StudentDigitalID student={currentUser} stats={stats} />} />
                        <Route path="/avatar" element={<StudentAvatarGen student={currentUser} onUpdate={(s) => { updateStudent(s); setCurrentUser(s); }} />} />
                        <Route path="/evaluation" element={<StudentEvaluationView student={currentUser} performance={performance} />} />
                        <Route path="/shop" element={<StudentShop xp={stats.xp} onPurchase={()=>{}} rewards={[]} />} />
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
        <button onClick={() => navigate(path)} className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all font-black text-sm ${isActive ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-white/5'}`}>
            <Icon size={20}/> {label}
        </button>
    );
};

const FeatureCard = ({ icon, title, sub, onClick, color }: any) => (
    <button onClick={onClick} className={`p-8 ${color} rounded-[2.5rem] shadow-xl flex items-center gap-6 group hover:scale-[1.02] transition-all text-white`}>
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">{React.cloneElement(icon, {size:32})}</div>
        <div className="text-right">
            <h3 className="text-xl font-black">{title}</h3>
            <p className="text-white/60 text-xs font-bold">{sub}</p>
        </div>
    </button>
);

export default StudentPortal;
