import React, { useState, useMemo, useEffect } from 'react';
import { Student, EnvironmentRecord, LearningStyle } from '../types';
import { updateStudentLearningStyle, saveEnvironmentRecord, getStudents } from '../services/storageService';
import { diagnoseLearningStyle, chatWithData, analyzeLearningStyleExcel } from '../services/geminiService';
import { getWorkbookStructure, getSheetHeadersAndData, analyzeVarkLocally } from '../services/excelService';
import { 
    BrainCircuit, Wind, Sun, Volume2, Smile, Loader2, Sparkles, CheckCircle, Save, 
    History, TrendingUp, Lightbulb, Bot, ChevronRight, FileSpreadsheet, ClipboardList, 
    PieChart as PieChartIcon, Upload, X, HelpCircle, BarChart, Info, UserCheck, Zap, Share2, List, Filter, Copy
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

    const handleSaveEnv = () => {
        if (!currentUserId) return;
        saveEnvironmentRecord({ id: Date.now().toString(), teacherId: currentUserId, classId: students[0]?.className || 'General', date: new Date().toISOString(), lighting: env.lighting || 3, noiseLevel: env.noiseLevel || 2, mood: env.mood || 'FOCUSED' });
        alert('تم حفظ حالة البيئة التعليمية بنجاح');
    };

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
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `أنت خبير تربوي. اقترح استراتيجية تدريس مبتكرة تشرك الأنماط التالية: (${summary}) في نشاط واحد. بالعربية Markdown.` });
            setAiStrategy(response.text || "");
        } catch (e) { alert('خطأ في التوليد.'); } finally { setIsGeneratingStrategy(false); }
    };

    const handleFormsImport = async (e: React.ChangeEvent<HTMLInputElement>, method: 'AI' | 'LOCAL') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            const result = method === 'AI' ? await analyzeLearningStyleExcel(JSON.stringify(data.slice(0, 50))) : analyzeVarkLocally(data);
            let matchedCount = 0;
            if (result.studentAssignments) {
                result.studentAssignments.forEach((item: any) => {
                    const match = students.find(s => s.name.includes(item.studentName.trim()) || item.studentName.trim().includes(s.name));
                    if (match) { updateStudentLearningStyle(match.id, item.style); matchedCount++; }
                });
            }
            setBulkResult({ ...result, matchedCount });
            setLocalStudents(getStudents());
            setActiveTab('ANALYTICS');
            alert(`تم تحديث ${matchedCount} طالب بنجاح.`);
        } catch (error) { alert('خطأ في المعالجة.'); } finally { setIsImportLoading(false); }
    };

    const handleCopyInvite = () => {
        const text = `عزيزي الطالب، يرجى الدخول إلى بوابتك في "نظام المتابع الذكي" وأداء اختبار أنماط التعلم (VARK) لمساعدتي في اختيار الطريقة الأنسب لشرح الدروس لك.\n\nخطوات الدخول:\n1. سجل دخولك برقم الهوية.\n2. اضغط على "ابدأ الاختبار" في الصفحة الرئيسية.`;
        navigator.clipboard.writeText(text);
        alert('تم نسخ نص الدعوة! يمكنك الآن لصقها في مجموعة الواتساب الخاصة بالطلاب/أولياء الأمور.');
    };

    const styleStats = useMemo(() => {
        const stats: Record<string, number> = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0, UNKNOWN: 0 };
        students.forEach(s => { stats[(s.learningStyle || 'UNKNOWN')]++; });
        return Object.entries(stats).filter(([_, v]) => v > 0).map(([n, v]) => ({ name: n==='VISUAL'?'بصري':n==='AUDITORY'?'سمعي':n==='READ_WRITE'?'قرائي':n==='KINESTHETIC'?'حركي':'غير محدد', value: v, key: n }));
    }, [students]);

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BrainCircuit className="text-indigo-600"/> مختبر الذكاء والأنماط</h2>
                </div>
                <div className="flex bg-white rounded-2xl border p-1 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التشخيص الذكي" active={activeTab === 'STYLES'} onClick={() => setActiveTab('STYLES')} />
                    <TabBtn label="إحصائيات الأنماط" active={activeTab === 'ANALYTICS'} onClick={() => setActiveTab('ANALYTICS')} />
                    <TabBtn label="استيراد Forms" active={activeTab === 'ASSESSMENT'} onClick={() => setActiveTab('ASSESSMENT')} />
                    <TabBtn label="بيئة الصف" active={activeTab === 'ENVIRONMENT'} onClick={() => setActiveTab('ENVIRONMENT')} />
                    <TabBtn label="الاستراتيجية" active={activeTab === 'STRATEGY'} onClick={() => setActiveTab('STRATEGY')} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'STYLES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-5 overflow-y-auto">
                            <h3 className="font-bold text-gray-800 border-b pb-3 flex items-center gap-2"><Bot size={20} className="text-indigo-600"/> تشخيص النمط (AI)</h3>
                            <div className="space-y-4">
                                <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                    <option value="">-- اختر طالباً --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <textarea className="w-full p-4 border rounded-xl bg-gray-50 h-32 outline-none text-sm" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="مثال: يفضل الرسم أثناء الشرح، يحب العمل اليدوي..."/>
                                <button onClick={handleDiagnose} disabled={isDiagnosing || !observations} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-all">
                                    {isDiagnosing ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} {isDiagnosing ? 'جاري التحليل...' : 'تحليل ذكي الآن'}
                                </button>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-center items-center">
                            {diagnosis ? (
                                <div className="space-y-6 animate-slide-up w-full">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 border-2 border-indigo-100 shadow-inner"><BrainCircuit size={40}/></div>
                                        <h4 className="text-2xl font-black text-indigo-600">النمط: {diagnosis.style}</h4>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border text-sm text-gray-600 leading-relaxed">{diagnosis.reasoning}</div>
                                    <button onClick={() => { updateStudentLearningStyle(selectedStudentId, diagnosis.style); setDiagnosis(null); alert('تم الحفظ'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">اعتماد وحفظ</button>
                                </div>
                            ) : (
                                <div className="text-center text-gray-300">
                                    <BrainCircuit size={80} className="mb-4 opacity-10 mx-auto"/>
                                    <p className="font-bold">اختر طالباً وأدخل ملاحظاتك لبدء التحليل</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ANALYTICS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col">
                            <h3 className="font-black text-gray-800 mb-8 flex items-center gap-2"><PieChartIcon className="text-indigo-600"/> التوزيع العام للأنماط</h3>
                            <div className="flex-1 h-80">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={styleStats} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                                            {styleStats.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-gray-800">قائمة أنماط الطلاب</h3>
                                <input className="pr-4 pl-3 py-1.5 border rounded-lg text-xs" placeholder="بحث..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                    <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border hover:border-indigo-200 transition-colors">
                                        <span className="font-bold text-gray-700 text-sm">{s.name}</span>
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${s.learningStyle ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>{s.learningStyle || 'غير محدد'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ASSESSMENT' && (
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6">
                        <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden shrink-0">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2 flex items-center gap-3">استيراد نتائج الاختبار (Excel)</h3>
                                <p className="text-indigo-100 text-sm mb-8">ارفع ملف استجابات ميكروسوفت فورمز وسنقوم بتحليل الأنماط تلقائياً.</p>
                                <div className="flex flex-wrap gap-4">
                                    <label className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2">
                                        {isImportLoading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                                        {isImportLoading ? 'جاري التحليل...' : 'رفع ملف Excel'}
                                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFormsImport(e, 'LOCAL')} />
                                    </label>
                                    <button onClick={handleCopyInvite} className="bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black border border-indigo-500 hover:bg-indigo-800 transition-all flex items-center gap-2 shadow-lg">
                                        <Copy size={20}/> نسخ دعوة الاختبار للطلاب
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-[3rem] border-2 border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center text-gray-400">
                             <FileSpreadsheet size={64} className="mb-4 opacity-20"/>
                             <p className="max-w-xs font-bold leading-relaxed">بانتظار رفع ملف الاستجابات للبدء في تحليل توزيع الأنماط في فصلك.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'ENVIRONMENT' && (
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm max-w-4xl mx-auto w-full overflow-y-auto">
                        <h3 className="text-xl font-black text-gray-800 mb-8 border-b pb-4 flex items-center gap-3"><History className="text-indigo-600"/> نبض الفصل اليوم</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Sun className="text-orange-500"/> مستوى الإضاءة</label>
                                    <input type="range" min="1" max="5" value={env.lighting} onChange={e=>setEnv({...env, lighting: Number(e.target.value)})} className="w-full accent-orange-500"/>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Volume2 className="text-blue-500"/> مستوى الضوضاء</label>
                                    <input type="range" min="1" max="5" value={env.noiseLevel} onChange={e=>setEnv({...env, noiseLevel: Number(e.target.value)})} className="w-full accent-blue-500"/>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <label className="block text-sm font-bold text-gray-700 mb-3">مزاج الفصل</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['HAPPY','TIRED','FOCUSED','BORED'].map(m => (
                                        <button key={m} onClick={()=>setEnv({...env, mood: m as any})} className={`py-3 rounded-xl border text-xs font-bold transition-all ${env.mood===m ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-500'}`}>{m}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveEnv} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black shadow-2xl hover:bg-black transition-all flex justify-center items-center gap-2"><Save/> حفظ الحالة</button>
                    </div>
                )}

                {activeTab === 'STRATEGY' && (
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6 overflow-hidden">
                        <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl relative shrink-0">
                            <h3 className="text-2xl font-black mb-2 flex items-center gap-2"><Lightbulb className="text-yellow-300"/> مولد الاستراتيجيات الذكي</h3>
                            <p className="text-indigo-100 text-sm">أقوم بابتكار خطة لشرح درسك بناءً على تنوع أنماط الطلاب الحالية.</p>
                            <button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy} className="mt-6 bg-white text-indigo-700 px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                                {isGeneratingStrategy ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} توليد الخطة المثالية
                            </button>
                        </div>
                        <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm overflow-y-auto p-10 custom-scrollbar">
                            {aiStrategy ? <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed"><ReactMarkdown>{aiStrategy}</ReactMarkdown></div> : <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40"><Bot size={80} className="mb-4"/><p className="text-xl font-black">اضغط للتوليد...</p></div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
);

export default LearningLab;