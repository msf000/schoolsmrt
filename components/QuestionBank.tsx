
import React, { useState, useEffect, useMemo } from 'react';
import { Question, SystemUser, Subject } from '../types';
import { getQuestionBank, saveQuestionToBank, deleteQuestionFromBank, getSubjects } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { Plus, Trash2, Edit, Search, Filter, Save, X, Library, CheckCircle, FileQuestion, GraduationCap, Download, Upload, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
];

const QuestionBank: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [filterGrade, setFilterGrade] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // AI Generation State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(3);
    const [aiDifficulty, setAiDifficulty] = useState('MEDIUM');
    const [isGenerating, setIsGenerating] = useState(false);

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
        if(confirm('هل أنت متأكد من حذف هذا السؤال من البنك؟')) {
            deleteQuestionFromBank(id);
            setQuestions(getQuestionBank(currentUser.id));
        }
    };

    const handleAiGenerate = async () => {
        if (!aiTopic || !filterSubject || !filterGrade) {
            alert('الرجاء تحديد المادة والصف من الفلاتر أولاً ثم كتابة موضوع الدرس.');
            return;
        }
        setIsGenerating(true);
        try {
            const generated = await generateStructuredQuiz(filterSubject, aiTopic, filterGrade, aiCount, aiDifficulty);
            if (Array.isArray(generated)) {
                generated.forEach((q: any) => {
                    saveQuestionToBank({
                        id: `ai_${Date.now()}_${Math.random()}`,
                        text: q.question,
                        type: 'MCQ',
                        options: q.options || [],
                        correctAnswer: q.correctAnswer,
                        points: 1,
                        teacherId: currentUser.id,
                        subject: filterSubject,
                        gradeLevel: filterGrade
                    });
                });
                setQuestions(getQuestionBank(currentUser.id));
                setIsAiModalOpen(false);
                setAiTopic('');
            }
        } catch (e) { alert('فشل توليد الأسئلة'); } finally { setIsGenerating(false); }
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
            subject: filterSubject || (subjects[0]?.name || '')
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 h-full bg-gray-50 animate-fade-in flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Library className="text-purple-600"/> بنك الأسئلة المركزي</h2>
                    <p className="text-sm text-gray-500">إدارة وتوليد الأسئلة لاستخدامها في الاختبارات والواجبات.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsAiModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md"><Sparkles size={16}/> توليد بالذكاء AI</button>
                    <button onClick={() => openEditor()} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md"><Plus size={18}/> سؤال جديد</button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border mb-6 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm" placeholder="بحث في محتوى الأسئلة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="p-2 border rounded-lg text-sm font-bold bg-gray-50" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                    <option value="">كل الصفوف</option>
                    {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="p-2 border rounded-lg text-sm font-bold bg-gray-50" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                    <option value="">كل المواد</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {filteredQuestions.map(q => (
                    <div key={q.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-purple-200 transition-all group relative">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.type==='MCQ'?'bg-blue-50 text-blue-600':'bg-orange-50 text-orange-600'}`}>{q.type==='MCQ'?'اختيارات':'صح/خطأ'}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditor(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={14}/></button>
                                <button onClick={() => handleDelete(q.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <p className="font-bold text-gray-800 text-lg mb-4">{q.text}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt, i) => (
                                <div key={i} className={`p-2 rounded-lg border text-sm flex items-center gap-2 ${opt===q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-transparent'}`}>
                                    {opt===q.correctAnswer ? <CheckCircle size={14}/> : <div className="w-3 h-3 rounded-full border border-gray-300"></div>}
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Modal */}
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-bounce-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-purple-600"/> توليد أسئلة ذكية</h3>
                            <button onClick={() => setIsAiModalOpen(false)}><X className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">موضوع الدرس</label>
                                <input className="w-full p-2 border rounded-lg" placeholder="مثال: بناء الجملة الاسمية" value={aiTopic} onChange={e => setAiTopic(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">العدد</label>
                                    <select className="w-full p-2 border rounded-lg" value={aiCount} onChange={e => setAiCount(Number(e.target.value))}><option value="3">3 أسئلة</option><option value="5">5 أسئلة</option></select>
                                </div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">الصعوبة</label>
                                    <select className="w-full p-2 border rounded-lg" value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}><option value="EASY">سهل</option><option value="MEDIUM">متوسط</option><option value="HARD">صعب</option></select>
                                </div>
                            </div>
                            <button onClick={handleAiGenerate} disabled={isGenerating || !aiTopic} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg disabled:opacity-50">
                                {isGenerating ? <Loader2 className="animate-spin"/> : <Sparkles/>} {isGenerating ? 'جاري التوليد...' : 'توليد وإضافة للبنك'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
