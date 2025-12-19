
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, Upload, ListFilter, Target, Save, ArrowLeft, Trash2, 
    BarChart2, Sparkles, Printer, Filter, GitCompare, Wand2, CheckCircle, 
    PlusCircle, History, LayoutGrid, ArrowRightLeft, UserCheck, BookOpen, ArrowRight, ClipboardCheck, Users, Bookmark, FileText, EyeOff, X, LifeBuoy, Calendar, Settings2, TrendingUp, ArrowUpRight, ArrowDownRight, Minus,
    Circle, User, Check, XCircle as XIcon
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
// Fix: Import missing formatDualDate function
import { formatDualDate } from '../services/dateService';

// تعريف المكون المفقود لحل مشكلة البناء
const TabBtnView = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all ${active ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
);

interface Props {
    students: Student[];
    currentUserId?: string;
}

const KashfReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
                <div className="flex justify-between items-center text-xs font-bold">
                    <div className="text-right">
                        <p>المملكة العربية السعودية</p>
                        <p>وزارة التعليم</p>
                        <p>منطقة {header?.educationAdmin}</p>
                    </div>
                    <div className="text-center">
                        <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 mx-auto" />
                        <p className="mt-2 text-sm font-black">كشف رصد نتائج الاختبارات المدرسية</p>
                    </div>
                    <div className="text-left">
                        <p>مدرسة {header?.schoolName}</p>
                        <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                    </div>
                </div>
            </div>
            <h3 className="text-xl font-bold mb-4 print:hidden">كشف الرصد - {record.examTitle}</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black text-[11px] text-center">
                    <thead className="bg-[#00334d] text-white">
                        <tr className="h-10">
                            <th className="border border-black w-8">م</th>
                            <th className="border border-black text-right pr-4 w-48">اسم الطالب</th>
                            <th className="border border-black">الدرجة</th>
                            {record.questions.map((q: any, i: number) => (
                                <th key={i} className="border border-black vertical-text h-20">{i + 1}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.studentsList.map((s: any, idx: number) => (
                            <tr key={s.sid} className="h-8 border-b border-black">
                                <td className="border border-black">{idx + 1}</td>
                                <td className="border border-black text-right pr-3 font-bold">{s.name}</td>
                                <td className="border border-black font-black">{s.score}</td>
                                {record.questions.map((q: any) => (
                                    <td key={q.id} className="border border-black">{s.answers[q.id] || '-'}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="hidden print:grid grid-cols-2 mt-10 text-xs font-black text-center">
                <div>معلم المادة / أ. {header?.teacherName}</div>
                <div>مدير المدرسة / أ. {header?.schoolManager}</div>
            </div>
        </div>
    );
};

const DiagnosticAnalysis = ({ record, data, header }: any) => {
    const chartData = data.skillStats.map((s: any) => ({ name: s.name, mastery: s.masteredPct }));
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <h3 className="text-xl font-bold mb-6 text-indigo-700">التحليل البياني لنواتج التعلم</h3>
            <div className="h-80 w-full mb-10">
                <ResponsiveContainer>
                    <ReBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <ReBar dataKey="mastery" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.skillStats.map((s: any, i: number) => (
                    <div key={i} className="p-4 border rounded-xl flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">س{i+1}: {s.name}</p>
                            <p className="text-xs font-black text-gray-700 mt-1">نسبة الإتقان: {Math.round(s.masteredPct)}%</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${s.masteredPct >= 75 ? 'bg-green-50' : s.masteredPct >= 50 ? 'bg-orange-50' : 'bg-red-50'}`}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LearningOutcomesReport = ({ record, data, header }: any) => {
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
             <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
                <h2 className="text-xl font-black underline">تقرير نواتج التعلم المستهدفة</h2>
                <p className="text-sm font-bold mt-2">{record.examTitle}</p>
            </div>
            <table className="w-full border-collapse border-2 border-black text-xs text-center">
                <thead>
                    <tr className="bg-[#00334d] text-white font-black h-12">
                        <th className="border border-black">الناتج التعليمي</th>
                        <th className="border border-black">الوحدة</th>
                        <th className="border border-black w-24">عدد المتقنين</th>
                        <th className="border border-black w-24">نسبة الإتقان</th>
                    </tr>
                </thead>
                <tbody>
                    {data.skillStats.map((s: any, i: number) => (
                        <tr key={i} className="h-10 border-b border-black">
                            <td className="border border-black text-right pr-4 font-bold">{s.name}</td>
                            <td className="border border-black">{s.unit}</td>
                            <td className="border border-black font-black text-green-600">{s.masteredCount}</td>
                            <td className="border border-black font-black">{Math.round(s.masteredPct)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ComparisonReport = ({ data, header, viewMode }: any) => {
    const { recA, recB, studentComparison, overallGrowth } = data;
    return (
        <div className="space-y-10">
            {viewMode === 'SUMMARY' && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black rounded-3xl animate-fade-in">
                    <h2 className="text-center text-2xl font-black mb-8 underline text-purple-900">ملخص التطور التعليمي</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 bg-blue-50 rounded-2xl border-2 border-blue-100 text-center">
                            <p className="text-xs font-black text-blue-600 mb-2 uppercase">إتقان الاختبار الأساس</p>
                            <h3 className="text-5xl font-black text-blue-900">{Math.round(data.dataA.overallMasteryPct)}%</h3>
                            <p className="text-[10px] text-blue-400 mt-2">{recA.examTitle}</p>
                        </div>
                        <div className="p-8 bg-green-50 rounded-2xl border-2 border-green-100 text-center">
                            <p className="text-xs font-black text-green-600 mb-2 uppercase">إتقان الاختبار المستهدف</p>
                            <h3 className="text-5xl font-black text-green-900">{Math.round(data.dataB.overallMasteryPct)}%</h3>
                            <p className="text-[10px] text-green-400 mt-2">{recB.examTitle}</p>
                        </div>
                        <div className={`p-8 rounded-2xl border-2 text-center ${overallGrowth >= 0 ? 'bg-purple-50 border-purple-100' : 'bg-red-50 border-red-100'}`}>
                            <p className={`text-xs font-black mb-2 uppercase ${overallGrowth >= 0 ? 'text-purple-600' : 'text-red-600'}`}>نسبة التغير (Growth)</p>
                            <h3 className={`text-5xl font-black ${overallGrowth >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                                {overallGrowth >= 0 ? '+' : ''}{Math.round(overallGrowth)}%
                            </h3>
                            <p className="text-[10px] opacity-60 mt-2 font-bold">معدل النمو المعرفي للفصل</p>
                        </div>
                    </div>
                </div>
            )}
            {viewMode === 'DETAILS' && (
                <div className="bg-white p-8 border-2 border-black rounded-3xl overflow-x-auto shadow-sm">
                    <table className="w-full text-center border-collapse text-[11px] border-2 border-black">
                        <thead>
                            <tr className="bg-[#00334d] text-white h-12">
                                <th className="border border-black w-10">م</th>
                                <th className="border border-black text-right pr-4 w-64">اسم الطالب</th>
                                <th className="border border-black">الدرجة (قبلي)</th>
                                <th className="border border-black">الدرجة (بعدي)</th>
                                <th className="border border-black">النمو (%)</th>
                                <th className="border border-black">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentComparison.map((s: any, idx: number) => (
                                <tr key={idx} className="h-9 border-b border-black hover:bg-gray-50">
                                    <td className="border border-black">{idx + 1}</td>
                                    <td className="border border-black text-right pr-4 font-bold">{s.name}</td>
                                    <td className="border border-black font-mono">{s.scoreA}</td>
                                    <td className="border border-black font-mono">{s.scoreB}</td>
                                    <td className={`border border-black font-black ${s.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {Math.round(s.growth)}%
                                    </td>
                                    <td className="border border-black">
                                        {s.growth > 20 ? 'تحسن متميز 🚀' : s.growth > 0 ? 'تحسن تدريجي' : s.growth === 0 ? 'ثبات' : 'فقد تعليمي ⚠️'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [mainTab, setMainTab] = useState<'NEW' | 'HISTORY' | 'COMPARE'>('HISTORY');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [historyViewTab, setHistoryViewTab] = useState<'KASHF' | 'ANALYSIS' | 'SKILLS'>('KASHF');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [hiddenHeaders, setHiddenHeaders] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [unitsMapping, setUnitsMapping] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [reportClassFilter, setReportClassFilter] = useState('');
    const headerConfig = useMemo(() => getReportHeaderConfig(currentUserId), [currentUserId]);

    const [compareIdA, setCompareIdA] = useState('');
    const [compareIdB, setCompareIdB] = useState('');
    const [compareViewTab, setCompareViewTab] = useState<'SUMMARY' | 'DETAILS'>('SUMMARY');

    useEffect(() => {
        if (currentUserId) setHistory(getFormsDetailedResults(currentUserId));
    }, [currentUserId, isSaving, mainTab]);

    const getQuestionHeaders = (allHeaders: string[]) => {
        return allHeaders.filter(h => (h.includes('النقاط') || h.includes('Points')) && !h.includes('إجمالي') && !h.includes('Total') && !hiddenHeaders.has(h));
    };

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
        } catch (error) { alert('فشل تحميل الملف.'); } finally { setLoading(false); }
    };

    const handleAutoGenerateSkills = async () => {
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const itemAnalysis = getQuestionHeaders(headers).map(h => h.replace(/^(النقاط - )/, '').trim());
            const prompt = `حلل الأسئلة المدرسية التالية واستنتج المهارة والوحدة لكل سؤال. أرجع JSON فقط: {"items": [{"skill": "...", "unit": "..."}]}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt + "\n" + itemAnalysis.join('\n'),
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.items) {
                const newOutcomes: Record<string, string> = {};
                const newUnits: Record<string, string> = {};
                getQuestionHeaders(headers).forEach((h, i) => { 
                    newOutcomes[h] = result.items[i]?.skill || h; 
                    newUnits[h] = result.items[i]?.unit || 'الوحدة الأولى';
                });
                setOutcomesMapping(newOutcomes);
                setUnitsMapping(newUnits);
            }
        } catch (e) { alert('فشل التحليل الذكي.'); } finally { setIsAiProcessing(false); }
    };

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('الرجاء إدخال عنوان الكشف.');
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            const questionCols = getQuestionHeaders(headers);
            const nameCol = headers.find(h => h.includes('الاسم') || h.includes('اسمك') || h.includes('Name'));
            
            fileData.forEach((row) => {
                const rowName = String(row[nameCol || ''] || '').trim();
                const matchedStudent = students.find(s => s.name.includes(rowName) || rowName.includes(s.name));
                if (matchedStudent) {
                    const answers: Record<string, string> = {};
                    questionCols.forEach(q => { answers[q] = Number(row[q]) > 0 ? '✔' : '✘'; });
                    studentResponses[matchedStudent.id] = { 
                        score: Number(row['إجمالي النقاط'] || row['Total Points'] || 0), 
                        total: questionCols.length, 
                        answers 
                    };
                }
            });

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`, examTitle,
                className: 'عام', date: new Date().toISOString(), teacherId: currentUserId,
                questions: questionCols.map(q => ({
                    id: q, text: q, learningOutcome: outcomesMapping[q] || q,
                    unitName: unitsMapping[q] || 'الوحدة الأولى',
                    successRate: 0, difficulty: 'EASY', commonErrors: []
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ والتحليل بنجاح.'); setFileData([]); setMainTab('HISTORY');
        } catch (e) { alert('حدث خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    const getReportData = (record: FormsDetailedResult, classFilter: string) => {
        const allInClass = students.filter(s => !classFilter || s.className === classFilter).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        let totalPossibleSkills = 0; let totalMasteredSkills = 0; let totalStudentsAttended = 0;
        
        const studentsList = allInClass.map(s => {
            const res = record.studentResponses[s.id];
            const pct = res ? (res.score / record.questions.length) * 100 : 0;
            if (res) { totalStudentsAttended++; totalPossibleSkills += record.questions.length; totalMasteredSkills += res.score; }
            return { sid: s.id, name: s.name, score: res?.score || 0, total: record.questions.length, pct, isAbsent: !res, answers: res?.answers || {} };
        });

        const skillStats = record.questions.map(q => {
            let mastered = 0; let attended = 0;
            studentsList.forEach(s => { if (!s.isAbsent) { attended++; if (s.answers[q.id] === '✔') mastered++; } });
            return { id: q.id, name: q.learningOutcome, unit: q.unitName, masteredCount: mastered, masteredPct: attended > 0 ? (mastered / attended) * 100 : 0 };
        });

        return { studentsList, skillStats, overallMasteryPct: totalPossibleSkills > 0 ? (totalMasteredSkills / totalPossibleSkills) * 100 : 0 };
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><PlusCircle size={18} className="inline ml-2"/> تحليل جديد</button>
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><History size={18} className="inline ml-2"/> سجل النتائج</button>
                <button onClick={() => setMainTab('COMPARE')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'COMPARE' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><ArrowRightLeft size={18} className="inline ml-2"/> مقارنة النتائج</button>
            </div>

            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center animate-fade-in">
                        <Upload size={80} className="text-green-600 mb-4 opacity-20"/>
                        <h3 className="text-2xl font-black mb-4 text-gray-700">استيراد نتائج Microsoft Forms</h3>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-16 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-transform active:scale-95">اختر ملف الاستجابات (Excel)</label>
                        <p className="mt-4 text-xs text-gray-400 font-bold">تأكد أن الملف يحتوي على أعمدة النقاط والأسماء.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 animate-slide-up overflow-hidden">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row gap-8 overflow-hidden h-full">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-black text-gray-700">تخصيص نواتج التعلم للأسئلة</h4>
                                    <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-purple-700 flex items-center gap-2">
                                        {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} استخراج ذكي (AI)
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {getQuestionHeaders(headers).map((h, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4 border-r-4 border-r-purple-500">
                                            <p className="text-xs font-black text-gray-400 mb-2 truncate">س{idx+1}: {h}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input className="w-full p-2 border rounded-xl text-xs font-bold" placeholder="المهارة / الناتج التعليمي..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                                <input className="w-full p-2 border rounded-xl text-xs font-bold" placeholder="الوحدة / الفصل..." value={unitsMapping[h] || ''} onChange={e => setUnitsMapping({...unitsMapping, [h]: e.target.value})} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full xl:w-96 flex flex-col justify-end border-r pr-6 border-gray-100">
                                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">إعدادات الحفظ</label>
                                <input className="w-full p-3 border-2 border-indigo-100 rounded-xl font-black text-indigo-700 mb-4 outline-none focus:border-indigo-500" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="أدخل عنوان الكشف (مثلاً: اختبار دوري 1)"/>
                                <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} حفظ وتحليل النتائج
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {mainTab === 'HISTORY' && (
                !selectedRecord ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar p-2">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border-2 border-transparent shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer border-t-8 border-t-indigo-600 relative group overflow-hidden">
                                <div className="absolute top-4 left-4 p-2 text-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')) deleteFormsDetailedResult(record.id);}}>
                                    <Trash2 size={18}/>
                                </div>
                                <h3 className="font-black text-lg text-gray-800 mb-2">{record.examTitle}</h3>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{record.questions.length} مهارة</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">{formatDualDate(record.date)}</span>
                                </div>
                                <button className="mt-6 w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2">فتح التقارير <ArrowRight size={14}/></button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 animate-slide-up overflow-hidden">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-center justify-between print:hidden">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedRecord(null)} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><ArrowLeft/></button>
                                <div className="flex bg-gray-50 p-1 rounded-xl whitespace-nowrap overflow-x-auto no-scrollbar border">
                                    <TabBtnView label="كشف الرصد" active={historyViewTab==='KASHF'} onClick={()=>setHistoryViewTab('KASHF')}/>
                                    <TabBtnView label="نواتج التعلم" active={historyViewTab==='SKILLS'} onClick={()=>setHistoryViewTab('SKILLS')}/>
                                    <TabBtnView label="التحليل البياني" active={historyViewTab==='ANALYSIS'} onClick={()=>setHistoryViewTab('ANALYSIS')}/>
                                </div>
                            </div>
                            <button onClick={()=>window.print()} className="px-6 py-2 bg-gray-800 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> طباعة</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                            {historyViewTab === 'KASHF' && <KashfReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} />}
                            {historyViewTab === 'ANALYSIS' && <DiagnosticAnalysis record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} />}
                            {historyViewTab === 'SKILLS' && <LearningOutcomesReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} />}
                        </div>
                    </div>
                )
            )}

            {mainTab === 'COMPARE' && (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in overflow-hidden">
                    <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col md:flex-row gap-10 items-end print:hidden">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-indigo-400 flex items-center gap-2"><Circle size={8} fill="currentColor"/> الاختبار القبلي (الأساس)</label>
                            <select className="w-full p-3 border-2 border-indigo-50 rounded-2xl font-black bg-gray-50 outline-none" value={compareIdA} onChange={e=>setCompareIdA(e.target.value)}>
                                <option value="">-- اختر السجل الأول --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle}</option>)}
                            </select>
                        </div>
                        <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl hidden md:block"><ArrowRightLeft size={24}/></div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-purple-400 flex items-center gap-2"><Circle size={8} fill="currentColor"/> الاختبار البعدي (المستهدف)</label>
                            <select className="w-full p-3 border-2 border-purple-50 rounded-2xl font-black bg-gray-50 outline-none" value={compareIdB} onChange={e=>setCompareIdB(e.target.value)}>
                                <option value="">-- اختر السجل الثاني --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle}</option>)}
                            </select>
                        </div>
                        <button onClick={()=>window.print()} className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform"><Printer size={18}/> طباعة التقرير</button>
                    </div>
                    {compareIdA && compareIdB ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                             <div className="bg-white p-1 rounded-xl border shadow-sm flex w-fit mx-auto mb-6 print:hidden">
                                <TabBtnView label="ملخص النمو" active={compareViewTab==='SUMMARY'} onClick={()=>setCompareViewTab('SUMMARY')}/>
                                <TabBtnView label="التفاصيل الفردية" active={compareViewTab==='DETAILS'} onClick={()=>setCompareViewTab('DETAILS')}/>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <ComparisonReport data={{
                                    dataA: getReportData(history.find(r=>r.id===compareIdA)!, ''),
                                    dataB: getReportData(history.find(r=>r.id===compareIdB)!, ''),
                                    studentComparison: students.map((s) => {
                                        const resA = history.find(r=>r.id===compareIdA)?.studentResponses[s.id];
                                        const resB = history.find(r=>r.id===compareIdB)?.studentResponses[s.id];
                                        if(!resA && !resB) return null;
                                        const pctA = resA ? (resA.score / resA.total) * 100 : 0;
                                        const pctB = resB ? (resB.score / resB.total) * 100 : 0;
                                        return { name: s.name, scoreA: resA?.score || 0, scoreB: resB?.score || 0, growth: pctB - pctA };
                                    }).filter(Boolean),
                                    overallGrowth: getReportData(history.find(r=>r.id===compareIdB)!, '').overallMasteryPct - getReportData(history.find(r=>r.id===compareIdA)!, '').overallMasteryPct,
                                    recA: history.find(r=>r.id===compareIdA),
                                    recB: history.find(r=>r.id===compareIdB)
                                }} header={headerConfig} viewMode={compareViewTab} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-20"><GitCompare size={150}/><p className="text-2xl font-black mt-4">اختر اختبارين للمقارنة</p></div>
                    )}
                </div>
            )}
            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: portrait; margin: 1cm; } body { background: white !important; } .print\\:hidden { display: none !important; } .break-after { page-break-after: always; } } `}</style>
        </div>
    );
};

export default FormsAnalyzer;
