
import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject } from '../types';
import { getExams, saveExam, deleteExam, getSubjects } from '../services/storageService';
import { Plus, Trash2, Edit, FileQuestion, Calendar, CheckCircle, XCircle, Save, ArrowLeft, Check, ListChecks, Type } from 'lucide-react';

interface ExamsManagerProps {
    currentUser: SystemUser;
}

const ExamsManager: React.FC<ExamsManagerProps> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Edit State
    const [editingExam, setEditingExam] = useState<Exam | null>(null);

    // Question Form State
    const [qText, setQText] = useState('');
    const [qType, setQType] = useState<'MCQ' | 'TRUE_FALSE'>('MCQ');
    const [qPoints, setQPoints] = useState(1);
    const [qOptions, setQOptions] = useState(['', '', '', '']);
    const [qCorrect, setQCorrect] = useState('');

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
            subject: subjects.length > 0 ? subjects[0].name : '',
            gradeLevel: 'الصف الأول المتوسط',
            durationMinutes: 30,
            questions: [],
            isActive: false,
            createdAt: new Date().toISOString(),
            teacherId: currentUser.id,
            date: new Date().toISOString().split('T')[0]
        });
        resetQuestionForm();
        setView('EDITOR'); 
    };

    const resetQuestionForm = () => {
        setQText('');
        setQType('MCQ');
        setQPoints(1);
        setQOptions(['', '', '', '']);
        setQCorrect('');
    };

    const handleSaveExam = () => {
        if (!editingExam || !editingExam.title) return alert('الرجاء إدخال عنوان الاختبار');
        if (editingExam.questions.length === 0) return alert('الرجاء إضافة سؤال واحد على الأقل');

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

    const addQuestion = () => {
        if (!qText) return alert('نص السؤال مطلوب');
        if (!qCorrect) return alert('حدد الإجابة الصحيحة');
        if (qType === 'MCQ' && qOptions.some(o => !o)) return alert('أكمل جميع الخيارات');

        const newQ: Question = {
            id: Date.now().toString() + Math.random(),
            text: qText,
            type: qType,
            points: qPoints,
            options: qType === 'MCQ' ? qOptions : ['صح', 'خطأ'],
            correctAnswer: qCorrect
        };

        if (editingExam) {
            setEditingExam({
                ...editingExam,
                questions: [...editingExam.questions, newQ]
            });
        }
        resetQuestionForm();
    };

    const removeQuestion = (qId: string) => {
        if (editingExam) {
            setEditingExam({
                ...editingExam,
                questions: editingExam.questions.filter(q => q.id !== qId)
            });
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
                    
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 overflow-y-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-700 sticky top-0">
                                <tr>
                                    <th className="p-4">عنوان الاختبار</th>
                                    <th className="p-4">المادة</th>
                                    <th className="p-4">الصف</th>
                                    <th className="p-4">الأسئلة</th>
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
                                        <td className="p-4 font-mono text-gray-500">{exam.questions.length}</td>
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
                                {exams.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400">لا توجد اختبارات مسجلة</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                            <h3 className="font-bold text-gray-800">محرر الاختبار</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm font-bold text-gray-600 bg-white px-3 py-1 rounded border">
                                مجموع الدرجات: {editingExam.questions.reduce((a,b) => a + b.points, 0)}
                            </div>
                            <button onClick={handleSaveExam} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700">
                                <Save size={18}/> حفظ الاختبار
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Settings Column */}
                        <div className="w-full md:w-80 border-l bg-gray-50 p-4 overflow-y-auto">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Edit size={16}/> الإعدادات الأساسية</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">عنوان الاختبار</label>
                                    <input className="w-full p-2 border rounded bg-white" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="مثال: اختبار الفترة الأولى" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                                    <select className="w-full p-2 border rounded bg-white" value={editingExam.subject} onChange={e => setEditingExam({...editingExam, subject: e.target.value})}>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">الصف</label>
                                    <select 
                                        className="w-full p-2 border rounded bg-white" 
                                        value={editingExam.gradeLevel} 
                                        onChange={e => setEditingExam({...editingExam, gradeLevel: e.target.value})} 
                                    >
                                        {[
                                            "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                                            "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                                            "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                                            "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                                        ].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">المدة (دقيقة)</label>
                                    <input type="number" className="w-full p-2 border rounded bg-white" value={editingExam.durationMinutes} onChange={e => setEditingExam({...editingExam, durationMinutes: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                                    <input type="date" className="w-full p-2 border rounded bg-white" value={editingExam.date} onChange={e => setEditingExam({...editingExam, date: e.target.value})} />
                                </div>
                                <div className="pt-4 border-t">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border hover:border-green-400 transition-colors">
                                        <input type="checkbox" checked={editingExam.isActive} onChange={e => setEditingExam({...editingExam, isActive: e.target.checked})} className="w-4 h-4 accent-green-600"/>
                                        <span className="font-bold text-sm text-gray-700">نشر الاختبار للطلاب</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Questions Column */}
                        <div className="flex-1 p-6 overflow-y-auto bg-gray-100/50">
                            {/* Added Questions List */}
                            <div className="space-y-4 mb-8">
                                {editingExam.questions.length > 0 ? editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">س{idx + 1}</span>
                                                {q.text}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border">{q.points} درجات</span>
                                                <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className={`px-3 py-1.5 rounded flex items-center gap-2 ${opt === q.correctAnswer ? 'bg-green-50 text-green-700 font-bold border border-green-200' : 'bg-gray-50 text-gray-500 border border-transparent'}`}>
                                                    {opt === q.correctAnswer && <CheckCircle size={14}/>} {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                                        <ListChecks size={48} className="mx-auto mb-2 opacity-20"/>
                                        <p>لم يتم إضافة أسئلة بعد.</p>
                                    </div>
                                )}
                            </div>

                            {/* Add New Question Form */}
                            <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-md">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                    <Plus size={18} className="text-purple-600"/> إضافة سؤال جديد
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">نص السؤال</label>
                                            <input 
                                                className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none" 
                                                placeholder="اكتب السؤال هنا..." 
                                                value={qText}
                                                onChange={e => setQText(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-3 border rounded-lg text-center font-bold" 
                                                value={qPoints}
                                                onChange={e => setQPoints(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => { setQType('MCQ'); setQOptions(['', '', '', '']); setQCorrect(''); }} 
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${qType === 'MCQ' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                        >
                                            اختيارات متعددة
                                        </button>
                                        <button 
                                            onClick={() => { setQType('TRUE_FALSE'); setQOptions(['صح', 'خطأ']); setQCorrect(''); }} 
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${qType === 'TRUE_FALSE' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                        >
                                            صح أم خطأ
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        {qType === 'MCQ' ? qOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input 
                                                    type="radio" 
                                                    name="correctAnswer" 
                                                    className="w-5 h-5 accent-green-600 cursor-pointer"
                                                    checked={qCorrect === opt && opt !== ''}
                                                    onChange={() => opt && setQCorrect(opt)}
                                                />
                                                <input 
                                                    className="flex-1 p-2 border rounded text-sm focus:border-purple-500 outline-none" 
                                                    placeholder={`الخيار ${i + 1}`}
                                                    value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...qOptions];
                                                        newOpts[i] = e.target.value;
                                                        setQOptions(newOpts);
                                                        if (qCorrect === opt) setQCorrect(e.target.value);
                                                    }}
                                                />
                                            </div>
                                        )) : (
                                            <div className="flex gap-4 col-span-2">
                                                {['صح', 'خطأ'].map(val => (
                                                    <label key={val} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${qCorrect === val ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-300'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name="correctAnswer" 
                                                            className="w-5 h-5 accent-green-600"
                                                            checked={qCorrect === val}
                                                            onChange={() => setQCorrect(val)}
                                                        />
                                                        <span className="font-bold">{val}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={addQuestion} 
                                        className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-black transition-colors shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18}/> إدراج السؤال
                                    </button>
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
