
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student, PerformanceRecord } from '../types';
import GamePlayer from './GamePlayer';
import { getGames, fetchPerformance } from '../services/storageService';
import { 
    // Added GraduationCap and Ghost to the imported icons from lucide-react
    Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, 
    Bell, ShieldCheck, Zap, Sparkles, Puzzle, Layers, User, Crown, 
    Rocket, ChevronLeft, Map, Target, GraduationCap, Ghost
} from 'lucide-react';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentMessages from './StudentMessages';
import StudentAITutor from './StudentAITutor';
import StudentAchievements from './StudentAchievements';
import StudentQuestSystem from './StudentQuestSystem';
import StudentShop from './StudentShop';
import StudentDigitalID from './StudentDigitalID';
import DailyQuestTrigger from './DailyQuestTrigger';
import StudentAchievementTimeline from './StudentAchievementTimeline';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [selectedGame, setSelectedGame] = useState<InteractiveGame | null>(null);
    const [availableGames, setAvailableGames] = useState<InteractiveGame[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ACAD' | 'SHOP' | 'ID' | 'TIMELINE'>('DASHBOARD');

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
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-tajawal pb-24 overflow-x-hidden relative" dir="rtl">
            {/* Background Aesthetic Layers */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] animate-pulse-slow [animation-delay:2s]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            </div>

            <DailyQuestTrigger student={currentUser} onAccept={() => setActiveTab('DASHBOARD')} />
            
            {selectedGame && (
                <GamePlayer 
                    game={selectedGame} 
                    student={currentUser} 
                    onClose={() => { setSelectedGame(null); loadPerf(); }} 
                />
            )}
            
            <header className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-2xl sticky top-0 z-50 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[1.5rem] flex items-center justify-center font-black shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                        <GraduationCap size={32}/>
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tight">بوابة الطالب <span className="text-indigo-400">الذكية</span></h1>
                        <div className="flex gap-2 items-center mt-1">
                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/10">{currentUser.className}</span>
                            <div className="w-1 h-1 rounded-full bg-white/20"></div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">متصل بالذكاء</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 shadow-inner group">
                        <Zap size={18} className="text-yellow-400 group-hover:scale-125 transition-transform" fill="currentColor"/>
                        <div className="text-right">
                             <p className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1">XP Points</p>
                             <p className="font-black text-lg leading-none">{currentUser.xp || 0}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="p-4 text-red-400 bg-red-500/5 hover:bg-red-500/20 rounded-[1.5rem] transition-all border border-white/5 group">
                        <LogOut size={22} className="group-hover:translate-x-[-4px] transition-transform"/>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-10 space-y-16 max-w-7xl mx-auto w-full relative z-10">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-16 animate-fade-in">
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />
                        
                        <section className="animate-slide-up">
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h3 className="text-3xl font-black flex items-center gap-4">
                                        <Gamepad2 className="text-indigo-400" size={32}/> تحديات المنهج التفاعلية
                                    </h3>
                                    <p className="text-slate-400 text-sm font-bold mt-2">أكمل الألعاب المخصصة لفصلك واربح نقاط XP سحابية</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {availableGames.map((game: InteractiveGame) => (
                                    <button 
                                        key={game.id} 
                                        onClick={() => setSelectedGame(game)} 
                                        className="bg-white/5 backdrop-blur-md p-10 rounded-[3.5rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:border-indigo-500 transition-all text-right group relative overflow-hidden flex flex-col h-80"
                                    >
                                        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-all duration-700"></div>
                                        <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-2xl border border-white/5">
                                            {game.type === 'MATCHING' ? <Puzzle className="text-indigo-400" size={40}/> : <Layers className="text-purple-400" size={40}/>}
                                        </div>
                                        <h4 className="text-white font-black text-2xl mb-2 group-hover:text-indigo-400 transition-colors">{game.title}</h4>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{game.subject}</p>
                                        
                                        <div className="mt-auto flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-yellow-400 font-black">
                                                <Zap size={16} fill="currentColor"/> {game.xpReward} XP
                                            </div>
                                            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                                                <ChevronLeft size={20}/>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {availableGames.length === 0 && (
                                    <div className="col-span-full py-24 text-center text-slate-600 border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5 backdrop-blur-sm">
                                        <Ghost size={80} className="mx-auto mb-6 opacity-10"/>
                                        <p className="font-black text-2xl">لا توجد ألعاب منشورة لفصلك حالياً</p>
                                        <p className="text-sm font-bold mt-2">ترقب إبداعات معلميك في الحصص القادمة!</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <StudentQuestSystem student={currentUser} />
                    </div>
                )}

                {activeTab === 'ACAD' && <StudentEvaluationView student={currentUser} performance={performance} />}
                {activeTab === 'SHOP' && <StudentShop xp={currentUser.xp || 0} rewards={[]} student={currentUser} onPurchaseComplete={loadPerf} />}
                {activeTab === 'ID' && <StudentDigitalID student={currentUser} stats={studentStats} />}
                {activeTab === 'TIMELINE' && <StudentAchievementTimeline student={currentUser} attendance={[]} performance={performance} />}
            </main>
            
            {/* Floating Glassmorphism Navigation */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black/60 backdrop-blur-3xl border border-white/10 h-24 flex justify-around items-center px-6 z-[60] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2.5rem]">
                <NavBtn icon={<LayoutGrid/>} label="الرئيسية" active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')}/>
                <NavBtn icon={<Target/>} label="درجاتي" active={activeTab==='ACAD'} onClick={()=>setActiveTab('ACAD')}/>
                <NavBtn icon={<Map/>} label="الخريطة" active={activeTab==='TIMELINE'} onClick={()=>setActiveTab('TIMELINE')}/>
                <NavBtn icon={<Star/>} label="المتجر" active={activeTab==='SHOP'} onClick={()=>setActiveTab('SHOP')}/>
                <NavBtn icon={<User/>} label="هويتي" active={activeTab==='ID'} onClick={()=>setActiveTab('ID')}/>
            </nav>

            <StudentAITutor student={currentUser} />
        </div>
    );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 flex-1 h-full justify-center transition-all group ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
        <div className={`p-3 rounded-2xl transition-all duration-500 ${active ? 'bg-indigo-600/20 shadow-[0_0_30px_rgba(79,70,229,0.4)] scale-110' : 'group-hover:bg-white/5'}`}>
            {React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2 })}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all ${active ? 'text-white' : 'text-slate-500'}`}>{label}</span>
    </button>
);

export default StudentPortal;
