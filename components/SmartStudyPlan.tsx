
import React, { useState } from 'react';
import { Student } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import { Sparkles, Loader2, Calendar, Target, BrainCircuit, Rocket, RefreshCw, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
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
            alert('فشل توليد الخطة. حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col animate-fade-in font-tajawal pb-24 lg:pb-10" dir="rtl">
            <div className="mb-10 text-right">
                <h2 className="text-4xl font-black text-white flex items-center gap-4 justify-end">
                    مخطط المذاكرة الذكي (AI)
                    <Rocket className="text-orange-500" size={40}/> 
                </h2>
                <p className="text-indigo-300 font-bold uppercase tracking-widest mt-2">جدول مخصص لنمط تعلمك الفريد: <span className="text-white underline">{student.learningStyle || 'بانتظار التشخيص'}</span></p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 overflow-hidden">
                <div className="bg-slate-900/50 p-8 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col gap-8 h-fit">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400 mb-2">
                            <BookOpen size={20}/>
                            <label className="text-[11px] font-black uppercase tracking-widest">محتوى المراجعة</label>
                        </div>
                        <textarea 
                            className="w-full p-6 bg-black/40 border-2 border-white/5 rounded-[2.5rem] outline-none font-bold text-white focus:border-indigo-500 transition-all h-48 text-sm placeholder:text-slate-600"
                            placeholder="اكتب عناوين الدروس التي تريد مذاكرتها (مثال: الخلية، الكسور، قوانين نيوتن)..."
                            value={topics}
                            onChange={e => setTopics(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400 mb-2">
                            <Clock size={20}/>
                            <label className="text-[11px] font-black uppercase tracking-widest">المدة الزمنية</label>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 3, 5, 7].map(d => (
                                <button 
                                    key={d}
                                    onClick={() => setDays(d)}
                                    className={`py-3 rounded-2xl font-black text-xs transition-all ${days === d ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    {d} {d === 1 ? 'يوم' : 'أيام'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading || !topics}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={28}/> : <BrainCircuit size={28}/>}
                        {loading ? 'جاري التخطيط...' : 'توليد خطة المذاكرة'}
                    </button>
                    
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
                        <Sparkles className="text-yellow-400 shrink-0" size={16}/>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">سأقوم بتوزيع الموضوعات واقتراح طرق للمذاكرة تناسب نمطك المفضل لضمان أعلى مستويات الفهم.</p>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-[4rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
                    {plan ? (
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar animate-slide-up text-right">
                            <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-8">
                                <h3 className="text-2xl font-black text-white flex items-center gap-4"><Calendar className="text-indigo-400"/> مسارك التعليمي المخصص</h3>
                                <button onClick={() => setPlan(null)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-2xl transition-colors"><RefreshCw size={20}/></button>
                            </div>
                            <div className="prose prose-invert max-w-none text-indigo-100 leading-relaxed font-medium">
                                <ReactMarkdown>{plan}</ReactMarkdown>
                            </div>
                            <div className="mt-12 flex justify-end">
                                <button onClick={() => window.print()} className="px-10 py-3 bg-white text-slate-900 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"><CheckCircle2 size={18}/> حفظ الخطة كـ PDF</button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-indigo-200/20 p-20 text-center animate-pulse">
                            <Target size={200} className="mb-8"/>
                            <h3 className="text-4xl font-black mb-4">بانتظار المدخلات</h3>
                            <p className="text-xl font-bold max-w-md mx-auto">أدخل موضوعات دروسك وسأقوم ببناء خطة محكمة تضمن لك التميز الأكاديمي.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartStudyPlan;
