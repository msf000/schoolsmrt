
import React, { useState, useEffect } from 'react';
import { Task, Student, TaskSubmission } from '../types';
import { getTasks, getSubmissions, saveSubmission } from '../services/storageService';
import { BookOpen, Upload, Clock, CheckCircle2, AlertCircle, FileText, Loader2, Sparkles, Send, Trash2, Camera, Ghost } from 'lucide-react';
import { useToast } from './ToastProvider';

const StudentTaskView: React.FC<{ student: Student }> = ({ student }) => {
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        // Fix: Added fallback for createdById to avoid TS2345 error
        const teacherId = student.createdById || '';
        setTasks(getTasks(teacherId).filter(t => t.classId === student.className));
        setSubmissions(getSubmissions().filter(s => s.studentId === student.id));
    }, [student]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleSubmit = async (task: Task) => {
        if (!selectedFile) return;
        setIsUploading(task.id);
        
        setTimeout(async () => {
            const newSub: TaskSubmission = {
                id: `sub_${Date.now()}`,
                taskId: task.id,
                studentId: student.id,
                studentName: student.name,
                fileUrl: URL.createObjectURL(selectedFile),
                submittedAt: new Date().toISOString(),
                status: 'PENDING'
            };
            await saveSubmission(newSub);
            setSubmissions([...submissions, newSub]);
            setSelectedFile(null);
            setIsUploading(null);
            showToast('تم تسليم الواجب بنجاح!', 'SUCCESS');
        }, 2000);
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal pb-24" dir="rtl">
            <div className="bg-slate-900/50 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                    <h2 className="text-4xl font-black text-white flex items-center gap-4">
                        <BookOpen className="text-indigo-400" size={40}/> حقيبة الواجبات
                    </h2>
                    <p className="text-indigo-200 text-lg font-bold mt-2">لديك {tasks.length - submissions.length} واجبات بانتظار التسليم</p>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center min-w-[150px]">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">المهام المكتملة</p>
                    <p className="text-3xl font-black text-white">{submissions.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {tasks.map(task => {
                    const sub = submissions.find(s => s.taskId === task.id);
                    const isPending = !!isUploading && isUploading === task.id;

                    return (
                        <div key={task.id} className={`bg-white/5 p-8 rounded-[3rem] border-2 transition-all duration-500 ${sub ? 'border-emerald-500/20' : 'border-white/5 hover:border-indigo-500/30 shadow-xl'}`}>
                            <div className="flex flex-col md:flex-row justify-between gap-8">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${sub ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                            <FileText size={28}/>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white">{task.title}</h3>
                                            <p className="text-xs text-indigo-300 font-bold uppercase mt-1">{task.subject} • موعد التسليم: {task.dueDate}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">{task.description}</p>
                                    
                                    {sub?.status === 'GRADED' && (
                                        <div className="bg-indigo-600/20 p-6 rounded-3xl border border-indigo-500/30 animate-slide-up">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-sm font-black text-indigo-300 flex items-center gap-2"><Sparkles size={16}/> تقييم المعلم:</h4>
                                                <span className="text-2xl font-black text-white">{sub.grade} / {task.maxScore}</span>
                                            </div>
                                            <p className="text-sm text-indigo-100 italic leading-relaxed">"{sub.feedback}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-80 flex flex-col gap-4">
                                    {sub ? (
                                        <div className="h-full flex flex-col justify-center items-center text-center p-6 bg-white/5 rounded-3xl border border-white/5">
                                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 size={32}/>
                                            </div>
                                            <p className="text-emerald-400 font-black mb-1">تم التسليم بنجاح</p>
                                            <p className="text-[10px] text-white/40 font-bold">{new Date(sub.submittedAt).toLocaleString('ar-SA')}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <label className="flex-1 border-2 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 hover:border-indigo-500/50 transition-all group">
                                                {selectedFile ? <FileText className="text-indigo-400"/> : <Upload className="text-slate-600 group-hover:text-indigo-400"/>}
                                                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-300">{selectedFile ? selectedFile.name : 'ارفق الحل (صورة/PDF)'}</span>
                                                <input type="file" className="hidden" onChange={handleFileChange} />
                                            </label>
                                            <button 
                                                onClick={() => handleSubmit(task)}
                                                disabled={!selectedFile || isPending}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {isPending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                                                {isPending ? 'جاري الرفع...' : 'تسليم المهمة الآن'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="py-40 text-center opacity-10 flex flex-col items-center gap-8 border-4 border-dashed border-white/10 rounded-[4rem]">
                        <Ghost size={150} strokeWidth={1}/>
                        <p className="text-3xl font-black italic tracking-tighter">لا توجد مهام حالية في حقيبتك</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTaskView;
