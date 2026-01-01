
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig, getStudents } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, Upload, Target, Save, ArrowLeft, Trash2, 
    BarChart2, Sparkles, Printer, GitCompare, PlusCircle, History, 
    ArrowRightLeft, ArrowRight, Bookmark, FileText, X, CheckCircle, ClipboardList
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { formatDualDate } from '../services/dateService';

interface Props {
    students: Student[];
    currentUserId: string;
}

const ReportHeader = ({ config, title }: { config: ReportHeaderConfig, title: string }) => (
    <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-6 text-right">
        <div className="flex justify-between items-center mb-6">
            <div className="text-[11px] font-bold space-y-1">
                <p>المملكة العربية السعودية</p>
                <p>وزارة التعليم</p>
                <p>مدرسة {config.schoolName || '...........'}</p>
            </div>
            <div className="text-center">
                <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mx-auto mb-2" alt="moe"/>
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            </div>
            <div className="text-left text-[10px] font-bold space-y-1">
                <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                <p>العام الدراسي: {config.academicYear || '1446-1447هـ'}</p>
            </div>
        </div>
    </div>
);

const KashfReport = ({ record, data, header }: any) => (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in print:border-none print:p-0">
        <ReportHeader config={header} title={`كشف رصد المهارات: ${record.examTitle}`} />
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse border border-slate-300 text-[11px] text-center">
                <thead className="bg-slate-50 text-slate-700 font-bold">
                    <tr>
                        <th className="border border-slate-300 p-2 w-8">#</th>
                        <th className="border border-slate-300 p-2 text-right pr-4 w-48">اسم الطالب</th>
                        <th className="border border-slate-300 p-2 w-14">الدرجة</th>
                        {record.questions.map((q: any, i: number) => (
                            <th key={i} className="border border-slate-300 p-2 vertical-text h-24 text-[9px]">{i + 1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.studentsList.map((s: any, idx: number) => (
                        <tr key={s.sid} className="h-9 border-b border-slate-200 hover:bg-slate-50">
                            <td className="border border-slate-300 text-slate-400">{idx + 1}</td>
                            <td className="border border-slate-300 text-right pr-3 font-medium text-slate-700">{s.name}</td>
                            <td className="border border-slate-300 font-bold text-blue-700">{s.score}</td>
                            {record.questions.map((q: any) => (
                                <td key={q.id} className={`border border-slate-300 font-bold ${s.answers[q.id] === '✘' ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {s.answers[q.id] || '-'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const DiagnosticAnalysis = ({ data, header }: any) => {
    const chartData = data.skillStats.map((s: any) => ({ name: s.name, mastery: s.masteredPct }));
    return (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm print:p-0">
            <ReportHeader config={header} title="التحليل التشخيصي لنواتج التعلم" />
            <div className="h-[350px] w-full mb-8">
                <ResponsiveContainer>
                    <ReBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} unit="%" fontSize={10} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <ReBar dataKey="mastery" radius={[4, 4, 0, 0]} barSize={40}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.mastery >= 75 ? '#10b981' : entry.mastery >= 50 ? '#f59e0b' : '#ef4444'} />
                            ))}
                        </ReBar>
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.skillStats.map((s: any, i: number) => (
                    <div key={i} className="p-4 border rounded-xl flex justify-between items-center bg-slate-50 border-slate-200 shadow-sm">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate">س{i+1}: {s.name}</p>
                            <p className="text-sm font-bold text-slate-700">{Math.round(s.masteredPct)}% إتقان</p>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ml-2 ${s.masteredPct >= 75 ? 'bg-emerald-500' : s.masteredPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [mainTab, setMainTab] = useState<'NEW' | 'HISTORY'>('HISTORY');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [historyViewTab, setHistoryViewTab] = useState<'KASHF' | 'ANALYSIS'>('KASHF');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const headerConfig = useMemo(() => getReportHeaderConfig(currentUserId), [currentUserId]);

    useEffect(() => {
        if (currentUserId) setHistory(getFormsDetailedResults(currentUserId));
    }, [currentUserId, isSaving, mainTab]);

    const getQuestionHeaders = (allHeaders: string[]) => {
        return allHeaders.filter(h => (h.includes('النقاط') || h.includes('Points')) && !h.includes('إجمالي') && !h.includes('Total'));
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
        } catch (error) { alert('فشل تحميل ملف Excel.'); } finally { setLoading(false); }
    };

    const handleAutoGenerateSkills = async () => {
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const itemAnalysis = getQuestionHeaders(headers).map(h => h.replace(/^(النقاط - )/, '').trim());
            const prompt = `أنت خبير تعليمي سعودي. حلل أسئلة Forms التالية واستنتج المهارة التعليمية لكل سؤال. أرجع JSON فقط بتنسيق: {"items": [{"skill": "اسم المهارة"}]}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt + "\n" + itemAnalysis.join('\n'),
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.items) {
                const newOutcomes: Record<string, string> = {};
                getQuestionHeaders(headers).forEach((h, i) => { newOutcomes[h] = result.items[i]?.skill || h; });
                setOutcomesMapping(newOutcomes);
            }
        } catch (e) { alert('فشل التحليل الذكي.'); } finally { setIsAiProcessing(false); }
    };

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('أدخل عنوان الكشف.');
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
                    studentResponses[matchedStudent.id] = { score: Number(row['إجمالي النقاط'] || row['Total Points'] || 0), total: questionCols.length, answers };
                }
            });

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`, examTitle,
                className: 'عام', date: new Date().toISOString(), teacherId: currentUserId,
                questions: questionCols.map(q => ({ id: q, text: q, learningOutcome: outcomesMapping[q] || q, successRate: 0, difficulty: 'EASY', commonErrors: [] })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            setFileData([]); setMainTab('HISTORY');
        } catch (e) { alert('حدث خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    const getReportData = (record: FormsDetailedResult) => {
        const studentsList = students.filter(s => !!record.studentResponses[s.id]).map(s => {
            const res = record.studentResponses[s.id];
            return { sid: s.id, name: s.name, score: res.score, answers: res.answers };
        });
        const skillStats = record.questions.map(q => {
            let mastered = 0;
            studentsList.forEach(s => { if (s.answers[q.id] === '✔') mastered++; });
            return { id: q.id, name: q.learningOutcome, masteredPct: studentsList.length > 0 ? (mastered / studentsList.length) * 100 : 0 };
        });
        return { studentsList, skillStats };
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in relative overflow-hidden font-tajawal">
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${mainTab === 'HISTORY' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}><History size={16}/> السجلات المحفوظة</button>
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${mainTab === 'NEW' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}><PlusCircle size={16}/> تحليل ملف جديد</button>
            </div>

            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white p-10">
                        <Upload size={64} className="text-slate-300 mb-4"/>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-blue-600 text-white px-10 py-3 rounded-lg font-bold text-sm shadow-md cursor-pointer hover:bg-blue-700 transition-all">اختر ملف الاستجابات (Excel)</label>
                        <p className="text-xs text-slate-400 mt-4">يدعم ملفات استجابات Microsoft Forms المباشرة</p>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 overflow-hidden h-full">
                        <div className="flex justify-between items-center shrink-0">
                            <h4 className="font-bold text-slate-800">توصيف نواتج التعلم المستهدفة</h4>
                            <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-blue-100 hover:bg-blue-100 transition-all">
                                {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} استنتاج بالذكاء الاصطناعي
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {getQuestionHeaders(headers).map((h, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                                    <p className="text-[10px] font-bold text-slate-400 mb-2 truncate" title={h}>س{idx+1}: {h}</p>
                                    <input className="w-full p-2 border border-slate-300 rounded-md text-xs font-medium outline-none focus:border-blue-500" placeholder="الناتج التعليمي المقابل..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t flex flex-col gap-4 shrink-0">
                            <input className="p-2.5 border border-slate-300 rounded-lg font-bold text-sm text-slate-700 outline-none focus:border-blue-500" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="اسم الكشف (مثلاً: دوري الفصل الأول)"/>
                            <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">حفظ وتحليل النتائج سحابياً</button>
                        </div>
                    </div>
                )
            )}

            {mainTab === 'HISTORY' && (
                !selectedRecord ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all cursor-pointer relative group">
                                <button className="absolute top-4 left-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')) deleteFormsDetailedResult(record.id); }}><Trash2 size={16}/></button>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit mb-4 border border-blue-100"><ClipboardList size={24}/></div>
                                <h3 className="font-bold text-base text-slate-800 mb-2">{record.examTitle}</h3>
                                <div className="flex gap-4 mt-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{formatDualDate(record.date)}</span>
                                    <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 border">{record.questions.length} ناتج تعلم</span>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-300 opacity-50 flex flex-col items-center">
                                <History size={48}/>
                                <p className="mt-4 font-bold">لا توجد تحليلات سابقة.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-fade-in">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between print:hidden shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ArrowRight/></button>
                                <div className="flex bg-slate-100 p-1 rounded-lg border">
                                    <button onClick={()=>setHistoryViewTab('KASHF')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${historyViewTab==='KASHF'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>كشف الرصد</button>
                                    <button onClick={()=>setHistoryViewTab('ANALYSIS')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${historyViewTab==='ANALYSIS'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>التحليل البياني</button>
                                </div>
                            </div>
                            <button onClick={()=>window.print()} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-black transition-all shadow-sm"><Printer size={16}/> طباعة التقرير</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {historyViewTab === 'KASHF' && <KashfReport record={selectedRecord} data={getReportData(selectedRecord)} header={headerConfig} />}
                            {historyViewTab === 'ANALYSIS' && <DiagnosticAnalysis data={getReportData(selectedRecord)} header={headerConfig} />}
                        </div>
                    </div>
                )
            )}
            <style>{`.vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }`}</style>
        </div>
    );
};

export default FormsAnalyzer;
