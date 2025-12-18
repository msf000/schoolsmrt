
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown
} from 'lucide-react';
import { Student, FormsDetailedResult, FormsQuestionAnalysis, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LineChart, Line } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY' | 'REPORT_VIEW'>('IMPORT');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [detailTab, setDetailTab] = useState<'QUESTIONS' | 'STUDENTS' | 'OFFICIAL_REPORT'>('QUESTIONS');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, {skill: string, unit: string}>>({});
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // Comparison State
    const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

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
    const blacklist = ['اسم', 'الرباعي', 'الكامل', 'هوية', 'سجل', 'رقم', 'مدني', 'فصل', 'شعبة', 'بريد', 'name', 'id', 'email', 'class', 'identity', 'start', 'completion', 'time'];

    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];
        const pointHeaders = headers.filter(h => {
            const isPointCol = h.includes('النقاط -') || h.includes('Points -');
            if (!isPointCol) return false;
            const cleanText = h.replace(/^(النقاط - |Points - )/, '').trim();
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
            
            const prompt = `
            بصفتك خبيراً تربوياً، استخرج لكل سؤال:
            1. المهارة المستهدفة (ناتج التعلم) بشكل مختصر.
            2. اسم الوحدة أو الدرس المتوقع.
            البيانات: ${JSON.stringify(questionsList)}
            أرجع النتيجة بصيغة JSON ككائن مفتاحه id وقيمته { "skill": "...", "unit": "..." }.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

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
                    itemAnalysis.forEach(q => { answers[q.question] = String(row[q.answerColumn] || '-'); });
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
                    id: q.id,
                    text: q.question,
                    learningOutcome: outcomesMapping[q.id]?.skill || 'مهارة عامة',
                    unit: outcomesMapping[q.id]?.unit || 'غير محدد',
                    successRate: q.successRate,
                    difficulty: q.successRate < 50 ? 'HARD' : 'EASY',
                    commonErrors: q.commonErrors as any
                })),
                studentResponses
            };

            saveFormsDetailedResult(record);
            alert('تم حفظ التحليل بنجاح.');
            setFileData([]); setViewMode('HISTORY');
        } catch (e) { alert('خطأ في الحفظ.'); } finally { setIsSaving(false); }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('هل تريد حذف هذا السجل نهائياً؟')) {
            deleteFormsDetailedResult(id);
            setHistory(getFormsDetailedResults(currentUserId));
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> محلل نواتج التعلم (النموذج الرسمي)
                    </h2>
                </div>
                {!selectedRecord && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                        <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>السجل والأرشيف</button>
                    </div>
                )}
            </div>

            {selectedRecord ? (
                /* --- عرض التفاصيل والتقرير الرسمي --- */
                <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center print:hidden">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                            <div><h3 className="font-bold">{selectedRecord.examTitle}</h3><p className="text-xs text-gray-500">{selectedRecord.className}</p></div>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={()=>setDetailTab('QUESTIONS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${detailTab==='QUESTIONS'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>تحليل الفقرات</button>
                            <button onClick={()=>setDetailTab('STUDENTS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${detailTab==='STUDENTS'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>كشف الطلاب</button>
                            <button onClick={()=>setDetailTab('OFFICIAL_REPORT')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${detailTab==='OFFICIAL_REPORT'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>التقرير الرسمي</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'OFFICIAL_REPORT' ? (
                            /* --- واجهة التقرير الرسمي (مطابقة للصورة) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-xl border-t-[12px] border-indigo-900 print:shadow-none print:p-0">
                                <div className="flex justify-between items-start mb-8 border-b-2 border-indigo-900 pb-6">
                                    <div className="text-right text-xs font-bold space-y-1">
                                        <p className="text-indigo-900 text-sm">الإدارة العامة للتعليم بمنطقة</p>
                                        <p>{headerConfig?.educationAdmin || '..........'}</p>
                                        <div className="mt-4 bg-indigo-900 text-white px-4 py-1 rounded-full text-center">{headerConfig?.schoolName || 'مدرسة القيروان الثانوية'}</div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-20 mb-2" alt="logo"/>
                                        <p className="text-[10px] font-bold text-gray-400">نظام المتابع الذكي v2.5</p>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-t-xl border-x border-t border-indigo-900 text-center font-black text-indigo-900 text-lg">نواتج التعلم المستهدفة</div>
                                <table className="w-full border-collapse border-2 border-indigo-900 text-xs">
                                    <thead className="bg-indigo-50 text-indigo-900 font-black">
                                        <tr>
                                            <th className="border border-indigo-900 p-2 w-12 text-center">الوحدة / الدرس</th>
                                            <th className="border border-indigo-900 p-2 w-10 text-center">م</th>
                                            <th className="border border-indigo-900 p-2 text-right">المهارة المستهدفة</th>
                                            <th className="border border-indigo-900 p-2 w-20 text-center">وفق الاختبار القبلي</th>
                                            <th className="border border-indigo-900 p-2 w-20 text-center">وفق الاختبار البعدي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold">
                                        {selectedRecord.questions.map((q, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="border border-indigo-900 p-2 text-center text-[10px]">{(q as any).unit || '-'}</td>
                                                <td className="border border-indigo-900 p-2 text-center">{i+1}</td>
                                                <td className="border border-indigo-900 p-2 text-right">{q.learningOutcome}</td>
                                                <td className="border border-indigo-900 p-2 text-center text-green-600">{q.successRate < 50 ? '✘' : '✔'}</td>
                                                <td className="border border-indigo-900 p-2 text-center text-green-600">✔</td>
                                            </tr>
                                        ))}
                                        {/* تعبئة صفوف فارغة كما في الصورة */}
                                        {Array.from({length: Math.max(0, 15 - selectedRecord.questions.length)}).map((_, i) => (
                                            <tr key={i} className="h-8">
                                                <td className="border border-indigo-900 p-2"></td>
                                                <td className="border border-indigo-900 p-2 text-center">{selectedRecord.questions.length + i + 1}</td>
                                                <td className="border border-indigo-900 p-2"></td>
                                                <td className="border border-indigo-900 p-2 text-center text-green-600 opacity-20">✔</td>
                                                <td className="border border-indigo-900 p-2 text-center text-green-600 opacity-20">✔</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="mt-6 grid grid-cols-3 gap-0 border-2 border-indigo-900 font-bold text-xs">
                                    <div className="col-span-2 border-l border-indigo-900">
                                        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-indigo-900 border-b border-indigo-900">
                                            <div className="p-2 text-center">نموذج الاختبار القبلي</div>
                                            <div className="p-2 text-center">نموذج الاختبار البعدي</div>
                                            <div className="p-2 text-center">أوراق العمل</div>
                                            <div className="p-2 text-center">الملاحظة الصفية</div>
                                        </div>
                                        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-indigo-900">
                                            <div className="p-2 text-center">1</div><div className="p-2 text-center">2</div><div className="p-2 text-center">3</div><div className="p-2 text-center">4</div>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-900 text-white p-4 flex flex-col items-center justify-center text-center">
                                        <p>آلية تقويم</p>
                                        <p>مكتسبات المتعلم</p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-0 border-x-2 border-b-2 border-t-2 border-indigo-900 text-xs font-black">
                                    <div className="flex border-b-2 border-indigo-900">
                                        <div className="flex-1 p-3 text-center border-l-2 border-indigo-900">{selectedRecord.className}</div>
                                        <div className="w-48 p-3 bg-indigo-900 text-white text-center">الصف / الفصل</div>
                                    </div>
                                    <div className="flex border-b-2 border-indigo-900">
                                        <div className="flex-1 p-3 text-center border-l-2 border-indigo-900">{headerConfig?.teacherName || 'أ. محمد سعد الشريف'}</div>
                                        <div className="w-48 p-3 bg-indigo-900 text-white text-center">معلم المادة</div>
                                    </div>
                                    <div className="flex">
                                        <div className="flex-1 p-3 text-center border-l-2 border-indigo-900">{headerConfig?.schoolManager || 'أ. خالد علي الزهراني'}</div>
                                        <div className="w-48 p-3 bg-indigo-900 text-white text-center">مدير المدرسة</div>
                                    </div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-indigo-900 text-white rounded-xl font-black flex items-center justify-center gap-2 print:hidden"><Printer/> طباعة التقرير الرسمي</button>
                            </div>
                        ) : detailTab === 'QUESTIONS' ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {selectedRecord.questions.map((q, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1"><span className="text-[10px] font-black text-green-600">س{i+1}</span><h4 className="font-bold text-gray-800 text-sm leading-relaxed">{q.text}</h4></div>
                                            <div className="text-center bg-green-50 px-3 py-1 rounded-lg border border-green-100"><div className="text-lg font-black text-green-600">{q.successRate}%</div><div className="text-[8px] font-bold text-gray-400">إتقان</div></div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 mb-4"><BrainCircuit size={14}/> ناتج التعلم: {q.learningOutcome}</div>
                                        <div className="space-y-1">
                                            {q.commonErrors.map(([ans, count], idx) => (
                                                <div key={idx} className="flex justify-between p-2 bg-red-50 rounded-lg text-[10px] text-red-700"><span>خطأ شائع: {ans}</span><span className="font-black">{count} طالب</span></div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-50 border-b">
                                        <tr><th className="p-4">اسم الطالب</th>{selectedRecord.questions.map((_, i) => <th key={i} className="p-2 text-center whitespace-nowrap">س{i+1}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {Object.entries(selectedRecord.studentResponses).map(([sid, res]) => (
                                            <tr key={sid} className="hover:bg-gray-50">
                                                <td className="p-4 font-bold">{students.find(s=>s.id===sid)?.name || 'مجهول'}</td>
                                                {selectedRecord.questions.map(q => <td key={q.id} className="p-2 text-center">{!q.commonErrors.some(e=>e[0]===res.answers[q.text]) && res.answers[q.text]!=='-' ? <div className="w-2 h-2 rounded-full bg-green-500 mx-auto"/> : <div className="w-2 h-2 rounded-full bg-red-400 mx-auto"/>}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد المحدثة --- */
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/>
                        <h3 className="text-xl font-black text-gray-800 mb-2">ارفع ملف استجابات Forms الجديد</h3>
                        <p className="text-xs text-gray-400 mb-8 max-w-xs">سيقوم النظام تلقائياً باستبعاد بيانات الهوية والتركيز على نواتج التعلم.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار ملف الاستجابات</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 w-full">
                                <label className="text-sm font-bold text-gray-600 whitespace-nowrap">عنوان الاختبار:</label>
                                <input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600 outline-none" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/>
                            </div>
                            <button onClick={handleAiAutoFillOutcomes} disabled={isAiProcessing} className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 border border-indigo-200">
                                {isAiProcessing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} استخراج النواتج ذكياً
                            </button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> الفقرات ونواتج التعلم</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                            <p className="text-xs font-bold text-gray-700 mb-2 leading-relaxed"><span className="text-green-600">س{idx+1}:</span> {item.question}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white border rounded p-1.5 flex items-center gap-2">
                                                    <BrainCircuit size={14} className="text-purple-500"/>
                                                    <input className="text-[10px] outline-none w-full font-bold" placeholder="المهارة..." value={outcomesMapping[item.id]?.skill || ''} onChange={e=>setOutcomesMapping({...outcomesMapping, [item.id]: {...(outcomesMapping[item.id]||{unit:''}), skill: e.target.value}})}/>
                                                </div>
                                                <div className="bg-white border rounded p-1.5 flex items-center gap-2">
                                                    <Target size={14} className="text-blue-500"/>
                                                    <input className="text-[10px] outline-none w-full font-bold" placeholder="الوحدة..." value={outcomesMapping[item.id]?.unit || ''} onChange={e=>setOutcomesMapping({...outcomesMapping, [item.id]: {...(outcomesMapping[item.id]||{skill:''}), unit: e.target.value}})}/>
                                                </div>
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
                                                <tr key={i} className="hover:bg-white">
                                                    <td className="p-3 font-bold">{r[headers.find(h=>h.includes('اسم')) || headers[0]]}</td>
                                                    <td className="p-3 text-center"><CheckCircle size={14} className="text-green-500 mx-auto"/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving} className="mt-4 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 flex items-center justify-center gap-2 transition-all">
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} إتمام الحفظ والرصد
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* --- الأرشيف --- */
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
                    {history.map(record => (
                        <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FileText size={20}/></div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e)=>handleDelete(record.id, e)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-gray-800 mb-1">{record.examTitle}</h4>
                            <p className="text-[10px] text-gray-400 font-bold mb-4">{record.className} • {new Date(record.date).toLocaleDateString('ar-SA')}</p>
                            <button className="w-full py-2 bg-gray-50 text-indigo-600 rounded-xl text-[10px] font-black group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2">عرض التقرير الرسمي <ArrowRight size={12}/></button>
                        </div>
                    ))}
                    {history.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا يوجد سجل تحليل سابق</div>}
                </div>
            )}
        </div>
    );
};

export default FormsAnalyzer;
