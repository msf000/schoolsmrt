
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, SystemUser, ExamResult, Subject, CurriculumUnit, CurriculumLesson, AcademicTerm } from '../types';
import { getExams, saveExam, deleteExam, getExamResults, getSubjects, getStudents, getQuestionBank, getCurriculumUnits, getCurriculumLessons, getAcademicTerms } from '../services/storageService';
import { generateStructuredQuiz } from '../services/geminiService';
import { FileQuestion, Plus, Trash2, Edit, Save, CheckCircle, XCircle, Clock, BookOpen, ListChecks, PlayCircle, StopCircle, ArrowLeft, BarChart2, Sparkles, Filter, Loader2, Check, Download, Search, ListTree, Calendar } from 'lucide-react';

interface ExamsManagerProps {
    currentUser: SystemUser;
}

const ExamsManager: React.FC<ExamsManagerProps> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'RESULTS' | 'CREATION_SELECTION' | 'BANK_IMPORT'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [editingExam, setEditingExam] = useState<Partial<Exam>>({});
    const [viewingResults, setViewingResults] = useState<{ exam: Exam, results: ExamResult[] } | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [availableGrades, setAvailableGrades] = useState<string[]>([]);

    // Question Bank Data
    const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
    const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());
    const [bankFilterTopic, setBankFilterTopic] = useState('');

    // Filters
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
    
    // Terms State
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState('');

    // AI Generation State
    const [aiConfig, setAiConfig] = useState({ topic: '', count: 5, difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD' });
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Question Builder State
    const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
        type: 'MCQ',
        options: ['', '', '', ''],
        points: 1
    });

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = () => {
        const all = getExams(currentUser.id);
        setExams(all.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setSubjects(getSubjects(currentUser.id));
        setBankQuestions(getQuestionBank(currentUser.id));
        
        const allStudents = getStudents();
        const grades = Array.from(new Set(allStudents.map(s => s.gradeLevel).filter((g): g is string => !!g))).sort();
        setAvailableGrades(grades);

        const loadedTerms = getAcademicTerms(currentUser.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
    };

    const uniqueGrades = useMemo(() => Array.from(new Set(exams.map(e => e.gradeLevel))).sort(), [exams]);

    const filteredExams = useMemo(() => {
        const activeTerm = terms.find(t => t.id === selectedTermId);
        
        return exams.filter(e => {
            if (selectedSubjectFilter && e.subject !== selectedSubjectFilter) return false;
            if (selectedGradeFilter && e.gradeLevel !== selectedGradeFilter) return false;
            
            // Term Filter
            if (activeTerm && e.date) {
                if (e.date < activeTerm.startDate || e.date > activeTerm.endDate) return false;
            }

            return true;
        });
    }, [exams, selectedSubjectFilter, selectedGradeFilter, selectedTermId, terms]);

    // --- CREATION FLOW ---
    const startCreation = () => {
        setEditingExam({
            id: Date.now().toString(),
            title: '',
            subject: selectedSubjectFilter || (subjects.length > 0 ? subjects[0].name : ''),
            gradeLevel: selectedGradeFilter || (availableGrades.length > 0 ? availableGrades[0] : ''),
            durationMinutes: 30,
            questions: [],
            isActive: false,
            createdAt: new Date().toISOString(),
            teacherId: currentUser.id,
            date: new Date().toISOString().split('T')[0] // Default to today
        });
        setView('CREATION_SELECTION');
    };

    const handleCreateManual = () => {
        setView('EDITOR');
        setCurrentQuestion({ type: 'MCQ', options: ['', '', '', ''], points: 1 });
    };

    const handleCreateAI = async () => {
        if (!aiConfig.topic) return alert('الرجاء إدخال موضوع الاختبار');
        if (!editingExam.subject || !editingExam.gradeLevel) return alert('الرجاء تحديد المادة والصف أولاً');

        setIsAiLoading(true);
        try {
            const questions = await generateStructuredQuiz(
                editingExam.subject, 
                aiConfig.topic, 
                editingExam.gradeLevel, 
                aiConfig.count, 
                aiConfig.difficulty
            );
            
            const mappedQuestions: Question[] = questions.map((q: any) => ({
                id: Date.now().toString() + Math.random(),
                text: q.text || q.question,
                type: q.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MCQ',
                options: q.options || [],
                correctAnswer: q.correctAnswer,
                points: q.points || 1
            }));

            setEditingExam(prev => ({
                ...prev,
                title: `اختبار: ${aiConfig.topic}`,
                questions: mappedQuestions
            }));
            
            setView('EDITOR');
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء التوليد بالذكاء الاصطناعي.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleEdit = (exam: Exam) => {
        setEditingExam(JSON.parse(JSON.stringify(exam))); // Deep copy
        setCurrentQuestion({ type: 'MCQ', options: ['', '', '', ''], points: 1 });
        setView('EDITOR');
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من حذف الاختبار؟ ستفقد جميع النتائج المرتبطة.')) {
            deleteExam(id);
            loadData();
        }
    };

    const handleToggleActive = (exam: Exam) => {
        const updated = { ...exam, isActive: !exam.isActive };
        saveExam(updated);
        loadData();
    };

    const handleViewResults = (exam: Exam) => {
        const results = getExamResults(exam.id);
        setViewingResults({ exam, results });
        setView('RESULTS');
    };

    // --- EDITOR LOGIC ---
    const addQuestion = () => {
        if (!currentQuestion.text || !currentQuestion.correctAnswer) {
            alert('الرجاء كتابة السؤال وتحديد الإجابة الصحيحة.');
            return;
        }
        
        const newQ: Question = {
            id: Date.now().toString() + Math.random(),
            text: currentQuestion.text!,
            type: currentQuestion.type || 'MCQ',
            options: currentQuestion.type === 'MCQ' ? (currentQuestion.options || []) : ['صح', 'خطأ'],
            correctAnswer: currentQuestion.correctAnswer!,
            points: currentQuestion.points || 1
        };

        setEditingExam(prev => ({
            ...prev,
            questions: [...(prev.questions || []), newQ]
        }));

        setCurrentQuestion({ type: 'MCQ', options: ['', '', '', ''], points: 1 });
    };

    const removeQuestion = (qId: string) => {
        setEditingExam(prev => ({
            ...prev,
            questions: prev.questions?.filter(q => q.id !== qId)
        }));
    };

    const saveCurrentExam = () => {
        if (!editingExam.title || !editingExam.subject) {
            alert('عنوان الاختبار والمادة مطلوبان');
            return;
        }
        if (!editingExam.questions || editingExam.questions.length === 0) {
            alert('يجب إضافة سؤال واحد على الأقل');
            return;
        }

        saveExam(editingExam as Exam);
        loadData();
        setView('LIST');
    };

    const updateOption = (index: number, val: string) => {
        const newOpts = [...(currentQuestion.options || [])];
        newOpts[index] = val;
        setCurrentQuestion({ ...currentQuestion, options: newOpts });
    };

    // --- BANK IMPORT LOGIC ---
    const filteredBankQuestions = useMemo(() => {
        return bankQuestions.filter(q => 
            q.subject === editingExam.subject && 
            (!bankFilterTopic || q.topic?.includes(bankFilterTopic) || q.text.includes(bankFilterTopic))
        );
    }, [bankQuestions, editingExam.subject, bankFilterTopic]);

    const toggleBankSelection = (id: string) => {
        const newSet = new Set(selectedBankQuestions);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedBankQuestions(newSet);
    };

    const importSelectedQuestions = () => {
        const selected = bankQuestions.filter(q => selectedBankQuestions.has(q.id));
        setEditingExam(prev => ({
            ...prev,
            questions: [...(prev.questions || []), ...selected]
        }));
        setSelectedBankQuestions(new Set());
        setView('EDITOR');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            
            {view === 'LIST' && (
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileQuestion className="text-purple-600"/> الاختبارات الإلكترونية
                            </h2>
                            <p className="text-sm text-gray-500">إنشاء وإدارة الاختبارات القصيرة والنهائية وجدولتها.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="flex items-center gap-2 bg-white border p-1 rounded-lg shadow-sm flex-1">
                                <Filter size={16} className="text-gray-400 ml-1"/>
                                
                                {/* Term Selector */}
                                <select 
                                    className="text-sm outline-none bg-transparent font-bold text-purple-700 w-full min-w-[100px]"
                                    value={selectedTermId}
                                    onChange={e => setSelectedTermId(e.target.value)}
                                >
                                    <option value="">كل الفترات</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>

                                <select 
                                    className="text-sm outline-none bg-transparent font-bold text-gray-700 w-full"
                                    value={selectedSubjectFilter}
                                    onChange={e => setSelectedSubjectFilter(e.target.value)}
                                >
                                    <option value="">كل المواد</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                                <select 
                                    className="text-sm outline-none bg-transparent font-bold text-gray-700 w-full"
                                    value={selectedGradeFilter}
                                    onChange={e => setSelectedGradeFilter(e.target.value)}
                                >
                                    <option value="">كل الصفوف</option>
                                    {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <button onClick={startCreation} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md whitespace-nowrap">
                                <Plus size={18}/> جديد
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredExams.length > 0 ? filteredExams.map(exam => (
                            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden flex flex-col">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{exam.title}</h3>
                                        {exam.isActive ? 
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><PlayCircle size={12}/> نشط</span> : 
                                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><StopCircle size={12}/> متوقف</span>
                                        }
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2"><BookOpen size={14}/> {exam.subject} - {exam.gradeLevel}</div>
                                        <div className="flex items-center gap-2"><Clock size={14}/> {exam.durationMinutes} دقيقة</div>
                                        <div className="flex items-center gap-2"><ListChecks size={14}/> {exam.questions.length} أسئلة</div>
                                        {exam.date && <div className="flex items-center gap-2 text-purple-600 font-bold"><Calendar size={14}/> موعد: {exam.date}</div>}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 flex justify-between border-t">
                                    <button onClick={() => handleToggleActive(exam)} className={`text-xs font-bold px-3 py-1 rounded border ${exam.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-white border-green-200 text-green-600 hover:bg-green-50'}`}>
                                        {exam.isActive ? 'إيقاف' : 'نشر'}
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleViewResults(exam)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="النتائج"><BarChart2 size={16}/></button>
                                        <button onClick={() => handleEdit(exam)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="تعديل"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="حذف"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <FileQuestion size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>لم تقم بإنشاء أي اختبارات بعد لهذا التصنيف.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'CREATION_SELECTION' && (
                <div className="flex flex-col items-center justify-center h-full relative">
                    <button onClick={() => setView('LIST')} className="absolute top-6 right-6 p-2 bg-white rounded-full shadow hover:bg-gray-100"><XCircle/></button>
                    
                    <h2 className="text-2xl font-bold mb-8 text-gray-800">كيف تريد إنشاء الاختبار؟</h2>
                    
                    {/* Basic Info needed for AI */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border w-full max-w-lg mb-8">
                        <h4 className="font-bold mb-4 text-gray-700">بيانات الاختبار الأساسية</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">المادة</label>
                                <select className="w-full p-2 border rounded" value={editingExam.subject} onChange={e => setEditingExam({...editingExam, subject: e.target.value})}>
                                    <option value="">اختر المادة</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">الصف</label>
                                <div className="relative">
                                    <input 
                                        list="gradeOptions"
                                        className="w-full p-2 border rounded" 
                                        placeholder="مثال: أول متوسط" 
                                        value={editingExam.gradeLevel} 
                                        onChange={e => setEditingExam({...editingExam, gradeLevel: e.target.value})} 
                                    />
                                    <datalist id="gradeOptions">
                                        {availableGrades.map(g => <option key={g} value={g} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                        <button onClick={handleCreateManual} className="group p-8 bg-white border-2 border-gray-200 hover:border-purple-500 rounded-2xl text-center transition-all hover:shadow-xl">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-100 text-purple-600">
                                <Edit size={32}/>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">إنشاء يدوي / من البنك</h3>
                            <p className="text-gray-500 text-sm">كتابة الأسئلة يدوياً أو اختيارها من بنك الأسئلة.</p>
                        </button>

                        <div className="group p-8 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 hover:border-purple-500 rounded-2xl text-center transition-all hover:shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">ذكاء اصطناعي</div>
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                                {isAiLoading ? <Loader2 className="animate-spin"/> : <Sparkles size={32}/>}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">توليد تلقائي (AI)</h3>
                            
                            <div className="space-y-3 text-right">
                                <input className="w-full p-2 border rounded text-sm" placeholder="موضوع الاختبار (مثال: الفاعل)" value={aiConfig.topic} onChange={e => setAiConfig({...aiConfig, topic: e.target.value})}/>
                                <div className="flex gap-2">
                                    <select className="flex-1 p-2 border rounded text-sm" value={aiConfig.difficulty} onChange={e => setAiConfig({...aiConfig, difficulty: e.target.value as any})}>
                                        <option value="EASY">سهل</option>
                                        <option value="MEDIUM">متوسط</option>
                                        <option value="HARD">صعب</option>
                                    </select>
                                    <select className="w-24 p-2 border rounded text-sm" value={aiConfig.count} onChange={e => setAiConfig({...aiConfig, count: Number(e.target.value)})}>
                                        <option value="3">3 أسئلة</option>
                                        <option value="5">5 أسئلة</option>
                                        <option value="10">10 أسئلة</option>
                                    </select>
                                </div>
                                <button onClick={handleCreateAI} disabled={isAiLoading} className="w-full py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 disabled:opacity-50">
                                    {isAiLoading ? 'جاري التوليد...' : 'ابدأ التوليد'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'EDITOR' && (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft/></button>
                            <h2 className="text-xl font-bold text-gray-800">محرر الاختبار</h2>
                        </div>
                        <button 
                            onClick={() => setView('BANK_IMPORT')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Download size={18}/> استيراد من البنك
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 h-full min-h-0">
                        {/* Settings & Questions List */}
                        <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                <h3 className="font-bold text-gray-700 text-sm">إعدادات الاختبار</h3>
                                <input className="w-full p-2 border rounded text-sm" placeholder="عنوان الاختبار" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})}/>
                                <div className="grid grid-cols-2 gap-2">
                                    <select className="w-full p-2 border rounded text-sm" value={editingExam.subject} onChange={e => setEditingExam({...editingExam, subject: e.target.value})}>
                                        <option value="">المادة</option>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                    <input className="w-full p-2 border rounded text-sm" placeholder="الصف" value={editingExam.gradeLevel} onChange={e => setEditingExam({...editingExam, gradeLevel: e.target.value})}/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                                        <Clock size={14} className="text-gray-500"/>
                                        <label className="text-xs font-bold text-gray-600">المدة:</label>
                                        <input type="number" className="w-12 p-1 border rounded text-center text-sm font-bold outline-none" value={editingExam.durationMinutes} onChange={e => setEditingExam({...editingExam, durationMinutes: parseInt(e.target.value) || 0})}/>
                                    </div>
                                    <div className="flex items-center gap-2 bg-purple-50 p-2 rounded border border-purple-200">
                                        <Calendar size={14} className="text-purple-600"/>
                                        <input type="date" className="w-full p-1 bg-transparent text-xs font-bold outline-none" value={editingExam.date || ''} onChange={e => setEditingExam({...editingExam, date: e.target.value})}/>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-700 text-sm mb-2">الأسئلة المضافة ({editingExam.questions?.length || 0})</h3>
                                <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
                                    {editingExam.questions?.map((q, idx) => (
                                        <div key={q.id} className="p-3 bg-gray-50 rounded border flex justify-between items-start group hover:border-purple-300 transition-colors">
                                            <div className="text-sm">
                                                <span className="font-bold text-purple-700 ml-1">{idx + 1}.</span>
                                                {q.text}
                                                <div className="text-xs text-gray-400 mt-1">{q.type === 'MCQ' ? 'اختيار متعدد' : 'صح/خطأ'} ({q.points} درجة)</div>
                                            </div>
                                            <button onClick={() => removeQuestion(q.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {(!editingExam.questions || editingExam.questions.length === 0) && <p className="text-center text-xs text-gray-400 py-4">لا توجد أسئلة</p>}
                                </div>
                                <button onClick={saveCurrentExam} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold mt-4 hover:bg-green-700 flex items-center justify-center gap-2">
                                    <Save size={16}/> حفظ الاختبار
                                </button>
                            </div>
                        </div>

                        {/* Question Builder Form */}
                        <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
                            <h3 className="font-bold text-lg text-purple-800 mb-6 border-b pb-2 flex items-center gap-2">
                                <Plus size={20}/> إضافة سؤال جديد
                            </h3>
                            
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">نص السؤال</label>
                                    <textarea 
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-24 text-sm" 
                                        placeholder="اكتب السؤال هنا..." 
                                        value={currentQuestion.text || ''}
                                        onChange={e => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">نوع السؤال</label>
                                        <select 
                                            className="w-full p-2 border rounded-lg bg-gray-50"
                                            value={currentQuestion.type}
                                            onChange={e => setCurrentQuestion({...currentQuestion, type: e.target.value as any, correctAnswer: ''})}
                                        >
                                            <option value="MCQ">اختيار من متعدد</option>
                                            <option value="TRUE_FALSE">صح أو خطأ</option>
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">الدرجة</label>
                                        <input type="number" min="1" className="w-full p-2 border rounded-lg text-center" value={currentQuestion.points} onChange={e => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value) || 1})}/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">الخيارات والإجابة الصحيحة</label>
                                    
                                    {currentQuestion.type === 'TRUE_FALSE' ? (
                                        <div className="flex gap-4">
                                            {['صح', 'خطأ'].map(opt => (
                                                <button 
                                                    key={opt}
                                                    onClick={() => setCurrentQuestion({...currentQuestion, correctAnswer: opt})}
                                                    className={`flex-1 py-3 rounded-lg border font-bold transition-all ${currentQuestion.correctAnswer === opt ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {opt === 'صح' ? <CheckCircle className="inline ml-2" size={16}/> : <XCircle className="inline ml-2" size={16}/>}
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {currentQuestion.options?.map((opt, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div onClick={() => setCurrentQuestion({...currentQuestion, correctAnswer: opt})} className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center ${currentQuestion.correctAnswer === opt && opt !== '' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>
                                                        {currentQuestion.correctAnswer === opt && opt !== '' && <Check size={14}/>}
                                                    </div>
                                                    <input 
                                                        className={`flex-1 p-2 border rounded text-sm ${currentQuestion.correctAnswer === opt && opt !== '' ? 'border-green-500 bg-green-50' : ''}`}
                                                        placeholder={`الخيار ${i + 1}`}
                                                        value={opt}
                                                        onChange={e => updateOption(i, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <button onClick={addQuestion} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 shadow-lg">
                                        إضافة السؤال
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'BANK_IMPORT' && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Download size={18} className="text-indigo-600"/> استيراد من بنك الأسئلة</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setView('EDITOR')} className="px-4 py-2 border rounded-lg text-gray-600 bg-white hover:bg-gray-100 text-sm font-bold">إلغاء</button>
                            <button onClick={importSelectedQuestions} disabled={selectedBankQuestions.size === 0} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50 text-sm">
                                إضافة المحدد ({selectedBankQuestions.size})
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-4 border-b flex gap-4 bg-white">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                            <input 
                                className="w-full pr-9 pl-4 py-2 border rounded-lg text-sm"
                                placeholder="بحث في البنك..."
                                value={bankFilterTopic}
                                onChange={e => setBankFilterTopic(e.target.value)}
                            />
                        </div>
                        <div className="bg-gray-100 px-3 py-2 rounded text-xs font-bold text-gray-500 border">
                            المادة: {editingExam.subject}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {filteredBankQuestions.length > 0 ? (
                            <div className="grid gap-3">
                                {filteredBankQuestions.map(q => (
                                    <div 
                                        key={q.id} 
                                        onClick={() => toggleBankSelection(q.id)}
                                        className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedBankQuestions.has(q.id) ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 mb-1">{q.text}</p>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span className="bg-white border px-2 rounded">{q.type === 'MCQ' ? 'اختيار متعدد' : 'صح/خطأ'}</span>
                                                    <span className="bg-white border px-2 rounded">{q.points} درجة</span>
                                                    {q.topic && <span className="bg-blue-50 text-blue-700 px-2 rounded">{q.topic}</span>}
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedBankQuestions.has(q.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>
                                                {selectedBankQuestions.has(q.id) && <Check size={14}/>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-400">
                                <ListChecks size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>لا توجد أسئلة مطابقة في البنك لهذه المادة.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'RESULTS' && viewingResults && (
                <div className="h-full flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft/></button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">نتائج: {viewingResults.exam.title}</h2>
                            <p className="text-sm text-gray-500">{viewingResults.results.length} طالب قاموا بالحل</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-700">
                                <tr>
                                    <th className="p-4">اسم الطالب</th>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4">الدرجة</th>
                                    <th className="p-4">النسبة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {viewingResults.results.length > 0 ? viewingResults.results.map(res => (
                                    <tr key={res.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-800">{res.studentName}</td>
                                        <td className="p-4 text-gray-600 font-mono text-xs">{new Date(res.date).toLocaleDateString('ar-SA')}</td>
                                        <td className="p-4 font-bold font-mono">{res.score} / {res.totalScore}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${(res.score/res.totalScore) >= 0.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {Math.round((res.score / res.totalScore) * 100)}%
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد نتائج حتى الآن</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
