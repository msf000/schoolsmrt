import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject } from '../types';
import { getExams, saveExam, deleteExam, getSubjects } from '../services/storageService';
import { Plus, Trash2, Edit, FileQuestion, Calendar, CheckCircle, XCircle, Save, ArrowLeft, Clock, BookOpen, Layers } from 'lucide-react';

interface ExamsManagerProps {
    currentUser: SystemUser;
}

const ExamsManager: React.FC<ExamsManagerProps> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'CREATION_SELECTION' | 'EDITOR'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
    
    // Edit State
    const [editingExam, setEditingExam] = useState<Exam | null>(null);

    useEffect(() => {
        if(currentUser?.id) {
            setExams(getExams(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    const startCreation = () => {
        setEditingExam({
            id: Date.now().toString(),
            title: '',
            subject: selectedSubjectFilter || (subjects.length > 0 ? subjects[0].name : ''),
            gradeLevel: selectedGradeFilter || 'الصف الأول المتوسط',
            durationMinutes: 30,
            questions: [],
            isActive: false,
            createdAt: new Date().toISOString(),
            teacherId: currentUser.id,
            date: new Date().toISOString().split('T')[0]
        });
        setView('EDITOR'); 
    };

    const handleSaveExam = () => {
        if (!editingExam) return;
        saveExam(editingExam);
        setExams(getExams(currentUser.id));
        setView('LIST');
        setEditingExam(null);
    };

    const handleDeleteExam = (id: string) => {
        if (confirm('هل أنت متأكد من حذف الاختبار؟')) {
            deleteExam(id);
            setExams(getExams(currentUser.id));
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileQuestion className="text-purple-600"/> إدارة الاختبارات
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">إنشاء وتعديل الاختبارات القصيرة والنهائية</p>
                        </div>
                        <button onClick={startCreation} className="w-full md:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center justify-center gap-2 shadow-sm">
                            <Plus size={18}/> اختبار جديد
                        </button>
                    </div>
                    
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 overflow-y-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4">عنوان الاختبار</th>
                                    <th className="p-4">المادة</th>
                                    <th className="p-4">الصف</th>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4 text-center">الحالة</th>
                                    <th className="p-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {exams.map(exam => (
                                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-bold text-gray-800">{exam.title}</td>
                                        <td className="p-4 text-gray-600">{exam.subject}</td>
                                        <td className="p-4 text-gray-600">{exam.gradeLevel}</td>
                                        <td className="p-4 font-mono text-gray-500">{exam.date}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${exam.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {exam.isActive ? 'نشط (منشور)' : 'مسودة'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => { setEditingExam(exam); setView('EDITOR'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="تعديل"><Edit size={16}/></button>
                                            <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="حذف"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {exams.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد اختبارات مسجلة</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden flex-1 overflow-y-auto space-y-3 pb-20">
                        {exams.length > 0 ? exams.map(exam => (
                            <div key={exam.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${exam.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {exam.isActive ? 'نشط' : 'مسودة'}
                                    </span>
                                </div>
                                
                                <div className="text-xs text-gray-500 space-y-1 mb-4">
                                    <div className="flex items-center gap-1"><BookOpen size={12}/> {exam.subject}</div>
                                    <div className="flex items-center gap-1"><Layers size={12}/> {exam.gradeLevel}</div>
                                    <div className="flex items-center gap-1"><Calendar size={12}/> {exam.date || 'بدون تاريخ'}</div>
                                    <div className="flex items-center gap-1"><Clock size={12}/> {exam.durationMinutes} دقيقة</div>
                                </div>

                                <div className="flex gap-2 border-t pt-3">
                                    <button onClick={() => { setEditingExam(exam); setView('EDITOR'); }} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-blue-100">
                                        <Edit size={16}/> تعديل
                                    </button>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="flex-1 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-red-100">
                                        <Trash2 size={16}/> حذف
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                <FileQuestion size={48} className="mb-4 opacity-20"/>
                                <p>لا توجد اختبارات</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-white rounded-full transition-colors"><ArrowLeft size={20}/></button>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm md:text-base">محرر الاختبار</h3>
                                <p className="text-[10px] text-gray-500 hidden md:block">إعداد تفاصيل الاختبار والأسئلة</p>
                            </div>
                        </div>
                        <button onClick={handleSaveExam} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 text-sm shadow-sm">
                            <Save size={18}/> <span className="hidden md:inline">حفظ الاختبار</span><span className="md:hidden">حفظ</span>
                        </button>
                    </div>
                    
                    <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">عنوان الاختبار</label>
                                <input className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="مثال: اختبار الفترة الأولى" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                                <select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={editingExam.subject} onChange={e => setEditingExam({...editingExam, subject: e.target.value})}>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">الصف</label>
                                <select 
                                    className="w-full p-2.5 border rounded-lg text-sm bg-white" 
                                    value={editingExam.gradeLevel} 
                                    onChange={e => setEditingExam({...editingExam, gradeLevel: e.target.value})} 
                                >
                                    <option value="">-- اختر الصف --</option>
                                    {[
                                        "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                                        "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                                        "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                                        "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                                    ].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">تاريخ الاختبار</label>
                                <input type="date" className="w-full p-2.5 border rounded-lg text-sm bg-white" value={editingExam.date} onChange={e => setEditingExam({...editingExam, date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">المدة (دقيقة)</label>
                                <input type="number" className="w-full p-2.5 border rounded-lg text-sm bg-white" value={editingExam.durationMinutes} onChange={e => setEditingExam({...editingExam, durationMinutes: Number(e.target.value)})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-gray-50 hover:bg-white transition-colors">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" checked={editingExam.isActive} onChange={e => setEditingExam({...editingExam, isActive: e.target.checked})} className="peer sr-only"/>
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">نشر الاختبار (إتاحته في بوابة الطالب)</span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="border-t pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-gray-800">الأسئلة ({editingExam.questions.length})</h4>
                                <button className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-1">
                                    <Plus size={14}/> إضافة سؤال
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-center">
                                    <p className="text-orange-800 text-sm">محرر الأسئلة قيد التطوير في هذه النسخة. يمكنك حفظ الإعدادات الأساسية الآن.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;