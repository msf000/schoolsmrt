
import React, { useState, useEffect, useMemo } from 'react';
import { Student, FlippedLesson } from '../types';
import { getFlippedLessons, markLessonPrepared } from '../services/storageService';
import { 
    BookOpen, Video, CheckCircle, Clock, Zap, 
    Sparkles, ArrowRight, Loader2, ChevronLeft, Bot,
    GraduationCap, Info, Globe
} from 'lucide-react';
import { useToast } from './ToastProvider';
import ReactMarkdown from 'react-markdown';

const StudentFlippedPortal: React.FC<{ student: Student }> = ({ student }) => {
    const { showToast } = useToast();
    const [lessons, setLessons] = useState<FlippedLesson[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<FlippedLesson | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadLessons();
    }, [student]);

    const loadLessons = () => {
        const all = getFlippedLessons();
        setLessons(all.filter(l => l.className === student.className).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    };

    const handleMarkReady = async (lessonId: string) => {
        setIsProcessing(true);
        try {
            await markLessonPrepared(student.id, lessonId);
            showToast('رائع! حصلت على نقاط XP لاستعدادك المبكر.', 'SUCCESS');
            loadLessons();
            setSelectedLesson(null);
        } finally {
            setIsProcessing(false);
        }
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
                        {lessons.length === 0 && (
                            <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center gap-8 border-4 border-dashed border-white/10 rounded-[4rem]">
                                <BookOpen size={150} strokeWidth={1}/>
                                <p className="text-3xl font-black italic">لا يوجد مهام تحضير حالية</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-slate-950 to-purple-950/20 opacity-50"></div>
                    <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedLesson(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><ArrowRight/></button>
                            <div>
                                <h2 className="text-xl font-black text-white">{selectedLesson.title}</h2>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{selectedLesson.subject}</p>
                            </div>
                        </div>
                        {!selectedLesson.preparedStudentIds.includes(student.id) && (
                            <button 
                                onClick={() => handleMarkReady(selectedLesson.id)}
                                disabled={isProcessing}
                                className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-900/40 hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>} أنا مستعد ومحضر
                            </button>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
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

                            <div className="space-y-6">
                                <h4 className="text-2xl font-black text-white border-r-4 border-indigo-600 pr-4">تفاصيل الدرس</h4>
                                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 text-slate-300 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                                    {selectedLesson.contentBody}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFlippedPortal;
