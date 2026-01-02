
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord, FormsDetailedResult } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance, getFormsDetailedResults } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers, User, Crown, 
    Rocket, ChevronLeft, Target, GraduationCap, BrainCircuit, Calendar,
    RefreshCw
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
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-tajawal pb-24" dir="rtl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 pointer-events-none"></div>
            
            {selectedGame && (
                <GamePlayer 
                    game={selectedGame} 
                    student={currentUser} 
                    onClose={() => { setSelectedGame(null); loadData(); }} 
                />
            )}
            
            <DailyQuestTrigger student={currentUser} onAccept={() => setActiveTab('DASHBOARD')} />

            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-400/30">
                        <GraduationCap size={28}/>
                    </div>
                    <div>
                        <h1 className="font-black text-xl text-white tracking-tight">بوابة المبدع الرقمية</h1>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">{currentUser.name} • LEVEL {currentUser.level || 1}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10 hidden md:flex items-center gap-3 group hover:border-amber-400/50 transition-all">
                        <Zap size={20} className="text-amber-400 group-hover:animate-pulse" fill="currentColor"/>
                        <span className="text-sm font-black text-white">{currentUser.xp || 0} XP</span>
                    </div>
                    <button onClick={onLogout} className="p-3 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all">
                        <LogOut size={24}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full relative z-10">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-12 animate-fade-in">
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             <SummaryPortalCard icon={Calendar} label="خطة المراجعة (AI)" desc="مخطط مذاكرة ذكي" color="text-orange-400" bg="bg-orange-500/10" onClick={()=>setActiveTab('STUDY')}/>
                             <SummaryPortalCard icon={Target} label="أهدافي التعليمية" desc="تتبع الطموحات" color="text-rose-400" bg="bg-orange-500/10" onClick={()=>setActiveTab('GOALS')}/>
                             <SummaryPortalCard icon={BrainCircuit} label="خريطة التمكن" desc="تحليل المهارات" color="text-blue-400" bg="bg-orange-500/10" onClick={()=>setActiveTab('TREE')}/>
                        </div>

                        <section className="bg-white/5 p-12 rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none"><Gamepad2 size={250}/></div>
                            <div className="flex justify-between items-center mb-12 relative z-10">
                                <div>
                                    <h3 className="text-3xl font-black text-white flex items-center gap-4">
                                        <Sparkles className="text-amber-400 animate-pulse"/> التحديات التفاعلية النشطة
                                    </h3>
                                    <p className="text-xs text-indigo-300 font-bold mt-2 uppercase tracking-widest opacity-60">Complete quests to level up</p>
                                </div>
                                {/* Add RefreshCw import to fix missing name error */}
                                <button onClick={() => setAvailableGames(getGames())} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><RefreshCw size={20}/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                                {availableGames.map((game) => (
                                    <div key={game.id} className="bg-slate-900/80 p-8 rounded-[3rem] border border-white/5 hover:border-indigo-500 transition-all group cursor-pointer shadow-xl" onClick={() => setSelectedGame(game)}>
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="p-5 bg-white/5 rounded-3xl text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                {game.type === 'MATCHING' ? <Puzzle size={32}/> : <Layers size={32}/>}
                                            </div>
                                            <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/20 flex items-center gap-1.5"><Zap size={12} fill="currentColor"/> +{game.xpReward} XP</span>
                                        </div>
                                        <h4 className="font-black text-white mb-2 text-xl truncate">{game.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-10">{game.subject}</p>
                                        <button className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-900/40 transition-all flex items-center justify-center gap-2">
                                            ابدأ المغامرة الآن <ChevronLeft size={18}/>
                                        </button>
                                    </div>
                                ))}
                                {availableGames.length === 0 && (
                                    <div className="col-span-full py-32 text-center text-white/10 flex flex-col items-center">
                                        <Rocket size={120} strokeWidth={1} className="mb-6"/>
                                        <p className="text-3xl font-black">لا توجد تحديات جديدة مبرمجة حالياً</p>
                                    </div>
                                )}
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
                {activeTab === 'TIMELINE' && <StudentAchievementTimeline student={currentUser} attendance={[]} performance={performance} />}
            </main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 h-24 flex justify-around items-center px-10 z-[60] shadow-[0_-20px_80px_rgba(0,0,0,0.5)]">
                <StudentNavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <StudentNavBtn icon={<Target/>} label="أهدافي" active={activeTab==='GOALS'} onClick={()=>setActiveTab('GOALS')}/>
                <StudentNavBtn icon={<Activity/>} label="درجاتي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <StudentNavBtn icon={<Star/>} label="المتجر" active={activeTab==='SHOP'} onClick={()=>setActiveTab('SHOP')}/>
                <StudentNavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>
        </div>
    );
};

const SummaryPortalCard = ({ icon: Icon, label, desc, color, bg, onClick }: any) => (
    <button onClick={onClick} className={`p-8 ${bg} rounded-[3rem] border border-white/5 hover:border-white/20 hover:shadow-2xl flex items-center gap-6 transition-all w-full group overflow-hidden relative`}>
        <div className="absolute -bottom-4 -left-4 opacity-5 group-hover:scale-150 transition-transform duration-700"><Icon size={120}/></div>
        <div className={`p-5 bg-black/40 rounded-3xl shadow-2xl ${color} group-hover:scale-110 transition-transform relative z-10 border border-white/5`}><Icon size={32}/></div>
        <div className="text-right relative z-10">
            <span className="font-black text-white text-xl block mb-1">{label}</span>
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em]">{desc}</span>
        </div>
    </button>
);

const StudentNavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        <div className={`p-3 rounded-2xl transition-all duration-500 ${active ? 'bg-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.5)]' : 'hover:bg-white/5'}`}>
            {React.cloneElement(icon, { size: 26, strokeWidth: active ? 2.5 : 2 })}
        </div>
        <span className={`text-[10px] mt-2 font-black tracking-widest ${active ? 'opacity-100 uppercase' : 'opacity-40'}`}>{label}</span>
    </button>
);

export default StudentPortal;
