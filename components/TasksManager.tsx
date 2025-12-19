import React, { useState, useMemo, useEffect } from 'react';
import { Task, Student, SystemUser, Subject } from '../types';
import { getTasks, saveTask, getStudents, getSubjects, getTeacherAssignments } from '../services/storageService';
import { Plus, BookOpen, Clock, Users, Trash2, CheckCircle2, ChevronLeft, ArrowLeft, Save, Calendar, Search, Filter, LayoutList } from 'lucide-react';

interface TasksManagerProps {
    students: Student[];
    currentUser?: SystemUser | null;
}

const TasksManager: React.FC<TasksManagerProps> = ({ students, currentUser }) => {
    const [view, setView] = useState<'LIST' | 'ADD' | 'SUBMISSIONS'>('LIST');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Form State
    const [form, setForm] = useState({
        title: '', description: '', subject: '', classId: '', dueDate: '', type: 'HOMEWORK' as any, maxScore: 10
    });

    useEffect(() => {
        if (currentUser) {
            setTasks(getTasks(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser, view]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const handleAddTask = () => {
        if (!form.title || !form.classId || !currentUser) return alert('أكمل البيانات');
        const newTask: Task = {
            id: `task_${Date.now()}`,
            teacherId: currentUser.id,
            classId: form.classId,
            subject: form.subject || 'عام',
            title: form.title,
            description: form.description,
            dueDate: form.dueDate || new Date().toISOString().split('T')[0],
            type: form.type,
            maxScore: form.maxScore,
            submissions: []
        };
        saveTask(newTask);
        alert('تم نشر المهمة للطلاب بنجاح');
        setView('LIST');
        setForm({ title: '', description: '', subject: '', classId: '', dueDate: '', type: 'HOMEWORK', maxScore: 10 });
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BookOpen className="text-indigo-600"/> إدارة المهام والواجبات</h2>
                </div>
                <button onClick={() => setView(view === 'LIST' ? 'ADD' : 'LIST')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    {view === 'LIST' ? <><Plus size={18}/> تكليف جديد</> : <><ArrowLeft size={18}/> العودة</>}
                </button>
            </div>

            {view === 'ADD' ? (
                <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-2xl mx-auto w-full animate-slide-up">
                    <h3 className="font-black text-gray-800 mb-6 border-b pb-4">إضافة مهمة جديدة</h3>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 mb-1 block">عنوان المهمة *</label><input className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={form.title} onChange={e=>setForm({...form, title: e.target.value})}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">الفصل المستهدف *</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={form.classId} onChange={e=>setForm({...form, classId: e.target.value})}>
                                    <option value="">-- اختر --</option>
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">المادة</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})}>
                                    <option value="">-- اختر --</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">تاريخ التسليم</label><input type="date" className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={form.dueDate} onChange={e=>setForm({...form, dueDate: e.target.value})}/></div>
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">نوع المهمة</label>
                                <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={form.type} onChange={e=>setForm({...form, type: e.target.value as any})}>
                                    <option value="HOMEWORK">واجب منزلي</option>
                                    <option value="PROJECT">مشروع فصلي</option>
                                    <option value="RESEARCH">بحث علمي</option>
                                </select>
                            </div>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 mb-1 block">الوصف / التعليمات</label><textarea className="w-full p-3 border rounded-xl bg-gray-50 h-32 outline-none" value={form.description} onChange={e=>setForm({...form, description: e.target.value})}/></div>
                        <button onClick={handleAddTask} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl mt-4">نشر المهمة للطلاب</button>
                    </div>
                </div>
            ) : view === 'SUBMISSIONS' && selectedTask ? (
                <div className="bg-white rounded-3xl border shadow-sm flex-1 flex flex-col overflow-hidden animate-slide-up">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={()=>setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                            <div><h3 className="font-black text-gray-800">{selectedTask.title}</h3><p className="text-[10px] font-bold text-gray-400">الفصل: {selectedTask.classId} • المادة: {selectedTask.subject}</p></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-100 font-bold sticky top-0 z-10 shadow-sm">
                                <tr><th className="p-4">الطالب</th><th className="p-4 text-center">حالة التسليم</th><th className="p-4 text-center">الدرجة</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {students.filter(s => s.className === selectedTask.classId).map(s => {
                                    const hasSubmitted = selectedTask.submissions.includes(s.id);
                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-700">{s.name}</td>
                                            <td className="p-4 text-center">
                                                {hasSubmitted ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black">تم التسليم</span> : <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black">لم يتم</span>}
                                            </td>
                                            <td className="p-4 text-center font-mono font-bold text-gray-400">-- / {selectedTask.maxScore}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500"></div>
                            <div className="flex justify-between mb-4">
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{task.type}</span>
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock size={12}/> {task.dueDate}</span>
                            </div>
                            <h3 className="font-black text-gray-800 mb-2 truncate">{task.title}</h3>
                            <p className="text-[10px] text-gray-500 mb-4 font-bold">{task.subject} • {task.classId}</p>
                            <div className="flex gap-4 items-center mb-6">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{width: `${(task.submissions.length / students.filter(s=>s.className===task.classId).length) * 100}%`}}></div>
                                </div>
                                <span className="text-[10px] font-black text-gray-400">{task.submissions.length} / {students.filter(s=>s.className===task.classId).length}</span>
                            </div>
                            <button onClick={()=>{setSelectedTask(task); setView('SUBMISSIONS')}} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black shadow-lg hover:bg-black transition-all">عرض التسليمات</button>
                        </div>
                    ))}
                    {tasks.length === 0 && <div className="col-span-full p-20 text-center text-gray-300 font-bold border-2 border-dashed rounded-3xl">لا توجد مهام منشورة حالياً</div>}
                </div>
            )}
        </div>
    );
};

export default TasksManager;
