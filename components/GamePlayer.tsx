
import React, { useState, useEffect, useMemo } from 'react';
import { InteractiveGame, Student } from '../types';
import { updateStudent } from '../services/storageService';
import { 
    Trophy, Clock, CheckCircle2, RefreshCw, Star, Zap, X, 
    ArrowRight, Heart, Sparkles, Loader2, Layers, Puzzle, AlertCircle
} from 'lucide-react';

interface Props {
    game: InteractiveGame;
    student: Student;
    onClose: () => void;
}

const GamePlayer: React.FC<Props> = ({ game, student, onClose }) => {
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'WIN'>('START');
    const [timeLeft, setTimeLeft] = useState(0);
    const [matches, setMatches] = useState<string[]>([]);
    const [selections, setSelections] = useState<any[]>([]);

    // Sorting Game Specific States
    const [currentSortingItemIdx, setCurrentSortingItemIdx] = useState(0);
    const [sortingResults, setSortingResults] = useState<{item: string, isCorrect: boolean}[]>([]);

    const gameData = useMemo(() => game.content, [game]);

    // Matching Items Setup
    const matchingItems = useMemo(() => {
        if (game.type !== 'MATCHING') return [];
        const terms = gameData.pairs.map((p: any) => ({ text: p.term, id: p.term, type: 'TERM' }));
        const defs = gameData.pairs.map((p: any) => ({ text: p.definition, id: p.term, type: 'DEF' }));
        return [...terms, ...defs].sort(() => 0.5 - Math.random());
    }, [gameData, game.type]);

    // Sorting Items Setup
    const sortingItems = useMemo(() => {
        if (game.type !== 'SORTING') return [];
        const allItems: {text: string, category: string}[] = [];
        gameData.categories.forEach((cat: any) => {
            cat.items.forEach((it: string) => {
                allItems.push({ text: it, category: cat.name });
            });
        });
        return allItems.sort(() => 0.5 - Math.random());
    }, [gameData, game.type]);

    useEffect(() => {
        let timer: any;
        if (gameState === 'PLAYING') {
            timer = setInterval(() => setTimeLeft(t => t + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [gameState]);

    const handleMatchSelect = (item: any) => {
        if (matches.includes(item.id)) return;
        if (selections.length === 1 && selections[0].type === item.type) {
            setSelections([item]);
            return;
        }

        const newSelections = [...selections, item];
        setSelections(newSelections);

        if (newSelections.length === 2) {
            if (newSelections[0].id === newSelections[1].id) {
                setMatches([...matches, item.id]);
                if (matches.length + 1 === gameData.pairs.length) {
                    handleWin();
                }
            }
            setTimeout(() => setSelections([]), 500);
        }
    };

    const handleSortSelect = (categoryName: string) => {
        const currentItem = sortingItems[currentSortingItemIdx];
        const isCorrect = currentItem.category === categoryName;
        
        const newResults = [...sortingResults, { item: currentItem.text, isCorrect }];
        setSortingResults(newResults);

        if (currentSortingItemIdx + 1 < sortingItems.length) {
            setCurrentSortingItemIdx(prev => prev + 1);
        } else {
            handleWin();
        }
    };

    const handleWin = async () => {
        setGameState('WIN');
        const xpEarned = game.xpReward;
        await updateStudent({ ...student, xp: (student.xp || 0) + xpEarned });
    };

    return (
        <div className="fixed inset-0 z-[250] bg-slate-950 text-white flex flex-col font-tajawal overflow-hidden" dir="rtl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-50"></div>
            
            <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
                    <div>
                        <h2 className="text-xl font-black">{game.title}</h2>
                        <div className="flex gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            <span>{game.subject}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                {game.type === 'MATCHING' ? <Puzzle size={12}/> : <Layers size={12}/>}
                                {game.type === 'MATCHING' ? 'لعبة التوصيل' : 'لعبة التصنيف'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase">الوقت</p>
                        <p className="text-2xl font-black font-mono">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase">الإنجاز</p>
                        <p className="text-2xl font-black text-indigo-400">
                            {game.type === 'MATCHING' ? `${matches.length} / ${gameData.pairs?.length}` : `${currentSortingItemIdx} / ${sortingItems.length}`}
                        </p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 p-8 overflow-y-auto custom-scrollbar flex items-center justify-center">
                {gameState === 'START' && (
                    <div className="text-center space-y-8 animate-zoom-in">
                        <div className="w-40 h-40 bg-indigo-600 rounded-[3rem] flex items-center justify-center mx-auto shadow-[0_0_80px_rgba(79,70,229,0.3)] animate-bounce-slow">
                            {game.type === 'MATCHING' ? <Puzzle size={80}/> : <Layers size={80}/>}
                        </div>
                        <div>
                            <h3 className="text-5xl font-black mb-4 tracking-tighter">مستعد للتحدي؟</h3>
                            <p className="text-indigo-300 text-lg font-bold">اربح {game.xpReward} XP عند إكمال اللعبة بنجاح.</p>
                        </div>
                        <button onClick={() => setGameState('PLAYING')} className="px-20 py-6 bg-white text-slate-950 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">ابدأ اللعب الآن</button>
                    </div>
                )}

                {gameState === 'PLAYING' && game.type === 'MATCHING' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-6xl">
                        {matchingItems.map((item, idx) => {
                            const isSelected = selections.find(s => s.text === item.text);
                            const isMatched = matches.includes(item.id);
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => handleMatchSelect(item)}
                                    disabled={isMatched}
                                    className={`aspect-square p-6 rounded-[2.5rem] border-4 transition-all duration-500 text-center font-black text-sm md:text-lg flex items-center justify-center relative group ${
                                        isMatched ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 scale-95 opacity-50' :
                                        isSelected ? 'bg-indigo-600 border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105' :
                                        'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {isMatched && <CheckCircle2 className="absolute top-4 left-4 text-emerald-400" size={20}/>}
                                    {item.text}
                                </button>
                            );
                        })}
                    </div>
                )}

                {gameState === 'PLAYING' && game.type === 'SORTING' && (
                    <div className="w-full max-w-4xl flex flex-col items-center gap-12 animate-fade-in">
                        <div className="relative">
                             <div className="absolute -inset-10 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                             <div className="bg-white/5 backdrop-blur-xl p-16 rounded-[4rem] border-2 border-white/10 shadow-2xl text-center min-w-[350px] relative z-10 group">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 block">صنف هذا العنصر:</span>
                                <h3 className="text-4xl md:text-6xl font-black tracking-tighter group-hover:scale-110 transition-transform duration-500">
                                    {sortingItems[currentSortingItemIdx]?.text}
                                </h3>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                            {gameData.categories.map((cat: any) => (
                                <button 
                                    key={cat.name}
                                    onClick={() => handleSortSelect(cat.name)}
                                    className="p-10 bg-indigo-600/20 hover:bg-indigo-600 border-2 border-indigo-500/30 hover:border-white rounded-[3rem] text-2xl font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl group"
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                            <Layers size={24}/>
                                        </div>
                                        {cat.name}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {sortingResults.map((res, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${res.isCorrect ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}></div>
                            ))}
                        </div>
                    </div>
                )}

                {gameState === 'WIN' && (
                    <div className="text-center space-y-8 animate-bounce-in">
                        <div className="relative">
                            <div className="absolute -inset-10 bg-yellow-400 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
                            <Trophy size={150} className="text-yellow-400 relative z-10 drop-shadow-2xl mx-auto"/>
                            <Sparkles className="absolute top-0 right-0 text-white animate-spin-slow" size={48}/>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-6xl font-black tracking-tighter">أسطوري! 🏆</h3>
                            <p className="text-2xl font-bold text-indigo-300">أنهيت التحدي بنجاح في {timeLeft} ثانية</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex items-center justify-between gap-12">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase">الرصيد السابق</p>
                                <p className="text-2xl font-black">{student.xp || 0}</p>
                            </div>
                            <div className="p-4 bg-indigo-600 rounded-2xl animate-pulse"><Zap fill="currentColor"/></div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-indigo-400 uppercase">الرصيد الجديد</p>
                                <p className="text-4xl font-black text-yellow-400">{(student.xp || 0) + game.xpReward}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-full py-6 bg-white text-slate-950 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">العودة للبوابة</button>
                    </div>
                )}
            </main>

            <style>{`
                .animate-bounce-slow { animation: bounce 3s infinite; }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                .perspective-1000 { perspective: 1000px; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

export default GamePlayer;
