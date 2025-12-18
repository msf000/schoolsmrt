
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, 
    ArrowRight, 
    Upload, 
    ListFilter, Target, Save, ArrowLeft, Trash2, BarChart2, Sparkles, Printer, Filter, GitCompare, Wand2, CheckCircle, XCircle
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY'>('IMPORT');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [detailTab, setDetailTab] = useState<'ANALYSIS' | 'KASHF' | 'SKILLS_COMPARE' | 'STUDENTS_COMPARE'>('ANALYSIS');
    const [compareRecordId, setCompareRecordId] = useState<string>(''); 
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);
    const [reportClassFilter, setReportClassFilter] = useState('');

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

    const handleAutoGenerateSkills = async () => {
        setIsAiProcessing(true);
        try {
            // Fix: Use the correct constructor parameter and model name per @google/genai guidelines
            const apiKey = process.env.API_KEY;
            if (!apiKey) return;
            const ai = new GoogleGenAI({ apiKey });
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
            alert('تم الحفظ.'); setFileData([]); setViewMode('HISTORY');
        } catch (e) { alert('خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    // Fix: Extract unique classes from students in the selected record to fix activeClasses reference error
    const activeClasses = useMemo(() => {
        const classes = new Set<string>();
        if (selectedRecord) {
            Object.keys(selectedRecord.studentResponses).forEach(sid => {
                const s = students.find(x => x.id === sid);
                if (s?.className) classes.add(s.className);
            });
            if (selectedRecord.className && selectedRecord.className !== 'عام') {
                classes.add(selectedRecord.className);
            }
        }
        return Array.from(classes).sort();
    }, [selectedRecord, students]);

    // بيانات التقرير الحالي لجميع الطلاب
    const reportData = useMemo(() => {
        if (!selectedRecord) return null;
        const targetClass = reportClassFilter || selectedRecord.className;
        const allInClass = students.filter(s => s.className === targetClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        
        let totalPossibleSkills = 0;
        let totalMasteredSkills = 0;

        const studentsList = allInClass.map(s => {
            const res = selectedRecord.studentResponses[s.id];
            const pct = res ? (res.score / selectedRecord.questions.length) * 100 : 0;
            
            let level = 'تهيئة';
            let color = '#ef4444';
            if (pct >= 90) { level = 'تميز'; color = '#10b981'; }
            else if (pct >= 75) { level = 'تقدم'; color = '#3b82f6'; }
            else if (pct >= 50) { level = 'انطلاق'; color = '#f59e0b'; }

            if (res) {
                totalPossibleSkills += selectedRecord.questions.length;
                totalMasteredSkills += res.score;
            }

            return { 
                sid: s.id, name: s.name, score: res?.score || 0, pct, level, color, isAbsent: !res,
                answers: res?.answers || {} 
            };
        });

        const skillStats = selectedRecord.questions.map(q => {
            let mastered = 0;
            let attended = 0;
            studentsList.forEach(s => { if (!s.isAbsent) { attended++; if (s.answers[q.id] === '✔') mastered++; } });
            return { id: q.id, name: q.learningOutcome, masteredPct: attended > 0 ? Math.round((mastered / attended) * 100) : 0 };
        });

        return { 
            studentsList, skillStats, totalPossibleSkills, totalMasteredSkills, 
            masteredOverallPct: totalPossibleSkills > 0 ? Math.round((totalMasteredSkills / totalPossibleSkills) * 100) : 0,
            totalStudents: allInClass.length
        };
    }, [selectedRecord, reportClassFilter, students]);

    // مقارنة المهارات (التصميم الأزرق)
    const comparisonSkills = useMemo(() => {
        if (!selectedRecord || !compareRecordId || !reportData) return null;
        const prevRecord = history.find(h => h.id === compareRecordId);
        if (!prevRecord) return null;

        const currentSkills = reportData.skillStats;
        const targetClass = reportClassFilter || selectedRecord.className;
        const allInClass = students.filter(s => s.className === targetClass);

        const rows = selectedRecord.questions.map((q, idx) => {
            const cPct = currentSkills[idx]?.masteredPct || 0;
            
            // مطابقة المهارة في الاختبار السابق (بالترتيب أو بالاسم)
            let prevMastered = 0;
            let prevAttended = 0;
            allInClass.forEach(s => {
                const res = prevRecord.studentResponses[s.id];
                if (res) {
                    prevAttended++;
                    const prevAnswers = Object.values(res.answers);
                    if (prevAnswers[idx] === '✔') prevMastered++;
                }
            });
            const pPct = prevAttended > 0 ? Math.round((prevMastered / prevAttended) * 100) : 0;
            const diff = cPct - pPct;
            const imp = pPct > 0 ? Math.round((diff / pPct) * 100) : (cPct > 0 ? 100 : 0);

            return { skill: q.learningOutcome, prev: pPct, curr: cPct, diff, imp };
        });

        const getLevels = (rec: FormsDetailedResult) => {
            const lvls = { high: 0, med: 0, low: 0, vlow: 0 };
            allInClass.forEach(s => {
                const res = rec.studentResponses[s.id];
                if (res) {
                    const p = (res.score / rec.questions.length) * 100;
                    if (p >= 85) lvls.high++; else if (p >= 70) lvls.med++; else if (p >= 50) lvls.low++; else lvls.vlow++;
                }
            });
            return lvls;
        };

        return { rows, prevLevels: getLevels(prevRecord), currLevels: getLevels(selectedRecord) };
    }, [selectedRecord, compareRecordId, history, reportData, reportClassFilter]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 print:hidden">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><FileSpreadsheet className="text-green-600"/> محلل نواتج التعلم المتطور</h2>
                {!selectedRecord && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                        <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>سجل الاختبارات</button>
                    </div>
                )}
            </div>

            {selectedRecord && reportData ? (
                <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-4 print:hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => {setSelectedRecord(null); setReportClassFilter('');}} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft/></button>
                                <div><h3 className="font-bold text-gray-800">{selectedRecord.examTitle}</h3><p className="text-xs text-gray-500">{selectedRecord.className}</p></div>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
                                <TabBtn label="كشف رصد المهارات" active={detailTab==='KASHF'} onClick={()=>setDetailTab('KASHF')} />
                                <TabBtn label="تحليل نتائج المتعلمين" active={detailTab==='ANALYSIS'} onClick={()=>setDetailTab('ANALYSIS')} />
                                <TabBtn label="مقارنة نواتج التعلم" active={detailTab==='SKILLS_COMPARE'} onClick={()=>setDetailTab('SKILLS_COMPARE')} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border">
                            <Filter size={16} className="text-indigo-600 ml-1"/><span className="text-xs font-bold text-gray-500">الفصل:</span>
                            <select className="bg-transparent text-sm font-black text-indigo-700 outline-none" value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                                <option value="">جميع فصول الملف</option>
                                {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'ANALYSIS' ? (
                            /* --- تحليل نتائج المتعلمين (التشخيصي) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                                <div className="border-2 border-black">
                                    <div className="bg-teal-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                                        <div className="text-right text-[11px] font-bold space-y-1"><p>منطقة {headerConfig?.educationAdmin}</p><p>مدرسة {headerConfig?.schoolName}</p></div>
                                        <div className="text-center"><h2 className="text-xl font-black mb-1 uppercase tracking-tighter">تحليل نتائج المتعلمين وفق اختبار تشخيصي</h2><p className="text-xs font-bold opacity-80">{selectedRecord.examTitle}</p></div>
                                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                                    </div>
                                    <div className="bg-teal-50 border-b-2 border-black grid grid-cols-5 text-[10px] font-black p-3 text-teal-900 text-center uppercase">
                                        <div className="border-l border-black/20">المادة: علوم الأرض والفضاء</div>
                                        <div className="border-l border-black/20">الصف: {selectedRecord.className}</div>
                                        <div className="border-l border-black/20">الفصل: {reportClassFilter || 'الكل'}</div>
                                        <div className="border-l border-black/20">الفصل الدراسي: {headerConfig?.term}</div>
                                        <div>العام الدراسي: {headerConfig?.academicYear}</div>
                                    </div>
                                    <div className="p-4 space-y-8 bg-white">
                                        <div className="border border-black/10 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-[#003366] text-white p-2 text-center text-xs font-black">الرسم البياني للتحصيل الدراسي حسب المتعلمين</div>
                                            <div className="h-64 p-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ReBarChart data={reportData.studentsList} layout="horizontal" margin={{top:20}}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" hide />
                                                        <YAxis domain={[0, 100]} tick={{fontSize:8}} unit="%" />
                                                        <Tooltip />
                                                        <ReBar dataKey="pct" barSize={10} radius={[2, 2, 0, 0]}>
                                                            {reportData.studentsList.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </ReBar>
                                                    </ReBarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 border-t-2 border-black text-center text-[10px] font-black uppercase">
                                        <div className="border-l-2 border-black p-3 bg-blue-50/50">عدد المتعلمين الكلي <div className="text-xl mt-1">{reportData.totalStudents}</div></div>
                                        <div className="border-l-2 border-black p-3 bg-blue-50/50">مجموع المهارات <div className="text-xl mt-1">{reportData.totalPossibleSkills}</div></div>
                                        <div className="border-l-2 border-black p-3 bg-green-50">المهارات المتقنة <div className="text-xl text-green-700 mt-1">{reportData.totalMasteredSkills}</div></div>
                                        <div className="p-3 bg-red-50">المهارات غير المتقنة <div className="text-xl text-red-600 mt-1">{reportData.totalPossibleSkills - reportData.totalMasteredSkills}</div></div>
                                    </div>
                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {headerConfig?.teacherName}</div><div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div></div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-6 w-full py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة تقرير تحليل النتائج</button>
                            </div>
                        ) : detailTab === 'KASHF' ? (
                            /* --- كشف رصد المهارات الأخضر (كما في الصورة) --- */
                            <div className="w-full bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                                <div className="min-w-[1200px] border-2 border-black">
                                    <div className="bg-teal-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                                        <div className="text-right text-[11px] font-bold space-y-1"><p>منطقة {headerConfig?.educationAdmin}</p><p>مدرسة {headerConfig?.schoolName}</p></div>
                                        <div className="text-center"><h2 className="text-xl font-black mb-1 uppercase tracking-tighter">كشف رصد درجات الاختبارات المدرسية</h2><p className="text-xs opacity-80 font-bold">رصد مهارات المتعلمين / مادة: علوم الأرض والفضاء</p></div>
                                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                                    </div>
                                    <div className="bg-teal-50 border-b-2 border-black grid grid-cols-4 text-xs font-black p-3 text-teal-900 text-center">
                                        <div>العام: {headerConfig?.academicYear}</div><div>الفصل: {headerConfig?.term}</div><div>الصف: {selectedRecord.className}</div><div>الفصل: {reportClassFilter || 'الكل'}</div>
                                    </div>
                                    <table className="w-full border-collapse text-[11px] text-center table-fixed">
                                        <thead className="bg-orange-100 font-black">
                                            <tr><th rowSpan={2} className="border-2 border-black w-10">م</th><th rowSpan={2} className="border-2 border-black w-60 text-right pr-4">اسم الطالب</th><th colSpan={selectedRecord.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th><th rowSpan={2} className="border-2 border-black w-20 bg-white">نسبة الإتقان</th></tr>
                                            <tr className="bg-orange-50 h-40">{selectedRecord.questions.map((q, i) => (<th key={i} className="border-2 border-black w-10 p-0 relative"><div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">{q.learningOutcome}</div></th>))}</tr>
                                        </thead>
                                        <tbody className="font-bold">
                                            {reportData.studentsList.map((s, idx) => (
                                                <tr key={s.sid} className={`h-9 hover:bg-gray-50 border-b border-black ${s.isAbsent ? 'bg-gray-100 opacity-60' : ''}`}>
                                                    <td className="border-2 border-black bg-gray-50">{idx + 1}</td><td className="border-2 border-black text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                                                    {selectedRecord.questions.map(q => (
                                                        <td key={q.id} className={`border-2 border-black font-black text-sm ${s.isAbsent ? 'text-gray-300' : (s.answers[q.id] === '✔' ? 'text-green-600' : 'text-red-500')}`}>
                                                            {s.isAbsent ? '-' : (s.answers[q.id] || '✘')}
                                                        </td>
                                                    ))}
                                                    <td className={`border-2 border-black font-black ${s.isAbsent ? 'text-gray-400' : (s.pct < 60 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50')}`}>{s.isAbsent ? 'غائب' : `${s.pct}%`}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {headerConfig?.teacherName}</div><div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div></div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-6 w-full py-4 bg-teal-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة كشف المهارات</button>
                            </div>
                        ) : detailTab === 'SKILLS_COMPARE' ? (
                            /* --- مقارنة نواتج التعلم (التصميم الأزرق كما في الصورة) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                                <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                                    <div className="text-right text-[10px] font-bold space-y-1"><p>منطقة {headerConfig?.educationAdmin}</p><div className="mt-2 bg-[#003366] text-white px-8 py-1 rounded-full text-center font-black">مدرسة {headerConfig?.schoolName}</div></div>
                                    <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16" alt="logo"/>
                                </div>
                                <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 print:hidden flex items-center gap-4">
                                    <label className="text-sm font-bold text-blue-900 flex items-center gap-2"><GitCompare size={18}/> قارن مع الاختبار القبلي:</label>
                                    <select className="flex-1 p-2 border rounded-lg bg-white font-bold text-sm outline-none" value={compareRecordId} onChange={e => setCompareRecordId(e.target.value)}>
                                        <option value="">-- اختر اختباراً سابقاً --</option>
                                        {history.filter(h => h.id !== selectedRecord.id).map(h => (<option key={h.id} value={h.id}>{h.examTitle}</option>))}
                                    </select>
                                </div>
                                {comparisonSkills ? (
                                    <div className="border-2 border-black">
                                        <div className="bg-[#003366] text-white p-3 text-center text-sm font-black uppercase">مقارنة نواتج التعلم (قبلي / بعدي)</div>
                                        <div className="grid grid-cols-4 text-[10px] font-black border-b-2 border-black text-center bg-gray-50 h-10 items-center uppercase">
                                            <div className="border-l-2 border-black">العام الدراسي: {headerConfig?.academicYear}</div><div className="border-l-2 border-black">الصف: {selectedRecord.className}</div><div className="border-l-2 border-black">الفصل: {reportClassFilter || 'الكل'}</div><div>المادة: علوم الأرض والفضاء</div>
                                        </div>
                                        <table className="w-full border-collapse text-[10px] text-center table-fixed border-b-2 border-black">
                                            <thead className="bg-gray-100 font-black">
                                                <tr><th rowSpan={2} className="border-2 border-black w-8">م</th><th rowSpan={2} className="border-2 border-black w-60 text-right pr-4">المهارة المستهدفة</th><th colSpan={2} className="border-2 border-black bg-blue-50">نسبة الطلبة المتقنين للمهارة</th><th rowSpan={2} className="border-2 border-black w-14">مقدار التغير</th><th rowSpan={2} className="border-2 border-black w-14">نسبة التحسين</th></tr>
                                                <tr className="bg-blue-100/50"><th className="border-2 border-black">الاختبار القبلي</th><th className="border-2 border-black">الاختبار البعدي</th></tr>
                                            </thead>
                                            <tbody className="font-bold">
                                                {comparisonSkills.rows.map((row, idx) => (
                                                    <tr key={idx} className="h-9 hover:bg-gray-50 border-b border-black">
                                                        <td className="border-2 border-black bg-gray-100">{idx+1}</td><td className="border-2 border-black text-right pr-4 font-black text-gray-800 text-[9px] leading-tight">{row.skill}</td>
                                                        <td className="border-2 border-black bg-gray-50 font-mono">{row.prev}%</td><td className="border-2 border-black bg-green-50 font-black text-green-700">{row.curr}%</td>
                                                        <td className={`border-2 border-black font-black ${row.diff > 0 ? 'text-green-600' : 'text-red-500'}`}>{row.diff > 0 ? `+${row.diff}%` : `${row.diff}%`}</td>
                                                        <td className={`border-2 border-black font-black ${row.imp > 0 ? 'text-green-600' : 'text-red-500'}`}>{row.imp > 0 ? `+${row.imp}%` : `${row.imp}%`}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="grid grid-cols-4 border-b-2 border-black font-black text-[10px] text-center bg-gray-50 h-8 items-center uppercase">
                                            <div className="border-l-2 border-black">المستوى</div><div className="border-l-2 border-black">عدد المتعلمين (قبلي)</div><div className="border-l-2 border-black">عدد المتعلمين (بعدي)</div><div>تحليل المستوى</div>
                                        </div>
                                        <div className="divide-y-2 divide-black uppercase">
                                            <LevelRow label="مرتفع" prev={comparisonSkills.prevLevels.high} curr={comparisonSkills.currLevels.high} total={reportData.totalStudents} color="text-green-600" analysis="لديهم أداء متقدم وحلول إبداعية للمسائل" />
                                            <LevelRow label="متوسط" prev={comparisonSkills.prevLevels.med} curr={comparisonSkills.currLevels.med} total={reportData.totalStudents} color="text-blue-500" analysis="لديهم تميز نسبي في حل المسائل متوسطة المستوى" />
                                            <LevelRow label="منخفض" prev={comparisonSkills.prevLevels.low} curr={comparisonSkills.currLevels.low} total={reportData.totalStudents} color="text-orange-500" analysis="لديهم خلل في نواتج التعلم وضعف في التأسيس" />
                                            <LevelRow label="منخفض جداً" prev={comparisonSkills.prevLevels.vlow} curr={comparisonSkills.currLevels.vlow} total={reportData.totalStudents} color="text-red-500" analysis="يحتاجون إلى تحسين كبير وخطة مكثفة" />
                                        </div>
                                        <div className="bg-[#003366] text-white p-5 grid grid-cols-2 text-center text-xs font-black"><div>معلم المادة / أ. {headerConfig?.teacherName}</div><div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div></div>
                                    </div>
                                ) : <div className="p-20 text-center text-gray-400 border-2 border-dashed rounded-xl">يرجى اختيار اختبار سابق للمقارنة أعلاه.</div>}
                            </div>
                        ) : <div className="p-10 text-center text-gray-400">قيد التطوير...</div>}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد (كما هي) --- */
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/><h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3><p className="text-xs text-gray-400 mb-8 max-w-xs">ارفع ملف Excel لتوليد الكشوفات والرسوم البيانية.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} /><label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row gap-6 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListFilter className="text-orange-500"/> ربط الأسئلة بالمهارات</h3>
                                    <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-purple-700 transition-all">
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
                            <div className="w-full xl:w-96 flex flex-col border-r pr-6">
                                <h3 className="font-bold text-gray-800 mb-4">بيانات الاختبار</h3>
                                <div className="space-y-4 flex-1">
                                    <div><label className="text-xs font-bold text-gray-400 mb-1 block">عنوان الكشف</label><input className="w-full p-3 border rounded-xl font-bold text-indigo-600" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/></div>
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100"><p className="text-xs text-blue-700 leading-relaxed font-bold">سيقوم النظام بمطابقة الطلاب في الملف مع سجلاتك الحالية تلقائياً بناءً على الاسم أو الهوية.</p></div>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ الاختبار في الأرشيف</button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* --- واجهة الأرشيف --- */
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                    {history.map(record => (
                        <div key={record.id} onClick={() => {setSelectedRecord(record); setDetailTab('ANALYSIS');}} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                            <div className="absolute top-0 right-0 w-2 h-full bg-[#003366]"></div>
                            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 text-[#003366] rounded-2xl shadow-inner"><BarChart2 size={24}/></div><button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div>
                            <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3><p className="text-xs text-gray-500">{record.className} • {Object.keys(record.studentResponses).length} طالب مرصود</p>
                            <button className="mt-4 w-full py-2 bg-[#003366] text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2">فتح التقارير والمقارنات <ArrowRight size={12}/></button>
                        </div>
                    ))}
                </div>
            )}
            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: landscape; margin: 0.5cm; } body { background: white; } .print\\:hidden { display: none !important; } } .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-white shadow text-indigo-700 font-black' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
);

const LevelRow = ({ label, prev, curr, total, color, analysis }: any) => {
    const pPct = total > 0 ? Math.round((prev / total) * 100) : 0;
    const cPct = total > 0 ? Math.round((curr / total) * 100) : 0;
    return (
        <div className="grid grid-cols-4 text-[9px] font-black text-center h-10 items-center">
            <div className={`border-l-2 border-black h-full flex items-center justify-center font-bold ${color}`}>{label}</div>
            <div className="border-l-2 border-black h-full flex flex-col items-center justify-center bg-gray-50/30"><div>{prev}</div><div className="opacity-50 font-mono">{pPct}%</div></div>
            <div className="border-l-2 border-black h-full flex flex-col items-center justify-center bg-blue-50/30"><div>{curr}</div><div className="font-mono text-blue-700">{cPct}%</div></div>
            <div className="h-full flex items-center justify-center px-2 leading-tight text-gray-600">{analysis}</div>
        </div>
    );
};

export default FormsAnalyzer;
