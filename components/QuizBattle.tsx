
import React, { useState, useEffect } from 'react';
import { Student, Question } from '../types';
import { Trophy, Swords, Zap, Users, CheckCircle, XCircle, Timer, Sparkles, Star, Target, Crown, ShieldAlert, ChevronLeft } from 'lucide-react';

interface QuizBattleProps {
    students: Student[];
    questions: Question[];
    onClose: () => void;
}

const QuizBattle: React.FC<QuizBattleProps> = ({ students, questions, onClose }) => {
    const [step, setStep] = useState<'TEAMS' | 'PLAYING' | 'WINNER'>('TEAMS');
    const [teamA, setTeamA] = useState<Student[]>([]);
    const [teamB, setTeamB] = useState<Student[]>([]);
    const [score, setScore] = useState({ a: 0, b: 0 });
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [timer, setTimer] = useState(20);
    const [isPaused, setIsPaused] = useState(false);
    const [turn, setTurn] = useState<'A' | 'B'>('A');

    useEffect(() => {
        if (step === 'PLAYING' && timer > 0 && !isPaused) {
            const t = setInterval(() => setTimer(v => v - 1), 1000);
            return () => clearInterval(t);
        } else if (timer === 0 && step === 'PLAYING') {
            handleAnswer(false);
        }
    }, [timer, step, isPaused]);

    const setupTeams = () => {
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const mid = Math.ceil(shuffled.length / 2);
        setTeamA(shuffled.slice(0, mid));
        setTeamB(shuffled.slice(mid));
        setStep('PLAYING');
    };

    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) {
            setScore(prev => ({ ...prev, [turn.toLowerCase()]: prev[turn.toLowerCase() as 'a' | 'b'] + 10 }));
        }
        
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(v => v + 1);
            setTimer(20);
            setTurn(turn === 'A' ? 'B' : 'A');
        } else {
            setStep('WINNER');
        }
    };

    const currentQ = questions[currentQIndex];

    return (
        <div className="fixed inset-0 z-[250] bg-slate-950 flex flex-col font-tajawal text-white overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            
            {step === 'TEAMS' && (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-10 gap-12">
                    <div className="text-center space-y-4">
                        <Swords size={100} className="mx-auto text-indigo-500 animate-bounce"/>
                        <h2 className="text-6xl font-black italic tracking-tighter">معركة المعرفة</h2>
                        <p className="text-indigo-300 font-bold text-xl uppercase tracking-[0.3em]">Scientific Battle Mode</p>
                    </div>
                    
                    <div className="flex gap-10 md:gap-20 items-center">
                        <TeamCard label="فرسان العلم" color="from-indigo-600 to-blue-700" icon={<Zap/>}/>
                        <div className="text-4xl font-black text-white/20">VS</div>
                        <TeamCard label="صقور الإبداع" color="from-rose-600 to-orange-700" icon={<Trophy/>}/>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-10 py-6 bg-white/5 border border-white/10 rounded-[2.5rem] font-black text-xl hover:bg-white/10 transition-all">إلغاء</button>
                        <button onClick={setupTeams} className="px-20 py-6 bg-white text-slate-900 rounded-[2.5rem] font-black text-2xl shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all">إطلاق صافرة البداية</button>
                    </div>
                </div>
            )}

            {step === 'PLAYING' && currentQ && (
                <div className="relative z-10 flex-1 flex flex-col p-10">
                    <div className="flex justify-between items-center mb-10">
                        <ScoreBadge team="فرسان العلم" score={score.a} active={turn === 'A'} color="bg-indigo-600" />
                        <div className="flex flex-col items-center">
                            <div className={`w-32 h-32 rounded-full border-8 ${timer < 5 ? 'border-red-500 animate-pulse' : 'border-white/10'} flex items-center justify-center relative`}>
                                <span className="text-5xl font-black font-mono">{timer}</span>
                                <Timer className="absolute -top-4 -right-4 text-indigo-400" size={32}/>
                            </div>
                            <p className="mt-4 text-white/40 font-black text-xs uppercase tracking-widest">متبقي للإجابة</p>
                        </div>
                        <ScoreBadge team="صقور الإبداع" score={score.b} active={turn === 'B'} color="bg-rose-600" />
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-12">
                        <div className="bg-white/5 backdrop-blur-3xl p-10 md:p-16 rounded-[4rem] border-4 border-white/10 w-full max-w-5xl text-center relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Target size={200}/></div>
                            <h3 className="text-4xl md:text-5xl font-black leading-tight mb-4">{currentQ.text}</h3>
                            <div className="flex justify-center gap-4">
                                <span className="px-6 py-2 bg-indigo-500/20 text-indigo-400 rounded-2xl font-black text-sm border border-indigo-500/30">السؤال {currentQIndex + 1} من {questions.length}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                            {currentQ.options.map((opt, i) => (
                                <button 
                                    key={i}
                                    onClick={() => handleAnswer(opt === currentQ.correctAnswer)}
                                    className="p-8 bg-white/5 hover:bg-indigo-600 border-2 border-white/10 rounded-[2.5rem] text-2xl font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl group text-right"
                                >
                                    <div className="flex items-center gap-6">
                                        <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-400 group-hover:bg-white group-hover:text-indigo-600 shrink-0">{String.fromCharCode(65 + i)}</span>
                                        <span className="truncate">{opt}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {step === 'WINNER' && (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-10 gap-10 animate-fade-in">
                    <div className="relative">
                        <div className="absolute -inset-10 bg-yellow-400 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                        <Trophy size={200} className="text-yellow-400 relative z-10 drop-shadow-2xl"/>
                        <Sparkles className="absolute top-0 right-0 text-white animate-spin-slow" size={64}/>
                    </div>
                    <div className="text-center space-y-4">
                        <h2 className="text-7xl font-black tracking-tight">الفريق الفائز</h2>
                        <h3 className={`text-6xl font-black ${score.a > score.b ? 'text-indigo-400' : 'text-rose-400'}`}>
                            {score.a > score.b ? 'فرسان العلم 🛡️' : score.b > score.a ? 'صقور الإبداع 🦅' : 'تعادل الأبطال! 🤝'}
                        </h3>
                        <p className="text-2xl font-bold text-white/40">النتيجة النهائية: {score.a} - {score.b}</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-12 py-5 bg-white/10 rounded-[2rem] font-black text-xl border border-white/20 hover:bg-white/20 transition-all">العودة للفصل</button>
                        <button onClick={() => { setStep('TEAMS'); setScore({a:0,b:0}); setCurrentQIndex(0); }} className="px-12 py-5 bg-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all">جولة جديدة</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TeamCard = ({ label, color, icon }: any) => (
    <div className={`w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br ${color} rounded-[3.5rem] flex flex-col items-center justify-center gap-4 shadow-2xl border-4 border-white/20 transform rotate-3`}>
        <div className="p-4 bg-white/20 rounded-3xl text-white">{React.cloneElement(icon, { size: 48 })}</div>
        <span className="text-xl md:text-2xl font-black">{label}</span>
    </div>
);

const ScoreBadge = ({ team, score, active, color }: any) => (
    <div className={`p-6 md:p-8 rounded-[3rem] border-4 transition-all duration-500 flex flex-col items-center gap-2 w-56 md:w-72 ${active ? `${color} border-white shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-110` : 'bg-white/5 border-white/10 opacity-40'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest">{team}</p>
        <div className="text-5xl md:text-6xl font-black">{score}</div>
        {active && <span className="text-[8px] font-black animate-pulse uppercase tracking-widest mt-2">Team Turn 🔥</span>}
    </div>
);

export default QuizBattle;
