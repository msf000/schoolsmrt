
import React, { useState, useEffect } from 'react';
import { Student, PerformanceRecord, FormsDetailedResult, AttendanceRecord, BehaviorIncident, InteractiveGame } from '../types';
import { getGames, fetchPerformance, getFormsDetailedResults, fetchAttendance, getBehaviorIncidents } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Zap, Sparkles, GraduationCap, User, Newspaper, History, ChevronLeft
} from 'lucide-react';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentDigitalID from './StudentDigitalID';
import GamePlayer from './GamePlayer';
import RemedialBridge from './RemedialBridge';
import StudentAchievementTimeline from './StudentAchievementTimeline';
import StudentTaskView from './StudentTaskView';
import SoftSkillsRadar from './SoftSkillsRadar';
import SchoolWall from './SchoolWall';
import StudentAITutor from './StudentAITutor';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [behaviorLog, setBehaviorLog] = useState<BehaviorIncident[]>([]);
    const [games, setGames] = useState<InteractiveGame[]>([]);
    const [formsResults, setFormsResults] = useState<FormsDetailedResult[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'EVAL' | 'WALL' | 'GAMES' | 'TASKS' | 'ID'>('DASHBOARD');
    const [playingGame, setPlayingGame] = useState<InteractiveGame | null>(null);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const [perf, att, beh] = await Promise.all([fetchPerformance(), fetchAttendance(), getBehaviorIncidents()]);
        setPerformance(perf.filter(p => p.studentId === currentUser.id));
        setAttendance(att.filter(a => a.studentId === currentUser.id));
        setBehaviorLog(beh.filter(i => i.studentId === currentUser.id));
        setFormsResults(getFormsDetailedResults(currentUser.createdById || ''));
        setGames(getGames(currentUser.createdById || ''));
    };

    if (playingGame) return <GamePlayer game={playingGame} student={currentUser} onClose={() => { setPlayingGame(null); loadData(); }} />;

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-tajawal pb-24" dir="rtl">
            <header className="bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 px-6 py-5 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                        <GraduationCap size={28}/>
                    </div>
                    <div className="text-right">
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

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-hidden">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-10 animate-fade-in overflow-y-auto max-h-full custom-scrollbar pr-1">
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <RemedialBridge student={currentUser} formsResults={formsResults} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ActionCard title="كشف درجاتي" icon={<Activity/>} color="bg-rose-500" onClick={()=>setActiveTab('EVAL')} />
                                    <ActionCard title="الألعاب التعليمية" icon={<Gamepad2/>} color="bg-emerald-500" onClick={()=>setActiveTab('GAMES')} />
                                    <ActionCard title="حقيبة الواجبات" icon={<BookOpen/>} color="bg-indigo-500" onClick={()=>setActiveTab('TASKS')} />
                                    <ActionCard title="حائط المدرسة" icon={<Newspaper/>} color="bg-purple-500" onClick={()=>setActiveTab('WALL')} />
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <SoftSkillsRadar student={currentUser} incidents={behaviorLog} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'EVAL' && <StudentEvaluationView student={currentUser} performance={performance} />}
                {activeTab === 'WALL' && <SchoolWall currentUser={currentUser} students={[]} />}
                {activeTab === 'TASKS' && <StudentTaskView student={currentUser} />}
                {activeTab === 'ID' && <StudentDigitalID student={currentUser} stats={{level: currentUser.level||1, xp: currentUser.xp||0}} />}
                
                {activeTab === 'GAMES' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-3xl font-black flex items-center gap-4 justify-end">مستودع الألعاب التفاعلية <Gamepad2 className="text-emerald-400" size={40}/></h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {games.map(game => (
                                <div key={game.id} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 flex flex-col justify-between h-72 group hover:bg-white/10 transition-all cursor-pointer" onClick={()=>setPlayingGame(game)}>
                                    <div className="text-right">
                                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl mr-auto ml-0 md:ml-auto md:mr-0"><Sparkles size={28}/></div>
                                        <h3 className="text-xl font-black text-white">{game.title}</h3>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">{game.subject}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-indigo-300">جائزة: {game.xpReward} XP</span>
                                        <div className="p-3 bg-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Play size={20}/></div>
                                    </div>
                                </div>
                            ))}
                            {games.length === 0 && (
                                <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center">
                                    <Gamepad2 size={100}/>
                                    <p className="text-2xl font-black mt-4">لا توجد ألعاب متاحة حالياً.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-3xl border-t border-white/5 h-20 flex justify-around items-center px-6 z-50">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<Activity/>} label="درجاتي" active={activeTab==='EVAL'} onClick={()=>setActiveTab('EVAL')}/>
                <NavBtn icon={<Gamepad2/>} label="الألعاب" active={activeTab==='GAMES'} onClick={()=>setActiveTab('GAMES')}/>
                <NavBtn icon={<BookOpen/>} label="الواجبات" active={activeTab==='TASKS'} onClick={()=>setActiveTab('TASKS')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>

            <StudentAITutor student={currentUser} />
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

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

const Play = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>;

export default StudentPortal;
