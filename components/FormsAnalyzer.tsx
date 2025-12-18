
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown, Layers, Layout, PieChart as PieIcon, Filter, Info, GitCompare
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
    const [detailTab, setDetailTab] = useState<'ANALYSIS' | 'KASHF' | 'SUMMARY' | 'COMPARISON'>('KASHF');
    const [compareRecordId, setCompareRecordId] = useState<string>(''); 
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, {skill: string, unit: string}>>({});
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // Filters
    const [archiveGradeFilter, setArchiveGradeFilter] = useState('');
    const [reportClassFilter, setReportClassFilter] = useState(''); // فلتر الفصل داخل التقرير

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

    // البيانات المفلترة للتقرير النشط بناءً على الفصل المختار
    const reportData = useMemo(() => {
        if (!selectedRecord) return null;
        
        const filteredStudentResponses: Record<string, any> = {};
        Object.entries(selectedRecord.studentResponses).forEach(([sid, res]) => {
            const s = students.find(x => x.id === sid);
            if (!reportClassFilter || s?.className === reportClassFilter) {
                filteredStudentResponses[sid] = res;
            }
        });

        const studentsList = Object.entries(filteredStudentResponses).map(([sid, res]) => {
            const pct = (res.score / selectedRecord.questions.length) * 100;
            let level = 'VERY_LOW';
            if (pct >= 85) level = 'HIGH';
            else if (pct >= 70) level = 'MEDIUM';
            else if (pct >= 50) level = 'LOW';
            return { sid, score: res.score, pct, level, name: students.find(x=>x.id===sid)?.name || 'طالب' };
        });

        const totalStudentsCount = studentsList.length;
        const totalSkillsPossible = selectedRecord.questions.length * totalStudentsCount;
        let masteredSkillsCount = 0;
        
        const skillStats = selectedRecord.questions.map(q => {
            let mastered = 0;
            studentsList.forEach(s => {
                if (filteredStudentResponses[s.sid].answers[q.text] === '✔') {
                    mastered++;
                    masteredSkillsCount++;
                }
            });
            const masteredPct = totalStudentsCount > 0 ? Math.round((mastered / totalStudentsCount) * 100) : 0;
            return { mastered, masteredPct, failed: totalStudentsCount - mastered, failedPct: 100 - masteredPct };
        });

        return { 
            filteredStudentResponses, 
            studentsList, 
            skillStats, 
            totalStudentsCount, 
            totalSkillsPossible, 
            masteredSkillsCount,
            unmasteredSkillsCount: totalSkillsPossible - masteredSkillsCount
        };
    }, [selectedRecord, reportClassFilter, students]);

    const comparisonData = useMemo(() => {
        if (!selectedRecord || !compareRecordId || !reportData) return [];
        const compareTarget = history.find(h => h.id === compareRecordId);
        if (!compareTarget) return [];

        return reportData.studentsList.map(s => {
            const res = reportData.filteredStudentResponses[s.sid];
            const baseRes = compareTarget.studentResponses[s.sid];
            
            const score1 = baseRes ? baseRes.score : 0;
            const score2 = res.score;
            const diff = score2 - score1;
            const improvementPct = score1 > 0 ? Math.round((diff / score1) * 100) : (score2 > 0 ? 100 : 0);
            const indicator = Math.round((score2 / selectedRecord.questions.length) * 100);

            const getGrade = (pts: number, total: number) => {
                const p = (pts / total) * 100;
                if (p >= 90) return { label: 'ممتاز', color: 'text-green-600' };
                if (p >= 80) return { label: 'جيد جداً', color: 'text-blue-500' };
                if (p >= 70) return { label: 'جيد', color: 'text-indigo-400' };
                if (p >= 50) return { label: 'مقبول', color: 'text-orange-500' };
                return { label: 'ضعيف', color: 'text-red-500' };
            };

            return {
                sid: s.sid,
                name: s.name,
                baseScore: score1,
                baseTotal: compareTarget.questions.length,
                baseGrade: getGrade(score1, compareTarget.questions.length),
                targetScore: score2,
                targetTotal: selectedRecord.questions.length,
                targetGrade: getGrade(score2, selectedRecord.questions.length),
                diff,
                improvementPct,
                indicator
            };
        });
    }, [selectedRecord, compareRecordId, history, reportData]);

    const activeClasses = useMemo(() => {
        if (!selectedRecord) return [];
        const clsSet = new Set<string>();
        Object.keys(selectedRecord.studentResponses).forEach(sid => {
            const s = students.find(x => x.id === sid);
            if (s?.className) clsSet.add(s.className);
        });
        return Array.from(clsSet).sort();
    }, [selectedRecord, students]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            {/* Header Controls */}
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
                    {/* Navigation inside Record */}
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-4 print:hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => {setSelectedRecord(null); setReportClassFilter('');}} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft/></button>
                                <div><h3 className="font-bold text-gray-800">{selectedRecord.examTitle}</h3><p className="text-xs text-gray-500">{selectedRecord.className}</p></div>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
                                <button onClick={()=>setDetailTab('KASHF')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${detailTab==='KASHF'?'bg-white shadow text-teal-800':'text-gray-500'}`}>كشف رصد المهارات</button>
                                <button onClick={()=>setDetailTab('COMPARISON')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${detailTab==='COMPARISON'?'bg-white shadow text-blue-800':'text-gray-500'}`}>مقارنة الاختبارات</button>
                                <button onClick={()=>setDetailTab('ANALYSIS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${detailTab==='ANALYSIS'?'bg-white shadow text-indigo-900':'text-gray-500'}`}>تحليل النتائج</button>
                                <button onClick={()=>setDetailTab('SUMMARY')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${detailTab==='SUMMARY'?'bg-white shadow text-orange-800':'text-gray-500'}`}>ملخص المستويات</button>
                            </div>
                        </div>
                        
                        {/* فلتر الفصل داخل التقرير */}
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                            <Filter size={16} className="text-indigo-600 ml-1"/>
                            <span className="text-xs font-bold text-gray-500">تصفية حسب الفصل:</span>
                            <select 
                                className="bg-transparent text-sm font-black text-indigo-700 outline-none" 
                                value={reportClassFilter} 
                                onChange={e => setReportClassFilter(e.target.value)}
                            >
                                <option value="">جميع الفصول المدمجة</option>
                                {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'KASHF' ? (
                            /* --- كشف رصد المهارات (التصميم الأخضر المطور) --- */
                            <div className="w-full bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                                <div className="min-w-[1200px] border-2 border-black">
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

                                    <div className="bg-teal-50 border-b-2 border-black grid grid-cols-4 text-xs font-black p-3 text-teal-900 text-center">
                                        <div>العام الدراسي: {headerConfig?.academicYear}</div>
                                        <div>الفصل الدراسي: {headerConfig?.term}</div>
                                        <div>الصف: {selectedRecord.className.replace(/\d+/g, '').trim()}</div>
                                        <div>الفصل: {reportClassFilter || selectedRecord.className.split(' ').pop()}</div>
                                    </div>

                                    <table className="w-full border-collapse text-[11px] text-center table-fixed">
                                        <thead className="bg-orange-100 font-black">
                                            <tr>
                                                <th rowSpan={2} className="border-2 border-black w-10">م</th>
                                                <th rowSpan={2} className="border-2 border-black w-60">اسم الطالب</th>
                                                <th colSpan={selectedRecord.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th>
                                                <th rowSpan={2} className="border-2 border-black w-16 bg-white">متقنة</th>
                                                <th rowSpan={2} className="border-2 border-black w-16 bg-white">غير متقنة</th>
                                                <th rowSpan={2} className="border-2 border-black w-20 bg-white">نسبة الإتقان</th>
                                            </tr>
                                            <tr className="bg-orange-50 h-40">
                                                {selectedRecord.questions.map((q, i) => (
                                                    <th key={i} className="border-2 border-black w-10 p-0 relative">
                                                        <div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">
                                                            {q.learningOutcome}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="font-bold">
                                            {reportData.studentsList.map((s, idx) => {
                                                const res = reportData.filteredStudentResponses[s.sid];
                                                const masteredCount = Object.values(res.answers).filter(v => v === '✔').length;
                                                const unmasteredCount = selectedRecord.questions.length - masteredCount;
                                                const masteryPct = Math.round((masteredCount / selectedRecord.questions.length) * 100);
                                                return (
                                                    <tr key={s.sid} className="h-9 hover:bg-gray-50 border-b border-black">
                                                        <td className="border-2 border-black bg-gray-50">{idx + 1}</td>
                                                        <td className="border-2 border-black text-right pr-3 font-black text-gray-800 bg-gray-50 truncate">{s.name}</td>
                                                        {selectedRecord.questions.map(q => (
                                                            <td key={q.id} className={`border-2 border-black font-black text-sm ${res.answers[q.text] === '✔' ? 'text-green-600 bg-green-50/20' : 'text-red-500 bg-red-50/20'}`}>
                                                                {res.answers[q.text]}
                                                            </td>
                                                        ))}
                                                        <td className="border-2 border-black bg-green-50 text-green-700 font-black">{masteredCount}</td>
                                                        <td className="border-2 border-black bg-red-50 text-red-700 font-black">{unmasteredCount}</td>
                                                        <td className={`border-2 border-black font-black ${masteryPct < 60 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>{masteryPct}%</td>
                                                    </tr>
                                                );
                                            })}
                                            
                                            {/* تذييل الإحصائيات العمودي */}
                                            <tr className="bg-green-100 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-green-800 text-sm">عدد الطلبة المتقنين للمهارة</td>
                                                {reportData.skillStats.map((s, i) => <td key={i} className="border-2 border-black text-green-700 text-lg">{s.mastered}</td>)}
                                                <td colSpan={3} rowSpan={2} className="border-2 border-black bg-white vertical-text text-teal-800 font-black text-sm">مؤشر نسبة الإتقان</td>
                                            </tr>
                                            <tr className="bg-green-50 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-green-900 text-sm">نسبة الطلبة المتقنين للمهارة</td>
                                                {reportData.skillStats.map((s, i) => <td key={i} className="border-2 border-black text-green-800 text-sm">{s.masteredPct}%</td>)}
                                            </tr>
                                            <tr className="bg-red-100 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-red-800 text-sm">عدد الطلبة الغير متقنين للمهارة</td>
                                                {reportData.skillStats.map((s, i) => <td key={i} className="border-2 border-black text-red-600 text-lg">{s.failed}</td>)}
                                                <td colSpan={3} rowSpan={2} className="border-2 border-black bg-white flex items-center justify-center">
                                                    <div className="w-16 h-16 rounded-full border-4 border-teal-600 flex items-center justify-center text-xs font-black text-teal-900">
                                                        {Math.round((reportData.masteredSkillsCount / reportData.totalSkillsPossible) * 100)}%
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className="bg-red-50 font-black h-11">
                                                <td colSpan={2} className="border-2 border-black text-red-900 text-sm">نسبة الطلبة الغير متقنين للمهارة</td>
                                                {reportData.skillStats.map((s, i) => <td key={i} className="border-2 border-black text-red-700 text-sm">{s.failedPct}%</td>)}
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black">
                                        <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                        <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                    </div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-6 w-full py-4 bg-teal-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة كشف المهارات الرسمي</button>
                            </div>
                        ) : detailTab === 'COMPARISON' ? (
                            /* --- تقرير مقارنة الاختبارات (التصميم الأزرق المطور) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto print:shadow-none print:border-none">
                                <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                                    <div className="text-right text-[10px] font-bold space-y-1">
                                        <p>الإدارة العامة للتعليم بمنطقة {headerConfig?.educationAdmin}</p>
                                        <div className="mt-2 bg-[#003366] text-white px-8 py-1 rounded-full text-center text-[11px] font-black">مدرسة {headerConfig?.schoolName}</div>
                                    </div>
                                    <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16" alt="logo"/>
                                </div>

                                <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 print:hidden flex items-center gap-4">
                                    <label className="text-sm font-bold text-blue-900 flex items-center gap-2"><GitCompare size={18}/> قارن هذا الاختبار بـ:</label>
                                    <select 
                                        className="flex-1 p-2 border rounded-lg bg-white font-bold text-sm outline-none"
                                        value={compareRecordId}
                                        onChange={e => setCompareRecordId(e.target.value)}
                                    >
                                        <option value="">-- اختر اختباراً من السجل (قبلي/تشخيصي) --</option>
                                        {history.filter(h => h.id !== selectedRecord.id).map(h => (
                                            <option key={h.id} value={h.id}>{h.examTitle} ({h.date.split('T')[0]})</option>
                                        ))}
                                    </select>
                                </div>

                                {compareRecordId ? (
                                    <div className="border-2 border-[#003366]">
                                        <div className="bg-[#003366] text-white p-2.5 flex items-center">
                                            <div className="flex-1 font-black text-center text-sm">كشف رصد ومقارنة درجات الاختبارات المدرسية</div>
                                        </div>
                                        <div className="grid grid-cols-4 text-[10px] font-black border-b border-[#003366] text-center bg-gray-50 h-8 items-center">
                                            <div className="border-l border-[#003366]">العام الدراسي: {headerConfig?.academicYear}</div>
                                            <div className="border-l border-[#003366]">الصف: {selectedRecord.className.replace(/\d+/g, '').trim()}</div>
                                            <div className="border-l border-[#003366]">الفصل: {reportClassFilter || selectedRecord.className.split(' ').pop()}</div>
                                            <div>المادة: علوم الأرض والفضاء</div>
                                        </div>

                                        <table className="w-full border-collapse text-[10px] text-center table-fixed">
                                            <thead className="bg-gray-100 font-black">
                                                <tr className="h-10">
                                                    <th rowSpan={2} className="border border-[#003366] w-8">م</th>
                                                    <th rowSpan={2} className="border border-[#003366] w-52">اسم الطالب</th>
                                                    <th colSpan={2} className="border border-[#003366] bg-gray-200">اختبار قبلي/تشخيصي</th>
                                                    <th colSpan={2} className="border border-[#003366] bg-blue-100">الاختبار الفتري/الحالي</th>
                                                    <th rowSpan={2} className="border border-[#003366] w-12 bg-white">التغير</th>
                                                    <th rowSpan={2} className="border border-[#003366] w-24 bg-white">مؤشر التحصيل</th>
                                                </tr>
                                                <tr className="h-10">
                                                    <th className="border border-[#003366] bg-gray-50">الدرجة</th>
                                                    <th className="border border-[#003366] bg-gray-50">التقدير</th>
                                                    <th className="border border-[#003366] bg-blue-50">الدرجة</th>
                                                    <th className="border border-[#003366] bg-blue-50">التقدير</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comparisonData.map((row, idx) => (
                                                    <tr key={row.sid} className="h-9 hover:bg-gray-50 border-b border-[#003366]">
                                                        <td className="border border-[#003366] bg-gray-100/50">{idx + 1}</td>
                                                        <td className="border border-[#003366] text-right pr-2 font-bold truncate">{row.name}</td>
                                                        <td className="border border-[#003366] font-mono">{row.baseScore}</td>
                                                        <td className={`border border-[#003366] font-black ${row.baseGrade.color}`}>{row.baseGrade.label}</td>
                                                        <td className="border border-[#003366] font-mono font-bold text-blue-700 bg-blue-50/30">{row.targetScore}</td>
                                                        <td className={`border border-[#003366] font-black ${row.targetGrade.color} bg-blue-50/30`}>{row.targetGrade.label}</td>
                                                        <td className={`border border-[#003366] font-black ${row.diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                                                        <td className="border border-[#003366] p-1.5">
                                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-black/5">
                                                                <div className={`h-full ${row.indicator >= 90 ? 'bg-green-500' : row.indicator >= 70 ? 'bg-blue-500' : 'bg-orange-400'}`} style={{width: `${row.indicator}%`}}></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-[#003366] text-white p-4 grid grid-cols-2 text-center text-[10px] font-black">
                                            <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                            <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-4 text-gray-400">
                                        <GitCompare size={64} className="opacity-10"/>
                                        <p className="font-bold">يرجى اختيار اختبار المقارنة من القائمة أعلاه لتوليد التقرير.</p>
                                    </div>
                                )}
                                <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-[#002244] transition-all"><Printer/> طباعة تقرير مقارنة الدرجات</button>
                            </div>
                        ) : detailTab === 'SUMMARY' ? (
                            /* --- ملخص تحليل المستويات --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-2xl border border-gray-200">
                                <div className="border-2 border-[#003366] overflow-hidden">
                                    <div className="flex justify-between items-center p-4 border-b-2 border-[#003366]">
                                        <div className="text-right text-[10px] font-bold text-[#003366]">
                                            <p>الإدارة العامة للتعليم بمنطقة {headerConfig?.educationAdmin}</p>
                                            <p>مدرسة {headerConfig?.schoolName}</p>
                                        </div>
                                        <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-10" alt="moe"/>
                                    </div>
                                    <div className="bg-[#003366] text-white p-2 text-center font-black text-sm mb-4">ملخص تحليل المستويات ونسب الإتقان</div>
                                    <table className="w-full border-collapse border-b-2 border-[#003366] text-[10px] text-center font-bold mb-8">
                                        <thead className="bg-[#003366] text-white">
                                            <tr><th className="border-2 border-[#003366] p-2 w-24">المستوى</th><th className="border-2 border-[#003366] p-2">تحليل المستوى</th><th className="border-2 border-[#003366] p-2 w-32" colSpan={2}>عدد المتعلمين</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-green-600">مرتفع</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">لديهم أداء متقدم وحلول إبداعية للمسائل</td>
                                                <td className="border-2 border-[#003366]">{reportData.studentsList.filter(s=>s.level==='HIGH').length}</td>
                                                <td className="border-2 border-[#003366] text-green-700">{reportData.totalStudentsCount ? Math.round((reportData.studentsList.filter(s=>s.level==='HIGH').length / reportData.totalStudentsCount) * 100) : 0}%</td>
                                            </tr>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-blue-600">متوسط</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">لديهم تميز نسبي في حل المسائل متوسطة المستوى</td>
                                                <td className="border-2 border-[#003366]">{reportData.studentsList.filter(s=>s.level==='MEDIUM').length}</td>
                                                <td className="border-2 border-[#003366] text-blue-700">{reportData.totalStudentsCount ? Math.round((reportData.studentsList.filter(s=>s.level==='MEDIUM').length / reportData.totalStudentsCount) * 100) : 0}%</td>
                                            </tr>
                                            <tr className="h-10">
                                                <td className="border-2 border-[#003366] text-orange-600">منخفض</td>
                                                <td className="border-2 border-[#003366] text-right pr-3">لديهم خلل في نواتج التعلم وضعف في التأسيس</td>
                                                <td className="border-2 border-[#003366]">{reportData.studentsList.filter(s=>s.level==='LOW').length}</td>
                                                <td className="border-2 border-[#003366] text-orange-700">{reportData.totalStudentsCount ? Math.round((reportData.studentsList.filter(s=>s.level==='LOW').length / reportData.totalStudentsCount) * 100) : 0}%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* --- تحليل النتائج (إحصائيات الرسوم البيانية) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-2xl border border-gray-200">
                                <div className="border-2 border-[#003366]">
                                    <div className="bg-[#003366] text-white p-2 text-center font-black text-sm">الرسم البياني لتحليل النتائج</div>
                                    <div className="p-6 space-y-10">
                                        <div className="h-60 border p-2 bg-white">
                                            <p className="text-[10px] font-black text-center mb-2">التحصيل الدراسي حسب المتعلمين (فصل: {reportClassFilter || 'الكل'})</p>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ReBarChart data={reportData.studentsList}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} tick={{fontSize:8}} />
                                                    <ReBar dataKey="pct">{reportData.studentsList.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.level === 'HIGH' ? '#10b981' : entry.level === 'MEDIUM' ? '#3b82f6' : entry.level === 'LOW' ? '#f59e0b' : '#ef4444'} />))}</ReBar>
                                                </ReBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 border-t-2 border-[#003366] text-center font-bold text-[10px] bg-blue-50">
                                        <div className="border-l-2 border-[#003366] p-2">الطلاب: {reportData.totalStudentsCount}</div>
                                        <div className="border-l-2 border-[#003366] p-2">المهارات: {reportData.totalSkillsPossible}</div>
                                        <div className="border-l-2 border-[#003366] p-2 text-green-700">متقنة: {reportData.masteredSkillsCount}</div>
                                        <div className="p-2 text-red-600">غير متقنة: {reportData.unmasteredSkillsCount}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة استيراد البيانات (كما هي) --- */
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/><h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3><p className="text-xs text-gray-400 mb-8 max-w-xs">ارفع ملف Excel لتوليد الكشوفات والرسوم البيانية.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} /><label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 w-full"><label className="text-sm font-bold text-gray-600">عنوان الاختبار:</label><input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600 outline-none" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/></div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> الأسئلة والمهارات</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                            <p className="text-xs font-bold text-gray-700 mb-2 leading-relaxed"><span className="text-green-600">س{idx+1}:</span> {item.question}</p>
                                            <div className="bg-white border rounded p-1.5 flex items-center gap-2 shadow-sm"><BrainCircuit size={14} className="text-purple-500"/><input className="text-xs outline-none w-full font-bold text-purple-700" placeholder="المهارة المستهدفة..." value={outcomesMapping[item.id]?.skill || ''} onChange={e=>setOutcomesMapping({...outcomesMapping, [item.id]: {skill: e.target.value, unit: ''}})}/></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> مراجعة الطلاب</h3>
                                <div className="flex-1 overflow-y-auto border rounded-2xl bg-gray-50">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 sticky top-0 z-10 font-bold"><tr><th className="p-3">اسم الطالب في الملف</th><th className="p-3 text-center">الحالة</th></tr></thead>
                                        <tbody className="divide-y">{fileData.map((r, i) => (<tr key={i} className="hover:bg-white transition-colors"><td className="p-3 font-bold">{r[headers.find(h=>blacklist.some(b=>h.includes(b))) || headers[0]]}</td><td className="p-3 text-center"><CheckCircle size={14} className="text-green-500 mx-auto"/></td></tr>))}</tbody>
                                    </table>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving} className="mt-4 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 flex items-center justify-center gap-2 transition-all">{isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ النتائج والرصد</button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* --- واجهة أرشيف الاختبارات --- */
                <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-fade-in">
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border"><Filter size={16} className="text-gray-400"/><span className="text-xs font-bold text-gray-500">تصفية الصف:</span><select className="bg-transparent text-sm font-bold outline-none" value={archiveGradeFilter} onChange={e=>setArchiveGradeFilter(e.target.value)}><option value="">الكل</option><option value="الأول">الأول</option><option value="الثاني">الثاني</option><option value="الثالث">الثالث</option></select></div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {history.filter(h=>!archiveGradeFilter || h.className.includes(archiveGradeFilter)).map(record => (
                            <div key={record.id} onClick={() => {setSelectedRecord(record); setDetailTab('KASHF');}} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-[#003366]"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 text-[#003366] rounded-2xl shadow-inner"><BarChart2 size={24}/></div>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                <button className="w-full py-2 bg-[#003366] text-white rounded-xl text-[10px] font-black shadow-md hover:bg-[#002244] transition-all flex items-center justify-center gap-2">فتح الكشوفات الرسمية <ArrowRight size={12}/></button>
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
