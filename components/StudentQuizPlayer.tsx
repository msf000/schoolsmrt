
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, ExamResult, Student, PerformanceRecord, AchievementMethod } from '../types';
import { saveExamResult, addPerformance } from '../services/storageService';
import { Clock, CheckCircle2, ChevronLeft, BrainCircuit, Trophy, Sparkles, Loader2, Zap, AlertCircle, ShieldCheck } from 'lucide-react';

interface StudentQuizPlayerProps {
    exam: Exam;
    student: Student;
    onComplete: () => void;
}

const StudentQuizPlayer: React.FC<StudentQuizPlayerProps> = ({ exam, student, onComplete }) => {
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [timeLeft, setTimeLeft] = useState(() => {
        const now = new Date().getTime();
        const individualLimit = exam.durationMinutes * 60;
        if (exam.endDate) {
            const officialEnd = new Date(exam.endDate).getTime();
            const timeUntilOfficialEnd = Math.max(0, Math.floor((officialEnd - now) / 1000));
            return Math.min(individualLimit, timeUntilOfficialEnd);
        }
        return individualLimit;
    });

    useEffect(() => {
        if (timeLeft <= 0 && !isFinished) { handleSubmit(); return; }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isFinished]);

    const currentQ = exam.questions[currentQIndex];
    const progress = ((currentQIndex + 1) / exam.questions.length) * 100;

    // Fixed: Added handleSelect function
    const handleSelect = (option: string) => {
        if (currentQ) {
            setAnswers({ ...answers, [currentQ.id]: option });
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting || isFinished) return;
        setIsSubmitting(true);
        let score = 0;
        const totalPossible = exam.questions.reduce((a, b) => a + b.points, 0);
        
        const processedAnswers = exam.questions.map(q => {
            const isCorrect = answers[q.id] === q.correctAnswer;
            if (isCorrect) score += q.points;
            return { questionId: q.id, studentAnswer: answers[q.id] || '', isCorrect };
        });

        const scorePct = (score / totalPossible) * 100;
        let isAchieved = false;

        if (exam.achievementMethod === AchievementMethod.COMPLETION) {
            isAchieved = true; // الإنجاز بمجرد التسليم
        } else {
            isAchieved = scorePct >= (exam.passingScore || 50); // الإنجاز بدرجة اجتياز
        }

        const result: ExamResult = {
            id: `res_${Date.now()}`, examId: exam.id, studentId: student.id,
            score, totalScore: totalPossible, isAchieved,
            answers: processedAnswers, date: new Date().toISOString()
        };

        await saveExamResult(result);
        
        const perfRecord: PerformanceRecord = {
            id: `perf_${Date.now()}`, studentId: student.id, subject: exam.subject,
            title: exam.title, score: score, maxScore: totalPossible,
            date: new Date().toISOString().split('T')[0], category: 'PLATFORM_EXAM',
            createdById: exam.teacherId, notes: exam.id
        };
        await addPerformance([perfRecord]);

        setIsFinished(true);
        setIsSubmitting(false);
    };

    if (isFinished) {
        const score = exam.questions.filter(q => answers[q.id] === q.correctAnswer).reduce((a, b) => a + b.points, 0);
        const total = exam.questions.reduce((a, b) => a + b.points, 0);
        const scorePct = Math.round((score / total) * 100);
        const success = exam.achievementMethod === AchievementMethod.COMPLETION || scorePct >= (exam.passingScore || 50);

        return (
            <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center p-6 font-tajawal text-white">
                <div className="bg-slate-900/60 p-12 rounded-[4rem] border border-white/5 shadow-2xl text-center w-full max-w-2xl relative overflow-hidden backdrop-blur-3xl animate-bounce-in">
                    <div className="absolute top-0 right-0 p-10 opacity-5"><Trophy size={250}/></div>
                    <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-white/10 ${success ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        {success ? <CheckCircle2 size={48}/> : <AlertCircle size={48}/>}
                    </div>
                    <h2 className="text-5xl font-black mb-4 tracking-tighter">{success ? 'أحسنت يا بطل! 🏆' : 'محاولة جيدة! 🦾'}</h2>
                    <p className="text-indigo-200 mb-10 text-xl font-bold">
                        {success ? 'لقد حققت معايير الإنجاز المطلوبة.' : `درجتك (${scorePct}%) لم تصل لدرجة الاجتياز (${exam.passingScore}%).`}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6 mb-12">
                        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-xl">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">الدرجة</p>
                            <h3 className="text-5xl font-black text-white">{score} <span className="text-lg text-white/20">/ {total}</span></h3>
                        </div>
                        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-xl">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">حالة الإنجاز</p>
                            <h3 className={`text-2xl font-black ${success ? 'text-emerald-400' : 'text-amber-400'}`}>{success ? 'مكتمل' : 'قيد المراجعة'}</h3>
                        </div>
                    </div>

                    <button onClick={onComplete} className="w-full py-6 bg-white text-slate-900 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">العودة للرئيسية</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-[#020617] text-white h-full flex flex-col font-tajawal animate-fade-in">
            <header className="relative z-10 px-8 py-6 flex justify-between items-center bg-black/30 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 border border-indigo-400/30"><BrainCircuit size={28}/></div>
                    <div><h1 className="text-xl font-black text-white leading-none">{exam.title}</h1><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">{exam.subject} • {exam.type}</p></div>
                </div>
                <div className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-mono font-black text-2xl border-2 transition-all ${timeLeft < 60 ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-white/5 text-white border-white/10 shadow-inner'}`}>
                    <Clock size={24}/> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </header>

            <div className="relative z-10 w-full mb-2"><div className="h-2 bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-700" style={{ width: `${progress}%` }}></div></div></div>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-4xl bg-slate-900/60 p-12 md:p-20 rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-md">
                    <div className="text-center relative z-10 mb-16">
                        <span className="text-indigo-400 font-black text-xs uppercase tracking-[0.4em] mb-4 block opacity-60">السؤال {currentQIndex + 1}</span>
                        <h3 className="text-3xl md:text-5xl font-black text-white leading-tight">{currentQ.text}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {currentQ.options.map((opt, i) => (
                            <button key={i} onClick={() => handleSelect(opt)} className={`p-8 rounded-[2.5rem] border-4 text-right font-black text-xl transition-all duration-500 flex items-center justify-between group ${answers[currentQ.id] === opt ? 'bg-indigo-600 border-white shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-[1.02] z-10' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'}`}>
                                <span className="flex-1">{opt}</span>
                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${answers[currentQ.id] === opt ? 'bg-white border-white' : 'bg-white/5 border-white/10'}`}>{answers[currentQ.id] === opt && <div className="w-4 h-4 bg-indigo-600 rounded-full animate-zoom-in"></div>}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-4xl flex justify-between items-center mt-12 px-4">
                    <button disabled={currentQIndex === 0} onClick={() => setCurrentQIndex(currentQIndex - 1)} className="px-8 py-4 text-white/30 font-black flex items-center gap-3 hover:text-white transition-all disabled:opacity-0 active:scale-95"><ChevronLeft className="rotate-180" size={24}/> السابق</button>
                    {currentQIndex === exam.questions.length - 1 ? (
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-20 py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-20">{isSubmitting ? <Loader2 className="animate-spin" size={28}/> : <Sparkles size={28}/>} تسليم الاختبار</button>
                    ) : (
                        <button onClick={() => setCurrentQIndex(currentQIndex + 1)} disabled={!answers[currentQ.id]} className="px-16 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-20">التالي <ChevronLeft size={28}/></button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentQuizPlayer;
