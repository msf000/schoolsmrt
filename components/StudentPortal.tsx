
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, FormsDetailedResult, AttendanceRecord, BehaviorIncident, InteractiveGame, AttendanceStatus } from '../types';
import { getGames, fetchPerformance, getFormsDetailedResults, fetchAttendance, getBehaviorIncidents } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Zap, Sparkles, GraduationCap, User, History, ChevronLeft, CheckCircle2, Clock, 
    ShieldAlert, TrendingUp, ArrowUpCircle, BrainCircuit, Rocket, Palette, ArrowLeft
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentDigitalID from './StudentDigitalID';
import GamePlayer from './GamePlayer';
import RemedialBridge from './RemedialBridge';
import StudentAchievementTimeline from './StudentAchievementTimeline';
import StudentTaskView from './StudentTaskView';
import SoftSkillsRadar from './SoftSkillsRadar';
import StudentAITutor from './StudentAITutor';
import StudentFlippedPortal from './StudentFlippedPortal';
import KnowledgeTree from './KnowledgeTree';
import SmartStudyPlan from './SmartStudyPlan';
import DailyQuestTrigger from './DailyQuestTrigger';
import StudentAvatarGen from './StudentAvatarGen';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [behaviorLog, setBehaviorLog] = useState<BehaviorIncident[]>([]);
    const [games, setGames] = useState<InteractiveGame[]>([]);
    const [formsResults, setFormsResults] = useState<FormsDetailedResult[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'EVAL' | 'GAMES' | 'TASKS' | 'ID' | 'FLIPPED' | 'KNOWLEDGE' | 'STUDY' | 'AVATAR'>('DASHBOARD');
    const [playingGame, setPlayingGame] = useState<InteractiveGame | null>(null);
    const [localUser, setLocalUser] = useState(currentUser);

    useEffect(() => {
        loadData();
    }, [localUser]);

    const loadData = async () => {
        const [perf, att, beh] = await Promise.all([fetchPerformance(), fetchAttendance(), getBehaviorIncidents()]);
        const tid = localUser.createdById || '';
        setPerformance(perf.filter(p => p.studentId === localUser.id));
        setAttendance(att.filter(a => a.studentId === localUser.id));
        setBehaviorLog(beh.filter(i => i.studentId === localUser.id));
        setFormsResults(getFormsDetailedResults(tid));
        setGames(getGames(tid));
    };

    const attendanceStats = useMemo(() => {
        const total = attendance.length;
        if (total === 0) return { rate: 100, present: 0, absent: 0 };
        const present = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
        return { rate: Math.round((present / total) * 100), present };
    }, [attendance]);

    if (playingGame) return <GamePlayer game={playingGame} student={localUser} onClose={() => { setPlayingGame(null); loadData(); }} />;

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-tajawal pb-24" dir="rtl">
            <DailyQuestTrigger student={localUser} onAccept={() => setActiveTab('GAMES')} />
            
            <header className="bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 px-6 py-5 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="relative cursor-pointer" onClick={() => setActiveTab('AVATAR')}>
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white/10 overflow-hidden shadow-2xl transition-all ${localUser.auraColor === 'gold' ? 'ring-2 ring-yellow-400' : ''}`}>
                            {localUser.avatarUrl ? <img src={localUser.avatarUrl} className="w-full h-full object-cover"/> : <User/>}
                         </div>
                         <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-[8px] font-black px-1 rounded-md">Lv{localUser.level}</div>
                    </div>
                    <div className="text-right">
                        <h1 className="font-black text-sm md:text-lg text-white truncate max-w-[150px]">{localUser.name}</h1>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{localUser.className}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="bg-white/5 px-3 md:px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" fill="currentColor"/>
                        <span className="text-xs md:text-sm font-black">{localUser.xp || 0} XP</span>
                    </div>
                    <button onClick={onLogout} className="p-2 text-white/20 hover:text-rose-500 transition-all">
                        <LogOut size={20}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-hidden">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-8 animate-fade-in overflow-y-auto max-h-full custom-scrollbar pr-1 pb-10">
                        <StudentJourney xp={localUser.xp || 0} level={localUser.level || 1} />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <RemedialBridge student={localUser} formsResults={formsResults} />
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <MiniActionCard title="شجرة المهارات" icon={<BrainCircuit/>} color="bg-purple-600" onClick={()=>setActiveTab('KNOWLEDGE')} />
                                    <MiniActionCard title="خطة المذاكرة" icon={<Rocket/>} color="bg-orange-50" onClick={()=>setActiveTab('STUDY')} />
                                    <MiniActionCard title="الفصل المقلوب" icon={<ArrowUpCircle/>} color="bg-indigo-600" onClick={()=>setActiveTab('FLIPPED')} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <ActionCard title="درجاتي" icon={<Activity/>} color="bg-rose-500" onClick={()=>setActiveTab('EVAL')} />
                                    <ActionCard title="ألعاب تعليمية" icon={<Gamepad2/>} color="bg-emerald-500" onClick={()=>setActiveTab('GAMES')} />
                                    <ActionCard title="الواجبات" icon={<BookOpen/>} color="bg-indigo-500" onClick={()=>setActiveTab('TASKS')} />
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <SoftSkillsRadar student={localUser} incidents={behaviorLog} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'KNOWLEDGE' && <KnowledgeTree student={localUser} performance={performance} formsResults={formsResults} />}
                {activeTab === 'STUDY' && <SmartStudyPlan student={localUser} />}
                {activeTab === 'AVATAR' && <StudentAvatarGen student={localUser} onUpdate={(u) => { setLocalUser(u); localStorage.setItem('current_user', JSON.stringify(u)); }} />}
                {activeTab === 'EVAL' && <StudentEvaluationView student={localUser} performance={performance} />}
                {activeTab === 'TASKS' && <StudentTaskView student={localUser} />}
                {activeTab === 'ID' && <StudentDigitalID student={localUser} stats={{level: localUser.level||1, xp: localUser.xp||0}} />}
                {activeTab === 'FLIPPED' && <StudentFlippedPortal student={localUser} />}
                
                {activeTab === 'GAMES' && (
                    <div className="space-y-8 animate-fade-in pb-20">
                        <h2 className="text-3xl font-black flex items-center gap-4 justify-end">الألعاب المتاحة <Gamepad2 className="text-emerald-400" size={40}/></h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {games.map(game => (
                                <div key={game.id} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 h-72 flex flex-col justify-between group hover:bg-white/10 transition-all cursor-pointer" onClick={()=>setPlayingGame(game)}>
                                    <div className="text-right">
                                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl mr-auto ml-0 md:ml-auto md:mr-0"><Sparkles size={28}/></div>
                                        <h3 className="text-xl font-black text-white">{game.title}</h3>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">{game.subject}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-indigo-300">جائزة: {game.xpReward} XP</span>
                                        <div className="p-3 bg-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                            <ArrowLeft size={20}/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-3xl border-t border-white/5 h-20 flex justify-around items-center px-6 z-50">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<ArrowUpCircle/>} label="المقلوب" active={activeTab==='FLIPPED'} onClick={()=>setActiveTab('FLIPPED')}/>
                <NavBtn icon={<Activity/>} label="درجاتي" active={activeTab==='EVAL'} onClick={()=>setActiveTab('EVAL')}/>
                <NavBtn icon={<Gamepad2/>} label="الألعاب" active={activeTab==='GAMES'} onClick={()=>setActiveTab('GAMES')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>

            <StudentAITutor student={localUser} />
        </div>
    );
};

const ActionCard = ({ title, icon, color, onClick }: any) => (
    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-between group cursor-pointer hover:bg-white/10 transition-all h-48" onClick={onClick}>
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white mb-6 shadow-xl`}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <h3 className="text-xl font-black mb-2 flex items-center justify-between">
            <ChevronLeft className="group-hover:translate-x-[-8px] transition-transform" size={18}/>
            {title}
        </h3>
    </div>
);

const MiniActionCard = ({ title, icon, color, onClick }: any) => (
    <button onClick={onClick} className="flex items-center gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all text-right">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shrink-0 shadow-lg`}>
            {React.cloneElement(icon, { size: 20 })}
        </div>
        <span className="text-xs font-black truncate">{title}</span>
    </button>
);

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-50'}`}>
        <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

export default StudentPortal;
