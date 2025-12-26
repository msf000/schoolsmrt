
import React, { useState, useEffect } from 'react';
import { getSubjects, saveLessonPlan, getLessonPlans, deleteLessonPlan, exportToWord } from '../services/storageService';
import { generateLessonBlocks } from '../services/geminiService';
import { LessonBlock, StoredLessonPlan, Subject, SystemUser } from '../types';
import { Loader2, Save, RefreshCw, BookOpen, Trash2, Plus, PenTool, Image as ImageIcon, Video, Type, ArrowUp, ArrowDown, X, Printer, FileText } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي (السنة المشتركة)", 
    "الصف الثاني الثانوي (مسارات)", 
    "الصف الثالث الثانوي (مسارات)"
];

interface LessonPlanningProps {
    currentUser?: SystemUser | null;
}

const LessonPlanning: React.FC<LessonPlanningProps> = ({ currentUser }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [lessonTopic, setLessonTopic] = useState('');
    const [lessonContent, setLessonContent] = useState<LessonBlock[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedPlans, setSavedPlans] = useState<StoredLessonPlan[]>([]);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    const location = useLocation();

    useEffect(() => {
        const user = currentUser || JSON.parse(localStorage.getItem('current_user') || '{}');
        if (user.id) {
            setSubjects(getSubjects(user.id));
            setSavedPlans(getLessonPlans(user.id));
        }
        if (location.state) {
            const { subject, topic, grade } = location.state as any;
            if (subject) setSelectedSubject(subject);
            if (topic) setLessonTopic(topic);
            if (grade) setSelectedGrade(grade);
        }
    }, [location.state, currentUser]);

    const handleGenerate = async () => {
        if (!selectedSubject || !lessonTopic || !selectedGrade) return;
        setIsGenerating(true);
        try {
            const blocks = await generateLessonBlocks(selectedSubject, lessonTopic, selectedGrade, { 
                includeActivity: true, includeVideo: true, includeWorksheet: true 
            });
            setLessonContent(blocks);
        } catch (e) {
            alert('حدث خطأ أثناء التوليد');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        const user = currentUser || JSON.parse(localStorage.getItem('current_user') || '{}');
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

    const loadPlan = (plan: StoredLessonPlan) => {
        setSelectedSubject(plan.subject);
        setLessonTopic(plan.topic);
        try { setLessonContent(JSON.parse(plan.contentJson)); } catch { }
    };

    const addBlock = (type: LessonBlock['type']) => {
        const newBlock: LessonBlock = {
            id: Date.now().toString(),
            type,
            title: type === 'MEDIA' ? 'وسائط' : 'عنوان جديد',
            content: 'اكتب المحتوى هنا...',
        };
        setLessonContent([...lessonContent, newBlock]);
        setIsAddMenuOpen(false);
    };

    const updateBlock = (id: string, updates: Partial<LessonBlock>) => {
        setLessonContent(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const moveBlock = (index: number, direction: 'UP' | 'DOWN') => {
        const newContent = [...lessonContent];
        const target = direction === 'UP' ? index - 1 : index + 1;
        if (target < 0 || target >= lessonContent.length) return;
        [newContent[index], newContent[target]] = [newContent[target], newContent[index]];
        setLessonContent(newContent);
    };

    return (
        <div className="p-6 h-full bg-gray-50 overflow-y-auto animate-fade-in flex flex-col md:flex-row gap-6 print:p-0 print:bg-white print:overflow-visible font-tajawal" dir="rtl">
            <div className="w-full md:w-1/4 space-y-4 print:hidden">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2"><BookOpen size={18}/> خططي المحفوظة</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {savedPlans.map(plan => (
                            <div key={plan.id} className="p-3 border rounded-lg bg-gray-50 hover:bg-purple-50 cursor-pointer" onClick={() => loadPlan(plan)}>
                                <div className="font-bold text-gray-800 text-sm truncate">{plan.topic}</div>
                                <div className="text-xs text-gray-500">{plan.subject}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">إعدادات الدرس</h3>
                    <div className="space-y-4">
                        <select className="w-full p-2 border rounded-lg text-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            <option value="">-- اختر المادة --</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <select className="w-full p-2 border rounded-lg text-sm" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                            <option value="">-- اختر الصف --</option>
                            {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="عنوان الدرس..." value={lessonTopic} onChange={e => setLessonTopic(e.target.value)}/>
                        <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50">
                            {isGenerating ? <Loader2 className="animate-spin"/> : <RefreshCw size={18}/>} توليد التحضير (AI)
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm min-h-[600px] relative flex flex-col print:border-none print:shadow-none print:p-0">
                <div className="flex justify-between items-center mb-6 border-b pb-4 print:hidden">
                    <h1 className="text-2xl font-black text-gray-800">{lessonTopic || 'محرر الدرس'}</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center gap-2">
                            <Plus size={16}/> إضافة عنصر
                        </button>
                        <button onClick={() => exportToWord('lesson-printable-area', `${lessonTopic || 'lesson'}.doc`)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-blue-700"><FileText size={16}/> تصدير Word</button>
                        <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-900"><Printer size={16}/> طباعة PDF</button>
                        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-green-700"><Save size={16}/> حفظ</button>
                    </div>
                </div>

                <div id="lesson-printable-area" className="flex-1 overflow-y-auto space-y-4">
                    {lessonContent.map((block, idx) => (
                        <div key={block.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group print:bg-white print:border-none print:p-0 print:mb-6">
                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded border print:hidden">
                                <button onClick={() => moveBlock(idx, 'UP')} className="p-1 hover:bg-gray-100"><ArrowUp size={14}/></button>
                                <button onClick={() => moveBlock(idx, 'DOWN')} className="p-1 hover:bg-gray-100"><ArrowDown size={14}/></button>
                            </div>
                            <input className="font-bold text-xl text-indigo-900 bg-transparent border-none outline-none w-full mb-2" value={block.title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
                            <textarea className="w-full p-2 bg-transparent border-none outline-none text-gray-700 leading-relaxed min-h-[100px] resize-none text-lg" value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} />
                        </div>
                    ))}
                    {lessonContent.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20 py-20">
                            <PenTool size={100} className="mb-4"/>
                            <p className="text-xl font-bold">ابدأ بكتابة التحضير أو استخدم الذكاء الاصطناعي</p>
                        </div>
                    )}
                </div>
            </div>

            {isAddMenuOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => setIsAddMenuOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-48 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <button onClick={() => addBlock('CONTENT')} className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"><Type size={16}/> نص / شرح</button>
                        <button onClick={() => addBlock('MEDIA')} className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"><ImageIcon size={16}/> صورة / فيديو</button>
                        <button onClick={() => addBlock('ACTIVITY')} className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"><PenTool size={16}/> نشاط</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPlanning;
