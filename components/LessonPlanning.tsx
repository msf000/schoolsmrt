
import React, { useState, useEffect } from 'react';
import { getSubjects, saveLessonPlan, getLessonPlans, deleteLessonPlan, exportToWord } from '../services/storageService';
import { generateLessonBlocks } from '../services/geminiService';
import { LessonBlock, StoredLessonPlan, Subject, SystemUser } from '../types';
// Add missing Zap import
import { 
    Loader2, Save, RefreshCw, BookOpen, Trash2, Plus, PenTool, Image as ImageIcon, 
    Video, Type, ArrowUp, ArrowDown, X, Printer, FileText, Bot, Sparkles, ChevronRight, Layout, Zap
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
];

const LessonPlanning: React.FC<{ currentUser?: SystemUser | null }> = ({ currentUser }) => {
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
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            setSavedPlans(getLessonPlans(currentUser.id));
        }
        if (location.state) {
            const { subject, topic, grade } = location.state as any;
            if (subject) setSelectedSubject(subject);
            if (topic) setLessonTopic(topic);
            if (grade) setSelectedGrade(grade);
        }
    }, [location.state, currentUser]);

    const handleGenerate = async () => {
        if (!selectedSubject || !lessonTopic || !selectedGrade) return alert('الرجاء تعبئة بيانات الدرس الأساسية أولاً.');
        setIsGenerating(true);
        try {
            const blocks = await generateLessonBlocks(selectedSubject, lessonTopic, selectedGrade, { 
                includeActivity: true, includeVideo: true, includeWorksheet: true 
            });
            setLessonContent(blocks);
        } catch (e) { alert('حدث خطأ أثناء التوليد بالذكاء الاصطناعي.'); } finally { setIsGenerating(false); }
    };

    const handleSave = () => {
        if (!currentUser || !lessonTopic) return;
        const newPlan: StoredLessonPlan = {
            id: Date.now().toString(),
            teacherId: currentUser.id,
            subject: selectedSubject,
            topic: lessonTopic,
            contentJson: JSON.stringify(lessonContent),
            resources: [],
            createdAt: new Date().toISOString()
        };
        saveLessonPlan(newPlan);
        setSavedPlans(getLessonPlans(currentUser.id));
        alert('تم حفظ خطة الدرس بنجاح في السحابة.');
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal pb-16">
            {/* Header Area */}
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden print:hidden">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-purple-600 text-white rounded-3xl shadow-xl shadow-purple-100"><PenTool size={32}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">مساعد التحضير الذكي</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">AI Lesson Designer (Gemini)</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => exportToWord('lesson-doc-area', `${lessonTopic}.doc`)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
                        <FileText size={18}/> تصدير Word
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all flex items-center gap-2 shadow-lg">
                        <Printer size={18}/> طباعة PDF
                    </button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-200">
                        <Save size={18}/> حفظ الخطة
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[750px] overflow-hidden">
                {/* Inputs & Settings Sidebar */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col gap-6 overflow-y-auto custom-scrollbar print:hidden">
                    <div className="space-y-6 flex-1">
                        <h3 className="font-black text-slate-800 border-b pb-4 flex items-center gap-3 text-sm"><Layout size={18} className="text-blue-600"/> إعدادات الخطة</h3>
                        
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">المادة الدراسية</label>
                            <select className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-xs outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                <option value="">-- اختر المادة --</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">المرحلة / الصف</label>
                            <select className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-xs outline-none" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                                <option value="">-- اختر الصف --</option>
                                {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">موضوع الدرس</label>
                            <input className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-xs outline-none" placeholder="اكتب عنوان الدرس..." value={lessonTopic} onChange={e => setLessonTopic(e.target.value)}/>
                        </div>

                        <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-100 space-y-4">
                            <div className="flex items-center gap-2 text-purple-700">
                                <Bot size={18}/>
                                <span className="text-[10px] font-black uppercase tracking-widest">AI Engine</span>
                            </div>
                            <p className="text-[10px] text-purple-900 leading-relaxed font-bold">سيقوم الذكاء الاصطناعي ببناء خطة درس متكاملة تشمل (الأهداف، الشرح، الأنشطة، والتقويم) بناءً على المدخلات أعلاه.</p>
                            <button onClick={handleGenerate} disabled={isGenerating || !lessonTopic} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-purple-100 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                                {isGenerating ? 'جاري الصياغة...' : 'توليد التحضير الذكي'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><BookOpen size={14}/> السجلات المحفوظة</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {savedPlans.map(plan => (
                                <button key={plan.id} onClick={() => { setSelectedSubject(plan.subject); setLessonTopic(plan.topic); setLessonContent(JSON.parse(plan.contentJson)); }} className="w-full p-3 bg-slate-50 rounded-xl text-right hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                                    <p className="font-black text-slate-700 text-xs truncate">{plan.topic}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{plan.subject}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Formal Document View */}
                <div id="lesson-doc-area" className="lg:col-span-3 bg-white rounded-[4rem] border shadow-sm overflow-y-auto p-12 custom-scrollbar relative print:p-0 print:border-none print:shadow-none print:overflow-visible">
                    <div className="max-w-4xl mx-auto space-y-12">
                        {/* Doc Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-12">
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-black">المملكة العربية السعودية</p>
                                <p className="text-[10px] font-black">وزارة التعليم</p>
                                <p className="text-xs font-black mt-2">سجل تحضير الدروس الرقمي</p>
                            </div>
                            <div className="text-center flex flex-col items-center">
                                <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mb-4 opacity-80" alt="Moe"/>
                                <h1 className="text-2xl font-black text-slate-900">{lessonTopic || 'اسم الدرس'}</h1>
                            </div>
                            <div className="space-y-1 text-left text-[10px] font-black">
                                <p>المادة: {selectedSubject || '................'}</p>
                                <p>الصف: {selectedGrade || '................'}</p>
                                <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>

                        {/* Content Blocks */}
                        <div className="space-y-10">
                            {lessonContent.length > 0 ? lessonContent.map((block, idx) => (
                                <div key={block.id} className="relative group">
                                    <div className="absolute -right-8 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                        <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-indigo-600"><ArrowUp size={14}/></button>
                                        <button onClick={()=>setLessonContent(lessonContent.filter(b=>b.id!==block.id))} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                    <h3 className="font-black text-lg text-slate-900 border-r-4 border-slate-900 pr-4 mb-4 flex items-center gap-3">
                                        {block.type === 'CONTENT' ? <Type size={18}/> : block.type === 'ACTIVITY' ? <Zap size={18}/> : <ImageIcon size={18}/>}
                                        {block.title}
                                    </h3>
                                    <textarea 
                                        className="w-full bg-transparent border-none p-2 text-slate-700 leading-relaxed min-h-[50px] outline-none font-medium text-lg resize-none" 
                                        value={block.content} 
                                        onChange={e => setLessonContent(lessonContent.map(b => b.id === block.id ? {...b, content: e.target.value} : b))}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                    />
                                </div>
                            )) : (
                                <div className="py-40 flex flex-col items-center justify-center text-slate-200 gap-6">
                                    <PenTool size={100} strokeWidth={1} />
                                    <p className="text-2xl font-black">ابدأ بتعبئة البيانات الجانبية لتوليد الخطة</p>
                                </div>
                            )}
                        </div>

                        {/* Doc Footer */}
                        {lessonContent.length > 0 && (
                            <div className="mt-20 pt-10 border-t-2 border-dotted border-slate-200 flex justify-between items-end">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">توقيع المعلم</p>
                                    <div className="h-12"></div>
                                    <p className="font-black text-slate-800">{currentUser?.name || '...................'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">مصادقة القائد</p>
                                    <div className="h-12"></div>
                                    <p className="font-black text-slate-800">..............................</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonPlanning;
