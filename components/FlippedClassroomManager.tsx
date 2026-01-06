
import React, { useState, useMemo, useEffect } from 'react';
import { SystemUser, Student, FlippedLesson, Subject, Question, FlippedComment } from '../types';
import { getFlippedLessons, saveFlippedLesson, deleteFlippedLesson, getStudents, getSubjects, addFlippedComment } from '../services/storageService';
import { summarizeFlippedContent, generateFlippedCheckupQuestions } from '../services/geminiService';
import { 
    BookOpen, Plus, Trash2, Video, Globe, Save, 
    Sparkles, Loader2, Users, CheckCircle, Clock, 
    ArrowRight, Activity, TrendingUp, Info, ListChecks, HelpCircle, Eye, X, MessageSquare, Send, BarChart3, AlertCircle
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { formatDualDate } from '../services/dateService';

const FlippedClassroomManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [lessons, setLessons] = useState<FlippedLesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedLessonForDetails, setSelectedLessonForDetails] = useState<FlippedLesson | null>(null);
    const [detailTab, setDetailTab] = useState<'LIST' | 'ANALYTICS' | 'DISCUSSION'>('LIST');
    const [loading, setLoading] = useState(false);
    const [summarizing, setSummarizing] = useState(false);
    const [generatingQs, setGeneratingQs] = useState(false);
    const [replyText, setReplyText] = useState('');

    const [form, setForm] = useState<Partial<FlippedLesson>>({
        title: '', subject: '', className: '', contentBody: '', xpReward: 50, questions: []
    });

    useEffect(() => {
        setLessons(getFlippedLessons(currentUser.id));
        setStudents(getStudents());
        setSubjects(getSubjects(currentUser.id));
    }, [currentUser]);

    const handleAutoSummarize = async () => {
        if (!form.contentBody) return;
        setSummarizing(true);
        try {
            const summary = await summarizeFlippedContent(form.contentBody);
            setForm({ ...form, aiSummary: summary });
            showToast('تم توليد ملخص ذكي للطالب!', 'SUCCESS');
        } finally {
            setSummarizing(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!form.contentBody) return;
        setGeneratingQs(true);
        try {
            const qs = await generateFlippedCheckupQuestions(form.contentBody);
            const formattedQs: Question[] = qs.map((q: any, i: number) => ({
                id: `fq_${Date.now()}_${i}`,
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                type: 'MCQ',
                points: 10
            }));
            setForm({ ...form, questions: formattedQs });
            showToast('تم توليد أسئلة التحقق بنجاح!', 'SUCCESS');
        } finally {
            setGeneratingQs(false);
        }
    };

    const handleSave = async () => {
        if (!form.title || !form.className) return;
        setLoading(true);
        const newLesson: FlippedLesson = {
            id: `flip_${Date.now()}`,
            teacherId: currentUser.id,
            title: form.title!,
            subject: form.subject || 'عام',
            className: form.className!,
            contentUrl: form.contentUrl,
            contentBody: form.contentBody || '',
            aiSummary: form.aiSummary,
            questions: form.questions || [],
            preparedStudentIds: [],
            createdAt: new Date().toISOString(),
            xpReward: form.xpReward || 50
        };
        await saveFlippedLesson(newLesson);
        setLessons(getFlippedLessons(currentUser.id));
        setIsAddModalOpen(false);
        setForm({ title: '', subject: '', className: '', contentBody: '', xpReward: 50, questions: [] });
        setLoading(false);
        showToast('تم نشر درس الفصل المقلوب بنجاح!', 'SUCCESS');
    };

    const handleAddReply = async () => {
        if (!replyText || !selectedLessonForDetails) return;
        const comment: FlippedComment = {
            id: `c_${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            text: replyText,
            createdAt: new Date().toISOString()
        };
        await addFlippedComment(selectedLessonForDetails.id, comment);
        setReplyText('');
        setLessons(getFlippedLessons(currentUser.id));
        setSelectedLessonForDetails(prev => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
    };

    const questionStats = useMemo(() => {
        if (!selectedLessonForDetails?.quizResults || !selectedLessonForDetails.questions) return [];
        return selectedLessonForDetails.questions.map(q => {
            let errorCount = 0;
            // Added explicit type for result object in quizResults record
            Object.values(selectedLessonForDetails.quizResults || {}).forEach((res: { score: number, wrongQuestionIds: string[] }) => {
                if (res.wrongQuestionIds.includes(q.id)) errorCount++;
            });
            const totalRes = Object.keys(selectedLessonForDetails.quizResults || {}).length;
            return {
                id: q.id,
                text: q.text,
                errorRate: totalRes > 0 ? (errorCount / totalRes) * 100 : 0
            };
        });
    }, [selectedLessonForDetails]);

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <TrendingUp className="text-indigo-600" size={36}/> إدارة الفصل المقلوب
                    </h2>
                    <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest">التعلّم الاستباقي • الجاهزية • النقاش</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                    <Plus size={20}/> نشر مادة تعليمية
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-1 pb-10">
                {lessons.map(lesson => {
                    const classStudents = students.filter(s => s.className === lesson.className);
                    const preparedCount = lesson.preparedStudentIds.length;
                    const prepRate = classStudents.length > 0 ? Math.round((preparedCount / classStudents.length) * 100) : 0;

                    return (
                        <div key={lesson.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm relative group overflow-hidden flex flex-col min-h-[350px] hover:border-indigo-300 transition-all">
                            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    {lesson.contentUrl ? <Video size={24}/> : <BookOpen size={24}/>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setSelectedLessonForDetails(lesson)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Eye size={18}/></button>
                                    <button onClick={() => { if(confirm('حذف الدرس؟')){ deleteFlippedLesson(lesson.id); setLessons(getFlippedLessons(currentUser.id)); } }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 mb-2">{lesson.title}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{lesson.subject} • الفصل: {lesson.className}</p>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-auto cursor-pointer" onClick={() => setSelectedLessonForDetails(lesson)}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معدل الجاهزية</span>
                                    <span className="text-sm font-black text-indigo-600">{prepRate}%</span>
                                </div>
                                <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner mb-3">
                                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${prepRate}%` }}></div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-2"><Users size={12}/> {preparedCount} طلاب جاهزون</p>
                                    {(lesson.comments?.length || 0) > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black">+{lesson.comments?.length} استفسارات</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* تفاصيل الجاهزية والتحليل Modal */}
            {selectedLessonForDetails && (
                <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl animate-zoom-in relative flex flex-col overflow-hidden">
                        <header className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl"><TrendingUp size={24}/></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">{selectedLessonForDetails.title}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تحليل البيانات والتشخيص الاستباقي</p>
                                </div>
                            </div>
                            <div className="flex bg-white p-1 rounded-xl border">
                                <button onClick={()=>setDetailTab('LIST')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${detailTab==='LIST'?'bg-indigo-600 text-white shadow-lg':'text-slate-400'}`}>قائمة الطلاب</button>
                                <button onClick={()=>setDetailTab('ANALYTICS')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${detailTab==='ANALYTICS'?'bg-indigo-600 text-white shadow-lg':'text-slate-400'}`}>خارطة الصعوبة</button>
                                <button onClick={()=>setDetailTab('DISCUSSION')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${detailTab==='DISCUSSION'?'bg-indigo-600 text-white shadow-lg':'text-slate-400'}`}>النقاشات</button>
                            </div>
                            <button onClick={() => setSelectedLessonForDetails(null)} className="p-2 hover:bg-slate-200 rounded-full"><X/></button>
                        </header>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {detailTab === 'LIST' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-2">أبطال التحضير (+{selectedLessonForDetails.xpReward} XP)</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {students.filter(s => selectedLessonForDetails.preparedStudentIds.includes(s.id)).map(s => (
                                                <div key={s.id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                                                    <CheckCircle className="text-emerald-500" size={14}/>
                                                    <span className="text-xs font-bold text-emerald-900 truncate">{s.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-2">طلاب بانتظار التحضير</h4>
                                        <div className="grid grid-cols-2 gap-2 opacity-50">
                                            {students.filter(s => s.className === selectedLessonForDetails.className && !selectedLessonForDetails.preparedStudentIds.includes(s.id)).map(s => (
                                                <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <span className="text-xs font-bold text-slate-500 truncate">{s.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'ANALYTICS' && (
                                <div className="space-y-8">
                                    <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-start gap-4">
                                        <AlertCircle className="text-indigo-600 mt-1" size={24}/>
                                        <p className="text-sm text-indigo-900 leading-relaxed font-bold">
                                            بناءً على نتائج "اختبار الجاهزية"، قمنا بتحديد الأسئلة التي واجه الطلاب صعوبة فيها. <br/>
                                            <span className="text-indigo-600">نصيحة: ابدأ حصتك اليوم بشرح هذه النقاط بالتحديد.</span>
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        {questionStats.map((stat, idx) => (
                                            <div key={stat.id} className="bg-white p-5 rounded-2xl border-2 flex flex-col gap-3 shadow-sm" style={{ borderColor: stat.errorRate > 50 ? '#fee2e2' : '#f1f5f9' }}>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-black text-slate-700 text-sm">س{idx+1}: {stat.text}</span>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${stat.errorRate > 50 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>معدل الخطأ: {Math.round(stat.errorRate)}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-1000 ${stat.errorRate > 50 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${stat.errorRate}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'DISCUSSION' && (
                                <div className="flex flex-col h-full gap-6">
                                    <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar max-h-[400px] pr-2">
                                        {(selectedLessonForDetails.comments || []).map(comment => (
                                            <div key={comment.id} className={`flex flex-col gap-1 ${comment.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-4 rounded-2xl text-sm font-bold shadow-sm max-w-[80%] ${comment.userId === currentUser.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none border'}`}>
                                                    <p className="text-[9px] opacity-60 mb-1">{comment.userName}</p>
                                                    <p>{comment.text}</p>
                                                </div>
                                                <span className="text-[8px] text-slate-400 font-bold">{formatDualDate(comment.createdAt)}</span>
                                            </div>
                                        ))}
                                        {(selectedLessonForDetails.comments || []).length === 0 && (
                                            <div className="py-20 text-center text-slate-300 italic opacity-50">لا يوجد تساؤلات من الطلاب بعد.</div>
                                        )}
                                    </div>
                                    <div className="flex gap-3 p-4 bg-slate-50 rounded-2xl border shrink-0">
                                        <input className="flex-1 bg-white p-3 rounded-xl border text-sm font-bold outline-none" placeholder="اكتب رداً توضيحياً للطلاب..." value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddReply()}/>
                                        <button onClick={handleAddReply} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700"><Send size={20}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-zoom-in my-10">
                        <div className="flex justify-between items-center mb-8 border-b pb-6">
                            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <Sparkles className="text-indigo-600"/> إرسال مادة تعلم استباقي
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ArrowRight className="rotate-180"/></button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">عنوان الدرس</label><input className="w-full p-3 border rounded-xl bg-slate-50" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="مثلاً: وظائف الخلية"/></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">الفصل المستهدف</label><select className="w-full p-3 border rounded-xl bg-slate-50 font-bold" value={form.className} onChange={e=>setForm({...form, className: e.target.value})}><option value="">-- اختر --</option>{Array.from(new Set(students.map(s=>s.className))).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                            </div>
                            
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">المادة</label><select className="w-full p-3 border rounded-xl bg-slate-50 font-bold" value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})}><option value="">-- اختر --</option>{subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>

                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">رابط محتوى خارجي (فيديو YouTube/ملف)</label><input className="w-full p-3 border rounded-xl bg-slate-50 font-mono text-xs" value={form.contentUrl} onChange={e=>setForm({...form, contentUrl: e.target.value})} placeholder="https://youtube.com/..."/></div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">المحتوى التعليمي (شرح أو نص)</label>
                                    <div className="flex gap-4">
                                        <button onClick={handleAutoSummarize} disabled={summarizing || !form.contentBody} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:underline disabled:opacity-30">
                                            {summarizing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} تلخيص AI
                                        </button>
                                        <button onClick={handleGenerateQuestions} disabled={generatingQs || !form.contentBody} className="text-[10px] font-black text-purple-600 flex items-center gap-1 hover:underline disabled:opacity-30">
                                            {generatingQs ? <Loader2 size={12} className="animate-spin"/> : <ListChecks size={12}/>} توليد أسئلة جاهزية
                                        </button>
                                    </div>
                                </div>
                                <textarea className="w-full p-4 border rounded-2xl bg-slate-50 h-32 text-sm leading-relaxed" value={form.contentBody} onChange={e=>setForm({...form, contentBody: e.target.value})} placeholder="اكتب الشرح أو المصطلحات الهامة هنا..."/>
                            </div>

                            <div className="pt-4">
                                <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2">
                                    {loading ? <Loader2 className="animate-spin"/> : <Save/>} نشر الدرس للطلاب
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlippedClassroomManager;
