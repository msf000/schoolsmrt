
import React, { useState, useEffect, useMemo } from 'react';
import { generateLessonBlocks, regenerateSingleBlock } from '../services/geminiService';
import { 
    saveLessonPlan, getLessonPlans, deleteLessonPlan, 
    getCurriculumUnits, getCurriculumLessons, getMicroConcepts, getSubjects
} from '../services/storageService';
import { StoredLessonPlan, CurriculumUnit, CurriculumLesson, LessonBlock } from '../types';
import { 
    BookOpen, PenTool, Loader2, Copy, Printer, CheckCircle, Sparkles, 
    Layout, Clock, FileText, ArrowRight, ArrowLeft, Settings, Check, List, 
    AlertTriangle, Calendar, Target, ListTree, BookOpenCheck, Save, Trash2, 
    Link, Video, Image as ImageIcon, MoveUp, MoveDown, Plus, Search, Grid,
    ToggleLeft, ToggleRight, MoreVertical, X, RefreshCw, Hash, FileQuestion
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MOCK_MEDIA = [
    { type: 'IMAGE', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400', title: 'مجرة درب التبانة' },
    { type: 'IMAGE', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400', title: 'الأرض من الفضاء' },
    { type: 'VIDEO', url: 'https://www.youtube.com/embed/HdPzOWlLrbE', title: 'نشأة الكون (وثائقي)' },
    { type: 'IMAGE', url: 'https://images.unsplash.com/photo-1614730341194-75c60740a070?w=400', title: 'صخور نارية' },
];

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي (السنة المشتركة)", 
    "الصف الثاني الثانوي (مسارات)", 
    "الصف الثالث الثانوي (مسارات)"
];

const LessonPlanning: React.FC = () => {
    // Layout State
    const [activeTab, setActiveTab] = useState<'STUDIO' | 'MY_PLANS'>('STUDIO');
    
    // User & Data Context
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [curriculumLessons, setCurriculumLessons] = useState<CurriculumLesson[]>([]);
    const [myPlans, setMyPlans] = useState<StoredLessonPlan[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Studio Settings (Right Column)
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    
    // Curriculum Selection instead of Manual Topic
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const [topic, setTopic] = useState(''); // This will be derived from selectedLessonId mostly

    const [settings, setSettings] = useState({
        includeActivity: true,
        includeVideo: false,
        includeWorksheet: false
    });
    
    // Canvas Data (Middle Column)
    const [blocks, setBlocks] = useState<LessonBlock[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [regeneratingBlockId, setRegeneratingBlockId] = useState<string | null>(null);
    
    // Previous Lesson Data
    const [prevPlan, setPrevPlan] = useState<StoredLessonPlan | null>(null);

    // Initialization
    useEffect(() => {
        if (currentUser?.id) {
            setUnits(getCurriculumUnits(currentUser.id));
            setCurriculumLessons(getCurriculumLessons());
            setMyPlans(getLessonPlans(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser?.id, activeTab]);

    // Fetch Previous Lesson when Subject/Grade changes
    useEffect(() => {
        if (selectedSubject && selectedGrade) {
            const plans = getLessonPlans(currentUser.id)
                .filter(p => p.subject === selectedSubject) // Note: Grade level isn't strictly stored in StoredLessonPlan, usually implied by Subject context or topic
                .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            if (plans.length > 0) {
                setPrevPlan(plans[0]);
            } else {
                setPrevPlan(null);
            }
        }
    }, [selectedSubject, selectedGrade, currentUser.id]);

    // Filter Logic
    const filteredUnits = useMemo(() => {
        return units.filter(u => u.subject === selectedSubject && u.gradeLevel === selectedGrade).sort((a,b) => a.orderIndex - b.orderIndex);
    }, [units, selectedSubject, selectedGrade]);

    const filteredLessons = useMemo(() => {
        return curriculumLessons.filter(l => l.unitId === selectedUnitId).sort((a,b) => a.orderIndex - b.orderIndex);
    }, [curriculumLessons, selectedUnitId]);

    // Update Topic when Lesson Selected
    useEffect(() => {
        const lesson = curriculumLessons.find(l => l.id === selectedLessonId);
        if (lesson) setTopic(lesson.title);
    }, [selectedLessonId, curriculumLessons]);

    // --- ACTIONS ---

    const handleGenerate = async () => {
        if (!topic || !selectedSubject) return alert('الرجاء اختيار المادة والدرس من القائمة');
        
        setIsGenerating(true);
        try {
            // Get Learning Standards for this lesson
            const currentLesson = curriculumLessons.find(l => l.id === selectedLessonId);
            const standards = currentLesson ? currentLesson.learningStandards : [];

            const newBlocks = await generateLessonBlocks(
                selectedSubject, 
                topic, 
                selectedGrade, 
                settings,
                standards
            );
            setBlocks(newBlocks);
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء التوليد');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateBlock = async (block: LessonBlock) => {
        setRegeneratingBlockId(block.id);
        try {
            const prevContent = block.content;
            const newContent = await regenerateSingleBlock(
                block.type, 
                block.title, 
                { subject: selectedSubject, topic: topic, grade: selectedGrade, prevContent }
            );
            
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: newContent } : b));
        } catch (e) {
            alert('فشل التحديث');
        } finally {
            setRegeneratingBlockId(null);
        }
    };

    const handleSavePlan = () => {
        if (blocks.length === 0 || !topic) return;
        const jsonContent = JSON.stringify(blocks);
        
        const newPlan: StoredLessonPlan = {
            id: Date.now().toString(),
            teacherId: currentUser.id,
            lessonId: selectedLessonId || undefined,
            subject: selectedSubject,
            topic: topic,
            contentJson: jsonContent, // Storing Blocks JSON structure
            resources: [], 
            createdAt: new Date().toISOString()
        };
        saveLessonPlan(newPlan);
        setMyPlans(getLessonPlans(currentUser.id));
        alert('تم حفظ خطة الدرس بنجاح!');
    };

    const loadPlan = (plan: StoredLessonPlan) => {
        try {
            const loadedBlocks = JSON.parse(plan.contentJson);
            if (Array.isArray(loadedBlocks)) {
                setBlocks(loadedBlocks);
                setTopic(plan.topic);
                setSelectedSubject(plan.subject);
                // Try to find Unit/Lesson based on IDs if possible, otherwise just set Strings
                if (plan.lessonId) {
                    setSelectedLessonId(plan.lessonId);
                    const lesson = curriculumLessons.find(l => l.id === plan.lessonId);
                    if (lesson) setSelectedUnitId(lesson.unitId);
                }
                setActiveTab('STUDIO');
            } else {
                setBlocks([{ id: 'legacy', type: 'CONTENT', title: 'محتوى الدرس', content: plan.contentJson }]);
                setActiveTab('STUDIO');
            }
        } catch (e) {
            setBlocks([{ id: 'legacy', type: 'CONTENT', title: 'محتوى الدرس', content: plan.contentJson }]);
            setActiveTab('STUDIO');
        }
    };

    const handleDeletePlan = (id: string) => {
        if(confirm('حذف الخطة؟')) {
            deleteLessonPlan(id);
            setMyPlans(getLessonPlans(currentUser.id));
        }
    };

    // --- BLOCK MANIPULATION ---

    const moveBlock = (index: number, direction: 'UP' | 'DOWN') => {
        const newBlocks = [...blocks];
        if (direction === 'UP' && index > 0) {
            [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
        } else if (direction === 'DOWN' && index < newBlocks.length - 1) {
            [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        }
        setBlocks(newBlocks);
    };

    const deleteBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const updateBlockContent = (id: string, newContent: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
    };

    const addMediaBlock = (media: { type: string, url: string, title: string }) => {
        const newBlock: LessonBlock = {
            id: Date.now().toString(),
            type: 'MEDIA',
            title: media.title,
            content: media.type === 'VIDEO' ? `فيديو تعليمي: ${media.title}` : `صورة توضيحية: ${media.title}`,
            mediaUrl: media.url
        };
        setBlocks([...blocks, newBlock]);
    };

    // --- RENDERERS ---

    const renderBlock = (block: LessonBlock, index: number) => {
        const isRegenerating = regeneratingBlockId === block.id;
        return (
            <div key={block.id} className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all mb-4 overflow-hidden relative break-inside-avoid ${isRegenerating ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
                {/* Block Header */}
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center handle cursor-move print:hidden">
                    <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-2
                        ${block.type === 'OBJECTIVES' ? 'bg-blue-100 text-blue-700' : 
                          block.type === 'INTRO' ? 'bg-amber-100 text-amber-700' :
                          block.type === 'MEDIA' ? 'bg-purple-100 text-purple-700' : 
                          block.type === 'ACTIVITY' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`
                    }>
                        {block.type === 'MEDIA' ? <Video size={12}/> : <FileText size={12}/>}
                        {block.title}
                    </span>
                    
                    <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleRegenerateBlock(block)} 
                            disabled={isRegenerating}
                            className={`p-1.5 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 ${isRegenerating ? 'animate-spin text-indigo-600' : ''}`}
                            title="إعادة صياغة (AI)"
                        >
                            <RefreshCw size={14}/>
                        </button>
                        <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                        <button onClick={() => moveBlock(index, 'UP')} className="p-1 hover:bg-gray-200 rounded text-gray-500" disabled={index === 0}><MoveUp size={14}/></button>
                        <button onClick={() => moveBlock(index, 'DOWN')} className="p-1 hover:bg-gray-200 rounded text-gray-500" disabled={index === blocks.length - 1}><MoveDown size={14}/></button>
                        <button onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-red-100 text-red-500 rounded"><X size={14}/></button>
                    </div>
                </div>

                {/* Block Content */}
                <div className="p-4 relative">
                    {isRegenerating && (
                        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-indigo-600 text-sm font-bold flex items-center gap-2"><Sparkles className="animate-spin" size={16}/> جاري إعادة الصياغة...</span>
                        </div>
                    )}
                    {block.type === 'MEDIA' && block.mediaUrl ? (
                        <div className="flex flex-col items-center">
                            {block.content.includes('فيديو') ? (
                                <iframe src={block.mediaUrl} className="w-full aspect-video rounded-lg shadow-sm print:hidden" allowFullScreen></iframe>
                            ) : (
                                <img src={block.mediaUrl} alt={block.title} className="max-h-64 rounded-lg shadow-sm object-contain"/>
                            )}
                            <p className="text-sm text-gray-500 mt-2">{block.content}</p>
                        </div>
                    ) : (
                        <textarea 
                            className="w-full min-h-[80px] outline-none text-gray-700 text-sm leading-relaxed resize-y bg-transparent print:border-none print:resize-none"
                            value={block.content}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 animate-fade-in">
            {/* Top Bar */}
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-20 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white"><PenTool size={20}/></div>
                    <div>
                        <h2 className="font-bold text-gray-800">استوديو الدروس الذكي</h2>
                        <p className="text-xs text-gray-500">صمم دروسك باستخدام الذكاء الاصطناعي وتوزيع المنهج</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('STUDIO')} 
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'STUDIO' ? 'bg-gray-100 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        المحرر
                    </button>
                    <button 
                        onClick={() => setActiveTab('MY_PLANS')} 
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'MY_PLANS' ? 'bg-gray-100 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        خططي المحفوظة
                    </button>
                </div>
            </div>

            {activeTab === 'MY_PLANS' ? (
                <div className="p-8 overflow-y-auto print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {myPlans.map(plan => (
                            <div key={plan.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-lg text-gray-800 line-clamp-1">{plan.topic}</h4>
                                    <div className="flex gap-1">
                                        <button onClick={() => loadPlan(plan)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FileText size={16}/></button>
                                        <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 mb-2">
                                    <span className="block font-bold text-indigo-600">{plan.subject}</span>
                                    <span className="text-xs">{new Date(plan.createdAt).toLocaleDateString('ar-SA')}</span>
                                </div>
                            </div>
                        ))}
                        {myPlans.length === 0 && <div className="col-span-full text-center text-gray-400 py-20">لا توجد خطط محفوظة.</div>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT COLUMN: Media Library (Mock) */}
                    <div className="w-64 bg-white border-l border-gray-200 flex flex-col z-10 shadow-sm hidden md:flex print:hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><ImageIcon size={16}/> مكتبة الوسائط</h3>
                            <div className="mt-2 relative">
                                <Search size={14} className="absolute top-2.5 right-2 text-gray-400"/>
                                <input className="w-full pl-2 pr-8 py-2 bg-gray-50 border rounded text-xs" placeholder="بحث صور/فيديو..."/>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {MOCK_MEDIA.map((media, i) => (
                                <div key={i} className="group relative rounded-lg overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                                    <img src={media.type === 'VIDEO' ? `https://img.youtube.com/vi/${media.url.split('/').pop()}/0.jpg` : media.url} className="w-full h-24 object-cover" />
                                    <div className="p-2 bg-white text-xs font-bold text-gray-700 truncate">{media.title}</div>
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => addMediaBlock(media)} className="bg-white text-indigo-600 p-1.5 rounded-full hover:scale-110 transition-transform">
                                            <Plus size={16}/>
                                        </button>
                                    </div>
                                    {media.type === 'VIDEO' && <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"><Video size={10}/></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MIDDLE COLUMN: The Canvas (Editor) */}
                    <div className="flex-1 bg-gray-100 overflow-y-auto p-8 custom-scrollbar print:p-0 print:bg-white print:overflow-visible">
                        <div className="max-w-3xl mx-auto min-h-[600px] print:w-full print:max-w-none">
                            {/* Empty State */}
                            {blocks.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-2xl p-10 bg-gray-50/50 print:hidden">
                                    <Sparkles size={48} className="mb-4 opacity-20"/>
                                    <h3 className="text-xl font-bold text-gray-500 mb-2">مساحة العمل فارغة</h3>
                                    <p className="text-sm">اختر الوحدة والدرس من القائمة اليمنى لبدء التحضير الذكي.</p>
                                </div>
                            )}

                            {/* Header for Print only */}
                            <div className="hidden print:block mb-8 text-center border-b pb-4">
                                <h1 className="text-2xl font-bold text-black">{topic}</h1>
                                <p className="text-gray-600">{selectedSubject} - {selectedGrade}</p>
                            </div>

                            {/* Blocks Rendering */}
                            {blocks.map((block, idx) => renderBlock(block, idx))}

                            {/* Add Block Manually */}
                            {blocks.length > 0 && (
                                <div className="flex justify-center mt-8 pb-20 print:hidden">
                                    <button onClick={() => setBlocks([...blocks, { id: Date.now().toString(), type: 'CONTENT', title: 'فقرة جديدة', content: '' }])} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full shadow-sm hover:shadow hover:text-indigo-600 transition-all font-bold text-sm flex items-center gap-2">
                                        <Plus size={16}/> إضافة كتلة يدوياً
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Settings & Controls */}
                    <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm overflow-y-auto custom-scrollbar print:hidden">
                        <div className="p-5 border-b bg-indigo-50">
                            <h3 className="font-bold text-indigo-900 mb-1">إعدادات التحضير</h3>
                            <p className="text-xs text-indigo-600">بيانات الدرس من المنهج</p>
                        </div>
                        
                        <div className="p-5 space-y-5">
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

                            {/* Curriculum Cascading Dropdowns */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">الوحدة</label>
                                <select 
                                    className="w-full p-2.5 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={selectedUnitId}
                                    onChange={e => { setSelectedUnitId(e.target.value); setSelectedLessonId(''); }}
                                    disabled={!selectedSubject || !selectedGrade}
                                >
                                    <option value="">-- اختر الوحدة --</option>
                                    {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                                    عنوان الدرس <span className="text-xs font-normal text-gray-400">(الموضوع)</span>
                                </label>
                                <select 
                                    className="w-full p-2.5 bg-white border-2 border-indigo-100 rounded-lg text-sm font-bold text-indigo-900 outline-none focus:border-indigo-500"
                                    value={selectedLessonId}
                                    onChange={e => setSelectedLessonId(e.target.value)}
                                    disabled={!selectedUnitId}
                                >
                                    <option value="">-- اختر الدرس --</option>
                                    {filteredLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                </select>
                            </div>

                            {/* Previous Lesson Context */}
                            {prevPlan && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1"><Clock size={12}/> الدرس السابق:</span>
                                        <button onClick={() => loadPlan(prevPlan)} className="text-[10px] bg-white border px-2 py-0.5 rounded hover:text-blue-600">عرض</button>
                                    </div>
                                    <p className="text-xs text-blue-600 line-clamp-1">{prevPlan.topic}</p>
                                </div>
                            )}

                            <div className="space-y-3 pt-2 border-t">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">نشاط حركي/تفاعلي</span>
                                    {settings.includeActivity ? 
                                        <ToggleRight size={24} className="text-indigo-600" onClick={() => setSettings({...settings, includeActivity: false})}/> : 
                                        <ToggleLeft size={24} className="text-gray-300" onClick={() => setSettings({...settings, includeActivity: true})}/>
                                    }
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">اقتراح فيديو</span>
                                    {settings.includeVideo ? 
                                        <ToggleRight size={24} className="text-indigo-600" onClick={() => setSettings({...settings, includeVideo: false})}/> : 
                                        <ToggleLeft size={24} className="text-gray-300" onClick={() => setSettings({...settings, includeVideo: true})}/>
                                    }
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">فكرة ورقة عمل</span>
                                    {settings.includeWorksheet ? 
                                        <ToggleRight size={24} className="text-indigo-600" onClick={() => setSettings({...settings, includeWorksheet: false})}/> : 
                                        <ToggleLeft size={24} className="text-gray-300" onClick={() => setSettings({...settings, includeWorksheet: true})}/>
                                    }
                                </label>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !topic}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
                            >
                                {isGenerating ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                                {isGenerating ? 'جاري البناء...' : 'توليد التحضير (AI)'}
                            </button>

                            {blocks.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                                    <button onClick={handleSavePlan} className="py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-1">
                                        <Save size={14}/> حفظ
                                    </button>
                                    <button onClick={() => window.print()} className="py-2 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-black flex items-center justify-center gap-1">
                                        <Printer size={14}/> طباعة
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPlanning;
