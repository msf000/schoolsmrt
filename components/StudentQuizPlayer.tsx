
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, ExamResult, Student, Question } from '../types';
import { saveExamResult } from '../services/storageService';
/* Fix: Added Zap to the imported icons */
import { Clock, CheckCircle2, ChevronLeft, BrainCircuit, Star, Trophy, Sparkles, Loader2, AlertCircle, X, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentQuizPlayerProps {
    exam: Exam;
    student: Student;
    onComplete: () => void;
}

const StudentQuizPlayer: React.FC<StudentQuizPlayerProps> = ({ exam, student, onComplete }) => {
    const navigate = useNavigate();
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (timeLeft <= 0 && !isFinished) {
            handleSubmit();
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isFinished]);

    const currentQ = exam.questions[currentQIndex];
    const progress = ((currentQIndex + 1) / exam.questions.length) * 100;

    const handleSelect = (ans: string) => {
        setAnswers({ ...answers, [currentQ.id]: ans });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        let score = 0;
        const processedAnswers = exam.questions.map(q => {
            const isCorrect = answers[q.id] === q.correctAnswer;
            if (isCorrect) score += q.points;
            return { questionId: q.id, studentAnswer: answers[q.id], isCorrect };
        });

        const result: ExamResult = {
            id: `res_${Date.now()}`,
            examId: exam.id,
            studentId: student.id,
            score,
            totalScore: exam.questions.reduce((a, b) => a + b.points, 0),
            answers: processedAnswers,
            date: new Date().toISOString()
        };

        await saveExamResult(result);
        setIsFinished(true);
        setIsSubmitting(false);
    };

    if (isFinished) {
        const total = exam.questions.reduce((a, b) => a + b.points, 0);
        const score = exam.questions.filter(q => answers[q.id] === q.correctAnswer).reduce((a, b) => a + b.points, 0);
        const xpEarned = Math.floor((score / total) * 100);

        return (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full p-6 animate-fade-in font-tajawal">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-indigo-50 text-center w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5"><Trophy size={200}/></div>
                    
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <CheckCircle2 size={48} />
                    </div>
                    
                    <h2 className="text-4xl font-black text-gray-800 mb-4">انتهى الاختبار!</h2>
                    <p className="text-gray-500 mb-10 font-bold">بطلنا المبدع، لقد أتممت الاختبار بنجاح.</p>
                    
                    <div className="grid grid-cols-2 gap-6 mb-12">
                        <div className="bg-indigo-50 p-8 rounded-[2rem] border-2 border-indigo-100 flex flex-col items-center">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">درجة الإتقان</p>
                            <h3 className="text-5xl font-black text-indigo-900">{score} <span className="text-lg text-indigo-300">/ {total}</span></h3>
                        </div>
                        <div className="bg-yellow-50 p-8 rounded-[2rem] border-2 border-yellow-100 flex flex-col items-center">
                            <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">النقاط المكتسبة</p>
                            <h3 className="text-5xl font-black text-yellow-700 flex items-center gap-2"><Zap size={24} fill="currentColor"/> {xpEarned}</h3>
                        </div>
                    </div>

                    <button 
                        onClick={onComplete}
                        className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        العودة للرئيسية <ChevronLeft size={24}/>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 font-tajawal animate-fade-in p-4 md:p-10">
            <header className="max-w-4xl mx-auto w-full flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BrainCircuit size={24}/></div>
                    <div>
                        <h1 className="text-lg font-black text-gray-800">{exam.title}</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{exam.subject}</p>
                    </div>
                </div>
                <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl font-mono font-black text-xl border-2 ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-800 border-slate-100'}`}>
                    <Clock size={20}/> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </header>

            <div className="max-w-4xl mx-auto w-full mb-6">
                <div className="flex justify-between mb-3 text-[10px] font-black uppercase text-indigo-400">
                    <span>السؤال {currentQIndex + 1} من {exam.questions.length}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden border p-0.5 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-8 overflow-y-auto custom-scrollbar pb-10">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none"><ShieldCheck size={200}/></div>
                    <h3 className="text-2xl md:text-3xl font-black text-gray-800 mb-12 text-center leading-relaxed relative z-10">{currentQ.text}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {currentQ.options.map((opt, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSelect(opt)}
                                className={`p-6 rounded-[2rem] border-4 text-right font-black text-lg transition-all flex items-center justify-between group ${
                                    answers[currentQ.id] === opt 
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-100 scale-[1.02]' 
                                    : 'bg-slate-50 border-transparent text-slate-600 hover:bg-white hover:border-indigo-100'
                                }`}
                            >
                                <span>{opt}</span>
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${answers[currentQ.id] === opt ? 'bg-white border-white' : 'bg-white border-slate-200'}`}>
                                    {answers[currentQ.id] === opt && <div className="w-4 h-4 bg-indigo-600 rounded-full animate-zoom-in"></div>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-auto">
                    <button 
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex(currentQIndex - 1)}
                        className="px-8 py-4 text-slate-400 font-black flex items-center gap-2 hover:text-slate-800 transition-all disabled:opacity-0"
                    >
                        <ChevronLeft className="rotate-180" size={20}/> السابق
                    </button>

                    {currentQIndex === exam.questions.length - 1 ? (
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting || Object.keys(answers).length < exam.questions.length}
                            className="px-16 py-5 bg-green-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-green-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin"/> : <Sparkles/>} إنهاء وتسليم الإجابات
                        </button>
                    ) : (
                        <button 
                            onClick={() => setCurrentQIndex(currentQIndex + 1)}
                            disabled={!answers[currentQ.id]}
                            className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            السؤال التالي <ChevronLeft size={24}/>
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentQuizPlayer;
