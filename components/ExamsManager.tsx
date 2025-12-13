
import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject } from '../types';
import { getExams, saveExam, deleteExam, getSubjects } from '../services/storageService';
import { Plus, Trash2, Edit, FileQuestion, Calendar, CheckCircle, XCircle, Save, ArrowLeft } from 'lucide-react';

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
        setView('CREATION_SELECTION'); // or directly EDITOR
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
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FileQuestion className="text-purple-600"/> إدارة الاختبارات
                        </h2>
                        <button onClick={startCreation} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2">
                            <Plus size={18}/> اختبار جديد
                        </button>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-700">
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
                                    <tr key={exam.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-800">{exam.title}</td>
                                        <td className="p-4 text-gray-600">{exam.subject}</td>
                                        <td className="p-4 text-gray-600">{exam.gradeLevel}</td>
                                        <td className="p-4 font-mono text-gray-500">{exam.date}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {exam.isActive ? 'نشط' : 'مسودة'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => { setEditingExam(exam); setView('EDITOR'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                            <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {exams.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد اختبارات مسجلة</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                            <h3 className="font-bold text-gray-800">محرر الاختبار</h3>
                        </div>
                        <button onClick={handleSaveExam} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700">
                            <Save size={18}/> حفظ الاختبار
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">عنوان الاختبار</label>
                                <input className="w-full p-2 border rounded" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="مثال: اختبار الفترة الأولى" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">المادة</label>
                                <select className="w-full p-2 border rounded" value={editingExam.subject} onChange={e => setEditingExam({...editingExam, subject: e.target.value})}>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">الصف</label>
                                <select 
                                    className="w-full p-2 border rounded" 
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
                                <label className="block text-sm font-bold text-gray-600 mb-1">تاريخ الاختبار</label>
                                <input type="date" className="w-full p-2 border rounded" value={editingExam.date} onChange={e => setEditingExam({...editingExam, date: e.target.value})} />
                            </div>
                            <div className="flex items-center gap-4 mt-6">
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded border">
                                    <input type="checkbox" checked={editingExam.isActive} onChange={e => setEditingExam({...editingExam, isActive: e.target.checked})} className="w-5 h-5 accent-green-600"/>
                                    <span className="font-bold text-sm">نشر الاختبار (متاح للطلاب)</span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="border-t pt-6">
                            <h4 className="font-bold text-gray-800 mb-4">الأسئلة ({editingExam.questions.length})</h4>
                            <div className="space-y-4">
                                {/* Questions editor would go here - simplified for this fix */}
                                <p className="text-gray-400 text-sm italic">محرر الأسئلة قيد التطوير...</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
