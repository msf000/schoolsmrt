
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord, FormsDetailedResult, AttendanceRecord } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance, getFormsDetailedResults, fetchAttendance } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers, User, Crown, 
    Rocket, ChevronLeft, Target, GraduationCap, BrainCircuit, Calendar,
    RefreshCw, Heart, Award, ListChecks, Medal
} from 'lucide-react';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentMessages from './StudentMessages';
import StudentShop from './StudentShop';
import StudentDigitalID from './StudentDigitalID';
import StudentQuestSystem from './StudentQuestSystem';
import RemedialBridge from './RemedialBridge';
import StudentAchievements from './StudentAchievements';
import StudentAITutor from './StudentAITutor';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [selectedGame, setSelectedGame] = useState<InteractiveGame | null>(null);
    const [availableGames, setAvailableGames] = useState<InteractiveGame[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [formsResults, setFormsResults] = useState<FormsDetailedResult[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ACAD' | 'QUESTS' | 'ACHIEVEMENTS' | 'ID'>('DASHBOARD');

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const allGames = getGames();
        setAvailableGames(allGames.filter((g: InteractiveGame) => !g.targetClass || g.targetClass === currentUser.className));
        const [perf, att] = await Promise.all([fetchPerformance(), fetchAttendance()]);
        setPerformance(perf.filter((p: PerformanceRecord) => p.studentId === currentUser.id));
        setAttendance(att.filter((a: AttendanceRecord) => a.studentId === currentUser.id));
        setFormsResults(getFormsDetailedResults(currentUser.createdById || ''));
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-tajawal pb-24" dir="rtl">
            <header className="bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 px-6 py-5 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                        <GraduationCap size={28}/>
                    </div>
                    <div>
                        <h1 className="font-black text-lg text-white">بوابة الطالب الذكية</h1>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{currentUser.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                        <Zap size={16} className="text-amber-400" fill="currentColor"/>
                        <span className="text-sm font-black">{currentUser.xp || 0} XP</span>
                    </div>
                    <button onClick={onLogout} className="p-2 text-white/20 hover:text-rose-500 transition-all">
                        <LogOut size={20}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-10 animate-fade-in">
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RemedialBridge student={currentUser} formsResults={formsResults} />
                            
                            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-between group cursor-pointer" onClick={() => setActiveTab('QUESTS')}>
                                <div>
                                    <h3 className="text-2xl font-black mb-2 flex items-center gap-3"><Target className="text-rose-500"/> مهامي الأسبوعية</h3>
                                    <p className="text-slate-400 text-sm">لديك تحديات جديدة بانتظارك للحصول على XP إضافي.</p>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-indigo-600 transition-all">
                                        <ChevronLeft/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <section className="space-y-6">
                            <h3 className="text-2xl font-black flex items-center gap-3"><Gamepad2 className="text-indigo-400"/> تحديات التعلم التفاعلية</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {availableGames.map(game => (
                                    <div key={game.id} className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 hover:border-indigo-500 transition-all cursor-pointer" onClick={() => setSelectedGame(game)}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-white/5 rounded-xl text-indigo-400">
                                                {game.type === 'MATCHING' ? <Puzzle size={24}/> : <Layers size={24}/>}
                                            </div>
                                            <span className="text-[10px] font-black text-amber-400">+{game.xpReward} XP</span>
                                        </div>
                                        <h4 className="font-bold text-white mb-1">{game.title}</h4>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{game.subject}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'QUESTS' && <StudentQuestSystem student={currentUser} />}
                {activeTab === 'ACAD' && <StudentEvaluationView student={currentUser} performance={performance} />}
                {activeTab === 'ACHIEVEMENTS' && <StudentAchievements student={currentUser} />}
                {activeTab === 'ID' && <StudentDigitalID student={currentUser} stats={{level: currentUser.level||1, xp: currentUser.xp||0}} />}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-3xl border-t border-white/5 h-20 flex justify-around items-center px-6 z-50">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<ListChecks/>} label="المهام" active={activeTab==='QUESTS'} onClick={()=>setActiveTab('QUESTS')}/>
                <NavBtn icon={<Activity/>} label="أدائي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <NavBtn icon={<Medal/>} label="إنجازاتي" active={activeTab==='ACHIEVEMENTS'} onClick={()=>setActiveTab('ACHIEVEMENTS')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>

            {selectedGame && <GamePlayer game={selectedGame} student={currentUser} onClose={() => setSelectedGame(null)} />}
            <StudentAITutor student={currentUser} />
        </div>
    );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

export default StudentPortal;
