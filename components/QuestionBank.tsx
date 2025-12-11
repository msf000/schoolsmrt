
import React, { useState, useEffect } from 'react';
import { Question, SystemUser, Subject } from '../types';
import { getQuestionBank, saveQuestionToBank, deleteQuestionFromBank, getSubjects } from '../services/storageService';
import { Library, Plus, Trash2, Search, Filter, Edit2, Save, X } from 'lucide-react';

interface QuestionBankProps {
    currentUser: any;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ currentUser }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
    
    // Filters
    const [filterSubject, setFilterSubject] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Editor
    const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({});

    useEffect(() => {
        if (currentUser?.id) {
            setQuestions(getQuestionBank(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    const filteredQuestions = questions.filter(q => {
        if (filterSubject && q.subject !== filterSubject) return false;
        if (filterGrade && q.gradeLevel !== filterGrade) return false;
        if (searchTerm && !q.text.includes(searchTerm)) return false;
        return true;
    });

    const handleSave = () => {
        if (!editingQuestion.text || !editingQuestion.correctAnswer || !editingQuestion.subject) return alert('البيانات ناقصة');
        
        const q: Question = {
            id: editingQuestion.id || Date.now().toString(),
            text: editingQuestion.text,
            type: editingQuestion.type || 'MCQ',
            options: editingQuestion.type === 'MCQ' ? (editingQuestion.options || []) : ['صح', 'خطأ'],
            correctAnswer: editingQuestion.correctAnswer,
            points: editingQuestion.points || 1,
            subject: editingQuestion.subject,
            gradeLevel: editingQuestion.gradeLevel,
            teacherId: currentUser.id
        };

        saveQuestionToBank(q);
        setQuestions(getQuestionBank(currentUser.id));
        setEditingQuestion({});
        setView('LIST');
    };

    const handleDelete = (id: string) => {
        if (confirm('حذف السؤال؟')) {
            deleteQuestionFromBank(id);
            setQuestions(getQuestionBank(currentUser.id));
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Library className="text-teal-600"/> بنك الأسئلة</h2>
                        <button onClick={() => { setEditingQuestion({ type: 'MCQ', options: ['', '', '', ''], points: 1 }); setView('EDITOR'); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"><Plus size={18}/> سؤال جديد</button>
                    </div>

                    <div className="bg-white p-4 rounded-xl border shadow-sm mb-4 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                            <select className="w-full p-2 border rounded text-sm bg-gray-50" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                                <option value="">كل المواد</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">الصف</label>
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
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute top-3 right-3 text-gray-400"/>
                            <input className="w-full pl-2 pr-9 py-2 border rounded text-sm" placeholder="بحث في نص السؤال..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white rounded-xl border shadow-sm p-4 space-y-3 custom-scrollbar">
                        {filteredQuestions.map(q => (
                            <div key={q.id} className="border p-4 rounded-lg hover:bg-gray-50 flex justify-between items-start group">
                                <div>
                                    <div className="font-bold text-gray-800 text-sm mb-1">{q.text}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        <span className="bg-gray-100 px-2 rounded">{q.subject}</span>
                                        <span className="bg-gray-100 px-2 rounded">{q.gradeLevel}</span>
                                        <span className="bg-green-50 text-green-700 px-2 rounded font-bold">الإجابة: {q.correctAnswer}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingQuestion(q); setView('EDITOR'); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(q.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {filteredQuestions.length === 0 && <div className="text-center py-20 text-gray-400">لا توجد أسئلة</div>}
                    </div>
                </>
            )}

            {view === 'EDITOR' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border h-fit my-auto">
                    <div className="flex justify-between mb-6 border-b pb-4">
                        <h3 className="font-bold text-lg text-gray-800">{editingQuestion.id ? 'تعديل سؤال' : 'إضافة سؤال جديد'}</h3>
                        <button onClick={() => setView('LIST')}><X size={20} className="text-gray-400"/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
                                <select className="w-full p-2 border rounded" value={editingQuestion.subject || ''} onChange={e => setEditingQuestion({...editingQuestion, subject: e.target.value})}>
                                    <option value="">-- اختر المادة --</option>
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
                            <label className="block text-sm font-bold text-gray-700 mb-1">نص السؤال</label>
                            <input className="w-full p-2 border rounded" value={editingQuestion.text || ''} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">نوع السؤال</label>
                            <select className="w-full p-2 border rounded" value={editingQuestion.type} onChange={e => setEditingQuestion({...editingQuestion, type: e.target.value as any})}>
                                <option value="MCQ">اختر من متعدد</option>
                                <option value="TRUE_FALSE">صح أو خطأ</option>
                            </select>
                        </div>

                        {editingQuestion.type === 'MCQ' && (
                            <div className="grid grid-cols-2 gap-2">
                                {[0,1,2,3].map(i => (
                                    <input 
                                        key={i} 
                                        className="p-2 border rounded text-sm" 
                                        placeholder={`خيار ${i+1}`} 
                                        value={editingQuestion.options?.[i] || ''} 
                                        onChange={e => {
                                            const opts = [...(editingQuestion.options || [])];
                                            opts[i] = e.target.value;
                                            setEditingQuestion({...editingQuestion, options: opts});
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">الإجابة الصحيحة</label>
                                <select className="w-full p-2 border rounded" value={editingQuestion.correctAnswer || ''} onChange={e => setEditingQuestion({...editingQuestion, correctAnswer: e.target.value})}>
                                    <option value="">-- اختر --</option>
                                    {editingQuestion.type === 'MCQ' ? editingQuestion.options?.map(o => o && <option key={o} value={o}>{o}</option>) : <><option value="صح">صح</option><option value="خطأ">خطأ</option></>}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-sm font-bold text-gray-700 mb-1">الدرجة</label>
                                <input type="number" className="w-full p-2 border rounded text-center" value={editingQuestion.points} onChange={e => setEditingQuestion({...editingQuestion, points: Number(e.target.value)})}/>
                            </div>
                        </div>

                        <button onClick={handleSave} className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2"><Save size={18}/> حفظ السؤال</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
