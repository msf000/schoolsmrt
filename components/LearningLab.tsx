
import React, { useState, useMemo, useEffect } from 'react';
import { Student, EnvironmentRecord, LearningStyle } from '../types';
import { updateStudentLearningStyle, saveEnvironmentRecord, getStudents } from '../services/storageService';
import { diagnoseLearningStyle, analyzeLearningStyleExcel } from '../services/geminiService';
import { getWorkbookStructure, getSheetHeadersAndData, analyzeVarkLocally } from '../services/excelService';
import { 
    BrainCircuit, Wind, Sun, Volume2, Smile, Loader2, Sparkles, CheckCircle, Save, 
    History, TrendingUp, Lightbulb, Bot, FileSpreadsheet, PieChart as PieChartIcon, 
    Upload, Search, Zap, Copy, Target, ShieldCheck
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
    const [activeTab, setActiveTab] = useState<'STYLES' | 'ANALYTICS' | 'ASSESSMENT' | 'STRATEGY'>('STYLES');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [observations, setObservations] = useState('');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagnosis, setDiagnosis] = useState<any>(null);
    const [aiStrategy, setAiStrategy] = useState('');
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [isImportLoading, setIsImportLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<any>(null);

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

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">مختبر أنماط التعلم (VARK)</h2>
                    <p className="text-sm text-slate-500">تحليل شخصيات الطلاب لتخصيص طرق التدريس.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التشخيص" active={activeTab === 'STYLES'} onClick={() => setActiveTab('STYLES')} />
                    <TabBtn label="التحليل العام" active={activeTab === 'ANALYTICS'} onClick={() => setActiveTab('ANALYTICS')} />
                    <TabBtn label="استيراد البيانات" active={activeTab === 'ASSESSMENT'} onClick={() => setActiveTab('ASSESSMENT')} />
                    <TabBtn label="خطة AI" active={activeTab === 'STRATEGY'} onClick={() => setActiveTab('STRATEGY')} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'STYLES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                            <h3 className="font-bold text-slate-800 border-b pb-4 flex items-center gap-2"><Target size={18} className="text-blue-600"/> تشخيص نمط فردي</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">الطالب المستهدف</label>
                                    <select className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm font-bold outline-none" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                        <option value="">-- اختر طالباً --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">ملاحظات المعلم حول تفاعل الطالب</label>
                                    <textarea className="w-full p-3 border rounded-lg bg-slate-50 h-32 outline-none text-sm font-medium focus:bg-white transition-all" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="مثلاً: يفضل الرسوم التوضيحية، يحب المشاركة الصوتية، يتعلم بالتجربة العملية..."/>
                                </div>
                                <button onClick={handleDiagnose} disabled={isDiagnosing || !observations} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                                    {isDiagnosing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} تشخيص النمط (AI)
                                </button>
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                            {diagnosis ? (
                                <div className="space-y-6 animate-slide-up w-full max-w-sm">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 border border-blue-100"><BrainCircuit size={40}/></div>
                                        <h4 className="text-2xl font-bold text-slate-800">النمط: {diagnosis.style}</h4>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                                        "{diagnosis.reasoning}"
                                    </div>
                                    <button onClick={() => { updateStudentLearningStyle(selectedStudentId, diagnosis.style); setDiagnosis(null); setSelectedStudentId(''); setObservations(''); alert('تم الاعتماد بنجاح!'); }} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md">اعتماد النمط في الملف</button>
                                </div>
                            ) : (
                                <div className="text-center text-slate-300 py-20 opacity-50">
                                    <BrainCircuit size={100} strokeWidth={1} className="mx-auto mb-4"/>
                                    <p className="font-bold">بانتظار المدخلات لبدء التشخيص</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ANALYTICS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full overflow-hidden">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChartIcon className="text-blue-600" size={18}/> توزيع أنماط الفصل</h3>
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={styleStats} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {styleStats.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h3 className="font-bold text-slate-800">قائمة أنماط الطلاب</h3>
                                <div className="relative">
                                    <Search size={14} className="absolute right-3 top-2 text-slate-300"/>
                                    <input className="pr-8 pl-3 py-1 border rounded-md text-xs font-medium bg-slate-50 outline-none w-48" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                    <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded-lg border-slate-100 hover:bg-white transition-colors">
                                        <span className="font-bold text-slate-700 text-sm">{s.name}</span>
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${s.learningStyle && s.learningStyle !== 'UNKNOWN' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-white text-slate-300 border-slate-100'}`}>
                                            {s.learningStyle === 'VISUAL' ? 'بصري' : s.learningStyle === 'AUDITORY' ? 'سمعي' : s.learningStyle === 'READ_WRITE' ? 'قرائي' : s.learningStyle === 'KINESTHETIC' ? 'حركي' : 'غير محدد'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ASSESSMENT' && (
                    <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center text-center gap-8 animate-fade-in">
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xl w-full">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 border border-blue-100"><Upload size={40}/></div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">استيراد بيانات VARK الجماعية</h3>
                            <p className="text-slate-500 text-sm mb-10 max-w-sm mx-auto">ارفع ملف Excel لنتائج استبيان الطلاب وسيقوم النظام بتحديث أنماطهم سحابياً بشكل آلي.</p>
                            <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-10 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 cursor-pointer transition-all">
                                {isImportLoading ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18}/>}
                                {isImportLoading ? 'جاري التحليل الذكي...' : 'رفع ملف النتائج'}
                                <input type="file" className="hidden" accept=".xlsx" onChange={handleFormsImport} />
                            </label>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-4 py-2 rounded-lg border border-slate-200"><ShieldCheck size={14}/> مزامنة سحابية</div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-4 py-2 rounded-lg border border-slate-200"><CheckCircle size={14}/> توافق MS Forms</div>
                        </div>
                    </div>
                )}

                {activeTab === 'STRATEGY' && (
                    <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 overflow-hidden animate-fade-in">
                        <div className="bg-blue-700 p-8 rounded-xl text-white shadow-lg relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none rotate-12"><Bot size={120}/></div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Sparkles size={24}/> استراتيجية التدريس الذكية</h3>
                                <p className="text-blue-100 text-sm">يقوم Gemini باقتراح خطة تربوية تناسب توزيع الأنماط في فصلك.</p>
                                <button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy} className="mt-6 bg-white text-blue-700 px-8 py-2.5 rounded-lg font-bold text-sm shadow-md hover:bg-blue-50 transition-all flex items-center gap-2">
                                    {isGeneratingStrategy ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} توليد الخطة المقترحة
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-8 custom-scrollbar">
                            {aiStrategy ? (
                                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm">
                                    <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-50 py-20">
                                    <Lightbulb size={100} className="mb-4"/>
                                    <p className="font-bold">اضغط للتوليد لبدء صياغة الاستراتيجية</p>
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
    <button onClick={onClick} className={`px-5 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>
);

export default LearningLab;
