
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, CheckSquare, Sparkles, Printer, FileDown, Layers, Layout, PieChart as PieIcon, Filter, Info, GitCompare, Wand2
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
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // Filters
    const [archiveGradeFilter, setArchiveGradeFilter] = useState('');
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
            fileData.forEach(row => {
                const pts = Number(row[pointCol]);
                responsesCount++;
                if (pts > 0) correctCount++;
            });
            return {
                id: pointCol,
                question: questionTitle,
                answerColumn: answerCol,
                successRate: responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0
            };
        });
    }, [fileData, headers]);

    const handleAutoGenerateSkills = async () => {
        setIsAiProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const questionsText = itemAnalysis.map((q, i) => `س${i+1}: ${q.question}`).join('\n');
            const prompt = `حلل الأسئلة التالية واستنتج المهارة التعليمية (الناتج التعليمي) لكل سؤال باختصار شديد (3-5 كلمات لكل مهارة). 
            أرجع النتيجة بتنسيق JSON حصراً: {"skills": ["مهارة 1", "مهارة 2", ...]}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt + "\n" + questionsText,
                config: { responseMimeType: "application/json" }
            });
            
            const result = JSON.parse(response.text || "{}");
            if (result.skills && Array.isArray(result.skills)) {
                const newMapping: Record<string, string> = {};
                itemAnalysis.forEach((q, i) => {
                    newMapping[q.id] = result.skills[i] || q.question;
                });
                setOutcomesMapping(newMapping);
            }
        } catch (e) { alert('فشل استخراج المهارات ذكياً.'); } finally { setIsAiProcessing(false); }
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
                    id: q.id, text: q.question, learningOutcome: outcomesMapping[q.id] || q.question,
                    unit: 'عام', successRate: q.successRate, difficulty: q.successRate < 50 ? 'HARD' : 'EASY', commonErrors: []
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ بنجاح.'); setFileData([]); setViewMode('HISTORY');
        } catch (e) { alert('خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    // البيانات الكاملة لجميع طلاب الفصل المختار + إحصائيات الرسوم البيانية
    const reportData = useMemo(() => {
        if (!selectedRecord) return null;
        
        const targetClass = reportClassFilter || selectedRecord.className;
        const allInClass = students.filter(s => s.className === targetClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        
        let totalMasteredSkills = 0;
        let totalPossibleSkills = 0;

        const studentsList = allInClass.map(s => {
            const res = selectedRecord.studentResponses[s.id];
            const pct = res ? (res.score / selectedRecord.questions.length) * 100 : 0;
            
            let level = ' تهيئة (ضعيف)';
            let color = '#ef4444'; // Red
            if (pct >= 90) { level = 'تميز'; color = '#10b981'; }
            else if (pct >= 75) { level = 'تقدم'; color = '#3b82f6'; }
            else if (pct >= 50) { level = 'انطلاق'; color = '#f59e0b'; }

            if (res) {
                totalPossibleSkills += selectedRecord.questions.length;
                totalMasteredSkills += res.score;
            }

            return { 
                sid: s.id, 
                name: s.name, 
                score: res?.score || 0, 
                pct, 
                level, 
                color,
                isAbsent: !res,
                answers: res?.answers || {} 
            };
        });

        const skillStats = selectedRecord.questions.map(q => {
            let mastered = 0;
            let count = 0;
            studentsList.forEach(s => {
                if (!s.isAbsent) {
                    count++;
                    if (s.answers[q.text] === '✔') mastered++;
                }
            });
            const masteredPct = count > 0 ? Math.round((mastered / count) * 100) : 0;
            return { 
                name: q.learningOutcome,
                mastered, 
                masteredPct, 
                failed: count - mastered, 
                failedPct: 100 - masteredPct 
            };
        });

        const masteredOverallPct = totalPossibleSkills > 0 ? Math.round((totalMasteredSkills / totalPossibleSkills) * 1000) / 10 : 0;

        return { 
            studentsList, 
            skillStats, 
            totalStudents: allInClass.length, 
            totalMasteredSkills, 
            totalPossibleSkills,
            masteredOverallPct
        };
    }, [selectedRecord, reportClassFilter, students]);

    const comparisonData = useMemo(() => {
        if (!selectedRecord || !compareRecordId || !reportData) return [];
        const compareTarget = history.find(h => h.id === compareRecordId);
        if (!compareTarget) return [];

        return reportData.studentsList.map(s => {
            const res = selectedRecord.studentResponses[s.sid];
            const baseRes = compareTarget.studentResponses[s.sid];
            
            const score1 = baseRes ? baseRes.score : 0;
            const score2 = res ? res.score : 0;
            const diff = score2 - score1;
            const improvementPct = score1 > 0 ? Math.round((diff / score1) * 100) : (score2 > 0 ? 100 : 0);
            const indicator = Math.round((score2 / selectedRecord.questions.length) * 100);

            const getGrade = (pts: number, total: number, isAbsent: boolean) => {
                if (isAbsent) return { label: 'غائب', color: 'text-gray-400' };
                const p = (pts / total) * 100;
                if (p >= 90) return { label: 'ممتاز', color: 'text-green-600' };
                if (p >= 80) return { label: 'جيد جداً', color: 'text-blue-500' };
                if (p >= 70) return { label: 'جيد', color: 'text-indigo-400' };
                if (p >= 50) return { label: 'مقبول', color: 'text-orange-500' };
                return { label: 'ضعيف', color: 'text-red-500' };
            };

            return {
                sid: s.sid, name: s.name, 
                baseScore: baseRes ? baseRes.score : 'غ',
                baseGrade: getGrade(score1, compareTarget.questions.length, !baseRes),
                targetScore: res ? res.score : 'غ',
                targetGrade: getGrade(score2, selectedRecord.questions.length, !res),
                diff: res && baseRes ? diff : '-',
                improvementPct, indicator, isAbsent: !res
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
                            <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
                                <TabBtn label="كشف رصد المهارات" active={detailTab==='KASHF'} onClick={()=>setDetailTab('KASHF')} />
                                <TabBtn label="مقارنة الاختبارات" active={detailTab==='COMPARISON'} onClick={()=>setDetailTab('COMPARISON')} />
                                <TabBtn label="تحليل نتائج المتعلمين" active={detailTab==='ANALYSIS'} onClick={()=>setDetailTab('ANALYSIS')} />
                                <TabBtn label="ملخص المستويات" active={detailTab==='SUMMARY'} onClick={()=>setDetailTab('SUMMARY')} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border">
                            <Filter size={16} className="text-indigo-600 ml-1"/><span className="text-xs font-bold text-gray-500">تصفية حسب الفصل:</span>
                            <select className="bg-transparent text-sm font-black text-indigo-700 outline-none" value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                                <option value="">جميع الفصول المدمجة</option>
                                {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {detailTab === 'ANALYSIS' ? (
                            /* --- تحليل نتائج المتعلمين (التصميم المعتمد في الصورة) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto print:shadow-none print:p-0">
                                <div className="border-2 border-black">
                                    <div className="bg-teal-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                                        <div className="text-right text-[11px] font-bold space-y-1"><p>منطقة {headerConfig?.educationAdmin}</p><p>مدرسة {headerConfig?.schoolName}</p></div>
                                        <div className="text-center"><h2 className="text-xl font-black mb-1">تحليل نتائج المتعلمين وفق اختبار تشخيصي</h2></div>
                                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                                    </div>
                                    
                                    <div className="bg-teal-50 border-b-2 border-black grid grid-cols-5 text-[10px] font-black p-3 text-teal-900 text-center uppercase">
                                        <div className="border-l border-black/20">المادة: علوم الأرض والفضاء</div>
                                        <div className="border-l border-black/20">الصف: {selectedRecord.className.replace(/\d+/g, '').trim()}</div>
                                        <div className="border-l border-black/20">الفصل: {reportClassFilter || 'الكل'}</div>
                                        <div className="border-l border-black/20">الفصل الدراسي: {headerConfig?.term}</div>
                                        <div>العام الدراسي: {headerConfig?.academicYear}</div>
                                    </div>

                                    <div className="p-4 space-y-8 bg-white">
                                        {/* Chart 1: Learners */}
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
                                            <div className="flex justify-center gap-6 pb-2 text-[8px] font-black text-gray-500 uppercase">
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#10b981]"></div> التميز</div>
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#3b82f6]"></div> التقدم</div>
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#f59e0b]"></div> الانطلاق</div>
                                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#ef4444]"></div> التهيئة</div>
                                            </div>
                                        </div>

                                        {/* Chart 2: Skills */}
                                        <div className="border border-black/10 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-[#003366] text-white p-2 text-center text-xs font-black">الرسم البياني للتحصيل الدراسي وفق المهارات المستهدفة</div>
                                            <div className="h-64 p-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ReBarChart data={reportData.skillStats} margin={{top:20}}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" hide />
                                                        <YAxis domain={[0, 100]} tick={{fontSize:8}} unit="%" />
                                                        <Tooltip />
                                                        <ReBar dataKey="masteredPct" barSize={25} radius={[4, 4, 0, 0]}>
                                                            {reportData.skillStats.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.masteredPct >= 90 ? '#10b981' : entry.masteredPct >= 75 ? '#3b82f6' : entry.masteredPct >= 50 ? '#f59e0b' : '#ef4444'} />
                                                            ))}
                                                        </ReBar>
                                                    </ReBarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Table Footer */}
                                    <div className="grid grid-cols-4 border-t-2 border-black text-center text-[10px] font-black uppercase">
                                        <div className="border-l-2 border-black p-3 bg-blue-50/50">عدد المتعلمين الكلي <div className="text-xl mt-1">{reportData.totalStudents}</div></div>
                                        <div className="border-l-2 border-black p-3 bg-blue-50/50">مجموع المهارات حسب المتعلمين <div className="text-xl mt-1">{reportData.totalPossibleSkills}</div></div>
                                        <div className="border-l-2 border-black p-3 bg-green-50">عدد المهارات المتقنة <div className="text-xl text-green-700 mt-1">{reportData.totalMasteredSkills}</div></div>
                                        <div className="p-3 bg-red-50">عدد المهارات الغير متقنة <div className="text-xl text-red-600 mt-1">{reportData.totalPossibleSkills - reportData.totalMasteredSkills}</div></div>
                                    </div>

                                    {/* Final Index Bars */}
                                    <div className="p-4 border-t-2 border-black bg-gray-50 flex flex-col gap-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-32 text-xs font-black text-teal-900">مؤشر المهارات المتقنة</div>
                                            <div className="flex-1 h-6 bg-white border-2 border-black rounded overflow-hidden relative">
                                                <div className="h-full bg-green-200/50" style={{width: `${reportData.masteredOverallPct}%`}}></div>
                                                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-green-800">{reportData.masteredOverallPct}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-32 text-xs font-black text-red-900">مؤشر المهارات الغير متقنة</div>
                                            <div className="flex-1 h-6 bg-white border-2 border-black rounded overflow-hidden relative">
                                                <div className="h-full bg-red-200/50" style={{width: `${100 - reportData.masteredOverallPct}%`}}></div>
                                                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-red-800">{Math.round((100 - reportData.masteredOverallPct) * 10) / 10}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black">
                                        <div>معلم المادة / أ. {headerConfig?.teacherName}</div>
                                        <div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div>
                                    </div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-6 w-full py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة تقرير تحليل النتائج</button>
                            </div>
                        ) : detailTab === 'KASHF' ? (
                            /* --- كشف رصد المهارات (الأخضر) --- */
                            <div className="w-full bg-white p-6 shadow-2xl overflow-x-auto">
                                <div className="min-w-[1200px] border-2 border-black">
                                    <div className="bg-teal-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                                        <div className="text-right text-[11px] font-bold space-y-1"><p>منطقة {headerConfig?.educationAdmin}</p><p>مدرسة {headerConfig?.schoolName}</p></div>
                                        <div className="text-center"><h2 className="text-xl font-black mb-1">كشف رصد درجات الاختبارات المدرسية</h2><p className="text-xs opacity-80">رصد مهارات المتعلمين / مادة: علوم الأرض والفضاء</p></div>
                                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                                    </div>
                                    <div className="bg-teal-50 border-b-2 border-black grid grid-cols-4 text-xs font-black p-3 text-teal-900 text-center">
                                        <div>العام: {headerConfig?.academicYear}</div><div>الفصل: {headerConfig?.term}</div><div>الصف: {selectedRecord.className.replace(/\d+/g, '').trim()}</div><div>الفصل: {reportClassFilter || 'الكل'}</div>
                                    </div>
                                    <table className="w-full border-collapse text-[11px] text-center table-fixed">
                                        <thead className="bg-orange-100 font-black">
                                            <tr><th rowSpan={2} className="border-2 border-black w-10">م</th><th rowSpan={2} className="border-2 border-black w-60">اسم الطالب</th><th colSpan={selectedRecord.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th><th rowSpan={2} className="border-2 border-black w-20 bg-white">نسبة الإتقان</th></tr>
                                            <tr className="bg-orange-50 h-40">{selectedRecord.questions.map((q, i) => (<th key={i} className="border-2 border-black w-10 p-0 relative"><div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">{q.learningOutcome}</div></th>))}</tr>
                                        </thead>
                                        <tbody className="font-bold">
                                            {reportData.studentsList.map((s, idx) => {
                                                const masteredCount = Object.values(s.answers).filter(v => v === '✔').length;
                                                const masteryPct = selectedRecord.questions.length > 0 ? Math.round((masteredCount / selectedRecord.questions.length) * 100) : 0;
                                                return (
                                                    <tr key={s.sid} className={`h-9 hover:bg-gray-50 border-b border-black ${s.isAbsent ? 'bg-gray-50/50 opacity-60' : ''}`}>
                                                        <td className="border-2 border-black bg-gray-50">{idx + 1}</td><td className="border-2 border-black text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                                                        {selectedRecord.questions.map(q => (
                                                            <td key={q.id} className={`border-2 border-black font-black text-sm ${s.isAbsent ? 'text-gray-300' : (s.answers[q.text] === '✔' ? 'text-green-600' : 'text-red-500')}`}>
                                                                {s.isAbsent ? '-' : (s.answers[q.text] || '✘')}
                                                            </td>
                                                        ))}
                                                        <td className={`border-2 border-black font-black ${s.isAbsent ? 'text-gray-400' : (masteryPct < 60 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50')}`}>{s.isAbsent ? 'غائب' : `${masteryPct}%`}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="bg-teal-900 text-white p-5 grid grid-cols-2 text-center text-xs font-black"><div>معلم المادة / أ. {headerConfig?.teacherName}</div><div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div></div>
                                </div>
                                <button onClick={()=>window.print()} className="mt-6 w-full py-4 bg-teal-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-black transition-all"><Printer/> طباعة كشف المهارات</button>
                            </div>
                        ) : detailTab === 'COMPARISON' ? (
                            /* --- تقرير مقارنة الاختبارات (الأزرق) --- */
                            <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto">
                                <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                                    <div className="text-right text-[10px] font-bold space-y-1"><p>منطقة {headerConfig?.educationAdmin}</p><div className="mt-2 bg-[#003366] text-white px-8 py-1 rounded-full text-center font-black">مدرسة {headerConfig?.schoolName}</div></div>
                                    <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16" alt="logo"/>
                                </div>
                                <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 print:hidden flex items-center gap-4">
                                    <label className="text-sm font-bold text-blue-900 flex items-center gap-2"><GitCompare size={18}/> اختر الاختبار للمقارنة معه:</label>
                                    <select className="flex-1 p-2 border rounded-lg bg-white font-bold text-sm outline-none" value={compareRecordId} onChange={e => setCompareRecordId(e.target.value)}>
                                        <option value="">-- اختر اختباراً سابقاً --</option>
                                        {history.filter(h => h.id !== selectedRecord.id).map(h => (<option key={h.id} value={h.id}>{h.examTitle} ({h.date.split('T')[0]})</option>))}
                                    </select>
                                </div>
                                {compareRecordId && (
                                    <div className="border-2 border-[#003366]">
                                        <div className="bg-[#003366] text-white p-2.5 text-center text-sm font-black">كشف رصد ومقارنة درجات الاختبارات المدرسية</div>
                                        <div className="grid grid-cols-4 text-[10px] font-black border-b border-[#003366] text-center bg-gray-50 h-8 items-center">
                                            <div className="border-l border-[#003366]">العام الدراسي: {headerConfig?.academicYear}</div><div className="border-l border-[#003366]">الصف: {selectedRecord.className}</div><div className="border-l border-[#003366]">الفصل: {reportClassFilter || 'الكل'}</div><div>المادة: علوم الأرض والفضاء</div>
                                        </div>
                                        <table className="w-full border-collapse text-[10px] text-center table-fixed">
                                            <thead className="bg-gray-100 font-black">
                                                <tr className="h-10">
                                                    <th rowSpan={2} className="border border-[#003366] w-8">م</th><th rowSpan={2} className="border border-[#003366] w-52">اسم الطالب</th>
                                                    <th colSpan={2} className="border border-[#003366] bg-gray-200">الاختبار الأول (قبلي)</th><th colSpan={2} className="border border-[#003366] bg-blue-100">الاختبار الثاني (بعدي)</th>
                                                    <th rowSpan={2} className="border border-[#003366] w-12 bg-white">التغير</th><th rowSpan={2} className="border border-[#003366] w-24 bg-white">مؤشر التحصيل</th>
                                                </tr>
                                                <tr className="h-10"><th className="border border-[#003366]">الدرجة</th><th className="border border-[#003366]">التقدير</th><th className="border border-[#003366]">الدرجة</th><th className="border border-[#003366]">التقدير</th></tr>
                                            </thead>
                                            <tbody>
                                                {comparisonData.map((row, idx) => (
                                                    <tr key={row.sid} className={`h-9 hover:bg-gray-50 border-b border-[#003366] ${row.isAbsent ? 'opacity-60' : ''}`}>
                                                        <td className="border border-[#003366] bg-gray-100/50">{idx + 1}</td><td className="border border-[#003366] text-right pr-2 font-bold truncate">{row.name}</td>
                                                        <td className="border border-[#003366] font-mono">{row.baseScore}</td><td className={`border border-[#003366] font-black ${row.baseGrade.color}`}>{row.baseGrade.label}</td>
                                                        <td className="border border-[#003366] font-mono font-bold text-blue-700 bg-blue-50/30">{row.targetScore}</td><td className={`border border-[#003366] font-black ${row.targetGrade.color} bg-blue-50/30`}>{row.targetGrade.label}</td>
                                                        <td className={`border border-[#003366] font-black ${typeof row.diff === 'number' && row.diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>{typeof row.diff === 'number' ? (row.diff > 0 ? `+${row.diff}` : row.diff) : row.diff}</td>
                                                        <td className="border border-[#003366] p-1.5"><div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-black/5"><div className={`h-full ${row.indicator >= 90 ? 'bg-green-500' : row.indicator >= 70 ? 'bg-blue-500' : 'bg-orange-400'}`} style={{width: `${row.indicator}%`}}></div></div></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-[#003366] text-white p-4 grid grid-cols-2 text-center text-[10px] font-black"><div>معلم المادة / أ. {headerConfig?.teacherName}</div><div>مدير المدرسة / أ. {headerConfig?.schoolManager}</div></div>
                                    </div>
                                )}
                                <button onClick={()=>window.print()} className="mt-8 w-full py-4 bg-[#003366] text-white rounded-2xl font-black flex items-center justify-center gap-2 print:hidden shadow-xl hover:bg-[#002244] transition-all"><Printer/> طباعة تقرير المقارنة</button>
                            </div>
                        ) : (
                            <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-4">
                                <Sparkles size={48} className="opacity-10"/>
                                <p className="font-bold">يرجى استخدام التبويبات أعلاه لعرض التحليلات الرسمية.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد (مع استخراج المهارات) --- */
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
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4 hover:border-indigo-200 transition-all">
                                            <p className="text-xs font-bold text-gray-500 mb-2">السؤال {idx+1}: {item.question}</p>
                                            <div className="flex items-center gap-2 bg-white border rounded-xl p-2 shadow-inner">
                                                <Target size={14} className="text-indigo-500"/><input className="flex-1 text-sm outline-none font-bold text-indigo-900" placeholder="المهارة التعليمية المستهدفة..." value={outcomesMapping[item.id] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [item.id]: e.target.value})} />
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
                        <div key={record.id} onClick={() => {setSelectedRecord(record); setDetailTab('KASHF');}} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                            <div className="absolute top-0 right-0 w-2 h-full bg-[#003366]"></div>
                            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 text-[#003366] rounded-2xl shadow-inner"><BarChart2 size={24}/></div><button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div>
                            <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3><p className="text-xs text-gray-500">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                            <button className="mt-4 w-full py-2 bg-[#003366] text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2">فتح التقارير والمقارنات <ArrowRight size={12}/></button>
                        </div>
                    ))}
                </div>
            )}
            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: landscape; margin: 0.5cm; } body { background: white; } .print\\:hidden { display: none !important; } } `}</style>
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-white shadow text-indigo-700 font-black' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
);

export default FormsAnalyzer;
