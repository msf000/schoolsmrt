
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult, Student } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getReportHeaderConfig, getExamResults, getStudents } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { 
    Plus, Trash2, Edit, FileQuestion, Save, ArrowLeft, Printer, 
    Library, Copy, BarChart2, CheckCircle, XCircle, Sparkles, Loader2, Wand2, ArrowRight, ShieldCheck, ChevronLeft, Clock, Settings2, Calendar, Video, Globe, AlertCircle, Users, Activity, TrendingUp, Download, RefreshCw
} from 'lucide-react';
import ExamPaperGenerator from './ExamPaperGenerator';
import * as XLSX from 'xlsx';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'PRINT_PREVIEW' | 'LIVE_MONITOR' | 'RESULTS'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    const [qText, setQText] = useState('');
    const [qCorrect, setQCorrect] = useState('');
    const [qOptions, setQOptions] = useState(['', '', '', '']);

    useEffect(() => {
        if(currentUser?.id) {
            setExams(getExams(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser, view]);

    const startNew = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(tomorrow.getHours() + 24);

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

    const isExamLive = (exam: Exam) => {
        if (!exam.startDate || !exam.endDate || !exam.isActive) return false;
        const now = new Date();
        return now >= new Date(exam.startDate) && now <= new Date(exam.endDate);
    };

    if (view === 'PRINT_PREVIEW' && editingExam) {
        return <ExamPaperGenerator exam={editingExam} headerConfig={getReportHeaderConfig(currentUser.id)} onBack={() => setView('LIST')} />;
    }

    if (view === 'LIVE_MONITOR' && selectedExamId) {
        const exam = exams.find(e => e.id === selectedExamId);
        if (exam) return <LiveMonitor exam={exam} onBack={() => setView('LIST')} />;
    }

    if (view === 'RESULTS' && selectedExamId) {
        const exam = exams.find(e => e.id === selectedExamId);
        if (exam) return <ExamResultsReport exam={exam} onBack={() => setView('LIST')} />;
    }

    return (
        <div className="space-y-6 page-enter font-tajawal pb-20">
            {view === 'LIST' ? (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">إدارة الاختبارات الذكية</h1>
                            <p className="text-slate-500 text-sm font-medium">جدولة الاختبارات، البث الحي، وتحليل النتائج التفصيلي.</p>
                        </div>
                        <button onClick={startNew} className="px-8 py-4 bg-brand-500 text-white rounded-2xl text-sm font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95">
                            <Plus size={20}/> إنشاء اختبار جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => {
                            const active = isExamLive(exam);
                            const resultsCount = getExamResults(exam.id).length;
                            return (
                                <div key={exam.id} className={`bg-white p-7 rounded-[3rem] border-2 transition-all group flex flex-col h-[420px] relative overflow-hidden ${active ? 'border-emerald-500 shadow-emerald-100 shadow-2xl scale-[1.02]' : 'border-slate-100 hover:border-brand-300 shadow-sm'}`}>
                                    {active && (
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white px-8 py-2 rounded-bl-[2rem] flex items-center gap-2 text-[10px] font-black animate-pulse z-10 shadow-lg">
                                            <div className="w-2 h-2 bg-white rounded-full"></div> بث حي (Live)
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${exam.isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                            {exam.isActive ? 'منشور للطلاب' : 'مسودة'}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand-500 rounded-xl transition-colors"><Edit size={16}/></button>
                                            <button onClick={()=>{if(confirm('حذف الاختبار؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <h3 className="font-black text-xl text-slate-800 mb-1 truncate">{exam.title}</h3>
                                        <p className="text-xs text-slate-400 font-bold">{exam.subject} • {exam.questions.length} سؤال</p>
                                    </div>

                                    <div className="space-y-3 mb-auto">
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="p-2 bg-slate-50 rounded-lg"><Calendar size={14} className="text-brand-500"/></div>
                                            <span className="text-[11px] font-bold">البدء: {new Date(exam.startDate!).toLocaleString('ar-SA', {month:'short', day:'numeric', hour:'numeric', minute:'numeric'})}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="p-2 bg-slate-50 rounded-lg"><Clock size={14} className="text-brand-500"/></div>
                                            <span className="text-[11px] font-bold">المدة: {exam.durationMinutes} دقيقة</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="p-2 bg-slate-50 rounded-lg"><Users size={14} className="text-brand-500"/></div>
                                            <span className="text-[11px] font-bold">الاستجابات: <span className="text-brand-600 font-black">{resultsCount}</span> طالب</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 grid grid-cols-2 gap-2 border-t border-slate-50">
                                        {active ? (
                                            <button onClick={()=>{setSelectedExamId(exam.id); setView('LIVE_MONITOR');}} className="col-span-2 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                                                <Activity size={16}/> دخول غرفة المراقبة
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={()=>{setEditingExam(exam); setView('PRINT_PREVIEW');}} className="py-3 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                                                    <Printer size={16}/> النسخة الورقية
                                                </button>
                                                <button onClick={()=>{setSelectedExamId(exam.id); setView('RESULTS');}} className="py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black border border-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all">
                                                    <TrendingUp size={16}/> عرض النتائج
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : view === 'EDITOR' && editingExam ? (
                <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl flex flex-col h-[850px] overflow-hidden animate-slide-up">
                    <div className="p-8 border-b bg-slate-50 flex flex-wrap justify-between items-center px-12 shrink-0 gap-6">
                        <div className="flex items-center gap-6">
                            <button onClick={()=>setView('LIST')} className="p-3 hover:bg-white rounded-2xl text-slate-500 transition-all shadow-sm border border-slate-100"><ArrowRight/></button>
                            <div>
                                <h3 className="font-black text-2xl text-slate-800">تجهيز الاختبار المجدول</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart Scheduling Suite</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAiGenerateExam} disabled={isAiGenerating} className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-sm">
                                {isAiGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} توليد المحتوى بـ AI
                            </button>
                            <button onClick={save} className="px-12 py-3 bg-brand-500 text-white rounded-2xl text-xs font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all">حفظ الاختبار</button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Advanced Scheduling */}
                        <div className="w-80 border-l p-8 space-y-8 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-brand-500"><Calendar size={18}/></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نافذة الاختبار الزمنية</span>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-2 mr-1">وقت البدء الرسمي</label>
                                        <input type="datetime-local" className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/5 transition-all shadow-sm" value={editingExam.startDate} onChange={e=>setEditingExam({...editingExam, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-2 mr-1">وقت الإغلاق التلقائي</label>
                                        <input type="datetime-local" className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/5 transition-all shadow-sm" value={editingExam.endDate} onChange={e=>setEditingExam({...editingExam, endDate: e.target.value})} />
                                    </div>
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                        <p className="text-[10px] text-amber-700 font-bold leading-relaxed">تنبيه: سيتم منع أي طالب من بدء الاختبار بعد موعد الإغلاق، وسيتم تسليم الإجابات المفتوحة تلقائياً.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-50 rounded-xl text-rose-500"><Video size={18}/></div>
                                        <span className="text-[11px] font-black text-slate-700">بث مراقبة حي</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editingExam.isLive} onChange={e=>setEditingExam({...editingExam, isLive: e.target.checked})}/>
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                    </label>
                                </div>
                                {editingExam.isLive && (
                                    <div className="animate-fade-in space-y-2">
                                        <label className="block text-[9px] font-black text-slate-400 mr-1">رابط الاجتماع (Zoom/Teams/Meet)</label>
                                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none dir-ltr focus:bg-white transition-all" placeholder="https://..." value={editingExam.streamUrl} onChange={e=>setEditingExam({...editingExam, streamUrl: e.target.value})} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> البيانات الأساسية</h4>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 mb-1">عنوان الاختبار</label>
                                    <input className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none shadow-sm" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 mb-1">المادة</label>
                                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none shadow-sm" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject: e.target.value})}>
                                        {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center justify-between p-5 bg-indigo-600 rounded-[1.5rem] cursor-pointer shadow-lg shadow-indigo-200 mt-6">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">تفعيل الاختبار</span>
                                    <input type="checkbox" className="w-6 h-6 accent-white" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/>
                                </label>
                            </div>
                        </div>

                        {/* Questions Canvas */}
                        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-white space-y-10">
                            <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-dashed border-slate-200">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500"><AlertCircle size={24}/></div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm">أتمتة الرصد الذكي</h4>
                                    <p className="text-[10px] font-bold text-slate-400">سيقوم النظام بتصحيح إجابات الطلاب فورياً ورصد الدرجات في التبويب الخاص بـ (PLATFORM_EXAM).</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="p-8 border-2 border-slate-50 rounded-[3rem] relative group bg-slate-50/20 hover:bg-white hover:border-brand-100 transition-all shadow-sm">
                                        <button onClick={()=>setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})} className="absolute top-8 left-8 p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                                        
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-xl">{idx+1}</div>
                                            <h4 className="font-black text-slate-800 text-xl leading-relaxed">{q.text}</h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-16">
                                            {q.options.map(o=>(
                                                <div key={o} className={`p-5 rounded-2xl border-2 text-sm font-black transition-all flex items-center justify-between ${o===q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-50 text-slate-400'}`}>
                                                    {o}
                                                    {o===q.correctAnswer && <CheckCircle size={18}/>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add New Question Section */}
                            <div className="p-12 border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center bg-slate-50/10">
                                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-slate-300 mb-8"><Plus size={40}/></div>
                                <h4 className="text-2xl font-black text-slate-600 mb-10">إدراج سؤال جديد يدوياً</h4>
                                
                                <div className="w-full max-w-2xl space-y-8">
                                    <textarea className="w-full p-6 border-2 border-slate-100 rounded-3xl text-lg font-bold outline-none focus:bg-white focus:border-brand-500 transition-all h-32 shadow-inner" placeholder="اكتب نص السؤال هنا..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {qOptions.map((opt, i) => (
                                            <div key={i} className={`flex gap-4 items-center p-4 rounded-[1.5rem] border-2 transition-all ${qCorrect === opt && opt !== '' ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-100 shadow-sm'}`}>
                                                <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)} className="w-6 h-6 accent-brand-500"/>
                                                <input className="flex-1 bg-transparent outline-none text-base font-black" placeholder={`خيار الإجابة ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={()=>{ if(!qText || !qCorrect) return alert('أكمل السؤال والخيارات.'); setEditingExam({...editingExam, questions: [...editingExam.questions, {id:Date.now().toString(), text:qText, type:'MCQ', options:qOptions, correctAnswer:qCorrect, points:1}]}); setQText(''); setQCorrect(''); setQOptions(['','','','']); }} className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl hover:bg-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                        تثبيت السؤال في المسودة <ArrowLeft size={24}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

// واجهة المراقبة الحية (Live Monitor)
const LiveMonitor: React.FC<{ exam: Exam, onBack: () => void }> = ({ exam, onBack }) => {
    const [results, setResults] = useState<ExamResult[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        const update = () => {
            setResults(getExamResults(exam.id));
            setStudents(getStudents());
            setLastUpdate(new Date());
        };
        update();
        const interval = setInterval(update, 5000);
        return () => clearInterval(interval);
    }, [exam.id]);

    const stats = useMemo(() => {
        if (results.length === 0) return { avg: 0, highest: 0, finishedCount: 0 };
        const avg = results.reduce((a, b) => a + b.score, 0) / results.length;
        const highest = Math.max(...results.map(r => r.score));
        return { avg: Math.round(avg), highest, finishedCount: results.length };
    }, [results]);

    const classTotal = students.filter(s => s.className === 'عام' || !s.className).length; // تبسيط للغرض الحالي
    const progressPct = Math.round((stats.finishedCount / (classTotal || 1)) * 100);

    return (
        <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl flex flex-col h-[800px] overflow-hidden animate-fade-in font-tajawal">
            <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center px-12 gap-8 shrink-0">
                <div className="flex items-center gap-8">
                    <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-white/10"><ArrowRight/></button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                             <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                             <h3 className="text-2xl font-black">{exam.title} - مراقبة حية</h3>
                        </div>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em]">Real-time Student Progress Stream</p>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <MonitorKPI label="المتوسط" value={stats.avg} color="text-indigo-400" />
                    <MonitorKPI label="أعلى درجة" value={stats.highest} color="text-emerald-400" />
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">اكتمال الفصل</p>
                        <div className="flex items-center gap-3">
                             <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{width: `${progressPct}%`}}></div>
                             </div>
                             <span className="font-black text-lg">{progressPct}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
                <div className="flex justify-between items-center mb-8">
                    <h4 className="font-black text-slate-800 flex items-center gap-3"><Users size={20} className="text-brand-500"/> حالة الطلاب الآن</h4>
                    <span className="text-[10px] font-black text-slate-400 flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                        <RefreshCw size={12} className="animate-spin-slow"/> آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {results.map(res => {
                        const student = students.find(s => s.id === res.studentId);
                        const pct = (res.score / res.totalScore) * 100;
                        return (
                            <div key={res.id} className="p-6 bg-white rounded-[2.5rem] border-2 border-slate-100 flex flex-col hover:border-brand-500 hover:shadow-xl transition-all shadow-sm group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 shadow-inner group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">{student?.name.charAt(0)}</div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-sm truncate w-24">{student?.name}</h4>
                                            <p className="text-[9px] text-slate-400 font-bold">{new Date(res.date).toLocaleTimeString('ar-SA')}</p>
                                        </div>
                                    </div>
                                    <CheckCircle size={20} className="text-emerald-500 drop-shadow-sm"/>
                                </div>
                                <div className="mt-auto flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">الدرجة النهائية</p>
                                        <div className={`text-4xl font-black ${pct >= 85 ? 'text-emerald-500' : pct >= 60 ? 'text-indigo-500' : 'text-rose-500'}`}>
                                            {res.score}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1 rounded-lg text-[10px] font-black text-slate-400 border">من {res.totalScore}</div>
                                </div>
                            </div>
                        );
                    })}
                    {results.length === 0 && (
                        <div className="col-span-full py-48 text-center text-slate-200 flex flex-col items-center gap-8">
                            <Activity size={120} strokeWidth={1} className="opacity-10 animate-pulse"/>
                            <div>
                                <h3 className="text-3xl font-black opacity-30">بانتظار تسليم الطلاب...</h3>
                                <p className="text-slate-400 text-sm font-bold mt-2">ستظهر النتائج هنا فور انتهاء أول طالب من الحل.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {exam.isLive && exam.streamUrl && (
                <div className="p-6 bg-rose-600 text-white flex justify-between items-center px-12 shrink-0 shadow-2xl z-20">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse"><Video size={20}/></div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest">بث المراقبة المرئية نشط</p>
                            <p className="text-[10px] opacity-70 font-bold">يمكن للطلاب الانضمام للرابط للمتابعة</p>
                        </div>
                     </div>
                     <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="bg-white text-rose-600 px-8 py-2.5 rounded-xl font-black text-xs hover:bg-rose-50 transition-all shadow-xl">فتح نافذة البث المباشر</a>
                </div>
            )}
        </div>
    );
};

// واجهة تحليل النتائج (Results Report)
const ExamResultsReport: React.FC<{ exam: Exam, onBack: () => void }> = ({ exam, onBack }) => {
    const results = useMemo(() => getExamResults(exam.id), [exam.id]);
    const students = useMemo(() => getStudents(), []);

    const exportToExcel = () => {
        const data = results.map((r, i) => ({
            '#': i + 1,
            'اسم الطالب': students.find(s => s.id === r.studentId)?.name || 'مجهول',
            'الدرجة': r.score,
            'الدرجة الكلية': r.totalScore,
            'النسبة': `${Math.round((r.score / r.totalScore) * 100)}%`,
            'التاريخ': new Date(r.date).toLocaleString('ar-SA')
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "النتائج");
        XLSX.writeFile(wb, `نتائج_اختبار_${exam.title}.xlsx`);
    };

    return (
        <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl flex flex-col h-[800px] overflow-hidden animate-slide-up font-tajawal">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center px-12 shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 hover:bg-white rounded-2xl text-slate-500 shadow-sm border border-slate-100"><ArrowRight/></button>
                    <div>
                        <h3 className="font-black text-2xl text-slate-800">تقرير نتائج: {exam.title}</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Performance & Skill Analytics Report</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportToExcel} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 transition-all">
                        <Download size={16}/> تصدير Excel
                    </button>
                    <button onClick={()=>window.print()} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-xl flex items-center gap-2 hover:bg-black transition-all">
                        <Printer size={16}/> طباعة PDF
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="p-8 bg-indigo-600 text-white rounded-[2.5rem] shadow-xl relative overflow-hidden">
                             <TrendingUp className="absolute bottom-[-20px] left-[-20px] opacity-10" size={150}/>
                             <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">متوسط إتقان الفصل</p>
                             <h4 className="text-6xl font-black">{results.length > 0 ? Math.round((results.reduce((a,b)=>a+b.score,0)/results.reduce((a,b)=>a+b.totalScore,0))*100) : 0}%</h4>
                         </div>
                         <div className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] flex flex-col justify-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي المختبرين</p>
                             <div className="flex items-end gap-3">
                                <span className="text-5xl font-black text-slate-800">{results.length}</span>
                                <span className="text-xl font-bold text-slate-400 mb-1">طالب</span>
                             </div>
                         </div>
                         <div className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] flex flex-col justify-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">أعلى درجة محققة</p>
                             <div className="flex items-end gap-3 text-emerald-600">
                                <span className="text-5xl font-black">{results.length > 0 ? Math.max(...results.map(r=>r.score)) : 0}</span>
                                <span className="text-xl font-bold mb-1">/{exam.questions.length}</span>
                             </div>
                         </div>
                    </div>

                    <div className="bg-white border rounded-[3rem] shadow-sm overflow-hidden">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest h-14">
                                    <th className="px-8 border-l border-slate-100 w-16 text-center">#</th>
                                    <th className="px-8 border-l border-slate-100">اسم الطالب</th>
                                    <th className="px-8 border-l border-slate-100 text-center">الدرجة</th>
                                    <th className="px-8 border-l border-slate-100 text-center">النسبة</th>
                                    <th className="px-8 text-center">وقت التسليم</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map((r, i) => {
                                    const s = students.find(x => x.id === r.studentId);
                                    const pct = (r.score / r.totalScore) * 100;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors h-14 font-bold text-sm">
                                            <td className="px-8 text-center text-slate-300 font-mono text-xs border-l">{i + 1}</td>
                                            <td className="px-8 text-slate-700 border-l">{s?.name || 'مجهول'}</td>
                                            <td className="px-8 text-center text-brand-600 font-black border-l">{r.score} <span className="text-slate-300 text-[10px]">/ {r.totalScore}</span></td>
                                            <td className="px-8 text-center border-l">
                                                <span className={`px-4 py-1 rounded-lg text-[10px] font-black ${pct >= 85 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {Math.round(pct)}%
                                                </span>
                                            </td>
                                            <td className="px-8 text-center text-slate-400 text-xs">{new Date(r.date).toLocaleTimeString('ar-SA')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MonitorKPI = ({ label, value, color }: any) => (
    <div className="text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
        <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
);

export default ExamsManager;
