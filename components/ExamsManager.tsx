
import React, { useState, useEffect, useRef } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getQuestionBank, getExamResults, deleteExamResult } from '../services/storageService';
import { Plus, Trash2, Edit, FileQuestion, Calendar, CheckCircle, XCircle, Save, ArrowLeft, Check, ListChecks, Type, Printer, Library, FileText, Download, Copy, BarChart2, Search, Filter, Settings, List } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExamsManagerProps {
    currentUser: SystemUser;
}

const ExamsManager: React.FC<ExamsManagerProps> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'PRINT' | 'RESULTS'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [questionBank, setQuestionBank] = useState<Question[]>([]);
    
    // Edit State
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [mobileEditorTab, setMobileEditorTab] = useState<'SETTINGS' | 'QUESTIONS'>('SETTINGS');
    
    // Bank Import State
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());
    const [bankSearch, setBankSearch] = useState('');
    const [bankFilterGrade, setBankFilterGrade] = useState('');

    // Results State
    const [selectedExamResults, setSelectedExamResults] = useState<ExamResult[]>([]);
    const [analytics, setAnalytics] = useState({ avg: 0, max: 0, min: 0, count: 0 });

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
            setQuestionBank(getQuestionBank(currentUser.id));
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
        setMobileEditorTab('SETTINGS');
        setView('EDITOR'); 
    };

    const duplicateExam = (examToCopy: Exam) => {
        const newExam: Exam = {
            ...examToCopy,
            id: Date.now().toString(),
            title: `${examToCopy.title} (نسخة)`,
            isActive: false,
            createdAt: new Date().toISOString()
        };
        saveExam(newExam);
        setExams(getExams(currentUser.id));
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
        if (confirm('هل أنت متأكد من حذف الاختبار؟ سيتم حذف جميع النتائج المرتبطة به.')) {
            deleteExam(id);
            setExams(getExams(currentUser.id));
        }
    };

    // --- Results Logic ---
    const handleViewResults = (exam: Exam) => {
        setEditingExam(exam);
        const results = getExamResults(exam.id);
        setSelectedExamResults(results);
        
        // Calc Stats
        if (results.length > 0) {
            const scores = results.map(r => r.score);
            const avg = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length * 10) / 10;
            setAnalytics({
                avg,
                max: Math.max(...scores),
                min: Math.min(...scores),
                count: results.length
            });
        } else {
            setAnalytics({ avg: 0, max: 0, min: 0, count: 0 });
        }
        
        setView('RESULTS');
    };

    const handleExportResults = () => {
        if (!editingExam) return;
        const data = selectedExamResults.map((r, i) => ({
            '#': i + 1,
            'اسم الطالب': r.studentName,
            'الدرجة': r.score,
            'الدرجة الكلية': r.totalScore,
            'النسبة': `${Math.round((r.score/r.totalScore)*100)}%`,
            'تاريخ التقديم': new Date(r.date).toLocaleDateString('ar-SA') + ' ' + new Date(r.date).toLocaleTimeString('ar-SA')
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "النتائج");
        XLSX.writeFile(wb, `نتائج_${editingExam.title}.xlsx`);
    };

    // --- Question Logic ---
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

    // --- Bank Import Logic ---
    const filteredBankQuestions = questionBank.filter(q => {
        const matchesSearch = q.text.includes(bankSearch);
        const matchesGrade = !bankFilterGrade || q.gradeLevel === bankFilterGrade;
        return matchesSearch && matchesGrade;
    });

    const toggleBankSelection = (id: string) => {
        const newSet = new Set(selectedBankQuestions);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedBankQuestions(newSet);
    };

    const importFromBank = () => {
        if (!editingExam) return;
        const questionsToAdd = questionBank.filter(q => selectedBankQuestions.has(q.id));
        
        // Clone questions to avoid reference issues (generate new IDs)
        const clonedQuestions = questionsToAdd.map(q => ({
            ...q,
            id: Date.now() + Math.random().toString() 
        }));

        setEditingExam({
            ...editingExam,
            questions: [...editingExam.questions, ...clonedQuestions]
        });
        setIsBankModalOpen(false);
        setSelectedBankQuestions(new Set());
    };

    // --- Print View Component ---
    const PrintView = () => {
        if (!editingExam) return null;
        return (
            <div className="bg-gray-100 p-4 md:p-8 min-h-screen overflow-auto">
                <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:w-full print:m-0 min-h-[297mm] flex flex-col">
                    {/* Toolbar */}
                    <div className="flex justify-between items-center p-4 border-b print:hidden bg-gray-800 text-white rounded-t-lg">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('LIST')} className="hover:text-gray-300"><ArrowLeft/></button>
                            <h3 className="font-bold">معاينة الطباعة (A4)</h3>
                        </div>
                        <button onClick={() => window.print()} className="bg-white text-gray-900 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-200">
                            <Printer size={18}/> طباعة
                        </button>
                    </div>

                    {/* Paper Content */}
                    <div className="p-12 print:p-8 font-serif text-black" dir="rtl">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                            <div className="text-center w-1/3 text-sm font-bold leading-loose">
                                <p>المملكة العربية السعودية</p>
                                <p>وزارة التعليم</p>
                                <p>مدرسة ....................</p>
                            </div>
                            <div className="text-center w-1/3 pt-2">
                                <div className="border-2 border-black py-3 px-6 rounded-xl inline-block shadow-sm">
                                    <h1 className="text-xl font-black">{editingExam.title}</h1>
                                </div>
                                <p className="font-bold mt-3 text-sm">{editingExam.gradeLevel}</p>
                            </div>
                            <div className="text-center w-1/3 text-sm font-bold leading-loose">
                                <p>المادة: {editingExam.subject}</p>
                                <p>الزمن: {editingExam.durationMinutes} دقيقة</p>
                                <p>التاريخ: {editingExam.date}</p>
                            </div>
                        </div>

                        {/* Student Info Box */}
                        <div className="border-2 border-black p-4 mb-8 flex gap-8 text-sm font-bold rounded-lg">
                            <div className="flex-1 flex gap-2 items-baseline">
                                <span>اسم الطالب:</span>
                                <div className="border-b border-dotted border-black flex-1"></div>
                            </div>
                            <div className="w-1/3 flex gap-2 items-baseline">
                                <span>رقم الجلوس:</span>
                                <div className="border-b border-dotted border-black flex-1"></div>
                            </div>
                            <div className="w-24 flex gap-2 items-baseline border-r-2 border-black pr-4">
                                <span>الدرجة:</span>
                                <div className="border-b border-dotted border-black flex-1"></div>
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-8 flex-1">
                            {editingExam.questions.map((q, idx) => (
                                <div key={q.id} className="break-inside-avoid">
                                    <div className="flex gap-3 font-bold text-lg mb-4 bg-gray-50 print:bg-transparent p-2 rounded">
                                        <span className="bg-black text-white print:border print:border-black print:text-black print:bg-white w-8 h-8 flex items-center justify-center rounded-full text-sm shrink-0">{idx + 1}</span>
                                        <span className="leading-relaxed">{q.text}</span>
                                        <span className="mr-auto text-sm text-gray-500 print:text-black font-normal self-center whitespace-nowrap">({q.points} درجات)</span>
                                    </div>
                                    
                                    {q.type === 'MCQ' ? (
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 pr-12">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-black rounded-full shrink-0"></div>
                                                    <span className="text-base font-medium">{opt}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex gap-16 pr-12">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 border-2 border-black rounded-full"></div>
                                                <span className="font-bold">صح</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 border-2 border-black rounded-full"></div>
                                                <span className="font-bold">خطأ</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="mt-16 pt-8 border-t-2 border-black flex justify-between text-sm font-bold text-black">
                            <p>انتهت الأسئلة، تمنياتي لكم بالتوفيق والنجاح.</p>
                            <div className="text-center">
                                <p>معلم المادة</p>
                                <p className="mt-4">....................</p>
                            </div>
                            <div className="text-center">
                                <p>مدير المدرسة</p>
                                <p className="mt-4">....................</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (view === 'PRINT') return <PrintView />;

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FileQuestion className="text-purple-600"/> إدارة الاختبارات
                        </h2>
                        <button onClick={startCreation} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 text-sm md:text-base">
                            <Plus size={18}/> <span className="hidden md:inline">اختبار جديد</span><span className="md:hidden">جديد</span>
                        </button>
                    </div>
                    
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-1 overflow-y-auto">
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
                                                {exam.isActive ? 'نشط (Online)' : 'مسودة'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => duplicateExam(exam)} className="p-2 text-teal-600 hover:bg-teal-50 rounded" title="نسخ"><Copy size={16}/></button>
                                            <button onClick={() => handleViewResults(exam)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="النتائج"><BarChart2 size={16}/></button>
                                            <button onClick={() => { setEditingExam(exam); setView('PRINT'); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded" title="طباعة الورقة"><Printer size={16}/></button>
                                            <button onClick={() => { setEditingExam(exam); setView('EDITOR'); setMobileEditorTab('SETTINGS'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="تعديل"><Edit size={16}/></button>
                                            <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {exams.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400">لا توجد اختبارات مسجلة</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List View (Cards) */}
                    <div className="md:hidden flex-1 overflow-y-auto space-y-3 pb-20">
                        {exams.length > 0 ? exams.map(exam => (
                            <div key={exam.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{exam.title}</h3>
                                        <p className="text-xs text-gray-500">{exam.subject} - {exam.gradeLevel}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {exam.isActive ? 'نشط' : 'مسودة'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 mb-3 font-mono">{exam.questions.length} أسئلة • {exam.durationMinutes} دقيقة</div>
                                <div className="grid grid-cols-5 gap-2 border-t pt-3">
                                    <button onClick={() => duplicateExam(exam)} className="flex flex-col items-center gap-1 text-[10px] text-teal-600"><Copy size={16}/> نسخ</button>
                                    <button onClick={() => handleViewResults(exam)} className="flex flex-col items-center gap-1 text-[10px] text-indigo-600"><BarChart2 size={16}/> نتائج</button>
                                    <button onClick={() => { setEditingExam(exam); setView('PRINT'); }} className="flex flex-col items-center gap-1 text-[10px] text-gray-600"><Printer size={16}/> طباعة</button>
                                    <button onClick={() => { setEditingExam(exam); setView('EDITOR'); setMobileEditorTab('SETTINGS'); }} className="flex flex-col items-center gap-1 text-[10px] text-blue-600"><Edit size={16}/> تعديل</button>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="flex flex-col items-center gap-1 text-[10px] text-red-600"><Trash2 size={16}/> حذف</button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20 text-gray-400">
                                <FileQuestion size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>لا توجد اختبارات مسجلة</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'RESULTS' && editingExam && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
                    <div className="p-4 border-b bg-indigo-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft size={20} className="text-indigo-700"/></button>
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg">نتائج: {editingExam.title}</h3>
                                <p className="text-xs text-indigo-600">{editingExam.gradeLevel} - {editingExam.subject}</p>
                            </div>
                        </div>
                        <button onClick={handleExportResults} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 text-sm">
                            <Download size={16}/> <span className="hidden md:inline">تصدير Excel</span>
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 md:p-6 bg-white border-b">
                        <div className="bg-gray-50 p-3 md:p-4 rounded-xl border text-center">
                            <span className="text-xs text-gray-500 font-bold block mb-1">الطلاب</span>
                            <span className="text-xl md:text-2xl font-black text-gray-800">{analytics.count}</span>
                        </div>
                        <div className="bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100 text-center">
                            <span className="text-xs text-blue-600 font-bold block mb-1">المتوسط</span>
                            <span className="text-xl md:text-2xl font-black text-blue-800">{analytics.avg}</span>
                        </div>
                        <div className="bg-green-50 p-3 md:p-4 rounded-xl border border-green-100 text-center">
                            <span className="text-xs text-green-600 font-bold block mb-1">أعلى</span>
                            <span className="text-xl md:text-2xl font-black text-green-800">{analytics.max}</span>
                        </div>
                        <div className="bg-red-50 p-3 md:p-4 rounded-xl border border-red-100 text-center">
                            <span className="text-xs text-red-600 font-bold block mb-1">أدنى</span>
                            <span className="text-xl md:text-2xl font-black text-red-800">{analytics.min}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0">
                                <tr>
                                    <th className="p-4">#</th>
                                    <th className="p-4">اسم الطالب</th>
                                    <th className="p-4 text-center">الدرجة</th>
                                    <th className="p-4 text-center hidden md:table-cell">النسبة</th>
                                    <th className="p-4 text-center hidden md:table-cell">وقت التسليم</th>
                                    <th className="p-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {selectedExamResults.map((result, i) => (
                                    <tr key={result.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-400">{i + 1}</td>
                                        <td className="p-4 font-bold text-gray-800">{result.studentName}</td>
                                        <td className="p-4 text-center font-bold text-lg">
                                            <span className={result.score >= (result.totalScore * 0.9) ? 'text-green-600' : result.score < (result.totalScore * 0.5) ? 'text-red-600' : 'text-gray-800'}>
                                                {result.score}
                                            </span>
                                            <span className="text-xs text-gray-400 font-normal"> / {result.totalScore}</span>
                                        </td>
                                        <td className="p-4 text-center hidden md:table-cell">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${(result.score/result.totalScore) >= 0.9 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {Math.round((result.score/result.totalScore)*100)}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-xs text-gray-500 font-mono hidden md:table-cell">
                                            {new Date(result.date).toLocaleString('ar-SA')}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => { if(confirm('حذف نتيجة الطالب؟')) { deleteExamResult(result.id); handleViewResults(editingExam); } }} 
                                                className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
                                                title="حذف النتيجة (إعادة)"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {selectedExamResults.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400">لا توجد نتائج مسجلة حتى الآن</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                            <h3 className="font-bold text-gray-800">محرر الاختبار</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsBankModalOpen(true)} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-200 text-sm">
                                <Library size={16}/> <span className="hidden md:inline">استيراد من البنك</span>
                            </button>
                            <button onClick={handleSaveExam} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm text-sm">
                                <Save size={16}/> حفظ
                            </button>
                        </div>
                    </div>

                    {/* Mobile Tabs */}
                    <div className="md:hidden flex border-b bg-gray-50">
                        <button onClick={() => setMobileEditorTab('SETTINGS')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${mobileEditorTab === 'SETTINGS' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500'}`}>الإعدادات</button>
                        <button onClick={() => setMobileEditorTab('QUESTIONS')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${mobileEditorTab === 'QUESTIONS' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500'}`}>الأسئلة ({editingExam.questions.length})</button>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Settings Column */}
                        <div className={`w-full md:w-80 border-l bg-gray-50 p-4 overflow-y-auto ${mobileEditorTab === 'SETTINGS' ? 'block' : 'hidden md:block'}`}>
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Settings size={16}/> الإعدادات الأساسية</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">عنوان الاختبار</label>
                                    <input className="w-full p-2 border rounded bg-white text-sm" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="مثال: اختبار الفترة الأولى" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                                    <select className="w-full p-2 border rounded bg-white text-sm" value={editingExam.subject} onChange={e => setEditingExam({...editingExam, subject: e.target.value})}>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">الصف</label>
                                    <select 
                                        className="w-full p-2 border rounded bg-white text-sm" 
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
                                    <input type="number" className="w-full p-2 border rounded bg-white text-sm" value={editingExam.durationMinutes} onChange={e => setEditingExam({...editingExam, durationMinutes: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                                    <input type="date" className="w-full p-2 border rounded bg-white text-sm" value={editingExam.date} onChange={e => setEditingExam({...editingExam, date: e.target.value})} />
                                </div>
                                <div className="pt-4 border-t">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border hover:border-green-400 transition-colors">
                                        <input type="checkbox" checked={editingExam.isActive} onChange={e => setEditingExam({...editingExam, isActive: e.target.checked})} className="w-4 h-4 accent-green-600"/>
                                        <span className="font-bold text-sm text-gray-700">نشر الاختبار للطلاب (Online)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Questions Column */}
                        <div className={`flex-1 p-4 md:p-6 overflow-y-auto bg-gray-100/50 ${mobileEditorTab === 'QUESTIONS' ? 'block' : 'hidden md:block'}`}>
                            {/* Added Questions List */}
                            <div className="space-y-4 mb-8">
                                {editingExam.questions.length > 0 ? editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">س{idx + 1}</span>
                                                <span className="text-sm">{q.text}</span>
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
                            <div className="bg-white p-4 md:p-6 rounded-xl border border-purple-200 shadow-md">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                    <Plus size={18} className="text-purple-600"/> إضافة سؤال جديد
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">نص السؤال</label>
                                            <input 
                                                className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" 
                                                placeholder="اكتب السؤال هنا..." 
                                                value={qText}
                                                onChange={e => setQText(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-32">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-3 border rounded-lg text-center font-bold text-sm" 
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
                                                    name="correct" 
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
                                                            name="correct" 
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

            {/* Bank Modal */}
            {isBankModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Library size={18}/> استيراد من بنك الأسئلة</h3>
                            <button onClick={() => setIsBankModalOpen(false)}><XCircle className="text-gray-400 hover:text-red-500"/></button>
                        </div>
                        
                        {/* Filters */}
                        <div className="p-4 border-b bg-white flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                                <input 
                                    className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors"
                                    placeholder="بحث في الأسئلة..."
                                    value={bankSearch}
                                    onChange={e => setBankSearch(e.target.value)}
                                />
                            </div>
                            <select 
                                className="p-2 border rounded-lg text-sm bg-gray-50"
                                value={bankFilterGrade}
                                onChange={e => setBankFilterGrade(e.target.value)}
                            >
                                <option value="">كل الصفوف</option>
                                {["الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط"].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {filteredBankQuestions.length > 0 ? filteredBankQuestions.map(q => (
                                <div key={q.id} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedBankQuestions.has(q.id) ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'hover:bg-gray-50'}`} onClick={() => toggleBankSelection(q.id)}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedBankQuestions.has(q.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'}`}>
                                                {selectedBankQuestions.has(q.id) && <Check size={12} className="text-white"/>}
                                            </div>
                                            <span className="font-bold text-gray-800 text-sm">{q.text}</span>
                                        </div>
                                        <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 whitespace-nowrap ml-2">{q.gradeLevel}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 mr-6 flex gap-3">
                                        <span>{q.type === 'MCQ' ? 'خيارات' : 'صح/خطأ'}</span>
                                        <span>• {q.points} درجات</span>
                                    </div>
                                </div>
                            )) : <div className="text-center py-8 text-gray-400">لا توجد أسئلة مطابقة للبحث.</div>}
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                            <button onClick={() => setIsBankModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 font-bold hover:bg-white transition-colors">إلغاء</button>
                            <button onClick={importFromBank} disabled={selectedBankQuestions.size === 0} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm">
                                <Copy size={16}/> استيراد ({selectedBankQuestions.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
