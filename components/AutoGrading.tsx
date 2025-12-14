
import React, { useState, useEffect } from 'react';
import { ScanLine, Upload, Check, X, Camera, Save, RefreshCw, FileText, Plus, Trash2, ListChecks, FileQuestion, ArrowRight, BrainCircuit } from 'lucide-react';
import { Exam, Student, PerformanceRecord, Question, SystemUser } from '../types';
import { getExams, getStudents, addPerformance } from '../services/storageService';
import { gradeExamPaper } from '../services/geminiService';

interface AutoGradingProps {
    currentUser?: SystemUser | null;
}

const AutoGrading: React.FC<AutoGradingProps> = ({ currentUser }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    
    // UI State
    const [gradingMode, setGradingMode] = useState<'SYSTEM' | 'MANUAL'>('SYSTEM');
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isGrading, setIsGrading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [step, setStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');

    // Manual Exam State
    const [manualTitle, setManualTitle] = useState('');
    const [manualSubject, setManualSubject] = useState('');
    const [manualAnswers, setManualAnswers] = useState<{id: string, answer: string, points: number}[]>([]);
    const [tempAnswer, setTempAnswer] = useState('');
    const [tempPoints, setTempPoints] = useState(1);

    useEffect(() => {
        // Only fetch exams and students related to this user/school
        setExams(getExams(currentUser?.id));
        setStudents(getStudents().filter(s => s.schoolId === currentUser?.schoolId || s.createdById === currentUser?.id));
    }, [currentUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const addManualAnswer = () => {
        if (!tempAnswer) return;
        setManualAnswers(prev => [
            ...prev, 
            { id: Date.now().toString(), answer: tempAnswer, points: Number(tempPoints) }
        ]);
        setTempAnswer('');
    };

    const removeManualAnswer = (id: string) => {
        setManualAnswers(prev => prev.filter(a => a.id !== id));
    };

    const handleAutoGrade = async () => {
        if (!imageFile && !imagePreview) return alert('الرجاء رفع صورة الورقة');
        
        let targetExam: Exam | undefined;

        if (gradingMode === 'SYSTEM') {
            if (!selectedExamId) return alert('الرجاء اختيار الاختبار');
            targetExam = exams.find(e => e.id === selectedExamId);
        } else {
            // Construct temporary exam object from manual inputs
            if (!manualTitle || manualAnswers.length === 0) return alert('الرجاء إدخال عنوان الاختبار وإضافة مفاتيح الإجابة');
            
            const questions: Question[] = manualAnswers.map((a, i) => ({
                id: a.id,
                text: `السؤال رقم ${i + 1}`, // Generic text
                type: 'MCQ', 
                options: [],
                correctAnswer: a.answer,
                points: a.points
            }));

            targetExam = {
                id: 'TEMP_MANUAL',
                title: manualTitle,
                subject: manualSubject || 'عام',
                gradeLevel: 'عام',
                durationMinutes: 0,
                questions: questions,
                isActive: true,
                createdAt: new Date().toISOString(),
                teacherId: ''
            };
        }

        if (!targetExam) return alert('بيانات الاختبار غير صحيحة');
        
        setIsGrading(true);
        try {
            const gradingResult = await gradeExamPaper(imagePreview!, targetExam);
            
            // Auto-match student if detected name matches any in list
            if (gradingResult.studentNameDetected) {
                const match = students.find(s => s.name.includes(gradingResult.studentNameDetected) || gradingResult.studentNameDetected.includes(s.name));
                if (match) setSelectedStudentId(match.id);
            }

            setResult(gradingResult);
            setStep('REVIEW');
        } catch (e: any) {
            alert('حدث خطأ أثناء التصحيح: ' + e.message);
        } finally {
            setIsGrading(false);
        }
    };

    const handleSaveResult = () => {
        if (!selectedStudentId || !result) return alert('يرجى تحديد الطالب');
        
        let subject = 'عام';
        let title = 'تصحيح آلي';

        if (gradingMode === 'SYSTEM') {
            const exam = exams.find(e => e.id === selectedExamId);
            if (exam) {
                subject = exam.subject;
                title = `تصحيح آلي: ${exam.title}`;
            }
        } else {
            subject = manualSubject || 'عام';
            title = `تصحيح خارجي: ${manualTitle}`;
        }
        
        const student = students.find(s => s.id === selectedStudentId);
        
        if (student) {
            const record: PerformanceRecord = {
                id: Date.now().toString(),
                studentId: student.id,
                subject: subject,
                title: title,
                category: 'PLATFORM_EXAM', 
                score: result.totalScore,
                maxScore: result.maxTotalScore || (gradingMode === 'MANUAL' ? manualAnswers.reduce((a,b) => a + b.points, 0) : 0),
                date: new Date().toISOString().split('T')[0],
                notes: `تم التصحيح آلياً. ملاحظات: ${result.questions.map((q: any) => `س${q.index}: ${q.isCorrect ? 'صح' : 'خطأ'}`).join(', ')}`,
                createdById: currentUser?.id
            };
            addPerformance(record);
            alert('تم حفظ النتيجة بنجاح!');
            setStep('UPLOAD');
            setResult(null);
            setImageFile(null);
            setImagePreview(null);
            setSelectedStudentId('');
        }
    };

    const toggleQuestionResult = (index: number) => {
        if (!result) return;
        const newQuestions = [...result.questions];
        const q = newQuestions[index];
        q.isCorrect = !q.isCorrect;
        q.score = q.isCorrect ? (q.maxPoints || 1) : 0; 
        const newTotal = newQuestions.reduce((acc, curr) => acc + (curr.score || 0), 0);
        setResult({ ...result, questions: newQuestions, totalScore: newTotal });
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg">
                    <ScanLine size={24}/>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">المصحح الآلي الذكي (AI)</h2>
                    <p className="text-sm text-gray-500">تصحيح أوراق الاختبارات تلقائياً باستخدام الذكاء الاصطناعي</p>
                </div>
            </div>

            {step === 'UPLOAD' && (
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col md:flex-row gap-8 overflow-hidden">
                    <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        
                        {/* Mode Selection */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setGradingMode('SYSTEM')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${gradingMode === 'SYSTEM' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <FileQuestion size={16}/> اختبار من النظام
                            </button>
                            <button 
                                onClick={() => setGradingMode('MANUAL')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${gradingMode === 'MANUAL' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                <ListChecks size={16}/> نموذج إجابة يدوي
                            </button>
                        </div>

                        {gradingMode === 'SYSTEM' ? (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-bold text-gray-700 mb-2">1. اختر الاختبار (المحفوظ مسبقاً)</label>
                                <select 
                                    className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={selectedExamId}
                                    onChange={e => setSelectedExamId(e.target.value)}
                                >
                                    <option value="">-- اختر الاختبار --</option>
                                    {exams.filter(e => e.isActive).map(e => (
                                        <option key={e.id} value={e.id}>{e.title} ({e.subject})</option>
                                    ))}
                                </select>
                                {exams.length === 0 && <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded border border-red-100">لا توجد اختبارات نشطة. قم بإنشاء اختبار في "إدارة الاختبارات" أولاً.</p>}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">اسم الاختبار</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="مثال: اختبار الفتره"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={manualSubject} onChange={e => setManualSubject(e.target.value)} placeholder="مثال: رياضيات"/>
                                    </div>
                                </div>

                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <h4 className="font-bold text-purple-800 text-sm mb-3">نموذج الإجابة (Answer Key)</h4>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            className="flex-1 p-2 border rounded text-sm" 
                                            placeholder="الإجابة (أ، ب، صح، كلمة...)" 
                                            value={tempAnswer} 
                                            onChange={e => setTempAnswer(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addManualAnswer()}
                                        />
                                        <input 
                                            type="number" 
                                            className="w-20 p-2 border rounded text-sm text-center" 
                                            placeholder="درجة" 
                                            value={tempPoints} 
                                            onChange={e => setTempPoints(Number(e.target.value))}
                                        />
                                        <button onClick={addManualAnswer} className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700"><Plus size={18}/></button>
                                    </div>
                                    
                                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar bg-white rounded border p-2">
                                        {manualAnswers.map((a, idx) => (
                                            <div key={a.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm border-b last:border-0">
                                                <span className="font-bold text-gray-600">س{idx+1}</span>
                                                <span className="font-bold text-purple-700">{a.answer}</span>
                                                <span className="text-gray-400 text-xs">({a.points} درجة)</span>
                                                <button onClick={() => removeManualAnswer(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                        {manualAnswers.length === 0 && <p className="text-center text-gray-400 text-xs py-2">أضف مفاتيح الإجابة الصحيحة</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">2. رفع صورة ورقة الطالب</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group bg-gray-50">
                                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange}/>
                                <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-purple-600 transition-colors">
                                    <Camera size={40}/>
                                    <span className="font-bold">اضغط أو اسحب الصورة هنا</span>
                                    <span className="text-xs text-gray-400">يدعم JPG, PNG (تأكد من وضوح الصورة)</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleAutoGrade}
                            disabled={isGrading || !imagePreview || (gradingMode==='SYSTEM' && !selectedExamId) || (gradingMode==='MANUAL' && manualAnswers.length===0)}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                        >
                            {isGrading ? <RefreshCw className="animate-spin"/> : <BrainCircuit/>}
                            {isGrading ? 'جاري تحليل الورقة...' : 'بدء التصحيح بالذكاء الاصطناعي'}
                        </button>
                    </div>

                    <div className="w-full md:w-1/3 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden group">
                        {imagePreview ? (
                            <img src={imagePreview} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105" alt="Preview"/>
                        ) : (
                            <div className="text-gray-400 text-center">
                                <FileText size={48} className="mx-auto mb-2 opacity-50"/>
                                <p>معاينة الورقة</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'REVIEW' && result && (
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                    {/* Result Panel */}
                    <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden animate-slide-up">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Check className="text-green-600"/> نتيجة التصحيح
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-gray-500 text-sm font-bold">الطالب:</span>
                                    <select 
                                        className="bg-white border rounded px-2 py-1 text-sm font-bold text-purple-700 outline-none focus:ring-1 focus:ring-purple-500"
                                        value={selectedStudentId}
                                        onChange={e => setSelectedStudentId(e.target.value)}
                                    >
                                        <option value="">-- اختر الطالب (أو ابحث) --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="text-center bg-white p-2 rounded-lg border shadow-sm">
                                <div className="text-3xl font-black text-purple-600">{result.totalScore}</div>
                                <div className="text-xs text-gray-400 font-bold uppercase">من {result.maxTotalScore}</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/50">
                            {result.questions.map((q: any, idx: number) => (
                                <div key={idx} onClick={() => toggleQuestionResult(idx)} className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center group ${q.isCorrect ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'}`}>
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm mb-1">س{q.index}: {q.questionText}</div>
                                        <div className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded w-fit mb-1">إجابة الطالب: <span className="font-bold">{q.studentAnswer || 'غير واضحة'}</span></div>
                                        {q.feedback && <div className="text-xs text-orange-600 font-medium">{q.feedback}</div>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-lg">{q.score}</span>
                                        <div className={`p-1 rounded-full ${q.isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                            {q.isCorrect ? <Check size={16}/> : <X size={16}/>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t flex gap-3 bg-white">
                            <button onClick={() => setStep('UPLOAD')} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
                            <button onClick={handleSaveResult} className="flex-2 w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 transition-colors">
                                <Save size={18}/> اعتماد وحفظ الدرجة
                            </button>
                        </div>
                    </div>

                    {/* Image Reference */}
                    <div className="w-full md:w-1/3 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative group">
                        <img src={imagePreview!} className="w-full h-full object-contain" alt="Reference"/>
                        <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-bold shadow-sm">الورقة الأصلية</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutoGrading;
