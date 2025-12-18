
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search
} from 'lucide-react';
import { Student, FormsDetailedResult, FormsQuestionAnalysis } from '../types';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY'>('IMPORT');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});

    // تحديث السجل عند التحميل أو الحفظ
    useEffect(() => {
        if (currentUserId) {
            // التحقق من الصلاحيات: جلب فقط ما يخص المعلم الحالي
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving, viewMode]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setHeaders(headers);
            setFileData(data);
            setExamTitle(file.name.replace(/\.[^/.]+$/, ""));
        } catch (error) {
            alert('فشل في قراءة ملف Excel.');
        } finally {
            setLoading(false);
        }
    };

    const processedResults = useMemo(() => {
        if (fileData.length === 0) return [];
        const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
        const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم'));
        const scoreCol = headers.find(h => h.toLowerCase().includes('total points') || h.includes('إجمالي النقاط'));

        return fileData.map((row) => {
            const rowEmail = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';
            const rowName = nameCol ? String(row[nameCol] || '').trim() : '';
            const score = scoreCol ? Number(row[scoreCol]) : 0;

            const matchedStudent = students.find(s => 
                (s.email && s.email.toLowerCase() === rowEmail) ||
                (s.name === rowName || s.name.includes(rowName) || rowName.includes(s.name))
            );

            return { row, studentName: rowName, email: rowEmail, score, matchedStudent };
        });
    }, [fileData, headers, students]);

    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];
        
        // استخراج نصوص الأسئلة فقط من أعمدة "النقاط"
        const pointHeaders = headers.filter(h => 
            h.startsWith('النقاط -') || 
            h.startsWith('Points -') ||
            h.includes('نقاط -')
        );

        return pointHeaders.map(pointCol => {
            const questionTitle = pointCol
                .replace(/^النقاط - /, '')
                .replace(/^Points - /, '')
                .replace(/^نقاط - /, '')
                .trim();

            // عمود الإجابة النصية عادة يكون بنفس اسم السؤال المنظف
            const answerCol = headers.find(h => h === questionTitle) || headers[headers.indexOf(pointCol) - 1];

            let correctCount = 0;
            let responsesCount = 0;
            const errorPatterns: Record<string, number> = {};

            fileData.forEach(row => {
                const pts = Number(row[pointCol]);
                const ans = String(row[answerCol] || 'لم يجب');
                responsesCount++;
                if (pts > 0) {
                    correctCount++;
                } else if (ans !== 'لم يجب') {
                    errorPatterns[ans] = (errorPatterns[ans] || 0) + 1;
                }
            });

            const successRate = responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0;

            return {
                id: pointCol,
                question: questionTitle,
                answerColumn: answerCol,
                successRate,
                responsesCount,
                correctCount,
                wrongCount: responsesCount - correctCount,
                difficulty: (successRate < 50 ? 'HARD' : successRate < 75 ? 'MEDIUM' : 'EASY') as any,
                commonErrors: Object.entries(errorPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3)
            };
        });
    }, [fileData, headers]);

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('يرجى التأكد من اسم الاختبار وتسجيل الدخول.');
        
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            processedResults.forEach(res => {
                if (res.matchedStudent) {
                    const answers: Record<string, string> = {};
                    itemAnalysis.forEach(q => {
                        // حفظ الإجابة النصية للطالب
                        answers[q.question] = String(res.row[q.answerColumn] || '-');
                    });
                    studentResponses[res.matchedStudent.id] = {
                        score: res.score,
                        total: itemAnalysis.length,
                        answers
                    };
                }
            });

            const questions: FormsQuestionAnalysis[] = itemAnalysis.map(q => ({
                id: q.id,
                text: q.question,
                learningOutcome: outcomesMapping[q.id] || 'مهارة عامة',
                successRate: q.successRate,
                difficulty: q.difficulty,
                commonErrors: q.commonErrors
            }));

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`,
                examTitle,
                className: processedResults[0]?.matchedStudent?.className || 'غير محدد',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions,
                studentResponses
            };

            // حفظ التحليل المفصل
            saveFormsDetailedResult(record);

            // رصد الدرجات في السجل العام
            const perfRecords = Object.entries(studentResponses).map(([sid, data]) => ({
                id: `p_forms_${record.id}_${sid}`,
                studentId: sid,
                subject: 'عام',
                title: examTitle,
                score: data.score,
                maxScore: data.total,
                date: record.date.split('T')[0],
                category: 'PLATFORM_EXAM',
                createdById: currentUserId
            }));
            addPerformance(perfRecords as any);

            alert('تم حفظ نتائج الاختبار وتحليل نواتج التعلم بنجاح!');
            setFileData([]);
            setOutcomesMapping({});
            setViewMode('HISTORY');
        } catch (e) {
            alert('حدث خطأ أثناء الحفظ.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> محلل نواتج التعلم (Microsoft Forms)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">استخراج الأسئلة، ربط النواتج، ومقارنة الأداء.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                    <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>استيراد جديد</button>
                    <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>السجل والمقارنة</button>
                </div>
            </div>

            {viewMode === 'IMPORT' ? (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/>
                        <h3 className="text-xl font-black text-gray-800 mb-2">ارفع ملف استجابات Forms</h3>
                        <p className="text-gray-400 max-w-sm mb-8 text-sm">يقوم النظام تلقائياً باستخراج الأسئلة من أعمدة "النقاط" لتحديد نواتج التعلم.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">
                            {loading ? 'جاري التحليل...' : 'اختيار ملف الاستجابات'}
                        </label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-6">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                            <label className="text-sm font-bold text-gray-600 whitespace-nowrap">اسم الاختبار:</label>
                            <input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-green-500" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/>
                        </div>

                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-hidden">
                            {/* تحليل الفقرات ونواتج التعلم */}
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> الأسئلة المستخرجة ونواتج التعلم</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                            <div className="p-4 cursor-pointer" onClick={() => setExpandedQuestion(expandedQuestion === item.id ? null : item.id)}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-xs font-bold text-gray-700 flex-1 ml-4"><span className="text-green-600">س{idx+1}:</span> {item.question}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black ${item.successRate < 50 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.successRate}% إتقان</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-white border rounded-lg flex items-center gap-1 flex-1">
                                                        <BrainCircuit size={12} className="text-purple-500"/>
                                                        <input 
                                                            className="text-[10px] bg-transparent outline-none w-full font-bold text-purple-700" 
                                                            placeholder="أدخل ناتج التعلم المرتبط (مثلاً: التحليل، الاستنتاج...)"
                                                            value={outcomesMapping[item.id] || ''}
                                                            onChange={e => {
                                                                e.stopPropagation();
                                                                setOutcomesMapping({...outcomesMapping, [item.id]: e.target.value});
                                                            }}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    {expandedQuestion === item.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                </div>
                                            </div>
                                            {expandedQuestion === item.id && (
                                                <div className="p-4 bg-white border-t border-dashed text-[10px] text-gray-500 animate-fade-in">
                                                    <p className="font-bold mb-2">أكثر الإجابات الخاطئة تكراراً:</p>
                                                    {item.commonErrors.map(([ans, count], i) => (
                                                        <div key={i} className="flex justify-between p-2 bg-red-50 rounded-lg mb-1 border border-red-100">
                                                            <span>{ans}</span>
                                                            <span className="font-black text-red-600">{count} طلاب</span>
                                                        </div>
                                                    ))}
                                                    {item.commonErrors.length === 0 && <p className="text-green-600 font-bold">لا توجد أخطاء متكررة.</p>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* الطلاب والمطابقة */}
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> مراجعة مطابقة الطلاب</h3>
                                <div className="flex-1 overflow-y-auto border rounded-2xl bg-gray-50">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 sticky top-0 font-bold z-10">
                                            <tr><th className="p-3">الطالب (في Forms)</th><th className="p-3 text-center">الدرجة</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {processedResults.map((r, i) => (
                                                <tr key={i} className="hover:bg-white transition-colors">
                                                    <td className="p-3 font-bold">
                                                        {r.matchedStudent ? (
                                                            <div className="flex items-center gap-1 text-green-700">
                                                                <CheckCircle size={10}/> {r.matchedStudent.name}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-red-400">
                                                                <AlertCircle size={10}/> {r.studentName} (غير مطابق)
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-black text-indigo-600">{r.score}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button 
                                    onClick={handleFinalSave}
                                    disabled={isSaving || !examTitle}
                                    className="mt-4 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                                    حفظ الاختبار وتحليل الإجابات
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* واجهة السجل والتاريخ */
                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-20 text-gray-300 italic flex flex-col items-center">
                            <History size={64} className="mb-4 opacity-20"/>
                            لا يوجد سجل اختبارات محفوظة حالياً.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {history.map(record => (
                                <div key={record.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-xl"><Target size={20}/></div>
                                        <span className="text-[10px] font-bold text-gray-400">{new Date(record.date).toLocaleDateString('ar-SA')}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                    <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                    
                                    <div className="space-y-2 mb-4 border-t pt-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">نواتج التعلم المحللة:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(new Set(record.questions.map(q => q.learningOutcome))).map((o, i) => (
                                                <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">{o}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        className="w-full py-2 bg-gray-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-transparent hover:border-indigo-200"
                                        onClick={() => alert('ميزة مقارنة نواتج التعلم التفصيلية قيد التطوير.')}
                                    >
                                        <TrendingUp size={14}/> مقارنة الأداء والنمو
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FormsAnalyzer;
