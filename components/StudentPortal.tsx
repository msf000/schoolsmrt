
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord, FormsDetailedResult, AttendanceRecord, BehaviorIncident } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance, getFormsDetailedResults, fetchAttendance, getBehaviorIncidents } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers, User, Crown, 
    Rocket, ChevronLeft, Target, GraduationCap, BrainCircuit, Calendar,
    RefreshCw, Heart, Award, ListChecks, Medal, Network, History, Newspaper
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
import KnowledgeTree from './KnowledgeTree';
import StudentAchievementTimeline from './StudentAchievementTimeline';
import StudentTaskView from './StudentTaskView';
import SoftSkillsRadar from './SoftSkillsRadar';
import SchoolWall from './SchoolWall';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [availableGames, setAvailableGames] = useState<InteractiveGame[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [behaviorLog, setBehaviorLog] = useState<BehaviorIncident[]>([]);
    const [formsResults, setFormsResults] = useState<FormsDetailedResult[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'WALL' | 'TIMELINE' | 'TASKS' | 'ID'>('DASHBOARD');

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const allGames = getGames();
        setAvailableGames(allGames.filter((g: InteractiveGame) => !g.targetClass || g.targetClass === currentUser.className));
        const [perf, att, beh] = await Promise.all([fetchPerformance(), fetchAttendance(), getBehaviorIncidents()]);
        setPerformance(perf.filter((p: PerformanceRecord) => p.studentId === currentUser.id));
        setAttendance(att.filter((a: AttendanceRecord) => a.studentId === currentUser.id));
        setBehaviorLog(beh.filter((i: BehaviorIncident) => i.studentId === currentUser.id));
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
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <RemedialBridge student={currentUser} formsResults={formsResults} />
                            </div>
                            <div className="lg:col-span-1">
                                <SoftSkillsRadar student={currentUser} incidents={behaviorLog} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ActionCard title="حقيبة الواجبات" icon={<BookOpen/>} color="bg-indigo-500" onClick={()=>setActiveTab('TASKS')} />
                            <ActionCard title="حائط المدرسة" icon={<Newspaper/>} color="bg-emerald-500" onClick={()=>setActiveTab('WALL')} />
                            <ActionCard title="سجل الفخر" icon={<History/>} color="bg-purple-500" onClick={()=>setActiveTab('TIMELINE')} />
                        </div>
                    </div>
                )}

                {activeTab === 'WALL' && <SchoolWall currentUser={currentUser} students={[]} />}
                {activeTab === 'TIMELINE' && <StudentAchievementTimeline student={currentUser} attendance={attendance} performance={performance} />}
                {activeTab === 'TASKS' && <StudentTaskView student={currentUser} />}
                {activeTab === 'ID' && <StudentDigitalID student={currentUser} stats={{level: currentUser.level||1, xp: currentUser.xp||0}} />}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-3xl border-t border-white/5 h-20 flex justify-around items-center px-6 z-50">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<Newspaper/>} label="الحائط" active={activeTab==='WALL'} onClick={()=>setActiveTab('WALL')}/>
                <NavBtn icon={<History/>} label="الفخر" active={activeTab==='TIMELINE'} onClick={()=>setActiveTab('TIMELINE')}/>
                <NavBtn icon={<BookOpen/>} label="الواجبات" active={activeTab==='TASKS'} onClick={()=>setActiveTab('TASKS')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>

            <StudentAITutor student={currentUser} />
        </div>
    );
};

const ActionCard = ({ title, icon, color, onClick }: any) => (
    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-between group cursor-pointer hover:bg-white/10 transition-all" onClick={onClick}>
        <div className={`w-16 h-16 rounded-[1.5rem] ${color} flex items-center justify-center text-white mb-6 shadow-xl`}>
            {React.cloneElement(icon, { size: 32 })}
        </div>
        <h3 className="text-2xl font-black mb-2 flex items-center justify-between">
            {title}
            <ChevronLeft className="group-hover:translate-x-[-8px] transition-transform"/>
        </h3>
    </div>
);

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

export default StudentPortal;
