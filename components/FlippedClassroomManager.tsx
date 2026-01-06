
import React, { useState, useMemo, useEffect } from 'react';
import { SystemUser, Student, FlippedLesson, Subject } from '../types';
import { getFlippedLessons, saveFlippedLesson, deleteFlippedLesson, getStudents, getSubjects } from '../services/storageService';
import { summarizeFlippedContent } from '../services/geminiService';
import { 
    BookOpen, Plus, Trash2, Video, Globe, Save, 
    Sparkles, Loader2, Users, CheckCircle, Clock, 
    ArrowRight, Activity, TrendingUp, Info
} from 'lucide-react';
import { useToast } from './ToastProvider';

const FlippedClassroomManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [lessons, setLessons] = useState<FlippedLesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summarizing, setSummarizing] = useState(false);

    const [form, setForm] = useState<Partial<FlippedLesson>>({
        title: '', subject: '', className: '', contentBody: '', xpReward: 50
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
            preparedStudentIds: [],
            createdAt: new Date().toISOString(),
            xpReward: form.xpReward || 50
        };
        await saveFlippedLesson(newLesson);
        setLessons(getFlippedLessons(currentUser.id));
        setIsAddModalOpen(false);
        setForm({ title: '', subject: '', className: '', contentBody: '', xpReward: 50 });
        setLoading(false);
        showToast('تم نشر درس الفصل المقلوب بنجاح!', 'SUCCESS');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <TrendingUp className="text-indigo-600" size={36}/> إدارة الفصل المقلوب
                    </h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">تفعيل التعلم الاستباقي وتتبع الجاهزية</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                    <Plus size={20}/> إرسال محتوى جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                {lessons.map(lesson => {
                    const classStudents = students.filter(s => s.className === lesson.className);
                    const preparedCount = lesson.preparedStudentIds.length;
                    const prepRate = classStudents.length > 0 ? Math.round((preparedCount / classStudents.length) * 100) : 0;

                    return (
                        <div key={lesson.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm relative group overflow-hidden flex flex-col min-h-[350px]">
                            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    {lesson.contentUrl ? <Video size={24}/> : <BookOpen size={24}/>}
                                </div>
                                <button onClick={() => { if(confirm('حذف الدرس؟')){ deleteFlippedLesson(lesson.id); setLessons(getFlippedLessons(currentUser.id)); } }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 mb-2">{lesson.title}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{lesson.subject} • الفصل: {lesson.className}</p>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-auto">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مؤشر الجاهزية</span>
                                    <span className="text-sm font-black text-indigo-600">{prepRate}%</span>
                                </div>
                                <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner mb-3">
                                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${prepRate}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                                    <Users size={12}/> {preparedCount} من أصل {classStudents.length} طلاب مستعدون للنقاش
                                </p>
                            </div>
                        </div>
                    );
                })}

                {lessons.length === 0 && (
                    <div className="col-span-full py-24 text-center text-slate-300 opacity-20 border-4 border-dashed border-slate-200 rounded-[3rem]">
                        <BookOpen size={100} className="mx-auto mb-4"/>
                        <p className="text-3xl font-black">لا يوجد دروس مقلوبة مرسلة</p>
                    </div>
                )}
            </div>

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
                                    <button onClick={handleAutoSummarize} disabled={summarizing || !form.contentBody} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:underline disabled:opacity-30">
                                        {summarizing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} تلخيص بالذكاء الاصطناعي
                                    </button>
                                </div>
                                <textarea className="w-full p-4 border rounded-2xl bg-slate-50 h-32 text-sm leading-relaxed" value={form.contentBody} onChange={e=>setForm({...form, contentBody: e.target.value})} placeholder="اكتب الشرح أو المصطلحات الهامة هنا..."/>
                            </div>

                            {form.aiSummary && (
                                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 animate-slide-up">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 flex items-center gap-2"><Bot size={12}/> ملخص Gemini للطالب:</p>
                                    <p className="text-xs text-indigo-900 leading-relaxed font-bold italic">"{form.aiSummary}"</p>
                                </div>
                            )}

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

const Bot = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;

export default FlippedClassroomManager;
