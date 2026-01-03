
import React, { useState } from 'react';
import { Sparkles, Loader2, Save, FileText, Bot, Zap, Plus, X, ListChecks } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Exam, Question, ExamType, AchievementMethod, SystemUser } from '../types';
import { saveExam } from '../services/storageService';

const AutoExamGenerator: React.FC<{ currentUser: SystemUser, onComplete: () => void }> = ({ currentUser, onComplete }) => {
    const [lessonText, setLessonText] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [examTitle, setExamTitle] = useState('');
    const [subject, setSubject] = useState('');

    const generateExam = async () => {
        if (!lessonText || !subject) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `أنت خبير تربوي سعودي. بناءً على النص التعليمي التالي، قم بتوليد اختبار خيارات (MCQ) مكون من 5 أسئلة. 
            النص: "${lessonText}"
            المطلوب إرجاع JSON فقط: {"questions": [{"text": "السؤال", "options": ["أ", "ب", "ج", "د"], "correctAnswer": "أ"}]}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const data = JSON.parse(response.text || "{}");
            if (data.questions) {
                const formatted = data.questions.map((q: any, i: number) => ({
                    id: `q_auto_${Date.now()}_${i}`,
                    text: q.text,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    type: 'MCQ',
                    points: 2
                }));
                setGeneratedQuestions(formatted);
            }
        } catch (e) {
            alert('فشل توليد الاختبار. تأكد من وضوح النص.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveExam = () => {
        if (!examTitle || generatedQuestions.length === 0) return;
        const newExam: Exam = {
            id: `exam_${Date.now()}`,
            title: examTitle,
            subject: subject,
            gradeLevel: 'عام',
            type: ExamType.QUIZ,
            achievementMethod: AchievementMethod.SCORE_THRESHOLD,
            passingScore: 60,
            durationMinutes: 15,
            questions: generatedQuestions,
            isActive: true,
            createdAt: new Date().toISOString(),
            teacherId: currentUser.id
        };
        saveExam(newExam);
        alert('تم حفظ الاختبار وتفعيله للطلاب بنجاح!');
        onComplete();
    };

    return (
        <div className="p-6 bg-white rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in font-tajawal">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg"><Sparkles/></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">مولد الاختبارات الذكي</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase">AI Instant Assessment Engine</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">1. موضوع / نص الدرس</label>
                        <textarea 
                            className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-3xl h-64 outline-none font-medium text-slate-700 leading-relaxed transition-all"
                            placeholder="ألصق محتوى الدرس هنا..."
                            value={lessonText}
                            onChange={e => setLessonText(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="p-4 border rounded-2xl bg-slate-50 font-bold" placeholder="المادة" value={subject} onChange={e=>setSubject(e.target.value)} />
                        <input className="p-4 border rounded-2xl bg-slate-50 font-bold" placeholder="عنوان الاختبار" value={examTitle} onChange={e=>setExamTitle(e.target.value)} />
                    </div>
                    <button 
                        onClick={generateExam}
                        disabled={loading || !lessonText}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin"/> : <Bot/>} {loading ? 'جاري استنباط الأسئلة...' : 'توليد الاختبار الآن'}
                    </button>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><ListChecks size={200}/></div>
                    <h3 className="text-xl font-black mb-8 relative z-10">معاينة الأسئلة المولدة:</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 relative z-10">
                        {generatedQuestions.map((q, i) => (
                            <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-3xl animate-slide-up" style={{animationDelay: `${i*0.1}s`}}>
                                <p className="font-bold text-sm mb-4">س{i+1}: {q.text}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {q.options.map(opt => (
                                        <div key={opt} className={`p-2 rounded-xl text-[10px] border ${opt === q.correctAnswer ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {generatedQuestions.length === 0 && !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-white/20">
                                <Zap size={80} strokeWidth={1}/>
                                <p className="font-bold mt-4 italic">بانتظار التحليل...</p>
                            </div>
                        )}
                    </div>
                    {generatedQuestions.length > 0 && (
                        <button onClick={handleSaveExam} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-100 transition-all">تفعيل الاختبار للطلاب</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoExamGenerator;
