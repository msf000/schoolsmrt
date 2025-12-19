
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig, getStudents } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, Upload, Target, Save, ArrowLeft, Trash2, 
    BarChart2, Sparkles, Printer, GitCompare, PlusCircle, History, 
    ArrowRightLeft, ArrowRight, Bookmark, FileText, X, CheckCircle
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { formatDualDate } from '../services/dateService';

interface Props {
    students: Student[];
    currentUserId: string;
}

const ReportHeader = ({ config, title }: { config: ReportHeaderConfig, title: string }) => (
    <div className="hidden print:block mb-8 border-b-2 border-black pb-6 text-right">
        <div className="flex justify-between items-center mb-6">
            <div className="text-[11px] font-bold space-y-1">
                <p>المملكة العربية السعودية</p>
                <p>وزارة التعليم</p>
                <p>مدرسة {config.schoolName || '...........'}</p>
            </div>
            <div className="text-center">
                <img src={config.logoBase64 || "https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg"} className="h-16 mx-auto mb-2" alt="moe"/>
                <h2 className="text-xl font-black">{title}</h2>
            </div>
            <div className="text-left text-[10px] font-bold space-y-1">
                <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                <p>العام الدراسي: {config.academicYear || '1446-1447هـ'}</p>
            </div>
        </div>
    </div>
);

const KashfReport = ({ record, data, header }: any) => (
    <div className="bg-white p-8 border-2 border-black shadow-sm rounded-xl animate-fade-in print:border-none print:p-0">
        <ReportHeader config={header} title={`كشف رصد مهارات: ${record.examTitle}`} />
        <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black text-[11px] text-center">
                <thead className="bg-[#00334d] text-white font-black">
                    <tr className="h-10">
                        <th className="border border-black w-8">م</th>
                        <th className="border border-black text-right pr-4 w-48">اسم الطالب</th>
                        <th className="border border-black w-14">الدرجة</th>
                        {record.questions.map((q: any, i: number) => (
                            <th key={i} className="border border-black vertical-text h-24">{i + 1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.studentsList.map((s: any, idx: number) => (
                        <tr key={s.sid} className="h-9 border-b border-black hover:bg-gray-50">
                            <td className="border border-black">{idx + 1}</td>
                            <td className="border border-black text-right pr-3 font-bold">{s.name}</td>
                            <td className="border border-black font-black text-blue-800">{s.score}</td>
                            {record.questions.map((q: any) => (
                                <td key={q.id} className={`border border-black font-bold ${s.answers[q.id] === '✘' ? 'text-red-600 bg-red-50' : 'text-green-600'}`}>
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
        <div className="bg-white p-8 border shadow-sm rounded-xl print:p-0">
            <ReportHeader config={header} title="التحليل التشخيصي لنواتج التعلم" />
            <div className="h-[400px] w-full mb-10">
                <ResponsiveContainer>
                    <ReBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <ReBar dataKey="mastery" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 10 }}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.mastery >= 75 ? '#10b981' : entry.mastery >= 50 ? '#f59e0b' : '#ef4444'} />
                            ))}
                        </ReBar>
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.skillStats.map((s: any, i: number) => (
                    <div key={i} className="p-4 border rounded-2xl flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">س{i+1}: {s.name}</p>
                            <p className="text-sm font-black">{Math.round(s.masteredPct)}% إتقان</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${s.masteredPct >= 75 ? 'bg-green-500' : s.masteredPct >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [mainTab, setMainTab] = useState<'NEW' | 'HISTORY' | 'COMPARE'>('HISTORY');
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
            return { id: q.id, name: q.learningOutcome, masteredPct: (mastered / studentsList.length) * 100 };
        });
        return { studentsList, skillStats };
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative overflow-hidden">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500'}`}><PlusCircle size={18}/> تحليل جديد</button>
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500'}`}><History size={18}/> سجل النتائج</button>
            </div>

            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10">
                        <Upload size={80} className="text-green-600 mb-4 opacity-20"/>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-16 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختر ملف الاستجابات (Excel)</label>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-6 overflow-hidden h-full">
                        <div className="flex justify-between items-center">
                            <h4 className="font-black text-gray-700">تخصيص نواتج التعلم (المهارات)</h4>
                            <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                                {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} استخراج ذكي (AI)
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {getQuestionHeaders(headers).map((h, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-2xl border p-4">
                                    <p className="text-[10px] font-black text-gray-400 mb-2 truncate">س{idx+1}: {h}</p>
                                    <input className="w-full p-2 border rounded-xl text-xs font-bold" placeholder="الناتج التعليمي..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t flex flex-col gap-4">
                            <input className="p-3 border-2 border-indigo-100 rounded-xl font-black text-indigo-700" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="عنوان الكشف (مثلاً: دوري 1)"/>
                            <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">حفظ وتحليل النتائج</button>
                        </div>
                    </div>
                )
            )}

            {mainTab === 'HISTORY' && (
                !selectedRecord ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:border-indigo-500 transition-all cursor-pointer relative group">
                                <button className="absolute top-4 left-4 text-red-100 group-hover:text-red-500" onClick={(e)=>{e.stopPropagation(); deleteFormsDetailedResult(record.id); }}><Trash2 size={18}/></button>
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><BarChart2 size={24}/></div>
                                <h3 className="font-black text-lg text-gray-800 mb-2">{record.examTitle}</h3>
                                <div className="flex gap-4 mt-2">
                                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{record.questions.length} مهارة</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">{formatDualDate(record.date)}</span>
                                </div>
                                <button className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black">فتح التقارير</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between print:hidden">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedRecord(null)} className="p-3 bg-gray-100 rounded-xl"><ArrowLeft/></button>
                                <div className="flex bg-gray-50 p-1 rounded-xl">
                                    <button onClick={()=>setHistoryViewTab('KASHF')} className={`px-4 py-2 rounded-lg text-xs font-black ${historyViewTab==='KASHF'?'bg-white shadow text-indigo-600':'text-gray-400'}`}>كشف الرصد</button>
                                    <button onClick={()=>setHistoryViewTab('ANALYSIS')} className={`px-4 py-2 rounded-lg text-xs font-black ${historyViewTab==='ANALYSIS'?'bg-white shadow text-indigo-600':'text-gray-400'}`}>التحليل البياني</button>
                                </div>
                            </div>
                            <button onClick={()=>window.print()} className="px-6 py-2 bg-gray-800 text-white rounded-xl font-black text-xs flex items-center gap-2"><Printer size={16}/> طباعة</button>
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
