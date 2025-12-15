
import React, { useState, useEffect } from 'react';
import { getSubjects, saveLessonPlan, getLessonPlans, deleteLessonPlan } from '../services/storageService';
import { generateLessonBlocks, regenerateSingleBlock } from '../services/geminiService';
import { LessonBlock, StoredLessonPlan, Subject } from '../types';
import { Loader2, Save, RefreshCw, BookOpen, Trash2, Plus, PenTool, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [selectedLessonId, setSelectedLessonId] = useState('');
    
    // Editor State
    const [lessonTopic, setLessonTopic] = useState('');
    const [lessonContent, setLessonContent] = useState<LessonBlock[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedPlans, setSavedPlans] = useState<StoredLessonPlan[]>([]);

    const location = useLocation();

    useEffect(() => {
        // Mock user ID fetch from localStorage as component props are not passed in App.tsx
        const user = JSON.parse(localStorage.getItem('current_user') || '{}');
        if (user.id) {
            setSubjects(getSubjects(user.id));
            setSavedPlans(getLessonPlans(user.id));
        }

        // Pre-fill from navigation state
        if (location.state) {
            const { subject, topic, grade } = location.state as any;
            if (subject) setSelectedSubject(subject);
            if (topic) setLessonTopic(topic);
            if (grade) setSelectedGrade(grade);
        }
    }, [location.state]);

    const handleGenerate = async () => {
        if (!selectedSubject || !lessonTopic || !selectedGrade) return;
        setIsGenerating(true);
        try {
            const blocks = await generateLessonBlocks(selectedSubject, lessonTopic, selectedGrade, { 
                includeActivity: true, 
                includeVideo: true, 
                includeWorksheet: true 
            });
            setLessonContent(blocks);
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء التوليد');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        const user = JSON.parse(localStorage.getItem('current_user') || '{}');
        if (!user.id) return;
        
        const newPlan: StoredLessonPlan = {
            id: Date.now().toString(),
            teacherId: user.id,
            subject: selectedSubject,
            topic: lessonTopic,
            contentJson: JSON.stringify(lessonContent),
            resources: [],
            createdAt: new Date().toISOString()
        };
        saveLessonPlan(newPlan);
        setSavedPlans(getLessonPlans(user.id));
        alert('تم حفظ التحضير');
    };

    const handleDelete = (id: string) => {
        if (confirm('حذف الخطة؟')) {
            deleteLessonPlan(id);
            const user = JSON.parse(localStorage.getItem('current_user') || '{}');
            if (user.id) setSavedPlans(getLessonPlans(user.id));
        }
    };

    const loadPlan = (plan: StoredLessonPlan) => {
        setSelectedSubject(plan.subject);
        setLessonTopic(plan.topic);
        try {
            setLessonContent(JSON.parse(plan.contentJson));
        } catch { }
    };

    return (
        <div className="p-6 h-full bg-gray-50 overflow-y-auto animate-fade-in flex flex-col md:flex-row gap-6">
            
            {/* Sidebar Plans List */}
            <div className="w-full md:w-1/4 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2"><BookOpen size={18}/> خططي المحفوظة</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {savedPlans.map(plan => (
                            <div key={plan.id} className="p-3 border rounded-lg bg-gray-50 hover:bg-purple-50 transition-colors cursor-pointer group relative" onClick={() => loadPlan(plan)}>
                                <div className="font-bold text-gray-800 text-sm truncate">{plan.topic}</div>
                                <div className="text-xs text-gray-500">{plan.subject}</div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        {savedPlans.length === 0 && <p className="text-center text-xs text-gray-400">لا توجد خطط</p>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">إعدادات الدرس</h3>
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
                                placeholder="مثال: خصائص المادة..."
                                value={lessonTopic}
                                onChange={e => setLessonTopic(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !selectedSubject || !lessonTopic}
                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-purple-700 disabled:opacity-50 shadow-md transition-transform active:scale-95"
                        >
                            {isGenerating ? <Loader2 className="animate-spin"/> : <RefreshCw size={18}/>}
                            توليد التحضير (AI)
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Preview */}
            <div className="flex-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm min-h-[600px] relative">
                <div className="absolute top-4 left-4 flex gap-2">
                    {lessonContent.length > 0 && (
                        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-sm">
                            <Save size={16}/> حفظ
                        </button>
                    )}
                </div>

                {lessonContent.length > 0 ? (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-black text-center text-gray-800 mb-8 border-b-2 border-gray-100 pb-4">{lessonTopic}</h1>
                        {lessonContent.map((block) => (
                            <div key={block.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors group relative">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-purple-800 text-lg">{block.title}</h4>
                                    <span className="text-[10px] bg-white border px-2 py-1 rounded text-gray-400 font-mono">{block.type}</span>
                                </div>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <PenTool size={64} className="mb-4 opacity-20"/>
                        <p className="text-lg">أدخل البيانات واضغط "توليد" لإنشاء خطة الدرس.</p>
                        <p className="text-sm">سيظهر التحضير هنا ويمكنك تعديله.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonPlanning;
