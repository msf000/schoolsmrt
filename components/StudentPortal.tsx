
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord, FormsDetailedResult } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance, getFormsDetailedResults } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers, User, Crown, 
    Rocket, ChevronLeft, Target, GraduationCap, BrainCircuit, Calendar,
    RefreshCw, Heart, Award
} from 'lucide-react';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentMessages from './StudentMessages';
import StudentShop from './StudentShop';
import StudentDigitalID from './StudentDigitalID';
import StudentAchievementTimeline from './StudentAchievementTimeline';
import SmartStudyPlan from './SmartStudyPlan';
import KnowledgeTree from './KnowledgeTree';
import StudentGoalSystem from './StudentGoalSystem';
import DailyQuestTrigger from './DailyQuestTrigger';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [selectedGame, setSelectedGame] = useState<InteractiveGame | null>(null);
    const [availableGames, setAvailableGames] = useState<InteractiveGame[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [formsResults, setFormsResults] = useState<FormsDetailedResult[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ACAD' | 'SHOP' | 'ID' | 'TIMELINE' | 'STUDY' | 'TREE' | 'GOALS'>('DASHBOARD');

    useEffect(() => {
        const allGames = getGames();
        setAvailableGames(allGames.filter((g: InteractiveGame) => !g.targetClass || g.targetClass === currentUser.className));
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const res: PerformanceRecord[] = await fetchPerformance();
        setPerformance(res.filter((p: PerformanceRecord) => p.studentId === currentUser.id));
        setFormsResults(getFormsDetailedResults(currentUser.createdById || ''));
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-tajawal pb-24" dir="rtl">
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none z-0"></div>
            <div className="fixed top-[-10%] left-[-10%] w-full h-full bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none"></div>
            
            {selectedGame && (
                <GamePlayer 
                    game={selectedGame} 
                    student={currentUser} 
                    onClose={() => { setSelectedGame(null); loadData(); }} 
                />
            )}
            
            <DailyQuestTrigger student={currentUser} onAccept={() => setActiveTab('DASHBOARD')} />

            <header className="bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 px-6 lg:px-12 py-5 lg:py-6 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
                <div className="flex items-center gap-4 lg:gap-6">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl border border-indigo-400/30 transform rotate-3">
                        <GraduationCap size={28}/>
                    </div>
                    <div>
                        <h1 className="font-black text-lg lg:text-2xl text-white tracking-tight">أكاديمية المستقبل</h1>
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.3em]">{currentUser.name} • Lv {currentUser.level || 1}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 lg:gap-6">
                    <div className="bg-white/5 px-4 lg:px-6 py-2 rounded-2xl border border-white/10 flex items-center gap-3 group hover:border-amber-400/50 transition-all">
                        <Zap size={18} className="text-amber-400 group-hover:animate-pulse" fill="currentColor"/>
                        <span className="text-sm font-black text-white">{currentUser.xp || 0} XP</span>
                    </div>
                    <button onClick={onLogout} className="p-2.5 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                        <LogOut size={22}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 lg:p-12 max-w-7xl mx-auto w-full relative z-10">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-10 lg:space-y-16 animate-fade-in">
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-10">
                             <SummaryPortalCard icon={Calendar} label="خطة AI" desc="مخطط مذاكرة" color="text-orange-400" bg="bg-orange-500/10" onClick={()=>setActiveTab('STUDY')}/>
                             <SummaryPortalCard icon={Target} label="أهدافي" desc="تتبع الطموحات" color="text-rose-400" bg="bg-rose-500/10" onClick={()=>setActiveTab('GOALS')}/>
                             <SummaryPortalCard icon={BrainCircuit} label="تمكني" desc="تحليل المهارات" color="text-blue-400" bg="bg-blue-500/10" onClick={()=>setActiveTab('TREE')}/>
                        </div>

                        <section className="bg-white/5 p-8 lg:p-16 rounded-5xl border border-white/5 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-1000 pointer-events-none"><Gamepad2 size={300}/></div>
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 relative z-10 gap-6">
                                <div>
                                    <h3 className="text-3xl lg:text-4xl font-black text-white flex items-center gap-4">
                                        <Sparkles className="text-yellow-400 animate-pulse"/> التحديات النشطة
                                    </h3>
                                    <p className="text-xs text-indigo-300 font-bold mt-2 uppercase tracking-widest opacity-60">Complete quests to earn rewards</p>
                                </div>
                                <button onClick={() => setAvailableGames(getGames())} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5"><RefreshCw size={22}/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 relative z-10">
                                {availableGames.map((game) => (
                                    <div key={game.id} className="bg-slate-900/60 p-8 rounded-[3rem] border border-white/5 hover:border-indigo-500 hover:bg-slate-900 transition-all group cursor-pointer shadow-xl" onClick={() => setSelectedGame(game)}>
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="p-4 bg-white/5 rounded-2xl text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                {game.type === 'MATCHING' ? <Puzzle size={32}/> : <Layers size={32}/>}
                                            </div>
                                            <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/20 flex items-center gap-1.5"><Zap size={12} fill="currentColor"/> +{game.xpReward}</span>
                                        </div>
                                        <h4 className="font-black text-white mb-2 text-xl truncate">{game.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-10">{game.subject}</p>
                                        <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl transition-all flex items-center justify-center gap-3">
                                            دخول التحدي <ChevronLeft size={18}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'ACAD' && <StudentEvaluationView student={currentUser} performance={performance} />}
                {activeTab === 'SHOP' && <StudentShop xp={currentUser.xp || 0} rewards={[]} student={currentUser} onPurchaseComplete={loadData} />}
                {activeTab === 'ID' && <StudentDigitalID student={currentUser} stats={{level: currentUser.level||1, xp: currentUser.xp||0}} />}
                {activeTab === 'TREE' && <KnowledgeTree student={currentUser} performance={performance} formsResults={formsResults} />}
                {activeTab === 'GOALS' && <StudentGoalSystem student={currentUser} performance={performance} />}
                {activeTab === 'STUDY' && <SmartStudyPlan student={currentUser} />}
            </main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-3xl border-t border-white/5 h-24 flex justify-around items-center px-4 lg:px-12 z-[60] shadow-[0_-20px_80px_rgba(0,0,0,0.5)]">
                <StudentNavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <StudentNavBtn icon={<Target/>} label="أهدافي" active={activeTab==='GOALS'} onClick={()=>setActiveTab('GOALS')}/>
                <StudentNavBtn icon={<Activity/>} label="إنجازي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <StudentNavBtn icon={<Award/>} label="المتجر" active={activeTab==='SHOP'} onClick={()=>setActiveTab('SHOP')}/>
                <StudentNavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>
        </div>
    );
};

const SummaryPortalCard = ({ icon: Icon, label, desc, color, bg, onClick }: any) => (
    <button onClick={onClick} className={`p-6 lg:p-8 ${bg} rounded-4xl border border-white/5 hover:border-white/20 hover:shadow-2xl flex items-center gap-5 lg:gap-6 transition-all w-full group overflow-hidden relative active:scale-95`}>
        <div className="absolute -bottom-4 -left-4 opacity-5 group-hover:scale-150 transition-transform duration-1000"><Icon size={120}/></div>
        <div className={`p-4 lg:p-5 bg-black/40 rounded-3xl shadow-2xl ${color} group-hover:scale-110 transition-transform relative z-10 border border-white/5`}><Icon size={28}/></div>
        <div className="text-right relative z-10">
            <span className="font-black text-white text-lg lg:text-xl block mb-1">{label}</span>
            <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">{desc}</span>
        </div>
    </button>
);

const StudentNavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        <div className={`p-2.5 lg:p-3 rounded-2xl transition-all duration-500 ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/50 scale-110' : 'hover:bg-white/5'}`}>
            {React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2 })}
        </div>
        <span className={`text-[9px] mt-2 font-black tracking-widest transition-all ${active ? 'opacity-100 uppercase' : 'opacity-40'}`}>{label}</span>
    </button>
);

export default StudentPortal;
