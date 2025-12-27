
import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getExamResults } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { 
    Plus, Trash2, Edit, FileQuestion, Save, ArrowLeft, Printer, 
    Library, Copy, BarChart2, CheckCircle, XCircle, Sparkles, Loader2, Wand2 
} from 'lucide-react';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'RESULTS'>('LIST');
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
        } catch (e) {
            alert('فشل توليد الاختبار ذكياً.');
        } finally {
            setIsAiGenerating(false);
        }
    };

    const addQ = () => {
        if(!qText || !qCorrect) return;
        const newQ: Question = { id: Math.random().toString(), text: qText, type: 'MCQ', options: qOptions, correctAnswer: qCorrect, points: 1 };
        setEditingExam(prev => prev ? ({ ...prev, questions: [...prev.questions, newQ] }) : null);
        setQText(''); setQCorrect(''); setQOptions(['', '', '', '']);
    };

    const save = () => {
        if(editingExam) { 
            saveExam(editingExam); 
            setExams(getExams(currentUser.id)); 
            setView('LIST'); 
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            {view === 'LIST' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-10 shrink-0">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><FileQuestion className="text-purple-600" size={32}/> بنك الاختبارات</h2>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">إدارة التقييمات الرقمية والورقية</p>
                        </div>
                        <button onClick={startNew} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                            <Plus size={20}/> اختبار جديد
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-10">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                                <div className="flex justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {exam.isActive ? 'نشط أونلاين' : 'مسودة'}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit size={18}/></button>
                                        <button onClick={()=>{if(confirm('حذف الاختبار؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                                <h3 className="font-black text-xl text-slate-800 mb-2 truncate">{exam.title}</h3>
                                <p className="text-xs text-slate-400 font-bold mb-6">{exam.subject} • {exam.questions.length} سؤال</p>
                                <div className="flex gap-2">
                                    <button onClick={()=>{setEditingExam(exam); window.print();}} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-black flex items-center justify-center gap-1 border hover:bg-white transition-all"><Printer size={16}/> طباعة</button>
                                    <button onClick={()=>{setSelectedResults(getExamResults(exam.id)); setEditingExam(exam); setView('RESULTS')}} className="flex-1 py-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 border border-indigo-100 hover:bg-indigo-100 transition-all"><BarChart2 size={16}/> النتائج</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="bg-white rounded-[3rem] border shadow-2xl flex-1 flex flex-col overflow-hidden animate-slide-up relative">
                    <div className="p-6 bg-slate-900 text-white border-b flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={()=>setView('LIST')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft/></button>
                            <h3 className="font-black text-lg">محرر الاختبارات الذكي</h3>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAiGenerateExam} disabled={isAiGenerating} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg disabled:opacity-50">
                                {isAiGenerating ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                                {isAiGenerating ? 'جاري التوليد...' : 'توليد أسئلة (AI)'}
                            </button>
                            <button onClick={save} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg">
                                <Save size={16}/> حفظ التعديلات
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-80 border-l bg-slate-50 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">عنوان الاختبار / موضوع الدرس</label>
                                <input className="w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-black bg-white shadow-sm outline-none transition-all" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title:e.target.value})} placeholder="مثلاً: الخلية النباتية"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المادة الدراسية</label>
                                <select className="w-full p-4 border rounded-2xl bg-white font-black text-sm outline-none shadow-sm" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject:e.target.value})}>
                                    {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-6 border-t border-slate-200">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-12 h-6 rounded-full transition-all relative ${editingExam.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingExam.isActive ? 'right-7' : 'right-1'}`}></div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/>
                                    <span className="text-xs font-black text-slate-700">تفعيل للاختبار أونلاين</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
                            <div className="space-y-6 mb-12">
                                {editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="p-6 bg-slate-50 border rounded-3xl relative group hover:border-indigo-200 transition-all">
                                        <button onClick={()=>setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})} className="absolute top-4 left-4 text-red-100 group-hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                        <p className="font-black text-slate-800 text-lg mb-4">س{idx+1}: {q.text}</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {q.options.map(o=>(
                                                <div key={o} className={`p-3 rounded-2xl border text-sm font-bold flex justify-between items-center ${o===q.correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-100 text-slate-500'}`}>
                                                    {o}
                                                    {o===q.correctAnswer && <CheckCircle size={16}/>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border-2 border-dashed border-indigo-200">
                                <h4 className="font-black text-indigo-900 mb-6 flex items-center gap-2"><Plus size={20}/> إضافة سؤال يدوياً</h4>
                                <textarea className="w-full p-4 border rounded-2xl mb-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="نص السؤال..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {qOptions.map((opt, i) => (
                                        <div key={i} className="flex gap-3 items-center">
                                            <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)} className="w-5 h-5 accent-indigo-600"/>
                                            <input className="flex-1 p-3 border rounded-xl text-xs font-bold bg-white" placeholder={`الخيار ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addQ} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all">إدراج في مسودة الاختبار</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
