
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
    const [selectedResults, setSelectedResults] = useState<ExamResult[]>([]);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    // Question Form
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
            id: Date.now().toString(), 
            title: '', 
            subject: subjects[0]?.name || '', 
            gradeLevel: 'الصف الأول المتوسط', 
            durationMinutes: 30, 
            questions: [], 
            isActive: false, 
            createdAt: new Date().toISOString(), 
            teacherId: currentUser.id 
        });
        setView('EDITOR');
    };

    const handleAiGenerateExam = async () => {
        if (!editingExam?.title || !editingExam?.subject) return alert('يرجى كتابة عنوان الاختبار واختيار المادة أولاً.');
        setIsAiGenerating(true);
        try {
            const questions = await generateStructuredQuiz(editingExam.subject, editingExam.title, editingExam.gradeLevel, 5, 'MEDIUM');
            if (questions && Array.isArray(questions)) {
                const mappedQuestions: Question[] = questions.map((q: any) => ({
                    id: Math.random().toString(),
                    text: q.question || q.text,
                    type: 'MCQ',
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    points: 1
                }));
                setEditingExam(prev => prev ? { ...prev, questions: [...prev.questions, ...mappedQuestions] } : null);
                alert('تم توليد الأسئلة بنجاح!');
            }
        } catch (e) { alert('فشل توليد الاختبار ذكياً.'); } finally { setIsAiGenerating(false); }
    };

    const save = () => {
        if(editingExam) { 
            saveExam(editingExam); 
            setExams(getExams(currentUser.id)); 
            setView('LIST'); 
        }
    };

    if (view === 'PRINT_PREVIEW' && editingExam) {
        return <ExamPaperGenerator exam={editingExam} headerConfig={getReportHeaderConfig(currentUser.id)} onBack={() => setView('LIST')} />;
    }

    return (
        <div className="space-y-8 animate-fade-in font-tajawal pb-16 h-full flex flex-col">
            {view === 'LIST' && (
                <>
                    <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-full bg-slate-900/5 -skew-x-12 translate-x-16"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200">
                                <FileQuestion size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800">بنك الاختبارات</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Registry of Official Assessments</p>
                            </div>
                        </div>
                        <button onClick={startNew} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 relative z-10">
                            <Plus size={20}/> تصميم اختبار جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto custom-scrollbar pb-10 flex-1">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-8 rounded-[3rem] border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-80">
                                <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${exam.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                        {exam.isActive ? 'نشط أونلاين' : 'مسودة مؤقتة'}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit size={20}/></button>
                                        <button onClick={()=>{if(confirm('حذف الاختبار؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                                <h3 className="font-black text-2xl text-slate-800 mb-2 truncate">{exam.title}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">{exam.subject} • {exam.questions.length} سؤال تقييمي</p>
                                <div className="mt-auto flex gap-3">
                                    <button onClick={()=>{setEditingExam(exam); setView('PRINT_PREVIEW');}} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg"><Printer size={16}/> النسخة الورقية</button>
                                    <button onClick={()=>{setSelectedResults(getExamResults(exam.id)); setEditingExam(exam); setView('RESULTS')}} className="flex-1 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100 transition-all"><BarChart2 size={16}/> النتائج</button>
                                </div>
                            </div>
                        ))}
                        {exams.length === 0 && (
                            <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-200 opacity-40">
                                <Library size={120} strokeWidth={1} />
                                <p className="text-3xl font-black mt-8 italic">لا توجد اختبارات مسجلة في البنك</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="bg-white rounded-[4rem] border shadow-2xl flex-1 flex flex-col overflow-hidden animate-slide-up relative">
                    <div className="p-8 bg-slate-900 text-white border-b flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={()=>setView('LIST')} className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-white/10"><ArrowRight/></button>
                            <div>
                                <h3 className="font-black text-xl">منصة بناء الاختبارات الذكية</h3>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mt-1">AI Integrated Exam Studio</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleAiGenerateExam} disabled={isAiGenerating} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl disabled:opacity-50 transition-all">
                                {isAiGenerating ? <Loader2 className="animate-spin" size={18}/> : <Wand2 size={18}/>}
                                {isAiGenerating ? 'جاري بناء التقييم...' : 'توليد ذكي (Gemini AI)'}
                            </button>
                            <button onClick={save} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl transition-all">
                                <Save size={18}/> اعتماد وحفظ
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-96 border-l bg-slate-50/50 p-10 space-y-8 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">موضوع الاختبار</label>
                                <input className="w-full p-5 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] font-black bg-white shadow-sm outline-none transition-all text-lg" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title:e.target.value})} placeholder="مثلاً: الكيمياء العضوية"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">المادة</label>
                                <select className="w-full p-4 border rounded-2xl bg-white font-black text-sm outline-none shadow-sm" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject:e.target.value})}>
                                    {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-10 border-t border-slate-200">
                                <div className="bg-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden">
                                    <ShieldCheck className="absolute -bottom-4 -left-4 opacity-10" size={100}/>
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="font-black text-xs">متاح للاختبار الرقمي</span>
                                        <div className={`w-12 h-6 rounded-full transition-all relative ${editingExam.isActive ? 'bg-emerald-500' : 'bg-white/20'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingExam.isActive ? 'right-7' : 'right-1'}`}></div>
                                        </div>
                                        <input type="checkbox" className="hidden" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-white">
                            <div className="space-y-8 mb-20">
                                {editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[3rem] relative group hover:shadow-xl transition-all animate-slide-up">
                                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg">{idx+1}</div>
                                        <button onClick={()=>setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})} className="absolute top-6 left-6 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                                        <h4 className="font-black text-slate-800 text-xl mb-8 leading-relaxed">{q.text}</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {q.options.map(o=>(
                                                <div key={o} className={`p-4 rounded-2xl border-2 font-bold text-sm flex justify-between items-center transition-all ${o===q.correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md scale-[1.02]' : 'bg-white border-slate-50 text-slate-400'}`}>
                                                    {o}
                                                    {o===q.correctAnswer && <CheckCircle size={18} fill="currentColor" className="text-emerald-500"/>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-indigo-50/50 p-12 rounded-[4rem] border-4 border-dashed border-indigo-100 flex flex-col items-center">
                                <h4 className="font-black text-indigo-900 mb-8 flex items-center gap-3 text-lg"><Plus size={24}/> بناء سؤال يدوياً</h4>
                                <textarea className="w-full p-6 border-none rounded-3xl mb-6 text-lg font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 shadow-inner min-h-[120px]" placeholder="اكتب نص السؤال هنا..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10">
                                    {qOptions.map((opt, i) => (
                                        <div key={i} className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all focus-within:border-indigo-400">
                                            <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)} className="w-6 h-6 accent-indigo-600 cursor-pointer"/>
                                            <input className="flex-1 p-2 bg-transparent outline-none font-bold text-slate-700" placeholder={`خيار ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={()=>{ if(!qText || !qCorrect) return; setEditingExam({...editingExam, questions: [...editingExam.questions, {id:Date.now().toString(), text:qText, type:'MCQ', options:qOptions, correctAnswer:qCorrect, points:1}]}); setQText(''); setQCorrect(''); setQOptions(['','','','']); }} className="px-20 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">إدراج السؤال في التقييم</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
