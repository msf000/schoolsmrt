import React, { useState, useMemo, useEffect } from 'react';
import { Student, EnvironmentRecord, LearningStyle } from '../types';
import { updateStudentLearningStyle, saveEnvironmentRecord, getStudents } from '../services/storageService';
import { diagnoseLearningStyle, chatWithData, analyzeLearningStyleExcel } from '../services/geminiService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { 
    BrainCircuit, Wind, Sun, Volume2, Smile, Loader2, Sparkles, CheckCircle, Save, 
    History, TrendingUp, Lightbulb, Bot, ChevronRight, FileSpreadsheet, ClipboardList, 
    PieChart as PieChartIcon, Upload, X, HelpCircle, BarChart, Info, UserCheck
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const VARK_QUESTIONS = [
    {
        id: 1,
        question: "عندما أتعلم مهارة جديدة، أفضل أن:",
        options: [
            { text: "أشاهد شخصاً آخر يقوم بها (فيديو أو عرض)", style: "VISUAL" },
            { text: "أستمع لشخص يشرح لي الخطوات", style: "AUDITORY" },
            { text: "أقرأ التعليمات المكتوبة بعناية", style: "READ_WRITE" },
            { text: "أجرب القيام بها بنفسي فوراً", style: "KINESTHETIC" }
        ]
    },
    {
        id: 2,
        question: "عندما أحاول تذكر معلومة معينة، فإني أتذكر:",
        options: [
            { text: "صورة الصفحة أو المخطط الذي رأيته", style: "VISUAL" },
            { text: "صوت المعلم وهو ينطق بالمعلومة", style: "AUDITORY" },
            { text: "الكلمات المكتوبة في دفتري", style: "READ_WRITE" },
            { text: "ما قمت بفعله أو لمسه أثناء تعلمها", style: "KINESTHETIC" }
        ]
    },
    {
        id: 3,
        question: "في وقت فراغي، أفضل:",
        options: [
            { text: "مشاهدة الأفلام أو الصور", style: "VISUAL" },
            { text: "الاستماع للموسيقى أو البودكاست", style: "AUDITORY" },
            { text: "قراءة كتاب أو كتابة يومياتي", style: "READ_WRITE" },
            { text: "ممارسة الرياضة أو العمل اليدوي", style: "KINESTHETIC" }
        ]
    }
];

const LearningLab: React.FC<Props> = ({ students: initialStudents, currentUserId }) => {
    const [students, setLocalStudents] = useState<Student[]>(initialStudents);
    const [activeTab, setActiveTab] = useState<'STYLES' | 'ENVIRONMENT' | 'STRATEGY' | 'ASSESSMENT'>('STYLES');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [observations, setObservations] = useState('');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagnosis, setDiagnosis] = useState<any>(null);
    const [aiStrategy, setAiStrategy] = useState('');
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

    // Individual Quiz State
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
    
    // Bulk Import State
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<any>(null);

    // بيئة الصف
    const [env, setEnv] = useState<Partial<EnvironmentRecord>>({
        lighting: 3, noiseLevel: 2, mood: 'FOCUSED'
    });

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

    const handleQuizSubmit = () => {
        if (!selectedStudentId || Object.keys(quizAnswers).length < VARK_QUESTIONS.length) {
            alert('يرجى الإجابة على جميع الأسئلة.');
            return;
        }

        const counts: any = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0 };
        Object.values(quizAnswers).forEach(style => { counts[style as any]++; });
        
        let dominantStyle = 'UNKNOWN';
        let max = 0;
        Object.entries(counts).forEach(([style, count]: [string, any]) => {
            if (count > max) { max = count; dominantStyle = style; }
        });

        updateStudentLearningStyle(selectedStudentId, dominantStyle as LearningStyle);
        alert(`تم تحديد نمط الطالب: ${dominantStyle}. تم تحديث الملف.`);
        setQuizAnswers({});
    };

    const handleFormsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
            // نرسل أول 50 سجلاً للذكاء الاصطناعي لتوفير التكلفة والوقت
            const result = await analyzeLearningStyleExcel(JSON.stringify(data.slice(0, 50)));
            
            // تنفيذ التحديثات في قاعدة البيانات المحلية
            let matchedCount = 0;
            if (result.studentAssignments) {
                result.studentAssignments.forEach((item: any) => {
                    const cleanName = item.studentName.trim();
                    const match = students.find(s => 
                        s.name.includes(cleanName) || 
                        cleanName.includes(s.name) ||
                        (s.name.split(' ')[0] === cleanName.split(' ')[0] && s.name.split(' ').pop() === cleanName.split(' ').pop())
                    );
                    if (match) {
                        updateStudentLearningStyle(match.id, item.style);
                        matchedCount++;
                    }
                });
            }
            
            setBulkResult({ ...result, matchedCount });
            setLocalStudents(getStudents()); // تحديث القائمة المحلية
            alert(`تم معالجة الملف ومطابقة ${matchedCount} طالباً بنجاح.`);
        } catch (error) {
            alert('حدث خطأ أثناء تحليل ملف Microsoft Forms.');
        } finally {
            setIsImportLoading(false);
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
        setLocalStudents(getStudents());
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

    const styleStats = useMemo(() => {
        const stats: any = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0, UNKNOWN: 0 };
        students.forEach(s => { stats[(s.learningStyle || 'UNKNOWN') as any]++; });
        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    }, [students]);

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
                    <TabBtn label="اختبار الأنماط" active={activeTab === 'ASSESSMENT'} onClick={() => setActiveTab('ASSESSMENT')} />
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
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">ملاحظاتك على الطالب</label>
                                <textarea className="w-full p-4 border rounded-xl bg-gray-50 h-32 outline-none focus:bg-white" value={observations} onChange={e=>setObservations(e.target.value)} placeholder="مثال: يفضل الرسم أثناء الشرح، يتشتت بالصوت، يحب العمل اليدوي..."/>
                            </div>
                            <button onClick={handleDiagnose} disabled={isDiagnosing || !observations} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-indigo-700">
                                {isDiagnosing ? <Loader2 className="animate-spin"/> : <Sparkles/>} {isDiagnosing ? 'جاري التحليل...' : 'بدء التحليل الذكي'}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto custom-scrollbar">
                            {diagnosis ? (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 border-2 border-indigo-100 shadow-inner"><BrainCircuit size={40}/></div>
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
                                    <button onClick={saveStyle} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all">حفظ النمط في ملف الطالب</button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                    <PieChartIcon size={80} className="mb-4 opacity-10"/>
                                    <p className="text-xl font-bold text-center opacity-40">ملخص أنماط الفصل</p>
                                    <div className="w-full h-64">
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={styleStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {styleStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ASSESSMENT' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-6 overflow-y-auto">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><HelpCircle className="text-purple-600"/> اختبار الأنماط (VARK)</h3>
                                <div className="relative">
                                    <input type="file" id="forms-import" className="hidden" accept=".xlsx" onChange={handleFormsImport}/>
                                    <label htmlFor="forms-import" className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-black cursor-pointer hover:bg-green-100 border border-green-200 shadow-sm">
                                        {isImportLoading ? <Loader2 className="animate-spin" size={14}/> : <FileSpreadsheet size={14}/>} استيراد من Forms
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">اختيار الطالب</label>
                                    <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                        <option value="">-- اختر طالباً --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-6 mt-4">
                                    {VARK_QUESTIONS.map(q => (
                                        <div key={q.id} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                            <p className="font-bold text-gray-700 mb-3">{q.question}</p>
                                            <div className="space-y-2">
                                                {q.options.map(opt => (
                                                    <label key={opt.style} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${quizAnswers[q.id] === opt.style ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-indigo-50 border-transparent shadow-sm'}`}>
                                                        <input type="radio" name={`q-${q.id}`} value={opt.style} className="hidden" checked={quizAnswers[q.id] === opt.style} onChange={e => setQuizAnswers({...quizAnswers, [q.id]: e.target.value})}/>
                                                        <span className="text-sm font-medium">{opt.text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleQuizSubmit} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-xl hover:bg-purple-700 transition-all mt-4">حفظ وتحليل النمط الفردي</button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto custom-scrollbar">
                            {bulkResult ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center gap-4 bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                                        <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg"><CheckCircle size={32}/></div>
                                        <div>
                                            <h4 className="text-xl font-black text-indigo-900">تحليل Forms المكتمل</h4>
                                            <p className="text-sm text-indigo-600 font-bold">تم مطابقة وتحديث {bulkResult.matchedCount} طالب من السجلات.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl border shadow-sm">
                                        <h5 className="font-black text-gray-800 mb-4 flex items-center gap-2"><BarChart size={18} className="text-indigo-600"/> توزيع الأنماط في الملف</h5>
                                        <div className="space-y-3">
                                            {Object.entries(bulkResult.stats).map(([style, count]: [string, any], i) => (
                                                <div key={style} className="flex items-center gap-4">
                                                    <span className="text-[10px] font-bold w-20 text-gray-500">{style}</span>
                                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${(count/bulkResult.studentAssignments.length)*100}%`, backgroundColor: COLORS[i] }}></div>
                                                    </div>
                                                    <span className="text-xs font-black text-gray-700">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100">
                                        <h5 className="font-black text-yellow-800 mb-4 flex items-center gap-2"><Lightbulb size={18}/> توصيات AI لهذا الفصل</h5>
                                        <ul className="space-y-3">
                                            {bulkResult.tips.map((tip: string, i: number) => (
                                                <li key={i} className="text-sm text-yellow-700 font-medium flex items-start gap-2">
                                                    <span className="mt-1"><ChevronRight size={14}/></span> {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 p-10 text-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6"><FileSpreadsheet size={48} className="opacity-10"/></div>
                                    <h4 className="text-xl font-bold text-gray-400 mb-2">تحليل الاستجابات الجماعية</h4>
                                    <p className="text-sm max-w-xs leading-relaxed opacity-60">قم برفع ملف Excel المستخرج من مايكروسوفت فورمز ليقوم النظام بتحليل الأنماط لجميع الطلاب دفعة واحدة وتحديث سجلاتهم.</p>
                                    <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 text-xs flex gap-3">
                                        <Info size={16} className="shrink-0"/>
                                        <p className="text-right">تأكد من وجود عمود "الاسم" في الملف لمطابقة النتائج مع الطلاب المسجلين في النظام.</p>
                                    </div>
                                </div>
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

const TabBtn = ({ label, icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-50'}`}>{icon} {label}</button>
);

export default LearningLab;