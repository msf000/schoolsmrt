
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, Upload, ListFilter, Target, Save, ArrowLeft, Trash2, 
    BarChart2, Sparkles, Printer, Filter, GitCompare, Wand2, CheckCircle, 
    PlusCircle, History, LayoutGrid, ArrowRightLeft, UserCheck, BookOpen, ArrowRight
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    // التبويبات العلوية الرئيسية
    const [mainTab, setMainTab] = useState<'NEW' | 'HISTORY' | 'COMPARE'>('HISTORY');
    
    // حالات التبويبات الفرعية
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [historyViewTab, setHistoryViewTab] = useState<'KASHF' | 'ANALYSIS'>('KASHF');
    const [comparisonTab, setComparisonTab] = useState<'STUDENTS' | 'SKILLS'>('STUDENTS');

    // حالات المقارنة
    const [compareId1, setCompareId1] = useState('');
    const [compareId2, setCompareId2] = useState('');

    // حالات الاستيراد
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [reportClassFilter, setReportClassFilter] = useState('');
    const headerConfig = useMemo(() => getReportHeaderConfig(currentUserId), [currentUserId]);

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving, mainTab]);

    // --- منطق الاستيراد ---
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            const itemAnalysis = headers.filter(h => h.includes('النقاط -')).map(h => h.replace(/^(النقاط - )/, '').trim());
            const prompt = `حلل الأسئلة التالية واستنتج المهارة التعليمية لكل سؤال باختصار (3-5 كلمات). JSON: {"skills": ["مهارة 1", "مهارة 2", ...]}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt + "\n" + itemAnalysis.join('\n'),
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.skills) {
                const newMapping: Record<string, string> = {};
                headers.filter(h => h.includes('النقاط -')).forEach((h, i) => { newMapping[h] = result.skills[i] || h; });
                setOutcomesMapping(newMapping);
            }
        } catch (e) { alert('فشل استخراج المهارات.'); } finally { setIsAiProcessing(false); }
    };

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('بيانات ناقصة.');
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
            const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم'));
            const questionCols = headers.filter(h => h.includes('النقاط -'));

            fileData.forEach((row) => {
                const rowEmail = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';
                const rowName = nameCol ? String(row[nameCol] || '').trim() : '';
                const matchedStudent = students.find(s => (s.email && s.email.toLowerCase() === rowEmail) || (s.name === rowName || s.name.includes(rowName)));
                
                if (matchedStudent) {
                    const answers: Record<string, string> = {};
                    questionCols.forEach(q => { answers[q] = Number(row[q]) > 0 ? '✔' : '✘'; });
                    studentResponses[matchedStudent.id] = { score: Number(row['إجمالي النقاط'] || 0), total: questionCols.length, answers };
                }
            });

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`,
                examTitle,
                className: students.find(s => Object.keys(studentResponses).includes(s.id))?.className || 'عام',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions: questionCols.map(q => ({
                    id: q, text: q, learningOutcome: outcomesMapping[q] || q,
                    successRate: 0, difficulty: 'EASY', commonErrors: []
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ بنجاح.'); setFileData([]); setMainTab('HISTORY');
        } catch (e) { alert('خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    // --- منطق معالجة البيانات للعرض ---
    const getReportData = (record: FormsDetailedResult, classFilter: string) => {
        const targetClass = classFilter || record.className;
        const allInClass = students.filter(s => s.className === targetClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        
        let totalPossibleSkills = 0;
        let totalMasteredSkills = 0;

        const studentsList = allInClass.map(s => {
            const res = record.studentResponses[s.id];
            const pct = res ? (res.score / record.questions.length) * 100 : 0;
            
            let color = '#ef4444';
            if (pct >= 90) color = '#10b981';
            else if (pct >= 75) color = '#3b82f6';
            else if (pct >= 50) color = '#f59e0b';

            if (res) {
                totalPossibleSkills += record.questions.length;
                totalMasteredSkills += res.score;
            }

            return { 
                sid: s.id, name: s.name, score: res?.score || 0, pct, color, isAbsent: !res,
                answers: res?.answers || {} 
            };
        });

        const skillStats = record.questions.map(q => {
            let mastered = 0;
            let attended = 0;
            studentsList.forEach(s => { if (!s.isAbsent) { attended++; if (s.answers[q.id] === '✔') mastered++; } });
            return { id: q.id, name: q.learningOutcome, masteredPct: attended > 0 ? Math.round((mastered / attended) * 100) : 0 };
        });

        return { studentsList, skillStats, totalPossibleSkills, totalMasteredSkills, totalStudents: allInClass.length };
    };

    const activeClassesForRecord = (record: FormsDetailedResult) => {
        const classes = new Set<string>();
        Object.keys(record.studentResponses).forEach(sid => {
            const s = students.find(x => x.id === sid);
            if (s?.className) classes.add(s.className);
        });
        return Array.from(classes).sort();
    };

    // --- مكونات الواجهة ---

    const MainTabs = () => (
        <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
            <button onClick={() => {setMainTab('NEW'); setSelectedRecord(null);}} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><PlusCircle size={18}/> تحليل جديد</button>
            <button onClick={() => {setMainTab('HISTORY'); setSelectedRecord(null);}} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><History size={18}/> سجل النتائج</button>
            <button onClick={() => {setMainTab('COMPARE'); setSelectedRecord(null);}} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'COMPARE' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><GitCompare size={18}/> مقارنة اختبارين</button>
        </div>
    );

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <MainTabs />

            {/* --- التبويب 1: استيراد جديد --- */}
            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={64} className="text-green-600 mb-4 opacity-20"/>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">تحليل استجابات Forms جديدة</h3>
                        <p className="text-sm text-gray-400 mb-8 max-w-xs">ارفع ملف Excel المصدر من Microsoft Forms وسنقوم بالباقي.</p>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all active:scale-95">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row gap-8 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListFilter className="text-orange-500"/> ربط الأسئلة بنواتج التعلم</h3>
                                    <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-purple-700">
                                        {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} استخراج المهارات ذكياً ✨
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {headers.filter(h => h.includes('النقاط -')).map((h, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4">
                                            <p className="text-xs font-bold text-gray-500 mb-2">س{idx+1}: {h.replace(/^(النقاط - )/, '')}</p>
                                            <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                <Target size={14} className="text-indigo-500"/><input className="flex-1 text-sm outline-none font-bold text-indigo-900" placeholder="المهارة المستهدفة..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full xl:w-96 flex flex-col border-r pr-8">
                                <h3 className="font-bold text-gray-800 mb-6">بيانات الحفظ</h3>
                                <div className="space-y-6 flex-1">
                                    <div><label className="text-xs font-bold text-gray-400 mb-1 block">عنوان الكشف</label><input className="w-full p-3 border rounded-xl font-bold text-indigo-600" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/></div>
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-700 font-bold leading-relaxed">سيتم مطابقة الطلاب تلقائياً مع السجلات الحالية. الطلاب غير المسجلين لن يظهروا في كشوفات الرصد الورقية.</div>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 mt-6">{isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ وتحليل النتائج</button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* --- التبويب 2: سجل النتائج --- */}
            {mainTab === 'HISTORY' && (
                !selectedRecord ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {history.map(record => (
                            <div key={record.id} onClick={() => {setSelectedRecord(record); setReportClassFilter('');}} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group border-t-8 border-t-indigo-600">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart2 size={24}/></div>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                                </div>
                                <h3 className="font-black text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-400 font-bold">{record.className} • {Object.keys(record.studentResponses).length} طالب مرصود</p>
                                <div className="mt-4 flex gap-2"><div className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2">فتح التقارير <ArrowRight size={12}/></div></div>
                            </div>
                        ))}
                        {history.length === 0 && <div className="col-span-full py-20 text-center text-gray-400">لا توجد اختبارات مؤرشفة حالياً.</div>}
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        {/* أدوات عرض التقرير */}
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={()=>setHistoryViewTab('KASHF')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${historyViewTab==='KASHF' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>كشف الرصد</button>
                                    <button onClick={()=>setHistoryViewTab('ANALYSIS')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${historyViewTab==='ANALYSIS' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>تحليل النتائج</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border">
                                    <Filter size={16} className="text-indigo-600"/><span className="text-xs font-bold text-gray-400">الفصل:</span>
                                    <select className="bg-transparent text-xs font-black text-indigo-700 outline-none" value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                                        <option value="">تلقائي</option>
                                        {activeClassesForRecord(selectedRecord).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button onClick={()=>window.print()} className="bg-gray-800 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> طباعة</button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {historyViewTab === 'KASHF' ? <KashfReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} /> : <DiagnosticAnalysis record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                        </div>
                    </div>
                )
            )}

            {/* --- التبويب 3: مقارنة اختبارين --- */}
            {mainTab === 'COMPARE' && (
                <div className="flex-1 overflow-hidden flex flex-col gap-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center gap-6 print:hidden">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-tighter">1. الاختبار القبلي (الأول)</label>
                            <select className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black text-sm text-indigo-600 outline-none focus:border-indigo-500" value={compareId1} onChange={e=>setCompareId1(e.target.value)}>
                                <option value="">-- اختر اختباراً --</option>
                                {history.map(h => <option key={h.id} value={h.id}>{h.examTitle}</option>)}
                            </select>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 animate-pulse"><ArrowRightLeft size={24}/></div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-tighter">2. الاختبار البعدي (الثاني)</label>
                            <select className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black text-sm text-green-600 outline-none focus:border-green-500" value={compareId2} onChange={e=>setCompareId2(e.target.value)}>
                                <option value="">-- اختر اختباراً --</option>
                                {history.map(h => <option key={h.id} value={h.id}>{h.examTitle}</option>)}
                            </select>
                        </div>
                    </div>

                    {compareId1 && compareId2 ? (
                        <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm print:hidden">
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={()=>setComparisonTab('STUDENTS')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${comparisonTab==='STUDENTS' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>مقارنة الطلاب</button>
                                    <button onClick={()=>setComparisonTab('SKILLS')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${comparisonTab==='SKILLS' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>مقارنة المهارات</button>
                                </div>
                                <button onClick={()=>window.print()} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> طباعة تقرير المقارنة</button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <FullComparisonView 
                                    rec1={history.find(h=>h.id===compareId1)!} 
                                    rec2={history.find(h=>h.id===compareId2)!} 
                                    students={students}
                                    tab={comparisonTab}
                                    header={headerConfig}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-30"><GitCompare size={100} className="mb-4"/><p className="text-2xl font-black">اختر اختبارين من القائمة للمقارنة بينهما</p></div>
                    )}
                </div>
            )}

            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: landscape; margin: 0.5cm; } body { background: white !important; } .print\\:hidden { display: none !important; } } `}</style>
        </div>
    );
};

// --- المكونات الفرعية للتقارير ---

const KashfReport = ({ record, data, header, classFilter }: any) => (
    <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
        <div className="min-w-[1200px] border-2 border-black">
            <div className="bg-teal-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                <div className="text-right text-[11px] font-bold space-y-1"><p>منطقة {header?.educationAdmin}</p><p>مدرسة {header?.schoolName}</p></div>
                <div className="text-center"><h2 className="text-xl font-black mb-1">كشف رصد درجات الاختبارات المدرسية - {record.examTitle}</h2><p className="text-xs opacity-80 font-bold">رصد مهارات المتعلمين / مادة: علوم الأرض والفضاء</p></div>
                <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
            </div>
            <div className="bg-teal-50 border-b-2 border-black grid grid-cols-4 text-xs font-black p-3 text-teal-900 text-center">
                <div>العام: {header?.academicYear}</div><div>الفصل: {header?.term}</div><div>الصف: {record.className}</div><div>الفصل: {classFilter || 'الكل'}</div>
            </div>
            <table className="w-full border-collapse text-[11px] text-center table-fixed">
                <thead className="bg-orange-100 font-black">
                    <tr><th rowSpan={2} className="border-2 border-black w-10">م</th><th rowSpan={2} className="border-2 border-black w-60 text-right pr-4">اسم الطالب</th><th colSpan={record.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th><th rowSpan={2} className="border-2 border-black w-20 bg-white">نسبة الإتقان</th></tr>
                    <tr className="bg-orange-50 h-40">{record.questions.map((q: any, i: number) => (<th key={i} className="border-2 border-black w-10 p-0 relative"><div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">{q.learningOutcome}</div></th>))}</tr>
                </thead>
                <tbody className="font-bold">
                    {data.studentsList.map((s: any, idx: number) => (
                        <tr key={s.sid} className={`h-9 hover:bg-gray-50 border-b border-black ${s.isAbsent ? 'bg-gray-100 opacity-60' : ''}`}>
                            <td className="border-2 border-black bg-gray-50">{idx + 1}</td><td className="border-2 border-black text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                            {record.questions.map((q: any) => (<td key={q.id} className={`border-2 border-black font-black text-sm ${s.isAbsent ? 'text-gray-300' : (s.answers[q.id] === '✔' ? 'text-green-600' : 'text-red-500')}`}>{s.isAbsent ? '-' : (s.answers[q.id] || '✘')}</td>))}
                            <td className={`border-2 border-black font-black ${s.isAbsent ? 'text-gray-400' : (s.pct < 60 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50')}`}>{s.isAbsent ? 'غائب' : `${s.pct}%`}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {header?.teacherName}</div><div>مدير المدرسة / أ. {header?.schoolManager}</div></div>
        </div>
    </div>
);

const DiagnosticAnalysis = ({ record, data, header, classFilter }: any) => (
    <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
        <div className="border-2 border-black">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center border-b-2 border-black">
                <div className="text-right text-[11px] font-bold space-y-1"><p>منطقة {header?.educationAdmin}</p><p>مدرسة {header?.schoolName}</p></div>
                <div className="text-center"><h2 className="text-xl font-black mb-1 uppercase tracking-tighter">تحليل نتائج المتعلمين - {record.examTitle}</h2><p className="text-xs font-bold opacity-80">تحليل المهارات ونسب التحصيل</p></div>
                <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
            </div>
            <div className="bg-blue-50 border-b-2 border-black grid grid-cols-5 text-[10px] font-black p-3 text-[#003366] text-center uppercase">
                <div className="border-l border-black/20">المادة: علوم الأرض</div><div className="border-l border-black/20">الصف: {record.className}</div><div className="border-l border-black/20">الفصل: {classFilter || 'الكل'}</div><div className="border-l border-black/20">الفصل: {header?.term}</div><div>العام: {header?.academicYear}</div>
            </div>
            <div className="p-4 space-y-8 bg-white">
                <div className="border border-black/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#003366] text-white p-2 text-center text-xs font-black">الرسم البياني للتحصيل الدراسي حسب المتعلمين</div>
                    <div className="h-64 p-4"><ResponsiveContainer width="100%" height="100%"><ReBarChart data={data.studentsList} layout="horizontal"><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" hide/><YAxis domain={[0, 100]} unit="%"/><Tooltip/><ReBar dataKey="pct" barSize={10} radius={[2, 2, 0, 0]}>{data.studentsList.map((e:any, i:number) => (<Cell key={i} fill={e.color}/>))}</ReBar></ReBarChart></ResponsiveContainer></div>
                </div>
                <div className="border border-black/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#003366] text-white p-2 text-center text-xs font-black">الرسم البياني للتحصيل الدراسي وفق المهارات</div>
                    <div className="h-64 p-4"><ResponsiveContainer width="100%" height="100%"><ReBarChart data={data.skillStats} margin={{top:20}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" hide/><YAxis domain={[0, 100]} unit="%"/><Tooltip/><ReBar dataKey="masteredPct" barSize={25} fill="#3b82f6" radius={[4, 4, 0, 0]}/></ReBarChart></ResponsiveContainer></div>
                </div>
            </div>
            <div className="grid grid-cols-4 border-t-2 border-black text-center text-[10px] font-black uppercase">
                <div className="border-l-2 border-black p-3 bg-blue-50/50">عدد المتعلمين <div className="text-xl mt-1">{data.totalStudents}</div></div>
                <div className="border-l-2 border-black p-3 bg-blue-50/50">مجموع المهارات <div className="text-xl mt-1">{data.totalPossibleSkills}</div></div>
                <div className="border-l-2 border-black p-3 bg-green-50">المهارات المتقنة <div className="text-xl text-green-700 mt-1">{data.totalMasteredSkills}</div></div>
                <div className="p-3 bg-red-50">المهارات غير المتقنة <div className="text-xl text-red-600 mt-1">{data.totalPossibleSkills - data.totalMasteredSkills}</div></div>
            </div>
            <div className="bg-[#003366] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {header?.teacherName}</div><div>مدير المدرسة / أ. {header?.schoolManager}</div></div>
        </div>
    </div>
);

const FullComparisonView = ({ rec1, rec2, students, tab, header }: any) => {
    const studentList = students.filter((s:any) => s.className === rec1.className || s.className === rec2.className).sort((a:any, b:any) => a.name.localeCompare(b.name, 'ar'));

    const getLvl = (pct: number, abs: boolean) => {
        if (abs) return { l: 'غائب', c: 'text-gray-400' };
        if (pct >= 90) return { l: 'ممتاز', c: 'text-green-600' };
        if (pct >= 75) return { l: 'جيد جداً', c: 'text-blue-500' };
        if (pct >= 50) return { l: 'مقبول', c: 'text-orange-500' };
        return { l: 'ضعيف', c: 'text-red-500' };
    };

    if (tab === 'STUDENTS') {
        return (
            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl border-2 border-[#003366] print:shadow-none print:p-0">
                <div className="bg-[#003366] text-white p-3 text-center text-sm font-black uppercase mb-4">كشف مقارنة درجات الطلاب - {rec1.examTitle} / {rec2.examTitle}</div>
                <table className="w-full border-collapse text-[10px] text-center table-fixed border border-[#003366]">
                    <thead className="bg-gray-100 font-black">
                        <tr>
                            <th rowSpan={2} className="border border-[#003366] w-8">م</th><th rowSpan={2} className="border border-[#003366] w-52 text-right pr-4">اسم الطالب</th>
                            <th colSpan={2} className="border border-[#003366] bg-gray-200">الاختبار الأول</th><th colSpan={2} className="border border-[#003366] bg-blue-100">الاختبار الثاني</th>
                            <th rowSpan={2} className="border border-[#003366] w-12 bg-white">التغير</th><th rowSpan={2} className="border border-[#003366] w-20 bg-white">نسبة التحسن</th>
                        </tr>
                        <tr className="bg-gray-50"><th className="border border-[#003366]">الدرجة</th><th className="border border-[#003366]">التقدير</th><th className="border border-[#003366]">الدرجة</th><th className="border border-[#003366]">التقدير</th></tr>
                    </thead>
                    <tbody className="font-bold">
                        {studentList.map((s:any, idx:number) => {
                            const r1 = rec1.studentResponses[s.id];
                            const r2 = rec2.studentResponses[s.id];
                            const p1 = r1 ? (r1.score/rec1.questions.length)*100 : 0;
                            const p2 = r2 ? (r2.score/rec2.questions.length)*100 : 0;
                            const diff = r2 && r1 ? r2.score - r1.score : '-';
                            const imp = r1 && r2 && r1.score > 0 ? Math.round(((r2.score - r1.score)/r1.score)*100) : (r2 ? 100 : 0);
                            return (
                                <tr key={s.id} className={`h-9 hover:bg-gray-50 border-b border-[#003366] ${!r2 ? 'opacity-50' : ''}`}>
                                    <td className="border border-[#003366] bg-gray-50">{idx+1}</td><td className="border border-[#003366] text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                                    <td className="border border-[#003366] font-mono">{r1 ? r1.score : '-'}</td><td className={`border border-[#003366] font-black ${getLvl(p1, !r1).c}`}>{getLvl(p1, !r1).l}</td>
                                    <td className="border border-[#003366] font-mono font-bold text-blue-700 bg-blue-50/30">{r2 ? r2.score : '-'}</td><td className={`border border-[#003366] font-black ${getLvl(p2, !r2).c} bg-blue-50/30`}>{getLvl(p2, !r2).l}</td>
                                    <td className={`border border-[#003366] font-black ${typeof diff === 'number' && diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>{diff}</td>
                                    <td className={`border border-[#003366] font-black ${typeof imp === 'number' && imp >= 0 ? 'text-green-600' : 'text-red-500'}`}>{imp}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl border-2 border-black print:shadow-none print:p-0">
            <div className="bg-teal-900 text-white p-3 text-center text-sm font-black uppercase mb-4">مقارنة نسب إتقان نواتج التعلم - {rec1.examTitle} / {rec2.examTitle}</div>
            <table className="w-full border-collapse text-[10px] text-center table-fixed border-2 border-black">
                <thead className="bg-gray-100 font-black">
                    <tr><th className="border-2 border-black w-8">م</th><th className="border-2 border-black w-72 text-right pr-4">المهارة المستهدفة</th><th className="border-2 border-black bg-blue-50">نسبة الإتقان (قبلي)</th><th className="border-2 border-black bg-green-50">نسبة الإتقان (بعدي)</th><th className="border-2 border-black w-16">التغير</th><th className="border-2 border-black w-16">التحسن</th></tr>
                </thead>
                <tbody className="font-bold">
                    {rec2.questions.map((q: any, i: number) => {
                        const q1 = rec1.questions[i];
                        // احتساب النسب
                        let m1 = 0, c1 = 0;
                        Object.values(rec1.studentResponses).forEach((res:any) => { c1++; if(res.answers[q1?.text] === '✔') m1++; });
                        let m2 = 0, c2 = 0;
                        Object.values(rec2.studentResponses).forEach((res:any) => { c2++; if(res.answers[q.text] === '✔') m2++; });
                        const p1 = c1 > 0 ? Math.round((m1/c1)*100) : 0;
                        const p2 = c2 > 0 ? Math.round((m2/c2)*100) : 0;
                        const diff = p2 - p1;
                        const imp = p1 > 0 ? Math.round((diff/p1)*100) : (p2 > 0 ? 100 : 0);
                        return (
                            <tr key={i} className="h-10 hover:bg-gray-50 border-b border-black">
                                <td className="border-2 border-black bg-gray-50">{i + 1}</td><td className="border-2 border-black text-right pr-4 font-black truncate">{q.learningOutcome}</td>
                                <td className="border-2 border-black font-mono">{p1}%</td><td className="border-2 border-black font-mono text-green-700 bg-green-50/30">{p2}%</td>
                                <td className={`border-2 border-black font-black ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>{diff > 0 ? `+${diff}%` : `${diff}%`}</td>
                                <td className={`border-2 border-black font-black ${imp >= 0 ? 'text-green-600' : 'text-red-500'}`}>{imp > 0 ? `+${imp}%` : `${imp}%`}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default FormsAnalyzer;
