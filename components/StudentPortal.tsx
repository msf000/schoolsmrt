
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord, FormsDetailedResult } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance, getFormsDetailedResults } from '../services/storageService';
import { 
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers, User, Crown, 
    Rocket, ChevronLeft, Target, GraduationCap, BrainCircuit, Calendar
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
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-tajawal pb-24" dir="rtl">
            {selectedGame && (
                <GamePlayer 
                    game={selectedGame} 
                    student={currentUser} 
                    onClose={() => { setSelectedGame(null); loadData(); }} 
                />
            )}
            
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                        <GraduationCap size={24}/>
                    </div>
                    <div>
                        <h1 className="font-black text-lg text-slate-800">بوابة الطالب الذكية</h1>
                        <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{currentUser.name} • {currentUser.className || 'الفصل الدراسي'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 hidden sm:flex items-center gap-2">
                        <Zap size={16} className="text-amber-500" fill="currentColor"/>
                        <span className="text-xs font-black text-indigo-700">{currentUser.xp || 0} XP</span>
                    </div>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <LogOut size={20}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <SummaryCard icon={Calendar} label="خطة المراجعة (AI)" desc="جدول مذاكرة مخصص" color="text-orange-600" bg="bg-orange-50" onClick={()=>setActiveTab('STUDY')}/>
                             <SummaryCard icon={Target} label="أهدافي التعليمية" desc="تتبع طموحاتك" color="text-rose-600" bg="bg-rose-50" onClick={()=>setActiveTab('GOALS')}/>
                             <SummaryCard icon={BrainCircuit} label="خريطة المهارات" desc="تقييم مستوى الإتقان" color="text-blue-600" bg="bg-blue-50" onClick={()=>setActiveTab('TREE')}/>
                        </div>

                        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none"><Gamepad2 size={150}/></div>
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        <Gamepad2 className="text-indigo-600"/> التحديات التعليمية التفاعلية
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Interactive Challenges</p>
                                </div>
                                <Sparkles className="text-yellow-400 animate-pulse"/>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                {availableGames.map((game) => (
                                    <div key={game.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:border-indigo-400 transition-all group cursor-pointer" onClick={() => setSelectedGame(game)}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                                                {game.type === 'MATCHING' ? <Puzzle size={28}/> : <Layers size={28}/>}
                                            </div>
                                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1"><Zap size={10} fill="currentColor"/> +{game.xpReward}</span>
                                        </div>
                                        <h4 className="font-black text-slate-800 mb-1 text-lg truncate">{game.title}</h4>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{game.subject}</p>
                                        <button className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">بدء التحدي الآن</button>
                                    </div>
                                ))}
                                {availableGames.length === 0 && (
                                    <div className="col-span-full py-20 text-center text-slate-300 font-bold italic">لا توجد تحديات جديدة حالياً.</div>
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
            </main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 h-20 flex justify-around items-center px-4 z-[60] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<Target/>} label="أهدافي" active={activeTab==='GOALS'} onClick={()=>setActiveTab('GOALS')}/>
                <NavBtn icon={<Activity/>} label="درجاتي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <NavBtn icon={<Star/>} label="المتجر" active={activeTab==='SHOP'} onClick={()=>setActiveTab('SHOP')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>
        </div>
    );
};

const SummaryCard = ({ icon: Icon, label, desc, color, bg, onClick }: any) => (
    <button onClick={onClick} className={`p-6 ${bg} rounded-3xl border-2 border-transparent hover:border-white hover:shadow-xl flex items-center gap-5 transition-all w-full group`}>
        <div className={`p-4 bg-white rounded-2xl shadow-sm ${color} group-hover:scale-110 transition-transform`}><Icon size={24}/></div>
        <div className="text-right">
            <span className="font-black text-slate-800 text-base block">{label}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{desc}</span>
        </div>
    </button>
);

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
        <div className={`p-2.5 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : ''}`}>
            {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
        </div>
        <span className={`text-[10px] mt-1 font-black ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
);

export default StudentPortal;
