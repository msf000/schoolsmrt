import React, { useState, useMemo, useEffect } from 'react';
import { Student, EnvironmentRecord, LearningStyle } from '../types';
import { updateStudentLearningStyle, saveEnvironmentRecord, getStudents } from '../services/storageService';
import { diagnoseLearningStyle, chatWithData, analyzeLearningStyleExcel } from '../services/geminiService';
import { getWorkbookStructure, getSheetHeadersAndData, analyzeVarkLocally } from '../services/excelService';
import { 
    BrainCircuit, Wind, Sun, Volume2, Smile, Loader2, Sparkles, CheckCircle, Save, 
    History, TrendingUp, Lightbulb, Bot, ChevronRight, FileSpreadsheet, ClipboardList, 
    PieChart as PieChartIcon, Upload, X, HelpCircle, BarChart, Info, UserCheck, Zap, Share2, List, Filter
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
// Add missing import
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

    // Bulk Import State
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<any>(null);

    // بيئة الصف
    const [env, setEnv] = useState<Partial<EnvironmentRecord>>({
        lighting: 3, noiseLevel: 2, mood: 'FOCUSED'
    });

    const handleSaveEnv = () => {
        if (!currentUserId) return;
        const record: EnvironmentRecord = {
            id: Date.now().toString(),
            teacherId: currentUserId,
            classId: students[0]?.className || 'General',
            date: new Date().toISOString(),
            lighting: env.lighting || 3,
            noiseLevel: env.noiseLevel || 2,
            mood: env.mood || 'FOCUSED',
            notes: ''
        };
        saveEnvironmentRecord(record);
        alert('تم حفظ حالة البيئة التعليمية بنجاح');
    };

    useEffect(() => {
        setLocalStudents(getStudents());
    }, [activeTab]);

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

    // Add missing function to fix reference error
    const handleGenerateStrategy = async () => {
        setIsGeneratingStrategy(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const stylesSummary = styleStats.map(s => `${s.name}: ${s.value}`).join('، ');
            const prompt = `أنت خبير تربوي. بناءً على توزيع أنماط التعلم التالي للفصل: (${stylesSummary})، 
            اقترح استراتيجية تدريس مبتكرة تشرك جميع الأنماط (بصري، سمعي، حركي، قرائي) في نشاط واحد متكامل. 
            استخدم اللغة العربية وبتنسيق Markdown.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            
            setAiStrategy(response.text || "");
        } catch (e) {
            console.error("Strategy Gen Error:", e);
            alert('حدث خطأ أثناء توليد الاستراتيجية.');
        } finally {
            setIsGeneratingStrategy(false);
        }
    };

    const handleFormsImport = async (e: React.ChangeEvent<HTMLInputElement>, method: 'AI' | 'LOCAL') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
            let result;
            if (method === 'AI') {
                result = await analyzeLearningStyleExcel(JSON.stringify(data.slice(0, 50)));
            } else {
                result = analyzeVarkLocally(data);
            }
            
            let matchedCount = 0;
            if (result.studentAssignments) {
                result.studentAssignments.forEach((item: any) => {
                    const cleanName = item.studentName.trim();
                    const match = students.find(s => 
                        s.name.includes(cleanName) || 
                        cleanName.includes(s.name)
                    );
                    if (match) {
                        updateStudentLearningStyle(match.id, item.style);
                        matchedCount++;
                    }
                });
            }
            
            setBulkResult({ ...result, matchedCount, method });
            setLocalStudents(getStudents());
            setActiveTab('ANALYTICS');
            alert(`اكتمل التحليل: تم تحديث ${matchedCount} طالب بنجاح.`);
        } catch (error) {
            alert('حدث خطأ أثناء معالجة الملف.');
        } finally {
            setIsImportLoading(false);
        }
    };

    const styleStats = useMemo(() => {
        const stats: Record<string, number> = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0, UNKNOWN: 0 };
        students.forEach(s => { stats[(s.learningStyle || 'UNKNOWN')]++; });
        return Object.entries(stats)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ 
                name: name === 'VISUAL' ? 'بصري' : name === 'AUDITORY' ? 'سمعي' : name === 'READ_WRITE' ? 'قرائي' : name === 'KINESTHETIC' ? 'حركي' : 'غير محدد', 
                value,
                key: name
            }));
    }, [students]);

    const filteredList = useMemo(() => {
        return students.filter(s => s.name.includes(searchTerm)).sort((a,b) => a.name.localeCompare(b.name));
    }, [students, searchTerm]);

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BrainCircuit className="text-indigo-600"/> مختبر الذكاء والأنماط
                    </h2>
                    <p className="text-sm text-gray-500">تحليل شخصيات الطلاب وتهيئة بيئة التعلم المثالية.</p>
                </div>
                <div className="flex bg-white rounded-2xl border p-1 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التشخيص الذكي" active={activeTab === 'STYLES'} onClick={() => setActiveTab('STYLES')} />
                    <TabBtn label="إحصائيات الأنماط" active={activeTab === 'ANALYTICS'} onClick={() => setActiveTab('ANALYTICS')} />
                    <TabBtn label="استيراد Forms" active={activeTab === 'ASSESSMENT'} onClick={() => setActiveTab('ASSESSMENT')} />
                    <TabBtn label="بيئة الصف" active={activeTab === 'ENVIRONMENT'} onClick={() => setActiveTab('ENVIRONMENT')} />
                    <TabBtn label="الاستراتيجية" active={activeTab === 'STRATEGY'} onClick={() => setActiveTab('STRATEGY')} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'STYLES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-5 overflow-y-auto">
                            <h3 className="font-bold text-gray-800 border-b pb-3 flex items-center gap-2"><Bot size={20} className="text-indigo-600"/> تشخيص النمط بالملاحظة (AI)</h3>
                            <p className="text-xs text-gray-400">أدخل ملاحظاتك السلوكية عن الطالب وسيقوم Gemini بتوقع نمط تعلمه.</p>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">الطالب</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                    <option value="">-- اختر طالباً --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.learningStyle || 'غير محدد'})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">ملاحظاتك السلوكية</label>
                                <textarea className="w-full p-4 border rounded-xl bg-gray-50 h-32 outline-none focus:bg-white text-sm" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="مثال: يفضل الرسم أثناء الشرح، يتشتت بالصوت، يحب العمل اليدوي، يحب الجداول المنظمة..."/>
                            </div>
                            <button onClick={handleDiagnose} disabled={isDiagnosing || !observations} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-indigo-700">
                                {isDiagnosing ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} {isDiagnosing ? 'جاري التحليل...' : 'بدء التحليل الذكي'}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto flex flex-col justify-center items-center">
                            {diagnosis ? (
                                <div className="space-y-6 animate-slide-up w-full">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 border-2 border-indigo-100 shadow-inner"><BrainCircuit size={40}/></div>
                                        <h4 className="text-2xl font-black text-indigo-600">النمط المتوقع: {diagnosis.style === 'VISUAL' ? 'بصري' : diagnosis.style === 'AUDITORY' ? 'سمعي' : diagnosis.style === 'KINESTHETIC' ? 'حركي' : 'قرائي'}</h4>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        <h5 className="font-bold text-gray-700 mb-2">الاستنتاج:</h5>
                                        <p className="text-sm text-gray-600 leading-relaxed">{diagnosis.reasoning}</p>
                                    </div>
                                    <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                                        <h5 className="font-bold text-green-800 mb-2 flex items-center gap-2"><Lightbulb size={16}/> نصيحة لك كمعلم:</h5>
                                        <p className="text-sm text-green-700 leading-relaxed font-bold">{diagnosis.tips}</p>
                                    </div>
                                    <button onClick={() => { updateStudentLearningStyle(selectedStudentId, diagnosis.style); setDiagnosis(null); setLocalStudents(getStudents()); alert('تم الحفظ في ملف الطالب بنجاح!'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">اعتماد وحفظ النمط</button>
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
                            <h3 className="font-black text-gray-800 mb-8 flex items-center gap-2"><PieChartIcon className="text-indigo-600"/> التوزيع العام للأنماط</h3>
                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={styleStats} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                                            {styleStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-gray-800 flex items-center gap-2"><List size={18}/> قائمة أنماط الطلاب</h3>
                                <div className="relative">
                                    <Filter className="absolute right-3 top-2.5 text-gray-400" size={14}/>
                                    <input className="pr-8 pl-3 py-1.5 border rounded-lg text-xs" placeholder="تصفية بالاسم..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="space-y-2">
                                    {filteredList.map(s => (
                                        <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                            <span className="font-bold text-gray-700 text-sm">{s.name}</span>
                                            {s.learningStyle ? (
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                                                    s.learningStyle === 'VISUAL' ? 'bg-blue-100 text-blue-700' :
                                                    s.learningStyle === 'AUDITORY' ? 'bg-green-100 text-green-700' :
                                                    s.learningStyle === 'KINESTHETIC' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                }`}>{s.learningStyle}</span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">غير محدد</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ASSESSMENT' && (
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6">
                        <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden shrink-0">
                            <Sparkles className="absolute -bottom-4 -right-4 opacity-10" size={120}/>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2 flex items-center gap-3">استيراد نتائج Microsoft Forms</h3>
                                <p className="text-indigo-100 text-sm max-w-lg mb-8">ارفع ملف Excel الخاص باستجابات الطلاب، وسيقوم النظام بمطابقة الأسماء وتحديد النمط التعليمي لكل طالب في فصلك تلقائياً.</p>
                                
                                <div className="flex flex-wrap gap-4">
                                    <label className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2">
                                        {isImportLoading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                                        {isImportLoading ? 'جاري التحليل...' : 'تحميل ملف الاستجابات (Excel)'}
                                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFormsImport(e, 'LOCAL')} />
                                    </label>
                                    <button onClick={() => alert('رابط الاختبار موجود في بوابة الطالب تلقائياً')} className="bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black border border-indigo-500 hover:bg-indigo-800 transition-all flex items-center gap-2">
                                        <Share2 size={20}/> نسخ الرابط للطلاب
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-[3rem] border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center text-gray-400">
                             <FileSpreadsheet size={64} className="mb-4 opacity-20"/>
                             <h4 className="text-xl font-black text-gray-500">بانتظار البيانات</h4>
                             <p className="max-w-xs mt-2 text-sm leading-relaxed">ارفع ملف Excel يحتوي على عمود (الاسم) وإجابات الاختبار للبدء.</p>
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
                                                {m === 'HAPPY' ? 'متحمس 😊' : m === 'TIRED' ? 'متعب 😴' : m === 'FOCUSED' ? 'مركز 🧐' : 'يشعر بالملل 😑'}
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
                                    {isGeneratingStrategy ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} توليد الخطة المثالية
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm overflow-y-auto custom-scrollbar p-10">
                            {aiStrategy ? (
                                <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed text-sm">
                                    <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40">
                                    <Bot size={80} className="mb-4"/>
                                    <p className="text-xl font-black">اضغط على الزر أعلاه لتحليل الفصل والحصول على اقتراحات</p>
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
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>{label}</button>
);

export default LearningLab;