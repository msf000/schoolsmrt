
import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getExamResults, getReportHeaderConfig } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { 
    Plus, Trash2, Edit, FileQuestion, Save, ArrowLeft, Printer, 
    Library, Copy, BarChart2, CheckCircle, XCircle, Sparkles, Loader2, Wand2, ArrowRight, ShieldCheck, ChevronLeft
} from 'lucide-react';
import ExamPaperGenerator from './ExamPaperGenerator';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'RESULTS' | 'PRINT_PREVIEW'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    const [qText, setQText] = useState('');
    const [qCorrect, setQCorrect] = useState('');
    const [qOptions, setQOptions] = useState(['', '', '', '']);

    useEffect(() => {
        if(currentUser?.id) {
            setExams(getExams(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    const startNew = () => {
        setEditingExam({ 
            id: Date.now().toString(), title: '', subject: subjects[0]?.name || 'عام', 
            gradeLevel: 'الصف الأول المتوسط', durationMinutes: 30, questions: [], 
            isActive: false, createdAt: new Date().toISOString(), teacherId: currentUser.id 
        });
        setView('EDITOR');
    };

    const handleAiGenerateExam = async () => {
        if (!editingExam?.title) return alert('يرجى كتابة موضوع الاختبار أولاً.');
        setIsAiGenerating(true);
        try {
            const questions = await generateStructuredQuiz(editingExam.subject, editingExam.title, editingExam.gradeLevel, 5, 'MEDIUM');
            if (questions && Array.isArray(questions)) {
                const mapped: Question[] = questions.map((q: any) => ({
                    id: Math.random().toString(), text: q.question, type: 'MCQ', options: q.options, correctAnswer: q.correctAnswer, points: 1
                }));
                setEditingExam(prev => prev ? { ...prev, questions: [...prev.questions, ...mapped] } : null);
            }
        } catch (e) { alert('فشل التوليد.'); } finally { setIsAiGenerating(false); }
    };

    const save = () => {
        if(editingExam) { saveExam(editingExam); setExams(getExams(currentUser.id)); setView('LIST'); }
    };

    if (view === 'PRINT_PREVIEW' && editingExam) {
        return <ExamPaperGenerator exam={editingExam} headerConfig={getReportHeaderConfig(currentUser.id)} onBack={() => setView('LIST')} />;
    }

    return (
        <div className="space-y-6 page-enter font-tajawal">
            {view === 'LIST' ? (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">بنك التقييمات</h1>
                            <p className="text-slate-500 text-sm">إدارة الاختبارات والتقييمات الرقمية والورقية.</p>
                        </div>
                        <button onClick={startNew} className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 shadow-sm flex items-center gap-2">
                            <Plus size={18}/> اختبار جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all group flex flex-col h-64">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${exam.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {exam.isActive ? 'نشط أونلاين' : 'مسودة'}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-1.5 text-slate-400 hover:text-brand-500"><Edit size={16}/></button>
                                        <button onClick={()=>{if(confirm('حذف؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1 truncate">{exam.title}</h3>
                                <p className="text-xs text-slate-400 font-medium mb-auto">{exam.subject} • {exam.questions.length} سؤال</p>
                                <div className="pt-4 flex gap-2">
                                    <button onClick={()=>{setEditingExam(exam); setView('PRINT_PREVIEW');}} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-100 flex items-center justify-center gap-1.5 hover:bg-slate-100"><Printer size={14}/> النسخة الورقية</button>
                                    <button className="flex-1 py-2 bg-brand-50 text-brand-600 rounded-lg text-[11px] font-bold border border-brand-100 flex items-center justify-center gap-1.5 hover:bg-brand-100"><BarChart2 size={14}/> النتائج</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : editingExam && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center px-6 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={()=>setView('LIST')} className="p-1.5 hover:bg-white rounded-lg text-slate-500"><ArrowRight/></button>
                            <h3 className="font-bold text-slate-800">محرر التقييم الذكي</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAiGenerateExam} disabled={isAiGenerating} className="px-4 py-2 bg-white text-brand-600 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-brand-50 transition-all">
                                {isAiGenerating ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} توليد بالذكاء الاصطناعي
                            </button>
                            <button onClick={save} className="px-6 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 shadow-sm">حفظ واعتماد</button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-80 border-l p-6 space-y-6 overflow-y-auto bg-slate-50/30">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 mr-1">عنوان الاختبار</label>
                                <input className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-brand-500" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title:e.target.value})} placeholder="مثلاً: الكيمياء العضوية"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 mr-1">المادة</label>
                                <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject:e.target.value})}>
                                    {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <label className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 accent-brand-500" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/>
                                <span className="text-xs font-bold text-slate-700">تفعيل للاختبار الرقمي</span>
                            </label>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white space-y-6">
                            {editingExam.questions.map((q, idx) => (
                                <div key={q.id} className="p-5 border border-slate-100 rounded-2xl relative group bg-slate-50/50">
                                    <button onClick={()=>setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})} className="absolute top-4 left-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    <h4 className="font-bold text-slate-800 text-base mb-4 leading-relaxed"><span className="text-slate-400 mr-1">{idx+1}.</span> {q.text}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {q.options.map(o=>(
                                            <div key={o} className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${o===q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-500'}`}>
                                                {o}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center bg-slate-50/30">
                                <h4 className="font-bold text-slate-600 mb-4 flex items-center gap-2"><Plus size={18}/> إضافة سؤال يدوياً</h4>
                                <textarea className="w-full p-3 border rounded-xl mb-4 text-sm font-medium outline-none focus:bg-white focus:border-brand-500" placeholder="نص السؤال..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                <div className="grid grid-cols-2 gap-3 w-full mb-4">
                                    {qOptions.map((opt, i) => (
                                        <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100">
                                            <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)} className="accent-brand-500"/>
                                            <input className="flex-1 p-1 bg-transparent outline-none text-xs font-bold" placeholder={`خيار ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={()=>{ if(!qText || !qCorrect) return; setEditingExam({...editingExam, questions: [...editingExam.questions, {id:Date.now().toString(), text:qText, type:'MCQ', options:qOptions, correctAnswer:qCorrect, points:1}]}); setQText(''); setQCorrect(''); setQOptions(['','','','']); }} className="px-10 py-2 bg-brand-500 text-white rounded-xl font-bold text-xs hover:bg-brand-600 shadow-md transition-all">إدراج السؤال</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
