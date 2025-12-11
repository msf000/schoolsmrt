
import React, { useState, useEffect } from 'react';
import { Exam, Question, SystemUser, Subject } from '../types';
import { getExams, saveExam, deleteExam, getSubjects } from '../services/storageService';
import { FileQuestion, Plus, Trash2, Save, PlayCircle, StopCircle, Edit2, Search, Filter, CheckCircle, XCircle } from 'lucide-react';

interface ExamsManagerProps {
    currentUser: any; // Using any to avoid strict type issues with SystemUser | null in logic, will cast inside
}

const ExamsManager: React.FC<ExamsManagerProps> = ({ currentUser }) => {
    // State
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'CREATION_SELECTION'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Filters
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Editing State
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionType, setNewQuestionType] = useState<'MCQ' | 'TRUE_FALSE'>('MCQ');
    const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
    const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
    const [newPoints, setNewPoints] = useState(1);

    useEffect(() => {
        if (currentUser?.id) {
            setExams(getExams(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    // Filters Logic
    const filteredExams = exams.filter(e => {
        if (selectedSubjectFilter && e.subject !== selectedSubjectFilter) return false;
        if (selectedGradeFilter && e.gradeLevel !== selectedGradeFilter) return false;
        if (searchTerm && !e.title.includes(searchTerm)) return false;
        return true;
    });

    // --- CREATION FLOW ---
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
        if (!editingExam || !editingExam.title) return alert('الرجاء كتابة عنوان الاختبار');
        if (editingExam.questions.length === 0) return alert('الرجاء إضافة سؤال واحد على الأقل');
        
        saveExam(editingExam);
        setExams(getExams(currentUser.id));
        setView('LIST');
        setEditingExam(null);
    };

    const handleDeleteExam = (id: string) => {
        if(confirm('حذف الاختبار؟')) {
            deleteExam(id);
            setExams(getExams(currentUser.id));
        }
    };

    const toggleActivation = (exam: Exam) => {
        saveExam({ ...exam, isActive: !exam.isActive });
        setExams(getExams(currentUser.id));
    };

    // Question Management inside Editor
    const addQuestionToExam = () => {
        if (!editingExam || !newQuestionText || !newCorrectAnswer) return alert('أكمل بيانات السؤال');
        
        const newQ: Question = {
            id: Date.now().toString(),
            text: newQuestionText,
            type: newQuestionType,
            options: newQuestionType === 'MCQ' ? newOptions.filter(o => o) : ['صح', 'خطأ'],
            correctAnswer: newCorrectAnswer,
            points: newPoints,
            teacherId: currentUser.id
        };

        setEditingExam({ ...editingExam, questions: [...editingExam.questions, newQ] });
        
        // Reset Question Form
        setNewQuestionText('');
        setNewOptions(['', '', '', '']);
        setNewCorrectAnswer('');
    };

    const removeQuestion = (qId: string) => {
        if (editingExam) {
            setEditingExam({ ...editingExam, questions: editingExam.questions.filter(q => q.id !== qId) });
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileQuestion className="text-purple-600"/> إدارة الاختبارات
                            </h2>
                            <p className="text-sm text-gray-500">إنشاء وتفعيل الاختبارات الإلكترونية.</p>
                        </div>
                        <button onClick={startCreation} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md">
                            <Plus size={18}/> اختبار جديد
                        </button>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-wrap gap-2 mb-4 bg-white p-3 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                            <Filter size={16} className="text-gray-400"/>
                            <select className="bg-transparent text-sm font-bold outline-none" value={selectedSubjectFilter} onChange={e => setSelectedSubjectFilter(e.target.value)}>
                                <option value="">كل المواد</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="relative flex-1">
                            <Search size={16} className="absolute top-3 right-3 text-gray-400"/>
                            <input className="w-full pl-2 pr-9 py-2 border rounded-lg text-sm" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                        {filteredExams.map(exam => (
                            <div key={exam.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${exam.isActive ? 'border-green-400 ring-1 ring-green-100' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        <FileQuestion size={24}/>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingExam(exam); setView('EDITOR'); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{exam.title}</h3>
                                <p className="text-xs text-gray-500 mb-4">{exam.subject} • {exam.questions.length} سؤال • {exam.durationMinutes} دقيقة</p>
                                
                                <button 
                                    onClick={() => toggleActivation(exam)}
                                    className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${exam.isActive ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {exam.isActive ? <><StopCircle size={16}/> نشط (إيقاف)</> : <><PlayCircle size={16}/> تفعيل الاختبار</>}
                                </button>
                            </div>
                        ))}
                        {filteredExams.length === 0 && <div className="col-span-full py-20 text-center text-gray-400">لا توجد اختبارات</div>}
                    </div>
                </>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">تحرير الاختبار</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setView('LIST')} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">إلغاء</button>
                            <button onClick={handleSaveExam} className="px-6 py-2 bg-green-600 text-white font-bold hover:bg-green-700 rounded-lg flex items-center gap-2"><Save size={18}/> حفظ</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Settings Side */}
                        <div className="w-full md:w-1/3 border-l bg-gray-50 p-6 overflow-y-auto">
                            <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">الإعدادات الأساسية</h4>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold mb-1">العنوان</label><input className="w-full p-2 border rounded" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})}/></div>
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
                                <div><label className="block text-xs font-bold mb-1">المدة (دقيقة)</label><input type="number" className="w-full p-2 border rounded" value={editingExam.durationMinutes} onChange={e => setEditingExam({...editingExam, durationMinutes: Number(e.target.value)})}/></div>
                                <div><label className="block text-xs font-bold mb-1">التاريخ المقرر</label><input type="date" className="w-full p-2 border rounded" value={editingExam.date || ''} onChange={e => setEditingExam({...editingExam, date: e.target.value})}/></div>
                            </div>
                        </div>

                        {/* Questions Side */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            <h4 className="font-bold text-gray-700 mb-4 flex justify-between items-center">
                                <span>الأسئلة ({editingExam.questions.length})</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">المجموع: {editingExam.questions.reduce((a,b) => a + b.points, 0)} درجة</span>
                            </h4>

                            {/* Add Question Form */}
                            <div className="bg-gray-50 border border-blue-200 rounded-xl p-4 mb-6">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-blue-600">إضافة سؤال جديد</span>
                                    <select className="text-xs border rounded" value={newQuestionType} onChange={e => setNewQuestionType(e.target.value as any)}><option value="MCQ">اختر من متعدد</option><option value="TRUE_FALSE">صح أو خطأ</option></select>
                                </div>
                                <input className="w-full p-2 border rounded mb-2 text-sm" placeholder="نص السؤال..." value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)}/>
                                
                                {newQuestionType === 'MCQ' && (
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {newOptions.map((opt, idx) => (
                                            <input key={idx} className="p-2 border rounded text-xs" placeholder={`خيار ${idx+1}`} value={opt} onChange={e => {
                                                const opts = [...newOptions]; opts[idx] = e.target.value; setNewOptions(opts);
                                            }}/>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 items-center mb-2">
                                    <select className="flex-1 p-2 border rounded text-sm" value={newCorrectAnswer} onChange={e => setNewCorrectAnswer(e.target.value)}>
                                        <option value="">-- الإجابة الصحيحة --</option>
                                        {newQuestionType === 'MCQ' ? newOptions.map(o => o && <option key={o} value={o}>{o}</option>) : <><option value="صح">صح</option><option value="خطأ">خطأ</option></>}
                                    </select>
                                    <input type="number" className="w-20 p-2 border rounded text-sm text-center" placeholder="درجات" value={newPoints} onChange={e => setNewPoints(Number(e.target.value))}/>
                                </div>
                                <button onClick={addQuestionToExam} className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2"><Plus size={16}/> إضافة السؤال</button>
                            </div>

                            {/* Questions List */}
                            <div className="space-y-3">
                                {editingExam.questions.map((q, i) => (
                                    <div key={q.id} className="p-3 border rounded-lg hover:bg-gray-50 group relative">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-sm">س{i+1}: {q.text}</span>
                                            <span className="text-xs bg-gray-100 px-2 rounded font-mono">{q.points} درجة</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">الإجابة: <span className="text-green-600 font-bold">{q.correctAnswer}</span></div>
                                        <button onClick={() => removeQuestion(q.id)} className="absolute top-2 left-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
