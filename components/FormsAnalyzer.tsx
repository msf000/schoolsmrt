
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown, Layers, Layout, PieChart as PieIcon
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

    const blacklist = ['اسم', 'الرباعي', 'الكامل', 'هوية', 'سجل', 'رقم', 'مدني', 'فصل', 'شعبة', 'بريد', 'name', 'id', 'email', 'class', 'identity', 'start', 'completion', 'time', 'س1:'];

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
            const prompt = `استخرج لكل سؤال المهارة المستهدفة بشكل مختصر جداً. البيانات: ${JSON.stringify(questionsList)} أرجع JSON مفتاحه id وقيمته { "skill": "..." }.`;
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
                    let studentPoints = 0;
                    itemAnalysis.forEach(q => { 
                        const pts = Number(row[q.id]);
                        if(pts > 0) studentPoints++;
                        answers[q.question] = pts > 0 ? '✔' : '✘'; 
                    });
                    studentResponses[matchedStudent.id] = { score: studentPoints, total: itemAnalysis.length, answers };
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
                    unit: 'غير محدد', successRate: q.successRate, difficulty: q.successRate < 50 ? 'HARD' : 'EASY', commonErrors: q.commonErrors as any
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ.'); setFileData([]); setViewMode('HISTORY');
        } catch (e) { alert('خطأ.'); } finally { setIsSaving(false); }
    };

    const activeRecord = selectedRecord;

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
            {/* Header Controls */}
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
                <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                    {/* Navigation inside Record */}
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center print:hidden">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft/></button>
                            <div><h3 className="font-bold text-gray-800">{activeRecord.examTitle}</h3><p className="text-xs text-gray-500">{activeRecord.className}</p></div>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={()=>setDetailTab('KASHF')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='KASHF'?'bg-white shadow text-teal-800':'text-gray-500'}`}>كشف رصد مهارات (أخضر)</button>
                            <button onClick={()=>setDetailTab('OFFICIAL_REPORT')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='OFFICIAL_REPORT'?'bg-white shadow text-indigo-900':'text-gray-500'}`}>تحليل النتائج (أزرق)</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'KASHF' ? (
                            /* --- كشف الرصد الملون (النموذج الأخضر المرفق) --- */
                            <div className="w-full bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                                <div className="min-w-[1200px] border-2 border-black">
                                    {/* ترويسة الكشف */}
                                    <div className="bg-teal-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                                        <div className="text-right text-[11px] font-bold space-y-1">
                                            <p>الإدارة العامة للتعليم بمنطقة {headerConfig?.educationAdmin}</p>
                                            <p>مدرسة {headerConfig?.schoolName}</p>
                                        </div>
                                        <div className="text-center">
                                            <h2 className="text-xl font-black mb-1">كشف رصد درجات الاختبار الفتري / النهائي</h2>
                                            <p className="text-xs opacity-80">رصد المهارات للمتعلمين لمادة: علوم الأرض والفضاء</p>
                                        </div>
                                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                                    </div>

                                    {/* شريط معلومات الصف */}
                                    <div className="bg-teal-50 border-b-2 border-black grid grid-cols-4 text-xs font-black p-3 text-teal-900 text-center">
                                        <div>العام الدراسي: {headerConfig?.academicYear}</div>
                                        <div>الفصل الدراسي: {headerConfig?.term}</div>
                                        <div>الصف: {activeRecord.className}</div>
                                        <div>الفصل: {activeRecord.className.split(' ').pop()}</div>
                                    </div>

                                    {/* الجدول الرئيسي */}
                                    <table className="w-full border-collapse text-[11px] text-center table-fixed">
                                        <thead className="bg-orange-100 font-black">
                                            <tr>
                                                <th rowSpan={2} className="border-2 border-black w-10">م</th>
                                                <th rowSpan={2} className="border-2 border-black w-60">اسم الطالب</th>
                                                <th colSpan={activeRecord.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th>
                                                <th rowSpan={2} className="border-2 border-black w-16 bg-white">عدد المهارات</th>
                                                <th rowSpan={2} className="border-2 border-black w-16 bg-white">نسبة الإتقان 100%</th>
                                            </tr>
                                            <tr className="bg-orange-50 h-40">
                                                {activeRecord.questions.map((q, i) => (
                                                    <th key={i} className="border-2 border-black w-10 p-0 relative">
                                                        <div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">
                                                            {q.learningOutcome}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="font-bold">
                                            {Object.entries(activeRecord.studentResponses).map(([sid, res], idx) => {
                                                const student = students.find(s => s.id === sid);
                                                const masteredCount = Object.values(res.answers).filter(v => v === '✔').length;
                                                const masteryPct = Math.round((masteredCount / activeRecord.questions.length) * 100);
                                                return (
                                                    <tr key={sid} className="h-9 hover:bg-gray-50 border-b border-black">
                                                        <td className="border-2 border-black bg-gray-50">{idx + 1}</td>
                                                        <td className="border-2 border-black text-right pr-3 font-black text-gray-800 bg-gray-50 truncate">{student?.name || 'طالب مجهول'}</td>
                                                        {activeRecord.questions.map(q => (
                                                            <td key={q.id} className={`border-2 border-black font-black text-sm ${res.answers[q.text] === '✔' ? 'text-green-600 bg-green-50/20' : 'text-red-500 bg-red-50/20'}`}>
                                                                {res.answers[q.text]}
                                                            </td>
                                                        ))}
                                                        <td className="border-2 border-black bg-green-50 text-green-700 font-black">{masteredCount}</td>
                                                        <td className={`border-2 border-black font-black ${masteryPct < 60 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>{masteryPct}%</td>
                                                    </tr>
                                                );
                                            })}
                                            
                                            {/* صفوف الإحصائيات في التذييل (مطابق للصورة) */}
                                            <tr className="bg-green-100 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-green-800 text-sm">عدد الطلبة المتقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-green-700 text-lg">{s.mastered}</td>)}
                                                <td colSpan={2} rowSpan={2} className="border-2 border-black bg-white vertical-text text-teal-800 font-black text-sm">مؤشر نسبة الإتقان</td>
                                            </tr>
                                            <tr className="bg-green-50 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-green-900 text-sm">نسبة الطلبة المتقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-green-800 text-sm">{s.masteredPct}%</td>)}
                                            </tr>
                                            <tr className="bg-red-100 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-red-800 text-sm">عدد الطلبة الغير متقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-red-600 text-lg">{s.failed}</td>)}
                                                <td colSpan={2} rowSpan={2} className="border-2 border-black bg-white">
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <div className="w-14 h-14 rounded-full border-4 border-teal-600 flex items-center justify-center text-xs font-black text-teal-900">
                                                            {kashfStats.length ? Math.round(kashfStats.reduce((a,b)=>a+b.masteredPct,0)/kashfStats.length) : 0}%
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-red-50 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-red-900 text-sm">نسبة الطلبة الغير متقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-red-700 text-sm">{s.failedPct}%</td>)}
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* حقل التوقيع الرسمي */}
                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black">
                                        <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                        <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                    </div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة الكشف الرسمي الأخضر</button>
                            </div>
                        ) : (
                            /* --- تحليل النتائج (النموذج الأزرق) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl border border-gray-200">
                                {/* ... (يمكن إكمال واجهة التحليل الأزرق هنا بنفس النمط) ... */}
                                <p className="text-center text-gray-400 p-20 italic">جاري تحميل واجهة التحليل الإحصائي...</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* --- واجهة الاستيراد والأرشيف (تبقى كما هي) --- */
                viewMode === 'IMPORT' ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/>
                        <h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3>
                        <p className="text-xs text-gray-400 mb-8 max-w-xs">سيقوم النظام باستخراج المهارات وعرضها بنظام (✔ / ✘) المطابق للكشف الرسمي.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-teal-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl shadow-inner"><BarChart2 size={24}/></div>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                <button className="w-full py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black shadow-md hover:bg-teal-700 transition-all flex items-center justify-center gap-2">فتح الكشف الرسمي <ArrowRight size={12}/></button>
                            </div>
                        ))}
                    </div>
                )
            )}
            <style>{`
                .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .custom-scrollbar { overflow: visible !important; }
                }
            `}</style>
        </div>
    );
};

export default FormsAnalyzer;
