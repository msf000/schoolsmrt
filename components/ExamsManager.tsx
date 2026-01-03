
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult, Student, ExamType, AchievementMethod } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getExamResults, getStudents } from '../services/storageService';
import { calculateGrowthMetrics } from '../services/analysisService';
import { 
    Plus, Trash2, Edit, Save, ArrowRight, Printer, 
    BarChart2, CheckCircle, Sparkles, Loader2, Calendar, Video, 
    TrendingUp, Download, RefreshCw, Layers, Target, Info, FileText, Activity, Clock, ArrowUpRight, ArrowDownRight, GitCompare
} from 'lucide-react';
import * as XLSX from 'xlsx';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'RESULTS' | 'GROWTH'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

    // Growth Comparison State
    const [preExamId, setPreExamId] = useState('');
    const [postExamId, setPostExamId] = useState('');

    useEffect(() => {
        if(currentUser?.id) {
            setExams(getExams(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser, view]);

    const startNew = () => {
        const now = new Date();
        setEditingExam({ 
            id: Date.now().toString(), title: '', subject: subjects[0]?.name || 'عام', 
            gradeLevel: 'الصف الأول المتوسط', durationMinutes: 30, questions: [], 
            type: ExamType.QUIZ, achievementMethod: AchievementMethod.SCORE_THRESHOLD,
            passingScore: 50,
            isActive: false, createdAt: new Date().toISOString(), teacherId: currentUser.id,
            startDate: now.toISOString().slice(0, 16),
            endDate: new Date(now.getTime() + 86400000).toISOString().slice(0, 16)
        });
        setView('EDITOR');
    };

    const save = () => {
        if(editingExam) { 
            saveExam(editingExam); 
            setView('LIST'); 
        }
    };

    if (view === 'RESULTS' && selectedExamId) {
        const exam = exams.find(e => e.id === selectedExamId);
        if (exam) return <ExamItemAnalysis exam={exam} onBack={() => setView('LIST')} />;
    }

    if (view === 'GROWTH') {
        return <GrowthComparison 
            exams={exams} 
            preId={preExamId} 
            postId={postExamId} 
            onPreChange={setPreExamId} 
            onPostChange={setPostExamId}
            onBack={() => setView('LIST')} 
        />;
    }

    return (
        <div className="space-y-6 page-enter font-tajawal pb-20">
            {view === 'LIST' ? (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">منظومة الاختبارات الذكية</h1>
                            <p className="text-slate-500 text-sm font-medium">إدارة أنواع التقييمات المتعددة وتحليل نتائج الطلاب.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setView('GROWTH')} className="px-6 py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-black border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-2">
                                <GitCompare size={20}/> مقارنة قبلي/بعدي
                            </button>
                            <button onClick={startNew} className="px-8 py-4 bg-brand-500 text-white rounded-2xl text-sm font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95">
                                <Plus size={20}/> إنشاء اختبار جديد
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 hover:border-brand-300 transition-all group flex flex-col h-[400px] relative shadow-sm hover:shadow-xl">
                                <div className="flex justify-between items-start mb-6">
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                        exam.type === ExamType.DIAGNOSTIC ? 'bg-purple-100 text-purple-700' :
                                        exam.type === ExamType.PRE_TEST ? 'bg-amber-100 text-amber-700' :
                                        exam.type === ExamType.POST_TEST ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {exam.type}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-2 bg-slate-50 text-slate-400 hover:text-brand-500 rounded-xl transition-colors"><Edit size={16}/></button>
                                        <button onClick={()=>{if(confirm('حذف الاختبار؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                
                                <div className="mb-6">
                                    <h3 className="font-black text-xl text-slate-800 mb-1 truncate">{exam.title}</h3>
                                    <p className="text-xs text-slate-400 font-bold">{exam.subject} • {exam.questions.length} سؤال</p>
                                </div>

                                <div className="space-y-3 mb-auto">
                                    <div className="flex items-center gap-3 text-slate-600 text-xs font-bold">
                                        <Target size={14} className="text-brand-500"/>
                                        <span>الاعتماد: {exam.achievementMethod === AchievementMethod.COMPLETION ? 'بمجرد الإكمال' : `درجة الاجتياز ${exam.passingScore}%`}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600 text-xs font-bold">
                                        <Clock size={14} className="text-brand-500"/>
                                        <span>المدة: {exam.durationMinutes} دقيقة</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-50">
                                    <button onClick={()=>{setSelectedExamId(exam.id); setView('RESULTS');}} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2">
                                        <BarChart2 size={16}/> تحليل النتائج والفقرات
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : editingExam && view === 'EDITOR' ? (
                <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl flex flex-col h-[850px] overflow-hidden animate-slide-up">
                    <div className="p-8 border-b bg-slate-50 flex justify-between items-center px-12 shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={()=>setView('LIST')} className="p-3 hover:bg-white rounded-2xl text-slate-500 transition-all shadow-sm border border-slate-100"><ArrowRight/></button>
                            <h3 className="font-black text-2xl text-slate-800">إعداد محرك الاختبار</h3>
                        </div>
                        <button onClick={save} className="px-12 py-3 bg-brand-500 text-white rounded-2xl text-xs font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all">حفظ الاختبار</button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-80 border-l p-8 space-y-8 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> إعدادات النوع</h4>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-2">نوع التقييم</label>
                                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={editingExam.type} onChange={e=>setEditingExam({...editingExam, type: e.target.value as ExamType})}>
                                        <option value={ExamType.DIAGNOSTIC}>تشخيصي</option>
                                        <option value={ExamType.PRE_TEST}>قبلي</option>
                                        <option value={ExamType.POST_TEST}>بعدي</option>
                                        <option value={ExamType.QUIZ}>اختبار قصير</option>
                                        <option value={ExamType.PERIODIC}>اختبار فتري</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-2">آلية الإنجاز</label>
                                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={editingExam.achievementMethod} onChange={e=>setEditingExam({...editingExam, achievementMethod: e.target.value as AchievementMethod})}>
                                        <option value={AchievementMethod.COMPLETION}>بالإكمال فقط</option>
                                        <option value={AchievementMethod.SCORE_THRESHOLD}>بناءً على الدرجة</option>
                                    </select>
                                </div>
                                {editingExam.achievementMethod === AchievementMethod.SCORE_THRESHOLD && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-2">درجة الاجتياز (%)</label>
                                        <input type="number" className="w-full p-3 border rounded-xl font-bold text-xs" value={editingExam.passingScore} onChange={e=>setEditingExam({...editingExam, passingScore: Number(e.target.value)})}/>
                                    </div>
                                )}
                            </section>

                            <section className="space-y-4 pt-6 border-t">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> البيانات الأساسية</h4>
                                <input className="w-full p-3 border rounded-xl font-bold text-xs" placeholder="عنوان الاختبار" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title: e.target.value})}/>
                                <select className="w-full p-3 border rounded-xl font-bold text-xs" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject: e.target.value})}>
                                    {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </section>
                        </div>

                        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-white">
                            <div className="space-y-6">
                                {editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group relative">
                                        <button onClick={()=>{setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})}} className="absolute top-4 left-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                        <h5 className="font-black text-slate-800 mb-4">س{idx+1}: {q.text}</h5>
                                        <div className="grid grid-cols-2 gap-2">
                                            {q.options.map(o=>(
                                                <div key={o} className={`p-2 rounded-xl border text-[10px] font-bold ${o===q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}>{o}</div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                
                                <button onClick={()=>{
                                    const text = prompt('نص السؤال؟');
                                    if(text) setEditingExam({...editingExam, questions: [...editingExam.questions, {id: Date.now().toString(), text, type: 'MCQ', options: ['خيار 1','خيار 2','خيار 3','خيار 4'], correctAnswer: 'خيار 1', points: 1}]});
                                }} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-sm hover:bg-slate-50 hover:border-brand-300 transition-all">
                                    + إضافة سؤال جديد يدوياً
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

// واجهة مقارنة النمو (Growth Comparison Engine)
const GrowthComparison: React.FC<{ exams: Exam[], preId: string, postId: string, onPreChange: (id: string) => void, onPostChange: (id: string) => void, onBack: () => void }> = ({ exams, preId, postId, onPreChange, onPostChange, onBack }) => {
    const students = useMemo(() => getStudents(), []);
    
    const preResults = useMemo(() => preId ? getExamResults(preId) : [], [preId]);
    const postResults = useMemo(() => postId ? getExamResults(postId) : [], [postId]);

    const { comparison, avgGrowth } = useMemo(() => {
        return calculateGrowthMetrics(preResults, postResults, students);
    }, [preResults, postResults, students]);

    const exportToExcel = () => {
        const data = comparison.map(c => ({
            'اسم الطالب': c.studentName,
            'درجة القبلي %': `${c.prePct}%`,
            'درجة البعدي %': `${c.postPct}%`,
            'معدل النمو': `${c.growth}%`,
            'الحالة': c.isPositive ? 'تحسن' : 'تراجع'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "مقارنة النمو");
        XLSX.writeFile(wb, `تحليل_نمو_الطلاب.xlsx`);
    };

    return (
        <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl flex flex-col h-[850px] overflow-hidden animate-slide-up font-tajawal">
            <div className="p-8 border-b bg-indigo-900 text-white flex justify-between items-center px-12 shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-2xl border border-white/10"><ArrowRight/></button>
                    <div>
                        <h3 className="text-2xl font-black">محرك مقارنة نواتج التعلم</h3>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Pre/Post Test Growth Engine</p>
                    </div>
                </div>
                <button onClick={exportToExcel} disabled={comparison.length === 0} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <Download size={18}/> تصدير التقرير
                </button>
            </div>

            <div className="p-8 bg-slate-50 border-b flex flex-wrap gap-8 items-center px-12 shrink-0">
                <div className="space-y-1 flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">1. اختر الاختبار القبلي</label>
                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={preId} onChange={e=>onPreChange(e.target.value)}>
                        <option value="">-- اختر اختباراً --</option>
                        {exams.filter(e => e.type === ExamType.PRE_TEST || e.type === ExamType.DIAGNOSTIC).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                </div>
                <div className="text-slate-300 pt-5"><ArrowRight size={24}/></div>
                <div className="space-y-1 flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">2. اختر الاختبار البعدي</label>
                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" value={postId} onChange={e=>onPostChange(e.target.value)}>
                        <option value="">-- اختر اختباراً --</option>
                        {exams.filter(e => e.type === ExamType.POST_TEST || e.type === ExamType.PERIODIC).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                </div>
                <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl text-center min-w-[150px]">
                    <p className="text-[8px] font-black uppercase opacity-60">متوسط نمو الفصل</p>
                    <h4 className="text-3xl font-black">{avgGrowth}%</h4>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                {comparison.length > 0 ? (
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest h-14">
                                <th className="px-8 border-l border-slate-100 w-16 text-center">#</th>
                                <th className="px-8 border-l border-slate-100">اسم الطالب</th>
                                <th className="px-8 border-l border-slate-100 text-center">القبلي %</th>
                                <th className="px-8 border-l border-slate-100 text-center">البعدي %</th>
                                <th className="px-8 text-center">معدل النمو</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {comparison.map((c, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors h-14 font-bold text-sm">
                                    <td className="px-8 text-center text-slate-300 font-mono text-xs border-l">{i + 1}</td>
                                    <td className="px-8 text-slate-700 border-l">{c.studentName}</td>
                                    <td className="px-8 text-center text-slate-400 border-l">{c.prePct}%</td>
                                    <td className="px-8 text-center text-indigo-600 font-black border-l">{c.postPct}%</td>
                                    <td className="px-8 text-center">
                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black ${c.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {c.isPositive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                            {Math.abs(c.growth)}%
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6">
                        <GitCompare size={120} strokeWidth={1} className="opacity-20"/>
                        <p className="text-2xl font-black opacity-30">اختر الاختبارين للمقارنة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// مكون تحليل الفقرات (Item Analysis)
const ExamItemAnalysis: React.FC<{ exam: Exam, onBack: () => void }> = ({ exam, onBack }) => {
    const results = useMemo(() => getExamResults(exam.id), [exam.id]);
    const students = useMemo(() => getStudents(), []);

    const itemStats = useMemo(() => {
        return exam.questions.map(q => {
            const responses = results.map(r => r.answers.find(a => a.questionId === q.id));
            const correctCount = responses.filter(a => a?.isCorrect).length;
            const successRate = results.length > 0 ? (correctCount / results.length) * 100 : 0;
            
            // تحليل المشتتات (Distractor Analysis)
            const optionStats = q.options.map(opt => ({
                text: opt,
                count: responses.filter(a => a?.studentAnswer === opt).length,
                isCorrect: opt === q.correctAnswer
            }));

            return {
                id: q.id,
                text: q.text,
                successRate,
                correctCount,
                optionStats,
                difficulty: successRate > 80 ? 'سهل' : successRate > 40 ? 'متوسط' : 'صعب'
            };
        });
    }, [exam, results]);

    return (
        <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl flex flex-col h-[850px] overflow-hidden animate-fade-in font-tajawal">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center px-12 shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-2xl border border-white/10"><ArrowRight/></button>
                    <div>
                        <h3 className="text-2xl font-black">{exam.title} - تحليل الفقرات</h3>
                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Item Difficulty & Distractor Analytics</p>
                    </div>
                </div>
                <div className="flex gap-10">
                    <div className="text-center">
                        <p className="text-[9px] text-slate-400 uppercase mb-1">المختبرون</p>
                        <p className="text-2xl font-black">{results.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] text-slate-400 uppercase mb-1">متوسط الإتقان</p>
                        <p className="text-2xl font-black text-emerald-400">
                            {results.length > 0 ? Math.round(results.reduce((a,b)=>a+b.score,0)/results.reduce((a,b)=>a+b.totalScore,0)*100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {itemStats.map((stat, idx) => (
                        <div key={stat.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">س{idx+1}</div>
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${
                                    stat.difficulty === 'صعب' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    stat.difficulty === 'سهل' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                }`}>
                                    {stat.difficulty}
                                </span>
                            </div>
                            <p className="font-bold text-slate-800 text-sm mb-6 line-clamp-2 h-10 leading-relaxed">{stat.text}</p>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>نسبة النجاح</span>
                                    <span>{Math.round(stat.successRate)}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${stat.successRate > 70 ? 'bg-emerald-500' : stat.successRate > 40 ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{width: `${stat.successRate}%`}}></div>
                                </div>
                            </div>

                            <div className="space-y-1 mt-auto border-t pt-4">
                                <p className="text-[9px] font-black text-slate-400 mb-2 uppercase">توزيع الاختيارات</p>
                                {stat.optionStats.map((opt, i) => {
                                    const pct = results.length > 0 ? (opt.count / results.length) * 100 : 0;
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="flex-1 h-4 bg-slate-50 rounded overflow-hidden relative">
                                                <div className={`h-full opacity-20 ${opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{width: `${pct}%`}}></div>
                                                <span className={`absolute inset-0 px-2 flex items-center text-[8px] font-black truncate ${opt.isCorrect ? 'text-emerald-700' : 'text-slate-400'}`}>{opt.text}</span>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-400 w-8">{opt.count} ط</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExamsManager;
