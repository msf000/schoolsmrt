
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

interface Props {
    students: Student[];
    currentUserId?: string;
}

// Fix: Added missing report components
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
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.skillStats.map((s: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg flex justify-between items-center">
                        <span className="text-xs font-bold">{s.name}</span>
                        <span className="text-xs font-black text-indigo-600">{Math.round(s.masteredPct)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ClassificationReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <h3 className="text-xl font-bold mb-4">تصنيف المتعلمين</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border rounded-xl p-4">
                    <h4 className="font-bold text-green-600 mb-2">المتقنون (أعلى من 75%)</h4>
                    <ul className="list-disc pr-5 space-y-1 text-sm">
                        {data.studentsList.filter((s: any) => s.pct >= 75).map((s: any) => (
                            <li key={s.sid}>{s.name} ({Math.round(s.pct)}%)</li>
                        ))}
                    </ul>
                </div>
                <div className="border rounded-xl p-4">
                    <h4 className="font-bold text-red-600 mb-2">غير المتقنين (أقل من 75%)</h4>
                    <ul className="list-disc pr-5 space-y-1 text-sm">
                        {data.studentsList.filter((s: any) => s.pct < 75).map((s: any) => (
                            <li key={s.sid}>{s.name} ({Math.round(s.pct)}%)</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const LearningOutcomesReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <h3 className="text-xl font-bold mb-4">تقرير نواتج التعلم</h3>
            <table className="w-full border-collapse border text-sm">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="border p-2">ناتج التعلم</th>
                        <th className="border p-2">الوحدة</th>
                        <th className="border p-2 text-center">نسبة الإتقان</th>
                    </tr>
                </thead>
                <tbody>
                    {data.skillStats.map((s: any, i: number) => (
                        <tr key={i}>
                            <td className="border p-2">{s.name}</td>
                            <td className="border p-2">{s.unit}</td>
                            <td className="border p-2 text-center font-bold">{Math.round(s.masteredPct)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const FollowUpRecordReport = ({ record, data, header, classFilter, skillIndex, meta }: any) => {
    const skill = record.questions[skillIndex];
    const skillStat = data.skillStats[skillIndex];
    return (
        <div className="bg-white p-8 border shadow-sm rounded-xl">
            <h3 className="text-xl font-bold mb-4">سجل متابعة المهارة: {skill.learningOutcome}</h3>
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg"><b>الأسبوع:</b> {meta.week}</div>
                <div className="p-3 bg-gray-50 rounded-lg"><b>التاريخ:</b> {meta.date}</div>
            </div>
            <div className="mb-6">
                <h4 className="font-bold mb-2">الطلاب غير المتقنين:</h4>
                <div className="flex flex-wrap gap-2">
                    {data.studentsList.filter((s: any) => !s.isAbsent && s.answers[skill.id] !== '✔').map((s: any) => (
                        <span key={s.sid} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold">{s.name}</span>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                    <h5 className="font-bold text-indigo-600 mb-2">إجراءات المعالجة:</h5>
                    <p className="text-sm whitespace-pre-line">{meta.remedialMechanism}</p>
                </div>
            </div>
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

    // حالات المقارنة
    const [compareIdA, setCompareIdA] = useState('');
    const [compareIdB, setCompareIdB] = useState('');
    const [compareClassFilter, setCompareClassFilter] = useState('');
    const [compareViewTab, setCompareViewTab] = useState<'SUMMARY' | 'DETAILS' | 'CARD'>('SUMMARY');
    const [selectedCompareStudentId, setSelectedCompareStudentId] = useState('');

    // بيانات المتابعة القابلة للتعديل
    const [followUpMeta, setFollowUpMeta] = useState({
        week: 'الخامس',
        day: 'الثلاثاء',
        date: new Date().toLocaleDateString('ar-SA'),
        enrichMechanism: '• عرض مرئي ومسموع لتعميق المفاهيم\n• تفعيل التعلم الذاتي عبر منصات إثرائية',
        remedialMechanism: '• مهمة أدائية علاجية مركزة\n• تطبيق استراتيجية تعلم الأقران',
        notes: '',
        recommendations: ''
    });

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving, mainTab]);

    const getQuestionHeaders = (allHeaders: string[]) => {
        return allHeaders.filter(h => {
            const hTrim = h.trim();
            const isPointCol = hTrim.startsWith('النقاط -') || hTrim.startsWith('Points -');
            const isGrandTotal = hTrim === 'إجمالي النقاط' || hTrim === 'Total Points';
            const identityWords = ['اسم الطالب', 'اسمك', 'الفصل', 'الشعبة', 'الرقم الأكاديمي', 'الهوية'];
            const isIdentity = identityWords.some(word => hTrim.includes(word) && !isPointCol);
            return (isPointCol && !isGrandTotal && !isIdentity) && !hiddenHeaders.has(h);
        });
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
            const prompt = `أنت خبير في المنهج السعودي لمادة "علوم الأرض والفضاء". حلل الأسئلة التالية واستنتج المهارة التعليمية والوحدة لكل سؤال. أرجع JSON حصراً: {"items": [{"skill": "أن يوضح الطالب...", "unit": "الفصل 1 / نشأة الكون"}]}`;
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
            const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
            const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم') || h.includes('اسمك'));
            const questionCols = getQuestionHeaders(headers);
            fileData.forEach((row) => {
                const rowEmail = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';
                const rowName = nameCol ? String(row[nameCol] || '').trim() : '';
                const matchedStudent = students.find(s => (s.email && s.email.toLowerCase() === rowEmail) || (s.name === rowName || s.name.includes(rowName) || rowName.includes(s.name)));
                if (matchedStudent) {
                    const answers: Record<string, string> = {};
                    questionCols.forEach(q => { answers[q] = Number(row[q]) > 0 ? '✔' : '✘'; });
                    studentResponses[matchedStudent.id] = { score: Number(row['إجمالي النقاط'] || 0), total: questionCols.length, answers };
                }
            });
            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`, examTitle,
                className: students.find(s => Object.keys(studentResponses).includes(s.id))?.className || 'عام',
                date: new Date().toISOString(), teacherId: currentUserId,
                questions: questionCols.map(q => ({
                    id: q, text: q, learningOutcome: outcomesMapping[q] || q,
                    unitName: unitsMapping[q] || 'الوحدة الأولى',
                    successRate: 0, difficulty: 'EASY', commonErrors: []
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ بنجاح.'); setFileData([]); setMainTab('HISTORY');
        } catch (e) { alert('خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    const getReportData = (record: FormsDetailedResult, classFilter: string) => {
        const allInClass = students.filter(s => !classFilter || s.className === classFilter).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        const gradeName = allInClass.length > 0 ? (allInClass[0].gradeLevel || 'غير محدد') : (record.className || 'غير محدد');
        let totalPossibleSkills = 0; let totalMasteredSkills = 0; let totalStudentsAttended = 0;
        const studentsList = allInClass.map(s => {
            const res = record.studentResponses[s.id];
            const pct = res ? (res.score / record.questions.length) * 100 : 0;
            let color = '#ef4444';
            if (pct >= 90) color = '#10b981'; else if (pct >= 75) color = '#3b82f6'; else if (pct >= 50) color = '#f59e0b';
            let masteredCount = 0; let unmasteredCount = 0; let levelDesc = ""; let program = "";
            if (res) {
                totalStudentsAttended++; totalPossibleSkills += record.questions.length; totalMasteredSkills += res.score;
                Object.values(res.answers).forEach(val => { if (val === '✔') masteredCount++; else unmasteredCount++; });
                if (pct >= 90) { levelDesc = "أداء المتعلم متقدم وحلوله إبداعية للمسائل"; program = "ENRICHMENT"; }
                else if (pct >= 75) { levelDesc = "لدى المتعلم تميز نسبي في حل المسائل متوسطة المستوى"; program = "ENRICHMENT"; }
                else if (pct >= 50) { levelDesc = "لدى المتعلم خلل في نواتج التعلم وضعف في التأسيس"; program = "REMEDIAL"; }
                else { levelDesc = "يحتاج المتعلم إلى تحسين كبير ومتابعة مكثفة لنواتج التعلم"; program = "REMEDIAL"; }
            }
            return { sid: s.id, name: s.name, score: res?.score || 0, total: record.questions.length, pct, color, isAbsent: !res, answers: res?.answers || {}, masteredCount, unmasteredCount, levelDesc, program };
        });
        const skillStats = record.questions.map(q => {
            let mastered = 0; let attended = 0;
            studentsList.forEach(s => { if (!s.isAbsent) { attended++; if (s.answers[q.id] === '✔') mastered++; } });
            return { 
                id: q.id, name: q.learningOutcome, unit: q.unitName || 'غير محدد', masteredCount: mastered, 
                nonMasteredCount: attended - mastered, masteredPct: attended > 0 ? (mastered / attended) * 100 : 0, 
                nonMasteredPct: attended > 0 ? ((attended - mastered) / attended) * 100 : 0, totalAttended: attended 
            };
        });
        const overallMasteryPct = totalPossibleSkills > 0 ? (totalMasteredSkills / totalPossibleSkills) * 100 : 0;
        return { studentsList, skillStats, totalPossibleSkills, totalMasteredSkills, totalStudents: allInClass.length, totalStudentsAttended, overallMasteryPct, gradeName };
    };

    const activeClassesForRecord = (record: FormsDetailedResult) => {
        const classes = new Set<string>();
        Object.keys(record.studentResponses).forEach(sid => {
            const s = students.find(x => x.id === sid);
            if (s?.className) classes.add(s.className);
        });
        return Array.from(classes).sort();
    };

    const toggleHideHeader = (h: string) => {
        const newHidden = new Set(hiddenHeaders);
        if (newHidden.has(h)) newHidden.delete(h); else newHidden.add(h);
        setHiddenHeaders(newHidden);
    };

    // منطق مقارنة الاختبارات
    const getComparisonData = () => {
        const recA = history.find(r => r.id === compareIdA);
        const recB = history.find(r => r.id === compareIdB);
        if (!recA || !recB) return null;

        const dataA = getReportData(recA, compareClassFilter);
        const dataB = getReportData(recB, compareClassFilter);

        // ربط الطلاب وتحديد النمو
        const studentComparison = dataA.studentsList.map(sA => {
            const sB = dataB.studentsList.find(x => x.sid === sA.sid);
            const growth = (sA.isAbsent || sB?.isAbsent) ? 0 : (sB?.pct || 0) - sA.pct;
            return {
                sid: sA.sid,
                name: sA.name,
                scoreA: sA.isAbsent ? '-' : sA.score,
                pctA: sA.pct,
                scoreB: (sB && !sB.isAbsent) ? sB.score : '-',
                pctB: sB?.pct || 0,
                growth,
                isAbsent: sA.isAbsent || sB?.isAbsent,
                masteredCountA: sA.masteredCount,
                unmasteredCountA: sA.unmasteredCount,
                masteredCountB: sB?.masteredCount || 0,
                unmasteredCountB: sB?.unmasteredCount || 0,
                totalA: sA.total,
                totalB: sB?.total || 0,
                answersA: sA.answers,
                answersB: sB?.answers || {}
            };
        });

        const overallGrowth = dataB.overallMasteryPct - dataA.overallMasteryPct;

        return { recA, recB, dataA, dataB, studentComparison, overallGrowth };
    };

    const allCompareClasses = useMemo(() => {
        const recA = history.find(r => r.id === compareIdA);
        const recB = history.find(r => r.id === compareIdB);
        if (!recA && !recB) return [];
        const classes = new Set<string>();
        if (recA) activeClassesForRecord(recA).forEach(c => classes.add(c));
        if (recB) activeClassesForRecord(recB).forEach(c => classes.add(c));
        return Array.from(classes).sort();
    }, [compareIdA, compareIdB, history]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><PlusCircle size={18}/> تحليل جديد</button>
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><History size={18}/> سجل النتائج</button>
                <button onClick={() => setMainTab('COMPARE')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'COMPARE' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><ArrowRightLeft size={18}/> مقارنة النتائج</button>
            </div>

            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={64} className="text-green-600 mb-4 opacity-20"/>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">تحليل استجابات Forms جديدة</h3>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all active:scale-95">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row gap-8 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListFilter className="text-orange-500"/> ربط الأسئلة بنواتج التعلم (العدد المكتشف: {getQuestionHeaders(headers).length})</h3>
                                    <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-purple-700">
                                        {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} استخراج المهارات ذكياً ✨
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {getQuestionHeaders(headers).map((h, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4 relative group">
                                            <button onClick={() => toggleHideHeader(h)} className="absolute top-2 left-2 p-1 text-gray-300 hover:text-red-500 transition-colors" title="إخفاء السؤال من التقرير"><X size={16}/></button>
                                            <p className="text-xs font-bold text-gray-500 mb-2 truncate pl-8">س{idx+1}: {h.replace(/^(النقاط - )/, '')}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                    <Bookmark size={14} className="text-teal-500"/><input className="flex-1 text-xs outline-none font-bold text-teal-900" placeholder="الوحدة / الدرس..." value={unitsMapping[h] || ''} onChange={e => setUnitsMapping({...unitsMapping, [h]: e.target.value})} />
                                                </div>
                                                <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                    <Target size={14} className="text-indigo-500"/><input className="flex-1 text-xs outline-none font-bold text-indigo-900" placeholder="المهارة..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full xl:w-96 flex flex-col border-r pr-8">
                                <h3 className="font-bold text-gray-800 mb-6">بيانات الحفظ</h3>
                                <input className="w-full p-3 border rounded-xl font-bold text-indigo-600 mb-6" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="عنوان الكشف"/>
                                <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 mt-6">{isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ وتحليل النتائج</button>
                            </div>
                        </div>
                    </div>
                )
            )}

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
                                <p className="text-xs text-gray-400 font-bold">{record.className} • {record.questions.length} مهارة</p>
                                <div className="mt-4 flex gap-2"><div className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2">فتح التقارير <ArrowRight size={12}/></div></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden overflow-x-auto">
                            <div className="flex items-center gap-4 shrink-0">
                                <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                                <div className="flex bg-gray-100 p-1 rounded-xl whitespace-nowrap">
                                    <TabBtnView label="كشف الرصد" active={historyViewTab==='KASHF'} onClick={()=>setHistoryViewTab('KASHF')}/>
                                    <TabBtnView label="تصنيف المتعلمين" active={historyViewTab==='CLASSIFICATION'} onClick={()=>setHistoryViewTab('CLASSIFICATION')}/>
                                    <TabBtnView label="سجل المتابعة" active={historyViewTab==='FOLLOWUP'} onClick={()=>setHistoryViewTab('FOLLOWUP')}/>
                                    <TabBtnView label="نواتج التعلم" active={historyViewTab==='SKILLS'} onClick={()=>setHistoryViewTab('SKILLS')}/>
                                    <TabBtnView label="التحليل البياني" active={historyViewTab==='ANALYSIS'} onClick={()=>setHistoryViewTab('ANALYSIS')}/>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {historyViewTab === 'FOLLOWUP' && (
                                    <select className="bg-white border p-2 rounded-xl text-xs font-black text-purple-700 outline-none max-w-[200px]" value={activeSkillIdx} onChange={e => setActiveSkillIdx(Number(e.target.value))}>
                                        {selectedRecord.questions.map((q: any, i: number) => <option key={i} value={i}>المهارة {i+1}</option>)}
                                    </select>
                                )}
                                <select className="bg-white border p-2 rounded-xl text-xs font-black text-indigo-700 outline-none" value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                                    <option value="">كل الفصول</option>
                                    {activeClassesForRecord(selectedRecord).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={()=>window.print()} className="bg-gray-800 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> طباعة</button>
                            </div>
                        </div>

                        {/* لوحة تعديل بيانات المتابعة تظهر فقط في تبويب المتابعة */}
                        {historyViewTab === 'FOLLOWUP' && (
                            <div className="bg-white p-5 rounded-2xl border shadow-sm print:hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                                <div className="col-span-full flex items-center gap-2 border-b pb-2 mb-2 text-indigo-600 font-black text-xs uppercase tracking-widest"><Settings2 size={14}/> تخصيص بيانات المتابعة لهذه المهارة</div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">الأسبوع</label>
                                    <input className="w-full p-2 border rounded-lg text-xs font-bold" value={followUpMeta.week} onChange={e=>setFollowUpMeta({...followUpMeta, week: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">اليوم</label>
                                    <input className="w-full p-2 border rounded-lg text-xs font-bold" value={followUpMeta.day} onChange={e=>setFollowUpMeta({...followUpMeta, day: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">التاريخ</label>
                                    <input className="w-full p-2 border rounded-lg text-xs font-bold" value={followUpMeta.date} onChange={e=>setFollowUpMeta({...followUpMeta, date: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">آلية الإثراء</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.enrichMechanism} onChange={e=>setFollowUpMeta({...followUpMeta, enrichMechanism: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">آلية المعالجة</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.remedialMechanism} onChange={e=>setFollowUpMeta({...followUpMeta, remedialMechanism: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">الملاحظات</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.notes} onChange={e=>setFollowUpMeta({...followUpMeta, notes: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">التوصيات</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.recommendations} onChange={e=>setFollowUpMeta({...followUpMeta, recommendations: e.target.value})}/>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {historyViewTab === 'KASHF' && <KashfReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'ANALYSIS' && <DiagnosticAnalysis record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'CLASSIFICATION' && <ClassificationReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'SKILLS' && <LearningOutcomesReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'FOLLOWUP' && <FollowUpRecordReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} skillIndex={activeSkillIdx} meta={followUpMeta} />}
                        </div>
                    </div>
                )
            )}

            {mainTab === 'COMPARE' && (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in overflow-hidden">
                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row gap-6 items-end print:hidden">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-gray-400 flex items-center gap-1"><Circle size={8} className="fill-blue-500 text-blue-500"/> الاختبار الأول (الأساس/القبلي)</label>
                            <select className="w-full p-3 border rounded-xl font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500" value={compareIdA} onChange={e=>setCompareIdA(e.target.value)}>
                                <option value="">-- اختر السجل الأول --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle} ({r.className})</option>)}
                            </select>
                        </div>
                        <div className="p-3 text-purple-300 hidden md:block"><ArrowRightLeft size={24}/></div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-gray-400 flex items-center gap-1"><Circle size={8} className="fill-green-500 text-green-500"/> الاختبار الثاني (المستهدف/البعدي)</label>
                            <select className="w-full p-3 border rounded-xl font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500" value={compareIdB} onChange={e=>setCompareIdB(e.target.value)}>
                                <option value="">-- اختر السجل الثاني --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle} ({r.className})</option>)}
                            </select>
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                             <label className="text-xs font-black text-gray-400 flex items-center gap-1"><Filter size={12}/> تصفية الفصل</label>
                             <select className="w-full p-3 border rounded-xl font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500" value={compareClassFilter} onChange={e=>setCompareClassFilter(e.target.value)}>
                                <option value="">كل الفصول</option>
                                {allCompareClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button onClick={()=>window.print()} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all"><Printer size={18}/> طباعة</button>
                    </div>

                    {getComparisonData() ? (
                        <div className="flex-1 flex flex-col overflow-hidden gap-4">
                            <div className="bg-white p-1 rounded-xl border shadow-sm flex w-fit mx-auto print:hidden">
                                <TabBtnView label="ملخص النمو التعليمي" active={compareViewTab==='SUMMARY'} onClick={()=>setCompareViewTab('SUMMARY')}/>
                                <TabBtnView label="تفاصيل نمو المتعلمين" active={compareViewTab==='DETAILS'} onClick={()=>setCompareViewTab('DETAILS')}/>
                                <TabBtnView label="بطاقة المتعلم التفصيلية" active={compareViewTab==='CARD'} onClick={()=>setCompareViewTab('CARD')}/>
                            </div>
                            
                            {compareViewTab === 'CARD' && (
                                <div className="bg-white p-4 border rounded-xl shadow-sm mb-4 max-w-md mx-auto print:hidden">
                                    <label className="block text-xs font-bold text-gray-500 mb-2">اختر الطالب لعرض البطاقة:</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg font-bold text-purple-700 outline-none"
                                        value={selectedCompareStudentId}
                                        onChange={e => setSelectedCompareStudentId(e.target.value)}
                                    >
                                        <option value="">-- اختر طالباً --</option>
                                        {getComparisonData()?.studentComparison.map(s => (
                                            <option key={s.sid} value={s.sid}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <ComparisonReport data={getComparisonData()} header={headerConfig} viewMode={compareViewTab} selectedStudentId={selectedCompareStudentId} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4 bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                            <GitCompare size={80} className="opacity-10"/>
                            <p className="text-xl font-black">يرجى اختيار اختبارين للمقارنة</p>
                        </div>
                    )}
                </div>
            )}

            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: portrait; margin: 0.5cm; } body { background: white !important; } .print\\:hidden { display: none !important; } .break-after { page-break-after: always; } } `}</style>
        </div>
    );
};

const ComparisonReport = ({ data, header, viewMode, selectedStudentId }: any) => {
    const { recA, recB, studentComparison, overallGrowth } = data;

    // تقدير الدرجة بناءً على النسبة
    const getRating = (pct: number) => {
        if (pct >= 90) return { label: 'ممتاز', color: 'text-green-600' };
        if (pct >= 80) return { label: 'جيد جداً', color: 'text-blue-600' };
        if (pct >= 65) return { label: 'جيد', color: 'text-orange-600' };
        if (pct >= 50) return { label: 'مقبول', color: 'text-orange-400' };
        return { label: 'ضعيف', color: 'text-red-600' };
    };

    // تجهيز بيانات الرسم البياني للمهارات
    const skillChartData = recA.questions.map((qA: any, idx: number) => {
        const qB = recB.questions[idx];
        const masteredA = Object.values(recA.studentResponses).filter((r: any) => r.answers[qA.id] === '✔').length;
        const masteredB = Object.values(recB.studentResponses).filter((r: any) => r.answers[qB?.id] === '✔').length;
        const totalA = Object.keys(recA.studentResponses).length;
        const totalB = Object.keys(recB.studentResponses).length;
        
        return {
            name: qA.learningOutcome,
            testA: totalA > 0 ? (masteredA / totalA) * 100 : 0,
            testB: totalB > 0 ? (masteredB / totalB) * 100 : 0
        };
    });

    return (
        <div className="space-y-10">
            {/* الصفحة الأولى: ملخص المقارنة والتحليل البياني */}
            {(viewMode === 'SUMMARY' || window.matchMedia('print').matches) && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black print:p-0 print:shadow-none break-after">
                    <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
                        <div className="text-right text-[11px] font-bold">
                            <p>المملكة العربية السعودية</p>
                            <p>وزارة التعليم</p>
                            <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                            <p>مدرسة {header?.schoolName}</p>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase mb-1">تقرير مقارنة نواتج التعلم</h2>
                            <p className="text-xs font-bold text-gray-500">تحليل الفاقد والنمو التعليمي بين اختبارين</p>
                        </div>
                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-14" alt="moe"/></div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="p-6 rounded-3xl border-2 border-blue-100 bg-blue-50 text-center">
                            <p className="text-xs font-black text-blue-600 mb-2">إتقان الاختبار الأساس</p>
                            <h3 className="text-4xl font-black text-blue-900">{Math.round(data.dataA.overallMasteryPct)}%</h3>
                            <p className="text-[10px] text-blue-400 mt-1">{recA.examTitle}</p>
                        </div>
                        <div className="p-6 rounded-3xl border-2 border-green-100 bg-green-50 text-center">
                            <p className="text-xs font-black text-green-600 mb-2">إتقان الاختبار المستهدف</p>
                            <h3 className="text-4xl font-black text-green-900">{Math.round(data.dataB.overallMasteryPct)}%</h3>
                            <p className="text-[10px] text-green-400 mt-1">{recB.examTitle}</p>
                        </div>
                        <div className={`p-6 rounded-3xl border-2 text-center ${overallGrowth >= 0 ? 'border-purple-100 bg-purple-50' : 'border-red-100 bg-red-50'}`}>
                            <p className={`text-xs font-black mb-2 ${overallGrowth >= 0 ? 'text-purple-600' : 'text-red-600'}`}>نسبة التطور (Growth)</p>
                            <h3 className={`text-4xl font-black ${overallGrowth >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                                {overallGrowth >= 0 ? '+' : ''}{Math.round(overallGrowth)}%
                            </h3>
                            <p className="text-[10px] opacity-60 mt-1">مؤشر التحسن العام</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 border-2 border-black rounded-3xl p-6 mb-10">
                        <h3 className="text-center font-black text-gray-800 mb-8 border-b border-gray-200 pb-4">مقارنة نسب الإتقان لكل مهارة مستهدفة</h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={skillChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} />
                                    <YAxis domain={[0, 100]} unit="%" />
                                    <Tooltip />
                                    <Legend iconType="circle" />
                                    <ReBar name={recA.examTitle} dataKey="testA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <ReBar name={recB.examTitle} dataKey="testB" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 text-center text-xs font-black border-t-2 border-black pt-6 bg-gray-50 p-4">
                        <div>معلم المادة / أ. {header?.teacherName}</div>
                        <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                    </div>
                </div>
            )}

            {/* الصفحة الثانية: تفاصيل نمو الطلاب */}
            {(viewMode === 'DETAILS' || window.matchMedia('print').matches) && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black print:p-0 print:shadow-none break-after">
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-right text-[11px] font-bold">
                                <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                                <p>مكة المكرمة</p>
                            </div>
                            <div className="text-center">
                                <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-14 mx-auto mb-2" alt="moe"/>
                                <div className="bg-[#00334d] text-white py-1 px-10 rounded-full font-black text-sm uppercase">مدرسة {header?.schoolName}</div>
                            </div>
                            <div className="text-left"><div className="w-14 h-14"></div></div>
                        </div>

                        <div className="bg-[#00334d] text-white p-3 grid grid-cols-4 text-center text-[11px] font-black border-2 border-black">
                            <div className="border-l border-white/20 uppercase tracking-tighter">علوم الأرض والفضاء</div>
                            <div className="border-l border-white/20">كشف رصد درجات الاختبارات المدرسية</div>
                            <div className="border-l border-white/20 uppercase tracking-tighter">الصف / {data.dataA.gradeName}</div>
                            <div className="uppercase tracking-tighter">الفصل الدراسي / {header?.term} {header?.academicYear}</div>
                        </div>
                    </div>
                    
                    <table className="w-full border-collapse text-center table-fixed text-[11px] border-2 border-black">
                        <thead>
                            <tr className="bg-[#00334d] text-white font-black h-12">
                                <th rowSpan={2} className="border border-white w-8">م</th>
                                <th rowSpan={2} className="border border-white w-48 text-right pr-4">اسم الطالب</th>
                                <th colSpan={2} className="border border-white">الاختبار القبلي</th>
                                <th colSpan={2} className="border border-white">الاختبار البعدي</th>
                                <th colSpan={2} className="border border-white">نسبة مكتسبات المتعلم وفق</th>
                                <th rowSpan={2} className="border border-white w-24">مؤشر التحصيل الدراسي</th>
                            </tr>
                            <tr className="bg-[#00334d] text-white font-black h-10">
                                <th className="border border-white">الدرجة المكتسبة</th>
                                <th className="border border-white">التقدير</th>
                                <th className="border border-white">الدرجة المكتسبة</th>
                                <th className="border border-white">التقدير</th>
                                <th className="border border-white">الاختبار القبلي</th>
                                <th className="border border-white">الاختبار البعدي</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold">
                            {studentComparison.map((s: any, idx: number) => {
                                const ratingA = getRating(s.pctA);
                                const ratingB = getRating(s.pctB);
                                return (
                                    <tr key={s.sid} className={`h-9 border-b border-black hover:bg-gray-50 ${s.isAbsent ? 'bg-gray-100 opacity-50' : ''}`}>
                                        <td className="border border-black bg-[#00334d] text-white">{idx + 1}</td>
                                        <td className="border border-black text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.scoreA}</td>
                                        <td className={`border border-black ${ratingA.color}`}>{s.isAbsent ? '-' : ratingA.label}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.scoreB}</td>
                                        <td className={`border border-black ${ratingB.color}`}>{s.isAbsent ? '-' : ratingB.label}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.pctA.toFixed(2)}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.pctB.toFixed(2)}</td>
                                        <td className="border border-black p-1">
                                            {!s.isAbsent && (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-full h-4 bg-gray-100 rounded-full border border-gray-300 overflow-hidden flex items-center relative">
                                                        <div className={`h-full ${s.growth >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${s.pctB}%` }}></div>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-black">{s.pctB.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {Array.from({ length: Math.max(0, 15 - studentComparison.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-9 border-b border-black">
                                    <td className="border border-black bg-[#00334d] text-white">{studentComparison.length + i + 1}</td>
                                    <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-8 flex justify-between items-center text-[11px] font-black px-10">
                        <div>معلم المادة / أ. {header?.teacherName}</div>
                        <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                    </div>
                </div>
            )}

            {/* تبويب بطاقة المتعلم التفصيلية */}
            {(viewMode === 'CARD' || window.matchMedia('print').matches) && selectedStudentId && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black max-w-[210mm] mx-auto print:p-0 print:shadow-none print:max-w-none">
                    {/* الترويسة العلوية */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-right text-[11px] font-bold">
                            <p>المملكة العربية السعودية</p>
                            <p>وزارة التعليم</p>
                            <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin || 'مكة المكرمة'}</p>
                        </div>
                        <div className="text-center">
                            <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 mx-auto mb-2" alt="moe"/>
                            <div className="bg-[#00334d] text-white py-1 px-8 rounded-full font-black text-xs">مدرسة {header?.schoolName}</div>
                        </div>
                        <div className="w-20"></div>
                    </div>

                    <h2 className="text-center font-black text-lg mb-6 border-b-2 border-black pb-2">بطاقة المتعلم التفصيلية</h2>

                    {/* معلومات الطالب */}
                    <table className="w-full border-collapse text-center table-fixed text-[11px] border-2 border-black mb-6">
                        <thead className="bg-[#00334d] text-white">
                            <tr>
                                <th className="border border-white p-2">اسم الطالب</th>
                                <th className="border border-white p-2">المادة</th>
                                <th className="border border-white p-2">الصف / الفصل</th>
                                <th className="border border-white p-2">معلم المادة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="font-bold">
                                <td className="border border-black p-2">{studentComparison.find((s:any)=>s.sid===selectedStudentId)?.name}</td>
                                <td className="border border-black p-2">علوم الأرض والفضاء</td>
                                <td className="border border-black p-2">{data.dataA.gradeName}</td>
                                <td className="border border-black p-2">أ. {header?.teacherName}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="bg-[#00334d] text-white p-2 text-center text-xs font-black mb-0 border-t-2 border-x-2 border-black">نواتج التعلم المستهدفة</div>
                    <table className="w-full border-collapse text-center table-fixed text-[10px] border-2 border-black mb-6">
                        <thead>
                            <tr className="bg-gray-100 font-black h-10">
                                <th className="border border-black w-8">م</th>
                                <th className="border border-black w-40">الوحدة / الدرس</th>
                                <th className="border border-black">المهارة المستهدفة</th>
                                <th className="border border-black w-16">الاختبار القبلي</th>
                                <th className="border border-black w-16">الاختبار البعدي</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold">
                            {recA.questions.map((q: any, idx: number) => {
                                const s = studentComparison.find((s:any)=>s.sid===selectedStudentId);
                                return (
                                    <tr key={idx} className="h-8">
                                        <td className="border border-black">{idx + 1}</td>
                                        <td className="border border-black text-right pr-2 truncate">{q.unitName}</td>
                                        <td className="border border-black text-right pr-2 truncate">{q.learningOutcome}</td>
                                        <td className="border border-black">
                                            {s?.answersA[q.id] === '✔' ? <Check size={14} className="text-green-600 mx-auto"/> : <XIcon size={14} className="text-red-500 mx-auto"/>}
                                        </td>
                                        <td className="border border-black">
                                            {s?.answersB[q.id] === '✔' ? <Check size={14} className="text-green-600 mx-auto"/> : <XIcon size={14} className="text-red-500 mx-auto"/>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* صفوف فارغة لإكمال الجدول */}
                            {Array.from({ length: Math.max(0, 15 - recA.questions.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-8">
                                    <td className="border border-black">{recA.questions.length + i + 1}</td>
                                    <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* تحليل الأداء */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* القبلي */}
                        <div className="border-2 border-black rounded-lg overflow-hidden">
                            <div className="bg-[#e6f3ff] p-2 text-center font-black text-xs border-b border-black">تحليل الاختبار القبلي للمتعلم</div>
                            <div className="grid grid-cols-3 text-center text-[9px] font-bold p-2 border-b border-black">
                                <div className="border-l border-gray-300">المهارات المستهدفة <br/> <span className="text-blue-600">{recA.questions.length}</span></div>
                                <div className="border-l border-gray-300">المهارات المتقنة <br/> <span className="text-green-600">{studentComparison.find((s:any)=>s.sid===selectedStudentId)?.masteredCountA}</span></div>
                                <div>المهارات المفقودة <br/> <span className="text-red-500">{studentComparison.find((s:any)=>s.sid===selectedStudentId)?.unmasteredCountA}</span></div>
                            </div>
                            <div className="p-3 bg-white">
                                <p className="text-[9px] font-bold mb-1">مؤشر الإتقان:</p>
                                <div className="w-full h-4 bg-gray-100 rounded-full border border-gray-300 overflow-hidden relative">
                                    <div className="h-full bg-blue-400" style={{ width: `${studentComparison.find((s:any)=>s.sid===selectedStudentId)?.pctA || 0}%` }}></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{Math.round(studentComparison.find((s:any)=>s.sid===selectedStudentId)?.pctA || 0)}%</span>
                                </div>
                            </div>
                        </div>
                        {/* البعدي */}
                        <div className="border-2 border-black rounded-lg overflow-hidden">
                            <div className="bg-[#f0fdf4] p-2 text-center font-black text-xs border-b border-black">تحليل الاختبار البعدي للمتعلم</div>
                            <div className="grid grid-cols-3 text-center text-[9px] font-bold p-2 border-b border-black">
                                <div className="border-l border-gray-300">المهارات المستهدفة <br/> <span className="text-blue-600">{recB.questions.length}</span></div>
                                <div className="border-l border-gray-300">المهارات المتقنة <br/> <span className="text-green-600">{studentComparison.find((s:any)=>s.sid===selectedStudentId)?.masteredCountB}</span></div>
                                <div>المهارات المفقودة <br/> <span className="text-red-500">{studentComparison.find((s:any)=>s.sid===selectedStudentId)?.unmasteredCountB}</span></div>
                            </div>
                            <div className="p-3 bg-white">
                                <p className="text-[9px] font-bold mb-1">مؤشر الإتقان:</p>
                                <div className="w-full h-4 bg-gray-100 rounded-full border border-gray-300 overflow-hidden relative">
                                    <div className="h-full bg-green-500" style={{ width: `${studentComparison.find((s:any)=>s.sid===selectedStudentId)?.pctB || 0}%` }}></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{Math.round(studentComparison.find((s:any)=>s.sid===selectedStudentId)?.pctB || 0)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* الإجراءات العلاجية */}
                    <div className="border-2 border-black rounded-lg overflow-hidden mb-6">
                        <div className="grid grid-cols-3 text-[10px] font-bold">
                            <div className="bg-[#fff7ed] p-2 border-l border-black">
                                <div className="font-black text-orange-800 mb-2 border-b border-orange-200 pb-1 flex items-center justify-between">
                                    <span>الإجراءات العلاجية</span>
                                    {studentComparison.find((s:any)=>s.sid===selectedStudentId)?.growth < 20 && <Check size={12}/>}
                                </div>
                                <div className="space-y-1 opacity-80">
                                    <p>• أوراق عمل مخصصة</p>
                                    <p>• حصص فردية / تعلم أقران</p>
                                    <p>• فيديوهات مهارية قصيرة</p>
                                </div>
                            </div>
                            <div className="bg-[#f0f9ff] p-2 border-l border-black">
                                <div className="font-black text-blue-800 mb-2 border-b border-blue-200 pb-1 flex items-center justify-between">
                                    <span>الإجراءات الإثرائية</span>
                                    {studentComparison.find((s:any)=>s.sid===selectedStudentId)?.pctB >= 85 && <Check size={12}/>}
                                </div>
                                <div className="space-y-1 opacity-80">
                                    <p>• أنشطة تعميق المفاهيم</p>
                                    <p>• بحوث ومهمات أدائية إثرائية</p>
                                    <p>• تفعيل التعلم الذاتي</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-2">
                                <div className="font-black text-gray-800 mb-2 border-b border-gray-200 pb-1">توصيات المعلم</div>
                                <p className="text-[9px] leading-relaxed italic">
                                    {studentComparison.find((s:any)=>s.sid===selectedStudentId)?.growth > 20 
                                        ? "نبارك للطالب هذا النمو التعليمي المتميز والحرص على اكتساب المهارات." 
                                        : "نأمل من الطالب بذل مزيد من الجهد والتركيز على نواتج التعلم المفقودة."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* التذييل */}
                    <div className="bg-gray-100 p-4 border-2 border-black rounded-lg flex justify-between items-center text-[10px] font-black">
                        <div className="space-y-1">
                            <p> ولي أمر الطالب : {studentComparison.find((s:any)=>s.sid===selectedStudentId)?.name}</p>
                            <p className="font-normal opacity-70 italic text-[8px]">دوركم حيوي في تمكين أبناءكم لاكتساب المهارات الأساسية وتعزيزها</p>
                        </div>
                        <div className="flex gap-10">
                            <div className="text-center">معلم المادة <br/> أ. {header?.teacherName}</div>
                            <div className="text-center">مدير المدرسة <br/> أ. {header?.schoolManager}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormsAnalyzer;
