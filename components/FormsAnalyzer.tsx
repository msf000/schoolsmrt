
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    Info, ArrowRight, UserCheck, Calculator, TrendingUp, 
    Upload, Search, Mail, FileText, ChevronDown, ChevronUp,
    ListFilter, Target, HelpCircle, History, LayoutGrid, BrainCircuit, Save, X
} from 'lucide-react';
import { Student, FormsDetailedResult, FormsQuestionAnalysis } from '../types';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY' | 'COMPARE'>('IMPORT');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);

    // مصفوفة نواتج التعلم (قابلة للتعديل)
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving]);

    // 1. معالجة رفع الملف
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setHeaders(headers);
            setFileData(data);
            // محاولة استخراج اسم الاختبار من اسم الملف
            setExamTitle(file.name.replace(/\.[^/.]+$/, ""));
        } catch (error) {
            alert('فشل في قراءة ملف Excel.');
        } finally {
            setLoading(false);
        }
    };

    // 2. تحليل الطلاب
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

    // 3. استخراج الأسئلة
    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];
        const pointHeaders = headers.filter(h => h.startsWith('النقاط -') || h.startsWith('Points -') || h.includes('نقاط -'));

        return pointHeaders.map(pointCol => {
            const questionTitle = pointCol.replace(/^النقاط - /, '').replace(/^Points - /, '').replace(/^نقاط - /, '').trim();
            const answerCol = headers.find(h => h === questionTitle) || headers[headers.indexOf(pointCol) - 1];

            let correctCount = 0;
            let responsesCount = 0;
            const errorPatterns: Record<string, number> = {};

            fileData.forEach(row => {
                const pts = Number(row[pointCol]);
                const ans = String(row[answerCol] || 'لم يجب');
                responsesCount++;
                if (pts > 0) correctCount++;
                else errorPatterns[ans] = (errorPatterns[ans] || 0) + 1;
            });

            const successRate = responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0;

            return {
                id: pointCol,
                question: questionTitle,
                successRate,
                responsesCount,
                correctCount,
                wrongCount: responsesCount - correctCount,
                difficulty: (successRate < 50 ? 'HARD' : successRate < 75 ? 'MEDIUM' : 'EASY') as any,
                commonErrors: Object.entries(errorPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3)
            };
        });
    }, [fileData, headers]);

    // 4. حفظ البيانات التفصيلية
    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('يرجى تحديد عنوان للاختبار');
        
        setIsSaving(true);
        try {
            // تجهيز سجل الإجابات
            const studentResponses: Record<string, any> = {};
            processedResults.forEach(res => {
                if (res.matchedStudent) {
                    const answers: Record<string, string> = {};
                    itemAnalysis.forEach(q => {
                        answers[q.question] = String(res.row[q.question] || res.row[headers[headers.indexOf(q.id) - 1]] || '-');
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
                learningOutcome: outcomesMapping[q.id] || 'عام',
                successRate: q.successRate,
                difficulty: q.difficulty
            }));

            const record: FormsDetailedResult = {
                id: `forms_det_${Date.now()}`,
                examTitle,
                className: processedResults[0]?.matchedStudent?.className || 'غير محدد',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions,
                studentResponses
            };

            // حفظ في السجل التفصيلي
            saveFormsDetailedResult(record);

            // رصد الدرجات في السجل العام (Performance)
            const performanceRecords = Object.entries(studentResponses).map(([sid, data]) => ({
                id: `p_forms_${record.id}_${sid}`,
                studentId: sid,
                subject: 'اختبار إلكتروني',
                title: examTitle,
                score: data.score,
                maxScore: data.total,
                date: record.date.split('T')[0],
                category: 'PLATFORM_EXAM',
                createdById: currentUserId
            }));
            addPerformance(performanceRecords as any);

            alert('تم حفظ الاختبار وتفاصيله ونواتج التعلم بنجاح!');
            setFileData([]);
            setExamTitle('');
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
                        <FileSpreadsheet className="text-green-600"/> محلل Microsoft Forms المتقدم
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">تحليل الفقرات، حفظ الإجابات، ومتابعة نواتج التعلم.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                    <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>استيراد جديد</button>
                    <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>سجل الاختبارات</button>
                </div>
            </div>

            {viewMode === 'IMPORT' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/>
                        <h3 className="text-xl font-black text-gray-800 mb-2">ارفع ملف Excel الاستجابات</h3>
                        <p className="text-gray-400 max-w-sm mb-8 text-sm">سيقوم النظام باستخراج الأسئلة تلقائياً وتحليل متوسط الإتقان لكل فقرة.</p>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">
                            {loading ? 'جاري التحليل...' : 'اختيار ملف الاستجابات'}
                        </label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-6">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                            <label className="text-sm font-bold text-gray-600 whitespace-nowrap">اسم الاختبار:</label>
                            <input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="مثال: اختبار الفترة الأولى - علوم"/>
                        </div>

                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-hidden">
                            {/* تحليل الفقرات مع نواتج التعلم */}
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> تحليل الأسئلة ونواتج التعلم</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                            <div className="p-4 cursor-pointer" onClick={() => setExpandedQuestion(expandedQuestion === item.id ? null : item.id)}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-xs font-bold text-gray-700 flex-1 ml-4"><span className="text-orange-500">س{idx+1}:</span> {item.question}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black ${item.successRate < 50 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.successRate}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-white border rounded-lg flex items-center gap-1 flex-1">
                                                        <BrainCircuit size={12} className="text-purple-500"/>
                                                        <input 
                                                            className="text-[10px] bg-transparent outline-none w-full font-bold text-purple-700" 
                                                            placeholder="حدد ناتج التعلم (مثلاً: التحليل، الاستنتاج...)"
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
                                                <div className="p-4 bg-white border-t border-dashed text-[10px] text-gray-500">
                                                    <p className="font-bold mb-1">أبرز الأخطاء:</p>
                                                    {item.commonErrors.map(([ans, count], i) => (
                                                        <div key={i} className="flex justify-between p-1 bg-red-50 rounded mb-1"><span>{ans}</span><span className="font-bold">{count} طلاب</span></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ملخص الطلاب */}
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> الطلاب المطابقون</h3>
                                <div className="flex-1 overflow-y-auto border rounded-2xl">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 sticky top-0 font-bold">
                                            <tr><th className="p-3">الطالب</th><th className="p-3 text-center">الدرجة</th></tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {processedResults.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="p-3 font-bold">{r.matchedStudent ? r.matchedStudent.name : <span className="text-red-400">غير مطابق ({r.studentName})</span>}</td>
                                                    <td className="p-3 text-center font-black text-indigo-600">{r.score}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button 
                                    onClick={handleFinalSave}
                                    disabled={isSaving || !examTitle}
                                    className="mt-4 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                                >
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                                    حفظ البيانات والتحليل التفصيلي
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {viewMode === 'HISTORY' && (
                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-20 text-gray-300 italic">لا يوجد سجل اختبارات محفوظة حالياً.</div>
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
                                    
                                    <div className="space-y-2 mb-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">أبرز نواتج التعلم:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(new Set(record.questions.map(q => q.learningOutcome))).slice(0, 3).map((o, i) => (
                                                <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">{o}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        className="w-full py-2 bg-gray-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all flex items-center justify-center gap-2"
                                        onClick={() => alert('ميزة المقارنة المتقدمة قيد التطوير...')}
                                    >
                                        <TrendingUp size={14}/> عرض التحليل والمقارنة
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

const StatBox = ({ icon, label, value, color }: any) => (
    <div className={`${color} p-6 rounded-3xl border border-white flex items-center justify-between shadow-sm`}>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <h4 className="text-2xl font-black text-gray-800">{value}</h4>
        </div>
        <div className="p-4 bg-white/50 rounded-2xl">{icon}</div>
    </div>
);

export default FormsAnalyzer;
