
import React, { useState, useEffect } from 'react';
import { getSubjects, saveLessonPlan, getLessonPlans, deleteLessonPlan } from '../services/storageService';
// Fix: Removed regenerateSingleBlock as it is not exported from geminiService
import { generateLessonBlocks } from '../services/geminiService';
import { LessonBlock, StoredLessonPlan, Subject, SystemUser } from '../types';
import { Loader2, Save, RefreshCw, BookOpen, Trash2, Plus, PenTool, ChevronDown, ChevronUp, Image as ImageIcon, Video, Type, ArrowUp, ArrowDown, X, Printer, Copy, Check } from 'lucide-react';
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
    // State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    
    // Editor State
    const [lessonTopic, setLessonTopic] = useState('');
    const [lessonContent, setLessonContent] = useState<LessonBlock[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedPlans, setSavedPlans] = useState<StoredLessonPlan[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    
    // Manual Add State
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    const location = useLocation();

    useEffect(() => {
        // Fallback to localStorage if prop is missing (for safety)
        const user = currentUser || JSON.parse(localStorage.getItem('current_user') || '{}');
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
    }, [location.state, currentUser]);

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

    const handleDelete = (id: string) => {
        if (confirm('حذف الخطة؟')) {
            deleteLessonPlan(id);
            const user = currentUser || JSON.parse(localStorage.getItem('current_user') || '{}');
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

    // --- Block Manipulation ---
    const addBlock = (type: LessonBlock['type']) => {
        const newBlock: LessonBlock = {
            id: Date.now().toString(),
            type,
            title: type === 'MEDIA' ? 'وسائط (صورة/فيديو)' : 'عنوان جديد',
            content: type === 'MEDIA' ? '' : 'اكتب المحتوى هنا...',
            mediaUrl: ''
        };
        setLessonContent([...lessonContent, newBlock]);
        setIsAddMenuOpen(false);
    };

    const updateBlock = (id: string, updates: Partial<LessonBlock>) => {
        setLessonContent(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        setLessonContent(prev => prev.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'UP' | 'DOWN') => {
        if (direction === 'UP' && index === 0) return;
        if (direction === 'DOWN' && index === lessonContent.length - 1) return;
        
        const newContent = [...lessonContent];
        const targetIndex = direction === 'UP' ? index - 1 : index + 1;
        [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
        setLessonContent(newContent);
    };

    const handleCopyForPlatform = () => {
        const text = lessonContent.map(b => {
            if (b.type === 'MEDIA') return `[رابط وسائط]: ${b.mediaUrl}`;
            return `${b.title}:\n${b.content}`;
        }).join('\n\n');
        
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="p-6 h-full bg-gray-50 overflow-y-auto animate-fade-in flex flex-col md:flex-row gap-6 print:p-0 print:bg-white print:overflow-visible">
            
            {/* Sidebar Plans List - Hide on Print */}
            <div className="w-full md:w-1/4 space-y-4 print:hidden">
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
                                onChange={e => setSelectedSubject(e.target.value)}
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
                                onChange={e => setSelectedGrade(e.target.value)}
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

            {/* Content Preview & Editor */}
            <div className="flex-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm min-h-[600px] relative flex flex-col print:border-none print:shadow-none print:p-0 print:h-auto">
                
                {/* Print Header */}
                <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
                    <h1 className="text-3xl font-black mb-2">{lessonTopic || 'بدون عنوان'}</h1>
                    <div className="flex justify-between text-sm font-bold mt-4">
                        <span>المادة: {selectedSubject}</span>
                        <span>الصف: {selectedGrade}</span>
                        <span>المعلم: {currentUser?.name}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 border-b pb-4 print:hidden">
                    <h1 className="text-2xl font-black text-gray-800">{lessonTopic || 'محرر الدرس'}</h1>
                    <div className="flex gap-2">
                        <div className="relative">
                            <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center gap-2">
                                <Plus size={16}/> إضافة عنصر
                            </button>
                            {isAddMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-xl z-50 w-48 overflow-hidden">
                                    <button onClick={() => addBlock('CONTENT')} className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"><Type size={16}/> نص / شرح</button>
                                    <button onClick={() => addBlock('MEDIA')} className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"><ImageIcon size={16}/> صورة / فيديو</button>
                                    <button onClick={() => addBlock('ACTIVITY')} className="w-full text-right px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"><PenTool size={16}/> نشاط</button>
                                </div>
                            )}
                        </div>
                        <button onClick={handleCopyForPlatform} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 flex items-center gap-2">
                            {isCopied ? <Check size={16}/> : <Copy size={16}/>} نسخ للمنصة
                        </button>
                        <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black flex items-center gap-2 shadow-sm">
                            <Printer size={16}/> طباعة
                        </button>
                        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-sm">
                            <Save size={16}/> حفظ
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 print:overflow-visible print:pr-0">
                    {lessonContent.length > 0 ? (
                        lessonContent.map((block, idx) => (
                            <div key={block.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-purple-300 transition-all group relative print:bg-white print:border-none print:p-0 print:mb-6">
                                {/* Controls - Hidden on Print */}
                                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-lg border shadow-sm z-10 print:hidden">
                                    <button onClick={() => moveBlock(idx, 'UP')} disabled={idx === 0} className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30"><ArrowUp size={14}/></button>
                                    <button onClick={() => moveBlock(idx, 'DOWN')} disabled={idx === lessonContent.length - 1} className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30"><ArrowDown size={14}/></button>
                                    <div className="w-[1px] bg-gray-300 mx-1"></div>
                                    <button onClick={() => removeBlock(block.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14}/></button>
                                </div>

                                <div className="flex items-center gap-3 mb-2">
                                    <div className="print:hidden">
                                        {block.type === 'MEDIA' ? <Video size={18} className="text-blue-500"/> : block.type === 'ACTIVITY' ? <PenTool size={18} className="text-orange-500"/> : <BookOpen size={18} className="text-purple-500"/>}
                                    </div>
                                    <input 
                                        className="font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 outline-none w-full print:hidden"
                                        value={block.title}
                                        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                        placeholder="عنوان الفقرة"
                                    />
                                    <h3 className="hidden print:block font-bold text-xl text-black border-b border-gray-300 pb-1 w-full">{block.title}</h3>
                                </div>

                                {block.type === 'MEDIA' ? (
                                    <div className="space-y-2">
                                        <input 
                                            className="w-full p-2 border rounded text-sm bg-white dir-ltr print:hidden"
                                            placeholder="رابط الصورة أو فيديو يوتيوب..."
                                            value={block.mediaUrl || ''}
                                            onChange={(e) => updateBlock(block.id, { mediaUrl: e.target.value })}
                                        />
                                        {block.mediaUrl && (
                                            <div className="mt-2 rounded-lg overflow-hidden border bg-black/5 aspect-video flex items-center justify-center print:border-none print:bg-white print:aspect-auto print:block">
                                                {block.mediaUrl.includes('youtube') || block.mediaUrl.includes('youtu.be') ? (
                                                    <iframe src={block.mediaUrl.replace('watch?v=', 'embed/')} className="w-full h-full print:hidden" frameBorder="0" allowFullScreen></iframe>
                                                ) : (
                                                    <img src={block.mediaUrl} className="max-h-full max-w-full object-contain print:max-h-[300px]" alt="Media"/>
                                                )}
                                                <p className="hidden print:block text-xs text-gray-500 mt-1">رابط الوسائط: {block.mediaUrl}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <textarea 
                                            className="w-full p-2 bg-transparent border rounded hover:bg-white focus:bg-white focus:border-purple-500 outline-none text-gray-700 leading-relaxed min-h-[100px] resize-y print:hidden"
                                            value={block.content}
                                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                                        />
                                        <div className="hidden print:block text-gray-800 leading-relaxed whitespace-pre-wrap text-justify">
                                            {block.content}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 min-h-[300px] print:hidden">
                            <PenTool size={64} className="mb-4 opacity-20"/>
                            <p className="text-lg font-bold">المساحة فارغة</p>
                            <p className="text-sm mb-4">استخدم الذكاء الاصطناعي للتوليد أو أضف عناصر يدوياً.</p>
                            <button onClick={() => setIsAddMenuOpen(true)} className="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-100 flex items-center gap-2">
                                <Plus size={16}/> إضافة يدوية
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonPlanning;
