
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
        setAvailableGames(allGames.filter((g: InteractiveGame) => g.targetClass === currentUser.className));
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
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <GraduationCap size={24}/>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">بوابة الطالب</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{currentUser.name} • {currentUser.className}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 hidden sm:flex items-center gap-2">
                        <Zap size={16} className="text-amber-500" fill="currentColor"/>
                        <span className="text-sm font-bold text-slate-700">{currentUser.xp || 0} نقطة</span>
                    </div>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <LogOut size={20}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <SummaryCard icon={Calendar} label="خطة المذاكرة" color="text-orange-600" bg="bg-orange-50" onClick={()=>setActiveTab('STUDY')}/>
                             <SummaryCard icon={Target} label="أهدافي" color="text-rose-600" bg="bg-rose-50" onClick={()=>setActiveTab('GOALS')}/>
                             <SummaryCard icon={BrainCircuit} label="المهارات" color="text-blue-600" bg="bg-blue-50" onClick={()=>setActiveTab('TREE')}/>
                        </div>

                        {/* Interactive Games Section */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Gamepad2 className="text-blue-600"/> التحديات التفاعلية
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableGames.map((game) => (
                                    <div key={game.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-slate-50 rounded-lg text-blue-600">
                                                {game.type === 'MATCHING' ? <Puzzle size={24}/> : <Layers size={24}/>}
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">+{game.xpReward} XP</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1">{game.title}</h4>
                                        <p className="text-xs text-slate-500 mb-4">{game.subject}</p>
                                        <button onClick={() => setSelectedGame(game)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm">ابدأ التحدي</button>
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
            
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-20 flex justify-around items-center px-4 z-[60] shadow-lg">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<Target/>} label="أهدافي" active={activeTab==='GOALS'} onClick={()=>setActiveTab('GOALS')}/>
                <NavBtn icon={<Activity/>} label="درجاتي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <NavBtn icon={<Star/>} label="المتجر" active={activeTab==='SHOP'} onClick={()=>setActiveTab('SHOP')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>
        </div>
    );
};

const SummaryCard = ({ icon: Icon, label, color, bg, onClick }: any) => (
    <button onClick={onClick} className={`p-4 ${bg} rounded-xl border border-transparent hover:border-slate-200 flex items-center gap-4 transition-all w-full`}>
        <div className={`p-2 bg-white rounded-lg shadow-sm ${color}`}><Icon size={20}/></div>
        <span className="font-bold text-slate-700 text-sm">{label}</span>
    </button>
);

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 flex-1 transition-all ${active ? 'text-blue-600' : 'text-slate-400'}`}>
        <div className={`p-2 rounded-lg transition-all ${active ? 'bg-blue-50' : ''}`}>
            {React.cloneElement(icon, { size: 22 })}
        </div>
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

export default StudentPortal;
