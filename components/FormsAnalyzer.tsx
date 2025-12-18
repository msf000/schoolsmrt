
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown, Layers, Layout, PieChart as PieIcon, Filter, Info
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
    const [detailTab, setDetailTab] = useState<'ANALYSIS' | 'KASHF' | 'SUMMARY'>('KASHF');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, {skill: string, unit: string}>>({});
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // Archive Filters
    const [archiveGradeFilter, setArchiveGradeFilter] = useState('');
    const [archiveClassFilter, setArchiveClassFilter] = useState('');

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
                    studentResponses[matchedStudent.id] = { score: Number(row['إجمالي النقاط'] || 0), total: itemAnalysis.length, answers };
                }
            });

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`,
                examTitle,
                className: students.find(s => Object.keys(studentResponses).includes(s.id))?.className || 'عام',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions: itemAnalysis.map(q => ({
                    id: q.id, text: q.question, learningOutcome: outcomesMapping[q.id]?.skill || q.question,
                    unit: 'غير محدد', successRate: q.successRate, difficulty: q.successRate < 50 ? 'HARD' : 'EASY', commonErrors: []
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ.'); setFileData([]); setViewMode('HISTORY');
        } catch (e) { alert('خطأ.'); } finally { setIsSaving(false); }
    };

    const activeRecord = selectedRecord;

    const stats = useMemo(() => {
        if (!activeRecord) return null;
        
        const studentsList = Object.entries(activeRecord.studentResponses).map(([sid, res]) => {
            const pct = (res.score / activeRecord.questions.length) * 100;
            let level = 'VERY_LOW';
            if (pct >= 85) level = 'HIGH';
            else if (pct >= 70) level = 'MEDIUM';
            else if (pct >= 50) level = 'LOW';
            return { sid, score: res.score, pct, level };
        });

        const levels = {
            HIGH: studentsList.filter(s => s.level === 'HIGH'),
            MEDIUM: studentsList.filter(s => s.level === 'MEDIUM'),
            LOW: studentsList.filter(s => s.level === 'LOW'),
            VERY_LOW: studentsList.filter(s => s.level === 'VERY_LOW'),
        };

        const totalSkills = activeRecord.questions.length * studentsList.length;
        let masteredSkills = 0;
        activeRecord.questions.forEach(q => {
            studentsList.forEach(s => {
                if (activeRecord.studentResponses[s.sid].answers[q.text] === '✔') masteredSkills++;
            });
        });

        return { studentsList, levels, totalSkills, masteredSkills, unmasteredSkills: totalSkills - masteredSkills };
    }, [activeRecord]);

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

    const filteredHistory = useMemo(() => {
        return history.filter(h => {
            const matchesGrade = !archiveGradeFilter || h.className.includes(archiveGradeFilter);
            const matchesClass = !archiveClassFilter || h.className.split(' ').pop() === archiveClassFilter;
            return matchesGrade && matchesClass;
        });
    }, [history, archiveGradeFilter, archiveClassFilter]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            {/* Header Controls */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4 print:hidden">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileSpreadsheet className="text-green-600"/> محلل نواتج التعلم المتطور</h2>
                {!activeRecord && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                        <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>سجل الاختبارات</button>
                    </div>
                )}
            </div>

            {activeRecord && stats ? (
                <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                    {/* Navigation inside Record */}
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center print:hidden">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft/></button>
                            <div><h3 className="font-bold text-gray-800">{activeRecord.examTitle}</h3><p className="text-xs text-gray-500">{activeRecord.className}</p></div>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={()=>setDetailTab('KASHF')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='KASHF'?'bg-white shadow text-teal-800':'text-gray-500'}`}>كشف رصد المهارات</button>
                            <button onClick={()=>setDetailTab('ANALYSIS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='ANALYSIS'?'bg-white shadow text-indigo-900':'text-gray-500'}`}>تحليل النتائج</button>
                            <button onClick={()=>setDetailTab('SUMMARY')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='SUMMARY'?'bg-white shadow text-orange-800':'text-gray-500'}`}>ملخص المستويات</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'KASHF' ? (
                            /* --- كشف رصد المهارات (التصميم الأخضر) --- */
                            <div className="w-full bg-white p-6 shadow-2xl overflow-x-auto">
                                <div className="min-w-[1200px] border-2 border-black">
                                    {/* ترويسة رسمية */}
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
                                            {/* صفوف الإحصائيات في التذييل */}
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
                                                <td colSpan={2} rowSpan={2} className="border-2 border-black bg-white flex items-center justify-center">
                                                    <div className="w-14 h-14 rounded-full border-4 border-teal-600 flex items-center justify-center text-xs font-black text-teal-900">
                                                        {Math.round((stats.masteredSkills / stats.totalSkills) * 100)}%
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-red-50 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-red-900 text-sm">نسبة الطلبة الغير متقنين للمهارة</td>
                                                {kashfStats.map((s, i) => <td key={i} className="border-2 border-black text-red-700 text-sm">{s.failedPct}%</td>)}
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black">
                                        <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                        <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                    </div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-6 w-full py-4 bg-teal-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة كشف المهارات</button>
                            </div>
                        ) : detailTab === 'SUMMARY' ? (
                            /* --- ملخص تحليل المستويات (التصميم الجديد) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-2xl border border-gray-200">
                                <div className="border-2 border-[#003366] overflow-hidden">
                                    {/* ترويسة مصغرة */}
                                    <div className="flex justify-between items-center p-4 border-b-2 border-[#003366]">
                                        <div className="text-right text-[10px] font-bold text-[#003366]">
                                            <p>الإدارة العامة للتعليم بمنطقة {headerConfig?.educationAdmin}</p>
                                            <p>مدرسة {headerConfig?.schoolName}</p>
                                        </div>
                                        <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-10" alt="moe"/>
                                    </div>
                                    
                                    <div className="bg-[#003366] text-white p-2 text-center font-black text-sm mb-4">ملخص تحليل النتائج والمستويات</div>

                                    {/* جدول المهارات المستهدفة */}
                                    <table className="w-full border-collapse border-b-2 border-[#003366] text-[10px] text-center font-bold mb-8">
                                        <thead className="bg-blue-50">
                                            <tr>
                                                <th className="border-2 border-[#003366] p-2 w-12">م</th>
                                                <th className="border-2 border-[#003366] p-2">المهارة المستهدفة</th>
                                                <th className="border-2 border-[#003366] p-2 w-32">نسبة الإتقان</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeRecord.questions.map((q, idx) => (
                                                <tr key={idx} className="h-8">
                                                    <td className="border-2 border-[#003366]">{idx + 1}</td>
                                                    <td className="border-2 border-[#003366] text-right pr-3">{q.learningOutcome}</td>
                                                    <td className="border-2 border-[#003366] font-black text-blue-800">{q.successRate}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* جدول تحليل المستويات */}
                                    <table className="w-full border-collapse text-[10px] text-center font-bold">
                                        <thead className="bg-[#003366] text-white">
                                            <tr>
                                                <th className="border-2 border-[#003366] p-2 w-24">المستوى</th>
                                                <th className="border-2 border-[#003366] p-2">تحليل المستوى</th>
                                                <th className="border-2 border-[#003366] p-2 w-32" colSpan={2}>عدد المتعلمين</th>
                                            </tr>
                                            <tr className="bg-blue-50 text-[#003366]">
                                                <th></th><th></th><th>العدد</th><th>النسبة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-green-600">مرتفع</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">لديهم أداء متقدم وحلول إبداعية للمسائل</td>
                                                <td className="border-2 border-[#003366]">{stats.levels.HIGH.length}</td>
                                                <td className="border-2 border-[#003366] text-green-700">{Math.round((stats.levels.HIGH.length / stats.studentsList.length) * 100)}%</td>
                                            </tr>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-blue-600">متوسط</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">لديهم تميز نسبي في حل المسائل متوسطة المستوى</td>
                                                <td className="border-2 border-[#003366]">{stats.levels.MEDIUM.length}</td>
                                                <td className="border-2 border-[#003366] text-blue-700">{Math.round((stats.levels.MEDIUM.length / stats.studentsList.length) * 100)}%</td>
                                            </tr>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-orange-600">منخفض</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">لديهم خلل في نواتج التعلم وضعف في التأسيس</td>
                                                <td className="border-2 border-[#003366]">{stats.levels.LOW.length}</td>
                                                <td className="border-2 border-[#003366] text-orange-700">{Math.round((stats.levels.LOW.length / stats.studentsList.length) * 100)}%</td>
                                            </tr>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-red-600">منخفض جداً</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">يحتاجون إلى تحسين كبير ومتابعة لصيقة</td>
                                                <td className="border-2 border-[#003366]">{stats.levels.VERY_LOW.length}</td>
                                                <td className="border-2 border-[#003366] text-red-700">{Math.round((stats.levels.VERY_LOW.length / stats.studentsList.length) * 100)}%</td>
                                            </tr>
                                            <tr className="h-10 bg-gray-100 font-black">
                                                <td colSpan={2} className="border-2 border-[#003366]">المجموع الكلي</td>
                                                <td className="border-2 border-[#003366]">{stats.studentsList.length}</td>
                                                <td className="border-2 border-[#003366]">100%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="bg-[#003366] text-white p-5 grid grid-cols-2 text-center text-[10px] font-black">
                                        <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                        <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                    </div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة ملخص المستويات</button>
                            </div>
                        ) : (
                            /* --- تحليل النتائج (النموذج الأزرق - الرسوم البيانية) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-2xl border border-gray-200">
                                {/* تم دمج التصميم الأزرق في هذا التبويب لعرض الرسوم البيانية كما في الصورة الأولى */}
                                <div className="border-2 border-[#003366]">
                                    <div className="bg-[#003366] text-white p-2 text-center font-black text-sm">تحليل نتائج المتعلمين (إحصائيات الرسوم البيانية)</div>
                                    <div className="p-6 space-y-10">
                                        <div className="h-60 border p-2 bg-white">
                                            <p className="text-[10px] font-black text-center mb-2">الرسم البياني للتحصيل الدراسي حسب المتعلمين</p>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ReBarChart data={stats.studentsList.map((s,i)=>({name:i+1, score:s.pct, level:s.level}))}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{fontSize:8}} />
                                                    <YAxis domain={[0, 100]} tick={{fontSize:8}} />
                                                    <ReBar dataKey="score">
                                                        {stats.studentsList.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.level === 'HIGH' ? '#10b981' : entry.level === 'MEDIUM' ? '#3b82f6' : entry.level === 'LOW' ? '#f59e0b' : '#ef4444'} />
                                                        ))}
                                                    </ReBar>
                                                </ReBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="h-60 border p-2 bg-white">
                                            <p className="text-[10px] font-black text-center mb-2">الرسم البياني للتحصيل الدراسي وفق المهارات المستهدفة</p>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ReBarChart data={activeRecord.questions.map((q,i)=>({name:i+1, rate:q.successRate}))}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{fontSize:8}} />
                                                    <YAxis domain={[0, 100]} tick={{fontSize:8}} />
                                                    <ReBar dataKey="rate" fill="#003366" barSize={30} />
                                                </ReBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 border-t-2 border-[#003366] text-center font-bold text-[10px] bg-blue-50">
                                        <div className="border-l-2 border-[#003366] p-2">عدد المتعلمين الكلي: {stats.studentsList.length}</div>
                                        <div className="border-l-2 border-[#003366] p-2">مجموع المهارات: {stats.totalSkills}</div>
                                        <div className="border-l-2 border-[#003366] p-2 text-green-700">المهارات المتقنة: {stats.masteredSkills}</div>
                                        <div className="p-2 text-red-600">غير المتقنة: {stats.unmasteredSkills}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد (تبقى كما هي) --- */
                <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                    <Upload size={48} className="text-green-600 mb-4"/>
                    <h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3>
                    <p className="text-xs text-gray-400 mb-8 max-w-xs">سيقوم النظام باستخراج المهارات وتصنيف الطلاب آلياً.</p>
                    <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                    <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                </div>
            ) : (
                /* --- واجهة الأرشيف مع التصفية بالصف والفصل --- */
                <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-fade-in">
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border">
                            <Filter size={16} className="text-gray-400"/>
                            <span className="text-xs font-bold text-gray-500">تصفية الصف:</span>
                            <select className="bg-transparent text-sm font-bold outline-none" value={archiveGradeFilter} onChange={e=>setArchiveGradeFilter(e.target.value)}>
                                <option value="">الكل</option>
                                <option value="الأول">الأول</option>
                                <option value="الثاني">الثاني</option>
                                <option value="الثالث">الثالث</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border">
                            <span className="text-xs font-bold text-gray-500">الفصل:</span>
                            <select className="bg-transparent text-sm font-bold outline-none" value={archiveClassFilter} onChange={e=>setArchiveClassFilter(e.target.value)}>
                                <option value="">الكل</option>
                                {Array.from(new Set(history.map(h => h.className.split(' ').pop()))).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {filteredHistory.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-[#003366]"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 text-[#003366] rounded-2xl shadow-inner"><BarChart2 size={24}/></div>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                <button className="w-full py-2 bg-[#003366] text-white rounded-xl text-[10px] font-black shadow-md hover:bg-[#002244] transition-all flex items-center justify-center gap-2">فتح التقارير الرسمية <ArrowRight size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <style>{`
                .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .custom-scrollbar { overflow: visible !important; }
                }
            `}</style>
        </div>
    );
};

export default FormsAnalyzer;
