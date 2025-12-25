
import React, { useState } from 'react';
import { Student } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import { Sparkles, Loader2, Calendar, Target, BrainCircuit, Rocket, ChevronLeft, RefreshCw, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
    student: Student;
}

const SmartStudyPlan: React.FC<Props> = ({ student }) => {
    const [topics, setTopics] = useState('');
    const [days, setDays] = useState(3);
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topics) return;
        setLoading(true);
        try {
            const res = await generateStudyPlan(topics, student.learningStyle || 'UNKNOWN', days);
            setPlan(res);
        } catch (e) {
            alert('فشل توليد الخطة.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col animate-fade-in font-tajawal">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-white flex items-center gap-4">
                    <Rocket className="text-orange-500" size={36}/> 
                    مخطط المذاكرة الذكي (AI)
                </h2>
                <p className="text-indigo-300 font-bold uppercase tracking-widest mt-1">جدول مخصص لنمط تعلمك: {student.learningStyle}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col gap-6 h-fit">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-indigo-400 uppercase">ماذا تريد أن تذاكر؟</label>
                        <textarea 
                            className="w-full p-6 bg-black/30 border-2 border-white/5 rounded-3xl outline-none font-bold text-white focus:border-indigo-500 transition-all h-40"
                            placeholder="اكتب أسماء الدروس أو الوحدات..."
                            value={topics}
                            onChange={e => setTopics(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-indigo-400 uppercase mb-3">عدد الأيام المتاحة</label>
                        <div className="flex gap-2">
                            {[1, 3, 5, 7].map(d => (
                                <button 
                                    key={d}
                                    onClick={() => setDays(d)}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${days === d ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    {d} أيام
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !topics}
                        className="w-full py-5 bg-orange-500 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={28}/> : <BrainCircuit size={28}/>}
                        {loading ? 'جاري التخطيط...' : 'توليد خطة المذاكرة'}
                    </button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
                    {plan ? (
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar animate-slide-up">
                            <div className="flex justify-between items-center mb-8 border-b pb-6">
                                <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3"><Calendar/> مسارك التعليمي المخصص</h3>
                                <button onClick={() => setPlan(null)} className="text-gray-300 hover:text-red-500"><RefreshCw size={20}/></button>
                            </div>
                            <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed">
                                <ReactMarkdown>{plan}</ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-indigo-100 opacity-20 p-10 text-center">
                            <BookOpen size={150} className="mb-6"/>
                            <h3 className="text-3xl font-black">جاهز للبدء؟</h3>
                            <p className="text-xl font-bold max-w-xs mt-4">أدخل موضوعات دروسك وسأقوم ببناء خطة محكمة تضمن لك التميز.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartStudyPlan;
