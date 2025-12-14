
import React, { useState, useEffect, useMemo } from 'react';
import { Question, SystemUser, Subject } from '../types';
import { getQuestionBank, saveQuestionToBank, deleteQuestionFromBank, getSubjects } from '../services/storageService';
import { Plus, Trash2, Edit, Search, Filter, Save, X, Library, CheckCircle } from 'lucide-react';

interface QuestionBankProps {
    currentUser: SystemUser;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ currentUser }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [filterGrade, setFilterGrade] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        if(currentUser?.id) {
            setQuestions(getQuestionBank(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => 
            (!filterGrade || q.gradeLevel === filterGrade) &&
            (!filterSubject || q.subject === filterSubject) &&
            (!searchTerm || q.text.includes(searchTerm))
        );
    }, [questions, filterGrade, filterSubject, searchTerm]);

    const handleSave = () => {
        if (!editingQuestion || !editingQuestion.text) return;
        saveQuestionToBank(editingQuestion);
        setQuestions(getQuestionBank(currentUser.id));
        setIsModalOpen(false);
        setEditingQuestion(null);
    };

    const handleDelete = (id: string) => {
        if(confirm('حذف السؤال؟')) {
            deleteQuestionFromBank(id);
            setQuestions(getQuestionBank(currentUser.id));
        }
    };

    const openEditor = (q?: Question) => {
        if (q) setEditingQuestion(q);
        else setEditingQuestion({
            id: Date.now().toString(),
            text: '',
            type: 'MCQ',
            options: ['', '', '', ''],
            correctAnswer: '',
            points: 1,
            teacherId: currentUser.id,
            gradeLevel: filterGrade || undefined,
            subject: filterSubject || (subjects.length > 0 ? subjects[0].name : '')
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 h-full bg-gray-50 animate-fade-in flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Library className="text-purple-600"/> بنك الأسئلة
                </h2>
                <button onClick={() => openEditor()} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md">
                    <Plus size={18}/> سؤال جديد
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="بحث في نص السؤال..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div>
                    <select className="w-full p-2 border rounded-lg text-sm bg-gray-50 font-bold text-gray-700 outline-none" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                        <option value="">كل الصفوف</option>
                        {[
                            "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                            "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                            "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                            "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                        ].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <select className="w-full p-2 border rounded-lg text-sm bg-gray-50 font-bold text-gray-700 outline-none" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                        <option value="">كل المواد</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 custom-scrollbar">
                {filteredQuestions.length > 0 ? filteredQuestions.map(q => (
                    <div key={q.id} className="p-4 border rounded-lg hover:border-purple-300 transition-colors bg-gray-50 hover:bg-white group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {q.type === 'MCQ' ? 'اختيارات' : 'صح/خطأ'}
                                </span>
                                <span className="text-xs text-gray-500 bg-white border px-2 py-0.5 rounded">{q.subject}</span>
                                <span className="text-xs text-gray-500 bg-white border px-2 py-0.5 rounded">{q.gradeLevel}</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 left-4">
                                <button onClick={() => openEditor(q)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded bg-white border shadow-sm"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded bg-white border shadow-sm"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="font-bold text-gray-800 text-lg mb-3">{q.text} <span className="text-xs font-normal text-gray-400">({q.points} درجات)</span></p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            {q.type === 'MCQ' ? q.options.map((opt, i) => (
                                <div key={i} className={`px-3 py-2 rounded flex items-center gap-2 ${opt === q.correctAnswer ? 'bg-green-50 text-green-800 font-bold border border-green-200' : 'bg-white border border-gray-200'}`}>
                                    {opt === q.correctAnswer && <CheckCircle size={14}/>} {opt}
                                </div>
                            )) : (
                                <div className="flex gap-4">
                                    <span className={`px-3 py-1 rounded border ${q.correctAnswer === 'صح' ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white'}`}>صح</span>
                                    <span className={`px-3 py-1 rounded border ${q.correctAnswer === 'خطأ' ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white'}`}>خطأ</span>
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        <Library size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="font-bold">لا توجد أسئلة في البنك</p>
                        <p className="text-sm">أضف أسئلة جديدة لتتمكن من استخدامها في الاختبارات لاحقاً.</p>
                    </div>
                )}
            </div>

            {isModalOpen && editingQuestion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                {editingQuestion.id.length > 10 ? 'تحرير سؤال' : 'سؤال جديد'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">نص السؤال</label>
                                <textarea 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" 
                                    rows={3} 
                                    value={editingQuestion.text} 
                                    onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})}
                                    placeholder="أدخل نص السؤال هنا..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">نوع السؤال</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                                        value={editingQuestion.type}
                                        onChange={e => setEditingQuestion({...editingQuestion, type: e.target.value as any, options: e.target.value === 'TRUE_FALSE' ? ['صح', 'خطأ'] : ['', '', '', ''], correctAnswer: ''})}
                                    >
                                        <option value="MCQ">خيارات متعددة</option>
                                        <option value="TRUE_FALSE">صح أو خطأ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border rounded-lg text-center font-bold text-sm" 
                                        value={editingQuestion.points} 
                                        onChange={e => setEditingQuestion({...editingQuestion, points: Number(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                                    <select className="w-full p-2 border rounded-lg text-sm bg-white" value={editingQuestion.subject || ''} onChange={e => setEditingQuestion({...editingQuestion, subject: e.target.value})}>
                                        <option value="">-- اختر --</option>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">الصف</label>
                                    <select className="w-full p-2 border rounded-lg text-sm bg-white" value={editingQuestion.gradeLevel || ''} onChange={e => setEditingQuestion({...editingQuestion, gradeLevel: e.target.value})}>
                                        <option value="">-- اختر الصف --</option>
                                        {[
                                            "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
                                            "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
                                            "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
                                            "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
                                        ].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 mb-3">الإجابة الصحيحة</label>
                                {editingQuestion.type === 'MCQ' ? editingQuestion.options.map((opt, i) => (
                                    <div key={i} className="flex gap-2 mb-2 items-center">
                                        <input 
                                            type="radio" 
                                            name="correct" 
                                            className="w-4 h-4 accent-green-600"
                                            checked={editingQuestion.correctAnswer === opt && opt !== ''} 
                                            onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: opt})} 
                                        />
                                        <input 
                                            className="flex-1 p-2 border rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none" 
                                            placeholder={`الخيار ${i+1}`} 
                                            value={opt} 
                                            onChange={e => {
                                                const newOpts = [...editingQuestion.options];
                                                newOpts[i] = e.target.value;
                                                setEditingQuestion({...editingQuestion, options: newOpts});
                                            }} 
                                        />
                                    </div>
                                )) : (
                                    <div className="flex gap-4">
                                        {['صح', 'خطأ'].map(val => (
                                            <label key={val} className={`flex-1 p-3 border rounded-lg text-center cursor-pointer font-bold text-sm ${editingQuestion.correctAnswer === val ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white hover:bg-gray-50'}`}>
                                                <input 
                                                    type="radio" 
                                                    name="correctTF" 
                                                    className="hidden"
                                                    checked={editingQuestion.correctAnswer === val} 
                                                    onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: val})} 
                                                />
                                                {val}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={handleSave} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 shadow-md transition-colors mt-2">
                                حفظ السؤال
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
