import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance } from '../services/storageService';
// Fix: Added missing Puzzle and Layers imports
import { Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers } from 'lucide-react';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentMessages from './StudentMessages';
import StudentAITutor from './StudentAITutor';
import StudentAchievements from './StudentAchievements';
import StudentQuestSystem from './StudentQuestSystem';
import StudentShop from './StudentShop';
import StudentDigitalID from './StudentDigitalID';
import DailyQuestTrigger from './DailyQuestTrigger';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [selectedGame, setSelectedGame] = useState<InteractiveGame | null>(null);
    const [availableGames, setAvailableGames] = useState<InteractiveGame[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ACAD' | 'SHOP' | 'ID'>('DASHBOARD');

    useEffect(() => {
        const allGames = getGames();
        setAvailableGames(allGames.filter((g: InteractiveGame) => g.targetClass === currentUser.className));
        loadPerf();
    }, [currentUser]);

    const loadPerf = async () => {
        const res: PerformanceRecord[] = await fetchPerformance();
        setPerformance(res.filter((p: PerformanceRecord) => p.studentId === currentUser.id));
    };

    const studentStats = {
        level: currentUser.level || 1,
        xp: currentUser.xp || 0
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-tajawal pb-20 overflow-x-hidden" dir="rtl">
            <DailyQuestTrigger student={currentUser} onAccept={() => setActiveTab('DASHBOARD')} />
            
            {selectedGame && (
                <GamePlayer 
                    game={selectedGame} 
                    student={currentUser} 
                    onClose={() => { setSelectedGame(null); loadPerf(); }} 
                />
            )}
            
            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-indigo-900/20">
                        <Sparkles size={24}/>
                    </div>
                    <div>
                        <h1 className="font-black text-lg">بوابة الطالب الذكية</h1>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{currentUser.className}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <Zap size={14} className="text-yellow-400" fill="currentColor"/>
                        <span className="font-black text-sm">{currentUser.xp || 0} XP</span>
                    </div>
                    <button onClick={onLogout} className="p-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20">
                        <LogOut size={20}/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-12 max-w-7xl mx-auto w-full">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-12 animate-fade-in">
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />
                        
                        <section>
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-2xl font-black flex items-center gap-3">
                                        <Gamepad2 className="text-indigo-400"/> تحديات المنهج المتاحة
                                    </h3>
                                    <p className="text-slate-500 text-xs font-bold mt-1">أكمل الألعاب المخصصة لفصلك واربح نقاط XP</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableGames.map(game => (
                                    <button 
                                        key={game.id} 
                                        onClick={() => setSelectedGame(game)} 
                                        className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl hover:border-indigo-500 transition-all text-right group relative overflow-hidden text-right"
                                    >
                                        <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500 group-hover:w-3 transition-all duration-500"></div>
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            {game.type === 'MATCHING' ? <Puzzle className="text-indigo-400" size={32}/> : <Layers className="text-purple-400" size={32}/>}
                                        </div>
                                        <h4 className="text-white font-black text-xl mb-2">{game.title}</h4>
                                        <div className="flex items-center justify-between mt-6">
                                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">{game.subject}</span>
                                            <span className="text-sm font-black text-yellow-400 flex items-center gap-1"><Zap size={14} fill="currentColor"/> {game.xpReward} XP</span>
                                        </div>
                                    </button>
                                ))}
                                {availableGames.length === 0 && (
                                    <div className="col-span-full py-20 text-center text-slate-600 border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5">
                                        <p className="font-black text-xl">لا توجد ألعاب منشورة حالياً</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <StudentQuestSystem student={currentUser} />
                    </div>
                )}

                {activeTab === 'ACAD' && (
                    <StudentEvaluationView student={currentUser} performance={performance} />
                )}

                {activeTab === 'SHOP' && (
                    <StudentShop xp={currentUser.xp || 0} rewards={[]} student={currentUser} onPurchaseComplete={loadPerf} />
                )}

                {activeTab === 'ID' && (
                    <StudentDigitalID student={currentUser} stats={studentStats} />
                )}
            </main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 h-24 flex justify-around items-center px-4 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<Activity/>} label="درجاتي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <NavBtn icon={<Star/>} label="المتجر" active={activeTab==='SHOP'} onClick={()=>setActiveTab('SHOP')}/>
                <NavBtn icon={<ShieldCheck/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>
            <StudentAITutor student={currentUser} />
        </div>
    );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 flex-1 h-full justify-center transition-all ${active ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
        <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.2)]' : ''}`}>
            {React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2 })}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : ''}`}>{label}</span>
    </button>
);

export default StudentPortal;
