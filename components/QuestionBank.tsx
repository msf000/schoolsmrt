
import React, { useState, useEffect, useMemo } from 'react';
import { Question, SystemUser, Subject } from '../types';
import { getQuestionBank, saveQuestionToBank, deleteQuestionFromBank, getSubjects } from '../services/storageService';
import { Plus, Trash2, Edit, Search, Filter, Save, X, Library } from 'lucide-react';

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
            teacherId: currentUser.id
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 h-full bg-gray-50 animate-fade-in flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Library className="text-purple-600"/> بنك الأسئلة
                </h2>
                <button onClick={() => openEditor()} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2">
                    <Plus size={18}/> سؤال جديد
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm" placeholder="بحث في نص السؤال..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div>
                    <select className="w-full p-2 border rounded text-sm bg-gray-50" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
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
                    <select className="w-full p-2 border rounded text-sm bg-gray-50" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                        <option value="">كل المواد</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 custom-scrollbar">
                {filteredQuestions.map(q => (
                    <div key={q.id} className="p-4 border rounded-lg hover:border-purple-300 transition-colors bg-gray-50 hover:bg-white group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">{q.type}</span>
                                <span className="text-xs text-gray-500">{q.subject} - {q.gradeLevel}</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditor(q)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="font-bold text-gray-800 text-lg">{q.text}</p>
                        {q.type === 'MCQ' && (
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                {q.options.map((opt, i) => (
                                    <div key={i} className={`px-2 py-1 rounded ${opt === q.correctAnswer ? 'bg-green-100 text-green-800 font-bold border border-green-200' : 'bg-white border'}`}>
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {filteredQuestions.length === 0 && <div className="text-center py-20 text-gray-400">لا توجد أسئلة</div>}
            </div>

            {isModalOpen && editingQuestion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-bounce-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">تحرير سؤال</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">نص السؤال</label>
                                <textarea className="w-full p-2 border rounded" rows={3} value={editingQuestion.text} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
                                    <select className="w-full p-2 border rounded" value={editingQuestion.subject || ''} onChange={e => setEditingQuestion({...editingQuestion, subject: e.target.value})}>
                                        <option value="">-- اختر --</option>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">الصف</label>
                                    <select className="w-full p-2 border rounded" value={editingQuestion.gradeLevel || ''} onChange={e => setEditingQuestion({...editingQuestion, gradeLevel: e.target.value})}>
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
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الخيارات (للإختيار من متعدد)</label>
                                {editingQuestion.options.map((opt, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input className="flex-1 p-2 border rounded text-sm" placeholder={`الخيار ${i+1}`} value={opt} onChange={e => {
                                            const newOpts = [...editingQuestion.options];
                                            newOpts[i] = e.target.value;
                                            setEditingQuestion({...editingQuestion, options: newOpts});
                                        }} />
                                        <input type="radio" name="correct" checked={editingQuestion.correctAnswer === opt && opt !== ''} onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: opt})} />
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleSave} className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700">حفظ السؤال</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
