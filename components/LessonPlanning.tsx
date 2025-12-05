
import React, { useState } from 'react';
import { generateLessonPlan, generateSemesterPlan, generateLearningPlan } from '../services/geminiService';
import { BookOpen, PenTool, Loader2, Copy, Printer, CheckCircle, Sparkles, Layout, Clock, FileText, ArrowRight, ArrowLeft, Settings, Check, List, AlertTriangle, Calendar, Map, Table } from 'lucide-react';

const TEACHING_STRATEGIES = [
    'التعلم التعاوني', 'العصف الذهني', 'حل المشكلات', 'التعلم باللعب', 
    'الخرائط الذهنية', 'الحوار والمناقشة', 'الاستقصاء', 'التفكير الناقد',
    'الكرسي الساخن', 'أعواد المثلجات', 'فكر-زاوج-شارك', 'الرؤوس المرقمة'
];

const TEACHING_RESOURCES = [
    'الكتاب المدرسي', 'السبورة الذكية', 'جهاز عرض (Projector)', 
    'نماذج ومجسمات', 'أوراق عمل', 'فيديوهات (عين/يوتيوب)', 'منصة مدرستي', 'المختبر الافتراضي'
];

const LessonPlanning: React.FC = () => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'LESSON' | 'SEMESTER' | 'LEARNING'>('LESSON');

    // --- LESSON PREPARATION STATE ---
    const [lessonStep, setLessonStep] = useState<1 | 2 | 3>(1);
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('');
    const [duration, setDuration] = useState('45');
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
    const [selectedResources, setSelectedResources] = useState<string[]>([]);
    const [customObjectives, setCustomObjectives] = useState('');
    const [lessonPlanResult, setLessonPlanResult] = useState('');
    
    // --- SEMESTER PLAN STATE ---
    const [semSubject, setSemSubject] = useState('');
    const [semGrade, setSemGrade] = useState('');
    const [semTerm, setSemTerm] = useState('الفصل الدراسي الأول');
    const [semResult, setSemResult] = useState('');

    // --- LEARNING PLAN STATE ---
    const [learnSubject, setLearnSubject] = useState('');
    const [learnGrade, setLearnGrade] = useState('');
    const [learnGoal, setLearnGoal] = useState('');
    const [learnDuration, setLearnDuration] = useState('2');
    const [learnResult, setLearnResult] = useState('');

    // Shared State
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // --- Handlers ---

    const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleGenerateLesson = async () => {
        if (!topic || !subject) return;
        setLoading(true);
        setLessonStep(3); 
        setLessonPlanResult(''); 
        try {
            const result = await generateLessonPlan(subject, topic, grade, duration, selectedStrategies, selectedResources, customObjectives);
            setLessonPlanResult(result);
        } catch (error) {
            console.error(error);
            setLessonPlanResult("عذراً، حدث خطأ أثناء إنشاء التحضير.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSemester = async () => {
        if (!semSubject || !semGrade) return;
        setLoading(true);
        setSemResult('');
        try {
            const result = await generateSemesterPlan(semSubject, semGrade, semTerm);
            setSemResult(result);
        } catch (error) {
            setSemResult("فشل توليد الخطة الفصلية.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLearning = async () => {
        if (!learnSubject || !learnGoal) return;
        setLoading(true);
        setLearnResult('');
        try {
            const result = await generateLearningPlan(learnSubject, learnGrade, learnGoal, learnDuration);
            setLearnResult(result);
        } catch (error) {
            setLearnResult("فشل توليد خطة التعلم.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    const renderOutput = (content: string) => (
        <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative animate-fade-in min-h-[500px]">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center print:hidden">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600"/> معاينة النتيجة
                </h3>
                {content && !loading && (
                    <div className="flex gap-2">
                        <button onClick={() => handleCopy(content)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2 font-bold text-xs transition-colors shadow-sm">
                            {copied ? <CheckCircle size={14} className="text-green-600"/> : <Copy size={14}/>} {copied ? 'تم النسخ' : 'نسخ'}
                        </button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black flex items-center gap-2 font-bold text-xs transition-colors shadow-sm">
                            <Printer size={14}/> طباعة
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-auto p-8 md:p-12 bg-white relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20">
                        <Loader2 size={64} className="text-indigo-600 animate-spin mb-4"/>
                        <h3 className="text-xl font-bold text-gray-800">جاري الإعداد الذكي...</h3>
                        <p className="text-gray-500 mt-2">يتم التحضير بناءً على المناهج السعودية 1447هـ</p>
                    </div>
                ) : content ? (
                    <div className="max-w-4xl mx-auto prose prose-indigo max-w-none text-gray-800 leading-relaxed whitespace-pre-line text-right font-medium" dir="rtl">
                        {content}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                        <div className="p-4 bg-gray-50 rounded-full"><Sparkles size={32} className="text-gray-300"/></div>
                        <p>النتيجة ستظهر هنا بعد التوليد.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="text-indigo-600"/> مركز التخطيط والإعداد
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm">أدوات متكاملة للمعلم: تحضير الدروس، وتوزيع المنهج (إصدار 1447هـ).</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('LESSON')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LESSON' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                    >
                        <PenTool size={16}/> تحضير درس
                    </button>
                    <button 
                        onClick={() => setActiveTab('SEMESTER')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'SEMESTER' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                    >
                        <Table size={16}/> الخطة الفصلية
                    </button>
                    <button 
                        onClick={() => setActiveTab('LEARNING')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LEARNING' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                    >
                        <Map size={16}/> خطة التعلم
                    </button>
                </div>
            </div>

            {/* --- TAB 1: LESSON PREPARATION (WIZARD) --- */}
            {activeTab === 'LESSON' && (
                <>
                    {/* Wizard Steps Indicator */}
                    <div className="mb-8 print:hidden">
                        <div className="flex items-center justify-center max-w-3xl mx-auto">
                            <div className={`flex flex-col items-center relative z-10 ${lessonStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 transition-all ${lessonStep >= 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200'}`}>1</div>
                                <span className="text-[10px] font-bold">البيانات</span>
                            </div>
                            <div className={`flex-1 h-0.5 mx-2 rounded transition-all duration-500 ${lessonStep >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                            
                            <div className={`flex flex-col items-center relative z-10 ${lessonStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 transition-all ${lessonStep >= 2 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200'}`}>2</div>
                                <span className="text-[10px] font-bold">التفاصيل</span>
                            </div>
                            <div className={`flex-1 h-0.5 mx-2 rounded transition-all duration-500 ${lessonStep >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                            
                            <div className={`flex flex-col items-center relative z-10 ${lessonStep >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 transition-all ${lessonStep >= 3 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200'}`}>3</div>
                                <span className="text-[10px] font-bold">النتيجة</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col items-center w-full max-w-5xl mx-auto">
                        {/* STEP 1 */}
                        {lessonStep === 1 && (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-2xl animate-slide-up">
                                <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2 text-gray-800">
                                    <PenTool size={20} className="text-indigo-500"/> أدخل بيانات الدرس
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">المادة الدراسية <span className="text-red-500">*</span></label>
                                        <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: لغتي الجميلة، الرياضيات..." autoFocus/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">موضوع الدرس <span className="text-red-500">*</span></label>
                                        <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={topic} onChange={e => setTopic(e.target.value)} placeholder="مثال: كان وأخواتها..."/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">الصف الدراسي</label>
                                            <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={grade} onChange={e => setGrade(e.target.value)} placeholder="مثال: الثالث المتوسط"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">الزمن (دقيقة)</label>
                                            <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={duration} onChange={e => setDuration(e.target.value)}/>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={() => setLessonStep(2)} disabled={!subject || !topic} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                                        التالي <ArrowLeft size={18}/>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {lessonStep === 2 && (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl animate-slide-up flex flex-col h-full md:h-auto overflow-hidden">
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2 text-gray-800"><Settings size={20} className="text-indigo-500"/> تفاصيل إضافية (اختياري)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Sparkles size={16} className="text-yellow-500"/> استراتيجيات التدريس</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {TEACHING_STRATEGIES.map(s => (
                                                    <button key={s} onClick={() => toggleSelection(selectedStrategies, setSelectedStrategies, s)} className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${selectedStrategies.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Layout size={16} className="text-blue-500"/> الوسائل التعليمية</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {TEACHING_RESOURCES.map(r => (
                                                    <button key={r} onClick={() => toggleSelection(selectedResources, setSelectedResources, r)} className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${selectedResources.includes(r) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>{r}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><List size={16} className="text-green-500"/> أهداف خاصة / نواتج التعلم</label>
                                        <textarea className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm" placeholder="أهداف محددة..." value={customObjectives} onChange={e => setCustomObjectives(e.target.value)}/>
                                    </div>
                                </div>
                                <div className="mt-8 pt-4 border-t flex justify-between">
                                    <button onClick={() => setLessonStep(1)} className="text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 flex items-center gap-2"><ArrowRight size={18}/> عودة</button>
                                    <button onClick={handleGenerateLesson} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2 transition-transform active:scale-95"><Sparkles size={18}/> إنشاء التحضير</button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {lessonStep === 3 && (
                            <div className="w-full h-full flex flex-col relative animate-fade-in">
                                <div className="absolute top-4 right-4 z-10 print:hidden">
                                    <button onClick={() => { setLessonStep(1); setLessonPlanResult(''); }} className="bg-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-gray-50 border">تحضير جديد</button>
                                </div>
                                {renderOutput(lessonPlanResult)}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- TAB 2: SEMESTER PLAN --- */}
            {activeTab === 'SEMESTER' && (
                <div className="flex flex-col md:flex-row gap-6 h-full min-h-0">
                    {/* Inputs */}
                    <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2 text-gray-800">
                            <Table size={20} className="text-indigo-500"/> إعدادات الخطة الفصلية (1447هـ)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المادة الدراسية</label>
                                <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={semSubject} onChange={e => setSemSubject(e.target.value)} placeholder="مثال: المهارات الرقمية"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الصف</label>
                                <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={semGrade} onChange={e => setSemGrade(e.target.value)} placeholder="مثال: الأول الثانوي (مسارات)"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الفصل الدراسي</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={semTerm} onChange={e => setSemTerm(e.target.value)}>
                                    <option value="الفصل الدراسي الأول">الفصل الدراسي الأول 1447</option>
                                    <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني 1447</option>
                                    <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث 1447</option>
                                </select>
                            </div>
                            <button onClick={handleGenerateSemester} disabled={!semSubject || !semGrade || loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg mt-4 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin inline"/> : <Sparkles className="inline mr-2"/>} إنشاء توزيع المنهج
                            </button>
                        </div>
                    </div>
                    {/* Output */}
                    <div className="flex-1 h-full min-h-[500px]">
                        {renderOutput(semResult)}
                    </div>
                </div>
            )}

            {/* --- TAB 3: LEARNING PLAN --- */}
            {activeTab === 'LEARNING' && (
                <div className="flex flex-col md:flex-row gap-6 h-full min-h-0">
                    {/* Inputs */}
                    <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                        <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2 text-gray-800">
                            <Map size={20} className="text-indigo-500"/> إعداد خطة التعلم الفردية
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">لإنشاء خطط علاجية (للمتعثرين) أو إثرائية (للمتفوقين).</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المادة</label>
                                <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={learnSubject} onChange={e => setLearnSubject(e.target.value)} placeholder="مثال: لغة إنجليزية"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الصف</label>
                                <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={learnGrade} onChange={e => setLearnGrade(e.target.value)} placeholder="مثال: رابع ابتدائي"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الهدف من الخطة (الفاقد التعليمي / الإثراء)</label>
                                <textarea className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm" value={learnGoal} onChange={e => setLearnGoal(e.target.value)} placeholder="مثال: معالجة الضعف في القراءة والكتابة..."/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المدة (بالأسابيع)</label>
                                <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={learnDuration} onChange={e => setLearnDuration(e.target.value)}/>
                            </div>
                            <button onClick={handleGenerateLearning} disabled={!learnSubject || !learnGoal || loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg mt-4 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin inline"/> : <Sparkles className="inline mr-2"/>} إنشاء الخطة
                            </button>
                        </div>
                    </div>
                    {/* Output */}
                    <div className="flex-1 h-full min-h-[500px]">
                        {renderOutput(learnResult)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPlanning;
