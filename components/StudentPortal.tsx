
import React, { useState, useEffect } from 'react';
import { InteractiveGame, Student } from '../types';
import GamePlayer from './GamePlayer';
import { getGames } from '../services/storageService';
import { Gamepad2, Trophy, BookOpen, Star, LogOut, LayoutGrid, Activity, Bell } from 'lucide-react';
import StudentJourney from './StudentJourney';
import StudentEvaluationView from './StudentEvaluationView';
import StudentMessages from './StudentMessages';
import StudentAITutor from './StudentAITutor';
import StudentAchievements from './StudentAchievements';
import StudentQuestSystem from './StudentQuestSystem';
import StudentShop from './StudentShop';
import StudentDigitalID from './StudentDigitalID';

const StudentPortal = ({ currentUser, onLogout }: { currentUser: Student, onLogout: () => void }) => {
    const [selectedGame, setSelectedGame] = useState<InteractiveGame | null>(null);
    const [availableGames, setAvailableGames] = useState<InteractiveGame[]>([]);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ACAD' | 'MSG' | 'SHOP' | 'ID'>('DASHBOARD');

    useEffect(() => {
        setAvailableGames(getGames().filter(g => g.targetClass === currentUser.className));
    }, [currentUser]);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-tajawal pb-20">
            {selectedGame && <GamePlayer game={selectedGame} student={currentUser} onClose={() => setSelectedGame(null)} />}
            
            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">S</div>
                    <h1 className="font-black">بوابة الطالب الذكية</h1>
                </div>
                <button onClick={onLogout} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><LogOut/></button>
            </header>

            <main className="flex-1 p-6 space-y-10 max-w-6xl mx-auto w-full">
                {activeTab === 'DASHBOARD' && (
                    <>
                        <StudentJourney xp={currentUser.xp || 0} level={currentUser.level || 1} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableGames.map(game => (
                                <button key={game.id} onClick={() => setSelectedGame(game)} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-2xl hover:border-indigo-500 transition-all text-right group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 group-hover:w-2 transition-all"></div>
                                     <Gamepad2 className="text-indigo-400 mb-4" size={32}/>
                                     <h4 className="text-white font-black text-lg">{game.title}</h4>
                                     <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">تحدي من المعلم • {game.xpReward} XP</p>
                                </button>
                            ))}
                        </div>
                        <StudentQuestSystem student={currentUser} />
                    </>
                )}
            </main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/5 h-20 flex justify-around items-center px-4">
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
    <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

const ShieldCheck = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);

export default StudentPortal;
