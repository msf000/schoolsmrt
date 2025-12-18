
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown, Layers, Layout, PieChart as PieIcon, Filter
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
    const [detailTab, setDetailTab] = useState<'QUESTIONS' | 'OFFICIAL_REPORT' | 'KASHF'>('OFFICIAL_REPORT');
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

    const reportStats = useMemo(() => {
        if (!activeRecord) return null;
        
        const studentsData = Object.entries(activeRecord.studentResponses).map(([sid, res], idx) => {
            const pct = Math.round((res.score / res.total) * 100);
            let color = '#ef4444'; // تهيئة
            if (pct >= 90) color = '#10b981'; // تميز
            else if (pct >= 75) color = '#3b82f6'; // تقدم
            else if (pct >= 50) color = '#f59e0b'; // انطلاق
            
            return { 
                name: (idx + 1).toString(), 
                fullName: students.find(s => s.id === sid)?.name || 'طالب', 
                score: pct, 
                color 
            };
        });

        const skillsData = activeRecord.questions.map((q, idx) => {
            let color = '#ef4444';
            if (q.successRate >= 90) color = '#10b981';
            else if (q.successRate >= 75) color = '#3b82f6';
            else if (q.successRate >= 50) color = '#f59e0b';

            return {
                name: (idx + 1).toString(),
                skill: q.learningOutcome,
                rate: q.successRate,
                color
            };
        });

        const totalMastered = activeRecord.questions.reduce((acc, q) => {
            let masteredInClass = 0;
            Object.values(activeRecord.studentResponses).forEach(res => {
                if (res.answers[q.text] === '✔') masteredInClass++;
            });
            return acc + masteredInClass;
        }, 0);

        const totalSkillsCount = activeRecord.questions.length * Object.keys(activeRecord.studentResponses).length;
        const totalUnmastered = totalSkillsCount - totalMastered;

        return { studentsData, skillsData, totalMastered, totalUnmastered, totalSkillsCount };
    }, [activeRecord, students]);

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

    const archiveClasses = useMemo(() => Array.from(new Set(history.map(h => h.className.split(' ').pop() || ''))).filter(Boolean), [history]);

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
                            <button onClick={()=>setDetailTab('OFFICIAL_REPORT')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='OFFICIAL_REPORT'?'bg-white shadow text-indigo-900':'text-gray-500'}`}>تحليل النتائج (أزرق)</button>
                            <button onClick={()=>setDetailTab('KASHF')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='KASHF'?'bg-white shadow text-teal-800':'text-gray-500'}`}>كشف رصد مهارات (أخضر)</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'OFFICIAL_REPORT' && reportStats ? (
                            /* --- واجهة تحليل نتائج المتعلمين (النموذج الأزرق المرفق في الصورة) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl border border-gray-200 print:shadow-none print:border-none">
                                {/* ترويسة رسمية */}
                                <div className="flex justify-between items-start mb-4 border-b-2 border-[#003366] pb-4">
                                    <div className="text-right text-[10px] font-bold space-y-1">
                                        <p className="text-[#003366]">الإدارة العامة للتعليم بمنطقة</p>
                                        <p className="text-[#003366]">{headerConfig?.educationAdmin}</p>
                                        <div className="mt-2 bg-[#003366] text-white px-6 py-0.5 rounded-full text-center text-[11px]">مدرسة {headerConfig?.schoolName}</div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mb-1" alt="logo"/>
                                    </div>
                                </div>

                                <div className="bg-[#003366] text-white p-2 text-center font-black text-sm mb-4 tracking-wider">تحليل نتائج المتعلمين وفق {activeRecord.examTitle}</div>

                                {/* معلومات الجدول العلوي */}
                                <table className="w-full border-collapse border-2 border-[#003366] text-[10px] mb-6 text-center font-bold">
                                    <thead className="bg-gray-100">
                                        <tr className="h-8">
                                            <th className="border-2 border-[#003366] p-1 w-1/5 text-[#003366]">المادة</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/5 text-[#003366]">الصف</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/5 text-[#003366]">الفصل</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/5 text-[#003366]">الفصل الدراسي</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/5 text-[#003366]">العام الدراسي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="h-8">
                                            <td className="border-2 border-[#003366] p-1">علوم الأرض والفضاء</td>
                                            <td className="border-2 border-[#003366] p-1">{activeRecord.className.replace(/\d+/g, '').trim()}</td>
                                            <td className="border-2 border-[#003366] p-1">{activeRecord.className.split(' ').pop()}</td>
                                            <td className="border-2 border-[#003366] p-1">{headerConfig?.term}</td>
                                            <td className="border-2 border-[#003366] p-1 font-mono">{headerConfig?.academicYear}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* الرسم البياني الأول: حسب المتعلمين */}
                                <div className="mb-6 border-2 border-[#003366] rounded-sm overflow-hidden">
                                    <div className="bg-blue-50/50 p-1.5 text-center font-black text-[11px] border-b-2 border-[#003366] text-[#003366]">الرسم البياني للتحصيل الدراسي حسب المتعلمين</div>
                                    <div className="h-[200px] p-4 bg-white relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={reportStats.studentsData} margin={{top: 5, right: 0, left: -25, bottom: 5}}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'bold'}} interval={0} axisLine={{stroke: '#003366'}} />
                                                <YAxis domain={[0, 100]} tick={{fontSize: 8, fontWeight: 'bold'}} unit="%" axisLine={{stroke: '#003366'}} />
                                                <Tooltip contentStyle={{fontSize: '10px', direction: 'rtl'}} cursor={{fill: '#f8fafc'}} />
                                                <ReBar dataKey="score" radius={[2, 2, 0, 0]} barSize={8}>
                                                    {reportStats.studentsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </ReBar>
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center gap-8 p-2 bg-gray-50 border-t border-[#003366] text-[9px] font-black">
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#10b981] border border-black/10"></div> التميز</div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#3b82f6] border border-black/10"></div> التقدم</div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#f59e0b] border border-black/10"></div> الانطلاق</div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#ef4444] border border-black/10"></div> التهيئة</div>
                                    </div>
                                </div>

                                {/* الرسم البياني الثاني: وفق المهارات */}
                                <div className="mb-6 border-2 border-[#003366] rounded-sm overflow-hidden">
                                    <div className="bg-blue-50/50 p-1.5 text-center font-black text-[11px] border-b-2 border-[#003366] text-[#003366]">الرسم البياني للتحصيل الدراسي وفق المهارات المستهدفة</div>
                                    <div className="h-[200px] p-4 bg-white">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={reportStats.skillsData} margin={{top: 5, right: 0, left: -25, bottom: 5}}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'bold'}} interval={0} axisLine={{stroke: '#003366'}} />
                                                <YAxis domain={[0, 100]} tick={{fontSize: 8, fontWeight: 'bold'}} axisLine={{stroke: '#003366'}} />
                                                <Tooltip contentStyle={{fontSize: '10px', direction: 'rtl'}} />
                                                <ReBar dataKey="rate" radius={[2, 2, 0, 0]} barSize={25}>
                                                    {reportStats.skillsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </ReBar>
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* جدول الإحصائيات النهائي */}
                                <table className="w-full border-collapse border-2 border-[#003366] text-[10px] text-center font-bold">
                                    <thead className="bg-blue-50/50">
                                        <tr className="h-10">
                                            <th className="border-2 border-[#003366] p-1 w-1/4 text-[#003366]">عدد المتعلمين الكلي</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/4 text-[#003366]">مجموع المهارات حسب المتعلمين</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/4 text-[#003366]">عدد المهارات المتقنة</th>
                                            <th className="border-2 border-[#003366] p-1 w-1/4 text-[#003366]">عدد المهارات غير المتقنة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="h-10 text-[12px] font-black">
                                            <td className="border-2 border-[#003366] p-1">{Object.keys(activeRecord.studentResponses).length}</td>
                                            <td className="border-2 border-[#003366] p-1">{reportStats.totalSkillsCount}</td>
                                            <td className="border-2 border-[#003366] p-1 text-green-700">{reportStats.totalMastered}</td>
                                            <td className="border-2 border-[#003366] p-1 text-red-600">{reportStats.totalUnmastered}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* خانات المؤشرات في الأسفل */}
                                <div className="mt-4 border-2 border-[#003366]">
                                    <div className="flex border-b-2 border-[#003366]">
                                        <div className="flex-1 p-1 bg-white relative flex items-center px-4 overflow-hidden">
                                            <div className="absolute inset-y-1.5 right-4 h-5 bg-green-500/20 border border-green-500 rounded-sm overflow-hidden" style={{width: `calc(100% - 32px)`}}>
                                                <div className="h-full bg-green-500/40" style={{width: `${Math.round((reportStats.totalMastered / reportStats.totalSkillsCount) * 100)}%`}}></div>
                                            </div>
                                            <span className="relative z-10 mx-auto font-black text-green-900 text-[11px]">{Math.round((reportStats.totalMastered / reportStats.totalSkillsCount) * 100)}%</span>
                                        </div>
                                        <div className="w-48 bg-[#003366] text-white p-2 text-center text-[10px] font-black border-l-2 border-[#003366]">مؤشر المهارات المتقنة</div>
                                    </div>
                                    <div className="flex">
                                        <div className="flex-1 p-1 bg-white relative flex items-center px-4 overflow-hidden">
                                            <div className="absolute inset-y-1.5 right-4 h-5 bg-red-500/20 border border-red-500 rounded-sm overflow-hidden" style={{width: `calc(100% - 32px)`}}>
                                                <div className="h-full bg-red-500/40" style={{width: `${Math.round((reportStats.totalUnmastered / reportStats.totalSkillsCount) * 100)}%`}}></div>
                                            </div>
                                            <span className="relative z-10 mx-auto font-black text-red-900 text-[11px]">{Math.round((reportStats.totalUnmastered / reportStats.totalSkillsCount) * 100)}%</span>
                                        </div>
                                        <div className="w-48 bg-[#003366] text-white p-2 text-center text-[10px] font-black border-l-2 border-[#003366]">مؤشر المهارات غير المتقنة</div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-between px-10 text-[11px] font-black text-[#003366]">
                                    <div className="text-center">معلم المادة / أ. {headerConfig?.teacherName}</div>
                                    <div className="text-center">مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                </div>

                                <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-[#003366] text-white rounded-xl font-black flex items-center justify-center gap-2 print:hidden shadow-lg hover:bg-[#002244] transition-all"><Printer/> طباعة تقرير تحليل النتائج</button>
                            </div>
                        ) : detailTab === 'KASHF' ? (
                            /* --- كشف الرصد الملون (النموذج الأخضر) --- */
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
                        ) : null}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد --- */
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={48} className="text-green-600 mb-4"/>
                        <h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3>
                        <p className="text-xs text-gray-400 mb-8 max-w-xs">سيقوم النظام باستخراج المهارات وعرضها بنظام (✔ / ✘) المطابق للكشف الرسمي.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 w-full">
                                <label className="text-sm font-bold text-gray-600">عنوان الاختبار:</label>
                                <input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600 outline-none" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/>
                            </div>
                            <button onClick={handleAiAutoFillOutcomes} disabled={isAiProcessing} className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 border border-indigo-200">
                                {isAiProcessing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} استخراج المهارات ذكياً (AI)
                            </button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> الأسئلة والمهارات</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                            <p className="text-xs font-bold text-gray-700 mb-2 leading-relaxed"><span className="text-green-600">س{idx+1}:</span> {item.question}</p>
                                            <div className="bg-white border rounded p-1.5 flex items-center gap-2 shadow-sm">
                                                <BrainCircuit size={14} className="text-purple-500"/>
                                                <input className="text-xs outline-none w-full font-bold text-purple-700" placeholder="المهارة المستهدفة..." value={outcomesMapping[item.id]?.skill || ''} onChange={e=>setOutcomesMapping({...outcomesMapping, [item.id]: {...(outcomesMapping[item.id]||{unit:''}), skill: e.target.value}})}/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> مطابقة الطلاب</h3>
                                <div className="flex-1 overflow-y-auto border rounded-2xl bg-gray-50">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 sticky top-0 font-bold z-10"><tr><th className="p-3">الطالب</th><th className="p-3 text-center">الحالة</th></tr></thead>
                                        <tbody className="divide-y">
                                            {fileData.map((r, i) => (
                                                <tr key={i} className="hover:bg-white transition-colors">
                                                    <td className="p-3 font-bold">{r[headers.find(h=>blacklist.some(b=>h.includes(b))) || headers[0]]}</td>
                                                    <td className="p-3 text-center"><CheckCircle size={14} className="text-green-500 mx-auto"/></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving} className="mt-4 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 flex items-center justify-center gap-2 transition-all">
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ التحليل والرصد
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* --- واجهة الأرشيف مع التصفية --- */
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
                                {archiveClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-1 pb-10">
                        {filteredHistory.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-[#003366]"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 text-[#003366] rounded-2xl shadow-inner"><BarChart2 size={24}/></div>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                <div className="flex gap-2">
                                    <button onClick={()=>{setSelectedRecord(record); setDetailTab('OFFICIAL_REPORT');}} className="flex-1 py-2 bg-[#003366] text-white rounded-xl text-[10px] font-black shadow-md hover:bg-[#002244] transition-all flex items-center justify-center gap-2">تحليل النتائج <ArrowRight size={12}/></button>
                                    <button onClick={()=>{setSelectedRecord(record); setDetailTab('KASHF');}} className="flex-1 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-[10px] font-black hover:bg-teal-100 transition-all flex items-center justify-center gap-2">كشف الرصد</button>
                                </div>
                            </div>
                        ))}
                        {filteredHistory.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 italic">لا يوجد سجلات مطابقة للفلاتر.</div>}
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
