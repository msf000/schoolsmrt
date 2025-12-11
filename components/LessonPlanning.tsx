
import React, { useState, useEffect } from 'react';
import { getSubjects, saveLessonPlan, getLessonPlans, deleteLessonPlan } from '../services/storageService';
import { generateLessonBlocks } from '../services/geminiService';
import { Subject, StoredLessonPlan, LessonBlock } from '../types';
import { PenTool, Save, Loader2, BookOpen, Trash2, Copy, Printer, CheckCircle, RefreshCw } from 'lucide-react';

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي (السنة المشتركة)", 
    "الصف الثاني الثانوي (مسارات)", 
    "الصف الثالث الثانوي (مسارات)"
];

const LessonPlanning: React.FC = () => {
    // State
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem('current_user') || '{}'));
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Selection State
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [lessonTopic, setLessonTopic] = useState('');
    
    // Unused state variables kept for compatibility if needed or removed
    const [, setSelectedUnitId] = useState('');
    const [, setSelectedLessonId] = useState('');

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBlocks, setGeneratedBlocks] = useState<LessonBlock[]>([]);
    const [settings, setSettings] = useState({ includeActivity: true, includeVideo: true, includeWorksheet: true });

    // History State
    const [savedPlans, setSavedPlans] = useState<StoredLessonPlan[]>([]);

    useEffect(() => {
        if (currentUser?.id) {
            setSubjects(getSubjects(currentUser.id));
            setSavedPlans(getLessonPlans(currentUser.id));
        }
    }, [currentUser]);

    const handleGenerate = async () => {
        if (!selectedSubject || !selectedGrade || !lessonTopic) return alert('البيانات ناقصة');
        
        setIsGenerating(true);
        try {
            const blocks = await generateLessonBlocks(selectedSubject, lessonTopic, selectedGrade, settings);
            setGeneratedBlocks(blocks);
        } catch (e) {
            alert('فشل التوليد. حاول مرة أخرى.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePlan = () => {
        if (generatedBlocks.length === 0 || !currentUser?.id) return;
        
        const plan: StoredLessonPlan = {
            id: Date.now().toString(),
            teacherId: currentUser.id,
            subject: selectedSubject,
            topic: lessonTopic,
            contentJson: JSON.stringify(generatedBlocks),
            resources: [],
            createdAt: new Date().toISOString()
        };
        
        saveLessonPlan(plan);
        setSavedPlans(getLessonPlans(currentUser.id));
        alert('تم حفظ التحضير في المكتبة!');
    };

    const handleDeletePlan = (id: string) => {
        if (confirm('حذف هذا التحضير؟')) {
            deleteLessonPlan(id);
            setSavedPlans(getLessonPlans(currentUser.id));
        }
    };

    const handleLoadPlan = (plan: StoredLessonPlan) => {
        setSelectedSubject(plan.subject);
        setLessonTopic(plan.topic);
        try {
            setGeneratedBlocks(JSON.parse(plan.contentJson));
        } catch(e) {
            console.error('Failed to parse plan content');
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <PenTool className="text-purple-600"/> التحضير الذكي للدروس
                </h2>
                <p className="text-sm text-gray-500">قم بتوليد خطط دروس متكاملة باستخدام الذكاء الاصطناعي.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                {/* Left Panel: Inputs */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">إعدادات الدرس</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">المادة الدراسية</label>
                            <select 
                                className="w-full p-2.5 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                value={selectedSubject}
                                onChange={e => { setSelectedSubject(e.target.value); setSelectedUnitId(''); setSelectedLessonId(''); }}
                            >
                                <option value="">-- اختر المادة --</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                <option value="علم الأرض والفضاء">علم الأرض والفضاء</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">الصف</label>
                            <select 
                                className="w-full p-2.5 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                value={selectedGrade}
                                onChange={e => { setSelectedGrade(e.target.value); setSelectedUnitId(''); setSelectedLessonId(''); }}
                            >
                                <option value="">-- اختر الصف --</option>
                                {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">عنوان الدرس</label>
                            <input 
                                className="w-full p-2.5 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="مثال: خصائص المادة"
                                value={lessonTopic}
                                onChange={e => setLessonTopic(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 pt-2 border-t">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={settings.includeActivity} onChange={e => setSettings({...settings, includeActivity: e.target.checked})} className="w-4 h-4 text-purple-600"/>
                                <span className="text-sm text-gray-700">اقتراح نشاط حركي</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={settings.includeVideo} onChange={e => setSettings({...settings, includeVideo: e.target.checked})} className="w-4 h-4 text-purple-600"/>
                                <span className="text-sm text-gray-700">اقتراح فيديو تعليمي</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={settings.includeWorksheet} onChange={e => setSettings({...settings, includeWorksheet: e.target.checked})} className="w-4 h-4 text-purple-600"/>
                                <span className="text-sm text-gray-700">فكرة ورقة عمل</span>
                            </label>
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isGenerating || !lessonTopic}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-300 flex items-center justify-center gap-2 shadow-md transition-all"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
                            {isGenerating ? 'جاري التوليد...' : 'توليد التحضير'}
                        </button>
                    </div>

                    {/* Saved Plans List */}
                    <div className="mt-8 pt-4 border-t">
                        <h4 className="font-bold text-gray-600 text-sm mb-3 flex items-center gap-2"><BookOpen size={16}/> تحضيراتي السابقة</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {savedPlans.length > 0 ? savedPlans.map(plan => (
                                <div key={plan.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer text-sm" onClick={() => handleLoadPlan(plan)}>
                                    <span className="truncate flex-1">{plan.topic}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            )) : <p className="text-xs text-gray-400 text-center py-2">لا توجد تحضيرات محفوظة</p>}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Output */}
                <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-200 overflow-y-auto flex flex-col relative print:p-0 print:border-none print:shadow-none">
                    {generatedBlocks.length > 0 ? (
                        <>
                            <div className="flex justify-between items-center mb-6 print:hidden">
                                <h3 className="text-xl font-black text-gray-800 border-b-4 border-purple-200 pb-1">{lessonTopic}</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleSavePlan} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm text-sm">
                                        <Save size={16}/> حفظ
                                    </button>
                                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-black shadow-sm text-sm">
                                        <Printer size={16}/> طباعة
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {generatedBlocks.map((block, idx) => (
                                    <div key={idx} className="bg-gray-50 p-6 rounded-xl border border-gray-100 print:bg-white print:border-black print:border-2">
                                        <h4 className="font-bold text-purple-800 text-lg mb-3 flex items-center gap-2">
                                            <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm border border-purple-200 print:border-black">{idx + 1}</span>
                                            {block.title}
                                        </h4>
                                        <div className="text-gray-700 leading-loose whitespace-pre-line text-justify">
                                            {block.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <BookOpen size={64} className="mb-4 opacity-20"/>
                            <p className="text-lg">قم بإدخال تفاصيل الدرس لتوليد الخطة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonPlanning;
