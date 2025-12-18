
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown, Layers, Layout
} from 'lucide-react';
import { Student, FormsDetailedResult, FormsQuestionAnalysis, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LineChart, Line } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY'>('IMPORT');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [detailTab, setDetailTab] = useState<'QUESTIONS' | 'OFFICIAL_REPORT' | 'KASHF'>('KASHF');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, {skill: string, unit: string}>>({});
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // Comparison/Merged Record State
    const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
    const [isMergedView, setIsMergedView] = useState(false);

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
            setHeaderConfig(getReportHeaderConfig(currentUserId));
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
        } catch (error) { alert('فشل التحميل.'); } finally { setLoading(false); }
    };

    // فلتر استبعاد بيانات الهوية (الاسم الرباعي، الرقم، الخ)
    const blacklist = ['اسم', 'الرباعي', 'الكامل', 'هوية', 'سجل', 'رقم', 'مدني', 'فصل', 'شعبة', 'بريد', 'name', 'id', 'email', 'class', 'identity', 'start', 'completion', 'time', 'س1:'];

    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];
        const pointHeaders = headers.filter(h => {
            const isPointCol = h.includes('النقاط -') || h.includes('Points -');
            if (!isPointCol) return false;
            const cleanText = h.replace(/^(النقاط - |Points - )/, '').trim();
            // تأكد من استبعاد "س1: اسمك الرباعي" أو ما يشبهها
            return !blacklist.some(word => cleanText.includes(word));
        });
        
        return pointHeaders.map(pointCol => {
            let questionTitle = pointCol.replace(/^(النقاط - |Points - )/, '').replace(/^س\d+[:\-\s]*/, '').trim();
            const answerCol = headers.find(h => h === questionTitle) || headers[headers.indexOf(pointCol) - 1];
            let correctCount = 0;
            let responsesCount = 0;
            const errorPatterns: Record<string, number> = {};

            fileData.forEach(row => {
                const pts = Number(row[pointCol]);
                const ans = String(row[answerCol] || '-');
                responsesCount++;
                if (pts > 0) correctCount++;
                else if (ans !== '-' && ans !== 'لم يجب') errorPatterns[ans] = (errorPatterns[ans] || 0) + 1;
            });

            return {
                id: pointCol,
                question: questionTitle,
                answerColumn: answerCol,
                successRate: responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0,
                commonErrors: Object.entries(errorPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3)
            };
        });
    }, [fileData, headers]);

    const handleAiAutoFillOutcomes = async () => {
        if (itemAnalysis.length === 0) return;
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const questionsList = itemAnalysis.map(q => ({ id: q.id, text: q.question }));
            const prompt = `بصفتك خبيراً تربوياً، استخرج لكل سؤال: 1. المهارة المستهدفة بشكل مختصر جداً. 2. اسم الوحدة. البيانات: ${JSON.stringify(questionsList)} أرجع JSON ككائن مفتاحه id وقيمته { "skill": "...", "unit": "..." }.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } });
            const suggested = JSON.parse(response.text || "{}");
            setOutcomesMapping(prev => ({ ...prev, ...suggested }));
        } catch (e) { alert('فشل التحليل الذكي.'); } finally { setIsAiProcessing(false); }
    };

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('بيانات ناقصة.');
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
            const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم'));

            fileData.forEach((row) => {
                const rowEmail = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';
                const rowName = nameCol ? String(row[nameCol] || '').trim() : '';
                const matchedStudent = students.find(s => (s.email && s.email.toLowerCase() === rowEmail) || (s.name === rowName || s.name.includes(rowName)));
                
                if (matchedStudent) {
                    const answers: Record<string, string> = {};
                    itemAnalysis.forEach(q => { 
                        const pts = Number(row[q.id]);
                        answers[q.question] = pts > 0 ? '✔' : '✘'; 
                    });
                    studentResponses[matchedStudent.id] = { score: 0, total: itemAnalysis.length, answers };
                }
            });

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`,
                examTitle,
                className: students.find(s => Object.keys(studentResponses).includes(s.id))?.className || 'عام',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions: itemAnalysis.map(q => ({
                    id: q.id, text: q.question, learningOutcome: outcomesMapping[q.id]?.skill || 'مهارة عامة',
                    unit: outcomesMapping[q.id]?.unit || 'غير محدد', successRate: q.successRate, difficulty: q.successRate < 50 ? 'HARD' : 'EASY', commonErrors: q.commonErrors as any
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ.'); setFileData([]); setViewMode('HISTORY');
        } catch (e) { alert('خطأ.'); } finally { setIsSaving(false); }
    };

    // دمج الاختبارات المحددة في سجل واحد
    const mergedRecord = useMemo(() => {
        if (!isMergedView || selectedForCompare.size === 0) return null;
        const selected = history.filter(r => selectedForCompare.has(r.id));
        const allQuestions: FormsQuestionAnalysis[] = [];
        const allStudentResponses: Record<string, any> = {};

        selected.forEach(rec => {
            rec.questions.forEach(q => allQuestions.push({ ...q, id: `${rec.id}_${q.id}`, text: `[${rec.examTitle}] ${q.text}` }));
            Object.entries(rec.studentResponses).forEach(([sid, res]) => {
                if (!allStudentResponses[sid]) allStudentResponses[sid] = { score: 0, total: 0, answers: {} };
                Object.entries(res.answers).forEach(([qText, val]) => {
                    allStudentResponses[sid].answers[`[${rec.examTitle}] ${qText}`] = val;
                });
            });
        });

        return {
            id: 'merged',
            examTitle: 'السجل التراكمي الموحد',
            className: selected[0]?.className || 'متعدد',
            date: new Date().toISOString(),
            teacherId: currentUserId!,
            questions: allQuestions,
            studentResponses: allStudentResponses
        } as FormsDetailedResult;
    }, [isMergedView, selectedForCompare, history]);

    const activeRecord = isMergedView ? mergedRecord : selectedRecord;

    // حساب إحصائيات التذييل للكشف
    const kashfStats = useMemo(() => {
        if (!activeRecord) return [];
        return activeRecord.questions.map(q => {
            let mastered = 0;
            let total = 0;
            Object.values(activeRecord.studentResponses).forEach(res => {
                total++;
                if (res.answers[q.text] === '✔') mastered++;
            });
            const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            return { mastered, masteredPct, failed: total - mastered, failedPct: 100 - masteredPct };
        });
    }, [activeRecord]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> محلل نواتج التعلم المتطور
                    </h2>
                </div>
                {!activeRecord && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                        <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>سجل الاختبارات</button>
                    </div>
                )}
            </div>

            {activeRecord ? (
                /* --- واجهة الكشف والتقارير --- */
                <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center print:hidden">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedRecord(null); setIsMergedView(false); }} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                            <div><h3 className="font-bold">{activeRecord.examTitle}</h3><p className="text-xs text-gray-500">{activeRecord.className}</p></div>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={()=>setDetailTab('KASHF')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${detailTab==='KASHF'?'bg-white shadow text-green-700':'text-gray-500'}`}>كشف رصد أخضر</button>
                            <button onClick={()=>setDetailTab('OFFICIAL_REPORT')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${detailTab==='OFFICIAL_REPORT'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>النموذج الرسمي</button>
                            <button onClick={()=>setDetailTab('QUESTIONS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${detailTab==='QUESTIONS'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>تحليل الفقرات</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'KASHF' ? (
                            /* --- كشف الرصد الملون (مطابق للصورة) --- */
                            <div className="w-full bg-white p-4 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                                <div className="min-w-[1200px]">
                                    {/* ترويسة الكشف */}
                                    <div className="bg-teal-900 text-white p-4 flex justify-between items-center mb-0 border-x-2 border-t-2 border-black">
                                        <div className="text-right text-[10px] font-bold">
                                            <p>الإدارة العامة للتعليم بمنطقة {headerConfig?.educationAdmin}</p>
                                            <p>مدرسة {headerConfig?.schoolName}</p>
                                        </div>
                                        <div className="text-center font-black text-lg">كشف رصد درجات الاختبار الفتري / النهائي</div>
                                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                                    </div>

                                    {/* معلومات الصف */}
                                    <div className="bg-teal-50 border-x-2 border-y-2 border-black grid grid-cols-4 text-xs font-black p-2 text-teal-900 text-center">
                                        <div>العام الدراسي: {headerConfig?.academicYear}</div>
                                        <div>الفصل الدراسي: {headerConfig?.term}</div>
                                        <div>الصف: {activeRecord.className}</div>
                                        <div>المادة: علوم الأرض والفضاء</div>
                                    </div>

                                    {/* الجدول الرئيسي */}
                                    <table className="w-full border-collapse border-2 border-black text-[10px] text-center">
                                        <thead className="bg-orange-100 font-black">
                                            <tr>
                                                <th rowSpan={2} className="border-2 border-black w-8">م</th>
                                                <th rowSpan={2} className="border-2 border-black w-48">اسم الطالب</th>
                                                <th colSpan={activeRecord.questions.length} className="border-2 border-black p-1 text-xs">رصد المهارات للمتعلمين</th>
                                                <th rowSpan={2} className="border-2 border-black w-12 bg-white">عدد المهارات</th>
                                                <th rowSpan={2} className="border-2 border-black w-12 bg-white">نسبة الإتقان 100%</th>
                                            </tr>
                                            <tr>
                                                {activeRecord.questions.map((q, i) => (
                                                    <th key={i} className="border-2 border-black w-8 bg-orange-50 vertical-text py-4 h-32">{q.learningOutcome}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="font-bold">
                                            {Object.entries(activeRecord.studentResponses).map(([sid, res], idx) => {
                                                const student = students.find(s => s.id === sid);
                                                const masteredCount = Object.values(res.answers).filter(v => v === '✔').length;
                                                return (
                                                    <tr key={sid} className="h-8 hover:bg-gray-50">
                                                        <td className="border-2 border-black">{idx + 1}</td>
                                                        <td className="border-2 border-black text-right pr-2 bg-gray-50">{student?.name || 'مجهول'}</td>
                                                        {activeRecord.questions.map(q => (
                                                            <td key={q.id} className={`border-2 border-black font-black text-lg ${res.answers[q.text] === '✔' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {res.answers[q.text]}
                                                            </td>
                                                        ))}
                                                        <td className="border-2 border-black bg-green-50 text-green-700">{masteredCount}</td>
                                                        <td className="border-2 border-black bg-green-50 text-green-700">{Math.round((masteredCount / activeRecord.questions.length) * 100)}%</td>
                                                    </tr>
                                                );
                                            })}
                                            
                                            {/* إحصائيات التذييل الملونة */}
                                            <tr className="bg-green-50 font-black h-10">
                                                <td colSpan={2} className="border-2 border-black text-green-800">عدد الطلبة المتقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-green-600">{s.mastered}</td>)}
                                                <td colSpan={2} rowSpan={2} className="border-2 border-black bg-white vertical-text text-sm">مؤشر نسبة الإتقان</td>
                                            </tr>
                                            <tr className="bg-green-100 font-black h-10">
                                                <td colSpan={2} className="border-2 border-black text-green-900">نسبة الطلبة المتقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-green-700">{s.masteredPct}%</td>)}
                                            </tr>
                                            <tr className="bg-red-50 font-black h-10">
                                                <td colSpan={2} className="border-2 border-black text-red-800">عدد الطلبة الغير متقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-red-600">{s.failed}</td>)}
                                                <td colSpan={2} rowSpan={2} className="border-2 border-black bg-white">
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <div className="w-12 h-12 rounded-full border-4 border-green-500 flex items-center justify-center text-xs">
                                                            {Math.round(kashfStats.reduce((a,b)=>a+b.masteredPct,0)/kashfStats.length)}%
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-red-100 font-black h-10">
                                                <td colSpan={2} className="border-2 border-black text-red-900">نسبة الطلبة الغير متقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-red-700">{s.failedPct}%</td>)}
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* التواقيع */}
                                    <div className="mt-0 bg-teal-900 text-white p-4 grid grid-cols-2 text-center text-xs font-bold border-x-2 border-b-2 border-black">
                                        <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                        <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                    </div>
                                    <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-gray-900 text-white rounded-xl font-black flex items-center justify-center gap-2 print:hidden"><Printer/> طباعة الكشف الرسمي</button>
                                </div>
                            </div>
                        ) : detailTab === 'OFFICIAL_REPORT' ? (
                            /* --- نفس النموذج السابق (الأزرق) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-xl border-t-[12px] border-indigo-900 print:shadow-none">
                                <div className="flex justify-between border-b-2 border-indigo-900 pb-6 mb-8">
                                    <div className="text-right text-xs font-bold">
                                        <p className="text-indigo-900">الإدارة العامة للتعليم</p>
                                        <div className="mt-4 bg-indigo-900 text-white px-4 py-1 rounded-full">{headerConfig?.schoolName}</div>
                                    </div>
                                    <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16" alt="logo"/>
                                </div>
                                <table className="w-full border-2 border-indigo-900 text-xs text-center font-bold">
                                    <thead className="bg-indigo-50">
                                        <tr><th className="border border-indigo-900 p-2">م</th><th className="border border-indigo-900 p-2 text-right">المهارة المستهدفة</th><th className="border border-indigo-900 p-2">إتقان</th></tr>
                                    </thead>
                                    <tbody>
                                        {activeRecord.questions.map((q, i) => (
                                            <tr key={i}><td className="border border-indigo-900 p-2">{i+1}</td><td className="border border-indigo-900 p-2 text-right">{q.learningOutcome}</td><td className="border border-indigo-900 p-2 text-green-600">✔</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* --- تحليل الفقرات --- */
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {activeRecord.questions.map((q, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1"><span className="text-[10px] font-black text-green-600">س{i+1}</span><h4 className="font-bold text-gray-800 text-sm">{q.text}</h4></div>
                                            <div className="text-center bg-green-50 px-3 py-1 rounded-lg border border-green-100"><div className="text-lg font-black text-green-600">{q.successRate}%</div><div className="text-[8px] font-bold text-gray-400">إتقان</div></div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 mb-4"><BrainCircuit size={14}/> {q.learningOutcome}</div>
                                        <div className="space-y-1">
                                            {q.commonErrors.map(([ans, count], idx) => (
                                                <div key={idx} className="flex justify-between p-2 bg-red-50 rounded-lg text-[10px] text-red-700"><span>خطأ شائع: {ans}</span><span className="font-black">{count} طالب</span></div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد --- */
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/>
                        <h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3>
                        <p className="text-xs text-gray-400 mb-8 max-w-xs">سيقوم النظام باستبعاد حقول الأسماء والهوية والتركيز على المهارات.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 w-full">
                                <label className="text-sm font-bold text-gray-600">عنوان الاختبار:</label>
                                <input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600 outline-none" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/>
                            </div>
                            <button onClick={handleAiAutoFillOutcomes} disabled={isAiProcessing} className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 border border-indigo-200">
                                {isAiProcessing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} استخراج المهارات ذكياً (AI)
                            </button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> الأسئلة والمهارات</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                            <p className="text-xs font-bold text-gray-700 mb-2 leading-relaxed"><span className="text-green-600">س{idx+1}:</span> {item.question}</p>
                                            <div className="bg-white border rounded p-1.5 flex items-center gap-2 shadow-sm">
                                                <BrainCircuit size={14} className="text-purple-500"/>
                                                <input className="text-xs outline-none w-full font-bold text-purple-700" placeholder="المهارة المستهدفة..." value={outcomesMapping[item.id]?.skill || ''} onChange={e=>setOutcomesMapping({...outcomesMapping, [item.id]: {...(outcomesMapping[item.id]||{unit:''}), skill: e.target.value}})}/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> مطابقة الطلاب</h3>
                                <div className="flex-1 overflow-y-auto border rounded-2xl bg-gray-50">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 sticky top-0 font-bold z-10"><tr><th className="p-3">الطالب</th><th className="p-3 text-center">الحالة</th></tr></thead>
                                        <tbody className="divide-y">
                                            {fileData.map((r, i) => (
                                                <tr key={i} className="hover:bg-white transition-colors">
                                                    <td className="p-3 font-bold">{r[headers.find(h=>blacklist.some(b=>h.includes(b))) || headers[0]]}</td>
                                                    <td className="p-3 text-center"><CheckCircle size={14} className="text-green-500 mx-auto"/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving} className="mt-4 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 flex items-center justify-center gap-2 transition-all">
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ التحليل والرصد
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* --- واجهة الأرشيف والمقارنة --- */
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {selectedForCompare.size > 0 && (
                        <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-xl animate-fade-in flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <Layers size={24}/>
                                <div><h3 className="font-bold">دمج السجلات ({selectedForCompare.size})</h3><p className="text-[10px] text-indigo-200">سيتم إنشاء سجل كامل يجمع كل مهارات الاختبارات المحددة.</p></div>
                            </div>
                            <button onClick={() => { setIsMergedView(true); setDetailTab('KASHF'); }} className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-black shadow-lg hover:bg-yellow-500 transition-all flex items-center gap-2"><Layout size={18}/> عرض السجل المدمج</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-1 pb-10">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <button onClick={(e)=>{e.stopPropagation(); const s=new Set(selectedForCompare); if(s.has(record.id))s.delete(record.id); else s.add(record.id); setSelectedForCompare(s);}} className={`p-2 rounded-lg transition-all ${selectedForCompare.has(record.id)?'bg-indigo-600 text-white shadow-md':'bg-gray-100 text-gray-400 hover:bg-indigo-50'}`}><CheckSquare size={16}/></button>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                <button className="w-full py-2 bg-gray-50 text-indigo-600 rounded-xl text-[10px] font-black group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2">فتح التحليل <ArrowRight size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <style>{`
                .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default FormsAnalyzer;
