
import React, { useState, useMemo, useEffect } from 'react';
import { Student, EnvironmentRecord, LearningStyle } from '../types';
import { updateStudentLearningStyle, saveEnvironmentRecord, getStudents } from '../services/storageService';
import { diagnoseLearningStyle, analyzeLearningStyleExcel } from '../services/geminiService';
import { getWorkbookStructure, getSheetHeadersAndData, analyzeVarkLocally } from '../services/excelService';
import { 
    BrainCircuit, Wind, Sun, Volume2, Smile, Loader2, Sparkles, CheckCircle, Save, 
    History, TrendingUp, Lightbulb, Bot, FileSpreadsheet, PieChart as PieChartIcon, 
    Upload, Search, Zap, Copy
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

interface Props {
    students: Student[];
    currentUserId?: string;
}

const LearningLab: React.FC<Props> = ({ students: initialStudents, currentUserId }) => {
    const [students, setLocalStudents] = useState<Student[]>(initialStudents);
    const [activeTab, setActiveTab] = useState<'STYLES' | 'ENVIRONMENT' | 'STRATEGY' | 'ASSESSMENT' | 'ANALYTICS'>('STYLES');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [observations, setObservations] = useState('');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagnosis, setDiagnosis] = useState<any>(null);
    const [aiStrategy, setAiStrategy] = useState('');
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [isImportLoading, setIsImportLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<any>(null);

    const [env, setEnv] = useState<Partial<EnvironmentRecord>>({ lighting: 3, noiseLevel: 2, mood: 'FOCUSED' });

    useEffect(() => { setLocalStudents(getStudents()); }, [activeTab]);

    const handleDiagnose = async () => {
        const s = students.find(x => x.id === selectedStudentId);
        if (!s || !observations) return;
        setIsDiagnosing(true);
        try {
            const result = await diagnoseLearningStyle(s.name, observations);
            setDiagnosis(result);
        } catch (e) { alert('فشل تشخيص النمط.'); } finally { setIsDiagnosing(false); }
    };

    const handleGenerateStrategy = async () => {
        setIsGeneratingStrategy(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const summary = styleStats.map(s => `${s.name}: ${s.value}`).join('، ');
            const response = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: `أنت خبير تربوي. اقترح استراتيجية تدريس مبتكرة تشرك الأنماط التالية: (${summary}) في نشاط واحد لموضوع الدرس المذكور. بالعربية Markdown.` 
            });
            setAiStrategy(response.text || "");
        } catch (e) { alert('خطأ في التوليد.'); } finally { setIsGeneratingStrategy(false); }
    };

    const handleFormsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
            // تحليل محلي سريع للكلمات المفتاحية قبل إرسال عينة للـ AI
            const result = analyzeVarkLocally(data);
            
            let matchedCount = 0;
            if (result.studentAssignments) {
                for (const item of result.studentAssignments) {
                    const match = students.find(s => s.name.includes(item.studentName.trim()) || item.studentName.trim().includes(s.name));
                    if (match) { 
                        await updateStudentLearningStyle(match.id, item.style); 
                        matchedCount++; 
                    }
                }
            }
            setBulkResult({ ...result, matchedCount });
            setLocalStudents(getStudents());
            setActiveTab('ANALYTICS');
            alert(`تم تحديث أنماط ${matchedCount} طالب بنجاح.`);
        } catch (error) { alert('خطأ في المعالجة.'); } finally { setIsImportLoading(false); }
    };

    const styleStats = useMemo(() => {
        const stats: Record<string, number> = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0, UNKNOWN: 0 };
        students.forEach(s => { stats[(s.learningStyle || 'UNKNOWN')]++; });
        return Object.entries(stats).filter(([_, v]) => v > 0).map(([n, v]) => ({ 
            name: n==='VISUAL'?'بصري':n==='AUDITORY'?'سمعي':n==='READ_WRITE'?'قرائي':n==='KINESTHETIC'?'حركي':'غير محدد', 
            value: v, key: n 
        }));
    }, [students]);

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <BrainCircuit className="text-indigo-600" size={36}/> مختبر الأنماط والذكاء
                    </h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">تخصيص التعليم بناءً على شخصية المتعلم</p>
                </div>
                <div className="flex bg-white rounded-2xl border p-1 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التشخيص الذكي" active={activeTab === 'STYLES'} onClick={() => setActiveTab('STYLES')} />
                    <TabBtn label="التحليل البياني" active={activeTab === 'ANALYTICS'} onClick={() => setActiveTab('ANALYTICS')} />
                    <TabBtn label="استيراد الاستبيان" active={activeTab === 'ASSESSMENT'} onClick={() => setActiveTab('ASSESSMENT')} />
                    <TabBtn label="استراتيجية AI" active={activeTab === 'STRATEGY'} onClick={() => setActiveTab('STRATEGY')} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'STYLES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col gap-6 overflow-y-auto">
                            <h3 className="font-black text-gray-800 border-b pb-4 flex items-center gap-2"><Bot size={24} className="text-indigo-600"/> مراقبة السلوك والنمط</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">اختر الطالب للملاحظة</label>
                                    <select className="w-full p-4 border rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                        <option value="">-- ابحث عن طالب --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">صف طريقة تعلمه أو تفاعله</label>
                                    <textarea className="w-full p-6 border rounded-[2rem] bg-gray-50 h-40 outline-none text-sm font-bold focus:bg-white transition-all" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="مثال: الطالب يحب الرسم التوضيحي، يفضل النقاش الجماعي، يميل للتعلم العملي بيده..."/>
                                </div>
                                <button onClick={handleDiagnose} disabled={isDiagnosing || !observations} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-indigo-700 active:scale-95 transition-all">
                                    {isDiagnosing ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>} 
                                    {isDiagnosing ? 'جاري التحليل التربوي...' : 'تشخيص النمط بالذكاء الاصطناعي'}
                                </button>
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-[4rem] border shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={200}/></div>
                            {diagnosis ? (
                                <div className="space-y-8 animate-slide-up w-full relative z-10">
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-indigo-600 border-4 border-indigo-100 shadow-inner animate-pulse"><BrainCircuit size={48}/></div>
                                        <h4 className="text-3xl font-black text-indigo-900">النمط المستنتج: {diagnosis.style}</h4>
                                        <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-2">AI-Driven Pedagogical Match</p>
                                    </div>
                                    <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 text-sm text-indigo-900 leading-relaxed font-bold italic">
                                        "{diagnosis.reasoning}"
                                    </div>
                                    <button onClick={() => { updateStudentLearningStyle(selectedStudentId, diagnosis.style); setDiagnosis(null); setObservations(''); alert('تم تحديث نمط الطالب بنجاح!'); }} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all">اعتماد النمط في الملف الشخصي</button>
                                </div>
                            ) : (
                                <div className="text-center text-gray-300">
                                    <BrainCircuit size={150} strokeWidth={1} className="mb-6 opacity-10 mx-auto"/>
                                    <p className="text-2xl font-black">جاهز لاستقبال الملاحظات</p>
                                    <p className="text-sm font-bold mt-2">أدخل وصفاً لطريقة تعلم الطالب وسأقوم بتشخيص النمط التعليمي الأمثل له.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ANALYTICS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col">
                            <h3 className="font-black text-gray-800 mb-10 flex items-center gap-3"><PieChartIcon className="text-indigo-600"/> التوزيع الهيكلي للفصل</h3>
                            <div className="flex-1 h-80">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={styleStats} cx="50%" cy="50%" innerRadius={80} outerRadius={130} paddingAngle={5} dataKey="value">
                                            {styleStats.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="font-black text-gray-800 text-xl">قاعدة بيانات الأنماط</h3>
                                <div className="relative w-48">
                                    <Search size={14} className="absolute right-3 top-2.5 text-gray-300"/>
                                    <input className="w-full pr-10 pl-3 py-2 border rounded-xl text-xs font-bold bg-gray-50" placeholder="بحث سريع..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                    <div key={s.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-[1.5rem] border hover:border-indigo-200 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">{s.name.charAt(0)}</div>
                                            <span className="font-black text-slate-700 text-sm">{s.name}</span>
                                        </div>
                                        <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-sm ${s.learningStyle && s.learningStyle !== 'UNKNOWN' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                            {s.learningStyle || 'غير محدد'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ASSESSMENT' && (
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-8 items-center justify-center text-center">
                        <div className="bg-indigo-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-[2000ms]"><Sparkles size={300}/></div>
                            <div className="relative z-10">
                                <h3 className="text-4xl font-black mb-4">استيراد بيانات VARK المجمعة</h3>
                                <p className="text-indigo-100 text-lg mb-10 leading-relaxed max-w-2xl mx-auto font-medium">ارفع ملف Excel الذي يحتوي على نتائج استبيان أنماط التعلم الخاص بفصلك، وسأقوم بربط كل نمط بصاحبه تلقائياً في السحابة.</p>
                                <label className="inline-flex items-center gap-4 bg-white text-indigo-900 px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all cursor-pointer">
                                    {isImportLoading ? <Loader2 className="animate-spin" size={28}/> : <Upload size={28}/>}
                                    {isImportLoading ? 'جاري التحليل الذكي...' : 'رفع ملف النتائج الآن'}
                                    <input type="file" className="hidden" accept=".xlsx" onChange={handleFormsImport} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-6 py-3 bg-white border rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm">
                                <CheckCircle size={14} className="text-emerald-500"/> يدعم تنسيقات MS Forms
                            </div>
                            <div className="px-6 py-3 bg-white border rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm">
                                <CheckCircle size={14} className="text-emerald-500"/> مطابقة الأسماء السحابية
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'STRATEGY' && (
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-8 overflow-hidden animate-fade-in">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-10 rounded-[3.5rem] shadow-xl relative overflow-hidden flex justify-between items-center shrink-0">
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black mb-2 flex items-center gap-3"><Lightbulb className="text-yellow-300"/> مولد الاستراتيجيات المتمايزة</h3>
                                <p className="text-indigo-100 font-bold">بناءً على التوزيع الحالي للأنماط: {styleStats.length} أنماط مكتشفة</p>
                                <button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy} className="mt-8 bg-white text-indigo-700 px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                                    {isGeneratingStrategy ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>} توليد الاستراتيجية المثالية
                                </button>
                            </div>
                            <Bot size={180} className="absolute -left-10 opacity-10 rotate-12"/>
                        </div>
                        <div className="flex-1 bg-white rounded-[3.5rem] border shadow-sm overflow-y-auto p-12 custom-scrollbar">
                            {aiStrategy ? (
                                <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed text-lg">
                                    <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-40">
                                    <Lightbulb size={120} className="mb-6"/>
                                    <p className="text-2xl font-black">أدخل موضوع الدرس واضغط لتوليد الخطة</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-8 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-slate-50'}`}>{label}</button>
);

export default LearningLab;
