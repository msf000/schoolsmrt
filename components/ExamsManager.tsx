
import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getReportHeaderConfig } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { 
    Plus, Trash2, Edit, FileQuestion, Save, ArrowLeft, Printer, 
    Library, Copy, BarChart2, CheckCircle, XCircle, Sparkles, Loader2, Wand2, ArrowRight, ShieldCheck, ChevronLeft, Clock, Settings2
} from 'lucide-react';
import ExamPaperGenerator from './ExamPaperGenerator';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'PRINT_PREVIEW'>('LIST');
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
                            <h1 className="text-2xl font-bold text-slate-900">منصة الاختبارات الإلكترونية</h1>
                            <p className="text-slate-500 text-sm">أنشئ اختبارات تفاعلية، حدد الوقت، وراقب النتائج آلياً.</p>
                        </div>
                        <button onClick={startNew} className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95">
                            <Plus size={18}/> إنشاء اختبار جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all group flex flex-col h-72 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${exam.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                            {exam.isActive ? 'منشور للطلاب' : 'مسودة غير نشطة'}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-2 bg-slate-50 text-slate-400 hover:text-brand-500 rounded-xl"><Edit size={16}/></button>
                                        <button onClick={()=>{if(confirm('حذف الاختبار نهائياً؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-black text-lg text-slate-800 mb-1 truncate">{exam.title}</h3>
                                <p className="text-xs text-slate-400 font-bold mb-4">{exam.subject} • {exam.questions.length} سؤال</p>
                                
                                <div className="flex items-center gap-4 mb-auto">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Clock size={14} className="text-brand-500"/>
                                        <span className="text-xs font-black">{exam.durationMinutes} دقيقة</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <ShieldCheck size={14} className="text-emerald-500"/>
                                        <span className="text-xs font-black">تصحيح آلي</span>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-2 border-t border-slate-50">
                                    <button onClick={()=>{setEditingExam(exam); setView('PRINT_PREVIEW');}} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black border border-slate-100 flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-all"><Printer size={14}/> النسخة الورقية</button>
                                    <button className="flex-1 py-2.5 bg-brand-50 text-brand-600 rounded-xl text-[11px] font-black border border-brand-100 flex items-center justify-center gap-1.5 hover:bg-brand-100 transition-all"><BarChart2 size={14}/> كشف النتائج</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : editingExam && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col h-[800px] overflow-hidden animate-slide-up">
                    <div className="p-6 border-b bg-slate-50 flex justify-between items-center px-10 shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={()=>setView('LIST')} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all shadow-sm"><ArrowRight/></button>
                            <div>
                                <h3 className="font-black text-xl text-slate-800">محرر الاختبارات الذكي</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Exam Design Studio</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAiGenerateExam} disabled={isAiGenerating} className="px-5 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-sm">
                                {isAiGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} توليد المحتوى بـ AI
                            </button>
                            <button onClick={save} className="px-10 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-black hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all">حفظ واعتماد</button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar Settings */}
                        <div className="w-80 border-l p-8 space-y-8 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings2 size={16} className="text-brand-500"/>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إعدادات الجلسة</span>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">عنوان الاختبار</label>
                                <input className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title:e.target.value})} placeholder="مثلاً: اختبار الوحدة الأولى"/>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">المادة الدراسية</label>
                                <select className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-black text-sm outline-none transition-all" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject:e.target.value})}>
                                    {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">مدة الاختبار (بالدقائق)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-slate-300" size={18}/>
                                    <input type="number" className="w-full p-3 pr-4 pl-10 bg-white border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-brand-500 transition-all" value={editingExam.durationMinutes} onChange={e=>setEditingExam({...editingExam, durationMinutes:Number(e.target.value)})}/>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                                    <span className="text-xs font-black text-slate-700">تفعيل الاختبار للطلاب</span>
                                    <input type="checkbox" className="w-5 h-5 accent-brand-500" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/>
                                </label>
                                <p className="text-[9px] text-slate-400 mt-2 px-1">عند التفعيل، سيظهر الاختبار فوراً في بوابة الطلاب.</p>
                            </div>
                        </div>

                        {/* Questions Canvas */}
                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white space-y-8">
                            {editingExam.questions.map((q, idx) => (
                                <div key={q.id} className="p-8 border-2 border-slate-50 rounded-[2.5rem] relative group bg-slate-50/30 hover:bg-white hover:border-brand-100 transition-all shadow-sm">
                                    <button onClick={()=>setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})} className="absolute top-6 left-6 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                    
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-brand-500/20">{idx+1}</div>
                                        <h4 className="font-black text-slate-800 text-lg leading-relaxed">{q.text}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-12">
                                        {q.options.map(o=>(
                                            <div key={o} className={`p-4 rounded-2xl border-2 text-xs font-black transition-all flex items-center justify-between ${o===q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-50 text-slate-400'}`}>
                                                {o}
                                                {o===q.correctAnswer && <CheckCircle size={16}/>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Add New Question Section */}
                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center bg-slate-50/20 transition-all hover:bg-slate-50 hover:border-slate-200">
                                <h4 className="text-xl font-black text-slate-600 mb-8 flex items-center gap-3"><Plus size={24}/> إضافة سؤال جديد يدوياً</h4>
                                <textarea className="w-full p-5 border-2 border-slate-100 rounded-3xl mb-6 text-base font-bold outline-none focus:bg-white focus:border-brand-500 transition-all h-32" placeholder="اكتب نص السؤال هنا..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
                                    {qOptions.map((opt, i) => (
                                        <div key={i} className={`flex gap-3 items-center p-3 rounded-2xl border-2 transition-all ${qCorrect === opt && opt !== '' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}>
                                            <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)} className="w-5 h-5 accent-brand-500"/>
                                            <input className="flex-1 bg-transparent outline-none text-sm font-black" placeholder={`الخيار رقم ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={()=>{ if(!qText || !qCorrect) return alert('الرجاء تعبئة السؤال والخيارات وتحديد الإجابة الصحيحة.'); setEditingExam({...editingExam, questions: [...editingExam.questions, {id:Date.now().toString(), text:qText, type:'MCQ', options:qOptions, correctAnswer:qCorrect, points:1}]}); setQText(''); setQCorrect(''); setQOptions(['','','','']); }} className="px-16 py-4 bg-brand-500 text-white rounded-[2rem] font-black text-lg hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2">إدراج السؤال في الاختبار</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
