import React, { useState, useEffect } from 'react';
import { generateLessonPlan, generateSemesterPlan, generateLearningPlan, generateLearningOutcomesMap, suggestSyllabus, organizeCourseContent } from '../services/geminiService';
import { 
    saveLessonPlan, getLessonPlans, deleteLessonPlan, 
    getCurriculumUnits, getCurriculumLessons, getMicroConcepts 
} from '../services/storageService';
import { StoredLessonPlan, CurriculumUnit, CurriculumLesson, MicroConcept } from '../types';
import { BookOpen, PenTool, Loader2, Copy, Printer, CheckCircle, Sparkles, Layout, Clock, FileText, ArrowRight, ArrowLeft, Settings, Check, List, AlertTriangle, Calendar, Map, Table, Target, ListTree, BookOpenCheck, Save, Trash2, Link } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    const [activeTab, setActiveTab] = useState<'MY_PLANS' | 'CONTENT' | 'SEMESTER' | 'LESSON' | 'OUTCOMES' | 'LEARNING'>(() => {
        return localStorage.getItem('lesson_planning_tab') as any || 'LESSON';
    });

    useEffect(() => {
        localStorage.setItem('lesson_planning_tab', activeTab);
    }, [activeTab]);

    // User Context (Mock - in real app pass via props)
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');

    // Lesson Generator State
    const [lessonStep, setLessonStep] = useState<1 | 2 | 3>(1);
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('');
    const [duration, setDuration] = useState('45');
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
    const [selectedResources, setSelectedResources] = useState<string[]>([]);
    const [customObjectives, setCustomObjectives] = useState('');
    const [lessonPlanResult, setLessonPlanResult] = useState('');
    
    // Database Integration State
    const [myPlans, setMyPlans] = useState<StoredLessonPlan[]>([]);
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [curriculumLessons, setCurriculumLessons] = useState<CurriculumLesson[]>([]);
    const [microConcepts, setMicroConcepts] = useState<MicroConcept[]>([]);
    const [selectedLinkId, setSelectedLinkId] = useState(''); // ID of CurriculumLesson to link to

    // Other Tabs State
    const [semSubject, setSemSubject] = useState('');
    const [semGrade, setSemGrade] = useState('');
    const [semTerm, setSemTerm] = useState('الفصل الدراسي الأول');
    const [semWeeks, setSemWeeks] = useState(13); 
    const [semClassesPerWeek, setSemClassesPerWeek] = useState(4);
    const [semContent, setSemContent] = useState('');
    const [semResult, setSemResult] = useState('');
    const [suggestLoading, setSuggestLoading] = useState(false);

    const [contentSubject, setContentSubject] = useState('');
    const [contentGrade, setContentGrade] = useState('');
    const [manualContent, setManualContent] = useState('');
    const [contentResult, setContentResult] = useState('');

    const [learnSubject, setLearnSubject] = useState('');
    const [learnGrade, setLearnGrade] = useState('');
    const [learnGoal, setLearnGoal] = useState('');
    const [learnDuration, setLearnDuration] = useState('2');
    const [learnResult, setLearnResult] = useState('');

    const [outcomesSubject, setOutcomesSubject] = useState('');
    const [outcomesGrade, setOutcomesGrade] = useState('');
    const [outcomesContent, setOutcomesContent] = useState('');
    const [outcomesResult, setOutcomesResult] = useState('');

    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (currentUser?.id) {
            setMyPlans(getLessonPlans(currentUser.id));
            setUnits(getCurriculumUnits(currentUser.id));
            setCurriculumLessons(getCurriculumLessons()); // Get all, filter later if needed
            setMicroConcepts(getMicroConcepts(currentUser.id));
        }
    }, [currentUser?.id, activeTab]);

    const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    // Auto-fill from selected Curriculum Lesson
    useEffect(() => {
        if (selectedLinkId) {
            const lesson = curriculumLessons.find(l => l.id === selectedLinkId);
            if (lesson) {
                setTopic(lesson.title);
                const unit = units.find(u => u.id === lesson.unitId);
                if (unit) {
                    setSubject(unit.subject);
                    setGrade(unit.gradeLevel);
                }
            }
        }
    }, [selectedLinkId, curriculumLessons, units]);

    const handleGenerateLesson = async () => {
        if (!topic || !subject) return;
        setLoading(true);
        setLessonStep(3); 
        setLessonPlanResult(''); 
        
        // Build Context
        const context: { standards?: string[], concepts?: string[] } = {};
        if (selectedLinkId) {
            const lesson = curriculumLessons.find(l => l.id === selectedLinkId);
            if (lesson) {
                context.standards = lesson.learningStandards;
                if (lesson.microConceptIds) {
                    context.concepts = microConcepts
                        .filter(c => lesson.microConceptIds?.includes(c.id))
                        .map(c => c.name);
                }
            }
        }

        try {
            const result = await generateLessonPlan(
                subject, 
                topic, 
                grade, 
                duration, 
                selectedStrategies, 
                selectedResources, 
                customObjectives,
                context // Pass context to AI
            );
            setLessonPlanResult(result);
        } catch (error) {
            console.error(error);
            setLessonPlanResult("عذراً، حدث خطأ أثناء إنشاء التحضير.");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = () => {
        if (!lessonPlanResult || !currentUser?.id) return;
        
        const newPlan: StoredLessonPlan = {
            id: Date.now().toString(),
            teacherId: currentUser.id,
            lessonId: selectedLinkId || undefined,
            subject: subject,
            topic: topic,
            contentJson: lessonPlanResult, // Storing MD as string for now
            resources: selectedResources,
            createdAt: new Date().toISOString()
        };

        saveLessonPlan(newPlan);
        setMyPlans(getLessonPlans(currentUser.id));
        alert('تم حفظ التحضير بنجاح!');
        setActiveTab('MY_PLANS');
    };

    const handleDeletePlan = (id: string) => {
        if(confirm('حذف هذا التحضير؟')) {
            deleteLessonPlan(id);
            if(currentUser?.id) setMyPlans(getLessonPlans(currentUser.id));
        }
    };

    // ... rest of existing functions (handleGenerateSemester, etc.) ...
    // Keeping them compact to save space as they are unchanged logic-wise
    const handleGenerateSemester = async () => { /* ... */ if(!semSubject || !semGrade) return; setLoading(true); setSemResult(''); try { const r = await generateSemesterPlan(semSubject, semGrade, semTerm, semWeeks, semClassesPerWeek, semContent); setSemResult(r); } catch(e) { setSemResult("فشل"); } finally { setLoading(false); } };
    const handleGenerateContent = async () => { /* ... */ if(!contentSubject || !contentGrade) return; setLoading(true); setContentResult(''); try { const r = manualContent.trim() ? await organizeCourseContent(manualContent, contentSubject, contentGrade) : await suggestSyllabus(contentSubject, contentGrade); setContentResult(r); } catch(e) { setContentResult("فشل"); } finally { setLoading(false); } };
    const handleSuggestContent = async () => { /* ... */ if(!semSubject || !semGrade) return alert('أدخل المادة والصف'); setSuggestLoading(true); try { setSemContent(await suggestSyllabus(semSubject, semGrade)); } catch(e){} finally { setSuggestLoading(false); } };
    const handleGenerateLearning = async () => { /* ... */ if(!learnSubject || !learnGoal) return; setLoading(true); setLearnResult(''); try { setLearnResult(await generateLearningPlan(learnSubject, learnGrade, learnGoal, learnDuration)); } catch(e) { setLearnResult("فشل"); } finally { setLoading(false); } };
    const handleGenerateOutcomes = async () => { /* ... */ if(!outcomesSubject || !outcomesGrade) return; setLoading(true); setOutcomesResult(''); try { setOutcomesResult(await generateLearningOutcomesMap(outcomesSubject, outcomesGrade, outcomesContent)); } catch(e) { setOutcomesResult("فشل"); } finally { setLoading(false); } };
    
    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const handlePrint = () => { window.print(); };

    const markdownComponents = {
        h1: ({node, ...props}: any) => <h1 className="text-2xl font-black text-indigo-800 mb-4 border-b-2 border-indigo-100 pb-2" {...props} />,
        h2: ({node, ...props}: any) => <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3 flex items-center gap-2 before:content-[''] before:w-1 before:h-6 before:bg-indigo-500 before:rounded-full before:ml-2" {...props} />,
        h3: ({node, ...props}: any) => <h3 className="text-lg font-bold text-gray-700 mt-4 mb-2" {...props} />,
        p: ({node, ...props}: any) => <p className="mb-2 text-gray-600 leading-relaxed" {...props} />,
        ul: ({node, ...props}: any) => <ul className="list-disc list-outside mr-5 mb-4 space-y-1 text-gray-700 marker:text-indigo-400" {...props} />,
        ol: ({node, ...props}: any) => <ol className="list-decimal list-outside mr-5 mb-4 space-y-1 text-gray-700 marker:font-bold" {...props} />,
        li: ({node, ...props}: any) => <li className="pl-2" {...props} />,
        strong: ({node, ...props}: any) => <strong className="font-bold text-gray-900" {...props} />,
        table: ({node, ...props}: any) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200" {...props} />
            </div>
        ),
        thead: ({node, ...props}: any) => <thead className="bg-indigo-50" {...props} />,
        tbody: ({node, ...props}: any) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
        tr: ({node, ...props}: any) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
        th: ({node, ...props}: any) => <th className="px-4 py-3 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider" {...props} />,
        td: ({node, ...props}: any) => <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" {...props} />,
        blockquote: ({node, ...props}: any) => <blockquote className="border-r-4 border-indigo-300 bg-indigo-50/50 p-4 rounded-l my-4 italic text-gray-600" {...props} />,
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
                        <p className="text-gray-500 mt-2">يتم التنسيق وبناء الجداول تلقائياً...</p>
                    </div>
                ) : content ? (
                    <div className="max-w-4xl mx-auto" dir="rtl">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {content}
                        </ReactMarkdown>
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
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="text-indigo-600"/> مركز التخطيط والإعداد
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm">أدوات متكاملة للمعلم: تحضير الدروس، وتوزيع المنهج (إصدار 1447هـ).</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <button onClick={() => setActiveTab('LESSON')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'LESSON' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                        <PenTool size={16}/> تحضير درس
                    </button>
                    <button onClick={() => setActiveTab('MY_PLANS')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'MY_PLANS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                        <List size={16}/> خططي
                    </button>
                    {/* ... other tabs ... */}
                </div>
            </div>

            {/* MY PLANS TAB */}
            {activeTab === 'MY_PLANS' && (
                <div className="flex-1 overflow-y-auto">
                    {myPlans.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myPlans.map(plan => {
                                const linkedLesson = plan.lessonId ? curriculumLessons.find(l => l.id === plan.lessonId) : null;
                                return (
                                    <div key={plan.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-lg text-gray-800 line-clamp-1">{plan.topic}</h4>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setLessonPlanResult(plan.contentJson); setActiveTab('LESSON'); setLessonStep(3); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FileText size={16}/></button>
                                                <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 mb-2">
                                            <span className="block font-bold text-indigo-600">{plan.subject}</span>
                                            <span className="text-xs">{new Date(plan.createdAt).toLocaleDateString('ar-SA')}</span>
                                        </div>
                                        {linkedLesson && (
                                            <div className="mt-2 text-xs bg-green-50 text-green-700 p-1.5 rounded border border-green-100 flex items-center gap-1">
                                                <Link size={12}/> مرتبط بـ: {linkedLesson.title}
                                            </div>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {plan.resources?.slice(0, 3).map((r, i) => (
                                                <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
                            <PenTool size={48} className="mb-4 opacity-20"/>
                            <p>لا توجد تحضيرات محفوظة.</p>
                        </div>
                    )}
                </div>
            )}

            {/* LESSON TAB (GENERATOR) */}
            {activeTab === 'LESSON' && (
                <>
                    <div className="flex-1 overflow-hidden flex flex-col items-center w-full max-w-5xl mx-auto">
                        {lessonStep === 1 && (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-2xl animate-slide-up">
                                <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2 text-gray-800">
                                    <PenTool size={20} className="text-indigo-500"/> أدخل بيانات الدرس
                                </h3>
                                
                                {/* Curriculum Linking */}
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6">
                                    <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2"><ListTree size={16}/> ربط بالمنهج (اختياري)</h4>
                                    <p className="text-xs text-indigo-600 mb-3">اختر الدرس من القائمة لتعبئة البيانات تلقائياً وتوجيه الذكاء الاصطناعي بالمعايير الوزارية.</p>
                                    <select 
                                        className="w-full p-2 border rounded text-sm bg-white"
                                        value={selectedLinkId}
                                        onChange={e => setSelectedLinkId(e.target.value)}
                                    >
                                        <option value="">-- اختر الدرس من المنهج --</option>
                                        {units.map(u => (
                                            <optgroup key={u.id} label={u.title}>
                                                {curriculumLessons.filter(l => l.unitId === u.id).map(l => (
                                                    <option key={l.id} value={l.id}>{l.title}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">المادة الدراسية <span className="text-red-500">*</span></label>
                                        <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: لغتي الجميلة..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">موضوع الدرس <span className="text-red-500">*</span></label>
                                        <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={topic} onChange={e => setTopic(e.target.value)} placeholder="مثال: كان وأخواتها..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">الصف</label>
                                            <input className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={grade} onChange={e => setGrade(e.target.value)} placeholder="مثال: الثالث المتوسط"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">الزمن (دقيقة)</label>
                                            <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all" value={duration} onChange={e => setDuration(e.target.value)}/>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={() => setLessonStep(2)} disabled={!subject || !topic} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg">
                                        التالي <ArrowLeft size={18}/>
                                    </button>
                                </div>
                            </div>
                        )}

                        {lessonStep === 2 && (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl animate-slide-up flex flex-col h-full md:h-auto overflow-hidden">
                                {/* ... existing step 2 content ... */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    <h3 className="font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2 text-gray-800"><Settings size={20} className="text-indigo-500"/> تفاصيل إضافية</h3>
                                    {/* Strategy & Resources Selectors */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3">استراتيجيات التدريس</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {TEACHING_STRATEGIES.map(s => (
                                                    <button key={s} onClick={() => toggleSelection(selectedStrategies, setSelectedStrategies, s)} className={`p-2 rounded-lg text-xs font-bold border transition-all ${selectedStrategies.includes(s) ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3">الوسائل التعليمية</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {TEACHING_RESOURCES.map(r => (
                                                    <button key={r} onClick={() => toggleSelection(selectedResources, setSelectedResources, r)} className={`p-2 rounded-lg text-xs font-bold border transition-all ${selectedResources.includes(r) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}>{r}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-4 border-t flex justify-between">
                                    <button onClick={() => setLessonStep(1)} className="text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 flex items-center gap-2"><ArrowRight size={18}/> عودة</button>
                                    <button onClick={handleGenerateLesson} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2"><Sparkles size={18}/> إنشاء التحضير</button>
                                </div>
                            </div>
                        )}

                        {lessonStep === 3 && (
                            <div className="w-full h-full flex flex-col relative animate-fade-in">
                                <div className="absolute top-4 right-4 z-10 print:hidden flex gap-2">
                                    <button onClick={handleSavePlan} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-1 shadow">
                                        <Save size={16}/> حفظ
                                    </button>
                                    <button onClick={() => { setLessonStep(1); setLessonPlanResult(''); setSelectedLinkId(''); }} className="bg-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-gray-50 border">تحضير جديد</button>
                                </div>
                                {renderOutput(lessonPlanResult)}
                            </div>
                        )}
                    </div>
                </>
            )}
            
            {/* Keeping other tabs code minimal as requested */}
            {activeTab === 'CONTENT' && <div className="flex-1 flex items-center justify-center text-gray-400">Content Tab Placeholder</div>}
            {activeTab === 'SEMESTER' && <div className="flex-1 flex items-center justify-center text-gray-400">Semester Tab Placeholder</div>}
        </div>
    );
};

export default LessonPlanning;