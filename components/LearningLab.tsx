
import React, { useState, useMemo } from 'react';
import { Student, EnvironmentRecord, LearningStyle } from '../types';
import { updateStudentLearningStyle, saveEnvironmentRecord, getEnvironmentRecords } from '../services/storageService';
import { diagnoseLearningStyle, chatWithData } from '../services/geminiService';
import { BrainCircuit, Wind, Sun, Volume2, Smile, Loader2, Sparkles, CheckCircle, Save, History, TrendingUp, Lightbulb, Bot, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const LearningLab: React.FC<Props> = ({ students, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<'STYLES' | 'ENVIRONMENT' | 'STRATEGY'>('STYLES');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [observations, setObservations] = useState('');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagnosis, setDiagnosis] = useState<any>(null);
    const [aiStrategy, setAiStrategy] = useState('');
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

    // بيئة الصف
    const [env, setEnv] = useState<Partial<EnvironmentRecord>>({
        lighting: 3, noiseLevel: 2, mood: 'FOCUSED'
    });

    const handleDiagnose = async () => {
        const s = students.find(x => x.id === selectedStudentId);
        if (!s || !observations) return;
        setIsDiagnosing(true);
        try {
            const result = await diagnoseLearningStyle(s.name, observations);
            setDiagnosis(result);
        } catch (e) {
            alert('فشل تشخيص النمط.');
        } finally {
            setIsDiagnosing(false);
        }
    };

    const handleGenerateStrategy = async () => {
        setIsGeneratingStrategy(true);
        const stylesCount = students.reduce((acc: any, s) => {
            const style = s.learningStyle || 'UNKNOWN';
            acc[style] = (acc[style] || 0) + 1;
            return acc;
        }, {});

        const prompt = `بناءً على توزيع أنماط التعلم في فصلي: ${JSON.stringify(stylesCount)}. اقترح استراتيجية تدريسية مبتكرة ومفصلة لدرس اليوم تراعي كافة الأنماط وترفع التفاعل. استخدم لغة تربوية مشجعة.`;
        
        try {
            const res = await chatWithData(prompt, { students: [], attendance: [], performance: [] });
            setAiStrategy(res);
        } catch (e) {
            setAiStrategy('عذراً، فشل توليد الاستراتيجية.');
        } finally {
            setIsGeneratingStrategy(false);
        }
    };

    const saveStyle = () => {
        if (!selectedStudentId || !diagnosis) return;
        updateStudentLearningStyle(selectedStudentId, diagnosis.style as LearningStyle);
        alert('تم تحديث نمط تعلم الطالب بنجاح!');
        setDiagnosis(null);
        setObservations('');
    };

    const handleSaveEnv = () => {
        const record: EnvironmentRecord = {
            id: Date.now().toString(),
            teacherId: currentUserId || '',
            classId: 'عام',
            date: new Date().toISOString(),
            lighting: env.lighting!,
            noiseLevel: env.noiseLevel!,
            mood: env.mood!,
            notes: ''
        };
        saveEnvironmentRecord(record);
        alert('تم رصد حالة البيئة الصفية.');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BrainCircuit className="text-indigo-600"/> مختبر أنماط وبيئة التعلم
                    </h2>
                    <p className="text-sm text-gray-500">فهم شخصيات الطلاب وتحسين ظروف الحصة.</p>
                </div>
                <div className="flex bg-white rounded-xl border p-1 shadow-sm">
                    <button onClick={() => setActiveTab('STYLES')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'STYLES' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>أنماط الطلاب</button>
                    <button onClick={() => setActiveTab('ENVIRONMENT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ENVIRONMENT' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>بيئة الصف</button>
                    <button onClick={() => setActiveTab('STRATEGY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'STRATEGY' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>استراتيجية AI</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'STYLES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-5 overflow-y-auto">
                            <h3 className="font-bold text-gray-800 border-b pb-3">تشخيص نمط التعلم (AI)</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">الطالب</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                    <option value="">-- اختر طالباً --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.learningStyle || 'غير محدد'})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">ملاحظاتك على الطالب</label>
                                <textarea className="w-full p-4 border rounded-xl bg-gray-50 h-32 outline-none focus:bg-white" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="مثال: يفضل الرسم أثناء الشرح، يتشتت بالصوت، يحب العمل اليدوي..."/>
                            </div>
                            <button onClick={handleDiagnose} disabled={isDiagnosing || !observations} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                {isDiagnosing ? <Loader2 className="animate-spin"/> : <Sparkles/>} {isDiagnosing ? 'جاري التشخيص...' : 'تحليل النمط'}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto custom-scrollbar">
                            {diagnosis ? (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600"><BrainCircuit size={40}/></div>
                                        <h4 className="text-2xl font-black text-indigo-600">النمط: {diagnosis.style === 'VISUAL' ? 'بصري' : diagnosis.style === 'AUDITORY' ? 'سمعي' : diagnosis.style === 'KINESTHETIC' ? 'حركي' : 'قرائي'}</h4>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <h5 className="font-bold text-gray-700 mb-2">لماذا هذا النمط؟</h5>
                                        <p className="text-sm text-gray-600 leading-relaxed">{diagnosis.reasoning}</p>
                                    </div>
                                    <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                                        <h5 className="font-bold text-green-800 mb-2 flex items-center gap-2"><CheckCircle size={16}/> نصائح للتعامل معه:</h5>
                                        <p className="text-sm text-green-700 leading-relaxed">{diagnosis.tips}</p>
                                    </div>
                                    <button onClick={saveStyle} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl">حفظ النمط في ملف الطالب</button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-30"><BrainCircuit size={80} className="mb-4"/><p className="text-xl font-bold text-center">أدخل الملاحظات لبدء تشخيص النمط بالذكاء الاصطناعي</p></div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ENVIRONMENT' && (
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm max-w-4xl mx-auto w-full animate-fade-in overflow-y-auto">
                        <h3 className="text-xl font-black text-gray-800 mb-8 border-b pb-4 flex items-center gap-3"><History className="text-indigo-600"/> رصد نبض الفصل اليوم</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Sun className="text-orange-500"/> مستوى الإضاءة</label>
                                    <input type="range" min="1" max="5" value={env.lighting} onChange={e=>setEnv({...env, lighting: Number(e.target.value)})} className="w-full accent-orange-500"/>
                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1"><span>خافت</span><span>ممتاز</span></div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Volume2 className="text-blue-500"/> مستوى الضوضاء المحيطة</label>
                                    <input type="range" min="1" max="5" value={env.noiseLevel} onChange={e=>setEnv({...env, noiseLevel: Number(e.target.value)})} className="w-full accent-blue-500"/>
                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1"><span>هدوء تام</span><span>ضجيج عالٍ</span></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Smile className="text-green-500"/> الحالة النفسية العامة للفصل</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['HAPPY','TIRED','FOCUSED','BORED'].map(m => (
                                            <button key={m} onClick={()=>setEnv({...env, mood: m as any})} className={`py-3 rounded-xl border text-xs font-bold transition-all ${env.mood===m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}>
                                                {m === 'HAPPY' ? 'متحمس 😊' : m === 'TIRED' ? 'متعب 😴' : m === 'FOCUSED' ? 'مركز 🧐' : 'شاع بالملل 😑'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveEnv} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg shadow-2xl flex items-center justify-center gap-3 hover:bg-black transition-all">
                            <Save/> حفظ حالة البيئة التعليمية
                        </button>
                    </div>
                )}

                {activeTab === 'STRATEGY' && (
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6 overflow-hidden animate-fade-in">
                        <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden shrink-0">
                            <Bot className="absolute -bottom-4 -right-4 opacity-10" size={120}/>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2 flex items-center gap-2"><Lightbulb className="text-yellow-300"/> مولد استراتيجيات التدريس الذكي</h3>
                                <p className="text-indigo-100 text-sm max-w-lg">بناءً على أنماط طلابك الحالية، سأقوم بابتكار خطة لشرح درسك القادم تضمن وصول المعلومة للجميع.</p>
                                <button 
                                    onClick={handleGenerateStrategy} 
                                    disabled={isGeneratingStrategy}
                                    className="mt-6 bg-white text-indigo-700 px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {isGeneratingStrategy ? <Loader2 className="animate-spin"/> : <Sparkles/>} توليد الاستراتيجية المثالية
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm overflow-y-auto custom-scrollbar p-10">
                            {aiStrategy ? (
                                <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed">
                                    <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40">
                                    <Bot size={80} className="mb-4"/>
                                    <p className="text-xl font-bold">اضغط على الزر أعلاه لتحليل الفصل والحصول على اقتراحات</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearningLab;
