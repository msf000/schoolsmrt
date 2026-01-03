
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult, Student } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getReportHeaderConfig, getExamResults, getStudents } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { 
    Plus, Trash2, Edit, FileQuestion, Save, ArrowLeft, Printer, 
    Library, Copy, BarChart2, CheckCircle, XCircle, Sparkles, Loader2, Wand2, ArrowRight, ShieldCheck, ChevronLeft, Clock, Settings2, Calendar, Video, Globe, AlertCircle, Users, Activity
} from 'lucide-react';
import ExamPaperGenerator from './ExamPaperGenerator';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'PRINT_PREVIEW' | 'LIVE_MONITOR'>('LIST');
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
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        setEditingExam({ 
            id: Date.now().toString(), title: '', subject: subjects[0]?.name || 'عام', 
            gradeLevel: 'الصف الأول المتوسط', durationMinutes: 30, questions: [], 
            isActive: false, createdAt: new Date().toISOString(), teacherId: currentUser.id,
            startDate: now.toISOString().slice(0, 16),
            endDate: tomorrow.toISOString().slice(0, 16),
            isLive: false,
            streamUrl: ''
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
        if(editingExam) { 
            saveExam(editingExam); 
            setExams(getExams(currentUser.id)); 
            setView('LIST'); 
        }
    };

    if (view === 'PRINT_PREVIEW' && editingExam) {
        return <ExamPaperGenerator exam={editingExam} headerConfig={getReportHeaderConfig(currentUser.id)} onBack={() => setView('LIST')} />;
    }

    if (view === 'LIVE_MONITOR' && editingExam) {
        return <LiveMonitor exam={editingExam} onBack={() => setView('LIST')} />;
    }

    const isExamLive = (exam: Exam) => {
        if (!exam.startDate || !exam.endDate) return false;
        const now = new Date();
        return now >= new Date(exam.startDate) && now <= new Date(exam.endDate);
    };

    return (
        <div className="space-y-6 page-enter font-tajawal pb-20">
            {view === 'LIST' ? (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">منصة الاختبارات الذكية</h1>
                            <p className="text-slate-500 text-sm">أدوات متطورة للجدولة الزمنية والبث المباشر للاختبارات.</p>
                        </div>
                        <button onClick={startNew} className="px-6 py-3 bg-brand-500 text-white rounded-2xl text-sm font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95">
                            <Plus size={20}/> إنشاء اختبار جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => {
                            const active = isExamLive(exam);
                            return (
                                <div key={exam.id} className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all group flex flex-col h-80 relative overflow-hidden ${active ? 'border-emerald-500 shadow-emerald-100 shadow-2xl' : 'border-slate-100 hover:border-brand-300 shadow-sm'}`}>
                                    {active && (
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white px-6 py-1.5 rounded-bl-[1.5rem] flex items-center gap-2 text-[10px] font-black animate-pulse z-10">
                                            <div className="w-2 h-2 bg-white rounded-full"></div> جاري الآن (Live)
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${exam.isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                                {exam.isActive ? 'منشور للطلاب' : 'مسودة'}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-2 bg-slate-50 text-slate-400 hover:text-brand-500 rounded-xl"><Edit size={16}/></button>
                                            <button onClick={()=>{if(confirm('حذف الاختبار؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-black text-lg text-slate-800 mb-1 truncate">{exam.title}</h3>
                                    <p className="text-xs text-slate-400 font-bold mb-4">{exam.subject} • {exam.questions.length} سؤال</p>
                                    
                                    <div className="space-y-2 mb-auto">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar size={14} className="text-brand-500"/>
                                            <span className="text-[10px] font-bold">يبدأ: {exam.startDate ? new Date(exam.startDate).toLocaleString('ar-SA') : 'غير محدد'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={14} className="text-brand-500"/>
                                            <span className="text-[10px] font-bold">المدة: {exam.durationMinutes} دقيقة</span>
                                        </div>
                                        {exam.isLive && (
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <Video size={14}/>
                                                <span className="text-[10px] font-black">مدعوم ببث مرئي</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 flex gap-2 border-t border-slate-50">
                                        <button onClick={()=>{setEditingExam(exam); setView('PRINT_PREVIEW');}} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black border border-slate-100 flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-all"><Printer size={14}/> ورقي</button>
                                        <button onClick={()=>{setEditingExam(exam); setView('LIVE_MONITOR');}} className="flex-1 py-2.5 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black border border-brand-100 flex items-center justify-center gap-1.5 hover:bg-brand-100 transition-all"><Activity size={14}/> متابعة</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : editingExam && view === 'EDITOR' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col h-[850px] overflow-hidden animate-slide-up">
                    <div className="p-6 border-b bg-slate-50 flex flex-wrap justify-between items-center px-10 shrink-0 gap-4">
                        <div className="flex items-center gap-6">
                            <button onClick={()=>setView('LIST')} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-all shadow-sm"><ArrowRight/></button>
                            <div>
                                <h3 className="font-black text-xl text-slate-800">تجهيز الاختبار المجدول</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart Scheduling Suite</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAiGenerateExam} disabled={isAiGenerating} className="px-5 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-sm">
                                {isAiGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} توليد المحتوى بـ AI
                            </button>
                            <button onClick={save} className="px-10 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-black hover:bg-brand-600 shadow-xl">حفظ الاختبار</button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Advanced Scheduling */}
                        <div className="w-80 border-l p-8 space-y-8 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar size={16} className="text-brand-500"/>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">توقيت الاختبار</span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 mb-1 mr-1">وقت البدء</label>
                                        <input type="datetime-local" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/5 transition-all" value={editingExam.startDate} onChange={e=>setEditingExam({...editingExam, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 mb-1 mr-1">وقت الانتهاء</label>
                                        <input type="datetime-local" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/5 transition-all" value={editingExam.endDate} onChange={e=>setEditingExam({...editingExam, endDate: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Video size={16} className="text-rose-500"/>
                                        <span className="text-[10px] font-black text-slate-700">بث حي (Live)</span>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-brand-500" checked={editingExam.isLive} onChange={e=>setEditingExam({...editingExam, isLive: e.target.checked})}/>
                                </div>
                                {editingExam.isLive && (
                                    <div className="animate-fade-in">
                                        <label className="block text-[9px] font-black text-slate-400 mb-1 mr-1">رابط الاجتماع (Zoom/Teams)</label>
                                        <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none dir-ltr" placeholder="https://..." value={editingExam.streamUrl} onChange={e=>setEditingExam({...editingExam, streamUrl: e.target.value})} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> النشر والبيانات</h4>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 mb-1">عنوان الاختبار</label>
                                    <input className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 mb-1">المادة</label>
                                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject: e.target.value})}>
                                        {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl cursor-pointer border border-indigo-100">
                                    <span className="text-[10px] font-black text-indigo-700 uppercase">تفعيل فوري</span>
                                    <input type="checkbox" className="w-5 h-5 accent-brand-500" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/>
                                </label>
                            </div>
                        </div>

                        {/* Questions Canvas */}
                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white space-y-8">
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl border border-dashed border-slate-200">
                                <AlertCircle size={18} className="text-slate-400"/>
                                <p className="text-[10px] font-black text-slate-500">سيتم حفظ الدرجات آلياً في سجل الرصد (PLATFORM_EXAM) فور انتهاء الطالب.</p>
                            </div>

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
                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center bg-slate-50/20">
                                <h4 className="text-xl font-black text-slate-600 mb-8 flex items-center gap-3"><Plus size={24}/> إضافة سؤال يدوي</h4>
                                <textarea className="w-full p-5 border-2 border-slate-100 rounded-3xl mb-6 text-base font-bold outline-none focus:bg-white focus:border-brand-500 transition-all h-32" placeholder="اكتب نص السؤال هنا..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
                                    {qOptions.map((opt, i) => (
                                        <div key={i} className={`flex gap-3 items-center p-3 rounded-2xl border-2 transition-all ${qCorrect === opt && opt !== '' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}>
                                            <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)} className="w-5 h-5 accent-brand-500"/>
                                            <input className="flex-1 bg-transparent outline-none text-sm font-black" placeholder={`الخيار ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={()=>{ if(!qText || !qCorrect) return alert('أكمل السؤال والخيارات.'); setEditingExam({...editingExam, questions: [...editingExam.questions, {id:Date.now().toString(), text:qText, type:'MCQ', options:qOptions, correctAnswer:qCorrect, points:1}]}); setQText(''); setQCorrect(''); setQOptions(['','','','']); }} className="px-16 py-4 bg-brand-500 text-white rounded-[2rem] font-black text-lg hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2">إدراج السؤال</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// واجهة المراقبة الحية الجديدة
const LiveMonitor: React.FC<{ exam: Exam, onBack: () => void }> = ({ exam, onBack }) => {
    const [results, setResults] = useState<ExamResult[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    useEffect(() => {
        setResults(getExamResults(exam.id));
        setStudents(getStudents());
        const interval = setInterval(() => setResults(getExamResults(exam.id)), 5000);
        return () => clearInterval(interval);
    }, [exam.id]);

    const stats = useMemo(() => {
        if (results.length === 0) return { avg: 0, highest: 0 };
        const avg = results.reduce((a, b) => a + b.score, 0) / results.length;
        const highest = Math.max(...results.map(r => r.score));
        return { avg: Math.round(avg), highest };
    }, [results]);

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col h-[750px] overflow-hidden animate-fade-in font-tajawal">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center px-10">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ArrowRight/></button>
                    <div>
                        <h3 className="text-xl font-black">{exam.title} - مراقب الأداء</h3>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Live Result Stream</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">المتوسط</p>
                        <p className="text-xl font-black text-indigo-400">{stats.avg}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">أعلى درجة</p>
                        <p className="text-xl font-black text-emerald-400">{stats.highest}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map(res => {
                        const student = students.find(s => s.id === res.studentId);
                        const pct = (res.score / res.totalScore) * 100;
                        return (
                            <div key={res.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 shadow-sm">{student?.name.charAt(0)}</div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-sm truncate w-32">{student?.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold">{new Date(res.date).toLocaleTimeString('ar-SA')}</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <div className={`text-2xl font-black ${pct >= 90 ? 'text-emerald-500' : pct >= 70 ? 'text-indigo-500' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                        {res.score}
                                    </div>
                                    <p className="text-[9px] font-black text-slate-300">من {res.totalScore}</p>
                                </div>
                            </div>
                        );
                    })}
                    {results.length === 0 && (
                        <div className="col-span-full py-40 text-center text-slate-200 flex flex-col items-center gap-6">
                            <Users size={100} strokeWidth={1} className="opacity-20"/>
                            <h3 className="text-2xl font-black opacity-40 uppercase tracking-widest">بانتظار تسليم الطلاب...</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamsManager;
