import React, { useState, useEffect, useMemo } from 'react';
import { Question, SystemUser, Subject } from '../types';
import { getQuestionBank, saveQuestionToBank, deleteQuestionFromBank, getSubjects } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { Search, Plus, Trash2, Edit, Save, CheckCircle, XCircle, Filter, Sparkles, Loader2, Library, Copy, Check } from 'lucide-react';

interface QuestionBankProps {
    currentUser: SystemUser;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ currentUser }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
    const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({ type: 'MCQ', options: ['', '', '', ''], points: 1 });
    
    // Filters
    const [filterSubject, setFilterSubject] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // AI Generation
    const [aiConfig, setAiConfig] = useState({ topic: '', count: 3, difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD' });
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = () => {
        setQuestions(getQuestionBank(currentUser.id));
        setSubjects(getSubjects(currentUser.id));
    };

    const uniqueGrades = useMemo(() => Array.from(new Set(questions.map(q => q.gradeLevel).filter(Boolean))).sort(), [questions]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            if (filterSubject && q.subject !== filterSubject) return false;
            if (filterGrade && q.gradeLevel !== filterGrade) return false;
            if (searchTerm && !q.text.includes(searchTerm) && !q.topic?.includes(searchTerm)) return false;
            return true;
        });
    }, [questions, filterSubject, filterGrade, searchTerm]);

    const handleSave = () => {
        if (!editingQuestion.text || !editingQuestion.correctAnswer || !editingQuestion.subject) {
            alert('يرجى إكمال البيانات الأساسية (النص، الإجابة، المادة)');
            return;
        }
        
        const q: Question = {
            id: editingQuestion.id || Date.now().toString(),
            text: editingQuestion.text,
            type: editingQuestion.type || 'MCQ',
            options: editingQuestion.type === 'MCQ' ? (editingQuestion.options || []) : ['صح', 'خطأ'],
            correctAnswer: editingQuestion.correctAnswer,
            points: editingQuestion.points || 1,
            subject: editingQuestion.subject,
            gradeLevel: editingQuestion.gradeLevel,
            topic: editingQuestion.topic,
            difficulty: editingQuestion.difficulty,
            teacherId: currentUser.id
        };

        saveQuestionToBank(q);
        loadData();
        setView('LIST');
        setEditingQuestion({ type: 'MCQ', options: ['', '', '', ''], points: 1 });
    };

    const handleDelete = (id: string) => {
        if (confirm('حذف هذا السؤال من البنك؟')) {
            deleteQuestionFromBank(id);
            loadData();
        }
    };

    const handleEdit = (q: Question) => {
        setEditingQuestion({ ...q });
        setView('EDITOR');
    };

    const handleGenerateAI = async () => {
        if (!filterSubject) return alert('اختر المادة أولاً لتوليد أسئلة لها');
        if (!aiConfig.topic) return alert('أدخل موضوع الأسئلة');

        setIsAiLoading(true);
        try {
            const generated = await generateStructuredQuiz(
                filterSubject, 
                aiConfig.topic, 
                filterGrade || 'عام', 
                aiConfig.count, 
                aiConfig.difficulty
            );

            let count = 0;
            generated.forEach((q: any) => {
                const newQ: Question = {
                    id: Date.now().toString() + Math.random(),
                    text: q.text || q.question,
                    type: q.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MCQ',
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    points: q.points || 1,
                    subject: filterSubject,
                    gradeLevel: filterGrade,
                    topic: aiConfig.topic,
                    difficulty: aiConfig.difficulty,
                    teacherId: currentUser.id
                };
                saveQuestionToBank(newQ);
                count++;
            });
            alert(`تم توليد وإضافة ${count} أسئلة للبنك!`);
            loadData();
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء التوليد');
        } finally {
            setIsAiLoading(false);
        }
    };

    const updateOption = (index: number, val: string) => {
        const newOpts = [...(editingQuestion.options || [])];
        newOpts[index] = val;
        setEditingQuestion({ ...editingQuestion, options: newOpts });
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Library className="text-purple-600"/> بنك الأسئلة
                    </h2>
                    <p className="text-sm text-gray-500">مستودع الأسئلة المركزي للاختبارات والواجبات.</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => { setEditingQuestion({ type: 'MCQ', options: ['', '', '', ''], points: 1 }); setView('EDITOR'); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md">
                        <Plus size={18}/> سؤال جديد
                    </button>
                </div>
            </div>

            {view === 'LIST' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Filters & AI Gen */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full md:w-auto grid grid-cols-1 md:grid-cols-3 gap-3">
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
                                    {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">بحث نصي</label>
                                <div className="relative">
                                    <Search size={14} className="absolute top-2.5 right-2 text-gray-400"/>
                                    <input className="w-full p-2 pr-7 border rounded text-sm" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                                </div>
                            </div>
                        </div>

                        {/* AI Generator Mini */}
                        <div className="bg-purple-50 p-2 rounded-lg border border-purple-100 flex items-center gap-2">
                            <input className="w-32 p-1.5 border rounded text-xs" placeholder="موضوع (للتوليد)" value={aiConfig.topic} onChange={e => setAiConfig({...aiConfig, topic: e.target.value})}/>
                            <select className="p-1.5 border rounded text-xs bg-white" value={aiConfig.count} onChange={e => setAiConfig({...aiConfig, count: Number(e.target.value)})}>
                                <option value="1">1</option>
                                <option value="3">3</option>
                                <option value="5">5</option>
                            </select>
                            <button onClick={handleGenerateAI} disabled={isAiLoading || !filterSubject} className="bg-purple-600 text-white p-1.5 rounded text-xs font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
                                {isAiLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} توليد
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b sticky top-0">
                                <tr>
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">نص السؤال</th>
                                    <th className="p-3 w-32">المادة</th>
                                    <th className="p-3 w-32">الموضوع</th>
                                    <th className="p-3 w-24">النوع</th>
                                    <th className="p-3 w-20 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredQuestions.map((q, idx) => (
                                    <tr key={q.id} className="hover:bg-gray-50 group">
                                        <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                                        <td className="p-3 font-medium text-gray-800">{q.text}</td>
                                        <td className="p-3 text-gray-500 text-xs">{q.subject}</td>
                                        <td className="p-3 text-gray-500 text-xs">{q.topic || '-'}</td>
                                        <td className="p-3 text-xs">
                                            <span className={`px-2 py-1 rounded ${q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {q.type === 'MCQ' ? 'اختيارات' : 'صح/خطأ'}
                                            </span>
                                        </td>
                                        <td className="p-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(q)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredQuestions.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-400">لا توجد أسئلة. ابدأ بإضافة أو توليد أسئلة.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'EDITOR' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto max-w-3xl mx-auto w-full">
                    <h3 className="font-bold text-lg mb-6 border-b pb-2">محرر السؤال</h3>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
                                <select className="w-full p-2 border rounded" value={editingQuestion.subject} onChange={e => setEditingQuestion({...editingQuestion, subject: e.target.value})}>
                                    <option value="">اختر المادة</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الصف</label>
                                <input className="w-full p-2 border rounded" value={editingQuestion.gradeLevel || ''} onChange={e => setEditingQuestion({...editingQuestion, gradeLevel: e.target.value})} placeholder="اختياري"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">نص السؤال</label>
                            <textarea className="w-full p-3 border rounded h-24" value={editingQuestion.text || ''} onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} placeholder="اكتب السؤال هنا..."/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">النوع</label>
                                <select className="w-full p-2 border rounded" value={editingQuestion.type} onChange={e => setEditingQuestion({...editingQuestion, type: e.target.value as any})}>
                                    <option value="MCQ">اختيار من متعدد</option>
                                    <option value="TRUE_FALSE">صح وخطأ</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الموضوع (Topic)</label>
                                <input className="w-full p-2 border rounded" value={editingQuestion.topic || ''} onChange={e => setEditingQuestion({...editingQuestion, topic: e.target.value})} placeholder="مثال: النحو"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الخيارات والإجابة الصحيحة</label>
                            {editingQuestion.type === 'TRUE_FALSE' ? (
                                <div className="flex gap-4">
                                    {['صح', 'خطأ'].map(opt => (
                                        <button 
                                            key={opt}
                                            onClick={() => setEditingQuestion({...editingQuestion, correctAnswer: opt})}
                                            className={`flex-1 py-3 rounded-lg border font-bold ${editingQuestion.correctAnswer === opt ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            {opt === 'صح' ? <CheckCircle className="inline ml-2" size={16}/> : <XCircle className="inline ml-2" size={16}/>}
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {editingQuestion.options?.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div onClick={() => setEditingQuestion({...editingQuestion, correctAnswer: opt})} className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center ${editingQuestion.correctAnswer === opt && opt !== '' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>
                                                {editingQuestion.correctAnswer === opt && opt !== '' && <Check size={14}/>}
                                            </div>
                                            <input className="flex-1 p-2 border rounded text-sm" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`الخيار ${i + 1}`}/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button onClick={() => setView('LIST')} className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50">إلغاء</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">حفظ السؤال</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;