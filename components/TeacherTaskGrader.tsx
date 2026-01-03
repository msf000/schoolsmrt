
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Student, TaskSubmission, SystemUser } from '../types';
import { getTasks, getSubmissions, gradeSubmission, getStudents } from '../services/storageService';
import { 
    CheckCircle, XCircle, Loader2, Sparkles, FileText, Bot, 
    ArrowRight, Star, Target, Send, Search, Filter, 
    ChevronLeft, Eye, MessageSquare, Save, Clock, User
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface Props {
    currentUser: SystemUser;
}

const TeacherTaskGrader: React.FC<Props> = ({ currentUser }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
    const [selectedSub, setSelectedSub] = useState<TaskSubmission | null>(null);
    const [grade, setGrade] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    useEffect(() => {
        const loaded = getTasks(currentUser.id);
        setTasks(loaded);
        if (loaded.length > 0 && !selectedTaskId) setSelectedTaskId(loaded[0].id);
    }, [currentUser]);

    useEffect(() => {
        if (selectedTaskId) {
            setSubmissions(getSubmissions(selectedTaskId));
        }
    }, [selectedTaskId]);

    const activeTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);

    const handleAiFeedback = async () => {
        if (!selectedSub || !activeTask) return;
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `أنت معلم مساعد خبير. حلل ملف الطالب (واجب: ${activeTask.title}) وقدم ملاحظات بناءة باللغة العربية بلهجة تشجيعية سعودية. الدرجة المقترحة من ${activeTask.maxScore}. 
            إرجاع النتيجة بتنسيق JSON: {"feedback": "...", "score": 10}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            setFeedback(result.feedback || "");
            setGrade(result.score || 0);
        } catch (e) {
            alert('فشل التحليل الذكي');
        } finally {
            setIsAiProcessing(false);
        }
    };

    const handleSaveGrade = async () => {
        if (!selectedSub) return;
        await gradeSubmission(selectedSub.id, grade, feedback);
        setSubmissions(getSubmissions(selectedTaskId));
        setSelectedSub(null);
        alert('تم رصد الدرجة بنجاح!');
    };

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-gap-3">
                        <CheckCircle className="text-emerald-600" size={36}/> مركز تصحيح المهام
                    </h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">تقييم ومراجعة أعمال الطلاب سحابياً</p>
                </div>
                <div className="flex bg-white p-2 rounded-2xl border shadow-sm items-center gap-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">المهمة النشطة:</label>
                    <select value={selectedTaskId} onChange={e=>setSelectedTaskId(e.target.value)} className="bg-transparent font-black text-slate-800 outline-none text-sm min-w-[200px]">
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.classId})</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 overflow-hidden">
                {/* Submissions List */}
                <div className="bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">قائمة التسليمات <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{submissions.length}</span></h3>
                        <Filter size={16} className="text-slate-300"/>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {submissions.length > 0 ? (
                            <div className="divide-y">
                                {submissions.map(sub => (
                                    <button 
                                        key={sub.id} 
                                        onClick={() => { setSelectedSub(sub); setGrade(sub.grade || 0); setFeedback(sub.feedback || ''); }}
                                        className={`w-full p-6 text-right flex justify-between items-center transition-all ${selectedSub?.id === sub.id ? 'bg-indigo-50 border-r-8 border-indigo-600' : 'hover:bg-slate-50 border-r-8 border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 shadow-inner">{sub.studentName.charAt(0)}</div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm">{sub.studentName}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold">{new Date(sub.submittedAt).toLocaleString('ar-SA')}</p>
                                            </div>
                                        </div>
                                        {sub.status === 'GRADED' ? <CheckCircle size={18} className="text-emerald-500"/> : <Clock size={18} className="text-amber-500"/>}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-10 opacity-20 text-center">
                                <FileText size={80} className="mb-4"/>
                                <p className="font-black">لا توجد تسليمات لهذه المهمة بعد</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grading Area */}
                <div className="lg:col-span-2 bg-white rounded-[4rem] border shadow-sm flex flex-col overflow-hidden relative">
                    {selectedSub ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-slide-up">
                            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><User size={24}/></div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">مراجعة عمل: {selectedSub.studentName}</h3>
                                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{activeTask?.title}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAiFeedback} disabled={isAiProcessing} className="bg-purple-50 text-purple-700 px-6 py-2 rounded-xl font-black text-xs border border-purple-100 flex items-center gap-2 hover:bg-purple-100 transition-all">
                                        {isAiProcessing ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16}/>} تصحيح ذكي (AI)
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                {/* File Preview */}
                                <div className="flex-1 bg-slate-100 p-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                    <div className="bg-white rounded-3xl shadow-xl p-4 flex-1 flex items-center justify-center relative border-8 border-white overflow-hidden">
                                        {selectedSub.fileUrl.endsWith('.pdf') ? (
                                            <div className="text-center space-y-4 opacity-50">
                                                <FileText size={80}/>
                                                <p className="font-bold">ملف PDF - اضغط للمعاينة</p>
                                            </div>
                                        ) : (
                                            <img src={selectedSub.fileUrl} className="max-w-full max-h-full object-contain" alt="Submission" />
                                        )}
                                        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-xl backdrop-blur-md text-[10px] font-black uppercase tracking-widest">Student Upload</div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="w-full md:w-96 border-r p-8 flex flex-col gap-8 bg-white overflow-y-auto custom-scrollbar shrink-0">
                                    <section>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">1. رصد الدرجة النهائية</label>
                                        <div className="flex items-center gap-6">
                                            <input 
                                                type="range" min="0" max={activeTask?.maxScore || 10} 
                                                value={grade} onChange={e=>setGrade(Number(e.target.value))}
                                                className="flex-1 accent-indigo-600 h-2 bg-slate-100 rounded-full"
                                            />
                                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl">{grade}</div>
                                        </div>
                                    </section>

                                    <section className="flex-1 flex flex-col">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">2. التغذية الراجعة</label>
                                        <textarea 
                                            className="w-full flex-1 p-6 bg-slate-50 rounded-[2.5rem] border-none outline-none focus:ring-4 focus:ring-indigo-500/5 font-bold text-sm text-slate-700 leading-relaxed resize-none shadow-inner"
                                            value={feedback}
                                            onChange={e=>setFeedback(e.target.value)}
                                            placeholder="اكتب تعليقك التربوي هنا..."
                                        />
                                    </section>

                                    <button onClick={handleSaveGrade} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                                        <Save size={20}/> اعتماد الدرجة والتعليق
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20 p-20 text-center">
                            <Target size={150} className="mb-6"/>
                            <p className="text-3xl font-black">اختر تسليماً من القائمة للبدء بالتقييم</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherTaskGrader;
