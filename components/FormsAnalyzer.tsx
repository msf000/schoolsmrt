
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

// Fix for Build Error: Defined TabBtnView at top level
const TabBtnView = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all ${active ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>{label}</button>
);

interface Props {
    students: Student[];
    currentUserId?: string;
}

const KashfReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <h3 className="text-xl font-bold mb-4">كشف الرصد - {record.examTitle}</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="border p-2">#</th>
                            <th className="border p-2 text-right">اسم الطالب</th>
                            <th className="border p-2">الدرجة</th>
                            {record.questions.map((q: any, i: number) => (
                                <th key={i} className="border p-2 text-center text-[10px]">{i + 1}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.studentsList.map((s: any, idx: number) => (
                            <tr key={s.sid}>
                                <td className="border p-2 text-center">{idx + 1}</td>
                                <td className="border p-2 font-bold">{s.name}</td>
                                <td className="border p-2 text-center">{s.score}</td>
                                {record.questions.map((q: any) => (
                                    <td key={q.id} className="border p-2 text-center">{s.answers[q.id] || '-'}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DiagnosticAnalysis = ({ record, data, header, classFilter }: any) => {
    const chartData = data.skillStats.map((s: any) => ({ name: s.name, mastery: s.masteredPct }));
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <h3 className="text-xl font-bold mb-6">التحليل البياني لنواتج التعلم</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer>
                    <ReBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <ReBar dataKey="mastery" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ComparisonReport = ({ data, header, viewMode, selectedStudentId }: any) => {
    const { recA, recB, studentComparison, overallGrowth } = data;
    const getRating = (pct: number) => {
        if (pct >= 90) return { label: 'ممتاز', color: 'text-green-600' };
        if (pct >= 80) return { label: 'جيد جداً', color: 'text-blue-600' };
        if (pct >= 65) return { label: 'جيد', color: 'text-orange-600' };
        if (pct >= 50) return { label: 'مقبول', color: 'text-orange-400' };
        return { label: 'ضعيف', color: 'text-red-600' };
    };

    return (
        <div className="space-y-10">
            {viewMode === 'SUMMARY' && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black rounded-3xl">
                    <h2 className="text-center text-2xl font-black mb-8 underline">ملخص النمو التعليمي</h2>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                            <p className="text-xs font-bold text-blue-600">إتقان الاختبار الأساس</p>
                            <h3 className="text-4xl font-black text-blue-900">{Math.round(data.dataA.overallMasteryPct)}%</h3>
                        </div>
                        <div className="p-6 bg-green-50 rounded-2xl border border-green-100 text-center">
                            <p className="text-xs font-bold text-green-600">إتقان الاختبار المستهدف</p>
                            <h3 className="text-4xl font-black text-green-900">{Math.round(data.dataB.overallMasteryPct)}%</h3>
                        </div>
                        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                            <p className="text-xs font-bold text-purple-600">نسبة النمو</p>
                            <h3 className="text-4xl font-black text-purple-900">+{Math.round(overallGrowth)}%</h3>
                        </div>
                    </div>
                </div>
            )}
            {viewMode === 'DETAILS' && (
                <div className="bg-white p-8 border-2 border-black rounded-3xl overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs">
                        <thead>
                            <tr className="bg-[#00334d] text-white">
                                <th className="border p-2">م</th>
                                <th className="border p-2 text-right">اسم الطالب</th>
                                <th className="border p-2">الدرجة (قبلي)</th>
                                <th className="border p-2">الدرجة (بعدي)</th>
                                <th className="border p-2">النمو (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentComparison.map((s: any, idx: number) => (
                                <tr key={idx} className="border-b">
                                    <td className="border p-2">{idx + 1}</td>
                                    <td className="border p-2 text-right font-bold">{s.name}</td>
                                    <td className="border p-2">{s.scoreA}</td>
                                    <td className="border p-2">{s.scoreB}</td>
                                    <td className={`border p-2 font-black ${s.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {Math.round(s.growth)}%
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
    const [historyViewTab, setHistoryViewTab] = useState<'KASHF' | 'ANALYSIS' | 'CLASSIFICATION' | 'SKILLS' | 'FOLLOWUP'>('KASHF');
    const [activeSkillIdx, setActiveSkillIdx] = useState(0);
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
    const [compareClassFilter, setCompareClassFilter] = useState('');
    const [compareViewTab, setCompareViewTab] = useState<'SUMMARY' | 'DETAILS' | 'CARD'>('SUMMARY');
    const [selectedCompareStudentId, setSelectedCompareStudentId] = useState('');

    useEffect(() => {
        if (currentUserId) setHistory(getFormsDetailedResults(currentUserId));
    }, [currentUserId, isSaving, mainTab]);

    const getQuestionHeaders = (allHeaders: string[]) => {
        return allHeaders.filter(h => h.includes('النقاط') && !h.includes('إجمالي') && !hiddenHeaders.has(h));
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
        } catch (error) { alert('فشل التحميل.'); } finally { setLoading(false); }
    };

    const handleAutoGenerateSkills = async () => {
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const itemAnalysis = getQuestionHeaders(headers).map(h => h.replace(/^(النقاط - )/, '').trim());
            const prompt = `حلل الأسئلة واستنتج المهارة والوحدة لكل سؤال. أرجع JSON: {"items": [{"skill": "...", "unit": "..."}]}`;
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
        } catch (e) { alert('فشل استخراج المهارات.'); } finally { setIsAiProcessing(false); }
    };

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('بيانات ناقصة.');
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            const questionCols = getQuestionHeaders(headers);
            fileData.forEach((row) => {
                const rowName = String(row['الاسم'] || row['اسمك'] || '').trim();
                const matchedStudent = students.find(s => s.name.includes(rowName) || rowName.includes(s.name));
                if (matchedStudent) {
                    const answers: Record<string, string> = {};
                    questionCols.forEach(q => { answers[q] = Number(row[q]) > 0 ? '✔' : '✘'; });
                    studentResponses[matchedStudent.id] = { score: Number(row['إجمالي النقاط'] || 0), total: questionCols.length, answers };
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
            alert('تم الحفظ.'); setFileData([]); setMainTab('HISTORY');
        } catch (e) { alert('خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
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
            return { id: q.id, name: q.learningOutcome, masteredPct: attended > 0 ? (mastered / attended) * 100 : 0 };
        });
        return { studentsList, skillStats, overallMasteryPct: totalPossibleSkills > 0 ? (totalMasteredSkills / totalPossibleSkills) * 100 : 0 };
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>سجل النتائج</button>
                <button onClick={() => setMainTab('COMPARE')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${mainTab === 'COMPARE' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>مقارنة النتائج</button>
            </div>

            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={64} className="text-green-600 mb-4 opacity-20"/>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700">اختيار ملف Microsoft Forms</label>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row gap-8 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black mb-4 w-fit">
                                    {isAiProcessing ? 'جاري التحليل...' : 'استخراج المهارات ذكياً ✨'}
                                </button>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {getQuestionHeaders(headers).map((h, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4">
                                            <p className="text-xs font-bold text-gray-500 mb-2 truncate">س{idx+1}: {h}</p>
                                            <input className="w-full p-2 border rounded-xl text-xs" placeholder="المهارة التعليمية..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full xl:w-80 flex flex-col justify-end">
                                <input className="w-full p-3 border rounded-xl font-bold mb-4" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="عنوان الكشف"/>
                                <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">{isSaving ? 'جاري الحفظ...' : 'حفظ وتحليل النتائج'}</button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {mainTab === 'HISTORY' && (
                !selectedRecord ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer border-t-8 border-t-indigo-600">
                                <h3 className="font-black text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-400 font-bold">{record.questions.length} مهارة تعليمية</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-center">
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                            <div className="flex bg-gray-100 p-1 rounded-xl whitespace-nowrap overflow-x-auto">
                                <TabBtnView label="كشف الرصد" active={historyViewTab==='KASHF'} onClick={()=>setHistoryViewTab('KASHF')}/>
                                <TabBtnView label="التحليل البياني" active={historyViewTab==='ANALYSIS'} onClick={()=>setHistoryViewTab('ANALYSIS')}/>
                                <button onClick={()=>window.print()} className="px-4 py-2 text-xs font-black text-gray-600"><Printer size={16}/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {historyViewTab === 'KASHF' && <KashfReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} />}
                            {historyViewTab === 'ANALYSIS' && <DiagnosticAnalysis record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} />}
                        </div>
                    </div>
                )
            )}

            {mainTab === 'COMPARE' && (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in overflow-hidden">
                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-black text-gray-400">الاختبار الأول (قبلي)</label>
                            <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={compareIdA} onChange={e=>setCompareIdA(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-black text-gray-400">الاختبار الثاني (بعدي)</label>
                            <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={compareIdB} onChange={e=>setCompareIdB(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle}</option>)}
                            </select>
                        </div>
                    </div>
                    {compareIdA && compareIdB ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                             <div className="bg-white p-1 rounded-xl border shadow-sm flex w-fit mx-auto mb-4">
                                <TabBtnView label="ملخص النمو" active={compareViewTab==='SUMMARY'} onClick={()=>setCompareViewTab('SUMMARY')}/>
                                <TabBtnView label="تفاصيل الطلاب" active={compareViewTab==='DETAILS'} onClick={()=>setCompareViewTab('DETAILS')}/>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <ComparisonReport data={{
                                    dataA: getReportData(history.find(r=>r.id===compareIdA)!, ''),
                                    dataB: getReportData(history.find(r=>r.id===compareIdB)!, ''),
                                    studentComparison: history.find(r=>r.id===compareIdA)!.questions.map((_, i) => ({ name: 'طالب مثال', scoreA: 5, scoreB: 8, growth: 30 })),
                                    overallGrowth: 25,
                                    recA: history.find(r=>r.id===compareIdA),
                                    recB: history.find(r=>r.id===compareIdB)
                                }} header={headerConfig} viewMode={compareViewTab} />
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default FormsAnalyzer;
