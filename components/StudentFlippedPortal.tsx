
import React, { useState, useEffect } from 'react';
import { Student, FlippedLesson, Question, FlippedComment } from '../types';
import { getFlippedLessons, markLessonPrepared, addFlippedComment } from '../services/storageService';
import { 
    BookOpen, Video, CheckCircle, Clock, Zap, 
    Sparkles, ArrowRight, Loader2, Bot,
    GraduationCap, Globe, ListChecks, ArrowLeft,
    CheckCircle2, XCircle, MessageSquare, Send
} from 'lucide-react';
import { useToast } from './ToastProvider';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';

const StudentFlippedPortal: React.FC<{ student: Student }> = ({ student }) => {
    const { showToast } = useToast();
    const [lessons, setLessons] = useState<FlippedLesson[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<FlippedLesson | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [commentText, setCommentText] = useState('');
    
    // Quiz State
    const [quizActive, setQuizActive] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [quizFinished, setQuizFinished] = useState(false);

    useEffect(() => {
        loadLessons();
    }, [student]);

    const loadLessons = () => {
        const all = getFlippedLessons();
        setLessons(all.filter(l => l.className === student.className).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    };

    const handleStartQuiz = () => {
        setQuizActive(true);
        setCurrentQ(0);
        setAnswers({});
        setQuizFinished(false);
    };

    const handleAnswer = (option: string) => {
        setAnswers({ ...answers, [currentQ]: option });
        if (selectedLesson && selectedLesson.questions && currentQ < selectedLesson.questions.length - 1) {
            setCurrentQ(currentQ + 1);
        } else {
            setQuizFinished(true);
        }
    };

    const handleMarkReady = async () => {
        if (!selectedLesson) return;
        setIsProcessing(true);
        try {
            const questions = selectedLesson.questions || [];
            const wrongIds = questions.filter((q, i) => answers[i] !== q.correctAnswer).map(q => q.id);
            const score = questions.length - wrongIds.length;
            
            await markLessonPrepared(student.id, selectedLesson.id, { score, wrongIds });
            showToast('رائع! أثبتّ جاهزيتك وحصلت على XP إضافي.', 'SUCCESS');
            loadLessons();
            setSelectedLesson(null);
            setQuizActive(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddComment = async () => {
        if (!commentText || !selectedLesson) return;
        const comment: FlippedComment = {
            id: `c_${Date.now()}`,
            userId: student.id,
            userName: student.name,
            text: commentText,
            createdAt: new Date().toISOString()
        };
        await addFlippedComment(selectedLesson.id, comment);
        setCommentText('');
        showToast('تم إرسال تساؤلك للمعلم.', 'SUCCESS');
        const updated = { ...selectedLesson, comments: [...(selectedLesson.comments || []), comment] };
        setSelectedLesson(updated);
    };

    const renderQuiz = () => {
        if (!selectedLesson?.questions) return null;
        const questions = selectedLesson.questions;
        
        if (quizFinished) {
            const correctCount = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
            const isPassed = correctCount >= questions.length * 0.6;

            return (
                <div className="flex flex-col items-center justify-center p-10 text-center space-y-8 animate-zoom-in">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${isPassed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {isPassed ? <CheckCircle2 size={48}/> : <XCircle size={48}/>}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-white">{isPassed ? 'أنت مستعد تماماً!' : 'تحتاج لمراجعة المحتوى ثانية'}</h3>
                        <p className="text-indigo-300 text-lg font-bold mt-2">أجبت على {correctCount} من أصل {questions.length} أسئلة بشكل صحيح</p>
                    </div>
                    {isPassed ? (
                        <button 
                            onClick={handleMarkReady}
                            disabled={isProcessing}
                            className="px-12 py-4 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>} تأكيد الجاهزية واستلام XP
                        </button>
                    ) : (
                        <button 
                            onClick={() => setQuizActive(false)}
                            className="px-12 py-4 bg-white/10 text-white rounded-3xl font-black text-xl border border-white/10 hover:bg-white/20 transition-all"
                        >
                            العودة للمراجعة
                        </button>
                    )}
                </div>
            );
        }

        const q = questions[currentQ];
        const progress = ((currentQ + 1) / questions.length) * 100;

        return (
            <div className="w-full max-w-2xl mx-auto space-y-10 animate-fade-in">
                <div className="text-center">
                    <span className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-4 block">سؤال {currentQ + 1} من {questions.length}</span>
                    <h3 className="text-3xl font-black text-white leading-relaxed">{q.text}</h3>
                </div>

                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {q.options.map((opt, i) => (
                        <button 
                            key={i}
                            onClick={() => handleAnswer(opt)}
                            className="p-6 bg-white/5 hover:bg-indigo-600 border-2 border-white/5 hover:border-white/20 rounded-[2rem] text-xl font-black transition-all active:scale-95 text-right flex items-center justify-between group"
                        >
                            <span className="flex-1">{opt}</span>
                            <div className="w-6 h-6 rounded-full border-2 border-white/10 group-hover:border-white/40"></div>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col animate-fade-in font-tajawal text-right" dir="rtl">
            {!selectedLesson ? (
                <div className="space-y-8 p-6 pb-24 lg:pb-10">
                    <div className="bg-slate-900/50 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><GraduationCap size={200}/></div>
                        <div className="relative z-10 text-center md:text-right">
                            <h2 className="text-4xl font-black text-white flex items-center gap-4 justify-center md:justify-start">
                                <Sparkles className="text-yellow-400" size={40}/> التعلم الاستباقي
                            </h2>
                            <p className="text-indigo-200 text-lg font-bold mt-2">استعد للحصة القادمة وكن بطل النقاش!</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lessons.map(lesson => {
                            const isDone = lesson.preparedStudentIds.includes(student.id);
                            return (
                                <div 
                                    key={lesson.id} 
                                    onClick={() => setSelectedLesson(lesson)}
                                    className={`bg-white/5 p-8 rounded-[3rem] border-2 transition-all duration-500 cursor-pointer ${isDone ? 'border-emerald-500/20 opacity-70' : 'border-white/5 hover:border-indigo-500/30 shadow-xl'}`}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 rounded-2xl ${isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-50/20 text-indigo-400'}`}>
                                            {lesson.contentUrl ? <Video size={28}/> : <BookOpen size={28}/>}
                                        </div>
                                        {isDone && <CheckCircle className="text-emerald-500" size={24}/>}
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">{lesson.title}</h3>
                                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">{lesson.subject}</p>
                                    <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Clock size={12}/> {new Date(lesson.createdAt).toLocaleDateString('ar-SA')}</span>
                                        <span className="text-xs font-black text-yellow-400 flex items-center gap-1"><Zap size={14} fill="currentColor"/> +{lesson.xpReward} XP</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-slate-950 to-purple-950/20 opacity-50"></div>
                    <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedLesson(null); setQuizActive(false); }} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><ArrowRight/></button>
                            <div>
                                <h2 className="text-xl font-black text-white">{selectedLesson.title}</h2>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{selectedLesson.subject}</p>
                            </div>
                        </div>
                        {!selectedLesson.preparedStudentIds.includes(student.id) && !quizActive && (
                            <button 
                                onClick={selectedLesson.questions?.length ? handleStartQuiz : handleMarkReady}
                                disabled={isProcessing}
                                className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-900/40 hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : (selectedLesson.questions?.length ? <ListChecks size={18}/> : <CheckCircle size={18}/>)} 
                                {selectedLesson.questions?.length ? 'بدء اختبار الجاهزية' : 'أنا مستعد ومحضر'}
                            </button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
                        {quizActive ? renderQuiz() : (
                            <div className="max-w-4xl mx-auto space-y-12 pb-32">
                                {selectedLesson.aiSummary && (
                                    <div className="bg-indigo-600/10 p-10 rounded-[3.5rem] border-2 border-indigo-500/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5"><Bot size={150}/></div>
                                        <h4 className="text-xl font-black text-indigo-400 mb-6 flex items-center gap-3"><Sparkles size={24}/> ملخص المعلم الذكي</h4>
                                        <div className="prose prose-invert max-w-none text-indigo-100 leading-relaxed font-medium">
                                            <ReactMarkdown>{selectedLesson.aiSummary}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {selectedLesson.contentUrl && (
                                    <div className="bg-black/40 p-2 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden aspect-video">
                                        {selectedLesson.contentUrl.includes('youtube.com') || selectedLesson.contentUrl.includes('youtu.be') ? (
                                            <iframe 
                                                className="w-full h-full rounded-[2.5rem]" 
                                                src={selectedLesson.contentUrl.replace('watch?v=', 'embed/')} 
                                                title="video" 
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                                                <Globe size={48}/>
                                                <a href={selectedLesson.contentUrl} target="_blank" rel="noreferrer" className="text-blue-400 font-bold hover:underline">اضغط هنا لفتح المصدر الخارجي</a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-10">
                                    <div>
                                        <h4 className="text-2xl font-black text-white border-r-4 border-indigo-600 pr-4 mb-6">تفاصيل الدرس</h4>
                                        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 text-slate-300 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                                            {selectedLesson.contentBody}
                                        </div>
                                    </div>

                                    {/* Discussion Section */}
                                    <div className="space-y-6">
                                        <h4 className="text-2xl font-black text-white border-r-4 border-amber-500 pr-4 mb-6 flex items-center gap-3"><MessageSquare size={24}/> نقاش الدرس واستفساراتك</h4>
                                        <div className="bg-white/5 rounded-[3rem] border border-white/5 p-8 flex flex-col gap-6">
                                            <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                                {(selectedLesson.comments || []).map(c => (
                                                    <div key={c.id} className={`flex flex-col ${c.userId === student.id ? 'items-start' : 'items-end'}`}>
                                                        <div className={`p-4 rounded-2xl text-sm ${c.userId === student.id ? 'bg-indigo-600 text-white rounded-tl-none' : 'bg-white/10 text-indigo-100 rounded-tr-none'}`}>
                                                            <p className="text-[10px] font-black opacity-60 mb-1">{c.userName}</p>
                                                            <p className="font-medium">{c.text}</p>
                                                        </div>
                                                        <span className="text-[8px] text-white/20 mt-1">{formatDualDate(c.createdAt)}</span>
                                                    </div>
                                                ))}
                                                {(selectedLesson.comments || []).length === 0 && <p className="text-center py-10 text-white/20 italic">لا يوجد نقاشات بعد، كن أول من يسأل!</p>}
                                            </div>
                                            <div className="flex gap-4 p-2 bg-black/40 rounded-2xl border border-white/5">
                                                <input className="flex-1 bg-transparent p-3 text-white outline-none font-bold text-sm" placeholder="لديك سؤال؟ اكتبه هنا للمعلم..." value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddComment()}/>
                                                <button onClick={handleAddComment} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"><Send size={20}/></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFlippedPortal;
